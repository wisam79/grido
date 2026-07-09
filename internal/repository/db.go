package repository

import (
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var (
	dbInstance *gorm.DB
	dbMu       sync.RWMutex
)

func InitDB() (*gorm.DB, error) {
	dbMu.Lock()
	defer dbMu.Unlock()

	if dbInstance != nil {
		return dbInstance, nil
	}

	appDir := utils.GetAppDir()
	dbPath := filepath.Join(appDir, "grido.db")

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// ⚡ Enable WAL (Write-Ahead Logging) mode, busy timeout and foreign keys with performance settings
	pragmas := []struct {
		query string
		name  string
	}{
		{"PRAGMA journal_mode=WAL;", "journal_mode=WAL"},
		{"PRAGMA busy_timeout=5000;", "busy_timeout=5000"},
		{"PRAGMA foreign_keys=ON;", "foreign_keys=ON"},
		{"PRAGMA synchronous=NORMAL;", "synchronous=NORMAL"},
		{"PRAGMA cache_size=-8000;", "cache_size=-8000"},
		{"PRAGMA temp_store=MEMORY;", "temp_store=MEMORY"},
		{"PRAGMA mmap_size=268435456;", "mmap_size=268435456"},
	}

	for _, pragma := range pragmas {
		if _, err := sqlDB.Exec(pragma.query); err != nil {
			slog.Warn("Failed to execute SQLite PRAGMA", "pragma", pragma.name, "error", err)
		}
	}

	// SQLite only supports one concurrent writer. Limit connections to 1 to avoid locking
	sqlDB.SetMaxOpenConns(1)

	// الهجرة التلقائية لجداول قاعدة البيانات
	err = db.AutoMigrate(&domain.Project{})
	if err != nil {
		return nil, err
	}

	dbInstance = db
	return dbInstance, nil
}

func CloseDB() error {
	dbMu.Lock()
	defer dbMu.Unlock()

	if dbInstance == nil {
		return nil
	}
	sqlDB, err := dbInstance.DB()
	if err != nil {
		return err
	}
	err = sqlDB.Close()
	if err == nil {
		dbInstance = nil
	}
	return err
}

type projectRepositoryImpl struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) domain.ProjectRepository {
	return &projectRepositoryImpl{db: db}
}

func (r *projectRepositoryImpl) Save(project *domain.Project) error {
	return r.db.Save(project).Error
}

func (r *projectRepositoryImpl) FindByID(id string) (*domain.Project, error) {
	var project domain.Project
	err := r.db.First(&project, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	project.CreatedAtStr = project.CreatedAt.Format(time.RFC3339)
	project.UpdatedAtStr = project.UpdatedAt.Format(time.RFC3339)
	return &project, nil
}

func (r *projectRepositoryImpl) FindAll() ([]domain.Project, error) {
	var projects []domain.Project
	err := r.db.Order("updated_at desc").Find(&projects).Error
	if err == nil {
		for i := range projects {
			projects[i].CreatedAtStr = projects[i].CreatedAt.Format(time.RFC3339)
			projects[i].UpdatedAtStr = projects[i].UpdatedAt.Format(time.RFC3339)
		}
	}
	return projects, err
}

func (r *projectRepositoryImpl) Delete(id string) error {
	return r.db.Delete(&domain.Project{}, "id = ?", id).Error
}

func (r *projectRepositoryImpl) ImportProjects(projects []domain.Project, overwrite bool) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if overwrite {
			// Delete all existing projects
			if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&domain.Project{}).Error; err != nil {
				return err
			}
		}

		for _, p := range projects {
			if err := tx.Save(&p).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

var (
	cleanupStopChan chan struct{}
	cleanupMu       sync.Mutex
)

// CleanupUnusedMedia يقوم بمسح جميع الصور غير المستخدمة في أي مشروع لتوفير مساحة القرص بشكل دوري
func CleanupUnusedMedia() {
	cleanupMu.Lock()
	if cleanupStopChan != nil {
		cleanupMu.Unlock()
		return
	}
	cleanupStopChan = make(chan struct{})
	cleanupMu.Unlock()

	// تأخير بدء التنظيف لتفادي تعارض الملفات أو مسح ملفات مرفوعة حديثاً قبل حفظ مسودتها
	select {
	case <-time.After(15 * time.Second):
	case <-cleanupStopChan:
		return
	}

	// التنظيف الأول عند بدء التشغيل
	runCleanupMedia()

	// إطلاق مؤقت دوري كل 1 ساعة لتنظيف الخلفية بدون تجميد
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			runCleanupMedia()
		case <-cleanupStopChan:
			return
		}
	}
}

// StopCleanupUnusedMedia يقوم بإيقاف الخلفية بشكل آمن عند إغلاق التطبيق
func StopCleanupUnusedMedia() {
	cleanupMu.Lock()
	defer cleanupMu.Unlock()
	if cleanupStopChan != nil {
		close(cleanupStopChan)
		cleanupStopChan = nil
	}
}

