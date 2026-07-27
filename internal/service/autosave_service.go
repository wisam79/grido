package service

import (
	"fmt"
	"os"
	"path/filepath"

	"grido/internal/core/domain"
	"grido/internal/repository"
	"grido/internal/utils"
)

type AutosaveService struct{}

func NewAutosaveService() *AutosaveService {
	return &AutosaveService{}
}

func (s *AutosaveService) GetSavePath() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "autosave.json")
}

func (s *AutosaveService) SaveCustomTemplate(name string, slots int, cellsJSON string) (domain.CustomTemplate, error) {
	db, err := repository.InitDB()
	if err != nil {
		return domain.CustomTemplate{}, err
	}
	tmpl := domain.CustomTemplate{
		Name:  name,
		Slots: slots,
		Cells: domain.JSONText(cellsJSON),
	}
	result := db.Create(&tmpl)
	return tmpl, result.Error
}

func (s *AutosaveService) GetCustomTemplates() ([]domain.CustomTemplate, error) {
	db, err := repository.InitDB()
	if err != nil {
		return nil, err
	}
	var templates []domain.CustomTemplate
	result := db.Find(&templates)
	return templates, result.Error
}

func (s *AutosaveService) DeleteCustomTemplate(id uint) error {
	db, err := repository.InitDB()
	if err != nil {
		return err
	}
	result := db.Delete(&domain.CustomTemplate{}, id)
	return result.Error
}

func (s *AutosaveService) LoadAutoSave() (string, error) {
	path := s.GetSavePath()
	bytes, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return string(bytes), nil
}

func (s *AutosaveService) SaveAutoSave(jsonData string) error {
	if len(jsonData) > 100*1024*1024 { // 100MB limit
		return fmt.Errorf("autosave payload too large: %d bytes (limit 100MB)", len(jsonData))
	}
	path := s.GetSavePath()
	tmpPath := path + ".tmp"

	defer os.Remove(tmpPath)

	if err := os.WriteFile(tmpPath, []byte(jsonData), 0644); err != nil {
		return fmt.Errorf("failed to write tmp autosave file: %w", err)
	}
	return os.Rename(tmpPath, path)
}

func (s *AutosaveService) ClearAutoSave() error {
	path := s.GetSavePath()
	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
