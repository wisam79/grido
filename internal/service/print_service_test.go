package service

import (
	"bytes"
	"encoding/binary"
	"grido/internal/core/domain"
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/disintegration/imaging"
)

func TestPrintService_GeneratePrintSheet(t *testing.T) {
	// 1. إنشاء صورة اختبارية مؤقتة
	tempDir, err := os.MkdirTemp("", "print_service_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dummyImgPath := filepath.Join(tempDir, "dummy.png")
	dummyImg := image.NewRGBA(image.Rect(0, 0, 100, 100))
	// تعبئة الصورة باللون الأزرق
	for x := 0; x < 100; x++ {
		for y := 0; y < 100; y++ {
			dummyImg.Set(x, y, color.RGBA{0, 0, 255, 255})
		}
	}
	err = imaging.Save(dummyImg, dummyImgPath)
	if err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}

	// 2. إعداد طلب الطباعة
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    100.0, // 100x100mm
		PaperHeightMM:   100.0,
		DPI:             300,
		BackgroundColor: "#FF0000", // خلفية حمراء
		ShowCutLines:    true,
		CutLines: []domain.CutLine{
			{X1: 10, Y1: 10, X2: 90, Y2: 10},
		},
		Items: []domain.PrintItem{
			{
				ImageSrc:   dummyImgPath,
				X:          20,
				Y:          20,
				W:          50,
				H:          50,
				Brightness: 110,
				Contrast:   105,
				Saturation: 100,
			},
		},
	}

	// 3. تشغيل الخدمة لتوليد ورقة الطباعة
	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("unexpected error generating print sheet: %v", err)
	}
	defer os.Remove(outPath)

	// 4. التحقق من وجود الملف الناتج وصحته
	if _, err := os.Stat(outPath); os.IsNotExist(err) {
		t.Errorf("output file does not exist: %s", outPath)
	}

	// قراءة الملف الناتج للتحقق من أبعاده بالبكسل
	// بما أن outPath قد يكون ملف HTML، نستنتج مسار الـ PNG
	pngPath := outPath
	if strings.HasSuffix(outPath, ".html") {
		pngPath = strings.TrimSuffix(outPath, ".html") + ".png"
		defer os.Remove(pngPath) // تأكد من حذف الصورة أيضاً
	}

	outImg, err := imaging.Open(pngPath)
	if err != nil {
		t.Fatalf("failed to open output image: %v", err)
	}

	bounds := outImg.Bounds()
	// 100mm @ 300 DPI = (100 * 300) / 25.4 = 1181.1 px (حوالي 1181 px)
	expectedW := 1181
	expectedH := 1181

	// السماح بهامش خطأ 2 بكسل بسبب التقريب
	if diff := mathAbs(bounds.Dx() - expectedW); diff > 2 {
		t.Errorf("expected width close to %d, got %d", expectedW, bounds.Dx())
	}
	if diff := mathAbs(bounds.Dy() - expectedH); diff > 2 {
		t.Errorf("expected height close to %d, got %d", expectedH, bounds.Dy())
	}
}

func TestPrintService_ParseColor(t *testing.T) {
	tests := []struct {
		hex      string
		expected color.RGBA
	}{
		{"#fff", color.RGBA{255, 255, 255, 255}},
		{"#000", color.RGBA{0, 0, 0, 255}},
		{"#f00f", color.RGBA{255, 0, 0, 255}},
		{"#0000", color.RGBA{0, 0, 0, 0}},
		{"#FF0000", color.RGBA{255, 0, 0, 255}},
		{"#00FF0080", color.RGBA{0, 255, 0, 128}},
		{"transparent", color.RGBA{0, 0, 0, 0}},
		{"invalid", color.RGBA{255, 255, 255, 255}}, // Fallback to white
	}

	for _, tc := range tests {
		result := parseColor(tc.hex)
		r, g, b, a := result.RGBA()
		got := color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), uint8(a >> 8)}
		if got != tc.expected {
			t.Errorf("parseColor(%q): expected %+v, got %+v", tc.hex, tc.expected, got)
		}
	}
}

