package service

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func writeTestPNG(t *testing.T, path string, w, h int) {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{R: 10, G: 200, B: 30, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatalf("encode png: %v", err)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		t.Fatalf("write png: %v", err)
	}
}

func writeTestJPEG(t *testing.T, path string, w, h int) {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{R: 240, G: 240, B: 240, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 90}); err != nil {
		t.Fatalf("encode jpeg: %v", err)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		t.Fatalf("write jpeg: %v", err)
	}
}

func TestEnsureThumbnail_GeneratesAndCaches(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	svc := NewMediaService()
	mediaDir := svc.GetMediaDir()
	originalName := "img_thumb.png"
	originalPath := filepath.Join(mediaDir, originalName)
	writeTestPNG(t, originalPath, 200, 100)

	first, err := svc.EnsureThumbnail(context.Background(), "/local-image/"+originalName, 128)
	if err != nil {
		t.Fatalf("EnsureThumbnail: %v", err)
	}
	if filepath.Base(first.Path) != originalName+"__w128.png" {
		t.Fatalf("unexpected thumbnail name: %s", first.Path)
	}
	if first.ContentType != "image/png" {
		t.Fatalf("unexpected content type: %s", first.ContentType)
	}

	thumbCfg, err := os.Open(first.Path)
	if err != nil {
		t.Fatalf("open thumb: %v", err)
	}
	defer thumbCfg.Close()
	cfg, _, err := image.DecodeConfig(thumbCfg)
	if err != nil {
		t.Fatalf("decode thumb config: %v", err)
	}
	if cfg.Width != 128 || cfg.Height != 64 {
		t.Fatalf("unexpected thumbnail dims: %dx%d", cfg.Width, cfg.Height)
	}

	info1, err := os.Stat(first.Path)
	if err != nil {
		t.Fatalf("stat first: %v", err)
	}
	second, err := svc.EnsureThumbnail(context.Background(), "/local-image/"+originalName, 128)
	if err != nil {
		t.Fatalf("EnsureThumbnail second: %v", err)
	}
	info2, err := os.Stat(second.Path)
	if err != nil {
		t.Fatalf("stat second: %v", err)
	}
	if !info1.ModTime().Equal(info2.ModTime()) {
		t.Fatalf("cache hit regenerated thumbnail: %v != %v", info1.ModTime(), info2.ModTime())
	}
}

func TestEnsureThumbnail_DoesNotUpscaleSmallImages(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	svc := NewMediaService()
	mediaDir := svc.GetMediaDir()
	originalName := "img_small.png"
	originalPath := filepath.Join(mediaDir, originalName)
	writeTestPNG(t, originalPath, 50, 80)

	res, err := svc.EnsureThumbnail(context.Background(), "/local-image/"+originalName, 256)
	if err != nil {
		t.Fatalf("EnsureThumbnail: %v", err)
	}
	f, err := os.Open(res.Path)
	if err != nil {
		t.Fatalf("open thumb: %v", err)
	}
	defer f.Close()
	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		t.Fatalf("decode thumb: %v", err)
	}
	if cfg.Width != 50 || cfg.Height != 80 {
		t.Fatalf("small image was upscaled: %dx%d", cfg.Width, cfg.Height)
	}
}

func TestEnsureThumbnail_JPEGOutputForPhotoSources(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	svc := NewMediaService()
	mediaDir := svc.GetMediaDir()
	originalName := "img_photo.jpeg"
	originalPath := filepath.Join(mediaDir, originalName)
	writeTestJPEG(t, originalPath, 400, 300)

	res, err := svc.EnsureThumbnail(context.Background(), "/local-image/"+originalName, 256)
	if err != nil {
		t.Fatalf("EnsureThumbnail: %v", err)
	}
	if filepath.Ext(res.Path) != ".jpg" || res.ContentType != "image/jpeg" {
		t.Fatalf("unexpected jpeg thumbnail: %s (%s)", res.Path, res.ContentType)
	}
}

func TestEnsureThumbnail_Validation(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	svc := NewMediaService()
	mediaDir := svc.GetMediaDir()
	originalName := "img_valid.png"
	writeTestPNG(t, filepath.Join(mediaDir, originalName), 100, 100)
	svgName := "vector.svg"
	if err := os.WriteFile(filepath.Join(mediaDir, svgName), []byte("<svg></svg>"), 0o644); err != nil {
		t.Fatalf("write svg: %v", err)
	}

	if _, err := svc.EnsureThumbnail(context.Background(), "/local-image/"+originalName, 512); err != nil {
		t.Fatalf("expected 512 to be valid: %v", err)
	}
	if _, err := svc.EnsureThumbnail(context.Background(), "/local-image/"+originalName, 999); err != ErrInvalidThumbnailWidth {
		t.Fatalf("expected invalid width error, got %v", err)
	}
	if _, err := svc.EnsureThumbnail(context.Background(), "/local-image/"+svgName, 128); err != ErrThumbnailUnsupported {
		t.Fatalf("expected unsupported error, got %v", err)
	}
	if _, err := svc.EnsureThumbnail(context.Background(), "/local-image/../../etc/passwd", 128); err == nil {
		t.Fatal("expected path traversal to fail")
	}
}

func TestEnsureThumbnail_ConcurrentRequestsGenerateOneFile(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	svc := NewMediaService()
	mediaDir := svc.GetMediaDir()
	originalName := "img_concurrent.png"
	originalPath := filepath.Join(mediaDir, originalName)
	writeTestPNG(t, originalPath, 300, 200)

	// إزالة أي مصغرة سابقة قبل المعالجة المتزامنة لاختبار singleflight فعلياً.
	thumbDir := filepath.Join(mediaDir, ".thumbs")
	_ = os.RemoveAll(thumbDir)

	var wg sync.WaitGroup
	var mu sync.Mutex
	var resultThumbPath string
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			res, err := svc.EnsureThumbnail(context.Background(), "/local-image/"+originalName, 256)
			if err != nil {
				t.Errorf("EnsureThumbnail: %v", err)
				return
			}
			mu.Lock()
			if resultThumbPath == "" {
				resultThumbPath = res.Path
			} else if resultThumbPath != res.Path {
				t.Errorf("unexpected thumb path: %s != %s", res.Path, resultThumbPath)
			}
			mu.Unlock()
		}()
	}
	wg.Wait()

	if _, err := os.Stat(resultThumbPath); err != nil {
		t.Fatalf("stat generated thumbnail: %v", err)
	}
	entries, err := os.ReadDir(thumbDir)
	if err != nil {
		t.Fatalf("read thumb dir: %v", err)
	}
	thumbCount := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			thumbCount++
		}
	}
	if thumbCount != 1 {
		t.Fatalf("expected exactly 1 thumbnail, got %d", thumbCount)
	}
}

func TestEnsureThumbnail_ContextCancellation(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	svc := NewMediaService()
	mediaDir := svc.GetMediaDir()
	originalName := "img_cancel.png"
	writeTestPNG(t, filepath.Join(mediaDir, originalName), 20, 20)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := svc.EnsureThumbnail(ctx, "/local-image/"+originalName, 128); err == nil {
		t.Fatal("expected cancellation error")
	}
	_ = time.Now()
}
