//go:build windows

package service

import (
	"errors"
	"fmt"
	"image"
	"image/color"
	_ "image/jpeg"
	_ "image/png"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	_ "golang.org/x/image/tiff"
	"golang.org/x/sys/windows"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

// win32ErrText يحوّل خطأ syscall الخام إلى نص عرض آمن: Errno(0) يطبع
// «The operation completed successfully.» وهو تضليل كامل داخل رسالة فشل —
// نستبدله برسالة محايدة عند غياب رسالة نظام فعلية.
func win32ErrText(err error) string {
	if err == nil || errors.Is(err, windows.ERROR_SUCCESS) {
		return "خطأ Win32 غير مُبلَّغ من النظام"
	}
	return err.Error()
}

var (
	modGdi32    = windows.NewLazySystemDLL("gdi32.dll")
	modWinspool = windows.NewLazySystemDLL("winspool.drv")

	// GDI APIs
	procCreateDCW         = modGdi32.NewProc("CreateDCW")
	procDeleteDC          = modGdi32.NewProc("DeleteDC")
	procStartDocW         = modGdi32.NewProc("StartDocW")
	procEndDoc            = modGdi32.NewProc("EndDoc")
	procStartPage         = modGdi32.NewProc("StartPage")
	procEndPage           = modGdi32.NewProc("EndPage")
	procAbortDoc          = modGdi32.NewProc("AbortDoc")
	procSetStretchBltMode = modGdi32.NewProc("SetStretchBltMode")
	procSetBrushOrgEx     = modGdi32.NewProc("SetBrushOrgEx")
	procGetDeviceCaps     = modGdi32.NewProc("GetDeviceCaps")
	procStretchDIBits     = modGdi32.NewProc("StretchDIBits")

	// Winspool APIs
	procOpenPrinterW       = modWinspool.NewProc("OpenPrinterW")
	procClosePrinter       = modWinspool.NewProc("ClosePrinter")
	procDocumentProperties = modWinspool.NewProc("DocumentPropertiesW")
	procDeviceCapabilities = modWinspool.NewProc("DeviceCapabilitiesW")
	procGetJobW            = modWinspool.NewProc("GetJobW")
)

const (
	halfToneMode = 4
	srcCopyRop   = 0x00CC0020
	dibRgbColors = 0

	// GetDeviceCaps indices
	horzResIdx         = 8
	vertResIdx         = 10
	physicalWidthIdx   = 110
	physicalHeightIdx  = 111
	physicalOffsetXIdx = 112
	physicalOffsetYIdx = 113

	// DocumentProperties flags
	dmModify    = 8
	dmInBuffer  = dmModify
	dmCopy      = 2
	dmOutBuffer = dmCopy

	// DEVMODE fields
	dmOrientationField = 0x00000001
	dmPaperSizeField   = 0x00000002
	dmPaperLengthField = 0x00000004
	dmPaperWidthField  = 0x00000008
	dmCopiesField      = 0x00000100
	dmColorField       = 0x00000800
	dmFormNameField    = 0x00010000

	dmOrientPortrait  = 1
	dmOrientLandscape = 2
	dmPaperUser       = 256
	dmColorMonochrome = 1
	dmColorColor      = 2

	// DeviceCapabilities flags
	dcPapers     = 2
	dcPaperSize  = 3
	dcPaperNames = 16
)

type docInfoW struct {
	CbSize       int32
	LpszDocName  *uint16
	LpszOutput   *uint16
	LpszDatatype *uint16
	FwType       uint32
}

type bitmapInfoHeader struct {
	BiSize          uint32
	BiWidth         int32
	BiHeight        int32
	BiPlanes        uint16
	BiBitCount      uint16
	BiCompression   uint32
	BiSizeImage     uint32
	BiXPelsPerMeter int32
	BiYPelsPerMeter int32
	BiClrUsed       uint32
	BiClrImportant  uint32
}

type bitmapInfo struct {
	BmiHeader bitmapInfoHeader
	BmiColors [1]uint32
}

type devModeW struct {
	DmDeviceName       [32]uint16
	DmSpecVersion      uint16
	DmDriverVersion    uint16
	DmSize             uint16
	DmDriverExtra      uint16
	DmFields           uint32
	DmOrientation      int16
	DmPaperSize        int16
	DmPaperLength      int16
	DmPaperWidth       int16
	DmScale            int16
	DmCopies           int16
	DmDefaultSource    int16
	DmPrintQuality     int16
	DmColor            int16
	DmDuplex           int16
	DmYResolution      int16
	DmTTOption         int16
	DmCollate          int16
	DmFormName         [32]uint16
	DmLogPixels        uint16
	DmBitsPerPel       uint32
	DmPelsWidth        uint32
	DmPelsHeight       uint32
	DmDisplayFlags     uint32
	DmDisplayFrequency uint32
	DmICMMethod        uint32
	DmICMIntent        uint32
	DmMediaType        uint32
	DmDitherType       uint32
	DmReserved1        uint32
	DmReserved2        uint32
	DmPanningWidth     uint32
	DmPanningHeight    uint32
}

type deviceMetrics struct {
	PhysicalWidth   int
	PhysicalHeight  int
	PrintableWidth  int
	PrintableHeight int
	MarginLeft      int
	MarginTop       int
}

func queryDeviceMetrics(hdc windows.Handle) deviceMetrics {
	getCap := func(idx int32) int {
		r, _, _ := procGetDeviceCaps.Call(uintptr(hdc), uintptr(idx))
		return int(int32(r))
	}
	return deviceMetrics{
		PhysicalWidth:   getCap(physicalWidthIdx),
		PhysicalHeight:  getCap(physicalHeightIdx),
		PrintableWidth:  getCap(horzResIdx),
		PrintableHeight: getCap(vertResIdx),
		MarginLeft:      getCap(physicalOffsetXIdx),
		MarginTop:       getCap(physicalOffsetYIdx),
	}
}

// convertToBottomUpDIB يحول Go image إلى مصفوفة DIB متوافقة مع متطلبات GDI:
//  1. ترتيب الألوان BGRA (32-bit).
//  2. محاذاة الأسطر على حدود 4 بايت محققة تلقائياً (width * 4).
//  3. ترتيب الأسطر Bottom-Up (الصف الأخير في الصورة يكون أول صف في الذاكرة) لتفادي انهيار تعريفات الطابعات.
//  4. إزالة أثر الشفافية (un-premultiply): image.Image.RGBA يعيد قيماً مضروبة
//     مسبقاً بقناة A، بينما DIB بنمط BI_RGB يتجاهل قناة A ويعرض RGB كما هو —
//     بلا هذه التسوية تُطبع البكسلات شبه الشفافة أغمق من أصلها.
func convertToBottomUpDIB(img image.Image) ([]byte, bitmapInfo) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	stride := width * 4
	buf := make([]byte, stride*height)

	switch src := img.(type) {
	case *image.RGBA:
		// مسار فائق السرعة لـ *image.RGBA بقراءة Pix مباشرة
		for y := 0; y < height; y++ {
			srcY := bounds.Min.Y + (height - 1 - y)
			srcRowOffset := (srcY - bounds.Min.Y) * src.Stride
			dstRowOffset := y * stride
			for x := 0; x < width; x++ {
				srcPixOffset := srcRowOffset + x*4
				r := uint32(src.Pix[srcPixOffset+0])
				g := uint32(src.Pix[srcPixOffset+1])
				b := uint32(src.Pix[srcPixOffset+2])
				a := uint32(src.Pix[srcPixOffset+3])
				if a != 0 && a != 0xFF {
					r = (r * 0xFF) / a
					g = (g * 0xFF) / a
					b = (b * 0xFF) / a
				}
				dstPixOffset := dstRowOffset + x*4
				buf[dstPixOffset+0] = byte(b)
				buf[dstPixOffset+1] = byte(g)
				buf[dstPixOffset+2] = byte(r)
				buf[dstPixOffset+3] = byte(a)
			}
		}
	case *image.NRGBA:
		// مسار فائق السرعة لـ *image.NRGBA (الألوان غير مضروبة بألفا مسبقاً)
		for y := 0; y < height; y++ {
			srcY := bounds.Min.Y + (height - 1 - y)
			srcRowOffset := (srcY - bounds.Min.Y) * src.Stride
			dstRowOffset := y * stride
			for x := 0; x < width; x++ {
				srcPixOffset := srcRowOffset + x*4
				a := src.Pix[srcPixOffset+3]
				dstPixOffset := dstRowOffset + x*4
				if a == 0 {
					buf[dstPixOffset+0] = 0
					buf[dstPixOffset+1] = 0
					buf[dstPixOffset+2] = 0
					buf[dstPixOffset+3] = 0
				} else {
					buf[dstPixOffset+0] = src.Pix[srcPixOffset+2] // Blue
					buf[dstPixOffset+1] = src.Pix[srcPixOffset+1] // Green
					buf[dstPixOffset+2] = src.Pix[srcPixOffset+0] // Red
					buf[dstPixOffset+3] = a                      // Alpha
				}
			}
		}
	case *image.YCbCr:
		// مسار فائق السرعة لصور JPEG (صيغة الإخراج القياسية لـ sRGB)
		for y := 0; y < height; y++ {
			srcY := bounds.Min.Y + (height - 1 - y)
			dstRowOffset := y * stride
			yOff := (srcY - bounds.Min.Y) * src.YStride
			for x := 0; x < width; x++ {
				srcX := bounds.Min.X + x
				r, g, b := color.YCbCrToRGB(
					src.Y[yOff+(srcX-bounds.Min.X)],
					src.Cb[src.COffset(srcX, srcY)],
					src.Cr[src.COffset(srcX, srcY)],
				)
				dstPixOffset := dstRowOffset + x*4
				buf[dstPixOffset+0] = b
				buf[dstPixOffset+1] = g
				buf[dstPixOffset+2] = r
				buf[dstPixOffset+3] = 0xFF
			}
		}
	default:
		// مسار احتياطي عام لأي نوع صورة آخر عبر واجهة image.Image
		for y := 0; y < height; y++ {
			srcY := bounds.Min.Y + (height - 1 - y)
			dstRowOffset := y * stride
			for x := 0; x < width; x++ {
				srcX := bounds.Min.X + x
				r, g, b, a := img.At(srcX, srcY).RGBA()
				// r/g/b مضمونة ≤ a (قيم مسبوقة بالضرب) فيصح القسمة بلا تجاوز.
				if a != 0 && a != 0xFFFF {
					r = r * 0xFFFF / a
					g = g * 0xFFFF / a
					b = b * 0xFFFF / a
				}
				dstPixOffset := dstRowOffset + x*4
				buf[dstPixOffset+0] = byte(b >> 8) // Blue
				buf[dstPixOffset+1] = byte(g >> 8) // Green
				buf[dstPixOffset+2] = byte(r >> 8) // Red
				buf[dstPixOffset+3] = byte(a >> 8) // Alpha / Padding
			}
		}
	}

	var bmi bitmapInfo
	bmi.BmiHeader.BiSize = uint32(unsafe.Sizeof(bmi.BmiHeader))
	bmi.BmiHeader.BiWidth = int32(width)
	bmi.BmiHeader.BiHeight = int32(height) // ارتفاع موجب = Bottom-Up DIB
	bmi.BmiHeader.BiPlanes = 1
	bmi.BmiHeader.BiBitCount = 32
	bmi.BmiHeader.BiCompression = 0 // BI_RGB
	bmi.BmiHeader.BiSizeImage = uint32(len(buf))

	return buf, bmi
}

