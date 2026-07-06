package service

import (
	"errors"
	"grido/internal/core/domain"
	"time"
)

type ProjectService struct {
	repo domain.ProjectRepository
}

func NewProjectService(repo domain.ProjectRepository) *ProjectService {
	return &ProjectService{repo: repo}
}

func (s *ProjectService) SaveProject(project *domain.Project) error {
	if project.ID == "" {
		return errors.New("project ID cannot be empty")
	}
	if project.Name == "" {
		project.Name = "مشروع بدون عنوان"
	}
	project.UpdatedAt = time.Now()
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
