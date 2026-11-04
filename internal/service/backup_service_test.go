package service

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"grido/internal/core/domain"
	"grido/internal/repository"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupBackupTestDB(t *testing.T) (*gorm.DB, func()) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}

	err = db.AutoMigrate(&domain.Project{}, &domain.UserProfile{})
	if err != nil {
		t.Fatalf("failed to migrate database: %v", err)
	}

	cleanup := func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}

	return db, cleanup
}

func TestBackupService_ExportAndImport(t *testing.T) {
	db, cleanup := setupBackupTestDB(t)
	defer cleanup()

	repo := repository.NewProjectRepository(db)
	licenseRepo := repository.NewLicenseRepository(db)
	projectSvc := NewProjectService(repo, licenseRepo)
	backupSvc := NewBackupService(repo, licenseRepo)

	// Add dummy projects
	p1 := &domain.Project{ID: "p1", Name: "Project 1", Mode: "single"}
	p2 := &domain.Project{ID: "p2", Name: "Project 2", Mode: "collage"}
	_ = projectSvc.SaveProject(p1)
	_ = projectSvc.SaveProject(p2)

	// Export
	backupJSON, err := backupSvc.ExportBackup()
	if err != nil {
		t.Fatalf("failed to export backup: %v", err)
	}

	if backupJSON == "" {
		t.Fatal("expected non-empty backup JSON string")
	}

	// Reset database
	err = backupSvc.ResetLibrary()
	if err != nil {
		t.Fatalf("failed to reset library: %v", err)
	}

	// Verify database is empty
	projects, err := projectSvc.GetAllProjects()
	if err != nil {
		t.Fatalf("failed to get projects after reset: %v", err)
	}
	if len(projects) != 0 {
		t.Fatalf("expected 0 projects after reset, got %d", len(projects))
	}

	// Import backup with merge
	err = backupSvc.ImportBackup(backupJSON, "merge")
	if err != nil {
		t.Fatalf("failed to import backup (merge): %v", err)
	}

	// Verify imported projects
	projects, err = projectSvc.GetAllProjects()
	if err != nil {
		t.Fatalf("failed to get projects after import: %v", err)
	}
	if len(projects) != 2 {
		t.Fatalf("expected 2 projects after import, got %d", len(projects))
	}

	// Import backup with overwrite
	err = backupSvc.ImportBackup(backupJSON, "overwrite")
	if err != nil {
		t.Fatalf("failed to import backup (overwrite): %v", err)
	}

	// Verify overwrite still has the 2 projects
	projects, err = projectSvc.GetAllProjects()
	if err != nil {
		t.Fatalf("failed to get projects after overwrite: %v", err)
	}
	if len(projects) != 2 {
		t.Fatalf("expected 2 projects, got %d", len(projects))
	}
}

