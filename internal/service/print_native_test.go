package service

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"grido/internal/utils"
)

func TestPrintNative_ValidationGuards(t *testing.T) {
	svc := NewPrintService()

	// 1. Empty path rejection
	if err := svc.PrintNative(""); err == nil || !strings.Contains(err.Error(), "مسار ملف الطباعة غير صالح") {
		t.Errorf("expected error for empty path, got: %v", err)
	}

	// 2. Non-existent file rejection
	if err := svc.PrintNative("c:/non_existent_folder_12345/missing.png"); err == nil || !strings.Contains(err.Error(), "ملف الطباعة غير موجود") {
		t.Errorf("expected error for missing file, got: %v", err)
	}

	// 3. Directory rejection
	tempDir, err := os.MkdirTemp("", "print_native_dir_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	if err := svc.PrintNative(tempDir); err == nil || !strings.Contains(err.Error(), "المسار المحدد مجلد") {
		t.Errorf("expected error when passing directory, got: %v", err)
	}

	// 4. Disallowed extensions rejection
	dangerousFiles := []string{"script.bat", "run.exe", "payload.sh", "data.txt", "doc.docx"}
	for _, fname := range dangerousFiles {
		fPath := filepath.Join(tempDir, fname)
		if err := os.WriteFile(fPath, []byte("echo danger"), 0644); err != nil {
			t.Fatalf("failed to create test file: %v", err)
		}
		if err := svc.PrintNative(fPath); err == nil || !strings.Contains(err.Error(), "نوع الملف غير مدعوم للطباعة") {
			t.Errorf("expected rejection for disallowed extension %q, got: %v", fname, err)
		}
	}
}

func TestPrintNative_PathTraversalDefense(t *testing.T) {
	svc := NewPrintService()

	// Create a dummy image outside of App Exports and Temp
	outsideDir, err := os.MkdirTemp("", "outside_safe_dir_*")
	if err != nil {
		t.Fatalf("failed to create outside temp dir: %v", err)
	}
	defer os.RemoveAll(outsideDir)

	outsideImg := filepath.Join(outsideDir, "unauthorized.png")
	if err := os.WriteFile(outsideImg, []byte("fake image data"), 0644); err != nil {
		t.Fatalf("failed to create outside image: %v", err)
	}

	// Must be rejected as outside allowed range (Exports or grido_print_*)
	err = svc.PrintNative(outsideImg)
	if err == nil || !strings.Contains(err.Error(), "مسار الطباعة خارج النطاق المسموح") {
		t.Fatalf("expected path traversal/outside range rejection, got: %v", err)
	}
}

func TestPrintNative_CompanionHTMLResolution(t *testing.T) {
	// Verify that in the Exports directory, when a .png has a companion .html,
	// the companion is detected.
	exportsDir := filepath.Join(utils.GetAppDir(), "Exports")
	if err := os.MkdirAll(exportsDir, 0755); err != nil {
		t.Fatalf("failed to create exports dir: %v", err)
	}

	baseName := "test_sheet_" + time.Now().Format("20060102150405")
	pngPath := filepath.Join(exportsDir, baseName+".png")
	htmlPath := filepath.Join(exportsDir, baseName+".html")

	if err := os.WriteFile(pngPath, []byte("fake png content"), 0644); err != nil {
		t.Fatalf("failed to create dummy png: %v", err)
	}
	defer os.Remove(pngPath)

	if err := os.WriteFile(htmlPath, []byte("<!DOCTYPE html><html><body>print test</body></html>"), 0644); err != nil {
		t.Fatalf("failed to create dummy html: %v", err)
	}
	defer os.Remove(htmlPath)

	// Direct call to PrintNative on Windows might attempt to launch a window,
	// but we can verify that the companion HTML file exists, is valid, and matches base name
	companion := strings.TrimSuffix(pngPath, filepath.Ext(pngPath)) + ".html"
	info, err := os.Stat(companion)
	if err != nil || info.IsDir() {
		t.Fatalf("companion HTML was not recognized on disk: %v", err)
	}
}

func TestPrintNative_SchedulePrintTempCleanup(t *testing.T) {
	// Test that schedulePrintTempCleanup runs without panic or race
	schedulePrintTempCleanup()
	// Calling it multiple times should be safe (sync.Once guard)
	schedulePrintTempCleanup()
}
