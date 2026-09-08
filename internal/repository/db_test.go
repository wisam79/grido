package repository

import (
	"grido/internal/core/domain"
	"os"
	"path/filepath"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func init() {
	tempDir, _ := os.MkdirTemp("", "grido-test-global-*")
	appDir := filepath.Join(tempDir, "GridoStudio")
	os.Setenv("GRIDO_APP_DIR", appDir)
	os.Setenv("APPDATA", tempDir)
	os.Setenv("HOME", tempDir)
	os.Setenv("XDG_CONFIG_HOME", tempDir)
}

func TestProjectRepository_SaveAndGet(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "grido-repo-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	origAppData := os.Getenv("APPDATA")
	origHome := os.Getenv("HOME")
	origXdg := os.Getenv("XDG_CONFIG_HOME")
	defer func() {
		os.Setenv("APPDATA", origAppData)
		os.Setenv("HOME", origHome)
		os.Setenv("XDG_CONFIG_HOME", origXdg)
	}()

	os.Setenv("APPDATA", tempDir)
	os.Setenv("HOME", tempDir)
	os.Setenv("XDG_CONFIG_HOME", tempDir)

	// 1. تهيئة قاعدة بيانات في الذاكرة للااختبار
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

func TestCleanupUnusedMedia(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "grido-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	origAppData := os.Getenv("APPDATA")
	origHome := os.Getenv("HOME")
	origXdg := os.Getenv("XDG_CONFIG_HOME")
	origAppDir := os.Getenv("GRIDO_APP_DIR")
	defer func() {
		os.Setenv("APPDATA", origAppData)
		os.Setenv("HOME", origHome)
		os.Setenv("XDG_CONFIG_HOME", origXdg)
		os.Setenv("GRIDO_APP_DIR", origAppDir)
	}()

	appDir := filepath.Join(tempDir, "GridoStudio")
	os.Setenv("APPDATA", tempDir)
	os.Setenv("HOME", tempDir)
	os.Setenv("XDG_CONFIG_HOME", tempDir)
	os.Setenv("GRIDO_APP_DIR", appDir)
	mediaDir := filepath.Join(appDir, "Media")
	trashDir := filepath.Join(appDir, "MediaTrash")
	_ = os.MkdirAll(mediaDir, 0755)

	// إنشاء ملفات صور
	img1 := filepath.Join(mediaDir, "image1.jpg")
	img2 := filepath.Join(mediaDir, "image2.jpg")
	img3 := filepath.Join(mediaDir, "image3.jpg")

	_ = os.WriteFile(img1, []byte("data1"), 0644)
	_ = os.WriteFile(img2, []byte("data2"), 0644)
	_ = os.WriteFile(img3, []byte("data3"), 0644)

	// جعل تاريخ تعديل image2.jpg قديماً (10 أيام - أكبر من 7 أيام وأقل من 30 يوماً) لكي يتم نقله للحجر الصحي بدون حذفه فوراً
	oldTime := time.Now().Add(-10 * 24 * time.Hour)
	if err := os.Chtimes(img2, oldTime, oldTime); err != nil {
		t.Fatalf("failed to chtimes img2: %v", err)
	}
	if err := os.Chtimes(img3, oldTime, oldTime); err != nil {
		t.Fatalf("failed to chtimes img3: %v", err)
	}

	// تهيئة DB في الذاكرة
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_ = db.AutoMigrate(&domain.Project{})

	// إعداد المشاريع
	p := &domain.Project{
		ID:       "p1",
		Name:     "Active Project",
		Elements: `[{"imageSrc": "/local-image/image1.jpg"}]`,
		Slots:    `[]`,
	}
	_ = db.Save(p)

	// تعيين dbInstance للاختبار
	dbMu.Lock()
	dbInstance = db
	dbMu.Unlock()
	defer func() {
		dbMu.Lock()
		dbInstance = nil
		dbMu.Unlock()
	}()

	// تشغيل التنظيف
	runCleanupMedia()

	// التحقق من أن image1.jpg (المشار إليها) لم يتم نقلها
	if _, err := os.Stat(img1); os.IsNotExist(err) {
		t.Error("expected referenced image1.jpg to exist in Media")
	}

	// التحقق من أن image2.jpg (غير المشار إليها وقديمة) تم نقلها للحجر الصحي
	if _, err := os.Stat(filepath.Join(mediaDir, "image2.jpg")); !os.IsNotExist(err) {
		t.Error("expected unreferenced old image2.jpg to be removed from Media")
	}
	if _, err := os.Stat(filepath.Join(trashDir, "image2.jpg")); os.IsNotExist(err) {
		t.Error("expected image2.jpg to be in MediaTrash")
	}

	// التحقق من أن image3.jpg (غير المشار إليها وقديمة جداً - سنقوم بتغيير وقتها في الحجر الصحي لتخطي 24 ساعة)
	// ونرى إن كانت ستحذف عند تشغيل التنظيف مجدداً
	trashImg3 := filepath.Join(trashDir, "image3.jpg")
	if _, err := os.Stat(trashImg3); os.IsNotExist(err) {
		t.Error("expected image3.jpg to be moved to trash first")
	}

	veryOldTime := time.Now().Add(-35 * 24 * time.Hour)
	_ = os.Chtimes(trashImg3, veryOldTime, veryOldTime)

	// تشغيل التنظيف مرة أخرى لحذف القديم من الحجر الصحي
	runCleanupMedia()

	if _, err := os.Stat(trashImg3); !os.IsNotExist(err) {
		t.Error("expected very old image3.jpg to be purged from MediaTrash")
	}
}

func TestCleanupUnusedMedia_CorruptAutosave(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "grido-test-corrupt-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	origAppData := os.Getenv("APPDATA")
	origHome := os.Getenv("HOME")
	origXdg := os.Getenv("XDG_CONFIG_HOME")
	defer func() {
		os.Setenv("APPDATA", origAppData)
		os.Setenv("HOME", origHome)
		os.Setenv("XDG_CONFIG_HOME", origXdg)
	}()

	os.Setenv("APPDATA", tempDir)
	os.Setenv("HOME", tempDir)
	os.Setenv("XDG_CONFIG_HOME", tempDir)

	appDir := filepath.Join(tempDir, "GridoStudio")
	mediaDir := filepath.Join(appDir, "Media")
	_ = os.MkdirAll(mediaDir, 0755)

	// Create a corrupt autosave.json
	_ = os.WriteFile(filepath.Join(appDir, "autosave.json"), []byte("{invalid-json}"), 0644)

	// Create an old image file
	img := filepath.Join(mediaDir, "unreferenced.jpg")
	_ = os.WriteFile(img, []byte("data"), 0644)
	oldTime := time.Now().Add(-20 * time.Minute)
	_ = os.Chtimes(img, oldTime, oldTime)

	// Set up DB in memory
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_ = db.AutoMigrate(&domain.Project{})

	dbMu.Lock()
	dbInstance = db
	dbMu.Unlock()
	defer func() {
		dbMu.Lock()
		dbInstance = nil
		dbMu.Unlock()
	}()

	// Run cleanup - should abort
	runCleanupMedia()

	// Verify that unreferenced.jpg is STILL in Media and not moved to trash
	if _, err := os.Stat(img); os.IsNotExist(err) {
		t.Error("expected unreferenced.jpg to still exist in Media because cleanup should have aborted")
	}
}

func TestLicenseRepository_AntiTamper(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_ = db.AutoMigrate(&domain.UserProfile{})

	repo := NewLicenseRepository(db)

	profile := &domain.UserProfile{
		ID:    "test-id",
		Email: "test@example.com",
		Plan:  "pro",
	}

	// Save valid profile
	err = repo.Save(profile)
	if err != nil {
		t.Fatalf("failed to save profile: %v", err)
	}

	// Manually tamper the database via GORM bypassing hooks
	db.Model(&domain.UserProfile{}).Where("id = ?", "test-id").Update("plan", "enterprise")

	// Try to get the tampered profile
	retrieved, err := repo.Get()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if retrieved != nil {
		if retrieved.Plan != "free" {
			t.Errorf("expected tampered profile to be reset to free, got %v", retrieved.Plan)
		}
	}
}

func TestCustomTemplateRepository_CRUD(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&domain.CustomTemplate{}); err != nil {
		t.Fatalf("failed to migrate custom templates: %v", err)
	}

	repo := NewCustomTemplateRepository(db)

	tmpl := &domain.CustomTemplate{
		Name:  "Passport Grid 8x",
		Slots: 8,
		Cells: domain.JSONText(`[{"x":0,"y":0,"w":0.5,"h":0.25}]`),
	}

	// 1. Create
	if err := repo.Create(tmpl); err != nil {
		t.Fatalf("failed to create custom template: %v", err)
	}
	if tmpl.ID == 0 {
		t.Error("expected template ID to be populated after creation")
	}

	// 2. FindAll
	templates, err := repo.FindAll()
	if err != nil {
		t.Fatalf("failed to find templates: %v", err)
	}
	if len(templates) != 1 {
		t.Errorf("expected 1 template, got %d", len(templates))
	}
	if templates[0].Name != "Passport Grid 8x" {
		t.Errorf("expected template name 'Passport Grid 8x', got %q", templates[0].Name)
	}

	// 3. Delete
	if err := repo.Delete(tmpl.ID); err != nil {
		t.Fatalf("failed to delete template: %v", err)
	}

	remaining, err := repo.FindAll()
	if err != nil {
		t.Fatalf("failed to find templates after delete: %v", err)
	}
	if len(remaining) != 0 {
		t.Errorf("expected 0 templates after delete, got %d", len(remaining))
	}
}

func TestCleanUnusedMediaNow(t *testing.T) {
	tempDir := t.TempDir()
	appDir := filepath.Join(tempDir, "GridoStudio")
	t.Setenv("GRIDO_APP_DIR", appDir)

	mediaDir := filepath.Join(appDir, "Media")
	trashDir := filepath.Join(appDir, "MediaTrash")
	_ = os.MkdirAll(mediaDir, 0755)

	img1 := filepath.Join(mediaDir, "used.jpg")
	img2 := filepath.Join(mediaDir, "unused.jpg")
	_ = os.WriteFile(img1, []byte("referenced-data"), 0644)
	_ = os.WriteFile(img2, []byte("unreferenced-data-to-clean"), 0644)

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_ = db.AutoMigrate(&domain.Project{}, &domain.CustomTemplate{})

	p := &domain.Project{
		ID:       "proj-clean-now",
		Name:     "Test Project",
		Elements: `[{"imageSrc": "/local-image/used.jpg"}]`,
		Slots:    `[]`,
	}
	_ = db.Save(p)

	dbMu.Lock()
	dbInstance = db
	dbMu.Unlock()
	defer func() {
		dbMu.Lock()
		dbInstance = nil
		dbMu.Unlock()
	}()

	cleanedCount, freedBytes, err := CleanUnusedMediaNow()
	if err != nil {
		t.Fatalf("CleanUnusedMediaNow returned error: %v", err)
	}
	if cleanedCount != 1 {
		t.Errorf("expected 1 cleaned file, got %d", cleanedCount)
	}
	if freedBytes != int64(len("unreferenced-data-to-clean")) {
		t.Errorf("expected freedBytes %d, got %d", len("unreferenced-data-to-clean"), freedBytes)
	}

	// used.jpg must still be in Media/
	if _, err := os.Stat(img1); os.IsNotExist(err) {
		t.Error("expected referenced used.jpg to remain in Media/")
	}
	// unused.jpg must be moved to MediaTrash/
	if _, err := os.Stat(filepath.Join(trashDir, "unused.jpg")); os.IsNotExist(err) {
		t.Error("expected unused.jpg to be in MediaTrash/")
	}
}

func TestCollectReferencedImages_EdgeCases(t *testing.T) {
	tempDir := t.TempDir()
	appDir := filepath.Join(tempDir, "GridoStudio")
	_ = os.MkdirAll(appDir, 0755)

	// 1. Case: corrupt autosave.json should abort and return error to protect user data
	autosavePath := filepath.Join(appDir, "autosave.json")
	_ = os.WriteFile(autosavePath, []byte("NOT_VALID_JSON{[[{"), 0644)

	projects := []domain.Project{
		{
			ID:       "p-test",
			Elements: `[{"imageSrc": "image.png", "originalImageSrc": "orig.png"}]`,
			Slots:    `[{"imageSrc": "slot.png", "originalImageSrc": "orig_slot.png"}]`,
		},
	}

	_, err := collectReferencedImages(projects, appDir)
	if err == nil {
		t.Error("expected error when autosave.json is corrupt, got nil")
	}

	// 2. Case: valid autosave.json with elements & slots
	validAutosave := `{"elements":[{"imageSrc":"/local-image/draft1.jpg"}],"slots":[{"imageSrc":"/local-image/draft2.jpg"}]}`
	_ = os.WriteFile(autosavePath, []byte(validAutosave), 0644)

	referenced, err := collectReferencedImages(projects, appDir)
	if err != nil {
		t.Fatalf("expected no error with valid autosave: %v", err)
	}

	expectedKeys := []string{"image.png", "orig.png", "slot.png", "orig_slot.png", "draft1.jpg", "draft2.jpg"}
	for _, key := range expectedKeys {
		if !referenced[key] {
			t.Errorf("expected %q to be in referenced map", key)
		}
	}
}

func TestProjectRepository_ImportProjects(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	_ = db.AutoMigrate(&domain.Project{})

	repo := NewProjectRepository(db)

	p1 := domain.Project{ID: "p1", Name: "Project 1"}
	p2 := domain.Project{ID: "p2", Name: "Project 2"}
	_ = repo.Save(&p1)

	// Test merge import (overwrite = false)
	err = repo.ImportProjects([]domain.Project{p2}, false)
	if err != nil {
		t.Fatalf("ImportProjects (merge) failed: %v", err)
	}
	all, _ := repo.FindAll()
	if len(all) != 2 {
		t.Errorf("expected 2 projects after merge, got %d", len(all))
	}

	// Test overwrite import (overwrite = true)
	p3 := domain.Project{ID: "p3", Name: "Project 3 Only"}
	err = repo.ImportProjects([]domain.Project{p3}, true)
	if err != nil {
		t.Fatalf("ImportProjects (overwrite) failed: %v", err)
	}
	allOverwrite, _ := repo.FindAll()
	if len(allOverwrite) != 1 || allOverwrite[0].ID != "p3" {
		t.Errorf("expected only p3 after overwrite, got: %+v", allOverwrite)
	}
}

func TestInitDB_And_CloseDB(t *testing.T) {
	tempDir := t.TempDir()
	appDir := filepath.Join(tempDir, "GridoStudio")
	t.Setenv("GRIDO_APP_DIR", appDir)

	db, err := InitDB()
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}
	if db == nil {
		t.Fatal("InitDB returned nil db")
	}

	// Calling InitDB again should be idempotent and return same instance
	db2, err := InitDB()
	if err != nil || db2 != db {
		t.Errorf("expected idempotent db instance from InitDB")
	}

	// Test clean shutdown
	if err := CloseDB(); err != nil {
		t.Fatalf("CloseDB failed: %v", err)
	}

	// Closing when already closed should succeed gracefully
	if err := CloseDB(); err != nil {
		t.Errorf("expected nil error on repeated CloseDB, got %v", err)
	}
}

func TestStopCleanupUnusedMedia(t *testing.T) {
	// Should not panic even if no cleanup is running
	StopCleanupUnusedMedia()
}



