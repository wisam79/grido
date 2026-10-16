//go:build windows

package service

import (
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"log/slog"
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
	halfToneMode   = 4
	srcCopyRop     = 0x00CC0020
	dibRgbColors   = 0

	// GetDeviceCaps indices
	horzResIdx        = 8
	vertResIdx        = 10
	logPixelsXIdx     = 88
	logPixelsYIdx     = 90
	physicalWidthIdx  = 110
	physicalHeightIdx = 111
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
	DpiX            int
	DpiY            int
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
		return int(r)
	}
	return deviceMetrics{
		DpiX:            getCap(logPixelsXIdx),
		DpiY:            getCap(logPixelsYIdx),
		PhysicalWidth:   getCap(physicalWidthIdx),
		PhysicalHeight:  getCap(physicalHeightIdx),
		PrintableWidth:  getCap(horzResIdx),
		PrintableHeight: getCap(vertResIdx),
		MarginLeft:      getCap(physicalOffsetXIdx),
		MarginTop:       getCap(physicalOffsetYIdx),
	}
}

// convertToBottomUpDIB يحول Go image إلى مصفوفة DIB متوافقة مع متطلبات GDI:
// 1. ترتيب الألوان BGRA (32-bit).
// 2. محاذاة الأسطر على حدود 4 بايت محققة تلقائياً (width * 4).
// 3. ترتيب الأسطر Bottom-Up (الصف الأخير في الصورة يكون أول صف في الذاكرة) لتفادي انهيار تعريفات الطابعات.
func convertToBottomUpDIB(img image.Image) ([]byte, bitmapInfo) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	stride := width * 4
	buf := make([]byte, stride*height)

	for y := 0; y < height; y++ {
		srcY := bounds.Min.Y + (height - 1 - y)
		dstRowOffset := y * stride
		for x := 0; x < width; x++ {
			srcX := bounds.Min.X + x
			r, g, b, a := img.At(srcX, srcY).RGBA()
			dstPixOffset := dstRowOffset + x*4
			buf[dstPixOffset+0] = byte(b >> 8) // Blue
			buf[dstPixOffset+1] = byte(g >> 8) // Green
			buf[dstPixOffset+2] = byte(r >> 8) // Red
			buf[dstPixOffset+3] = byte(a >> 8) // Alpha / Padding
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
		return nil, fmt.Errorf("تعذر فتح الطابعة '%s': %w", printerName, lastErr)
	}
	defer procClosePrinter.Call(uintptr(hPrinter))

	// الخطوة 1: استعلام الحجم الإجمالي (Public + Driver Private)
	sizeNeeded, _, _ := procDocumentProperties.Call(
		0,
		uintptr(hPrinter),
		uintptr(unsafe.Pointer(pPrinterName)),
		0, 0, 0,
	)
	if int32(sizeNeeded) <= 0 {
		return nil, fmt.Errorf("تعذر استعلام حجم إعدادات الطابعة (DocumentProperties)")
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
		return nil, fmt.Errorf("تعذر قراءة إعدادات الطابعة: %w", lastErr)
	}

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
		dm.DmFields |= dmFormNameField
		dm.DmPaperSize = 0
		utf16Form := windows.StringToUTF16(req.FormName)
		for i := range dm.DmFormName {
			if i < len(utf16Form) {
				dm.DmFormName[i] = utf16Form[i]
			} else {
				dm.DmFormName[i] = 0
			}
		}
	} else if req.PaperWidthMM > 0 && req.PaperHeightMM > 0 {
		dm.DmFields |= dmPaperSizeField | dmPaperWidthField | dmPaperLengthField
		dm.DmPaperSize = dmPaperUser
		// في GDI الأبعاد تُمرر بـ عُشر المليمتر (0.1 mm)
		dm.DmPaperWidth = int16(req.PaperWidthMM * 10)
		dm.DmPaperLength = int16(req.PaperHeightMM * 10)
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
		slog.Warn("DocumentProperties merge returned warning/error, proceeding with raw devmode", "err", lastErr)
	}

	return devModeBuf, nil
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

	// 🔒 حصر الطباعة في مجلد Exports أو مجلد Temp الخاص بالنظام
	exportsDir, expErr := filepath.Abs(filepath.Join(utils.GetAppDir(), "Exports"))
	tempDir, tmpErr := filepath.Abs(os.TempDir())
	absClean, absErr := filepath.Abs(cleanPath)
	if expErr != nil || tmpErr != nil || absErr != nil {
		return "", fmt.Errorf("خطأ في التحقق من أمان مسار الملف")
	}

	inExports := strings.HasPrefix(strings.ToLower(absClean), strings.ToLower(exportsDir))
	inTemp := strings.HasPrefix(strings.ToLower(absClean), strings.ToLower(tempDir))
	if !inExports && !inTemp {
		return "", fmt.Errorf("مسار الملف غير مصرح به للطباعة: %s", cleanPath)
	}

	return cleanPath, nil
}