// configurePrinterDevMode ينفذ بروتوكول الدمج الآمن ذو الخطوتين لتعديل إعدادات DEVMODE:
// 1. استعلام حجم الذاكرة المطلوبة (Public + Private).
// 2. قراءة إعدادات الدرايفر الحالية.
// 3. تعديل الخصائص العامة.
// 4. استدعاء DocumentPropertiesW للدمج والتحقق من صحة الإعدادات عبر الدرايفر.
func configurePrinterDevMode(printerName string, req domain.DirectPrintRequest) ([]byte, error) {
	pPrinterName, err := windows.UTF16PtrFromString(printerName)
	if err != nil {
		return nil, err
	}

	var hPrinter windows.Handle
	ret, _, lastErr := procOpenPrinterW.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		uintptr(unsafe.Pointer(&hPrinter)),
		0,
	)
	if ret == 0 {
		return nil, fmt.Errorf("تعذر فتح الطابعة '%s': %s", printerName, win32ErrText(lastErr))
	}
	defer procClosePrinter.Call(uintptr(hPrinter))

	// الخطوة 1: استعلام الحجم الإجمالي (Public + Driver Private)
	sizeNeeded, _, _ := procDocumentProperties.Call(
		0,
		uintptr(hPrinter),
		uintptr(unsafe.Pointer(pPrinterName)),
		0, 0, 0,
	)
	if int32(sizeNeeded) <= 0 || uintptr(sizeNeeded) < unsafe.Sizeof(devModeW{}) {
		return nil, fmt.Errorf("تعذر استعلام حجم إعدادات الطابعة أو الحجم غير صالح (%d بايت)", sizeNeeded)
	}

	devModeBuf := make([]byte, sizeNeeded)

	// الخطوة 2: استخراج الإعدادات الافتراضية
	rOut, _, lastErr := procDocumentProperties.Call(
		0,
		uintptr(hPrinter),
		uintptr(unsafe.Pointer(pPrinterName)),
		uintptr(unsafe.Pointer(&devModeBuf[0])),
		0,
		uintptr(dmOutBuffer),
	)
	if int32(rOut) < 0 {
		return nil, fmt.Errorf("تعذر قراءة إعدادات الطابعة: %s", win32ErrText(lastErr))
	}

	// حفظ نسخة احتياطية من الإعدادات الافتراضية للتعافي الجزئي عند فشل دمج مقاس الورق
	backupBuf := make([]byte, len(devModeBuf))
	copy(backupBuf, devModeBuf)

	// الخطوة 3: تطبيق التعديلات
	dm := (*devModeW)(unsafe.Pointer(&devModeBuf[0]))

	// اتجاه الصفحة
	dm.DmFields |= dmOrientationField
	if strings.EqualFold(req.Orientation, "landscape") {
		dm.DmOrientation = dmOrientLandscape
	} else {
		dm.DmOrientation = dmOrientPortrait
	}

	// عدد النسخ
	if req.Copies > 0 {
		dm.DmFields |= dmCopiesField
		dm.DmCopies = int16(req.Copies)
	}

	// نمط الألوان
	dm.DmFields |= dmColorField
	if req.Color {
		dm.DmColor = dmColorColor
	} else {
		dm.DmColor = dmColorMonochrome
	}

	// اسم القالب أو المقاس المخصص
	if req.FormName != "" {
		// قالب مخصص بالاسم: DM_FORMNAME مع DMPAPER_USER
		dm.DmFields |= dmFormNameField | dmPaperSizeField
		dm.DmPaperSize = dmPaperUser
		dm.DmFormName = formNameField(req.FormName)
	} else if req.PaperWidthMM > 0 && req.PaperHeightMM > 0 {
		if stdID := matchStandardPaperID(req.PaperWidthMM, req.PaperHeightMM); stdID != 0 {
			// قالب قياسي معتمد في ويندوز (A4, A3, Letter...) — تعيين DMPAPER_* القياسي
			// يمنع رفض السائقين الذين لا يدعمون DMPAPER_USER للمقاسات القياسية.
			dm.DmFields |= dmPaperSizeField
			dm.DmFields &^= (dmPaperWidthField | dmPaperLengthField)
			dm.DmPaperSize = int16(stdID)
			dm.DmPaperWidth = 0
			dm.DmPaperLength = 0
		} else {
			dm.DmFields |= dmPaperSizeField | dmPaperWidthField | dmPaperLengthField
			dm.DmPaperSize = dmPaperUser
			// في GDI الأبعاد تُمرر بـ عُشر المليمتر (0.1 mm)
			dm.DmPaperWidth = int16(req.PaperWidthMM * 10)
			dm.DmPaperLength = int16(req.PaperHeightMM * 10)
		}
	}

	// الخطوة 4: دمج التعديلات والتحقق من صحتها عبر الدرايفر
	rMerge, _, lastErr := procDocumentProperties.Call(
		0,
		uintptr(hPrinter),
		uintptr(unsafe.Pointer(pPrinterName)),
		uintptr(unsafe.Pointer(&devModeBuf[0])),
		uintptr(unsafe.Pointer(&devModeBuf[0])),
		uintptr(dmInBuffer|dmOutBuffer),
	)
	if int32(rMerge) < 0 {
		// إذا فشل الدمج الكامل (غالباً بسبب رفض السائق لمقاس الورق المخصص)، نحاول دمج
		// الاتجاه وعدد النسخ والألوان فقط على النسخة الاحتياطية لإنقاذ اتجاه الصفحة
		slog.Warn("Full DocumentProperties merge failed; attempting fallback merge with orientation/copies only", "err", win32ErrText(lastErr))
		dmBackup := (*devModeW)(unsafe.Pointer(&backupBuf[0]))
		dmBackup.DmFields |= dmOrientationField | dmCopiesField | dmColorField
		dmBackup.DmOrientation = dm.DmOrientation
		dmBackup.DmCopies = dm.DmCopies
		dmBackup.DmColor = dm.DmColor
		rFallback, _, lastErrFallback := procDocumentProperties.Call(
			0,
			uintptr(hPrinter),
			uintptr(unsafe.Pointer(pPrinterName)),
			uintptr(unsafe.Pointer(&backupBuf[0])),
			uintptr(unsafe.Pointer(&backupBuf[0])),
			uintptr(dmInBuffer|dmOutBuffer),
		)
		if int32(rFallback) >= 0 {
			return backupBuf, nil
		}
		slog.Warn("Fallback DocumentProperties merge also failed; falling back to driver default devmode", "err", win32ErrText(lastErrFallback))
		return nil, nil
	}

	return devModeBuf, nil
}

