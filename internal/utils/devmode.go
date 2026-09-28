package utils

import (
	"os"
	"path/filepath"
	"strings"
)

// IsDevEnvironment يكتشف بيئة التطوير المحلي دون الاعتماد على نظام البناء:
// متغيرات بيئة خادم الواجهة التي يضعها `wails3 dev`، أو اسم الملف التنفيذي نفسه
// (وليس مسار المجلد الحاوي) يحمل لاحقة `-dev` (مثل grido-dev.exe).
func IsDevEnvironment() bool {
	if os.Getenv("devserver") != "" || os.Getenv("frontenddevserverurl") != "" ||
		os.Getenv("FRONTEND_DEVSERVER_URL") != "" || os.Getenv("WAILS_DEV") == "true" {
		return true
	}
	if exe, err := os.Executable(); err == nil {
		base := strings.ToLower(filepath.Base(exe))
		name := strings.TrimSuffix(base, filepath.Ext(base))
		if strings.HasSuffix(name, "-dev") {
			return true
		}
	}
	if len(os.Args) > 0 {
		base := strings.ToLower(filepath.Base(os.Args[0]))
		name := strings.TrimSuffix(base, filepath.Ext(base))
		if strings.HasSuffix(name, "-dev") {
			return true
		}
	}
	return false
}
