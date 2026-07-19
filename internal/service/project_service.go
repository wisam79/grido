package service

import (
	"errors"
	"grido/internal/core/domain"
	"time"
)

type ProjectService struct {
	repo        domain.ProjectRepository
	licenseRepo domain.LicenseRepository
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

	// Check if project already exists to determine if it is new and preserve CreatedAt
	existing, findErr := s.repo.FindByID(project.ID)
	isNew := findErr != nil || existing == nil

	// Check licensing limits
	profile, err := s.licenseRepo.Get()
	isFree := true
	if err == nil && profile != nil {
		isFree = !profile.IsEntitled()
	}

	if isFree && isNew {
		count, err := s.repo.Count()
		if err == nil && count >= 3 {
			return errors.New("لقد تجاوزت الحد الأقصى للمشاريع في الخطة المجانية (3 مشاريع). يرجى تسجيل حساب لتفعيل الفترة التجريبية (7 أيام) أو الترقية لباقة Pro.")
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