// matchStandardPaperID يطابق أبعاد الورقة بالمليمتر مع معرفات قوالب ويندوز القياسية (DMPAPER_*)
// بتسامح 1.5 مم لاستيعاب فروق التقريب بين البوصة والمليمتر.
func matchStandardPaperID(w, h float64) uint16 {
	dimMin := math.Min(w, h)
	dimMax := math.Max(w, h)
	near := func(a, b float64) bool {
		return math.Abs(a-b) <= 1.5
	}
	switch {
	case near(dimMin, 210) && near(dimMax, 297):
		return 9 // DMPAPER_A4
	case near(dimMin, 297) && near(dimMax, 420):
		return 8 // DMPAPER_A3
	case near(dimMin, 148) && near(dimMax, 210):
		return 11 // DMPAPER_A5
	case near(dimMin, 215.9) && near(dimMax, 279.4):
		return 1 // DMPAPER_LETTER
	case near(dimMin, 215.9) && near(dimMax, 355.6):
		return 5 // DMPAPER_LEGAL
	case near(dimMin, 279.4) && near(dimMax, 431.8):
		return 3 // DMPAPER_TABLOID
	case near(dimMin, 182) && near(dimMax, 257):
		return 13 // DMPAPER_B5
	case near(dimMin, 250) && near(dimMax, 354):
		return 12 // DMPAPER_B4
	case near(dimMin, 184.15) && near(dimMax, 266.7):
		return 7 // DMPAPER_EXECUTIVE
	default:
		return 0
	}
}