func TestPrintService_Validation(t *testing.T) {
	svc := NewPrintService()

	// 1. اختبار DPI غير صالح (أقل من 50)
	req1 := domain.PrintRequest{DPI: 40, PaperWidthMM: 100, PaperHeightMM: 100}
	_, _, err := svc.GeneratePrintSheet(req1)
	if err == nil || !strings.Contains(err.Error(), "invalid DPI") {
		t.Errorf("expected error for DPI < 50, got: %v", err)
	}

	// 2. اختبار DPI غير صالح (أكبر من 600)
	req2 := domain.PrintRequest{DPI: 800, PaperWidthMM: 100, PaperHeightMM: 100}
	_, _, err = svc.GeneratePrintSheet(req2)
	if err == nil || !strings.Contains(err.Error(), "invalid DPI") {
		t.Errorf("expected error for DPI > 600, got: %v", err)
	}

	// 3. اختبار أبعاد غير صالحة (عرض الورقة أقل من 10mm)
	req3 := domain.PrintRequest{DPI: 300, PaperWidthMM: 5, PaperHeightMM: 100}
	_, _, err = svc.GeneratePrintSheet(req3)
	if err == nil || !strings.Contains(err.Error(), "invalid PaperWidthMM") {
		t.Errorf("expected error for PaperWidthMM < 10, got: %v", err)
	}

	// 4. اختبار أبعاد غير صالحة (طول الورقة أكبر من 1000mm)
	req4 := domain.PrintRequest{DPI: 300, PaperWidthMM: 100, PaperHeightMM: 1200}
	_, _, err = svc.GeneratePrintSheet(req4)
	if err == nil || !strings.Contains(err.Error(), "invalid PaperHeightMM") {
		t.Errorf("expected error for PaperHeightMM > 1000, got: %v", err)
	}

	// 5. اختبار عدد بكسلات ضخم جداً لمنع OOM
	req5 := domain.PrintRequest{DPI: 600, PaperWidthMM: 900, PaperHeightMM: 900}
	_, _, err = svc.GeneratePrintSheet(req5)
	if err == nil || !strings.Contains(err.Error(), "pixels exceed 144 megapixels") {
		t.Errorf("expected error for huge canvas size, got: %v", err)
	}

	// 6. اختبار إرسال ملف صورة غير موجود
	req6 := domain.PrintRequest{
		DPI:           300,
		PaperWidthMM:  100,
		PaperHeightMM: 100,
		Items: []domain.PrintItem{
			{ImageSrc: "/local-image/nonexistent_file.png", X: 10, Y: 10, W: 50, H: 50},
		},
	}
	_, _, err = svc.GeneratePrintSheet(req6)
	if err == nil || !strings.Contains(err.Error(), "image file does not exist") {
		t.Errorf("expected error for missing image file, got: %v", err)
	}

	// 7. اختبار عنصر كامل التغطية (Bleed) يتجاوز الورقة بأجزاء من المئة من المليمتر
	// بسبب تحويل بكسل→مم (A4@300DPI = 2480×3508 بكسل ← 209.97×297.01mm)
	req7 := domain.PrintRequest{
		DPI:           300,
		PaperWidthMM:  210.0,
		PaperHeightMM: 297.0,
		Items: []domain.PrintItem{
			{ImageSrc: "/local-image/nonexistent_file.png", X: 0, Y: 0, W: 209.97, H: 297.01},
		},
	}
	_, _, err = svc.GeneratePrintSheet(req7)
	if err == nil || !strings.Contains(err.Error(), "image file does not exist") {
		t.Errorf("expected float-rounding full-bleed item to pass geometry guard, got: %v", err)
	}

	// 8. اختبار عنصر يتجاوز الورقة فعلياً (أكبر من التسامح 0.1mm) — يجب رفضه
	req8 := domain.PrintRequest{
		DPI:           300,
		PaperWidthMM:  210.0,
		PaperHeightMM: 297.0,
		Items: []domain.PrintItem{
			{ImageSrc: "/local-image/nonexistent_file.png", X: 0, Y: 0, W: 210, H: 300},
		},
	}
	_, _, err = svc.GeneratePrintSheet(req8)
	if err == nil || !strings.Contains(err.Error(), "invalid item geometry") {
		t.Errorf("expected oversized item to be rejected, got: %v", err)
	}
}

