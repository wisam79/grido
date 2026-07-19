package utils

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
)

// InitLogger initializes slog to write structured JSON logs to both stdout and app.log
func InitLogger() (*os.File, error) {
	appDir := GetAppDir()
	logPath := filepath.Join(appDir, "app.log")

	// 🧹 تدوير السجلات إذا تجاوز حجم الملف 1 ميغابايت لتفادي استهلاك مساحة القرص
	if info, err := os.Stat(logPath); err == nil && info.Size() > 1*1024*1024 {
		_ = os.Remove(logPath + ".old") // Delete old backup if it exists
		_ = os.Rename(logPath, logPath+".old")
	}

	logFile, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return nil, err
	}

	// Write to both standard output and log file
	multiWriter := io.MultiWriter(os.Stdout, logFile)

	handler := slog.NewJSONHandler(multiWriter, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})

	logger := slog.New(handler)
	slog.SetDefault(logger)

	return logFile, nil
}
