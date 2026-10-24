package service

import (
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

	// 2. Test with real fixture image if available in mediaDir or fixture directory
	fixturePath := filepath.Join("testdata", "scanner_warp", "exif", "orientation_1.jpg")
	res, err := detector.DetectDocumentCorners(fixturePath)
	if err == nil {
		if len(res.Corners) != 4 {
			t.Errorf("expected 4 corners, got %d", len(res.Corners))
		}
		if res.Width <= 0 || res.Height <= 0 {
			t.Errorf("invalid dimensions: %dx%d", res.Width, res.Height)
		}
		if res.Confidence < 0 || res.Confidence > 1 {
			t.Errorf("invalid confidence score: %f", res.Confidence)
		}
	}
}
