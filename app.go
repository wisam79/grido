package main

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"grido/internal/core/domain"
	"grido/internal/repository"
	"grido/internal/service"
	"grido/internal/utils"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type App struct {
	ctx            context.Context
	mediaSvc       *service.MediaService
	phoneBridgeSvc *service.PhoneBridgeService
	aiSvc          *service.AIService
	imageProc      *service.ImageProcessorService
	autosaveSvc    *service.AutosaveService
	aiLogsSvc      *service.AiLogsService
	licenseSvc     *service.LicenseService
	desktopSvc     *service.DesktopService
	startupFile    string
}

func NewApp(templates domain.CustomTemplateRepository) *App {
	mediaSvc := service.NewMediaService()
	phoneBridgeSvc := service.NewPhoneBridgeService(mediaSvc)
	desktopSvc := service.NewDesktopService()
	return &App{
		mediaSvc:       mediaSvc,
		phoneBridgeSvc: phoneBridgeSvc,
		aiSvc:          service.NewAIService(),
		imageProc:      service.NewImageProcessorService(mediaSvc),
		autosaveSvc:    service.NewAutosaveService(templates),
		aiLogsSvc:      service.NewAiLogsService(),
		desktopSvc:     desktopSvc,
	}
}

// ServiceStartup يتم استدعاؤها تلقائياً بواسطة Wails v3 عند بدء تشغيل الخدمة
func (a *App) ServiceStartup(ctx context.Context, _ application.ServiceOptions) error {
	a.ctx = ctx
	a.phoneBridgeSvc.SetContext(ctx)
	if a.licenseSvc != nil {
		a.licenseSvc.SetContext(ctx)
	}
	service.InitLogger()
	go service.CleanupTempUpdates()
	return nil
}

// ServiceShutdown يتم استدعاؤها تلقائياً بواسطة Wails v3 عند إغلاق التطبيق
func (a *App) ServiceShutdown() error {
	if a.phoneBridgeSvc != nil {
		_ = a.phoneBridgeSvc.Stop()
	}
	return nil
}

func (a *App) Startup(ctx context.Context) {
	_ = a.ServiceStartup(ctx, application.ServiceOptions{})
}

func (a *App) Shutdown(ctx context.Context) {
	_ = a.ServiceShutdown()
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
	appDir := utils.GetAppDir()
	logDir := filepath.Join(appDir, "logs")

	d := application.Get().Dialog.SaveFile()
	d.SetMessage("تصدير سجلات الأخطاء")
	d.SetFilename("grido_support_logs.zip")
	d.AddFilter("Zip Files (*.zip)", "*.zip")
	savePath, err := d.PromptForSingleSelection()
	if err != nil || savePath == "" {
		return "", nil // user cancelled
	}

	err = service.ZipDirectory(logDir, savePath)
	if err != nil {
		return "", fmt.Errorf("failed to zip logs: %w", err)
	}

	return savePath, nil
}

// LoadAiUsageLogs يسترجع سجلات استخدام الذكاء الاصطناعي من AppData
func (a *App) LoadAiUsageLogs() (string, error) {
	return a.aiLogsSvc.LoadAiUsageLogs()
}

// SaveAiUsageLogs يحفظ سجلات استخدام الذكاء الاصطناعي ذرياً في AppData
func (a *App) SaveAiUsageLogs(jsonData string) error {
	return a.aiLogsSvc.SaveAiUsageLogs(jsonData)
}

func (a *App) OpenFile() (string, error) {
	d := application.Get().Dialog.OpenFile()
	d.SetTitle("Select an Image")
	d.AddFilter("Images (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp)", "*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp")
	filePath, err := d.PromptForSingleSelection()
	if err != nil {
		return "", fmt.Errorf("open dialog: %w", err)
	}
	if filePath == "" {
		return "", nil
	}
	return a.mediaSvc.ProcessOpenedFile(filePath)
}

func (a *App) OpenMultipleFiles() ([]string, error) {
	d := application.Get().Dialog.OpenFile()
	d.SetTitle("Select Images")
	d.AddFilter("Images (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp)", "*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp")
	filePaths, err := d.PromptForMultipleSelection()
	if err != nil {
		return nil, fmt.Errorf("open multiple dialog: %w", err)
	}
	if len(filePaths) == 0 {
		return []string{}, nil
	}
	return a.mediaSvc.ProcessMultipleOpenedFiles(filePaths)
}

func (a *App) OpenDirectoryDialog() ([]string, error) {
	d := application.Get().Dialog.OpenFile()
	d.SetTitle("Select Folder Containing Images")
	d.CanChooseDirectories(true)
	d.CanChooseFiles(false)
	dirPath, err := d.PromptForSingleSelection()
	if err != nil {
		return nil, fmt.Errorf("open directory dialog: %w", err)
	}
	if dirPath == "" {
		return []string{}, nil
	}
	return a.mediaSvc.ProcessDirectoryImages(dirPath)
}

