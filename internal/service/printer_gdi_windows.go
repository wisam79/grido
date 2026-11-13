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
	procSetJobW            = modWinspool.NewProc("SetJobW")
)

// printerGDIWin32API is the deliberately small Win32 seam used by printer-plan,
// status, and cancellation logic. Production delegates to the lazy DLL procs;
// Windows unit tests replace individual functions so no installed printer is
// required to exercise fail-closed and spool-control behavior.
type printerGDIWin32API struct {
	openPrinter        func(name *uint16, handle *windows.Handle, desiredAccess uint32) (bool, error)
	closePrinter       func(handle windows.Handle)
	documentProperties func(handle windows.Handle, name *uint16, out, in *byte, mode uint32) (int32, error)
	deviceCapabilities func(name *uint16, capability uint16, output uintptr) (int32, error)
	createDC           func(name *uint16, devMode *byte) (windows.Handle, error)
	deleteDC           func(handle windows.Handle)
	getDeviceCaps      func(handle windows.Handle, index int32) int
	getJob             func(handle windows.Handle, jobID, level uint32, buffer *byte, bufferSize uint32, needed *uint32) (bool, error)
	setJob             func(handle windows.Handle, jobID, level uint32, buffer *byte, command uint32) (bool, error)
}

var printerGDIWin32 = defaultPrinterGDIWin32API()

func defaultPrinterGDIWin32API() printerGDIWin32API {
	return printerGDIWin32API{
		openPrinter: func(name *uint16, handle *windows.Handle, desiredAccess uint32) (bool, error) {
			var defaults *printerDefaultsW
			if desiredAccess != 0 {
				defaults = &printerDefaultsW{DesiredAccess: desiredAccess}
			}
			r, _, err := procOpenPrinterW.Call(
				uintptr(unsafe.Pointer(name)),
				uintptr(unsafe.Pointer(handle)),
				uintptr(unsafe.Pointer(defaults)),
			)
			return r != 0, err
		},
		closePrinter: func(handle windows.Handle) {
			procClosePrinter.Call(uintptr(handle))
		},
		documentProperties: func(handle windows.Handle, name *uint16, out, in *byte, mode uint32) (int32, error) {
			r, _, err := procDocumentProperties.Call(
				0,
				uintptr(handle),
				uintptr(unsafe.Pointer(name)),
				uintptr(unsafe.Pointer(out)),
				uintptr(unsafe.Pointer(in)),
				uintptr(mode),
			)
			return int32(r), err
		},
		deviceCapabilities: func(name *uint16, capability uint16, output uintptr) (int32, error) {
			r, _, err := procDeviceCapabilities.Call(
				uintptr(unsafe.Pointer(name)),
				0,
				uintptr(capability),
				output,
				0,
			)
			return int32(r), err
		},
		createDC: func(name *uint16, devMode *byte) (windows.Handle, error) {
			r, _, err := procCreateDCW.Call(
				0,
				uintptr(unsafe.Pointer(name)),
				0,
				uintptr(unsafe.Pointer(devMode)),
			)
			return windows.Handle(r), err
		},
		deleteDC: func(handle windows.Handle) {
			procDeleteDC.Call(uintptr(handle))
		},
		getDeviceCaps: func(handle windows.Handle, index int32) int {
			r, _, _ := procGetDeviceCaps.Call(uintptr(handle), uintptr(index))
			return int(int32(r))
		},
		getJob: func(handle windows.Handle, jobID, level uint32, buffer *byte, bufferSize uint32, needed *uint32) (bool, error) {
			r, _, err := procGetJobW.Call(
				uintptr(handle),
				uintptr(jobID),
				uintptr(level),
				uintptr(unsafe.Pointer(buffer)),
				uintptr(bufferSize),
				uintptr(unsafe.Pointer(needed)),
			)
			return r != 0, err
		},
		setJob: func(handle windows.Handle, jobID, level uint32, buffer *byte, command uint32) (bool, error) {
			r, _, err := procSetJobW.Call(
				uintptr(handle),
				uintptr(jobID),
				uintptr(level),
				uintptr(unsafe.Pointer(buffer)),
				uintptr(command),
			)
			return r != 0, err
		},
	}
}

const (
	halfToneMode = 4
	srcCopyRop   = 0x00CC0020
	dibRgbColors = 0

	// GetDeviceCaps indices
	horzResIdx         = 8
	vertResIdx         = 10
	logPixelsXIdx      = 88
	logPixelsYIdx      = 90
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

	jobControlCancel = 3

	printerAccessUse = 0x00000008
)

type printerDefaultsW struct {
	Datatype      *uint16
	DevMode       uintptr
	DesiredAccess uint32
}

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
	// دقة الطابعة الفعلية (LOGPIXELS) — تلزم لتحويل المساحة القابلة للطباعة من
	// بكسلات الجهاز إلى مليمترات في تحذير تصغير الورقة (RV-Print-29).
	DPIX int
	DPIY int
}

func queryDeviceMetrics(hdc windows.Handle) deviceMetrics {
	getCap := func(idx int32) int {
		return printerGDIWin32.getDeviceCaps(hdc, idx)
	}
	return deviceMetrics{
		PhysicalWidth:   getCap(physicalWidthIdx),
		PhysicalHeight:  getCap(physicalHeightIdx),
		PrintableWidth:  getCap(horzResIdx),
		PrintableHeight: getCap(vertResIdx),
		MarginLeft:      getCap(physicalOffsetXIdx),
		MarginTop:       getCap(physicalOffsetYIdx),
		DPIX:            getCap(logPixelsXIdx),
		DPIY:            getCap(logPixelsYIdx),
	}
}

