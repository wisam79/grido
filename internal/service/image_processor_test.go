package service

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

func TestResizeGrayLinear(t *testing.T) {
	src := image.NewGray(image.Rect(0, 0, 4, 4))
	for y := 0; y < 4; y++ {
		for x := 0; x < 4; x++ {
			src.SetGray(x, y, color.Gray{Y: uint8(x * 60)})
		}
	}

	dst := ResizeGrayLinear(src, 8, 8)
	if dst.Bounds().Dx() != 8 || dst.Bounds().Dy() != 8 {
		t.Fatalf("expected resized dimensions 8x8, got %dx%d", dst.Bounds().Dx(), dst.Bounds().Dy())
	}
}

func TestBlurGray(t *testing.T) {
	src := image.NewGray(image.Rect(0, 0, 5, 5))
	src.SetGray(2, 2, color.Gray{Y: 255})

	blurred := BlurGray(src)
	if blurred.Bounds().Dx() != 5 || blurred.Bounds().Dy() != 5 {
		t.Fatalf("expected blurred dimensions 5x5, got %dx%d", blurred.Bounds().Dx(), blurred.Bounds().Dy())
	}

	valCenter := blurred.GrayAt(2, 2).Y
	if valCenter == 0 || valCenter == 255 {
		t.Errorf("expected center pixel to be smoothed, got %d", valCenter)
	}
}

func TestImageProcessor_ApplyMaskToImage_DimensionsValidation(t *testing.T) {
	mediaSvc := NewMediaService()
	procSvc := NewImageProcessorService(mediaSvc)

	_, err := procSvc.ApplyMaskToImage("test.png", "A==", 0, 10)
	if err == nil {
		t.Fatal("expected error for non-positive width, got nil")
	}

	_, err = procSvc.ApplyMaskToImage("test.png", "A==", 100000, 100000)
	if err == nil {
		t.Fatal("expected error for oversized mask dimensions, got nil")
	}
}

func TestImageProcessor_ApplyMaskToImage_ValidMaskAndDefringe(t *testing.T) {
	mediaSvc := NewMediaService()
	procSvc := NewImageProcessorService(mediaSvc)
	mediaDir := mediaSvc.GetMediaDir()

	// إنشاء صورة ملونة اختبارية 2x2
	srcImg := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	// بكسل 0: فاتح جداً (255, 255, 255)
	srcImg.SetNRGBA(0, 0, color.NRGBA{R: 255, G: 255, B: 255, A: 255})
	// بكسل 1: داكن (30, 30, 30)
	srcImg.SetNRGBA(1, 0, color.NRGBA{R: 30, G: 30, B: 30, A: 255})
	srcImg.SetNRGBA(0, 1, color.NRGBA{R: 200, G: 200, B: 200, A: 255})
	srcImg.SetNRGBA(1, 1, color.NRGBA{R: 50, G: 50, B: 50, A: 255})

	var buf bytes.Buffer
	if err := png.Encode(&buf, srcImg); err != nil {
		t.Fatalf("failed to encode test image: %v", err)
	}

	testFileName := "test_src_defringe.png"
	testFilePath := filepath.Join(mediaDir, testFileName)
	if err := os.WriteFile(testFilePath, buf.Bytes(), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}
	defer os.Remove(testFilePath)

	// إنشاء قناع بايتات (4 بكسلات: 10, 120, 220, 180)
	maskBytes := []byte{10, 120, 220, 180}
	maskB64 := base64.StdEncoding.EncodeToString(maskBytes)

	outPath, err := procSvc.ApplyMaskToImage("/local-image/"+testFileName, maskB64, 2, 2)
	if err != nil {
		t.Fatalf("ApplyMaskToImage failed: %v", err)
	}
	if outPath == "" {
		t.Fatal("expected non-empty output path")
	}

	createdFileName := filepath.Base(outPath)
	createdFilePath := filepath.Join(mediaDir, createdFileName)
	defer os.Remove(createdFilePath)

	if _, err := os.Stat(createdFilePath); os.IsNotExist(err) {
		t.Fatalf("output file does not exist: %s", createdFilePath)
	}
}
