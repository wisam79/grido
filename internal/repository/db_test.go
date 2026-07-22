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

	appDir := filepath.Join(tempDir, "GridoStudio")

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

	appDir = filepath.Join(tempDir, "GridoStudio")
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

