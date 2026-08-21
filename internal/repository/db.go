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
	dbStopPing chan struct{}
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
		{"PRAGMA wal_autocheckpoint=1000;", "wal_autocheckpoint=1000"},
		{"PRAGMA mmap_size=268435456;", "mmap_size=268435456"},
	}

	for _, pragma := range pragmas {
		if _, err := sqlDB.Exec(pragma.query); err != nil {
			slog.Warn("Failed to execute SQLite PRAGMA", "pragma", pragma.name, "error", err)
		}
	}

	// SQLite serializes writes even in WAL mode. Allowing unlimited connections
	// causes "database is locked" errors when the background cleanup goroutine,
	// project saves, and license checks write concurrently. A single writer
	// connection with a pool of idle readers avoids lock contention while still
	// permitting concurrent reads under WAL.
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(2)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// إضافة healthcheck دوري للاتصال بقاعدة البيانات مع إمكانية التوقف النظيف
	dbStopPing = make(chan struct{})
	go func(stopCh <-chan struct{}) {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if sqlDB.Ping() != nil {
					slog.Error("Database connection lost")
				}
			case <-stopCh:
				return
			}
		}
	}(dbStopPing)

	// الهجرة التلقائية لجداول قاعدة البيانات
	err = db.AutoMigrate(&domain.Project{}, &domain.UserProfile{}, &domain.CustomTemplate{})
	if err != nil {
		return nil, err
	}

	dbInstance = db
	return dbInstance, nil
}

func CloseDB() error {
	dbMu.Lock()
	defer dbMu.Unlock()

	if dbStopPing != nil {
		close(dbStopPing)
		dbStopPing = nil
	}

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

type licenseRepositoryImpl struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) domain.ProjectRepository {
	return &projectRepositoryImpl{db: db}
}

func NewLicenseRepository(db *gorm.DB) domain.LicenseRepository {
	return &licenseRepositoryImpl{db: db}
}

func (r *licenseRepositoryImpl) Save(profile *domain.UserProfile) error {
	// Token and RefreshToken have gorm:"-" so GORM never persists them to the DB.
	// The previous code mutated profile.Token on a shared pointer to blank it before
	// saving, which was racy when two goroutines called Save concurrently on the same
	// profile. That mutation is unnecessary because GORM already ignores the field.
	err := r.db.Save(profile).Error

	if err == nil {
		if saveErr := utils.SaveEncryptedToken(profile.Token, profile.RefreshToken); saveErr != nil {
			slog.Error("Failed to save encrypted token", "error", saveErr)
		}
		if signErr := utils.SaveLicenseSignature(profile); signErr != nil {
			slog.Error("Failed to save license signature", "error", signErr)
		}
		if timeErr := utils.UpdateLastTime(time.Now()); timeErr != nil {
			slog.Error("Failed to update last time", "error", timeErr)
		}
	}
	return err
}

func (r *licenseRepositoryImpl) Get() (*domain.UserProfile, error) {
	var profile domain.UserProfile
	err := r.db.First(&profile).Error
	if err != nil {
		return nil, err
	}

	// Load token from secure storage
	token, refreshToken, kerr := utils.LoadEncryptedToken()
	if kerr == nil {
		profile.Token = token
		profile.RefreshToken = refreshToken
	}

	// Verify signature to prevent SQLite tampering
	if !utils.VerifyLicenseSignature(&profile) {
		slog.Warn("License signature verification failed: Local profile tampered!")
		profile.Plan = "free"
		profile.Status = "expired"
	}

	// Verify system time to prevent clock rollback
	if !utils.VerifyTime(time.Now()) {
		slog.Warn("System clock rollback detected!")
		profile.Plan = "free"
		profile.Status = "expired"
	} else {
		_ = utils.UpdateLastTime(time.Now())
	}

	return &profile, nil
}

func (r *licenseRepositoryImpl) Clear() error {
	_ = utils.ClearEncryptedToken()
	_ = utils.ClearLicenseSignature()
	return r.db.Where("1 = 1").Delete(&domain.UserProfile{}).Error
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

func (r *projectRepositoryImpl) Count() (int64, error) {
	var count int64
	err := r.db.Model(&domain.Project{}).Count(&count).Error
	return count, err
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
			if len(projects) > 0 {
				return tx.CreateInBatches(&projects, 50).Error
			}
			return nil
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
	defer func() {
		if r := recover(); r != nil {
			slog.Error("Recovered from panic in CleanupUnusedMedia background task", "error", r)
		}
	}()

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
	ImageSrc         string `json:"imageSrc"`
	OriginalImageSrc string `json:"originalImageSrc"`
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
				if slot.OriginalImageSrc != "" {
					filename := filepath.Base(filepath.Clean(slot.OriginalImageSrc))
					referenced[filename] = true
				}
			}
		}
	}
}

// collectReferencedImages يجمع كل الصور المشار إليها في المشاريع وقاعدة البيانات ومسودة autosave.json
func collectReferencedImages(projects []domain.Project, appDir string) (map[string]bool, error) {
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
			elemsBytes, _ := json.Marshal(autosaveData.Elements)
			slotsBytes, _ := json.Marshal(autosaveData.Slots)
			collectImageFilenames(string(elemsBytes), string(slotsBytes), referencedImages)
		} else {
			slog.Warn("Corrupt autosave.json encountered, skipping for cleanup", "error", err)
		}
	}

	// 3. فحص مسارات الصور في القوالب المخصصة المحفوظة بقاعدة البيانات لمنع مسح أصول القوالب
	dbMu.RLock()
	currentDB := dbInstance
	dbMu.RUnlock()

	if currentDB != nil {
		var templates []domain.CustomTemplate
		if err := currentDB.Find(&templates).Error; err == nil {
			for _, t := range templates {
				collectImageFilenames("", string(t.Cells), referencedImages)
			}
		}
	}

	return referencedImages, nil
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

		filename := f.Name()
		filePath := filepath.Join(mediaDir, filename)
		// نقل الملفات غير المشار إليها والتي مضى عليها أكثر من 7 أيام للحجر الصحي (حماية ملفات المشاريع المستقلة)
		info, err := os.Stat(filePath)
		if err != nil || time.Since(info.ModTime()) < 7*24*time.Hour {
			continue
		}

		if !referenced[filename] {
			trashPath := filepath.Join(trashDir, filename)
			if err := os.Rename(filePath, trashPath); err != nil {
				slog.Error("Failed to move file to trash", "src", filePath, "dst", trashPath, "error", err)
			}
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
		filePath := filepath.Join(trashDir, f.Name())
		if info, err := os.Stat(filePath); err == nil {
			if time.Since(info.ModTime()) > 30*24*time.Hour {
				_ = os.Remove(filePath)
			}
		}
	}
}

func runCleanupMedia() {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("Recovered from panic in runCleanupMedia execution", "error", r)
		}
	}()

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

	referenced, err := collectReferencedImages(projects, appDir)
	if err != nil {
		slog.Error("Failed to collect referenced images (autosave might be corrupt), aborting cleanup to prevent data loss", "error", err)
		return
	}
	moveUnreferencedToTrash(mediaDir, trashDir, referenced)
	purgeOldTrash(trashDir)
}