func mathAbs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// TestPrintService_JPEGExport يتحقق من مسار تصدير JPEG للطباعة الملونة:
// الملف الناتج بامتداد .jpg، يُفك ترميزه بنجاح، ويحمل كثافة JFIF صحيحة
// (مطابقة لـ DPI المطلوب) لتطبيق مقاس الورقة الفيزيائي
func TestPrintService_JPEGExport(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "print_service_jpeg")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dummyImgPath := filepath.Join(tempDir, "dummy.jpg")
	dummyImg := imaging.New(800, 600, color.RGBA{0, 128, 255, 255})
	if err := imaging.Save(dummyImg, dummyImgPath); err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    210.0,
		PaperHeightMM:   297.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "jpeg",
		Items: []domain.PrintItem{
			{ImageSrc: dummyImgPath, X: 0, Y: 0, W: 210, H: 297, Brightness: 100, Contrast: 100, Saturation: 100},
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("unexpected error generating JPEG print sheet: %v", err)
	}

	jpgPath := outPath
	if strings.HasSuffix(outPath, ".html") {
		jpgPath = strings.TrimSuffix(outPath, ".html") + ".jpg"
	}
	if _, err := os.Stat(jpgPath); os.IsNotExist(err) {
		t.Errorf("expected JPEG output file to exist: %s", jpgPath)
	}

	data, err := os.ReadFile(jpgPath)
	if err != nil {
		t.Fatalf("failed to read JPEG output: %v", err)
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Errorf("expected HTML document for iframe print, got: %s", htmlDoc[:min(50, len(htmlDoc))])
	}
	// OFFSET داخل قطعة APP0 المضافة بعد SOI: "JFIF\0" عند 6، units عند 13، Xdensity عند 14
	if len(data) < 18 || !bytes.Contains(data[:16], []byte("JFIF")) {
		t.Errorf("expected JFIF segment in JPEG output")
	}
	if len(data) < 14 || data[13] != 1 {
		t.Errorf("expected JFIF density units = 1 (DPI), got %v", data[13])
	}
	density := binary.BigEndian.Uint16(data[14:16])
	if density != 300 {
		t.Errorf("expected X density 300 DPI, got %d", density)
	}

	outImg, err := imaging.Open(jpgPath)
	if err != nil {
		t.Fatalf("failed to decode JPEG output: %v", err)
	}
	bounds := outImg.Bounds()
	// 210×297mm @ 300 DPI = 2480×3508 بكسل (±2 سماح تقريب)
	if diff := mathAbs(bounds.Dx() - 2480); diff > 2 {
		t.Errorf("expected width close to 2480, got %d", bounds.Dx())
	}
	if diff := mathAbs(bounds.Dy() - 3508); diff > 2 {
		t.Errorf("expected height close to 3508, got %d", bounds.Dy())
	}
}

