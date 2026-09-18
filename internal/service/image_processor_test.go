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

	// اختبار التحقق من الأبعاد في ApplyMaskRaw
	_, err = procSvc.ApplyMaskRaw("test.png", []byte{1, 2}, 0, 10)
	if err == nil {
		t.Fatal("expected error for non-positive width in ApplyMaskRaw, got nil")
	}
	_, err = procSvc.ApplyMaskRaw("test.png", []byte{1, 2}, 2, 2)
	if err == nil {
		t.Fatal("expected error for mismatched mask bytes length, got nil")
	}
}

func TestImageProcessor_ApplyMaskRaw_Success(t *testing.T) {
	mediaSvc := NewMediaService()
	procSvc := NewImageProcessorService(mediaSvc)
	mediaDir := mediaSvc.GetMediaDir()

	srcImg := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	srcImg.SetNRGBA(0, 0, color.NRGBA{R: 240, G: 240, B: 240, A: 255})
	srcImg.SetNRGBA(1, 0, color.NRGBA{R: 20, G: 220, B: 20, A: 255}) // green spill test
	srcImg.SetNRGBA(0, 1, color.NRGBA{R: 200, G: 200, B: 200, A: 255})
	srcImg.SetNRGBA(1, 1, color.NRGBA{R: 50, G: 50, B: 50, A: 255})

	var buf bytes.Buffer
	if err := png.Encode(&buf, srcImg); err != nil {
		t.Fatalf("failed to encode test image: %v", err)
	}

	testFileName := "test_raw_mask.png"
	testFilePath := filepath.Join(mediaDir, testFileName)
	if err := os.WriteFile(testFilePath, buf.Bytes(), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}
	defer os.Remove(testFilePath)

	maskBytes := []byte{10, 130, 240, 200}
	outPath, err := procSvc.ApplyMaskRaw("/local-image/"+testFileName, maskBytes, 2, 2)
	if err != nil {
		t.Fatalf("ApplyMaskRaw failed: %v", err)
	}
	if outPath == "" {
		t.Fatal("expected non-empty output path")
	}
	defer os.Remove(filepath.Join(mediaDir, filepath.Base(outPath)))
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

func BenchmarkResizeGrayLinear(b *testing.B) {
	const dim = 2000
	src := image.NewGray(image.Rect(0, 0, dim, dim))
	for i := range src.Pix {
		src.Pix[i] = uint8(i * 7)
	}
	b.ResetTimer()
	for b.Loop() {
		_ = ResizeGrayLinear(src, 3000, 3000)
	}
}

func BenchmarkImageProcessor_ApplyMaskToImage(b *testing.B) {
	mediaSvc := NewMediaService()
	procSvc := NewImageProcessorService(mediaSvc)
	mediaDir := mediaSvc.GetMediaDir()

	const srcDim = 1500
	const maskDim = 500

	srcImg := image.NewNRGBA(image.Rect(0, 0, srcDim, srcDim))
	for i := 0; i < len(srcImg.Pix); i += 4 {
		srcImg.Pix[i] = 180
		srcImg.Pix[i+1] = 140
		srcImg.Pix[i+2] = 120
		srcImg.Pix[i+3] = 255
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, srcImg); err != nil {
		b.Fatalf("encode source: %v", err)
	}

	testFileName := "bench_mask_src.png"
	testFilePath := filepath.Join(mediaDir, testFileName)
	if err := os.WriteFile(testFilePath, buf.Bytes(), 0644); err != nil {
		b.Fatalf("write source: %v", err)
	}
	defer os.Remove(testFilePath)

	maskBytes := make([]byte, maskDim*maskDim)
	for i := range maskBytes {
		maskBytes[i] = uint8(i * 7)
	}
	maskB64 := base64.StdEncoding.EncodeToString(maskBytes)

	b.ResetTimer()
	for b.Loop() {
		out, err := procSvc.ApplyMaskToImage("/local-image/"+testFileName, maskB64, maskDim, maskDim)
		if err != nil {
			b.Fatalf("ApplyMaskToImage: %v", err)
		}
		_ = os.Remove(filepath.Join(mediaDir, filepath.Base(out)))
	}
}
