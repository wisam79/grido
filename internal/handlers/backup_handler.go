package handlers

import (
	"context"
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
