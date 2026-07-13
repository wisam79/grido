package handlers

import (
	"grido/internal/core/domain"
	"grido/internal/repository"
	"grido/internal/service"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

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