// convertToBottomUpDIB يحول Go image إلى مصفوفة DIB متوافقة مع متطلبات GDI:
//  1. ترتيب الألوان BGRA (32-bit).
//  2. محاذاة الأسطر على حدود 4 بايت محققة تلقائياً (width * 4).
//  3. ترتيب الأسطر Bottom-Up (الصف الأخير في الصورة يكون أول صف في الذاكرة) لتفادي انهيار تعريفات الطابعات.
//  4. تسطيح الشفافية على الأبيض: BI_RGB يتجاهل قناة A فيطبع RGB كما هو —
//     البكسل شبه الشفاف كان يُطبع أغمق من أصله (يُزال أثر الضرب المسبق) والبكسل
//     الشفاف كلياً كان يُطبع **أسود** (RGB=0 في المخزن). الآن يُدمج كل بكسل
//     a<255 فوق أبيض بنفس معادلة مسار CMYK (F = premul + (255−a)) فتخرج
//     الشفافيات بيضاء مطابقة لورقة الطباعة والمعاينة.
//     جلسة 1.67 — الحالة الحدية الموثقة لطباعة PNG شفاف مباشرة عبر GDI.
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
				// القيم مضروبة مسبقاً: premul + (255−a) هو دمجها فوق أبيض حرفياً
				// — الشفاف كلياً (a=0) يخرج أبيض 255 بدل أسود BI_RGB
				w := 0xFF - a
				dstPixOffset := dstRowOffset + x*4
				buf[dstPixOffset+0] = byte(b + w)
				buf[dstPixOffset+1] = byte(g + w)
				buf[dstPixOffset+2] = byte(r + w)
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
				a := uint32(src.Pix[srcPixOffset+3])
				dstPixOffset := dstRowOffset + x*4
				if a == 0 {
					// شفاف كلياً = أبيض الورقة (كان أسود تحت BI_RGB)
					buf[dstPixOffset+0] = 0xFF
					buf[dstPixOffset+1] = 0xFF
					buf[dstPixOffset+2] = 0xFF
					buf[dstPixOffset+3] = 0
				} else {
					// دمج اللون غير المضروب فوق أبيض: c·a/255 + (255−a) بالتقريب
					compose := func(c uint32) uint32 { return (c*a+127)/255 + (0xFF - a) }
					buf[dstPixOffset+0] = byte(compose(uint32(src.Pix[srcPixOffset+2]))) // Blue
					buf[dstPixOffset+1] = byte(compose(uint32(src.Pix[srcPixOffset+1]))) // Green
					buf[dstPixOffset+2] = byte(compose(uint32(src.Pix[srcPixOffset+0]))) // Red
					buf[dstPixOffset+3] = byte(a)                                        // Alpha
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
				// قيم مسبوقة بالضرب ≤ a — الدمج فوق أبيض: premul + (65535−a)
				w16 := uint32(0xFFFF - a)
				dstPixOffset := dstRowOffset + x*4
				buf[dstPixOffset+0] = byte((b + w16) >> 8) // Blue
				buf[dstPixOffset+1] = byte((g + w16) >> 8) // Green
				buf[dstPixOffset+2] = byte((r + w16) >> 8) // Red
				buf[dstPixOffset+3] = byte(a >> 8)         // Alpha / Padding
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

type configuredPrinterDevMode struct {
	Buffer         []byte
	AppliedForm    string
	AppliedPaper   uint16
	PaperWidthMM   float64
	PaperHeightMM  float64
	FallbackReason string
}

func resolvePrinterName(printerName string) (string, error) {
	printerName = strings.TrimSpace(printerName)
	if printerName != "" {
		return printerName, nil
	}
	def, err := GetDefaultPrinter()
	if err != nil || strings.TrimSpace(def) == "" {
		return "", fmt.Errorf("اسم الطابعة فارغ ولا توجد طابعة افتراضية")
	}
	return strings.TrimSpace(def), nil
}

func directPrintRequestFromPlan(req domain.PrinterPlanRequest) domain.DirectPrintRequest {
	return domain.DirectPrintRequest{
		PrinterName:   req.PrinterName,
		FormName:      req.FormName,
		PaperID:       req.PaperID,
		PaperWidthMM:  req.PaperWidthMM,
		PaperHeightMM: req.PaperHeightMM,
		Orientation:   req.Orientation,
		Borderless:    req.Borderless,
	}
}

func validatePrinterPlanRequest(req domain.PrinterPlanRequest) error {
	return validateDirectPrintRequest(directPrintRequestFromPlan(req))
}

func devModePaperSelection(dm *devModeW) (paperID uint16, formName string, widthMM, heightMM float64) {
	if dm == nil {
		return 0, "", 0, 0
	}
	if dm.DmPaperSize > 0 {
		paperID = uint16(dm.DmPaperSize)
	}
	if dm.DmFields&dmFormNameField != 0 {
		formName = windows.UTF16ToString(dm.DmFormName[:])
	}
	if formName == "" {
		formName = standardFormNameByID(paperID)
	}
	if dm.DmFields&dmPaperWidthField != 0 && dm.DmPaperWidth > 0 {
		widthMM = float64(dm.DmPaperWidth) / 10
	}
	if dm.DmFields&dmPaperLengthField != 0 && dm.DmPaperLength > 0 {
		heightMM = float64(dm.DmPaperLength) / 10
	}
	return paperID, formName, widthMM, heightMM
}

func paperSelectionMatchesRequest(req domain.DirectPrintRequest, dm *devModeW) bool {
	if dm == nil {
		return false
	}
	appliedID, appliedForm, appliedW, appliedH := devModePaperSelection(dm)
	if req.PaperID != 0 && appliedID != req.PaperID {
		return false
	}
	if strings.TrimSpace(req.FormName) != "" && !strings.EqualFold(strings.TrimSpace(appliedForm), strings.TrimSpace(req.FormName)) {
		return false
	}
	if req.PaperWidthMM > 0 && req.PaperHeightMM > 0 {
		if appliedW <= 0 || appliedH <= 0 {
			if info, ok := standardPaperInfoByID(appliedID); ok {
				appliedW, appliedH = info.WidthMM, info.HeightMM
			} else {
				return false
			}
		}
		if !samePaperDimensions(req.PaperWidthMM, req.PaperHeightMM, appliedW, appliedH, 2.5) {
			return false
		}
	}
	return true
}

func samePaperDimensions(w1, h1, w2, h2, tolerance float64) bool {
	return (math.Abs(w1-w2) <= tolerance && math.Abs(h1-h2) <= tolerance) ||
		(math.Abs(w1-h2) <= tolerance && math.Abs(h1-w2) <= tolerance)
}

func isExplicitPaperSelection(req domain.DirectPrintRequest) bool {
	return req.PaperID != 0 || strings.TrimSpace(req.FormName) != "" || (req.PaperWidthMM > 0 && req.PaperHeightMM > 0)
}

func devModeBuffer(buf []byte) *devModeW {
	if len(buf) < int(unsafe.Sizeof(devModeW{})) {
		return nil
	}
	return (*devModeW)(unsafe.Pointer(&buf[0]))
}

// configurePrinterDevMode ينفذ بروتوكول الدمج الآمن ذو الخطوتين لتعديل إعدادات DEVMODE:
// 1. استعلام حجم الذاكرة المطلوبة (Public + Private).
// 2. قراءة إعدادات الدرايفر الحالية.
// 3. تعديل الخصائص العامة.
// 4. استدعاء DocumentPropertiesW للدمج والتحقق من صحة الإعدادات عبر الدرايفر.
func configurePrinterDevMode(printerName string, req domain.DirectPrintRequest) ([]byte, error) {
	configured, err := configurePrinterDevModePlan(printerName, req)
	if err != nil {
		return nil, err
	}
	return configured.Buffer, nil
}

func configurePrinterDevModePlan(printerName string, req domain.DirectPrintRequest) (configuredPrinterDevMode, error) {
	configured := configuredPrinterDevMode{}
	pPrinterName, err := windows.UTF16PtrFromString(printerName)
	if err != nil {
		return configured, err
	}

	var hPrinter windows.Handle
	ok, lastErr := printerGDIWin32.openPrinter(pPrinterName, &hPrinter, 0)
	if !ok {
		return configured, fmt.Errorf("تعذر فتح الطابعة '%s': %s", printerName, win32ErrText(lastErr))
	}
	defer printerGDIWin32.closePrinter(hPrinter)

	// الخطوة 1: استعلام الحجم الإجمالي (Public + Driver Private)
	sizeNeeded, _ := printerGDIWin32.documentProperties(hPrinter, pPrinterName, nil, nil, 0)
	if sizeNeeded <= 0 || uintptr(sizeNeeded) < unsafe.Sizeof(devModeW{}) {
		return configured, fmt.Errorf("تعذر استعلام حجم إعدادات الطابعة أو الحجم غير صالح (%d بايت)", sizeNeeded)
	}

	devModeBuf := make([]byte, int(sizeNeeded))

	// الخطوة 2: استخراج الإعدادات الافتراضية
	rOut, lastErr := printerGDIWin32.documentProperties(hPrinter, pPrinterName, &devModeBuf[0], nil, dmOutBuffer)
	if rOut < 0 {
		return configured, fmt.Errorf("تعذر قراءة إعدادات الطابعة: %s", win32ErrText(lastErr))
	}

	// حفظ نسخة احتياطية من الإعدادات الافتراضية للتعافي عند غياب أي اختيار ورق صريح.
	backupBuf := make([]byte, len(devModeBuf))
	copy(backupBuf, devModeBuf)
	backupPaper, backupForm, backupW, backupH := devModePaperSelection(devModeBuffer(backupBuf))

	// الخطوة 3: تطبيق التعديلات
	dm := devModeBuffer(devModeBuf)
	if dm == nil {
		return configured, fmt.Errorf("إعدادات الطابعة المعادة أقصر من بنية DEVMODE")
	}

	// اتجاه الصفحة: إذا طلب landscape صراحة أو كانت الأبعاد المطلوبة عرضية (W > H)
	isLandscape := strings.EqualFold(req.Orientation, "landscape") || (req.PaperWidthMM > req.PaperHeightMM && req.PaperHeightMM > 0)
	dm.DmFields |= dmOrientationField
	if isLandscape {
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

	paperID := req.PaperID
	matchedFormName := strings.TrimSpace(req.FormName)

	if paperID == 0 {
		if strings.TrimSpace(req.FormName) != "" {
			driverID, driverForm, found := findPrinterPaperMatch(pPrinterName, req.PaperWidthMM, req.PaperHeightMM, req.Borderless, req.FormName)
			if found && driverID != 0 {
				paperID = driverID
				matchedFormName = driverForm
			}
		} else if stdID, stdName := matchStandardPaper(req.PaperWidthMM, req.PaperHeightMM); stdID != 0 {
			paperID = stdID
			matchedFormName = stdName
		} else {
			driverID, driverForm, found := findPrinterPaperMatch(pPrinterName, req.PaperWidthMM, req.PaperHeightMM, req.Borderless, "")
			if found && driverID != 0 {
				paperID = driverID
				matchedFormName = driverForm
			}
		}
	} else if matchedFormName == "" {
		if stdName := standardFormNameByID(paperID); stdName != "" {
			matchedFormName = stdName
		} else if _, stdName := matchStandardPaper(req.PaperWidthMM, req.PaperHeightMM); stdName != "" {
			matchedFormName = stdName
		}
	}

	if paperID != 0 {
		dm.DmFields |= dmPaperSizeField
		dm.DmFields &^= (dmPaperWidthField | dmPaperLengthField)
		dm.DmPaperSize = int16(paperID)
		dm.DmPaperWidth = 0
		dm.DmPaperLength = 0
		if matchedFormName != "" {
			dm.DmFields |= dmFormNameField
			dm.DmFormName = formNameField(matchedFormName)
		} else {
			dm.DmFields &^= dmFormNameField
			dm.DmFormName = [32]uint16{}
		}
	} else if req.PaperWidthMM > 0 && req.PaperHeightMM > 0 {
		dimMin := math.Min(req.PaperWidthMM, req.PaperHeightMM)
		dimMax := math.Max(req.PaperWidthMM, req.PaperHeightMM)
		dm.DmFields |= dmPaperSizeField | dmPaperWidthField | dmPaperLengthField
		dm.DmPaperSize = dmPaperUser
		dm.DmPaperWidth = int16(math.Round(dimMin * 10))
		dm.DmPaperLength = int16(math.Round(dimMax * 10))
		if req.FormName != "" {
			dm.DmFields |= dmFormNameField
			dm.DmFormName = formNameField(req.FormName)
		} else {
			dm.DmFields &^= dmFormNameField
			dm.DmFormName = [32]uint16{}
		}
	} else if req.FormName != "" {
		return configured, fmt.Errorf("قالب الورق المطلوب '%s' غير موجود ضمن قوالب الطابعة", strings.TrimSpace(req.FormName))
	}

	// الخطوة 4: دمج التعديلات والتحقق من صحتها عبر الدرايفر.

	rMerge, lastErr := printerGDIWin32.documentProperties(hPrinter, pPrinterName, &devModeBuf[0], &devModeBuf[0], dmInBuffer|dmOutBuffer)
	if rMerge < 0 {
		if isExplicitPaperSelection(req) {
			return configured, fmt.Errorf("رفض برنامج تشغيل الطابعة إعداد الورق المطلوب: %s", win32ErrText(lastErr))
		}

		dmBackup := devModeBuffer(backupBuf)
		dmBackup.DmFields |= dmOrientationField | dmCopiesField | dmColorField
		dmBackup.DmOrientation = dm.DmOrientation
		dmBackup.DmCopies = dm.DmCopies
		dmBackup.DmColor = dm.DmColor
		rFallback, fallbackErr := printerGDIWin32.documentProperties(hPrinter, pPrinterName, &backupBuf[0], &backupBuf[0], dmInBuffer|dmOutBuffer)
		if rFallback < 0 {
			return configured, fmt.Errorf("رفض برنامج تشغيل الطابعة الإعدادات المطلوبة والافتراضية: %s", win32ErrText(fallbackErr))
		}
		configured.Buffer = backupBuf
		configured.AppliedPaper = backupPaper
		configured.AppliedForm = backupForm
		configured.PaperWidthMM = backupW
		configured.PaperHeightMM = backupH
		configured.FallbackReason = "driver rejected requested non-paper settings; applied printer defaults"
		return configured, nil
	}

	if isExplicitPaperSelection(req) && !paperSelectionMatchesRequest(req, dm) {
		return configured, fmt.Errorf("رفض برنامج تشغيل الطابعة إعداد الورق المطلوب واستبدله بقالب آخر")
	}

	configured.Buffer = devModeBuf
	configured.AppliedPaper, configured.AppliedForm, configured.PaperWidthMM, configured.PaperHeightMM = devModePaperSelection(dm)
	return configured, nil
}

func readPrinterPaperCapabilities(pPrinterName *uint16) ([]domain.SupportedPaperInfo, error) {
	if pPrinterName == nil {
		return nil, fmt.Errorf("اسم الطابعة غير صالح")
	}
	count, capErr := printerGDIWin32.deviceCapabilities(pPrinterName, dcPapers, 0)
	if count < 0 {
		return nil, fmt.Errorf("تعذر استعلام عدد قوالب الورق: %s", win32ErrText(capErr))
	}
	if count == 0 {
		return []domain.SupportedPaperInfo{}, nil
	}
	if count > 10000 {
		return nil, fmt.Errorf("عدد قوالب الورق المُبلغ من الطابعة شاذ (%d)", count)
	}

	n := int(count)
	paperIDs := make([]uint16, n)
	if r, err := printerGDIWin32.deviceCapabilities(pPrinterName, dcPapers, uintptr(unsafe.Pointer(&paperIDs[0]))); r < 0 {
		return nil, fmt.Errorf("تعذر قراءة معرفات قوالب الورق: %s", win32ErrText(err))
	}
	namesBuf := make([]uint16, n*64)
	if r, err := printerGDIWin32.deviceCapabilities(pPrinterName, dcPaperNames, uintptr(unsafe.Pointer(&namesBuf[0]))); r < 0 {
		return nil, fmt.Errorf("تعذر قراءة أسماء قوالب الورق: %s", win32ErrText(err))
	}
	type point struct{ X, Y int32 }
	sizesBuf := make([]point, n)
	if r, err := printerGDIWin32.deviceCapabilities(pPrinterName, dcPaperSize, uintptr(unsafe.Pointer(&sizesBuf[0]))); r < 0 {
		return nil, fmt.Errorf("تعذر قراءة أبعاد قوالب الورق: %s", win32ErrText(err))
	}

	papers := make([]domain.SupportedPaperInfo, n)
	for i := range papers {
		papers[i] = parseSupportedPaperInfo(paperIDs[i], namesBuf[i*64:(i+1)*64], sizesBuf[i].X, sizesBuf[i].Y)
	}
	return papers, nil
}

func choosePrinterPaper(papers []domain.SupportedPaperInfo, targetW, targetH float64, borderless bool, requestedForm string) (domain.SupportedPaperInfo, bool) {
	requestedForm = strings.TrimSpace(requestedForm)
	dimMin := math.Min(targetW, targetH)
	dimMax := math.Max(targetW, targetH)
	bestScore := math.MaxFloat64
	var best domain.SupportedPaperInfo
	found := false
	for _, paper := range papers {
		cMin := math.Min(paper.WidthMM, paper.HeightMM)
		cMax := math.Max(paper.WidthMM, paper.HeightMM)
		diffMin := math.Abs(dimMin - cMin)
		diffMax := math.Abs(dimMax - cMax)
		diff := diffMin + diffMax
		isDimMatch := targetW > 0 && targetH > 0 && diffMin <= 2.5 && diffMax <= 2.5
		isNameMatch := requestedForm != "" && strings.EqualFold(strings.TrimSpace(paper.Name), requestedForm)
		if !isDimMatch && !isNameMatch {
			continue
		}
		score := diff
		if paper.IsBorderless != borderless {
			score += 100
		}
		if score < bestScore {
			bestScore = score
			best = paper
			found = true
		}
	}
	return best, found
}

// findPrinterPaperMatch يبحث عن أفضل قالب ورق متوافق مع المقاس المطلوب من قائمة قوالب الطابعة الحية:
// يستعلم DeviceCapabilities (DC_PAPERS, DC_PAPERNAMES, DC_PAPERSIZE) للبحث عن معرف القالب الخاص بالدرايفر
// (Vendor Form ID) مثل ورق الصور 10x15 سم (4x6 بوصة) أو 13x18 سم في طابعات الصور (Epson/Canon/HP).
func findPrinterPaperMatch(pPrinterName *uint16, targetW, targetH float64, borderless bool, requestedForm string) (paperID uint16, matchedForm string, isMatched bool) {
	if pPrinterName == nil || (targetW <= 0 && targetH <= 0 && requestedForm == "") {
		return 0, requestedForm, false
	}
	papers, err := readPrinterPaperCapabilities(pPrinterName)
	if err != nil {
		return 0, requestedForm, false
	}
	best, found := choosePrinterPaper(papers, targetW, targetH, borderless, requestedForm)
	if !found {
		return 0, requestedForm, false
	}
	return best.ID, best.Name, true
}

// matchStandardPaper يطابق أبعاد الورقة بالمليمتر مع معرفات قوالب ويندوز القياسية (DMPAPER_*)
// واسم القالب المقابل بتسامح 1.5 مم لاستيعاب فروق التقريب بين البوصة والمليمتر.
func matchStandardPaper(w, h float64) (id uint16, formName string) {
	dimMin := math.Min(w, h)
	dimMax := math.Max(w, h)
	near := func(a, b float64) bool {
		return math.Abs(a-b) <= 1.5
	}
	switch {
	case near(dimMin, 210) && near(dimMax, 297):
		return 9, "A4" // DMPAPER_A4
	case near(dimMin, 297) && near(dimMax, 420):
		return 8, "A3" // DMPAPER_A3
	case near(dimMin, 148) && near(dimMax, 210):
		return 11, "A5" // DMPAPER_A5
	case near(dimMin, 105) && near(dimMax, 148):
		return 70, "A6" // DMPAPER_A6
	case near(dimMin, 420) && near(dimMax, 594):
		return 66, "A2" // DMPAPER_A2
	case near(dimMin, 215.9) && near(dimMax, 279.4):
		return 1, "Letter" // DMPAPER_LETTER
	case near(dimMin, 215.9) && near(dimMax, 355.6):
		return 5, "Legal" // DMPAPER_LEGAL
	case near(dimMin, 279.4) && near(dimMax, 431.8):
		return 3, "Tabloid" // DMPAPER_TABLOID
	case near(dimMin, 182) && near(dimMax, 257):
		return 13, "B5 (JIS)" // DMPAPER_B5
	case near(dimMin, 250) && near(dimMax, 354):
		return 12, "B4 (JIS)" // DMPAPER_B4
	case near(dimMin, 128) && near(dimMax, 182):
		return 88, "B6 (JIS)" // DMPAPER_B6_JIS
	case near(dimMin, 184.15) && near(dimMax, 266.7):
		return 7, "Executive" // DMPAPER_EXECUTIVE
	case near(dimMin, 100) && near(dimMax, 148):
		return 43, "Japanese Postcard" // DMPAPER_JAPANESE_POSTCARD
	case near(dimMin, 139.7) && near(dimMax, 215.9):
		return 6, "Statement" // DMPAPER_STATEMENT
	case near(dimMin, 254) && near(dimMax, 355.6):
		return 16, "10x14" // DMPAPER_10X14
	default:
		return 0, ""
	}
}

// matchStandardPaperID يطابق أبعاد الورقة بالمليمتر مع معرفات قوالب ويندوز القياسية (DMPAPER_*)
// بتسامح 1.5 مم لاستيعاب فروق التقريب بين البوصة والمليمتر.
func matchStandardPaperID(w, h float64) uint16 {
	id, _ := matchStandardPaper(w, h)
	return id
}

// standardFormNameByID يعيد الاسم القياسي لقالب ويندوز المقابل لمعرف الورق DMPAPER_*
func standardFormNameByID(id uint16) string {
	switch id {
	case 1:
		return "Letter"
	case 3:
		return "Tabloid"
	case 5:
		return "Legal"
	case 6:
		return "Statement"
	case 7:
		return "Executive"
	case 8:
		return "A3"
	case 9:
		return "A4"
	case 11:
		return "A5"
	case 12:
		return "B4 (JIS)"
	case 13:
		return "B5 (JIS)"
	case 16:
		return "10x14"
	case 43:
		return "Japanese Postcard"
	case 66:
		return "A2"
	case 70:
		return "A6"
	case 88:
		return "B6 (JIS)"
	default:
		return ""
	}
}

func standardPaperInfoByID(id uint16) (domain.SupportedPaperInfo, bool) {
	var info domain.SupportedPaperInfo
	info.ID = id
	info.Name = standardFormNameByID(id)
	switch id {
	case 1:
		info.WidthMM, info.HeightMM = 215.9, 279.4
	case 3:
		info.WidthMM, info.HeightMM = 279.4, 431.8
	case 5:
		info.WidthMM, info.HeightMM = 215.9, 355.6
	case 6:
		info.WidthMM, info.HeightMM = 139.7, 215.9
	case 7:
		info.WidthMM, info.HeightMM = 184.15, 266.7
	case 8:
		info.WidthMM, info.HeightMM = 297, 420
	case 9:
		info.WidthMM, info.HeightMM = 210, 297
	case 11:
		info.WidthMM, info.HeightMM = 148, 210
	case 12:
		info.WidthMM, info.HeightMM = 250, 354
	case 13:
		info.WidthMM, info.HeightMM = 182, 257
	case 16:
		info.WidthMM, info.HeightMM = 254, 355.6
	case 43:
		info.WidthMM, info.HeightMM = 100, 148
	case 66:
		info.WidthMM, info.HeightMM = 420, 594
	case 70:
		info.WidthMM, info.HeightMM = 105, 148
	case 88:
		info.WidthMM, info.HeightMM = 128, 182
	default:
		return domain.SupportedPaperInfo{}, false
	}
	return info, true
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

	cleanPath, err := filepath.Abs(filePath)
	if err != nil {
		return "", fmt.Errorf("مسار الملف غير صالح: %w", err)
	}
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
	exportsDir, expErr := filepath.Abs(utils.GetExportsDir())
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

	inExports := utils.PathWithinDir(absClean, exportsDir)
	inPrintTemp := tempErr == nil &&
		utils.PathWithinDir(absClean, tempDir) &&
		strings.HasPrefix(filepath.Base(absClean), "grido_print_")
	if !inExports && !inPrintTemp {
		return "", fmt.Errorf("مسار الملف غير مصرح به للطباعة: %s", cleanPath)
	}

	return cleanPath, nil
}

func calculatePrinterPlanGeometry(metrics deviceMetrics, paperWidthMM, paperHeightMM float64) (printableWidthMM, printableHeightMM, offsetXMM, offsetYMM, scale float64) {
	const mmPerInch = 25.4
	if metrics.DPIX > 0 {
		printableWidthMM = float64(metrics.PrintableWidth) / float64(metrics.DPIX) * mmPerInch
		offsetXMM = float64(metrics.MarginLeft) / float64(metrics.DPIX) * mmPerInch
	}
	if metrics.DPIY > 0 {
		printableHeightMM = float64(metrics.PrintableHeight) / float64(metrics.DPIY) * mmPerInch
		offsetYMM = float64(metrics.MarginTop) / float64(metrics.DPIY) * mmPerInch
	}
	if paperWidthMM > 0 && paperHeightMM > 0 && printableWidthMM > 0 && printableHeightMM > 0 {
		scale = math.Min(printableWidthMM/paperWidthMM, printableHeightMM/paperHeightMM)
		if scale > 1 {
			scale = 1
		}
	}
	return printableWidthMM, printableHeightMM, offsetXMM, offsetYMM, scale
}

func orientPaperDimensions(widthMM, heightMM float64, orientation string) (float64, float64) {
	if widthMM <= 0 || heightMM <= 0 {
		return widthMM, heightMM
	}
	landscape := strings.EqualFold(strings.TrimSpace(orientation), "landscape")
	if landscape && widthMM < heightMM {
		return heightMM, widthMM
	}
	if !landscape && widthMM > heightMM {
		return heightMM, widthMM
	}
	return widthMM, heightMM
}

// calculatePrintDestRect يحسب موضع وأبعاد رسم الصورة في سياق الطابعة (GDI):
// - في وضع Borderless: احتواء (contain) داخل الأبعاد الفيزيائية للورقة وتوسيطها بنسبة الأبعاد،
// مع منع الإزاحات السالبة نهائياً لحماية أطراف الورقة ورؤوس الصور من القص الميكانيكي.
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
			if scaleY < scale {
				scale = scaleY
			}
			destW = int32(math.Floor(float64(imgW) * scale))
			destH = int32(math.Floor(float64(imgH) * scale))
			destX = int32(originX + (baseW-int(destW))/2)
			destY = int32(originY + (baseH-int(destH))/2)
			// حماية حتمية ضد القص: إحداثيات الرسم في GDI يجب ألا تكون سالبة
			// لأن سياق الطابعة يقتطع أي بكسل في النطاق السالب بصمت.
			if destX < 0 {
				destX = 0
			}
			if destY < 0 {
				destY = 0
			}
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
	if destX < 0 {
		destX = 0
	}
	if destY < 0 {
		destY = 0
	}
	return destX, destY, destW, destH
}

// ResolvePrinterPlan resolves the driver's effective paper and destination
// geometry without starting a spool job.
func (s *PrintService) ResolvePrinterPlan(req domain.PrinterPlanRequest) (domain.PrinterPlanResult, error) {
	result := domain.PrinterPlanResult{
		RequestedFormName: strings.TrimSpace(req.FormName),
		RequestedPaperID:  req.PaperID,
	}
	if err := validatePrinterPlanRequest(req); err != nil {
		result.Code = "INVALID_REQUEST"
		result.Error = err.Error()
		return result, nil
	}

	printerName, err := resolvePrinterName(req.PrinterName)
	if err != nil {
		result.Code = "PRINTER_NOT_FOUND"
		result.Error = err.Error()
		return result, nil
	}
	printReq := directPrintRequestFromPlan(req)
	printReq.PrinterName = printerName
	configured, err := configurePrinterDevModePlan(printerName, printReq)
	if err != nil {
		result.Code = "PAPER_REJECTED"
		result.Error = err.Error()
		return result, nil
	}

	pPrinterName, err := windows.UTF16PtrFromString(printerName)
	if err != nil {
		return result, err
	}
	var devMode *byte
	if len(configured.Buffer) > 0 {
		devMode = &configured.Buffer[0]
	}
	hdc, createErr := printerGDIWin32.createDC(pPrinterName, devMode)
	if hdc == 0 {
		result.Code = "PRINTER_CONTEXT_FAILED"
		result.Error = fmt.Sprintf("فشل إنشاء سياق الطابعة CreateDCW: %s", win32ErrText(createErr))
		return result, nil
	}
	defer printerGDIWin32.deleteDC(hdc)

	metrics := queryDeviceMetrics(hdc)
	paperW, paperH := configured.PaperWidthMM, configured.PaperHeightMM
	if paperW <= 0 || paperH <= 0 {
		if info, ok := standardPaperInfoByID(configured.AppliedPaper); ok {
			paperW, paperH = info.WidthMM, info.HeightMM
		}
	}
	if paperW <= 0 || paperH <= 0 {
		paperW, paperH = req.PaperWidthMM, req.PaperHeightMM
	}
	paperW, paperH = orientPaperDimensions(paperW, paperH, req.Orientation)
	printableW, printableH, offsetX, offsetY, scale := calculatePrinterPlanGeometry(metrics, paperW, paperH)

	result.Success = true
	result.Code = "EXACT"
	if configured.FallbackReason != "" {
		result.Code = "FALLBACK"
	}
	result.AppliedFormName = configured.AppliedForm
	result.AppliedPaperID = configured.AppliedPaper
	result.PaperWidthMM = paperW
	result.PaperHeightMM = paperH
	result.PrintableWidthMM = printableW
	result.PrintableHeightMM = printableH
	result.PrintableOffsetXMM = offsetX
	result.PrintableOffsetYMM = offsetY
	result.Scale = scale
	result.FallbackReason = configured.FallbackReason
	return result, nil
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

	// 2. تكوين DEVMODE للطابعة المستهدفة. اختيار الورق الصريح يفشل مغلقاً؛
	// لا يجوز إسقاطه إلى A4 أو إعداد الدرايفر الافتراضي بصمت.
	devModeBuf, err := configurePrinterDevMode(printerName, req)
	if err != nil {
		return 0, err
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

	// 🖨️ RV-Print-29: احتواء (contain) داخل المساحة القابلة للطباعة في الوضع
	// العادي يصغّر ورقة مصمّمة على مقاس الورق بالضبط (~1.5%) داخل هوامش العتاد
	// بلا أي إشارة. نُبقي الاحتواء عمداً — هو السلوك الآمن الوحيد لحماية المحتوى
	// من القص عبر درايفرات الطابعات المختلفة — لكن نُسجّل تحذيراً تشخيصياً دقيقاً
	// بالمقاس الاسمي للورقة والمساحة القابلة للطباعة بالمليمتر ومعامل التصغير
	// الفيزيائي الناتج. التحذير المرئي للمستخدم في الواجهة تحسين مستقبلي (حوار
	// الطباعة لا يعرف هوامش الطابعة المختارة وقت التصميم). يُحسب مرة واحدة لكل
	// مهمة طباعة فلا كلفة تُذكر، ويقارن المليمترات الفيزيائية فلا ينذار زوراً
	// حين يختلف تقريب الطابعة عن DPI التصميم.
	if !req.Borderless && req.PaperWidthMM > 0 && req.PaperHeightMM > 0 &&
		metrics.DPIX > 0 && metrics.DPIY > 0 && metrics.PrintableWidth > 0 && metrics.PrintableHeight > 0 {
		const mmPerInch = 25.4
		printableWMM := float64(metrics.PrintableWidth) / float64(metrics.DPIX) * mmPerInch
		printableHMM := float64(metrics.PrintableHeight) / float64(metrics.DPIY) * mmPerInch
		scaleW := (float64(destW) / float64(metrics.DPIX) * mmPerInch) / req.PaperWidthMM
		scaleH := (float64(destH) / float64(metrics.DPIY) * mmPerInch) / req.PaperHeightMM
		fitScale := math.Min(scaleW, scaleH)
		if fitScale < 0.995 {
			slog.Warn("GDI direct print: designed sheet scaled down to fit driver printable area",
				"nominalWMM", req.PaperWidthMM, "nominalHMM", req.PaperHeightMM,
				"printableWMM", printableWMM, "printableHMM", printableHMM,
				"scale", fitScale)
		}
	}

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

	// 1. عدد القوالب المدعومة وبياناتها تُقرأ عبر مصدر واحد مشترك مع حل الخطة.
	papers, err := readPrinterPaperCapabilities(pPrinterName)
	if err != nil {
		return nil, fmt.Errorf("تعذر قراءة قوالب الورق من الطابعة '%s': %w", printerName, err)
	}
	return papers, nil
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
	ok, lastErr := printerGDIWin32.openPrinter(pPrinterName, &hPrinter, 0)
	if !ok {
		return domain.DirectPrintResult{Success: false, JobID: jobID, Code: "PRINTER_OPEN_FAILED", Error: fmt.Sprintf("تعذر الاتصال بالطابعة: %s", win32ErrText(lastErr))}, nil
	}
	defer printerGDIWin32.closePrinter(hPrinter)

	var needed uint32
	found, probeErr := printerGDIWin32.getJob(hPrinter, uint32(jobID), 2, nil, 0, &needed)
	if needed == 0 {
		if !found && (errors.Is(probeErr, windows.ERROR_INVALID_PARAMETER) || errors.Is(probeErr, windows.ERROR_FILE_NOT_FOUND)) {
			return domain.DirectPrintResult{
				Success:  false,
				JobID:    jobID,
				Status:   "Not Found",
				Code:     "JOB_NOT_FOUND",
				Terminal: true,
				Error:    "لم تعد مهمة الطباعة موجودة في الطابور؛ لا يمكن إثبات ما إذا اكتملت أم أُزيلت",
			}, nil
		}
		return domain.DirectPrintResult{
			Success: false,
			JobID:   jobID,
			Code:    "JOB_QUERY_FAILED",
			Error:   fmt.Sprintf("تعذر استعلام حالة المهمة: %s", win32ErrText(probeErr)),
		}, nil
	}

	buf := make([]byte, needed)
	found, lastErr = printerGDIWin32.getJob(hPrinter, uint32(jobID), 2, &buf[0], needed, &needed)
	if !found {
		return domain.DirectPrintResult{
			Success: false,
			JobID:   jobID,
			Code:    "JOB_QUERY_FAILED",
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

	status := evaluateJobStatus(info.Status, driverMsg)

	return domain.DirectPrintResult{
		Success:  status.Success,
		JobID:    jobID,
		Status:   status.Status,
		Code:     status.Code,
		Terminal: status.Terminal,
		Error:    status.Error,
	}, nil
}

// CancelSpoolJob requests JOB_CONTROL_CANCEL for one Windows spooler job.
func (s *PrintService) CancelSpoolJob(printerName string, jobID int32) error {
	if jobID <= 0 {
		return fmt.Errorf("معرّف مهمة الطباعة غير صالح: %d", jobID)
	}
	resolved, err := resolvePrinterName(printerName)
	if err != nil {
		return err
	}
	pPrinterName, err := windows.UTF16PtrFromString(resolved)
	if err != nil {
		return err
	}
	var hPrinter windows.Handle
	ok, lastErr := printerGDIWin32.openPrinter(pPrinterName, &hPrinter, printerAccessUse)
	if !ok {
		return fmt.Errorf("تعذر فتح الطابعة '%s': %s", resolved, win32ErrText(lastErr))
	}
	defer printerGDIWin32.closePrinter(hPrinter)
	ok, lastErr = printerGDIWin32.setJob(hPrinter, uint32(jobID), 0, nil, jobControlCancel)
	if !ok {
		if errors.Is(lastErr, windows.ERROR_INVALID_PARAMETER) || errors.Is(lastErr, windows.ERROR_FILE_NOT_FOUND) {
			return fmt.Errorf("JOB_NOT_FOUND: مهمة الطباعة #%d غير موجودة في الطابور", jobID)
		}
		return fmt.Errorf("تعذر إلغاء مهمة الطباعة #%d: %s", jobID, win32ErrText(lastErr))
	}
	return nil
}

const (
	jobStatusPaused           = 0x00000001
	jobStatusError            = 0x00000002
	jobStatusDeleting         = 0x00000004
	jobStatusSpooling         = 0x00000008
	jobStatusPrinting         = 0x00000010
	jobStatusOffline          = 0x00000020
	jobStatusPaperout         = 0x00000040
	jobStatusPrinted          = 0x00000080
	jobStatusDeleted          = 0x00000100
	jobStatusBlockedDevQ      = 0x00000200
	jobStatusUserIntervention = 0x00000400
	jobStatusRestart          = 0x00000800
	jobStatusComplete         = 0x00001000
	jobStatusRetained         = 0x00002000
	jobStatusRenderingLocally = 0x00004000
)

type spoolJobStatus struct {
	Status   string
	Code     string
	Success  bool
	Terminal bool
	Error    string
}

// evaluateJobStatus maps numeric JOB_STATUS_* bits to a stable result. Driver
// text may enrich Status, but never supplies the stable code or failure text.
func evaluateJobStatus(statusBits uint32, driverMsg string) spoolJobStatus {
	result := spoolJobStatus{Status: "Spooling", Code: "SPOOLING", Success: true}

	type statusRule struct {
		mask     uint32
		status   string
		code     string
		success  bool
		terminal bool
		error    string
	}
	rules := []statusRule{
		{jobStatusDeleted, "Deleted", "JOB_DELETED", false, true, "تم حذف مهمة الطباعة من الطابور"},
		{jobStatusError, "Error", "JOB_ERROR", false, true, "أبلغ طابور الطباعة عن خطأ في المهمة"},
		{jobStatusPaperout, "Out of Paper", "OUT_OF_PAPER", false, false, "نفد الورق من الطابعة"},
		{jobStatusOffline, "Printer Offline", "PRINTER_OFFLINE", false, false, "الطابعة غير متصلة"},
		{jobStatusBlockedDevQ, "Blocked", "JOB_BLOCKED", false, false, "حظر برنامج تشغيل الطابعة مهمة الطباعة"},
		{jobStatusUserIntervention, "User Intervention Required", "USER_INTERVENTION_REQUIRED", false, false, "تتطلب الطابعة تدخلاً من المستخدم"},
		{jobStatusDeleting, "Deleting", "JOB_DELETING", true, false, ""},
		{jobStatusPaused, "Paused", "JOB_PAUSED", true, false, ""},
		{jobStatusRestart, "Restarting", "JOB_RESTARTING", true, false, ""},
		{jobStatusRenderingLocally, "Rendering", "JOB_RENDERING", true, false, ""},
		{jobStatusPrinting, "Printing", "PRINTING", true, false, ""},
		{jobStatusPrinted | jobStatusComplete, "Printed", "COMPLETED", true, true, ""},
		{jobStatusRetained, "Retained", "JOB_RETAINED", true, true, ""},
		{jobStatusSpooling, "Spooling", "SPOOLING", true, false, ""},
	}
	for _, rule := range rules {
		if statusBits&rule.mask != 0 {
			result = spoolJobStatus{
				Status:   rule.status,
				Code:     rule.code,
				Success:  rule.success,
				Terminal: rule.terminal,
				Error:    rule.error,
			}
			break
		}
	}

	if strings.TrimSpace(driverMsg) != "" {
		result.Status = strings.TrimSpace(driverMsg)
		if !result.Success {
			result.Error = strings.TrimSpace(driverMsg)
		}
	}
	return result
}