func BenchmarkPrintService_GeneratePrintSheet(b *testing.B) {
	tempDir, err := os.MkdirTemp("", "print_service_bench")
	if err != nil {
		b.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dummyImgPath := filepath.Join(tempDir, "dummy_bench.png")
	dummyImg := image.NewRGBA(image.Rect(0, 0, 800, 800))
	for x := 0; x < 800; x++ {
		for y := 0; y < 800; y++ {
			dummyImg.Set(x, y, color.RGBA{0, 255, 0, 255})
		}
	}
	err = imaging.Save(dummyImg, dummyImgPath)
	if err != nil {
		b.Fatalf("failed to save dummy image: %v", err)
	}

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    210.0, // A4
		PaperHeightMM:   297.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ShowCutLines:    true,
		CutLines: []domain.CutLine{
			{X1: 10, Y1: 10, X2: 200, Y2: 10},
		},
		Items: []domain.PrintItem{
			{ImageSrc: dummyImgPath, X: 15, Y: 15, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgPath, X: 65, Y: 15, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgPath, X: 115, Y: 15, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgPath, X: 15, Y: 65, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgPath, X: 65, Y: 65, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgPath, X: 115, Y: 65, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
		},
	}

	for b.Loop() {
		out, _, err := svc.GeneratePrintSheet(req)
		if err != nil {
			b.Fatalf("GeneratePrintSheet failed: %v", err)
		}
		_ = os.Remove(out)
		if strings.HasSuffix(out, ".html") {
			_ = os.Remove(strings.TrimSuffix(out, ".html") + ".png")
		}
	}
}

func TestPrintService_CanvasComposition(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "print_service_composition")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// صورة زرقاء 100×100 — تُوضع في النصف العلوي الأيسر من الكانفاس (0..500px)
	dummyImgPath := filepath.Join(tempDir, "dummy.png")
	dummyImg := image.NewRGBA(image.Rect(0, 0, 100, 100))
	for x := 0; x < 100; x++ {
		for y := 0; y < 100; y++ {
			dummyImg.Set(x, y, color.RGBA{0, 0, 255, 255})
		}
	}
	if err := imaging.Save(dummyImg, dummyImgPath); err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    200.0,
		PaperHeightMM:   200.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "png",
		Items: []domain.PrintItem{
			// خلية بلا imageSrc — يُرسم فيها الكانفاس المركّب
			{X: 10, Y: 10, W: 100, H: 100},
		},
		Composition: &domain.CanvasComposition{
			CanvasWidthPx:   1000,
			CanvasHeightPx:  1000,
			CanvasWidthMM:   100,
			CanvasHeightMM:  100,
			BackgroundColor: "#00FF00",
			Items: []domain.PrintItem{
				{
					ImageSrc: dummyImgPath,
					X:        0, Y: 0, W: 500, H: 500,
					Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100,
				},
			},
		},
	}

	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("unexpected error generating composition print sheet: %v", err)
	}
	defer os.Remove(outPath)
	pngPath := outPath
	if strings.HasSuffix(outPath, ".html") {
		pngPath = strings.TrimSuffix(outPath, ".html") + ".png"
		defer os.Remove(pngPath)
	}

	outImg, err := imaging.Open(pngPath)
	if err != nil {
		t.Fatalf("failed to open output image: %v", err)
	}

	pixelAt := func(xMM, yMM int) color.RGBA {
		px := int(math.Round(mmToPx(float64(xMM), 300)))
		py := int(math.Round(mmToPx(float64(yMM), 300)))
		return outImg.At(px, py).(color.RGBA)
	}

	// (50,50)mm داخل منطقة الصورة الزرقاء في الكانفاس (250px كانفاس → 295px من أصل 1181)
	blue := pixelAt(50, 50)
	if blue.R != 0 || blue.G != 0 || blue.B < 240 {
		t.Errorf("expected blue composition image at cell center, got %+v", blue)
	}
	// (90,50)mm داخل الكانفاس لكن خارج الصورة → خلفية الكانفاس الخضراء
	green := pixelAt(90, 50)
	if green.G < 240 || green.B > 20 {
		t.Errorf("expected green composition background, got %+v", green)
	}
	// (5,5)mm خارج الخلية → ورق أبيض
	white := pixelAt(5, 5)
	if white.R < 240 || white.G < 240 || white.B < 240 {
		t.Errorf("expected white paper outside cell, got %+v", white)
	}
}

func TestPrintService_EmptySrcItemsSkippedWithoutComposition(t *testing.T) {
	// سلوك تاريخي محفوظ: عنصر بلا imageSrc وبدون composition يُتجاهل بصمت — لا فشل
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    100.0,
		PaperHeightMM:   100.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "png",
		Items: []domain.PrintItem{
			{X: 10, Y: 10, W: 50, H: 50},
		},
	}

	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("expected empty-src items to be skipped silently, got error: %v", err)
	}
	defer os.Remove(outPath)
	if strings.HasSuffix(outPath, ".html") {
		defer os.Remove(strings.TrimSuffix(outPath, ".html") + ".png")
	}
}
