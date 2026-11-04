package handlers

import (
	"context"
	"fmt"

	"github.com/wailsapp/wails/v3/pkg/application"

	"grido/internal/service"
)

type BackupHandler struct {
	ctx           context.Context
	backupService *service.BackupService
}

func NewBackupHandler(s *service.BackupService) *BackupHandler {
	return &BackupHandler{backupService: s}
}

func (h *BackupHandler) Startup(ctx context.Context) {
	h.ctx = ctx
}

func (h *BackupHandler) ExportBackup() (string, error) {
	return h.backupService.ExportBackup()
}

// ExportBackupToFile يكتب أرشيف النسخ الاحتياطي مباشرة إلى مسار على القرص
// بكتابة أذرعية دون تمرير الحمولة عبر IPC (عقد IPC جديد — توليد الربطات
// عبر wails3 generate bindings لاحقاً).
func (h *BackupHandler) ExportBackupToFile(filePath string) error {
	return h.backupService.ExportBackupToFile(filePath)
}

// ExportBackupToPath يفتح حوار حفظ النظام ثم يبثّ أرشيف النسخ الاحتياطي
// مباشرة إلى المسار المختار من Go — لا تمر الحمولة عبر IPC إطلاقاً (كانت
// المكتبة كاملة تُسلسل كسلسلة وتُرسل إلى الواجهة ثم تعود بbase64 عبر
// SaveFileDialog). السلسلة الفارغة = ألغى المستخدم الحوار (عقد IPC جديد).
func (h *BackupHandler) ExportBackupToPath(defaultFilename string) (string, error) {
	d := application.Get().Dialog.SaveFile()
	d.SetMessage("Export Backup")
	d.SetFilename(defaultFilename)
	d.AddFilter("Grido Backup (*.json)", "*.json")
	filePath, err := d.PromptForSingleSelection()
	if err != nil {
		return "", fmt.Errorf("save dialog: %w", err)
	}
	if filePath == "" {
		return "", nil
	}
	if err := h.backupService.ExportBackupToFile(filePath); err != nil {
		return "", err
	}
	return filePath, nil
}

func (h *BackupHandler) ImportBackup(jsonData string, mode string) (string, error) {
	err := h.backupService.ImportBackup(jsonData, mode)
	if err != nil {
		return "", err
	}
	return "success", nil
}

func (h *BackupHandler) ResetLibrary() (string, error) {
	err := h.backupService.ResetLibrary()
	if err != nil {
		return "", err
	}
	return "success", nil
}
