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

	// Check licensing limits
	profile, err := s.licenseRepo.Get()
	isFree := true
	if err == nil && profile != nil {
		if profile.Plan == "pro" || profile.Plan == "enterprise" {
			if profile.Status == "active" && time.Now().Before(profile.ExpiresAt) {
				isFree = false
			}
		} else if profile.Plan == "trial" {
			if time.Now().Before(profile.ExpiresAt) {
				isFree = false
			}
		}
	}

	if isFree {
		existingProjects, err := s.repo.FindAll()
		if err == nil {
			isNew := true
			for _, p := range existingProjects {
				if p.ID == project.ID {
					isNew = false
					break
				}
			}
			if isNew && len(existingProjects) >= 3 {
				return errors.New("لقد تجاوزت الحد الأقصى للمشاريع في الخطة المجانية (3 مشاريع). يرجى تسجيل حساب لتفعيل الفترة التجريبية (7 أيام) أو الترقية لباقة Pro.")
			}
		}
	}

	// Preserve CreatedAt on update, set it on insert
	if existing, err := s.repo.FindByID(project.ID); err == nil && existing != nil {
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
