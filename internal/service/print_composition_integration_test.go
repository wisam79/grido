package service

import (
	"image/color"
	"math"
	"os"
	"strings"
	"testing"

	"grido/internal/core/domain"
)

// writeCompositionDummyImage ينشئ صورة اختبارية صلبة عبر عقد الإدخال
// الإنتاجي (RV-Print-07): dir هو مجلد التطبيق المعزول (GRIDO_APP_DIR مضبوط
// من المستدعي)، وتُعاد كـ /local-image/… — يتجاهل المسار الخام القديم.
func writeCompositionDummyImage(t *testing.T, dir, name string, w, h int) string {
	t.Helper()
	_ = dir
	return stagePrintTestImage(t, strings.TrimSuffix(name, ".png"), w, h, color.RGBA{R: 30, G: 120, B: 200, A: 255})
}

// TestPrintService_InvalidCompositionFallsBack — ⚠️ تحديث سياسة (تقوية سقوف
// الذاكرة): كانت الأبعاد التالفة (صفر/سالب/NaN/Inf) تُتجاوز بصمت وتُكمل الورقة
// من العناصر المباشرة — الآن يرفضها التحقق المبكر بخطأ صريح قبل أي تخصيص ذاكرة
// (composeCanvas يبقى حاجزاً ثانياً يتجاوز الأبعاد غير الصالحة في مساره المباشر:
// انظر TestComposeCanvas_InvalidDimsSecondBarrierFallback). الاسم التاريخي
// محفوظ (Rule 6) — الرفض يمنع أيضاً الطلبات الضخمة (9000مم @600DPI ≈ 180GB)
// التي كانت تفجّر التخصيص بصمت، ويمنع التجاهل الصامت لأبعاد تالفة من الواجهة.
func TestPrintService_InvalidCompositionFallsBack(t *testing.T) {
	cases := []struct {
		name string
		pxW  int
		pxH  int
		mmW  float64
		mmH  float64
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
			tempDir, err := os.MkdirTemp("", "print_comp_reject_*")
			if err != nil {
				t.Fatalf("failed to create temp dir: %v", err)
			}
			defer os.RemoveAll(tempDir)
			// 🖨️ عقد الإدخال الإنتاجي (RV-Print-07): مجلد الاختبار هو مجلد التطبيق.
			t.Setenv("GRIDO_APP_DIR", tempDir)
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

			if _, _, err := svc.validatePrintRequest(req); err == nil || !strings.Contains(err.Error(), "كانفس التركيب") {
				t.Fatalf("validatePrintRequest must reject invalid composition dims with a clear error, got: %v", err)
			}

			outPath, _, err := svc.GeneratePrintSheet(req)
			if err == nil {
				os.Remove(outPath)
				t.Fatalf("invalid composition must be rejected before any allocation, not printed")
			}
			if !strings.Contains(err.Error(), "كانفس التركيب") {
				t.Fatalf("unexpected rejection error: %v", err)
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
