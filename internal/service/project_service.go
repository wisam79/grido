package service

import (
	"errors"
	"fmt"
	"sync"
	"time"

	"grido/internal/core/domain"

	"gorm.io/gorm"
)

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
	if project.ID == "" {
		return errors.New("project ID cannot be empty")
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
	return s.repo.FindAll()
}

func (s *ProjectService) DeleteProject(id string) error {
	return s.repo.Delete(id)
}
