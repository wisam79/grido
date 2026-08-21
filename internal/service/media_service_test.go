package service

import (
	"encoding/base64"
	"os"
	"path/filepath"
	"testing"
)

var validPNGBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

func TestMediaService_GetMediaDir(t *testing.T) {
	svc := NewMediaService()
	dir := svc.GetMediaDir()
	if dir == "" {
		t.Fatal("GetMediaDir returned empty string")
	}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		t.Fatalf("Media directory does not exist: %s", dir)
	}
}

func TestMediaService_DecodeBase64Image_ValidDataURI(t *testing.T) {
	svc := NewMediaService()

	b64 := "data:image/png;base64," + validPNGBase64

	decoded, mime, err := svc.DecodeBase64Image(b64)
	if err != nil {
		t.Fatalf("DecodeBase64Image failed: %v", err)
	}
	if mime != "image/png" {
		t.Errorf("expected mime 'image/png', got %q", mime)
	}
	if len(decoded) == 0 {
		t.Fatal("decoded data is empty")
	}
}

func TestMediaService_DecodeBase64Image_RawBase64(t *testing.T) {
	svc := NewMediaService()

	rawB64 := validPNGBase64

	decoded, mime, err := svc.DecodeBase64Image(rawB64)
	if err != nil {
		t.Fatalf("DecodeBase64Image failed: %v", err)
	}
	if mime != "image/jpeg" {
		t.Errorf("expected default mime 'image/jpeg', got %q", mime)
	}
	if len(decoded) == 0 {
		t.Fatal("decoded data is empty")
	}
}

func TestMediaService_DecodeBase64Image_InvalidBase64(t *testing.T) {
	svc := NewMediaService()

	_, _, err := svc.DecodeBase64Image("not-valid-base64!!!")
	if err == nil {
		t.Fatal("expected error for invalid base64, got nil")
	}
}

func TestMediaService_DecodeBase64Image_Oversized(t *testing.T) {
	svc := NewMediaService()

	oversized := make([]byte, MaxFileSize*4/3+10)
	for i := range oversized {
		oversized[i] = byte(i % 256)
	}
	b64 := "data:image/png;base64," + base64.StdEncoding.EncodeToString(oversized)

	_, _, err := svc.DecodeBase64Image(b64)
	if err == nil {
		t.Fatal("expected error for oversized payload, got nil")
	}
}

func TestMediaService_GetExtensionFromMime(t *testing.T) {
	svc := NewMediaService()

	tests := []struct {
		mime     string
		expected string
	}{
		{"image/png", ".png"},
		{"image/jpeg", ".jpg"},
		{"image/jpg", ".jpg"},
		{"image/webp", ".webp"},
		{"image/gif", ".gif"},
		{"image/bmp", ".bmp"},
		{"application/octet-stream", ".jpg"},
	}

	for _, tt := range tests {
		ext := svc.GetExtensionFromMime(tt.mime)
		if ext != tt.expected {
			t.Errorf("GetExtensionFromMime(%q) = %q, want %q", tt.mime, ext, tt.expected)
		}
	}
}

func TestMediaService_SaveImageFromBase64(t *testing.T) {
	svc := NewMediaService()

	b64 := "data:image/png;base64," + validPNGBase64

	path, err := svc.SaveImageFromBase64(b64)
	if err != nil {
		t.Fatalf("SaveImageFromBase64 failed: %v", err)
	}
	if path == "" {
		t.Fatal("SaveImageFromBase64 returned empty path")
	}
	if path[:len("/local-image/")] != "/local-image/" {
		t.Errorf("expected path to start with '/local-image/', got %q", path)
	}

	filename := filepath.Base(filepath.Clean(path))
	fullPath := filepath.Join(svc.GetMediaDir(), filename)
	defer os.Remove(fullPath)

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		t.Fatalf("saved file does not exist: %s", fullPath)
	}
}

func TestMediaService_SaveImageFromBase64_InvalidBase64(t *testing.T) {
	svc := NewMediaService()

	_, err := svc.SaveImageFromBase64("not-valid-base64")
	if err == nil {
		t.Fatal("expected error for invalid base64, got nil")
	}
}

func TestMediaService_ProcessOpenedFile_ValidImage(t *testing.T) {
	svc := NewMediaService()

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test.png")

	decoded, err := base64.StdEncoding.DecodeString(validPNGBase64)
	if err != nil {
		t.Fatalf("failed to decode test PNG: %v", err)
	}
	if err := os.WriteFile(testFile, decoded, 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	path, err := svc.ProcessOpenedFile(testFile)
	if err != nil {
		t.Fatalf("ProcessOpenedFile failed: %v", err)
	}
	if path == "" {
		t.Fatal("ProcessOpenedFile returned empty path")
	}
	if path[:len("/local-image/")] != "/local-image/" {
		t.Errorf("expected path to start with '/local-image/', got %q", path)
	}

	filename := filepath.Base(filepath.Clean(path))
	fullPath := filepath.Join(svc.GetMediaDir(), filename)
	defer os.Remove(fullPath)

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		t.Fatalf("processed file does not exist: %s", fullPath)
	}
}

