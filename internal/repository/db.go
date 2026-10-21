package repository

import (
	"log/slog"
	"path/filepath"
	"sync"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	// project saves, and license checks write concurrently. A single connection
	// avoids lock contention (MaxIdle لا يجوز أن يتجاوز MaxOpen — كان 2 وهو مضلل).
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	// إضافة healthcheck دوري للاتصال بقاعدة البيانات مع إمكانية التوقف النظيف
	dbStopPing = make(chan struct{})
	stopPing := dbStopPing // ربط لحظة الإنشاء: لا يتأثر بإعادة تهيئة القناة
	utils.SafeGo("repository.db-healthcheck", func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if sqlDB.Ping() != nil {
					slog.Error("Database connection lost")
				}
			case <-stopPing:
				return
			}
		}
	})

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

	// 🗄️ دمج وتفريغ سجل الـ WAL بالكامل إلى ملف .db وتصفير حجمه قبل الإغلاق لمنع تضخم الملفات على القرص
	_, _ = sqlDB.Exec("PRAGMA wal_checkpoint(TRUNCATE);")

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

type customTemplateRepositoryImpl struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) domain.ProjectRepository {
	return &projectRepositoryImpl{db: db}
}

func NewLicenseRepository(db *gorm.DB) domain.LicenseRepository {
	return &licenseRepositoryImpl{db: db}
}

func NewCustomTemplateRepository(db *gorm.DB) domain.CustomTemplateRepository {
	return &customTemplateRepositoryImpl{db: db}
}

func (r *customTemplateRepositoryImpl) Create(tmpl *domain.CustomTemplate) error {
	return r.db.Create(tmpl).Error
}

func (r *customTemplateRepositoryImpl) FindAll() ([]domain.CustomTemplate, error) {
	var templates []domain.CustomTemplate
	err := r.db.Find(&templates).Error
	return templates, err
}

func (r *customTemplateRepositoryImpl) Delete(id uint) error {
	return r.db.Delete(&domain.CustomTemplate{}, id).Error
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
		if signErr := SaveLicenseSignature(profile); signErr != nil {
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
	if !VerifyLicenseSignature(&profile) {
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
	_ = ClearLicenseSignature()
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

		// دمج دُفعي واحد (upsert) بدل حفظ صف-صف — نفس نمط overwrite أعلاه
		if len(projects) > 0 {
			return tx.Clauses(clause.OnConflict{UpdateAll: true}).CreateInBatches(&projects, 50).Error
		}
		return nil
	})
}
