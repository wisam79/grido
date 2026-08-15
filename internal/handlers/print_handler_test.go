package handlers

import (
	"image"
	"image/color"
	"os"
	"path/filepath"
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
	tempDir, err := os.MkdirTemp("", "print_handler_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dummyImgPath := filepath.Join(tempDir, "photo.png")
	dummyImg := image.NewRGBA(image.Rect(0, 0, 80, 80))
	for x := 0; x < 80; x++ {
		for y := 0; y < 80; y++ {
			dummyImg.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	if err := imaging.Save(dummyImg, dummyImgPath); err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}

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
				ImageSrc:   dummyImgPath,
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

