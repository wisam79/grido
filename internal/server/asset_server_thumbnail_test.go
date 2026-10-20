package server

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"grido/internal/service"
)

func newThumbnailTestServer(t *testing.T) (*AssetServer, string) {
	t.Helper()
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaSvc := service.NewMediaService()
	srv := NewAssetServer(AssetServerDeps{
		SessionToken: "test-session-token-12345",
		MediaSvc:     mediaSvc,
	})
	return srv, mediaSvc.GetMediaDir()
}

func writePNGFile(t *testing.T, path string) {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 200, 100))
	for y := 0; y < 100; y++ {
		for x := 0; x < 200; x++ {
			img.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
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

func TestThumbnailRoute_ServesGeneratedImage(t *testing.T) {
	srv, mediaDir := newThumbnailTestServer(t)
	filename := "img_route.png"
	writePNGFile(t, filepath.Join(mediaDir, filename))

	req := httptest.NewRequest(http.MethodGet, "/local-image/thumb/"+filename+"?w=128", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "image/png" {
		t.Fatalf("unexpected content type: %s", ct)
	}
	if cache := rec.Header().Get("Cache-Control"); !strings.Contains(cache, "max-age=86400") {
		t.Fatalf("missing cache header: %s", cache)
	}
	if rec.Body.Len() == 0 {
		t.Fatal("empty thumbnail body")
	}
}

func TestThumbnailRoute_RejectsInvalidWidthAndPath(t *testing.T) {
	srv, mediaDir := newThumbnailTestServer(t)
	filename := "img_route2.png"
	writePNGFile(t, filepath.Join(mediaDir, filename))

	req := httptest.NewRequest(http.MethodGet, "/local-image/thumb/"+filename+"?w=999", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid width, got %d", rec.Code)
	}

	traversalReq := httptest.NewRequest(http.MethodGet, "/local-image/thumb/..%2Fpasswd", nil)
	traversalRec := httptest.NewRecorder()
	srv.ServeHTTP(traversalRec, traversalReq)
	if traversalRec.Code != http.StatusBadRequest && traversalRec.Code != http.StatusNotFound {
		t.Fatalf("expected traversal rejection, got %d", traversalRec.Code)
	}
}

func TestThumbnailRoute_OriginalRouteStillWorks(t *testing.T) {
	srv, mediaDir := newThumbnailTestServer(t)
	filename := "img_route3.png"
	originalPath := filepath.Join(mediaDir, filename)
	writePNGFile(t, originalPath)

	req := httptest.NewRequest(http.MethodGet, "/local-image/"+filename, nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected original image 200, got %d", rec.Code)
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte{0x89, 'P', 'N', 'G'}) {
		t.Fatal("original route did not serve png bytes")
	}
}
