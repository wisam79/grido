package repository

import (
	"encoding/json"
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

	// ⚡ Enable WAL (Write-Ahead Logging) mode, busy timeout and foreign keys
	_, _ = sqlDB.Exec("PRAGMA journal_mode=WAL;")
	_, _ = sqlDB.Exec("PRAGMA busy_timeout=5000;")
	_, _ = sqlDB.Exec("PRAGMA foreign_keys=ON;")

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

// CleanupUnusedMedia يقوم بمسح جميع الصور غير المستخدمة في أي مشروع لتوفير مساحة القرص بشكل دوري
func CleanupUnusedMedia() {
	// تأخير بدء التنظيف لتفادي تعارض الملفات أو مسح ملفات مرفوعة حديثاً قبل حفظ مسودتها
	time.Sleep(15 * time.Second)

	// التنظيف الأول عند بدء التشغيل
	runCleanupMedia()

	// إطلاق مؤقت دوري كل 1 ساعة لتنظيف الخلفية بدون تجميد
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			runCleanupMedia()
		}
	}()
}

type elementJSONStruct struct {
	ImageSrc string `json:"imageSrc"`
}

type slotJSONStruct struct {
	ImageSrc string `json:"imageSrc"`
}

func runCleanupMedia() {
	dbMu.RLock()
	db := dbInstance
	dbMu.RUnlock()

	if db == nil {
		return
	}

	var projects []domain.Project
	if err := db.Find(&projects).Error; err != nil {
		return
	}

	appDir := utils.GetAppDir()
	mediaDir := filepath.Join(appDir, "Media")
	files, err := os.ReadDir(mediaDir)
	if err != nil {
		return
	}

	// تجميع مسارات كافة الصور المستخدمة في المشاريع الحالية والمسودات
	referencedImages := make(map[string]bool)

	// 1. فحص مسارات الصور في المشاريع المحفوظة بقاعدة البيانات
	for _, p := range projects {
		var elems []elementJSONStruct
		if err := json.Unmarshal([]byte(p.Elements), &elems); err == nil {
			for _, el := range elems {
				if el.ImageSrc != "" {
					filename := filepath.Base(filepath.Clean(el.ImageSrc))
					referencedImages[filename] = true
				}
			}
		}
		var slots []slotJSONStruct
		if err := json.Unmarshal([]byte(p.Slots), &slots); err == nil {
			for _, slot := range slots {
				if slot.ImageSrc != "" {
					filename := filepath.Base(filepath.Clean(slot.ImageSrc))
					referencedImages[filename] = true
				}
			}
		}
	}

	// 2. فحص مسار الصورة في مسودة التخزين التلقائي autosave.json
	autosavePath := filepath.Join(appDir, "autosave.json")
	if autosaveBytes, err := os.ReadFile(autosavePath); err == nil {
		var autosaveData struct {
			Elements []elementJSONStruct `json:"elements"`
			Slots    []slotJSONStruct    `json:"slots"`
		}
		if err := json.Unmarshal(autosaveBytes, &autosaveData); err == nil {
			for _, el := range autosaveData.Elements {
				if el.ImageSrc != "" {
					filename := filepath.Base(filepath.Clean(el.ImageSrc))
					referencedImages[filename] = true
				}
			}
			for _, slot := range autosaveData.Slots {
				if slot.ImageSrc != "" {
					filename := filepath.Base(filepath.Clean(slot.ImageSrc))
					referencedImages[filename] = true
				}
			}
		}
	}

	// 3. إنشاء مجلد الحجر الصحي إذا لم يكن موجوداً
	trashDir := filepath.Join(appDir, "MediaTrash")
	_ = os.MkdirAll(trashDir, 0755)

	// 4. نقل الملفات غير المشار إليها إلى الحجر الصحي (MediaTrash)
	for _, f := range files {
		if f.IsDir() {
			continue
		}

		// تخطي الملفات المعدلة في آخر 15 دقيقة لتجنب النقل الخاطئ للملفات التي لم تحفظ بعد
		if info, err := f.Info(); err == nil {
			if time.Since(info.ModTime()) < 15*time.Minute {
				continue
			}
		}

		filename := f.Name()
		if !referencedImages[filename] {
			filePath := filepath.Join(mediaDir, filename)
			trashPath := filepath.Join(trashDir, filename)
			_ = os.Rename(filePath, trashPath)
		}
	}

	// 5. مسح الملفات الموجودة في الحجر الصحي منذ أكثر من 24 ساعة
	trashFiles, err := os.ReadDir(trashDir)
	if err == nil {
		for _, f := range trashFiles {
			if f.IsDir() {
				continue
			}
			if info, err := f.Info(); err == nil {
				// إذا مر 24 ساعة على آخر تعديل للصورة (والذي يمثل غالباً وقت إضافتها)
				if time.Since(info.ModTime()) > 24*time.Hour {
					_ = os.Remove(filepath.Join(trashDir, f.Name()))
				}
			}
		}
	}
}
