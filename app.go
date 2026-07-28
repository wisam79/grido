package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"grido/internal/core/domain"
	"grido/internal/service"
	"grido/internal/utils"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"gorm.io/gorm"
)

type App struct {
	ctx         context.Context
	mediaSvc    *service.MediaService
	aiSvc       *service.AIService
	imageProc   *service.ImageProcessorService
	autosaveSvc *service.AutosaveService
}

func NewApp(db *gorm.DB) *App {
	mediaSvc := service.NewMediaService()
	return &App{
		mediaSvc:    mediaSvc,
		aiSvc:       service.NewAIService(),
		imageProc:   service.NewImageProcessorService(mediaSvc),
		autosaveSvc: service.NewAutosaveService(db),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	service.InitLogger()
}

func (a *App) shutdown(_ context.Context) {
	// ... clean up resources ...
}

func (a *App) LogFrontendError(level, message, stackTrace string) {
	if service.GlobalLogger == nil {
		return
	}
	switch level {
	case "info":
		service.GlobalLogger.Info(message, "source", "frontend", "stack", stackTrace)
	case "warn":
		service.GlobalLogger.Warn(message, "source", "frontend", "stack", stackTrace)
	case "error":
		service.GlobalLogger.Error(message, "source", "frontend", "stack", stackTrace)
	default:
		service.GlobalLogger.Error(message, "source", "frontend", "stack", stackTrace)
	}
}

func (a *App) ExportSupportLogs() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("failed to get config dir: %w", err)
	}
	logDir := filepath.Join(configDir, "GridoStudio", "logs")

	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: "grido_support_logs.zip",
		Filters: []runtime.FileFilter{
			{DisplayName: "Zip Files (*.zip)", Pattern: "*.zip"},
		},
		Title: "تصدير سجلات الأخطاء",
	})

	if err != nil || savePath == "" {
		return "", nil // user cancelled
	}

	err = service.ZipDirectory(logDir, savePath)
	if err != nil {
		return "", fmt.Errorf("failed to zip logs: %w", err)
	}

	return savePath, nil
}

var imageFilters = []runtime.FileFilter{
	{DisplayName: "Images (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp)", Pattern: "*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp"},
}

var saveFilters = []runtime.FileFilter{
	{DisplayName: "PNG Image (*.png)", Pattern: "*.png"},
	{DisplayName: "JPEG Image (*.jpg;*.jpeg)", Pattern: "*.jpg;*.jpeg"},
}

func (a *App) OpenFile() (string, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select an Image",
		Filters: imageFilters,
	})
	if err != nil {
		return "", fmt.Errorf("open dialog: %w", err)
	}
	if filePath == "" {
		return "", nil
	}
	return a.mediaSvc.ProcessOpenedFile(filePath)
}

func (a *App) OpenMultipleFiles() ([]string, error) {
	filePaths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select Images",
		Filters: imageFilters,
	})
	if err != nil {
		return nil, fmt.Errorf("open multiple dialog: %w", err)
	}
	if len(filePaths) == 0 {
		return []string{}, nil
	}
	return a.mediaSvc.ProcessMultipleOpenedFiles(filePaths)
}

func (a *App) SaveFile(base64Data string) (string, error) {
	decoded, mimeType, err := a.mediaSvc.DecodeBase64Image(base64Data)
	if err != nil {
		return "", err
	}

	ext := a.mediaSvc.GetExtensionFromMime(mimeType)
	defaultName := "edited_photo" + ext

	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Image",
		DefaultFilename: defaultName,
		Filters:         saveFilters,
	})
	if err != nil {
		return "", fmt.Errorf("save dialog: %w", err)
	}
	if filePath == "" {
		return "", nil
	}

	if err := os.WriteFile(filePath, decoded, 0o644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return "success", nil
}

func (a *App) SaveImageFromBase64(base64Data string) (string, error) {
	return a.mediaSvc.SaveImageFromBase64(base64Data)
}

func (a *App) GetImageDimensions(localPath string) (service.ImageDimensions, error) {
	return a.mediaSvc.GetImageDimensions(localPath)
}

func (a *App) SaveFileDialog(base64Data string, defaultFilename string, displayName string, pattern string) (string, error) {
	var decoded []byte
	var err error

	if strings.HasPrefix(base64Data, "data:") {
		decoded, _, err = a.mediaSvc.DecodeBase64Image(base64Data)
		if err != nil {
			return "", err
		}
	} else {
		decoded = []byte(base64Data)
	}

	if len(decoded) > service.MaxFileSize {
		return "", fmt.Errorf("file size too large: %d bytes (max %d)", len(decoded), service.MaxFileSize)
	}

	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save File",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: displayName, Pattern: pattern},
		},
	})
	if err != nil {
		return "", fmt.Errorf("save dialog: %w", err)
	}
	if filePath == "" {
		return "", nil
	}

	if err := os.WriteFile(filePath, decoded, 0o644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return "success", nil
}

func (a *App) SaveCustomTemplate(name string, slots int, cellsJSON string) (domain.CustomTemplate, error) {
	return a.autosaveSvc.SaveCustomTemplate(name, slots, cellsJSON)
}

func (a *App) GetCustomTemplates() ([]domain.CustomTemplate, error) {
	return a.autosaveSvc.GetCustomTemplates()
}

func (a *App) DeleteCustomTemplate(id uint) error {
	return a.autosaveSvc.DeleteCustomTemplate(id)
}

func (a *App) LoadAutoSave() (string, error) {
	return a.autosaveSvc.LoadAutoSave()
}

func (a *App) SaveAutoSave(jsonData string) error {
	return a.autosaveSvc.SaveAutoSave(jsonData)
}

func (a *App) ClearAutoSave() error {
	return a.autosaveSvc.ClearAutoSave()
}

func (a *App) ApplyMaskToImage(localImagePath string, maskBase64 string, maskW int, maskH int) (string, error) {
	return a.imageProc.ApplyMaskToImage(localImagePath, maskBase64, maskW, maskH)
}

func (a *App) EnhanceImageWithAI(base64Image string, token string, limit int) (string, error) {
	return a.aiSvc.EnhanceImageWithAI(base64Image, token, limit)
}

func (a *App) CheckForUpdate() (*service.UpdateInfo, error) {
	updater := service.NewUpdaterService()
	return updater.CheckForUpdate()
}

func (a *App) DownloadAndInstallUpdate(url string) error {
	updater := service.NewUpdaterService()
	return updater.DownloadAndInstall(a.ctx, url)
}

func (a *App) OpenExportsFolder() error {
	outDir := filepath.Join(utils.GetAppDir(), "Exports")
	_ = os.MkdirAll(outDir, 0755)
	return utils.OpenFolder(outDir)
}
