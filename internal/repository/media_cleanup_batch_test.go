package repository

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"grido/internal/core/domain"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestCleanupUnusedMedia_BatchedCollectionCompletesBeforeDeletion يتحقق من أن
// جمع المراجع على دفعات (LIMIT/OFFSET بحجم mediaCleanupBatchSize) يكتمل لكل
// الدفعات قبل بدء أي حذف: صورة يشير إليها مشروع في دفعة متأخرة يجب ألا تُنقل
// إلى الحجر الصحي في نفس دورة التنظيف التي تجلب الدفعات الأولى.
func TestCleanupUnusedMedia_BatchedCollectionCompletesBeforeDeletion(t *testing.T) {
	tempDir := t.TempDir()
	appDir := filepath.Join(tempDir, "GridoStudio")
	t.Setenv("GRIDO_APP_DIR", appDir)

	mediaDir := filepath.Join(appDir, "Media")
	trashDir := filepath.Join(appDir, "MediaTrash")
	if err := os.MkdirAll(mediaDir, 0o755); err != nil {
		t.Fatalf("mkdir media dir: %v", err)
	}

	// صور في الدفعة الأولى (مشار إليها) وصورة في دفعة متأخرة وصورة يتيمة
	headImage := filepath.Join(mediaDir, "head-image.jpg")
	tailImage := filepath.Join(mediaDir, "tail-image.jpg")
	orphan := filepath.Join(mediaDir, "orphan.jpg")
	for _, path := range []string{headImage, tailImage, orphan} {
		if err := os.WriteFile(path, []byte("image-data"), 0o644); err != nil {
			t.Fatalf("write %s: %v", path, err)
		}
	}
	tenDaysAgo := time.Now().Add(-10 * 24 * time.Hour)
	for _, path := range []string{headImage, tailImage, orphan} {
		if err := os.Chtimes(path, tenDaysAgo, tenDaysAgo); err != nil {
			t.Fatalf("chtimes %s: %v", path, err)
		}
	}

	// مكتبة تمتد لأكثر من دفعة واحدة: صفر-الحشو يجعل الترتيب المعجمي لـ id
	// يطابق الترتيب الرقمي فتوزّع الدفعات حتمي.
	total := mediaCleanupBatchSize + 50
	tailIndex := mediaCleanupBatchSize + 20 // مشروع في الدفعة الثانية صراحةً
	projects := make([]domain.Project, 0, total)
	for i := 0; i < total; i++ {
		p := domain.Project{ID: fmt.Sprintf("p%04d", i), Name: fmt.Sprintf("Project %d", i)}
		switch i {
		case 5: // دفعة أولى: تشير إلى head-image.jpg
			p.Elements = `[{"imageSrc": "/local-image/head-image.jpg"}]`
		case tailIndex: // دفعة متأخرة: تشير إلى tail-image.jpg
			p.Elements = `[{"imageSrc": "/local-image/tail-image.jpg"}]`
		default:
			p.Elements = `[]`
		}
		p.Slots = `[]`
		projects = append(projects, p)
	}

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&domain.Project{}, &domain.CustomTemplate{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	if err := db.CreateInBatches(&projects, 50).Error; err != nil {
		t.Fatalf("seed projects: %v", err)
	}

	dbMu.Lock()
	dbInstance = db
	dbMu.Unlock()
	defer func() {
		dbMu.Lock()
		dbInstance = nil
		dbMu.Unlock()
	}()

	// دورة التنظيف التلقائية: يجب أن يكتمل جمع الدفعتين قبل أي نقل للحجر
	runCleanupMedia()

	if _, err := os.Stat(tailImage); os.IsNotExist(err) {
		t.Fatal("CRITICAL: tail-image.jpg (referenced by a project in a LATER batch) was deleted before its batch was collected — collection did not complete before deletion")
	}
	if _, err := os.Stat(headImage); os.IsNotExist(err) {
		t.Error("expected head-image.jpg (referenced in first batch) to remain in Media/")
	}
	if _, err := os.Stat(filepath.Join(trashDir, "orphan.jpg")); os.IsNotExist(err) {
		t.Error("expected unreferenced orphan.jpg to be moved to MediaTrash/")
	}
	if _, err := os.Stat(orphan); !os.IsNotExist(err) {
		t.Error("expected orphan.jpg to be removed from Media/")
	}

	// المسار اليدوي «التنظيف الآن»: نفس الحارس — الجمع الكامل قبل الحذف.
	// يتيمة جديدة تُنشأ بعد الدورة التلقائية حتى يكون عدّها حتمياً (orphan2.jpg)
	orphan2 := filepath.Join(mediaDir, "orphan2.jpg")
	if err := os.WriteFile(orphan2, []byte("image-data-2"), 0o644); err != nil {
		t.Fatalf("write %s: %v", orphan2, err)
	}
	if err := os.Chtimes(orphan2, tenDaysAgo, tenDaysAgo); err != nil {
		t.Fatalf("chtimes %s: %v", orphan2, err)
	}

	cleanedCount, _, err := CleanUnusedMediaNow()
	if err != nil {
		t.Fatalf("CleanUnusedMediaNow failed: %v", err)
	}
	if cleanedCount != 1 {
		t.Errorf("expected 1 cleaned file (orphan2.jpg) in manual cleanup, got %d", cleanedCount)
	}
	if _, err := os.Stat(filepath.Join(trashDir, "orphan2.jpg")); os.IsNotExist(err) {
		t.Error("expected orphan2.jpg in MediaTrash after manual clean")
	}
	if _, err := os.Stat(tailImage); os.IsNotExist(err) {
		t.Error("expected tail-image.jpg to remain in Media/ after manual clean (later-batch reference)")
	}
}

// TestCollectReferencedImages_BatchErrorFailsClosed يتحقق من أن فشل جلب أي
// دفعة مشاريع يُبطل جمع المراجع كاملاً ويوقف دورتي التنظيف (التلقائية واليدوية)
// قبل أي حذف — امتداد الحارس fail-closed لحارس فساد مسودة autosave.
func TestCollectReferencedImages_BatchErrorFailsClosed(t *testing.T) {
	tempDir := t.TempDir()
	appDir := filepath.Join(tempDir, "GridoStudio")
	t.Setenv("GRIDO_APP_DIR", appDir)

	mediaDir := filepath.Join(appDir, "Media")
	if err := os.MkdirAll(mediaDir, 0o755); err != nil {
		t.Fatalf("mkdir media dir: %v", err)
	}
	img := filepath.Join(mediaDir, "must-survive-on-error.jpg")
	if err := os.WriteFile(img, []byte("data"), 0o644); err != nil {
		t.Fatalf("write %s: %v", img, err)
	}
	agePath(t, img, 10*24*time.Hour)

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	if err := db.AutoMigrate(&domain.Project{}, &domain.CustomTemplate{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	// إغلاق الـpool: كل استعلام يفشل ⇒ فشل جلب الدفعة الأولى
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("db.DB(): %v", err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("close pool: %v", err)
	}

	dbMu.Lock()
	dbInstance = db
	dbMu.Unlock()
	defer func() {
		dbMu.Lock()
		dbInstance = nil
		dbMu.Unlock()
	}()

	if _, err := collectReferencedImages(db, appDir); err == nil {
		t.Fatal("expected batch fetch error to abort reference collection (fail-closed)")
	}

	if _, _, err := CleanUnusedMediaNow(); err == nil {
		t.Fatal("expected CleanUnusedMediaNow to fail closed on unreadable batch")
	}
	if _, err := os.Stat(img); os.IsNotExist(err) {
		t.Fatal("CRITICAL DATA LOSS: file must survive when batch collection fails (fail-closed)")
	}

	runCleanupMedia()
	if _, err := os.Stat(img); os.IsNotExist(err) {
		t.Fatal("CRITICAL DATA LOSS: file must survive runCleanupMedia when batch collection fails")
	}
}