// formNameField يبني حقل DmFormName[32] بإنهاء NUL إلزامي: الحلقة القديمة كانت
// تملأ الحقل كاملاً بلا NUL عندما يتجاوز الاسم 31 محرفاً (StringToUTF16 أطول من
// 32 عنصراً) — فيقرأ الدرايفر نصاً غير منتهٍ إلى ما بعد الحقل داخل منطقة devmode
// الخاصة. الاسم الأطول يُقصّ إلى 31 محرفاً + NUL.
func formNameField(name string) [32]uint16 {
	var out [32]uint16
	utf16Form := windows.StringToUTF16(name)
	n := len(utf16Form) - 1 // استبعاد NUL الذي يُلحقه StringToUTF16
	if n > len(out)-1 {
		n = len(out) - 1
	}
	copy(out[:n], utf16Form[:n])
	return out
}

// validateDirectPrintRequest يتحقق من مدخلات الطباعة المباشرة قبل لمس Win32:
// أبعاد الورقة وعدد النسخ تُحوَّل إلى int16 (عُشر المليمتر للورقة)، فقيمة خارج
// المدى كانت تُلفّ إلى سالب وتُمرَّر للدرايفر بعد "دمج" ناجح.
func validateDirectPrintRequest(req domain.DirectPrintRequest) error {
	if math.IsNaN(req.PaperWidthMM) || math.IsInf(req.PaperWidthMM, 0) ||
		math.IsNaN(req.PaperHeightMM) || math.IsInf(req.PaperHeightMM, 0) {
		return fmt.Errorf("أبعاد الورقة غير صالحة (قيم غير منتهية)")
	}
	hasW, hasH := req.PaperWidthMM > 0, req.PaperHeightMM > 0
	if hasW != hasH {
		return fmt.Errorf("أبعاد الورقة المخصصة يجب أن تُحدَّد كاملة (عرض وارتفاع معاً)")
	}
	if hasW && (req.PaperWidthMM <= 10 || req.PaperHeightMM <= 10 ||
		req.PaperWidthMM > 1000 || req.PaperHeightMM > 1000) {
		return fmt.Errorf("أبعاد الورقة المخصصة خارج المدى المسموح (بين 10 و1000 مم): %.1f×%.1f",
			req.PaperWidthMM, req.PaperHeightMM)
	}
	if req.Copies < 0 || req.Copies > 999 {
		return fmt.Errorf("عدد نسخ غير صالح للطباعة المباشرة: %d (المدى 0–999)", req.Copies)
	}
	return nil
}

