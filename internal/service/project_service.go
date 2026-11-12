package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"grido/internal/core/domain"

	"gorm.io/gorm"
)

const (
	maxProjectPayloadBytes = 100 * 1024 * 1024
	maxProjectNameBytes    = 512
	maxCanvasDimension     = 100_000
)

func validateProjectPayload(project *domain.Project) error {
	if project == nil {
		return errors.New("project cannot be nil")
	}
	project.ID = strings.TrimSpace(project.ID)
	project.Name = strings.TrimSpace(project.Name)
	if project.ID == "" {
		return errors.New("project ID cannot be empty")
	}
	if len(project.ID) > 256 {
		return errors.New("project ID is too long")
	}
	if len(project.Name) > maxProjectNameBytes {
		return errors.New("project name is too long")
	}
	if project.Mode != "" && project.Mode != "single" && project.Mode != "collage" {
		return errors.New("project mode must be single or collage")
	}
	if (project.CanvasWidth != 0 || project.CanvasHeight != 0) &&
		(project.CanvasWidth <= 0 || project.CanvasHeight <= 0 ||
			project.CanvasWidth > maxCanvasDimension || project.CanvasHeight > maxCanvasDimension) {
		return errors.New("project canvas dimensions are invalid")
	}
	fields := []struct {
		name  string
		value domain.JSONText
	}{
		{"elements", project.Elements}, {"slots", project.Slots}, {"template", project.Template},
		{"collageTemplate", project.CollageTemplate}, {"printSettings", project.PrintSettings},
		{"editorState", project.EditorState}, {"userGuides", project.UserGuides},
	}
	total := 0
	for _, field := range fields {
		total += len(field.value)
		trimmed := strings.TrimSpace(string(field.value))
		if trimmed != "" && trimmed != "null" && !json.Valid([]byte(trimmed)) {
			return fmt.Errorf("project %s is not valid JSON", field.name)
		}
	}
	if total > maxProjectPayloadBytes {
		return errors.New("project payload exceeds the 100MB limit")
	}
	return nil
}

type ProjectService struct {
	repo        domain.ProjectRepository
	licenseRepo domain.LicenseRepository
	// 🛡️ saveMu (SEC-09): يسلسل فحص حد الخطة المجانية مع الحفظ — Wails v3 ينفّذ
	// كل binding في goroutine مستقلة، ونداءان متزامنان لـ SaveProject كانا يقرآن
	// Count() فيمرّان كلاهما من الفحص (TOCTOU) فيولّدان مشروعاً رابعاً في الخطة
	// المجانية. القفل على نقطة الدخول فقط — لا مساعدات داخلية تُقفل (sync.Mutex
	// غير قابل لإعادة الدخول).
	saveMu sync.Mutex
}

func NewProjectService(repo domain.ProjectRepository, licenseRepo domain.LicenseRepository) *ProjectService {
	return &ProjectService{repo: repo, licenseRepo: licenseRepo}
}

func (s *ProjectService) SaveProject(project *domain.Project) error {
	if err := validateProjectPayload(project); err != nil {
		return err
	}
	if project.Name == "" {
		project.Name = "مشروع بدون عنوان"
	}
	project.UpdatedAt = time.Now()

	// 🛡️ (SEC-09) القسم الحرج: فحص الوجود + حد الخطة + الحفظ ذرية تحت القفل —
	// أي فحص حدٍّ خارج القفل قابل للتسابق مع حفظٍ متوازٍ.
	s.saveMu.Lock()
	defer s.saveMu.Unlock()

	// Check if project already exists to determine if it is new and preserve CreatedAt
	// 🛡️ (SEC-09) «جديد» يعني فقط عدم الوجود فعلاً (gorm.ErrRecordNotFound) —
	// أي خطأ قاعدة عابر آخر كان يُعامَل كمشروع جديد فيتخطى حد الخطة المجانية
	// عند فشل الاستعلام؛ يُعاد الخطأ للمستخدم بدل التجاوز الصامت.
	existing, findErr := s.repo.FindByID(project.ID)
	isNew := errors.Is(findErr, gorm.ErrRecordNotFound)
	if findErr != nil && !isNew {
		return fmt.Errorf("failed to look up project %s: %w", project.ID, findErr)
	}
	if !isNew && existing == nil {
		isNew = true // دفاعي: مستودع قد يرجع (nil, nil) — اعتبره جديداً
	}

	// Check licensing limits
	profile, err := s.licenseRepo.Get()
	isFree := true
	if err == nil && profile != nil {
		isFree = !profile.IsEntitled()
	}

	if isFree && isNew {
		count, err := s.repo.Count()
		if err == nil && count >= 3 {
			return errors.New("لقد تجاوزت الحد الأقصى للمشاريع في الخطة المجانية (3 مشاريع). يرجى تسجيل حساب لتفعيل الفترة التجريبية (7 أيام) أو الترقية لباقة Pro")
		}
	}

	// Preserve CreatedAt on update, set it on insert
	if !isNew {
		project.CreatedAt = existing.CreatedAt
	} else {
		if project.CreatedAt.IsZero() {
			project.CreatedAt = project.UpdatedAt
		}
	}

	return s.repo.Save(project)
}

func (s *ProjectService) GetProject(id string) (*domain.Project, error) {
	return s.repo.FindByID(id)
}

func (s *ProjectService) GetAllProjects() ([]domain.Project, error) {
	// قائمة المكتبة لا تحتاج أعمدة JSON الثقيلة؛ نستخدم الملخّص إن توفّر،
	// ونبقى متوافقين مع أي تنفيذ للمستودع لا يوفّره (بما فيها بدائل الاختبار).
	if summaries, ok := s.repo.(interface {
		FindAllSummaries() ([]domain.Project, error)
	}); ok {
		return summaries.FindAllSummaries()
	}
	return s.repo.FindAll()
}

func (s *ProjectService) DeleteProject(id string) error {
	return s.repo.Delete(id)
}
