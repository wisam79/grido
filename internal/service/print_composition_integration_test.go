package service

import (
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/disintegration/imaging"

	"grido/internal/core/domain"
)

// writeCompositionDummyImage ينشئ صورة اختبارية صلبة في مجلد مؤقت
func writeCompositionDummyImage(t *testing.T, dir, name string, w, h int) string {
	t.Helper()
	imgPath := filepath.Join(dir, name)
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for x := 0; x < w; x++ {
		for y := 0; y < h; y++ {
			img.Set(x, y, color.RGBA{R: 30, G: 120, B: 200, A: 255})
		}
	}
	if err := imaging.Save(img, imgPath); err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}
	return imgPath
}

// TestPrintService_InvalidCompositionFallsBack — اختبار انحدار لحادثة إنتاجية
// (سبتمبر 2026): فشل الطباعة بخطأ "invalid canvas composition dimensions" عند
// وصول تركيب بأبعاد صفرية من الواجهة — مقدس (Rule 6): لا يُحذف أبداً.
// تركيب كانفاس بأبعاد غير صالحة (صفر/سالب/NaN/Inf) يجب تجاوزه مع تحذير وإكمال
// ورقة الطباعة من العناصر المباشرة، بدل فشل الطلب كاملاً.
func TestPrintService_InvalidCompositionFallsBack(t *testing.T) {
	cases := []struct {
		name    string
		pxW     int
		pxH     int
		mmW     float64
		mmH     float64
	}{
		{"zero px dims", 0, 0, 100, 100},
		{"zero px width", 0, 1000, 100, 100},
		{"zero px height", 1000, 0, 100, 100},
		{"zero mm width", 1000, 1000, 0, 100},
		{"zero mm height", 1000, 1000, 100, 0},
		{"negative mm width", 1000, 1000, -5, 100},
		{"NaN mm width", 1000, 1000, math.NaN(), 100},
		{"NaN mm height", 1000, 1000, 100, math.NaN()},
		{"+Inf mm height", 1000, 1000, 100, math.Inf(1)},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tempDir, err := os.MkdirTemp("", "print_comp_fallback_*")
			if err != nil {
				t.Fatalf("failed to create temp dir: %v", err)
			}
			defer os.RemoveAll(tempDir)
			dummyImgPath := writeCompositionDummyImage(t, tempDir, "photo.png", 120, 90)

			svc := NewPrintService()
			req := domain.PrintRequest{
				PaperWidthMM:    100.0,
				PaperHeightMM:   100.0,
				DPI:             150,
				BackgroundColor: "#FFFFFF",
				ExportFormat:    "png",
				Items: []domain.PrintItem{
					{
						ImageSrc: dummyImgPath, X: 10, Y: 10, W: 50, H: 50,
						Brightness: 100, Contrast: 100, Saturation: 100,
					},
				},
				Composition: &domain.CanvasComposition{
					CanvasWidthPx:   tc.pxW,
					CanvasHeightPx:  tc.pxH,
					CanvasWidthMM:   tc.mmW,
					CanvasHeightMM:  tc.mmH,
					BackgroundColor: "#00FF00",
					Items: []domain.PrintItem{
						{
							ImageSrc: dummyImgPath, X: 0, Y: 0, W: 500, H: 500,
							Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100,
						},
					},
				},
			}

			outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
			if err != nil {
				t.Fatalf("invalid composition must fall back, not fail: %v", err)
			}
			defer os.Remove(outPath)

			if _, err := os.Stat(outPath); os.IsNotExist(err) {
				t.Fatalf("output file does not exist: %s", outPath)
			}

			outImg, err := imaging.Open(outPath)
			if err != nil {
				t.Fatalf("failed to open output image: %v", err)
			}
			bounds := outImg.Bounds()
			// 100mm @ 150 DPI = (100 * 150) / 25.4 ≈ 591px
			expected := int(math.Round(mmToPx(100.0, 150)))
			if diff := mathAbs(bounds.Dx() - expected); diff > 2 {
				t.Errorf("expected width close to %d, got %d", expected, bounds.Dx())
			}
			if diff := mathAbs(bounds.Dy() - expected); diff > 2 {
				t.Errorf("expected height close to %d, got %d", expected, bounds.Dy())
			}

			if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
				t.Errorf("expected HTML document for iframe print")
			}
		})
	}
}

// TestPrintService_TooManyCompositionItemsStillRejected — سقف 100 عنصر تركيب
// يبقى خطأً صريحاً (لا يُتجاوز بصمت) لحماية الذاكرة.
func TestPrintService_TooManyCompositionItemsStillRejected(t *testing.T) {
	svc := NewPrintService()
	items := make([]domain.PrintItem, 0, 101)
	for i := 0; i < 101; i++ {
		items = append(items, domain.PrintItem{
			ImageSrc: "dummy", X: 0, Y: 0, W: 10, H: 10,
		})
	}
	req := domain.PrintRequest{
		PaperWidthMM:    100.0,
		PaperHeightMM:   100.0,
		DPI:             150,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "png",
		Composition: &domain.CanvasComposition{
			CanvasWidthPx:   1000,
			CanvasHeightPx:  1000,
			CanvasWidthMM:   100,
			CanvasHeightMM:  100,
			BackgroundColor: "#FFFFFF",
			Items:           items,
		},
	}

	_, _, err := svc.GeneratePrintSheet(req)
	if err == nil || !strings.Contains(err.Error(), "too many composition items") {
		t.Fatalf("expected too-many-items error, got: %v", err)
	}
}