// sanitizePrintFilePath يتحقق من أمان ومسار ملف الطباعة
func sanitizePrintFilePath(filePath string) (string, error) {
	if filePath == "" {
		return "", fmt.Errorf("مسار ملف الطباعة فارغ")
	}

	cleanPath := filepath.Clean(filePath)
	resolved, err := filepath.EvalSymlinks(cleanPath)
	if err == nil {
		cleanPath = resolved
	}

	info, err := os.Stat(cleanPath)
	if err != nil {
		return "", fmt.Errorf("ملف الطباعة غير موجود: %w", err)
	}
	if info.IsDir() {
		return "", fmt.Errorf("المسار المحدد مجلد وليس ملفاً")
	}

	ext := strings.ToLower(filepath.Ext(cleanPath))
	validExts := map[string]bool{
		".png": true, ".jpg": true, ".jpeg": true, ".tiff": true, ".tif": true,
	}
	if !validExts[ext] {
		return "", fmt.Errorf("نوع الملف غير مدعوم للطباعة المباشرة عبر GDI: %s (يدعم الصور فقط)", ext)
	}

	// 🔒 حصر الطباعة في مخرجات التطبيق (عقد مطابق لـ print_native.go):
	// مجلد Exports أو ملفات grido_print_* في Temp — مع تطبيع روابط الرموز
	// للجانبين معاً (بيئات المسارات 8.3 القصيرة على ويندوز كانت ترفض ملفات
	// مشروعة) وفاصل مسار إلزامي يمنع تجاوزاً بادئياً مثل ExportsEvil.
	exportsDir, expErr := filepath.Abs(filepath.Join(utils.GetAppDir(), "Exports"))
	if expErr != nil {
		return "", fmt.Errorf("خطأ في التحقق من أمان مسار الملف: %w", expErr)
	}
	if resolvedBase, err := filepath.EvalSymlinks(exportsDir); err == nil {
		exportsDir = resolvedBase
	}
	tempDir, tempErr := filepath.Abs(os.TempDir())
	if tempErr == nil {
		if resolvedTmp, err := filepath.EvalSymlinks(tempDir); err == nil {
			tempDir = resolvedTmp
		}
	}
	absClean, absErr := filepath.Abs(cleanPath)
	if absErr != nil {
		return "", fmt.Errorf("مسار الملف غير صالح: %w", absErr)
	}

	inExports := strings.HasPrefix(absClean, filepath.Clean(exportsDir)+string(filepath.Separator))
	inPrintTemp := tempErr == nil &&
		strings.HasPrefix(absClean, filepath.Clean(tempDir)+string(filepath.Separator)) &&
		strings.HasPrefix(filepath.Base(absClean), "grido_print_")
	if !inExports && !inPrintTemp {
		return "", fmt.Errorf("مسار الملف غير مصرح به للطباعة: %s", cleanPath)
	}

	return cleanPath, nil
}

// calculatePrintDestRect يحسب موضع وأبعاد رسم الصورة في سياق الطابعة (GDI):
// - في وضع Borderless: تغطية كاملة (cover) للأبعاد الفيزيائية للورقة وتوسيطها بنسبة الأبعاد.
// - في الوضع العادي: احتواء وتوسيط (contain) داخل المساحة القابلة للطباعة (Printable Area).
func calculatePrintDestRect(metrics deviceMetrics, imgW, imgH int, borderless bool) (destX, destY, destW, destH int32) {
	if imgW <= 0 || imgH <= 0 {
		return 0, 0, 0, 0
	}
	if borderless {
		baseW := metrics.PhysicalWidth
		baseH := metrics.PhysicalHeight
		originX := -metrics.MarginLeft
		originY := -metrics.MarginTop

		// صمام أمان في حال عدم إرجاع أبعاد فيزيائية صحيحة من الدرايفر
		if baseW <= 0 {
			baseW = metrics.PrintableWidth
			originX = 0
		}
		if baseH <= 0 {
			baseH = metrics.PrintableHeight
			originY = 0
		}

		if baseW > 0 && baseH > 0 {
			scaleX := float64(baseW) / float64(imgW)
			scaleY := float64(baseH) / float64(imgH)
			scale := scaleX
			if scaleY > scale {
				scale = scaleY
			}
			destW = int32(math.Ceil(float64(imgW) * scale))
			destH = int32(math.Ceil(float64(imgH) * scale))
			destX = int32(originX + (baseW-int(destW))/2)
			destY = int32(originY + (baseH-int(destH))/2)
		}
		return destX, destY, destW, destH
	}

	scaleX := float64(metrics.PrintableWidth) / float64(imgW)
	scaleY := float64(metrics.PrintableHeight) / float64(imgH)
	scale := scaleX
	if scaleY < scale {
		scale = scaleY
	}
	destW = int32(float64(imgW) * scale)
	destH = int32(float64(imgH) * scale)
	destX = int32((metrics.PrintableWidth - int(destW)) / 2)
	destY = int32((metrics.PrintableHeight - int(destH)) / 2)
	return destX, destY, destW, destH
}

