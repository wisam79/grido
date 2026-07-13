package service

import (
	"encoding/json"
	"fmt"
	"grido/internal/core/domain"
)

type BackupService struct {
	repo        domain.ProjectRepository
	licenseRepo domain.LicenseRepository
}

func NewBackupService(repo domain.ProjectRepository, licenseRepo domain.LicenseRepository) *BackupService {
	return &BackupService{repo: repo, licenseRepo: licenseRepo}
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

	// Check licensing limits
	profile, err := s.licenseRepo.Get()
	isFree := true
	if err == nil && profile != nil {
		isFree = !profile.IsEntitled()
	}

	if isFree {
		existingCount := 0
		if mode == "merge" {
			existingProjects, _ := s.repo.FindAll()
			uniqueProjects := make(map[string]bool)
			for _, p := range existingProjects {
				uniqueProjects[p.ID] = true
			}
			for _, p := range projects {
				uniqueProjects[p.ID] = true
			}
			existingCount = len(uniqueProjects)
		} else {
			existingCount = len(projects)
		}

		if existingCount > 3 {
			return fmt.Errorf("لقد تجاوزت الحد الأقصى للمشاريع في الخطة المجانية (3 مشاريع). يرجى الترقية لباقة Pro للاستيراد.")
		}
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
