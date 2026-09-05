package service

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPhoneBridgeService_StartStop(t *testing.T) {
	// Use isolated app directory for test
	tempDir, err := os.MkdirTemp("", "grido-bridge-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaSvc := NewMediaService()
	bridgeSvc := NewPhoneBridgeService(mediaSvc)

	info, err := bridgeSvc.Start()
	if err != nil {
		t.Fatalf("bridge start failed: %v", err)
	}

	if info == nil || !info.IsRunning || info.Port == 0 || info.Token == "" {
		t.Errorf("invalid bridge info returned: %+v", info)
	}

	status := bridgeSvc.GetStatus()
	if !status.IsRunning {
		t.Errorf("expected status to be running, got: %+v", status)
	}

	// Test second start call returns existing info without error
	info2, err := bridgeSvc.Start()
	if err != nil {
		t.Errorf("second start returned error: %v", err)
	}
	if info2.Port != info.Port || info2.Token != info.Token {
		t.Errorf("expected idempotent info, got %+v vs %+v", info2, info)
	}

	// Stop server
	if err := bridgeSvc.Stop(); err != nil {
		t.Fatalf("bridge stop failed: %v", err)
	}

	statusAfter := bridgeSvc.GetStatus()
	if statusAfter.IsRunning {
		t.Errorf("expected status not running after stop")
	}
}

func TestPhoneBridgeService_Endpoints(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "grido-bridge-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaSvc := NewMediaService()
	bridgeSvc := NewPhoneBridgeService(mediaSvc)
	bridgeSvc.token = "test-secret-token"

	// 1. Test GET / (Mobile Page)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	bridgeSvc.handleMobilePage(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("GET / expected status 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Grido Studio") {
		t.Errorf("GET / response missing 'Grido Studio'")
	}

	// 2. Test GET /ping
	reqPing := httptest.NewRequest(http.MethodGet, "/ping", nil)
	recPing := httptest.NewRecorder()
	bridgeSvc.handlePing(recPing, reqPing)

	if recPing.Code != http.StatusOK {
		t.Errorf("GET /ping expected status 200, got %d", recPing.Code)
	}

	// 2b. Test GET /manifest.json
	reqManifest := httptest.NewRequest(http.MethodGet, "/manifest.json", nil)
	recManifest := httptest.NewRecorder()
	bridgeSvc.handleManifest(recManifest, reqManifest)

	if recManifest.Code != http.StatusOK {
		t.Errorf("GET /manifest.json expected status 200, got %d", recManifest.Code)
	}
	if !strings.Contains(recManifest.Body.String(), "Grido Studio Camera") {
		t.Errorf("GET /manifest.json missing expected name")
	}


	// 3. Test POST /upload with invalid token -> 401
	reqUnauth := httptest.NewRequest(http.MethodPost, "/upload?token=wrong-token", nil)
	recUnauth := httptest.NewRecorder()
	bridgeSvc.handlePhotoUpload(recUnauth, reqUnauth)

	if recUnauth.Code != http.StatusUnauthorized {
		t.Errorf("POST /upload invalid token expected 401, got %d", recUnauth.Code)
	}

	// 4. Test POST /upload with valid token and JPEG image -> 200 Success
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("photo", "camera.jpg")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}

	// Minimal 1x1 JPEG bytes
	dummyJPEG := []byte{
		0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
		0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03,
		0x03, 0x03, 0x03, 0x04, 0x03, 0x03, 0x04, 0x05, 0x08, 0x05, 0x05, 0x04, 0x04, 0x05, 0x0A, 0x07,
		0x07, 0x06, 0x08, 0x0C, 0x0A, 0x0C, 0x0C, 0x0B, 0x0A, 0x0B, 0x0B, 0x0D, 0x0E, 0x12, 0x10, 0x0D,
		0x0E, 0x11, 0x0E, 0x0B, 0x0B, 0x10, 0x16, 0x10, 0x11, 0x13, 0x14, 0x15, 0x15, 0x15, 0x0C, 0x0F,
		0x17, 0x18, 0x16, 0x14, 0x18, 0x12, 0x14, 0x15, 0x14, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
		0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0xFF, 0xDA, 0x00, 0x08,
		0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, 0xD9,
	}
	if _, err := io.Copy(part, bytes.NewReader(dummyJPEG)); err != nil {
		t.Fatalf("failed to copy dummy jpeg: %v", err)
	}
	_ = writer.Close()

	reqUpload := httptest.NewRequest(http.MethodPost, "/upload?token=test-secret-token", body)
	reqUpload.Header.Set("Content-Type", writer.FormDataContentType())
	recUpload := httptest.NewRecorder()

	bridgeSvc.handlePhotoUpload(recUpload, reqUpload)

	if recUpload.Code != http.StatusOK {
		t.Errorf("POST /upload expected 200 OK, got %d: %s", recUpload.Code, recUpload.Body.String())
	}
	if !strings.Contains(recUpload.Body.String(), "/local-image/img_") {
		t.Errorf("POST /upload response missing image path: %s", recUpload.Body.String())
	}

	// Verify file exists on disk in media dir
	mediaDir := mediaSvc.GetMediaDir()
	files, err := os.ReadDir(mediaDir)
	if err != nil || len(files) == 0 {
		t.Fatalf("expected uploaded file to exist in media dir: %v", err)
	}

	foundImage := false
	for _, f := range files {
		if strings.HasPrefix(f.Name(), "img_") && filepath.Ext(f.Name()) == ".jpg" {
			foundImage = true
			break
		}
	}
	if !foundImage {
		t.Errorf("uploaded file not found with expected format in %s", mediaDir)
	}
}