// PrintImageDirectGDI يرسل صورة مولدة مباشرة إلى طابعة ويندوز عبر Win32 GDI
func (s *PrintService) PrintImageDirectGDI(req domain.DirectPrintRequest) (int32, error) {
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
		return 0, fmt.Errorf("فشل إنشاء سياق الطابعة CreateDCW: %w", lastErr)
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
		return 0, fmt.Errorf("فشل بدء مهمة الطباعة StartDocW: %w", lastErr)
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
		return 0, fmt.Errorf("فشل بدء صفحة الطباعة StartPage: %w", lastErr)
	}

	// 7. ضبط نمط التنعيم الفائق HALFTONE وإعادة ضبط الفرشاة
	procSetStretchBltMode.Call(hdc, uintptr(halfToneMode))
	procSetBrushOrgEx.Call(hdc, 0, 0, 0)

	// 8. تجهيز مصفوفة DIB وحساب موضع وأبعاد الرسم
	dibPixels, bmi := convertToBottomUpDIB(img)
	imgW := img.Bounds().Dx()
	imgH := img.Bounds().Dy()

	var destX, destY, destW, destH int32

	if req.Borderless {
		// في وضع بدون حواف: نغطي كامل أبعاد الورقة الفيزيائية مع تعويض الهوامش السالبة/الموجبة
		destX = -int32(metrics.MarginLeft)
		destY = -int32(metrics.MarginTop)
		destW = int32(metrics.PhysicalWidth)
		destH = int32(metrics.PhysicalHeight)

		// صمام أمان في حال عدم إرجاع أبعاد فيزيائية صحيحة من الدرايفر
		if destW <= 0 {
			destW = int32(metrics.PrintableWidth)
			destX = 0
		}
		if destH <= 0 {
			destH = int32(metrics.PrintableHeight)
			destY = 0
		}
	} else {
		// الوضع القياسي: الحفاظ على النسبة والتوسيط داخل المساحة القابلة للطباعة
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
		return 0, fmt.Errorf("فشل رسم بيانات الصورة في الطابعة StretchDIBits: %w", lastErr)
	}

	// 10. إغلاق الصفحة والمستند
	procEndPage.Call(hdc)
	procEndDoc.Call(hdc)
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

	// 1. عدد القوالب المدعومة
	count, _, _ := procDeviceCapabilities.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		0,
		uintptr(dcPapers),
		0, 0,
	)
	if int(count) <= 0 {
		return []domain.SupportedPaperInfo{}, nil
	}
	n := int(count)

	// 2. معرفات الورق
	paperIDs := make([]uint16, n)
	procDeviceCapabilities.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		0,
		uintptr(dcPapers),
		uintptr(unsafe.Pointer(&paperIDs[0])),
		0,
	)

	// 3. أسماء القوالب (كل اسم 64 محرف WCHAR)
	namesBuf := make([]uint16, n*64)
	procDeviceCapabilities.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		0,
		uintptr(dcPaperNames),
		uintptr(unsafe.Pointer(&namesBuf[0])),
		0,
	)

	// 4. قراءة الأبعاد (POINT: X, Y بـ 0.1 mm)
	type point struct{ X, Y int32 }
	sizesBuf := make([]point, n)
	procDeviceCapabilities.Call(
		uintptr(unsafe.Pointer(pPrinterName)),
		0,
		uintptr(dcPaperSize),
		uintptr(unsafe.Pointer(&sizesBuf[0])),
		0,
	)

	result := make([]domain.SupportedPaperInfo, n)
	for i := 0; i < n; i++ {
		nameSlice := namesBuf[i*64 : (i+1)*64]
		formName := windows.UTF16ToString(nameSlice)
		isBorderless := strings.Contains(strings.ToLower(formName), "borderless") ||
			strings.Contains(formName, "بدون حواف")

		result[i] = domain.SupportedPaperInfo{
			ID:           paperIDs[i],
			Name:         formName,
			WidthMM:      float64(sizesBuf[i].X) / 10.0,
			HeightMM:     float64(sizesBuf[i].Y) / 10.0,
			IsBorderless: isBorderless,
		}
	}

	return result, nil
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
		return domain.DirectPrintResult{Success: false, Error: fmt.Sprintf("OpenPrinter failed: %v", lastErr)}, nil
	}
	defer procClosePrinter.Call(uintptr(hPrinter))

	var needed uint32
	procGetJobW.Call(
		uintptr(hPrinter),
		uintptr(jobID),
		2,
		0, 0,
		uintptr(unsafe.Pointer(&needed)),
	)
	if needed == 0 {
		// إذا لم تعد المهمة موجودة في الطابور، فهذا يعني غالباً أنها اكتملت وخَرَجت
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
			Error:   fmt.Sprintf("GetJob failed: %v", lastErr),
		}, nil
	}

	type jobInfo2 struct {
		JobId                uint32
		PPrinterName         *uint16
		PMachineName         *uint16
		PUserName            *uint16
		PDocument            *uint16
		PNotifyName          *uint16
		PDatatype            *uint16
		PPrintProcessor      *uint16
		PParameters          *uint16
		PDriverName          *uint16
		PDevMode             uintptr
		PStatus              *uint16
		PSecurityDescriptor uintptr
		Status               uint32
		Priority             uint32
		Position             uint32
		StartTime            uint32
		UntilTime            uint32
		TotalPages           uint32
		Size                 uint32
		Submitted            syscall.Systemtime
		Time                 uint32
		PagesPrinted         uint32
	}

	info := (*jobInfo2)(unsafe.Pointer(&buf[0]))

	statusStr := "Spooling"
	const (
		jobStatusError    = 0x00000002
		jobStatusPrinting = 0x00000010
		jobStatusOffline  = 0x00000020
		jobStatusPaperout = 0x00000040
		jobStatusPrinted  = 0x00000080
		jobStatusComplete = 0x00001000
	)

	if info.Status&jobStatusError != 0 {
		statusStr = "Error"
	} else if info.Status&jobStatusPaperout != 0 {
		statusStr = "Out of Paper"
	} else if info.Status&jobStatusOffline != 0 {
		statusStr = "Printer Offline"
	} else if info.Status&jobStatusPrinting != 0 {
		statusStr = "Printing"
	} else if info.Status&jobStatusPrinted != 0 || info.Status&jobStatusComplete != 0 {
		statusStr = "Printed"
	}

	if info.PStatus != nil {
		if driverMsg := windows.UTF16PtrToString(info.PStatus); driverMsg != "" {
			statusStr = driverMsg
		}
	}

	return domain.DirectPrintResult{
		Success: statusStr != "Error" && statusStr != "Out of Paper" && statusStr != "Printer Offline",
		JobID:   jobID,
		Status:  statusStr,
	}, nil
}
