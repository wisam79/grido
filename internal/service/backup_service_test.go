package service

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
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

type recordingBackupRepository struct {
	domain.ProjectRepository
	importCalls int
}

func (r *recordingBackupRepository) ImportProjects(projects []domain.Project, overwrite bool) error {
	r.importCalls++
	return r.ProjectRepository.ImportProjects(projects, overwrite)
}

func TestBackupService_ImportBackupRejectsMalformedProjectsWithoutMutation(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	cases := []struct {
		name    string
		entry   any
		wantErr string
	}{
		{"null_entry", nil, "ID"},
		{"missing_id", map[string]any{"name": "Broken backup"}, "ID"},
		{"empty_id", map[string]any{"id": ""}, "ID"},
		{"blank_id", map[string]any{"id": " \t\n"}, "ID"},
		{"duplicate_id", map[string]any{"id": "original-1", "name": "Second duplicate"}, "duplicate"},
	}
	for _, field := range []string{"elements", "slots", "template", "collageTemplate", "printSettings", "editorState", "userGuides"} {
		for _, invalid := range []struct{ name, value string }{
			{"truncated", `{"imageSrc":`},
			{"trailing_json", `[] {}`},
			{"number", `42`},
			{"boolean", `true`},
			{"string", `"not project references"`},
		} {
			cases = append(cases, struct {
				name    string
				entry   any
				wantErr string
			}{field + "_" + invalid.name, map[string]any{"id": "broken", field: invalid.value}, field})
		}
	}

	for _, mode := range []string{"merge", "overwrite"} {
		for _, tc := range cases {
			t.Run(mode+"/"+tc.name, func(t *testing.T) {
				db, cleanup := setupBackupTestDB(t)
				defer cleanup()
				repo := &recordingBackupRepository{ProjectRepository: repository.NewProjectRepository(db)}
				svc := NewBackupService(repo, &MockLicenseRepository{})
				for _, p := range []domain.Project{
					{ID: "original-1", Name: "Keep original", Elements: `[{"imageSrc":"/local-image/keep.jpg"}]`},
					{ID: "original-2", Name: "Keep second", EditorState: `{"autofillImages":["/local-image/second.jpg"]}`},
				} {
					if err := repo.Save(&p); err != nil {
						t.Fatal(err)
					}
				}
				before, err := repo.FindAll()
				if err != nil {
					t.Fatal(err)
				}
				// A valid update precedes the bad entry: validation must finish
				// before *any* import, not partially replace earlier projects.
				payload, err := json.Marshal([]any{
					map[string]any{"id": "original-1", "name": "Must not replace original", "elements": "[]"},
					tc.entry,
				})
				if err != nil {
					t.Fatal(err)
				}
				if err := svc.ImportBackup(string(payload), mode); err == nil || !strings.Contains(err.Error(), tc.wantErr) {
					t.Errorf("expected validation error containing %q, got %v", tc.wantErr, err)
				}
				if repo.importCalls != 0 {
					t.Errorf("malformed backup reached ImportProjects %d times", repo.importCalls)
				}
				after, err := repo.FindAll()
				if err != nil {
					t.Fatal(err)
				}
				if !reflect.DeepEqual(after, before) {
					t.Error("malformed backup changed the existing library")
				}
			})
		}
	}
}

func TestBackupService_ImportBackupRejectsTrailingDataWithoutMutation(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	for _, mode := range []string{"merge", "overwrite"} {
		for _, trailing := range []string{` {"id":"extra"}`, ` []`, ` trailing`} {
			t.Run(mode+trailing, func(t *testing.T) {
				db, cleanup := setupBackupTestDB(t)
				defer cleanup()
				repo := &recordingBackupRepository{ProjectRepository: repository.NewProjectRepository(db)}
				svc := NewBackupService(repo, &MockLicenseRepository{})
				if err := repo.Save(&domain.Project{ID: "original", Name: "Keep original"}); err != nil {
					t.Fatal(err)
				}
				before, err := repo.FindAll()
				if err != nil {
					t.Fatal(err)
				}
				if err := svc.ImportBackup(`[{"id":"replacement"}]`+trailing, mode); err == nil {
					t.Error("expected trailing JSON/data to be rejected")
				}
				if repo.importCalls != 0 {
					t.Error("trailing data reached ImportProjects")
				}
				after, err := repo.FindAll()
				if err != nil {
					t.Fatal(err)
				}
				if !reflect.DeepEqual(after, before) {
					t.Error("trailing data changed the existing library")
				}
			})
		}
	}
}

