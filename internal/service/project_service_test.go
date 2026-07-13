package service

import (
	"grido/internal/core/domain"
	"grido/internal/repository"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) (*gorm.DB, func()) {
	// استخدام قاعدة بيانات SQLite في الذاكرة لضمان عزل الاختبارات
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

func TestProjectService_SaveAndGet(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := repository.NewProjectRepository(db)
	svc := NewProjectService(repo, repository.NewLicenseRepository(db))

	project := &domain.Project{
		ID:              "test-id-123",
		Name:            "مشروع بطاقة تعريفية",
		Mode:            "single",
		CanvasWidth:     400,
		CanvasHeight:    300,
		BackgroundColor: "#FFFFFF",
		Elements:        `[{"id":"1","type":"text","text":"Hello"}]`,
	}

	// اختبار الحفظ
	err := svc.SaveProject(project)
	if err != nil {
		t.Errorf("failed to save project: %v", err)
	}

	// اختبار الاسترجاع
	retrieved, err := svc.GetProject("test-id-123")
	if err != nil {
		t.Errorf("failed to retrieve project: %v", err)
	}

	if retrieved.Name != "مشروع بطاقة تعريفية" {
		t.Errorf("expected project name to be 'مشروع بطاقة تعريفية', got '%s'", retrieved.Name)
	}

	if retrieved.CanvasWidth != 400 {
		t.Errorf("expected width to be 400, got %d", retrieved.CanvasWidth)
	}
}

func TestProjectService_SaveValidation(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := repository.NewProjectRepository(db)
	svc := NewProjectService(repo, repository.NewLicenseRepository(db))

	// اختبار الحفظ بدون ID (يجب أن يفشل)
	project := &domain.Project{
		ID:   "",
		Name: "Test Project",
	}
	err := svc.SaveProject(project)
	if err == nil {
		t.Error("expected error when saving project with empty ID, got nil")
	}

	// اختبار الحفظ بدون اسم (يجب أن يأخذ اسماً افتراضياً)
	projectWithNoName := &domain.Project{
		ID:   "test-id-no-name",
		Name: "",
	}
	err = svc.SaveProject(projectWithNoName)
	if err != nil {
		t.Errorf("unexpected error saving unnamed project: %v", err)
	}

	retrieved, err := svc.GetProject("test-id-no-name")
	if err != nil {
		t.Fatalf("failed to retrieve project: %v", err)
	}
	if retrieved.Name != "مشروع بدون عنوان" {
		t.Errorf("expected default name 'مشروع بدون عنوان', got '%s'", retrieved.Name)
	}
}

func TestProjectService_GetAll(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := repository.NewProjectRepository(db)
	svc := NewProjectService(repo, repository.NewLicenseRepository(db))

	// إدراج مشروعين
	p1 := &domain.Project{ID: "id1", Name: "Project 1"}
	p2 := &domain.Project{ID: "id2", Name: "Project 2"}

	_ = svc.SaveProject(p1)
	_ = svc.SaveProject(p2)

	projects, err := svc.GetAllProjects()
	if err != nil {
		t.Errorf("failed to get all projects: %v", err)
	}

	if len(projects) != 2 {
		t.Errorf("expected 2 projects, got %d", len(projects))
	}
}

func TestProjectService_Delete(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := repository.NewProjectRepository(db)
	svc := NewProjectService(repo, repository.NewLicenseRepository(db))

	p := &domain.Project{ID: "del-id", Name: "Delete Me"}
	_ = svc.SaveProject(p)

	err := svc.DeleteProject("del-id")
	if err != nil {
		t.Errorf("failed to delete project: %v", err)
	}

	_, err = svc.GetProject("del-id")
	if err == nil {
		t.Error("expected error looking up deleted project, got nil")
	}
}

func TestProjectService_SaveUpdateCreatedAt(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := repository.NewProjectRepository(db)
	svc := NewProjectService(repo, repository.NewLicenseRepository(db))

	p := &domain.Project{
		ID:   "update-created-at-test",
		Name: "Initial Project",
	}

	// 1. First save
	err := svc.SaveProject(p)
	if err != nil {
		t.Fatalf("failed to save initial project: %v", err)
	}

	retrieved1, err := svc.GetProject("update-created-at-test")
	if err != nil {
		t.Fatalf("failed to retrieve project: %v", err)
	}
	createdTime1 := retrieved1.CreatedAtStr
	if createdTime1 == "" {
		t.Fatal("expected CreatedAtStr to be populated")
	}

	// 2. Simulating updating a project from the frontend (which sends zero CreatedAt because it is ignored by JSON tags)
	pUpdate := &domain.Project{
		ID:   "update-created-at-test",
		Name: "Updated Project Name",
	}

	err = svc.SaveProject(pUpdate)
	if err != nil {
		t.Fatalf("failed to save updated project: %v", err)
	}

	retrieved2, err := svc.GetProject("update-created-at-test")
	if err != nil {
		t.Fatalf("failed to retrieve updated project: %v", err)
	}

	if retrieved2.Name != "Updated Project Name" {
		t.Errorf("expected name to be updated to 'Updated Project Name', got '%s'", retrieved2.Name)
	}

	if retrieved2.CreatedAtStr != createdTime1 {
		t.Errorf("expected CreatedAtStr to remain '%s', but it changed/cleared to '%s'", createdTime1, retrieved2.CreatedAtStr)
	}
}