// PrintImageDirectGDI يرسل صورة مولدة مباشرة إلى طابعة ويندوز عبر Win32 GDI
func (s *PrintService) PrintImageDirectGDI(req domain.DirectPrintRequest) (int32, error) {
	if err := validateDirectPrintRequest(req); err != nil {
		return 0, err
	}

	printerName := strings.TrimSpace(req.PrinterName)
	if printerName == "" {
		def, err := GetDefaultPrinter()
		if err != nil || def == "" {
			return 0, fmt.Errorf("لم يتم تحديد طابعة ولا توجد طابعة افتراضية في النظام")
		}
		printerName = def
	}

	// 1. التحقق من المسار وقراءة الصورة
	cleanPath, err := sanitizePrintFilePath(req.FilePath)
	if err != nil {
		return 0, err
	}

	file, err := os.Open(cleanPath)
	if err != nil {
		return 0, fmt.Errorf("تعذر فتح ملف الصورة: %w", err)
	}
	defer file.Close()

	// فحص الترويسة لمنع قنابل إلغاء الضغط
	cfg, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, fmt.Errorf("تعذر قراءة ترويسة الصورة: %w", err)
	}
	if err := checkDecodedPixelCap(cfg, filepath.Base(cleanPath)); err != nil {
		return 0, err
	}

	// إعادة مؤشر القراءة وفك تشفير الصورة
	if _, err := file.Seek(0, 0); err != nil {
		return 0, fmt.Errorf("تعذر إعادة تعيين مؤشر الملف: %w", err)
	}
	img, _, err := image.Decode(file)
	if err != nil {
		return 0, fmt.Errorf("تعذر فك تشفير الصورة: %w", err)
	}

	// 2. تكوين DEVMODE للطابعة المستهدفة
	devModeBuf, err := configurePrinterDevMode(printerName, req)
	if err != nil {
		slog.Warn("Failed to configure printer DEVMODE, falling back to default driver settings", "err", err)
		devModeBuf = nil
	}

	// 3. إنشاء سياق الطابعة CreateDCW
	pPrinterName, err := windows.UTF16PtrFromString(printerName)
	if err != nil {
		return 0, err
	}

	var pDevMode uintptr
	if len(devModeBuf) > 0 {
		pDevMode = uintptr(unsafe.Pointer(&devModeBuf[0]))
	}

	hdc, _, lastErr := procCreateDCW.Call(
		0,
		uintptr(unsafe.Pointer(pPrinterName)),
		0,
		pDevMode,
	)
	if hdc == 0 {
		return 0, fmt.Errorf("فشل إنشاء سياق الطابعة CreateDCW: %s", win32ErrText(lastErr))
	}
	defer procDeleteDC.Call(hdc)

	// 4. استعلام قياسات الطابعة
	metrics := queryDeviceMetrics(windows.Handle(hdc))

	// 5. بدء المستند StartDocW
	jobTitle := strings.TrimSpace(req.JobTitle)
	if jobTitle == "" {
		jobTitle = fmt.Sprintf("Grido Print - %s", filepath.Base(cleanPath))
	}
	pDocTitle, _ := windows.UTF16PtrFromString(jobTitle)
	docInfo := docInfoW{
		CbSize:      int32(unsafe.Sizeof(docInfoW{})),
		LpszDocName: pDocTitle,
	}

	jobID, _, lastErr := procStartDocW.Call(hdc, uintptr(unsafe.Pointer(&docInfo)))
	if int32(jobID) <= 0 {
		return 0, fmt.Errorf("فشل بدء مهمة الطباعة StartDocW: %s", win32ErrText(lastErr))
	}

	// ضمان إلغاء المستند إذا حدث ذعر أو خطأ قبل الإغلاق
	completed := false
	defer func() {
		if !completed {
			procAbortDoc.Call(hdc)
		}
	}()

	// 6. بدء الصفحة StartPage
	rPage, _, lastErr := procStartPage.Call(hdc)
	if int32(rPage) <= 0 {
		return 0, fmt.Errorf("فشل بدء صفحة الطباعة StartPage: %s", win32ErrText(lastErr))
	}

	// 7. ضبط نمط التنعيم الفائق HALFTONE وإعادة ضبط الفرشاة
	procSetStretchBltMode.Call(hdc, uintptr(halfToneMode))
	procSetBrushOrgEx.Call(hdc, 0, 0, 0)

	// 8. تجهيز مصفوفة DIB وحساب موضع وأبعاد الرسم
	dibPixels, bmi := convertToBottomUpDIB(img)
	imgW := img.Bounds().Dx()
	imgH := img.Bounds().Dy()

	destX, destY, destW, destH := calculatePrintDestRect(metrics, imgW, imgH, req.Borderless)

	// 9. ضخ بكسلات الصورة عبر StretchDIBits
	rLines, _, lastErr := procStretchDIBits.Call(
		hdc,
		uintptr(destX), uintptr(destY), uintptr(destW), uintptr(destH),
		0, 0, uintptr(imgW), uintptr(imgH),
		uintptr(unsafe.Pointer(&dibPixels[0])),
		uintptr(unsafe.Pointer(&bmi)),
		uintptr(dibRgbColors),
		uintptr(srcCopyRop),
	)
	if int32(rLines) <= 0 {
		return 0, fmt.Errorf("فشل رسم بيانات الصورة في الطابعة StretchDIBits: %s", win32ErrText(lastErr))
	}

	// 10. إغلاق الصفحة والمستند — فحص النتيجة إلزامي: فشل EndPage/EndDoc يعني
	// أن المهمة لم تكتمل في الطابور، و«نجاح» كاذب هنا يمنع مسار الاحتياط.
	rEndPage, _, lastErr := procEndPage.Call(hdc)
	if int32(rEndPage) <= 0 {
		return 0, fmt.Errorf("فشل إغلاق صفحة الطباعة EndPage: %s", win32ErrText(lastErr))
	}
	rEndDoc, _, lastErr := procEndDoc.Call(hdc)
	if int32(rEndDoc) <= 0 {
		return 0, fmt.Errorf("فشل إغلاق مستند الطباعة EndDoc: %s", win32ErrText(lastErr))
	}
	completed = true

	slog.Info("Successfully spooled direct GDI print job",
		"printer", printerName,
		"jobID", int32(jobID),
		"destW", destW,
		"destH", destH,
		"borderless", req.Borderless,
	)

	return int32(jobID), nil
}

