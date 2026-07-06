package repository

import (
	"os"
	"path/filepath"
	"strings"
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

// CleanupUnusedMedia يقوم بمسح جميع الصور غير المستخدمة في أي مشروع لتوفير مساحة القرص
func CleanupUnusedMedia() {
	// تأخير بدء التنظيف لتفادي تعارض الملفات أو مسح ملفات مرفوعة حديثاً قبل حفظ مسودتها
	time.Sleep(15 * time.Second)

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

	autosavePath := filepath.Join(appDir, "autosave.json")
	autosaveBytes, _ := os.ReadFile(autosavePath)
	autosaveContent := string(autosaveBytes)

	for _, f := range files {
		if f.IsDir() {
			continue
		}
		filename := f.Name()
		
		// Create strict match strings to avoid substring issues inside JSON
		q1 := `"` + filename + `"`
		q2 := `\"` + filename + `\"`

		isReferenced := false
		
		// 1. Check in autosave.json
		if strings.Contains(autosaveContent, q1) || strings.Contains(autosaveContent, q2) {
			isReferenced = true
		} else {
			// 2. Check in saved projects
			for _, p := range projects {
				if strings.Contains(p.Elements, q1) || strings.Contains(p.Elements, q2) || 
				   strings.Contains(p.Slots, q1) || strings.Contains(p.Slots, q2) {
					isReferenced = true
					break
				}
			}
		}

		if !isReferenced {
			filePath := filepath.Join(mediaDir, filename)
			_ = os.Remove(filePath)
		}
	}
}