func TestMediaService_ProcessOpenedFile_NonImage(t *testing.T) {
	svc := NewMediaService()

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test.txt")

	if err := os.WriteFile(testFile, []byte("not an image"), 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	_, err := svc.ProcessOpenedFile(testFile)
	if err == nil {
		t.Fatal("expected error for non-image file, got nil")
	}
}

func TestMediaService_ProcessOpenedFile_Oversized(t *testing.T) {
	svc := NewMediaService()

	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "big.bin")

	oversized := make([]byte, MaxFileSize+1)
	for i := range oversized {
		oversized[i] = byte(i % 256)
	}
	if err := os.WriteFile(testFile, oversized, 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	_, err := svc.ProcessOpenedFile(testFile)
	if err == nil {
		t.Fatal("expected error for oversized file, got nil")
	}
}

func TestMediaService_ProcessOpenedFile_MissingFile(t *testing.T) {
	svc := NewMediaService()

	_, err := svc.ProcessOpenedFile("/nonexistent/path/to/file.png")
	if err == nil {
		t.Fatal("expected error for missing file, got nil")
	}
}

func TestMediaService_ProcessMultipleOpenedFiles_AllValid(t *testing.T) {
	svc := NewMediaService()

	tmpDir := t.TempDir()
	file1 := filepath.Join(tmpDir, "img1.png")
	file2 := filepath.Join(tmpDir, "img2.png")

	decoded, err := base64.StdEncoding.DecodeString(validPNGBase64)
	if err != nil {
		t.Fatalf("failed to decode test PNG: %v", err)
	}
	if err := os.WriteFile(file1, decoded, 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}
	if err := os.WriteFile(file2, decoded, 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	paths := []string{file1, file2}
	results, err := svc.ProcessMultipleOpenedFiles(paths)
	if err != nil {
		t.Fatalf("ProcessMultipleOpenedFiles failed: %v", err)
	}
	if len(results) != 2 {
		t.Errorf("expected 2 results, got %d", len(results))
	}

	for _, path := range results {
		filename := filepath.Base(filepath.Clean(path))
		fullPath := filepath.Join(svc.GetMediaDir(), filename)
		defer os.Remove(fullPath)

		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			t.Fatalf("processed file does not exist: %s", fullPath)
		}
	}
}

func TestMediaService_ProcessMultipleOpenedFiles_MixedValidInvalid(t *testing.T) {
	svc := NewMediaService()

	tmpDir := t.TempDir()
	validFile := filepath.Join(tmpDir, "valid.png")
	invalidFile := filepath.Join(tmpDir, "invalid.txt")

	decoded, err := base64.StdEncoding.DecodeString(validPNGBase64)
	if err != nil {
		t.Fatalf("failed to decode test PNG: %v", err)
	}
	if err := os.WriteFile(validFile, decoded, 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}
	if err := os.WriteFile(invalidFile, []byte("not an image"), 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	paths := []string{validFile, invalidFile}
	results, err := svc.ProcessMultipleOpenedFiles(paths)
	if err != nil {
		t.Fatalf("ProcessMultipleOpenedFiles failed: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("expected 1 result (invalid file skipped), got %d", len(results))
	}
}

func TestMediaService_ProcessMultipleOpenedFiles_EmptySlice(t *testing.T) {
	svc := NewMediaService()

	results, err := svc.ProcessMultipleOpenedFiles([]string{})
	if err != nil {
		t.Fatalf("ProcessMultipleOpenedFiles failed: %v", err)
	}
	if len(results) != 0 {
		t.Errorf("expected 0 results, got %d", len(results))
	}
}

func TestMediaService_ProcessMultipleOpenedFiles_ArabicFilenames(t *testing.T) {
	svc := NewMediaService()

	tmpDir := t.TempDir()
	file1 := filepath.Join(tmpDir, "صورة عربية 1.png")
	file2 := filepath.Join(tmpDir, "تجربة.png")

	decoded, err := base64.StdEncoding.DecodeString(validPNGBase64)
	if err != nil {
		t.Fatalf("failed to decode test PNG: %v", err)
	}
	if err := os.WriteFile(file1, decoded, 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}
	if err := os.WriteFile(file2, decoded, 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	paths := []string{file1, file2}
	results, err := svc.ProcessMultipleOpenedFiles(paths)
	if err != nil {
		t.Fatalf("ProcessMultipleOpenedFiles failed: %v", err)
	}
	if len(results) != 2 {
		t.Errorf("expected 2 results, got %d", len(results))
	}

	for _, path := range results {
		filename := filepath.Base(filepath.Clean(path))
		fullPath := filepath.Join(svc.GetMediaDir(), filename)
		defer os.Remove(fullPath)

		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			t.Fatalf("processed file does not exist: %s", fullPath)
		}
	}
}

func TestMediaService_SaveImageFromBase64_AtomicWrite(t *testing.T) {
	svc := NewMediaService()

	b64 := "data:image/png;base64," + validPNGBase64

	path, err := svc.SaveImageFromBase64(b64)
	if err != nil {
		t.Fatalf("SaveImageFromBase64 failed: %v", err)
	}
	if path == "" {
		t.Fatal("SaveImageFromBase64 returned empty path")
	}

	filename := filepath.Base(filepath.Clean(path))
	fullPath := filepath.Join(svc.GetMediaDir(), filename)
	defer os.Remove(fullPath)

	// Since we mock atomic write implicitly by just checking the final file exists
	// We verify that the final file is written correctly and doesn't have .tmp extension
	if filepath.Ext(filename) == ".tmp" {
		t.Errorf("Final file should not have .tmp extension, got %s", filename)
	}

	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		t.Fatalf("saved final file does not exist: %s", fullPath)
	}
}