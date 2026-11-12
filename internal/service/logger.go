package service

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"grido/internal/utils"

	"gopkg.in/natefinch/lumberjack.v2"
)

var GlobalLogger *slog.Logger

// initLoggerOnce يمنع إعادة تهيئة الـ handler (كان الاستدعاء المزدوج من main و app.startup
// يسبب تضاربًا بين نظامي تسجيل وملفين متفرقين)
var initLoggerOnce sync.Once

var sensitiveLogKeys = map[string]struct{}{
	"access_token": {}, "accesstoken": {}, "authorization": {}, "body": {},
	"email": {}, "password": {}, "refresh_token": {}, "refreshtoken": {},
	"token": {},
}

func redactLogAttr(_ []string, attr slog.Attr) slog.Attr {
	key := strings.ToLower(strings.ReplaceAll(attr.Key, "-", ""))
	key = strings.ReplaceAll(key, "_", "")
	if _, sensitive := sensitiveLogKeys[key]; sensitive {
		return slog.String(attr.Key, "[REDACTED]")
	}
	if attr.Key == slog.TimeKey {
		attr.Value = slog.StringValue(attr.Value.Time().Format(time.RFC3339))
	}
	return attr
}

func InitLogger() {
	initLoggerOnce.Do(func() {
		// نستخدم مجلد التطبيق الموحد (يحترم GRIDO_APP_DIR في الاختبارات)
		logDir := filepath.Join(utils.GetAppDir(), "logs")
		if err := os.MkdirAll(logDir, 0755); err != nil {
			fmt.Fprintf(os.Stderr, "Grido logger: cannot create log directory: %v\n", err)
			GlobalLogger = slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{ReplaceAttr: redactLogAttr}))
			slog.SetDefault(GlobalLogger)
			return
		}

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
			Level:       slog.LevelInfo,
			ReplaceAttr: redactLogAttr,
		}

		handler := slog.NewJSONHandler(fileWriter, opts)
		GlobalLogger = slog.New(handler)

		// Set it as default for the whole Go app
		slog.SetDefault(GlobalLogger)

		slog.Info("Application Started", "version", AppVersion)
	})
}