func TestBackupService_ImportBackupPreservesLegacyReferenceFormats(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	for _, tc := range []struct {
		name  string
		value any
	}{
		{"empty", ""},
		{"whitespace", " \t\n"},
		{"null_field", nil},
		{"null_json", "null"},
		{"array", `[{"imageSrc":"/local-image/not-present.jpg","futureField":true}]`},
		{"object", `{"nested":{"originalImageSrc":"C:\\legacy\\Media\\photo.png"},"futureVersion":99}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db, cleanup := setupBackupTestDB(t)
			defer cleanup()
			repo := repository.NewProjectRepository(db)
			svc := NewBackupService(repo, &MockLicenseRepository{})
			entry := map[string]any{"id": "legacy", "name": "Legacy project", "futureField": true}
			for _, field := range []string{"elements", "slots", "template", "collageTemplate", "printSettings", "editorState", "userGuides"} {
				entry[field] = tc.value
			}
			payload, err := json.Marshal([]any{entry, map[string]any{"id": "minimal"}})
			if err != nil {
				t.Fatal(err)
			}
			for _, mode := range []string{"overwrite", "merge"} {
				if err := svc.ImportBackup(string(payload), mode); err != nil {
					t.Fatalf("legacy format must remain valid in %s mode: %v", mode, err)
				}
			}
			p, err := repo.FindByID("legacy")
			if err != nil {
				t.Fatal(err)
			}
			want, _ := tc.value.(string)
			for _, got := range []domain.JSONText{p.Elements, p.Slots, p.Template, p.CollageTemplate, p.PrintSettings, p.EditorState, p.UserGuides} {
				if string(got) != want {
					t.Errorf("legacy reference value changed: got %q, want %q", got, want)
				}
			}
			if _, err := repo.FindByID("minimal"); err != nil {
				t.Fatalf("legacy project with omitted optional fields must survive: %v", err)
			}
		})
	}
}

func TestBackupService_ImportBackupLegacyNullIsNoop(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	for _, mode := range []string{"merge", "overwrite"} {
		t.Run(mode, func(t *testing.T) {
			db, cleanup := setupBackupTestDB(t)
			defer cleanup()
			repo := &recordingBackupRepository{ProjectRepository: repository.NewProjectRepository(db)}
			svc := NewBackupService(repo, &MockLicenseRepository{})
			if err := repo.Save(&domain.Project{ID: "original", Name: "Keep original"}); err != nil {
				t.Fatal(err)
			}
			before, err := repo.FindAll()
			if err != nil {
				t.Fatal(err)
			}
			if err := svc.ImportBackup(" \nnull\t", mode); err != nil {
				t.Fatalf("legacy null export must be accepted without mutation: %v", err)
			}
			if repo.importCalls != 0 {
				t.Error("legacy null must not call ImportProjects")
			}
			after, err := repo.FindAll()
			if err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(after, before) {
				t.Error("legacy null erased the existing library")
			}

			// An explicit empty array still represents a deliberate replacement.
			if err := svc.ImportBackup("[]", "overwrite"); err != nil {
				t.Fatal(err)
			}
			if count, err := repo.Count(); err != nil || count != 0 {
				t.Fatalf("explicit empty overwrite must clear the library: count=%d err=%v", count, err)
			}
		})
	}
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
