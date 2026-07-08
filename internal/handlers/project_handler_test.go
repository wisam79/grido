package handlers

import (
	"grido/internal/core/domain"
	"grido/internal/repository"
	"grido/internal/service"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestProjectHandler_SaveAndGet(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_ = db.AutoMigrate(&domain.Project{})

	repo := repository.NewProjectRepository(db)
	svc := service.NewProjectService(repo)
	handler := NewProjectHandler(svc)

	// 1. اختبار الحفظ مع مدخلات خاطئة (validation)
	_, err = handler.SaveProject(nil)
	if err == nil {
		t.Error("expected error when saving nil project")
	}

	_, err = handler.SaveProject(&domain.Project{ID: ""})
	if err == nil {
		t.Error("expected error when project ID is empty")
	}

	_, err = handler.SaveProject(&domain.Project{ID: "1", Name: ""})
	if err == nil {
		t.Error("expected error when project name is empty")
	}

	// 2. اختبار الحفظ الناجح
	proj := &domain.Project{
		ID:              "p-123",
		Name:            "Test Project",
		Mode:            "single",
		CanvasWidth:     800,
		CanvasHeight:    600,
		BackgroundColor: "#ffffff",
	}
	res, err := handler.SaveProject(proj)
	if err != nil {
		t.Fatalf("failed to save project: %v", err)
	}
	if res != "success" {
		t.Errorf("expected 'success', got %q", res)
	}

	// 3. اختبار جلب المشروع
	retrieved, err := handler.GetProject("p-123")
	if err != nil {
		t.Fatalf("failed to get project: %v", err)
	}
	if retrieved.Name != "Test Project" {
		t.Errorf("expected Name to be 'Test Project', got %q", retrieved.Name)
	}

	// 4. اختبار جلب بـ ID فارغ
	_, err = handler.GetProject("")
	if err == nil {
		t.Error("expected error when getting project with empty ID")
	}

	// 5. اختبار جلب الكل
	all, err := handler.GetAllProjects()
	if err != nil {
		t.Fatalf("failed to get all projects: %v", err)
	}
	if len(all) != 1 {
		t.Errorf("expected 1 project, got %d", len(all))
	}

	// 6. اختبار الحذف
	_, err = handler.DeleteProject("")
	if err == nil {
		t.Error("expected error when deleting with empty ID")
	}

	res, err = handler.DeleteProject("p-123")
	if err != nil {
		t.Fatalf("failed to delete project: %v", err)
	}
	if res != "success" {
		t.Errorf("expected 'success' on deletion, got %q", res)
	}

	_, err = handler.GetProject("p-123")
	if err == nil {
		t.Error("expected error when getting deleted project")
	}
}