// TestBackupService_ExportBackupToFile_MatchesExportBackupBytes يتحقق من أن
// ExportBackupToFile ينتج ملفاً صالحاً مطابقاً بايت-ب-بايت لمخرج ExportBackup،
// وبكتابة أذرعية بلا بقايا .tmp.
func TestBackupService_ExportBackupToFile_MatchesExportBackupBytes(t *testing.T) {
	db, cleanup := setupBackupTestDB(t)
	defer cleanup()

	repo := repository.NewProjectRepository(db)
	licenseRepo := repository.NewLicenseRepository(db)
	backupSvc := NewBackupService(repo, licenseRepo)

	// محتوى غني: عربية وHTML (<>/) وأسطر جديدة داخل JSONText — لقفل توافق
	// صيغة الهروب (HTML escaping) مع json.MarshalIndent التاريخي
	rich := &domain.Project{
		ID:       "rich-1",
		Name:     "مشروع <عربي> & \"اقتباس\"",
		Mode:     "single",
		Elements: `{"imageSrc":"/local-image/a.png","label":"سطر1\nسطر2","nested":{"arr":[1,2,{"k":"v&<x>"}]}}`,
		Slots:    `[{"imageSrc":"/local-image/b.jpg","originalImageSrc":"/local-image/c.webp"}]`,
	}
	plain := &domain.Project{ID: "rich-2", Name: "Plain Project", Mode: "collage"}
	if err := repo.Save(rich); err != nil {
		t.Fatalf("failed to save rich project: %v", err)
	}
	time.Sleep(10 * time.Millisecond) // ضمان ترتيب updated_at مستقر بين الجلبين
	if err := repo.Save(plain); err != nil {
		t.Fatalf("failed to save plain project: %v", err)
	}

	expected, err := backupSvc.ExportBackup()
	if err != nil {
		t.Fatalf("ExportBackup failed: %v", err)
	}

	backupDir := t.TempDir()
	backupPath := filepath.Join(backupDir, "grido-backup.json")
	if err := backupSvc.ExportBackupToFile(backupPath); err != nil {
		t.Fatalf("ExportBackupToFile failed: %v", err)
	}

	fileBytes, err := os.ReadFile(backupPath)
	if err != nil {
		t.Fatalf("failed to read exported file: %v", err)
	}
	if !bytes.Equal(fileBytes, []byte(expected)) {
		t.Fatalf("ExportBackupToFile output must byte-match ExportBackup output\nfile: %q\nipc:  %q", fileBytes, expected)
	}

	// قفل صيغة المكتبة التاريخية: مطابقة json.MarshalIndent(projects, "", "  ")
	projects, err := repo.FindAll()
	if err != nil {
		t.Fatalf("FindAll failed: %v", err)
	}
	legacy, err := json.MarshalIndent(projects, "", "  ")
	if err != nil {
		t.Fatalf("MarshalIndent failed: %v", err)
	}
	if !bytes.Equal([]byte(expected), legacy) {
		t.Errorf("backup format drifted from legacy MarshalIndent format")
	}

	// صلاحية الملف: إعادة استيراده بنجاح (overwrite) يعيد نفس المشروعين
	if err := backupSvc.ImportBackup(string(fileBytes), "overwrite"); err != nil {
		t.Fatalf("importing the exported file failed: %v", err)
	}
	imported, err := repo.FindAll()
	if err != nil {
		t.Fatalf("FindAll after import failed: %v", err)
	}
	if len(imported) != 2 {
		t.Errorf("expected 2 projects after importing exported file, got %d", len(imported))
	}

	// لا بقايا ملفات مؤقتة .tmp في مجلد الهدف
	entries, err := os.ReadDir(backupDir)
	if err != nil {
		t.Fatalf("failed to read backup dir: %v", err)
	}
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".tmp") {
			t.Errorf("leftover temp file %q after atomic export", e.Name())
		}
	}

	// الكتابة فوق ملف قائم (الحمولية الذرية تستبدل الهدف)
	if err := backupSvc.ExportBackupToFile(backupPath); err != nil {
		t.Fatalf("re-export over existing file failed: %v", err)
	}

	// مسار فارغ مرفوض
	if err := backupSvc.ExportBackupToFile("   "); err == nil {
		t.Error("expected error for empty backup export path")
	}
}

// TestBackupService_ExportBackupToFile_EmptyLibrary يثبت صيغة المكتبة الفارغة "[]"
func TestBackupService_ExportBackupToFile_EmptyLibrary(t *testing.T) {
	db, cleanup := setupBackupTestDB(t)
	defer cleanup()

	backupSvc := NewBackupService(
		repository.NewProjectRepository(db),
		repository.NewLicenseRepository(db),
	)

	expected, err := backupSvc.ExportBackup()
	if err != nil {
		t.Fatalf("ExportBackup failed: %v", err)
	}
	if expected != "[]" {
		t.Fatalf("expected empty library export to be \"[]\", got %q", expected)
	}

	path := filepath.Join(t.TempDir(), "empty-backup.json")
	if err := backupSvc.ExportBackupToFile(path); err != nil {
		t.Fatalf("ExportBackupToFile failed: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read exported file: %v", err)
	}
	if string(data) != "[]" {
		t.Errorf("expected file content \"[]\", got %q", data)
	}
}
