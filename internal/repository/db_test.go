package repository

import (
	"grido/internal/core/domain"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestProjectRepository_SaveAndGet(t *testing.T) {
	// 1. تهيئة قاعدة بيانات في الذاكرة للاختبار
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}

	err = db.AutoMigrate(&domain.Project{})
	if err != nil {
		t.Fatalf("failed to migrate database: %v", err)
	}

	repo := NewProjectRepository(db)

	p := &domain.Project{
		ID:              "rep-id-123",
		Name:            "Project Name",
		Mode:            "single",
		CanvasWidth:     600,
		CanvasHeight:    400,
		BackgroundColor: "#000000",
		Elements:        "[]",
		Slots:           "[]",
	}

	// 2. اختبار الحفظ (Save)
	err = repo.Save(p)
	if err != nil {
		t.Errorf("failed to save project: %v", err)
	}

	// 3. اختبار البحث بـ ID (FindByID)
	retrieved, err := repo.FindByID("rep-id-123")
	if err != nil {
		t.Errorf("failed to find project: %v", err)
	}

	if retrieved.Name != "Project Name" {
		t.Errorf("expected project name 'Project Name', got '%s'", retrieved.Name)
	}
	if retrieved.CreatedAtStr == "" {
		t.Error("expected CreatedAtStr to be populated")
	}

	// 4. اختبار جلب الكل (FindAll)
	all, err := repo.FindAll()
	if err != nil {
		t.Errorf("failed to find all projects: %v", err)
	}
	if len(all) != 1 {
		t.Errorf("expected 1 project in DB, got %d", len(all))
	}

	// 5. اختبار الحذف (Delete)
	err = repo.Delete("rep-id-123")
	if err != nil {
		t.Errorf("failed to delete project: %v", err)
	}

	_, err = repo.FindByID("rep-id-123")
	if err == nil {
		t.Error("expected error when looking up deleted project, got nil")
	}
}
