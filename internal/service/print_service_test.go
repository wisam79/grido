package service

import (
	"grido/internal/core/domain"
	"image"
	"image/color"
	"os"
	"path/filepath"
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

func mathAbs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}
