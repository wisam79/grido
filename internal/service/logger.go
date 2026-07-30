package service

import (
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"

	"grido/internal/utils"

	"gopkg.in/natefinch/lumberjack.v2"
)

var GlobalLogger *slog.Logger

// initLoggerOnce يمنع إعادة تهيئة الـ handler (كان الاستدعاء المزدوج من main و app.startup
// يسبب تضاربًا بين نظامي تسجيل وملفين متفرقين)
var initLoggerOnce sync.Once

func InitLogger() {
	initLoggerOnce.Do(func() {
		// نستخدم مجلد التطبيق الموحد (يحترم GRIDO_APP_DIR في الاختبارات)
		logDir := filepath.Join(utils.GetAppDir(), "logs")
		os.MkdirAll(logDir, 0755)

		logFilePath := filepath.Join(logDir, "grido.log")

		// Use lumberjack for log rotation (max 10MB per file, keep 3 backups, max 28 days)
		fileWriter := &lumberjack.Logger{
			Filename:   logFilePath,
			MaxSize:    10, // megabytes
			MaxBackups: 3,
			MaxAge:     28, // days
			Compress:   true,
		}

		opts := &slog.HandlerOptions{
			Level: slog.LevelInfo,
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				if a.Key == slog.TimeKey {
					// format time clearly
					a.Value = slog.StringValue(a.Value.Time().Format(time.RFC3339))
				}
				return a
			},
		}

		handler := slog.NewJSONHandler(fileWriter, opts)
		GlobalLogger = slog.New(handler)

		// Set it as default for the whole Go app
		slog.SetDefault(GlobalLogger)

		slog.Info("Application Started", "version", AppVersion)
	})
}
