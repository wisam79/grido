package repository

import (
	"database/sql"
	"fmt"
	"log/slog"
	"path/filepath"
	"sync"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"

	sqlite3 "github.com/mattn/go-sqlite3"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// gridoSQLiteDriverName اسم السائق المسجل محلياً في database/sql: غلاف فوق
// سائق mattn/go-sqlite3 (السائق المثبت في go.mod: gorm.io/driver/sqlite v1.6.0
// الذي يعتمد github.com/mattn/go-sqlite3 v1.14.48) يطبق PRAGMAs الخاصة بالاتصال
// غير القابلة للتمرير عبر DSN على كل اتصال جديد — بدل تطبيقها مرة واحدة على
// اتصال يُستبدل كل 5 دقائق (ConnMaxLifetime) فتضيع على البديل.
const gridoSQLiteDriverName = "grido-sqlite3"

// connectionOnlyPragmas PRAGMAs لكل اتصال لا يدعم سائق go-sqlite3 v1.14.48
// تمريرها عبر معاملات DSN (المفحوص في مصدر السائق: المعاملات المدعومة
// _journal_mode و_foreign_keys و_cache_size و_busy_timeout و_synchronous —
// ولا وجود لمعامل عام _pragma ولا لـ _temp_store/_mmap_size). يطبقها
// ConnectHook على كل اتصال جديد، وفشلها يفشل فتح الاتصال (fail-fast).
var connectionOnlyPragmas = []string{
	"PRAGMA temp_store=MEMORY;",
	"PRAGMA mmap_size=268435456;",
}

// pragmaDriver غلاف سائق يضيف ConnectHook ينفذ connectionOnlyPragmas فوق
// SQLiteDriver الأصلي — آلية ConnectHook مدعومة أصلياً في go-sqlite3 وتُستدعى
// لكل اتصال جديد داخل SQLiteDriver.Open.
type pragmaDriver struct {
	sqlite3.SQLiteDriver
}

func newPragmaDriver() *pragmaDriver {
	return &pragmaDriver{SQLiteDriver: sqlite3.SQLiteDriver{
		ConnectHook: func(conn *sqlite3.SQLiteConn) error {
			for _, pragma := range connectionOnlyPragmas {
				if _, err := conn.Exec(pragma, nil); err != nil {
					return fmt.Errorf("apply %q on new sqlite connection: %w", pragma, err)
				}
			}
			return nil
		},
	}}
}

var registerGridoSQLiteDriverOnce sync.Once

// registerGridoSQLiteDriver يسجل غلاف السائق مرة واحدة لكل عملية (sql.Register
// يعمل panic عند إعادة تسجيل الاسم نفسه)
func registerGridoSQLiteDriver() {
	registerGridoSQLiteDriverOnce.Do(func() {
		sql.Register(gridoSQLiteDriverName, newPragmaDriver())
	})
}

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

	// ⚡ PRAGMAs الأداء تُعاد الآن على كل اتصال جديد (الـpool يستبدل الاتصال كل
	// 5 دقائق عبر ConnMaxLifetime):
	//   - عبر DSN (مدعومة أصلياً في go-sqlite3 v1.14.48 وتُطبق لكل اتصال):
	//     _journal_mode=WAL (دائم في ملف القاعدة لكنه يضبط القواعد الجديدة
	//     فور إنشائها) و_foreign_keys=1 و_cache_size=-8000.
	//   - عبر غلاف السائق أعلاه: temp_store=MEMORY وmmap_size=268435456
	//     (لا يدعمهما DSN في هذه النسخة من السائق).
	//   - افتراضيات السائق المطابقة للسلوك السابق بلا تمرير: busy_timeout=5000
	//     وsynchronous=NORMAL (يضبطهما السائق ذاته لكل اتصال)، و
	//     wal_autocheckpoint=1000 هو افتراضي SQLite أصلاً فأُسقط من التهيئة
	//     اليدوية دون تغيير سلوك.
	dsn := dbPath + "?_journal_mode=WAL&_foreign_keys=1&_cache_size=-8000"

	registerGridoSQLiteDriver()
	db, err := gorm.Open(sqlite.New(sqlite.Config{DriverName: gridoSQLiteDriverName, DSN: dsn}), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
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

// FindAllSummaries يجلب بيانات المكتبة الخفيفة فقط (بلا أعمدة JSON الثقيلة:
// العناصر/الخانات/القوالب/إعدادات الطباعة) لشاشة قائمة المشاريع. التحميل
// الفعلي يمرّ بـ FindByID، فالنقل عبر IPC لا يدفع حجم كل مشروع في المكتبة.
func (r *projectRepositoryImpl) FindAllSummaries() ([]domain.Project, error) {
	var projects []domain.Project
	err := r.db.
		Select(
			"ID",
			"Name",
			"Mode",
			"CanvasWidth",
			"CanvasHeight",
			"BackgroundColor",
			"BackgroundGradientColor2",
			"BackgroundGradientAngle",
			"CreatedAt",
			"UpdatedAt",
		).
		Order("updated_at desc").
		Find(&projects).Error
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