type elementJSONStruct struct {
	ImageSrc         string `json:"imageSrc"`
	OriginalImageSrc string `json:"originalImageSrc"`
}

type slotJSONStruct struct {
	ImageSrc string `json:"imageSrc"`
}

// collectImageFilenames منطق مساعد مشترك لتجميع أسماء الملفات لتجنب التكرار (DRY)
func collectImageFilenames(elementsStr, slotsStr string, referenced map[string]bool) {
	if elementsStr != "" {
		var elems []elementJSONStruct
		if err := json.Unmarshal([]byte(elementsStr), &elems); err == nil {
			for _, el := range elems {
				if el.ImageSrc != "" {
					filename := filepath.Base(filepath.Clean(el.ImageSrc))
					referenced[filename] = true
				}
				if el.OriginalImageSrc != "" {
					filename := filepath.Base(filepath.Clean(el.OriginalImageSrc))
					referenced[filename] = true
				}
			}
		}
	}
	if slotsStr != "" {
		var slots []slotJSONStruct
		if err := json.Unmarshal([]byte(slotsStr), &slots); err == nil {
			for _, slot := range slots {
				if slot.ImageSrc != "" {
					filename := filepath.Base(filepath.Clean(slot.ImageSrc))
					referenced[filename] = true
				}
			}
		}
	}
}

// collectReferencedImages يجمع كل الصور المشار إليها في المشاريع وقاعدة البيانات ومسودة autosave.json
func collectReferencedImages(projects []domain.Project, appDir string) map[string]bool {
	referencedImages := make(map[string]bool)

	// 1. فحص مسارات الصور في المشاريع المحفوظة بقاعدة البيانات
	for _, p := range projects {
		collectImageFilenames(string(p.Elements), string(p.Slots), referencedImages)
	}

	// 2. فحص مسار الصورة في مسودة التخزين التلقائي autosave.json
	autosavePath := filepath.Join(appDir, "autosave.json")
	if autosaveBytes, err := os.ReadFile(autosavePath); err == nil {
		var autosaveData struct {
			Elements []elementJSONStruct `json:"elements"`
			Slots    []slotJSONStruct    `json:"slots"`
		}
		if err := json.Unmarshal(autosaveBytes, &autosaveData); err == nil {
			// تحويل الهياكل الفرعية إلى JSON string لإعادة استخدام دالة collectImageFilenames
			elemsBytes, _ := json.Marshal(autosaveData.Elements)
			slotsBytes, _ := json.Marshal(autosaveData.Slots)
			collectImageFilenames(string(elemsBytes), string(slotsBytes), referencedImages)
		}
	}

	return referencedImages
}

// moveUnreferencedToTrash ينقل الملفات غير المشار إليها إلى الحجر الصحي (MediaTrash)
func moveUnreferencedToTrash(mediaDir, trashDir string, referenced map[string]bool) {
	files, err := os.ReadDir(mediaDir)
	if err != nil {
		return
	}

	_ = os.MkdirAll(trashDir, 0755)

	for _, f := range files {
		if f.IsDir() {
			continue
		}

		// تخطي الملفات المعدلة في آخر 15 دقيقة لتجنب نقل الملفات التي لم تحفظ بعد
		if info, err := f.Info(); err == nil {
			if time.Since(info.ModTime()) < 15*time.Minute {
				continue
			}
		}

		filename := f.Name()
		if !referenced[filename] {
			filePath := filepath.Join(mediaDir, filename)
			trashPath := filepath.Join(trashDir, filename)
			_ = os.Rename(filePath, trashPath)
		}
	}
}

// purgeOldTrash يحذف الملفات القديمة التي مضى عليها أكثر من 24 ساعة من الحجر الصحي
func purgeOldTrash(trashDir string) {
	trashFiles, err := os.ReadDir(trashDir)
	if err != nil {
		return
	}

	for _, f := range trashFiles {
		if f.IsDir() {
			continue
		}
		if info, err := f.Info(); err == nil {
			if time.Since(info.ModTime()) > 24*time.Hour {
				_ = os.Remove(filepath.Join(trashDir, f.Name()))
			}
		}
	}
}

func runCleanupMedia() {
	dbMu.RLock()
	db := dbInstance
	dbMu.RUnlock()

	if db == nil {
		return
	}

	var projects []domain.Project
	if err := db.Select("elements, slots").Find(&projects).Error; err != nil {
		return
	}

	appDir := utils.GetAppDir()
	mediaDir := filepath.Join(appDir, "Media")
	trashDir := filepath.Join(appDir, "MediaTrash")

	referenced := collectReferencedImages(projects, appDir)
	moveUnreferencedToTrash(mediaDir, trashDir, referenced)
	purgeOldTrash(trashDir)
}