// GetSupportedPapers يستعلم أسماء وقوالب الورق التي يدعمها برنامج تشغيل الطابعة
func (s *PrintService) GetSupportedPapers(printerName string) ([]domain.SupportedPaperInfo, error) {
	printerName = strings.TrimSpace(printerName)
	if printerName == "" {
		def, err := GetDefaultPrinter()
		if err != nil || def == "" {
			return nil, fmt.Errorf("اسم الطابعة فارغ ولا توجد طابعة افتراضية")
		}
		printerName = def
	}

	pPrinterName, err := windows.UTF16PtrFromString(printerName)
	if err != nil {
		return nil, err
	}

	// 1. عدد القوالب المدعومة — DeviceCapabilities يعيد int (32-bit) وقد يعيد -1
	// عند الفشل، ويجب قراءته بإشارة (int32) وإلا صار 0xFFFFFFFF عدداً ضخماً
	// فوقع تخصيص ذاكرة كارثي.
	count, _, capErr := procDeviceCapabilities.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		0,
		uintptr(dcPapers),
		0, 0,
	)
	if int32(count) < 0 {
		return nil, fmt.Errorf("تعذر استعلام عدد قوالب الورق من الطابعة '%s': %s", printerName, win32ErrText(capErr))
	}
	if int32(count) == 0 {
		return []domain.SupportedPaperInfo{}, nil
	}
	n := int(int32(count))
	if n > 10000 {
		return nil, fmt.Errorf("عدد قوالب الورق المُبلغ من الطابعة شاذ (%d)", n)
	}

	// 2. معرفات الورق
	paperIDs := make([]uint16, n)
	rIDs, _, errIDs := procDeviceCapabilities.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		0,
		uintptr(dcPapers),
		uintptr(unsafe.Pointer(&paperIDs[0])),
		0,
	)
	if int32(rIDs) < 0 {
		return nil, fmt.Errorf("تعذر قراءة معرفات قوالب الورق من الطابعة '%s': %s", printerName, win32ErrText(errIDs))
	}

	// 3. أسماء القوالب (كل اسم 64 محرف WCHAR)
	namesBuf := make([]uint16, n*64)
	rNames, _, errNames := procDeviceCapabilities.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		0,
		uintptr(dcPaperNames),
		uintptr(unsafe.Pointer(&namesBuf[0])),
		0,
	)
	if int32(rNames) < 0 {
		return nil, fmt.Errorf("تعذر قراءة أسماء قوالب الورق من الطابعة '%s': %s", printerName, win32ErrText(errNames))
	}

	// 4. قراءة الأبعاد (POINT: X, Y بـ 0.1 mm)
	type point struct{ X, Y int32 }
	sizesBuf := make([]point, n)
	rSizes, _, errSizes := procDeviceCapabilities.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		0,
		uintptr(dcPaperSize),
		uintptr(unsafe.Pointer(&sizesBuf[0])),
		0,
	)
	if int32(rSizes) < 0 {
		return nil, fmt.Errorf("تعذر قراءة أبعاد قوالب الورق من الطابعة '%s': %s", printerName, win32ErrText(errSizes))
	}

	result := make([]domain.SupportedPaperInfo, n)
	for i := 0; i < n; i++ {
		result[i] = parseSupportedPaperInfo(
			paperIDs[i],
			namesBuf[i*64:(i+1)*64],
			sizesBuf[i].X,
			sizesBuf[i].Y,
		)
	}

	return result, nil
}

// parseSupportedPaperInfo يفك بيانات قالب الورق من مصفوفات Win32 DeviceCapabilitiesW
func parseSupportedPaperInfo(id uint16, nameUTF16 []uint16, sizeX, sizeY int32) domain.SupportedPaperInfo {
	formName := windows.UTF16ToString(nameUTF16)
	isBorderless := strings.Contains(strings.ToLower(formName), "borderless") ||
		strings.Contains(formName, "بدون حواف")

	return domain.SupportedPaperInfo{
		ID:           id,
		Name:         formName,
		WidthMM:      float64(sizeX) / 10.0,
		HeightMM:     float64(sizeY) / 10.0,
		IsBorderless: isBorderless,
	}
}

