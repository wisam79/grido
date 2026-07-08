package service

import (
	"grido/internal/core/domain"
	"image"
	"image/color"
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
	outPath, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("unexpected error generating print sheet: %v", err)
	}
	defer os.Remove(outPath)

	// 4. التحقق من وجود الملف الناتج وصحته
	if _, err := os.Stat(outPath); os.IsNotExist(err) {
		t.Errorf("output file does not exist: %s", outPath)
	}

	// قراءة الملف الناتج للتحقق من أبعاده بالبكسل
	outImg, err := imaging.Open(outPath)
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
	_, err := svc.GeneratePrintSheet(req1)
	if err == nil || !strings.Contains(err.Error(), "invalid DPI") {
		t.Errorf("expected error for DPI < 50, got: %v", err)
	}

	// 2. اختبار DPI غير صالح (أكبر من 600)
	req2 := domain.PrintRequest{DPI: 800, PaperWidthMM: 100, PaperHeightMM: 100}
	_, err = svc.GeneratePrintSheet(req2)
	if err == nil || !strings.Contains(err.Error(), "invalid DPI") {
		t.Errorf("expected error for DPI > 600, got: %v", err)
	}

	// 3. اختبار أبعاد غير صالحة (عرض الورقة أقل من 10mm)
	req3 := domain.PrintRequest{DPI: 300, PaperWidthMM: 5, PaperHeightMM: 100}
	_, err = svc.GeneratePrintSheet(req3)
	if err == nil || !strings.Contains(err.Error(), "invalid PaperWidthMM") {
		t.Errorf("expected error for PaperWidthMM < 10, got: %v", err)
	}

	// 4. اختبار أبعاد غير صالحة (طول الورقة أكبر من 1000mm)
	req4 := domain.PrintRequest{DPI: 300, PaperWidthMM: 100, PaperHeightMM: 1200}
	_, err = svc.GeneratePrintSheet(req4)
	if err == nil || !strings.Contains(err.Error(), "invalid PaperHeightMM") {
		t.Errorf("expected error for PaperHeightMM > 1000, got: %v", err)
	}

	// 5. اختبار عدد بكسلات ضخم جداً لمنع OOM
	req5 := domain.PrintRequest{DPI: 600, PaperWidthMM: 900, PaperHeightMM: 900}
	_, err = svc.GeneratePrintSheet(req5)
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
	_, err = svc.GeneratePrintSheet(req6)
	if err == nil || !strings.Contains(err.Error(), "image file does not exist") {
		t.Errorf("expected error for missing image file, got: %v", err)
	}
}

func mathAbs(n int) int {
	if n < 0 {
		return -n
	}
	return n
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

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		out, err := svc.GeneratePrintSheet(req)
		if err != nil {
			b.Fatalf("GeneratePrintSheet failed: %v", err)
		}
		_ = os.Remove(out)
	}
}
