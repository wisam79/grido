package handlers

import (
	"os"
	"path/filepath"
	"testing"

	"grido/internal/core/domain"
	"grido/internal/repository"
	"grido/internal/service"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestMain(m *testing.M) {
	tempDir, err := os.MkdirTemp("", "grido-test-handlers-global-*")
	if err == nil {
		appDir := filepath.Join(tempDir, "GridoStudio")
		_ = os.Setenv("GRIDO_APP_DIR", appDir)
		_ = os.Setenv("APPDATA", tempDir)
		_ = os.Setenv("HOME", tempDir)
		_ = os.Setenv("XDG_CONFIG_HOME", tempDir)
	}
	code := m.Run()
	if tempDir != "" {
		_ = os.RemoveAll(tempDir)
	}
	os.Exit(code)
}

func TestBackupHandler_ExportAndImport(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_ = db.AutoMigrate(&domain.Project{})

	repo := repository.NewProjectRepository(db)
	licenseRepo := repository.NewLicenseRepository(db)
	svc := service.NewBackupService(repo, licenseRepo)
	handler := NewBackupHandler(svc)

	// 1. اختبار استيراد بيانات فارغة (Error)
	_, err = handler.ImportBackup("invalid-json", "merge")
	if err == nil {
		t.Error("expected error when importing invalid backup JSON")
	}

	// 2. اختبار التصدير عندما تكون المكتبة فارغة
	exportData, err := handler.ExportBackup()
	if err != nil {
		t.Fatalf("failed to export backup: %v", err)
	}
	if exportData != "[]" {
		t.Errorf("expected empty array JSON '[]', got %q", exportData)
	}

	// 3. إضافة مشروع يدوياً وتصديره
	proj := domain.Project{
		ID:   "p-1",
		Name: "Backup Item 1",
	}
	_ = repo.Save(&proj)

	exportData, err = handler.ExportBackup()
	if err != nil {
		t.Fatalf("failed to export: %v", err)
	}

	// 4. اختبار إعادة استيراد النسخة الاحتياطية بوضع الدمج (merge)
	// سنقوم بحذف المشروع أولاً للتأكد من استعادته
	_ = repo.Delete("p-1")
	res, err := handler.ImportBackup(exportData, "merge")
	if err != nil {
		t.Fatalf("failed to import backup: %v", err)
	}
	if res != "success" {
		t.Errorf("expected success, got %q", res)
	}

	retrieved, _ := repo.FindByID("p-1")
	if retrieved == nil || retrieved.Name != "Backup Item 1" {
		t.Error("expected project to be restored from backup")
	}

	// 5. اختبار استيراد بنمط خاطئ
	_, err = handler.ImportBackup(exportData, "invalid_mode")
	if err == nil {
		t.Error("expected error when importing with invalid mode")
	}

	// 6. اختبار مسح المكتبة (ResetLibrary)
	res, err = handler.ResetLibrary()
	if err != nil {
		t.Fatalf("failed to reset library: %v", err)
	}
	if res != "success" {
		t.Errorf("expected success, got %q", res)
	}

	all, _ := repo.FindAll()
	if len(all) != 0 {
		t.Errorf("expected 0 projects after reset, got %d", len(all))
	}
}

// TestBackupHandler_ExportBackupToFile يغطي عقد IPC الجديد: الكتابة المباشرة
// إلى ملف مطابقة لمخرج ExportBackup وصالحة لإعادة الاستيراد
func TestBackupHandler_ExportBackupToFile(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_ = db.AutoMigrate(&domain.Project{})

	repo := repository.NewProjectRepository(db)
	licenseRepo := repository.NewLicenseRepository(db)
	handler := NewBackupHandler(service.NewBackupService(repo, licenseRepo))

	// 1. مكتبة فارغة: الملف يحوي "[]" مطابقاً لعقد ExportBackup
	expected, err := handler.ExportBackup()
	if err != nil {
		t.Fatalf("failed to export backup: %v", err)
	}
	if expected != "[]" {
		t.Fatalf("expected empty export \"[]\", got %q", expected)
	}

	backupDir := t.TempDir()
	backupPath := filepath.Join(backupDir, "grido-backup.json")
	if err := handler.ExportBackupToFile(backupPath); err != nil {
		t.Fatalf("ExportBackupToFile failed on empty library: %v", err)
	}
	data, err := os.ReadFile(backupPath)
	if err != nil {
		t.Fatalf("failed to read exported file: %v", err)
	}
	if string(data) != expected {
		t.Errorf("expected file content %q, got %q", expected, data)
	}

	// 2. مكتبة بمشروع: مطابقة بايت-ب-بايت مع ExportBackup وصلاحية الاستيراد
	proj := domain.Project{ID: "p-file-1", Name: "File Export Item"}
	if err := repo.Save(&proj); err != nil {
		t.Fatalf("failed to save project: %v", err)
	}

	expected, err = handler.ExportBackup()
	if err != nil {
		t.Fatalf("failed to export backup: %v", err)
	}
	if err := handler.ExportBackupToFile(backupPath); err != nil {
		t.Fatalf("ExportBackupToFile failed: %v", err)
	}
	data, err = os.ReadFile(backupPath)
	if err != nil {
		t.Fatalf("failed to read exported file: %v", err)
	}
	if string(data) != expected {
		t.Errorf("ExportBackupToFile output must byte-match ExportBackup output")
	}

	if _, err := handler.ImportBackup(string(data), "overwrite"); err != nil {
		t.Fatalf("importing the exported file failed: %v", err)
	}
	retrieved, _ := repo.FindByID("p-file-1")
	if retrieved == nil || retrieved.Name != "File Export Item" {
		t.Error("expected project to be restored from exported file")
	}

	// 3. مسار فارغ مرفوض
	if err := handler.ExportBackupToFile(""); err == nil {
		t.Error("expected error for empty backup export path")
	}

	// 4. لا بقايا ملفات مؤقتة .tmp
	entries, err := os.ReadDir(backupDir)
	if err != nil {
		t.Fatalf("failed to read backup dir: %v", err)
	}
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".tmp" {
			t.Errorf("leftover temp file %q after atomic export", e.Name())
		}
	}
}