func (a *App) SaveImageFromBase64(base64Data string) (string, error) {
	return a.mediaSvc.SaveImageFromBase64(base64Data)
}

func (a *App) GetImageDimensions(localPath string) (service.ImageDimensions, error) {
	return a.mediaSvc.GetImageDimensions(localPath)
}

func (a *App) GetMediaStorageStats() (service.MediaStorageStats, error) {
	return a.mediaSvc.GetStorageStats()
}

func (a *App) CleanUnusedMediaNow() (map[string]interface{}, error) {
	cleanedCount, freedBytes, err := repository.CleanUnusedMediaNow()
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"cleanedCount": cleanedCount,
		"freedBytes":   freedBytes,
	}, nil
}

func (a *App) SaveFileDialog(base64Data string, defaultFilename string, displayName string, pattern string) (string, error) {
	if int64(len(base64Data)) > int64(service.MaxFileSize)*4/3+16 {
		return "", fmt.Errorf("file size too large: payload %d bytes (max %d raw)", len(base64Data), service.MaxFileSize)
	}

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

	d := application.Get().Dialog.SaveFile()
	d.SetMessage("Save File")
	d.SetFilename(defaultFilename)
	if displayName != "" && pattern != "" {
		d.AddFilter(displayName, pattern)
	}
	filePath, err := d.PromptForSingleSelection()
	if err != nil {
		return "", fmt.Errorf("save dialog: %w", err)
	}
	if filePath == "" {
		return "", nil
	}

	if err := utils.AtomicWriteFile(filePath, decoded, 0o644); err != nil {
		return "", fmt.Errorf("commit file: %w", err)
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

func (a *App) ApplyMaskRaw(localImagePath string, maskBytes []byte, maskW int, maskH int) (string, error) {
	return a.imageProc.ApplyMaskRaw(localImagePath, maskBytes, maskW, maskH)
}

func (a *App) EnhanceImageWithAI(base64Image string, token string, limit int) (string, error) {
	return a.aiSvc.EnhanceImageWithAI(base64Image, token, limit)
}

func (a *App) CheckForUpdate() (*service.UpdateInfo, error) {
	updater := service.NewUpdaterService()
	return updater.CheckForUpdate()
}

func (a *App) DownloadAndInstallUpdate(url string, sha256 string) error {
	updater := service.NewUpdaterService()
	return updater.DownloadAndInstall(a.ctx, url, sha256)
}

func (a *App) SelectExportDirectory() (string, error) {
	d := application.Get().Dialog.OpenFile()
	d.SetTitle("اختر مجلد تصدير الصور")
	d.CanChooseDirectories(true)
	d.CanChooseFiles(false)
	dirPath, err := d.PromptForSingleSelection()
	if err != nil {
		return "", fmt.Errorf("select export directory: %w", err)
	}
	return dirPath, nil
}

func (a *App) setStartupFile(filePath string) {
	a.startupFile = filePath
}

func (a *App) GetStartupFile() (string, error) {
	if a.startupFile == "" {
		return "", nil
	}
	f := a.startupFile
	a.startupFile = ""
	return a.mediaSvc.ProcessOpenedFile(f)
}

func (a *App) StartPhoneBridge() (*service.BridgeInfo, error) {
	return a.phoneBridgeSvc.Start()
}

func (a *App) StopPhoneBridge() error {
	return a.phoneBridgeSvc.Stop()
}

func (a *App) GetPhoneBridgeStatus() *service.BridgeStatus {
	return a.phoneBridgeSvc.GetStatus()
}

func (a *App) ProcessLocalImageFile(filePath string) (string, error) {
	return a.mediaSvc.ProcessOpenedFile(filePath)
}

func (a *App) GetClipboardText() (string, error) {
	text, _ := application.Get().Clipboard.Text()
	return text, nil
}

func (a *App) SetClipboardText(text string) error {
	application.Get().Clipboard.SetText(text)
	return nil
}

func (a *App) GetScreensInfo() ([]*application.Screen, error) {
	return application.Get().Screen.GetAll(), nil
}

func (a *App) GetBatchImageDimensions(localPaths []string) map[string]service.ImageDimensions {
	return a.mediaSvc.GetBatchImageDimensions(localPaths)
}

func (a *App) SetTaskbarProgress(percent int, state string) error {
	return a.desktopSvc.SetTaskbarProgress(percent, state)
}

func (a *App) ShowInFolder(filePath string) error {
	return a.desktopSvc.ShowInFolder(filePath)
}

func (a *App) OpenFolder(folderPath string) error {
	return a.desktopSvc.OpenFolder(folderPath)
}

func (a *App) SendNotification(title, body, imagePath string) error {
	return a.desktopSvc.SendToast(title, body, imagePath)
}

