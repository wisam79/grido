package handlers

import (
	"image"
	"image/color"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"grido/internal/core/domain"
	"grido/internal/service"

	"github.com/disintegration/imaging"
)

func TestPrintHandler_GeneratePrintSheet_Invalid(t *testing.T) {
	svc := service.NewPrintService()
	handler := NewPrintHandler(svc)

	// 1. اختبار استدعاء الطباعة بطلب خاطئ (DPI منخفض)
	req := domain.PrintRequest{
		DPI:           10, // الحد الأدنى 50
		PaperWidthMM:  210,
		PaperHeightMM: 297,
	}
	res := handler.ExportPrintSheet(req)
	if res.Success {
		t.Error("expected print result Success to be false for low DPI")
	}
	if res.Error == "" {
		t.Error("expected error message in print result")
	}
}

func TestPrintHandler_GeneratePrintSheet_Success(t *testing.T) {
	// 🖨️ عقد الإدخال الإنتاجي (RV-Print-07): مجلد الاختبار هو مجلد التطبيق.
	appDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", appDir)
	mediaDir := filepath.Join(appDir, "Media")
	if err := os.MkdirAll(mediaDir, 0o755); err != nil {
		t.Fatalf("mkdir Media: %v", err)
	}

	dummyImgPath := filepath.Join(mediaDir, "photo.png")
	dummyImg := image.NewRGBA(image.Rect(0, 0, 80, 80))
	for x := 0; x < 80; x++ {
		for y := 0; y < 80; y++ {
			dummyImg.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	if err := imaging.Save(dummyImg, dummyImgPath); err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}
	dummyImgSrc := "/local-image/photo.png"

	svc := service.NewPrintService()
	handler := NewPrintHandler(svc)

	req := domain.PrintRequest{
		PaperWidthMM:    100.0,
		PaperHeightMM:   100.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ShowCutLines:    true,
		CutLines: []domain.CutLine{
			{X1: 10, Y1: 10, X2: 90, Y2: 10},
		},
		Items: []domain.PrintItem{
			{
				ImageSrc:   dummyImgSrc,
				X:          15,
				Y:          15,
				W:          40,
				H:          40,
				Brightness: 100,
				Contrast:   100,
				Saturation: 100,
			},
		},
	}

	res := handler.ExportPrintSheet(req)
	if !res.Success {
		t.Fatalf("expected ExportPrintSheet to succeed, got error: %s", res.Error)
	}
	if res.FilePath == "" {
		t.Fatal("expected non-empty FilePath in PrintResult")
	}
	defer os.Remove(res.FilePath)

	if _, err := os.Stat(res.FilePath); os.IsNotExist(err) {
		t.Fatalf("generated print file does not exist: %s", res.FilePath)
	}
}

func TestPrintHandler_PrintNative_Invalid(t *testing.T) {
	svc := service.NewPrintService()
	handler := NewPrintHandler(svc)

	res := handler.PrintNative("/nonexistent/file/path.pdf")
	if res.Success {
		t.Error("expected PrintNative to fail for nonexistent file")
	}
	if res.Error == "" {
		t.Error("expected error message for nonexistent file")
	}
}

// TestPrintHandler_InvalidCompositionFallsBack — ⚠️ تحديث سياسة (تقوية سقوف
// الذاكرة عبر مسار IPC الكامل): كان تركيب بأبعاد صفرية يُتجاوز وتنجح الورقة
// من العناصر المباشرة؛ الآن التحقق المبكر يرفضه برسالة عربية واضحة قبل أي
// تخصيص ذاكرة (Success=false بدل نتيجة ناقصة صامتة). الاسم التاريخي محفوظ (Rule 6).
func TestPrintHandler_InvalidCompositionFallsBack(t *testing.T) {
	// 🖨️ عقد الإدخال الإنتاجي (RV-Print-07).
	appDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", appDir)
	mediaDir := filepath.Join(appDir, "Media")
	if err := os.MkdirAll(mediaDir, 0o755); err != nil {
		t.Fatalf("mkdir Media: %v", err)
	}

	dummyImgPath := filepath.Join(mediaDir, "photo.png")
	dummyImg := image.NewRGBA(image.Rect(0, 0, 80, 80))
	for x := 0; x < 80; x++ {
		for y := 0; y < 80; y++ {
			dummyImg.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	if err := imaging.Save(dummyImg, dummyImgPath); err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}
	dummyImgSrc := "/local-image/photo.png"

	svc := service.NewPrintService()
	handler := NewPrintHandler(svc)

	req := domain.PrintRequest{
		PaperWidthMM:    100.0,
		PaperHeightMM:   100.0,
		DPI:             150,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "png",
		Items: []domain.PrintItem{
			{
				ImageSrc:   dummyImgSrc,
				X:          15,
				Y:          15,
				W:          40,
				H:          40,
				Brightness: 100,
				Contrast:   100,
				Saturation: 100,
			},
		},
		Composition: &domain.CanvasComposition{
			CanvasWidthPx:   0,
			CanvasHeightPx:  0,
			CanvasWidthMM:   0,
			CanvasHeightMM:  0,
			BackgroundColor: "#00FF00",
			Items: []domain.PrintItem{
				{ImageSrc: dummyImgSrc, X: 0, Y: 0, W: 10, H: 10},
			},
		},
	}

	res := handler.ExportPrintSheet(req)
	if res.Success {
		t.Fatal("expected ExportPrintSheet to reject invalid composition dims, got success")
	}
	if !strings.Contains(res.Error, "كانفس التركيب") {
		t.Fatalf("expected a clear composition rejection error, got: %s", res.Error)
	}
}
