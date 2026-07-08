package service

import (
	"encoding/json"
	"fmt"
	"grido/internal/core/domain"
)

type BackupService struct {
	repo domain.ProjectRepository
}

func NewBackupService(repo domain.ProjectRepository) *BackupService {
	return &BackupService{repo: repo}
}

// ExportBackup retrieves all projects and returns them serialized in JSON format
func (s *BackupService) ExportBackup() (string, error) {
	projects, err := s.repo.FindAll()
	if err != nil {
		return "", fmt.Errorf("failed to retrieve projects for backup: %w", err)
	}

	bytes, err := json.MarshalIndent(projects, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal projects to JSON: %w", err)
	}

	return string(bytes), nil
}

// ImportBackup deserializes the backup JSON and saves projects to database
func (s *BackupService) ImportBackup(jsonData string, mode string) error {
	var projects []domain.Project
	if err := json.Unmarshal([]byte(jsonData), &projects); err != nil {
		return fmt.Errorf("failed to parse backup JSON data: %w", err)
	}

	if mode != "merge" && mode != "overwrite" {
		return fmt.Errorf("invalid backup import mode: %q (expected %q or %q)", mode, "merge", "overwrite")
	}

	overwrite := (mode == "overwrite")

	if err := s.repo.ImportProjects(projects, overwrite); err != nil {
		return fmt.Errorf("failed to import projects to repository: %w", err)
	}

	return nil
}

// ResetLibrary deletes all projects from the database
func (s *BackupService) ResetLibrary() error {
	if err := s.repo.ImportProjects([]domain.Project{}, true); err != nil {
		return fmt.Errorf("failed to clear projects library: %w", err)
	}
	return nil
}
