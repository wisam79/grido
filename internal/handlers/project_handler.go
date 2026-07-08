package handlers

import (
	"errors"
	"grido/internal/core/domain"
	"grido/internal/service"
)

type ProjectHandler struct {
	service *service.ProjectService
}

func NewProjectHandler(s *service.ProjectService) *ProjectHandler {
	return &ProjectHandler{service: s}
}

func (h *ProjectHandler) SaveProject(project *domain.Project) (string, error) {
	if project == nil {
		return "", errors.New("project cannot be nil")
	}
	if project.ID == "" {
		return "", errors.New("project ID cannot be empty")
	}
	if project.Name == "" {
		return "", errors.New("project name cannot be empty")
	}
	err := h.service.SaveProject(project)
	if err != nil {
		return "", err
	}
	return "success", nil
}

func (h *ProjectHandler) GetProject(id string) (*domain.Project, error) {
	if id == "" {
		return nil, errors.New("id cannot be empty")
	}
	return h.service.GetProject(id)
}

func (h *ProjectHandler) GetAllProjects() ([]domain.Project, error) {
	return h.service.GetAllProjects()
}

func (h *ProjectHandler) DeleteProject(id string) (string, error) {
	if id == "" {
		return "", errors.New("id cannot be empty")
	}
	err := h.service.DeleteProject(id)
	if err != nil {
		return "", err
	}
	return "success", nil
}
