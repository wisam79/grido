package server

import (
	"bytes"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"grido/internal/service"
)

func TestAssetHandler_UploadMedia_ReturnsDimensions(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	token := "test-session-token-12345"
	mediaSvc := service.NewMediaService()

	handler := NewAssetHandler(AssetServerDeps{
		SessionToken: token,
		MediaSvc:     mediaSvc,
	})

	// إنشاء صورة PNG اختبارية 200×100 (aspect ratio = 2.0)
	img := image.NewRGBA(image.Rect(0, 0, 200, 100))
	for y := 0; y < 100; y++ {
		for x := 0; x < 200; x++ {
			img.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}
	var pngBuf bytes.Buffer
	if err := png.Encode(&pngBuf, img); err != nil {
		t.Fatalf("failed to encode png: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/upload-media", &pngBuf)
	req.Host = "localhost:9245"
	req.Header.Set("Origin", "http://localhost:9245")
	req.Header.Set(service.LocalApiSessionHeader, token)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Status      string  `json:"status"`
		ImageSrc    string  `json:"imageSrc"`
		Width       int     `json:"width"`
		Height      int     `json:"height"`
		AspectRatio float64 `json:"aspectRatio"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode json response: %v", err)
	}

	if resp.Status != "success" {
		t.Errorf("expected status 'success', got %q", resp.Status)
	}
	if !strings.HasPrefix(resp.ImageSrc, "/local-image/") {
		t.Errorf("expected imageSrc to start with /local-image/, got %q", resp.ImageSrc)
	}
	if resp.Width != 200 || resp.Height != 100 {
		t.Errorf("expected width 200, height 100, got %dx%d", resp.Width, resp.Height)
	}
	if resp.AspectRatio != 2.0 {
		t.Errorf("expected aspectRatio 2.0, got %f", resp.AspectRatio)
	}

	// التأكد من أن الملف موجود بالفعل على القرص
	mediaDir := mediaSvc.GetMediaDir()
	filename := strings.TrimPrefix(resp.ImageSrc, "/local-image/")
	if _, err := os.Stat(mediaDir + "/" + filename); err != nil {
		t.Errorf("expected file to exist in mediaDir, got error: %v", err)
	}
}
