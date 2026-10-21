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
	"path/filepath"
	"strings"
	"testing"

	"grido/internal/core/domain"
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

type mockDialogBridge struct {
	domain.NoopRuntimeBridge
	calledTitle    string
	calledFilename string
	calledFilters  []domain.FileFilter
	returnPath     string
	returnErr      error
}

func (m *mockDialogBridge) SaveFileDialog(title, defaultFilename string, filters []domain.FileFilter) (string, error) {
	m.calledTitle = title
	m.calledFilename = defaultFilename
	m.calledFilters = filters
	return m.returnPath, m.returnErr
}

// TestAssetServer_SaveFile_NoRuntime_ReturnsErrorWithoutPanic يتحقق من أن استدعاء /api/save-file
// خارج تطبيق Wails (app == nil) لا يسبب ذعراً (panic) بل يعيد خطأ 500 واضحاً وآمناً.
func TestAssetServer_SaveFile_NoRuntime_ReturnsErrorWithoutPanic(t *testing.T) {
	token := "test-session-token"
	srv := NewAssetServer(AssetServerDeps{SessionToken: token})

	body := bytes.NewBufferString("sample image content")
	req := httptest.NewRequest(http.MethodPost, "/api/save-file?filename=exported.png", body)
	req.Host = "localhost:9245"
	req.Header.Set("Origin", "http://localhost:9245")
	req.Header.Set(service.LocalApiSessionHeader, token)

	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "Dialog error:") {
		t.Errorf("expected error message to contain 'Dialog error:', got %s", rec.Body.String())
	}
}

// TestAssetServer_SaveFile_SuccessWithMockBridge يتحقق من نجاح الحفظ وكتابة الملف الذري
// عند حقن جسر رنتايم مخصص يعيد مساراً صالحاً.
func TestAssetServer_SaveFile_SuccessWithMockBridge(t *testing.T) {
	tempDir := t.TempDir()
	targetPath := filepath.Join(tempDir, "saved_photo.png")

	mock := &mockDialogBridge{returnPath: targetPath}
	token := "test-session-token"
	srv := NewAssetServer(AssetServerDeps{
		SessionToken: token,
		Runtime:      mock,
	})

	content := "test image binary data"
	req := httptest.NewRequest(http.MethodPost, "/api/save-file?filename=saved_photo.png", bytes.NewBufferString(content))
	req.Host = "localhost:9245"
	req.Header.Set("Origin", "http://localhost:9245")
	req.Header.Set(service.LocalApiSessionHeader, token)

	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Status string `json:"status"`
		Path   string `json:"path"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Status != "success" || resp.Path != targetPath {
		t.Errorf("unexpected response: %+v", resp)
	}

	// التحقق من وصول المعاملات الصحيحة لحوار الحفظ
	if mock.calledTitle != "Save Image" {
		t.Errorf("expected title 'Save Image', got %q", mock.calledTitle)
	}
	if mock.calledFilename != "saved_photo.png" {
		t.Errorf("expected filename 'saved_photo.png', got %q", mock.calledFilename)
	}
	if len(mock.calledFilters) != 1 || mock.calledFilters[0].Pattern != "*.png" {
		t.Errorf("expected PNG filter, got %+v", mock.calledFilters)
	}

	// التحقق من كتابة المحتوى على القرص
	data, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("failed to read saved file: %v", err)
	}
	if string(data) != content {
		t.Errorf("expected content %q, got %q", content, string(data))
	}
}

// TestAssetServer_SaveFile_CancelledByUser_Returns204 يتحقق من إعادة StatusNoContent عند إلغاء الحوار.
func TestAssetServer_SaveFile_CancelledByUser_Returns204(t *testing.T) {
	mock := &mockDialogBridge{returnPath: "", returnErr: nil}
	token := "test-session-token"
	srv := NewAssetServer(AssetServerDeps{
		SessionToken: token,
		Runtime:      mock,
	})

	req := httptest.NewRequest(http.MethodPost, "/api/save-file?filename=cancel.png", bytes.NewBufferString("data"))
	req.Host = "localhost:9245"
	req.Header.Set("Origin", "http://localhost:9245")
	req.Header.Set(service.LocalApiSessionHeader, token)

	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d", rec.Code)
	}
}

// TestAssetServer_SaveFile_FiltersByExtension يتحقق من تحديد الفلاتر المناسبة حسب الامتداد.
func TestAssetServer_SaveFile_FiltersByExtension(t *testing.T) {
	token := "test-token"

	tests := []struct {
		filename    string
		wantPattern string
	}{
		{"image.tif", "*.tif;*.tiff"},
		{"image.tiff", "*.tif;*.tiff"},
		{"image.jpg", "*.jpg;*.jpeg"},
		{"image.jpeg", "*.jpg;*.jpeg"},
		{"image.png", "*.png"},
	}

	for _, tt := range tests {
		mock := &mockDialogBridge{returnPath: ""}
		srv := NewAssetServer(AssetServerDeps{
			SessionToken: token,
			Runtime:      mock,
		})

		req := httptest.NewRequest(http.MethodPost, "/api/save-file?filename="+tt.filename, bytes.NewBufferString("data"))
		req.Host = "localhost:9245"
		req.Header.Set("Origin", "http://localhost:9245")
		req.Header.Set(service.LocalApiSessionHeader, token)

		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)

		if len(mock.calledFilters) != 1 || mock.calledFilters[0].Pattern != tt.wantPattern {
			t.Errorf("filename %s: expected pattern %q, got %+v", tt.filename, tt.wantPattern, mock.calledFilters)
		}
	}
}

// TestAssetServer_SetRuntimeBridge_NilIgnored يتحقق من تجاهل تمرير nil لـ SetRuntimeBridge
func TestAssetServer_SetRuntimeBridge_NilIgnored(t *testing.T) {
	srv := NewAssetServer(AssetServerDeps{})
	orig := srv.runtime

	srv.SetRuntimeBridge(nil)
	if srv.runtime != orig {
		t.Error("SetRuntimeBridge(nil) should not overwrite existing runtime bridge")
	}
}
