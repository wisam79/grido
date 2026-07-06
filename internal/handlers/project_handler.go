package handlers

import (
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
	err := h.service.SaveProject(project)
	if err != nil {
		return "", err
	}
	return "success", nil
}

func (h *ProjectHandler) GetProject(id string) (*domain.Project, error) {
	return h.service.GetProject(id)
}

func (h *ProjectHandler) GetAllProjects() ([]domain.Project, error) {
	return h.service.GetAllProjects()
}

func (h *ProjectHandler) DeleteProject(id string) (string, error) {
	err := h.service.DeleteProject(id)
	if err != nil {
		return "", err
	}
	return "success", nil
}
