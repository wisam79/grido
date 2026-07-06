package service

import (
	"grido/internal/core/domain"
	"grido/internal/repository"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupBackupTestDB(t *testing.T) (*gorm.DB, func()) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}

	err = db.AutoMigrate(&domain.Project{})
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
	projectSvc := NewProjectService(repo)
	backupSvc := NewBackupService(repo)

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
