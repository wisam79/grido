package service

import (
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestBgRemovalService_EndToEnd(t *testing.T) {
	mediaSvc := NewMediaService()
	imgProc := NewImageProcessorService(mediaSvc)
	bgSvc := NewBgRemovalService(imgProc, mediaSvc)
	defer bgSvc.Close()

	if runtime.GOOS != "windows" {
		_, err := bgSvc.RemoveBackground("dummy.png")
		if err == nil {
			t.Errorf("expected error on non-windows platform")
		}
		return
	}

	// 1. Warmup
	if err := bgSvc.Warmup(); err != nil {
		t.Fatalf("Warmup failed: %v", err)
	}

	// 2. Create a synthetic test portrait image (red circle on white background)
	w, h := 100, 100
	testImg := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dx := x - 50
			dy := y - 50
			if dx*dx+dy*dy < 900 {
				testImg.Set(x, y, color.RGBA{R: 200, G: 50, B: 50, A: 255})
			} else {
				testImg.Set(x, y, color.RGBA{R: 255, G: 255, B: 255, A: 255})
			}
		}
	}

	mediaDir := mediaSvc.GetMediaDir()
	testFileName := "test_bg_synth.png"
	testFilePath := filepath.Join(mediaDir, testFileName)
	f, err := os.Create(testFilePath)
	if err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}
	if err := png.Encode(f, testImg); err != nil {
		_ = f.Close()
		t.Fatalf("failed to encode test image: %v", err)
	}
	_ = f.Close()
	defer os.Remove(testFilePath)

	// 3. Remove Background
	resultLocalPath, err := bgSvc.RemoveBackground("/local-image/" + testFileName)
	if err != nil {
		t.Fatalf("RemoveBackground failed: %v", err)
	}

	if resultLocalPath == "" {
		t.Errorf("expected non-empty result path")
	}

	// Verify generated file exists in MediaDir
	resFileName := filepath.Base(resultLocalPath)
	resDiskPath := filepath.Join(mediaDir, resFileName)
	if stat, err := os.Stat(resDiskPath); err != nil || stat.Size() == 0 {
		t.Errorf("generated file does not exist or is empty at %s", resDiskPath)
	} else {
		defer os.Remove(resDiskPath)
	}
}

func TestBgRemovalService_InvalidPath(t *testing.T) {
	mediaSvc := NewMediaService()
	imgProc := NewImageProcessorService(mediaSvc)
	bgSvc := NewBgRemovalService(imgProc, mediaSvc)
	defer bgSvc.Close()

	if runtime.GOOS != "windows" {
		t.Skip("skipping on non-windows")
	}

	_, err := bgSvc.RemoveBackground("/local-image/non_existent_12345.png")
	if err == nil {
		t.Errorf("expected error for non-existent image")
	}
}
