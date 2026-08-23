package service

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

// AutosaveService يدير مسودة الحفظ التلقائي على القرص وعمليات CRUD للقوالب المخصصة.
//
// أمان التزامن: Wails يستدعي كل دالة مُعرّضة في goroutine مستقلة، لذا فإن
// كتابتين متداخلتين على نفس مسار autosave.json.tmp قد تتداخلان (كتابة جزئية
// ثم rename ببيانات تالفة). writeMu يسلسل دورة الكتابة كاملة
// (create → write → fsync → rename) لضمان الذرية.
type AutosaveService struct {
	templates domain.CustomTemplateRepository
	writeMu   sync.Mutex
}

func NewAutosaveService(templates domain.CustomTemplateRepository) *AutosaveService {
	return &AutosaveService{templates: templates}
}

func (s *AutosaveService) GetSavePath() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "autosave.json")
}

func (s *AutosaveService) SaveCustomTemplate(name string, slots int, cellsJSON string) (domain.CustomTemplate, error) {
	tmpl := domain.CustomTemplate{
		Name:  name,
		Slots: slots,
		Cells: domain.JSONText(cellsJSON),
	}
	err := s.templates.Create(&tmpl)
	return tmpl, err
}

func (s *AutosaveService) GetCustomTemplates() ([]domain.CustomTemplate, error) {
	return s.templates.FindAll()
}

func (s *AutosaveService) DeleteCustomTemplate(id uint) error {
	return s.templates.Delete(id)
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

	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	path := s.GetSavePath()
	tmpPath := path + ".tmp"

	defer os.Remove(tmpPath)

	f, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to create tmp autosave file: %w", err)
	}
	if _, err := f.Write([]byte(jsonData)); err != nil {
		f.Close()
		return fmt.Errorf("failed to write tmp autosave file: %w", err)
	}
	if err := f.Sync(); err != nil {
		f.Close()
		return fmt.Errorf("failed to sync tmp autosave file: %w", err)
	}
	f.Close()

	return os.Rename(tmpPath, path)
}

func (s *AutosaveService) ClearAutoSave() error {
	s.writeMu.Lock()
	defer s.writeMu.Unlock()

	path := s.GetSavePath()
	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
