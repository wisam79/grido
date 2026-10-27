package service

import (
	"os"
	"path/filepath"
	"testing"
)

func TestScannerDetectorService_Lifecycle(t *testing.T) {
	mediaSvc := NewMediaService()
	imgProc := NewImageProcessorService(mediaSvc)
	detector := NewScannerDetectorService(imgProc, mediaSvc)
	defer func() {
		_ = detector.Close()
	}()

	// 1. Should fail closed on non-existent or invalid image
	_, err := detector.DetectDocumentCorners("non_existent_file.png")
	if err == nil {
		t.Errorf("expected error for non-existent image, got nil")
	}
}

func TestScannerDetectorService_DetectDocumentCorners(t *testing.T) {
	appDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", appDir)
	mediaDir := filepath.Join(appDir, "Media")
	if err := os.MkdirAll(mediaDir, 0o755); err != nil {
		t.Fatalf("create media dir: %v", err)
	}

	// ننسخ العيّنة داخل مجلد الوسائط لأن LoadImage يحلّ المسارات نسبةً إليه
	fixture, err := os.ReadFile(filepath.Join("testdata", "scanner_warp", "exif", "orientation_1.jpg"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	const fixtureName = "scanner_orientation_1.jpg"
	if err := os.WriteFile(filepath.Join(mediaDir, fixtureName), fixture, 0o644); err != nil {
		t.Fatalf("write fixture: %v", err)
	}

	mediaSvc := NewMediaService()
	imgProc := NewImageProcessorService(mediaSvc)
	detector := NewScannerDetectorService(imgProc, mediaSvc)
	defer func() {
		_ = detector.Close()
	}()

	res, err := detector.DetectDocumentCorners(fixtureName)
	if err != nil {
		t.Fatalf("DetectDocumentCorners failed: %v", err)
	}

	if len(res.Corners) != 4 {
		t.Errorf("expected 4 corners, got %d", len(res.Corners))
	}
	if res.Width <= 0 || res.Height <= 0 {
		t.Errorf("invalid dimensions: %dx%d", res.Width, res.Height)
	}
	if res.Confidence < 0 || res.Confidence > 1 {
		t.Errorf("invalid confidence score: %f", res.Confidence)
	}
	for i, c := range res.Corners {
		if c.X < 0 || c.X >= float64(res.Width) || c.Y < 0 || c.Y >= float64(res.Height) {
			t.Errorf("corner %d outside %dx%d: (%.1f, %.1f)", i, res.Width, res.Height, c.X, c.Y)
		}
	}
}