// PollJobStatus يستعلم عن حالة مهمة الطباعة الحالية في طابور الويندوز
func (s *PrintService) PollJobStatus(printerName string, jobID int32) (domain.DirectPrintResult, error) {
	printerName = strings.TrimSpace(printerName)
	if printerName == "" {
		def, err := GetDefaultPrinter()
		if err != nil || def == "" {
			return domain.DirectPrintResult{Success: false, Error: "اسم الطابعة غير محدد"}, nil
		}
		printerName = def
	}

	pPrinterName, err := windows.UTF16PtrFromString(printerName)
	if err != nil {
		return domain.DirectPrintResult{Success: false, Error: err.Error()}, err
	}

	var hPrinter windows.Handle
	ret, _, lastErr := procOpenPrinterW.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		uintptr(unsafe.Pointer(&hPrinter)),
		0,
	)
	if ret == 0 {
		return domain.DirectPrintResult{Success: false, Error: fmt.Sprintf("تعذر الاتصال بالطابعة: %s", win32ErrText(lastErr))}, nil
	}
	defer procClosePrinter.Call(uintptr(hPrinter))

	var needed uint32
	rProbe, _, probeErr := procGetJobW.Call(
		uintptr(hPrinter),
		uintptr(jobID),
		2,
		0, 0,
		uintptr(unsafe.Pointer(&needed)),
	)
	if needed == 0 {
		// اختفاء المهمة من الطابور يعني غالباً اكتمالها وخروجها (GetJob يفشل
		// بـ ERROR_INVALID_PARAMETER للمعرف غير الموجود) — أما أي فشل آخر
		// (صلاحيات/طابعة مفقودة) فيُبلَّغ عنه بدل تلوينه «اكتمل» زوراً.
		if rProbe == 0 && !errors.Is(probeErr, windows.ERROR_INVALID_PARAMETER) && !errors.Is(probeErr, windows.ERROR_SUCCESS) {
			return domain.DirectPrintResult{
				Success: false,
				JobID:   jobID,
				Error:   fmt.Sprintf("تعذر استعلام حالة المهمة: %s", win32ErrText(probeErr)),
			}, nil
		}
		return domain.DirectPrintResult{
			Success: true,
			JobID:   jobID,
			Status:  "Completed",
		}, nil
	}

	buf := make([]byte, needed)
	rGet, _, lastErr := procGetJobW.Call(
		uintptr(hPrinter),
		uintptr(jobID),
		2,
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(needed),
		uintptr(unsafe.Pointer(&needed)),
	)
	if rGet == 0 {
		return domain.DirectPrintResult{
			Success: false,
			JobID:   jobID,
			Error:   fmt.Sprintf("تعذر قراءة بيانات المهمة: %s", win32ErrText(lastErr)),
		}, nil
	}

	type jobInfo2 struct {
		JobId               uint32
		PPrinterName        *uint16
		PMachineName        *uint16
		PUserName           *uint16
		PDocument           *uint16
		PNotifyName         *uint16
		PDatatype           *uint16
		PPrintProcessor     *uint16
		PParameters         *uint16
		PDriverName         *uint16
		PDevMode            uintptr
		PStatus             *uint16
		PSecurityDescriptor uintptr
		Status              uint32
		Priority            uint32
		Position            uint32
		StartTime           uint32
		UntilTime           uint32
		TotalPages          uint32
		Size                uint32
		Submitted           syscall.Systemtime
		Time                uint32
		PagesPrinted        uint32
	}

	info := (*jobInfo2)(unsafe.Pointer(&buf[0]))

	var driverMsg string
	if info.PStatus != nil {
		driverMsg = windows.UTF16PtrToString(info.PStatus)
	}

	statusStr, success := evaluateJobStatus(info.Status, driverMsg)

	return domain.DirectPrintResult{
		Success: success,
		JobID:   jobID,
		Status:  statusStr,
	}, nil
}

const (
	jobStatusError    = 0x00000002
	jobStatusPrinting = 0x00000010
	jobStatusOffline  = 0x00000020
	jobStatusPaperout = 0x00000040
	jobStatusPrinted  = 0x00000080
	jobStatusComplete = 0x00001000
)

// evaluateJobStatus يحلل بتات حالة مهمة الطباعة في طابور الويندوز ورسالة الدرايفر
func evaluateJobStatus(statusBits uint32, driverMsg string) (statusStr string, success bool) {
	statusStr = "Spooling"
	if statusBits&jobStatusError != 0 {
		statusStr = "Error"
	} else if statusBits&jobStatusPaperout != 0 {
		statusStr = "Out of Paper"
	} else if statusBits&jobStatusOffline != 0 {
		statusStr = "Printer Offline"
	} else if statusBits&jobStatusPrinting != 0 {
		statusStr = "Printing"
	} else if statusBits&jobStatusPrinted != 0 || statusBits&jobStatusComplete != 0 {
		statusStr = "Printed"
	}

	// حكم النجاح من بتات job.Status الرقمية لا من نص pStatus: رسائل الدرايفر
	// مترجمة بلغة النظام، فمطابقة نصوص إنجليزية كانت تُبقي Success=true لخطأ ورق.
	statusFailed := statusBits&(jobStatusError|jobStatusPaperout|jobStatusOffline) != 0

	if driverMsg != "" {
		statusStr = driverMsg
	}

	return statusStr, !statusFailed
}
