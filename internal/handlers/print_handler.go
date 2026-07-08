package handlers

import (
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"grido/internal/core/domain"
	"grido/internal/service"
)

type PrintHandler struct {
	printService *service.PrintService
}

func NewPrintHandler(printService *service.PrintService) *PrintHandler {
	return &PrintHandler{
		printService: printService,
	}
}

func (h *PrintHandler) ExportPrintSheet(req domain.PrintRequest) domain.PrintResult {
	outPath, err := h.printService.GeneratePrintSheet(req)
	if err != nil {
		return domain.PrintResult{
			Success: false,
			Error:   err.Error(),
		}
	}

	// فتح الصورة الناتجة تلقائياً في عارض الصور الافتراضي
	h.openFile(outPath)

	return domain.PrintResult{
		Success:  true,
		FilePath: outPath,
	}
}

// openFile opens the file in the default OS image viewer safely
func (h *PrintHandler) openFile(path string) {
	path = filepath.Clean(path)

	// تحويل المسار لمسار مطلق
	absPath, err := filepath.Abs(path)
	if err != nil {
		slog.Warn("Failed to get absolute path", "path", path)
		return
	}

	// 🔒 التحقق الأمني الصارم: منع أي محاولة لحشو الأوامر (Command Injection)
	if strings.ContainsAny(absPath, `"<>&|%^`) {
		slog.Warn("File path contains suspicious characters", "path", absPath)
		return
	}

	// التأكد من وجود الملف وأنه ينتهي بامتداد آمن لمنع تشغيل ملفات ضارة
	if _, err := os.Stat(absPath); err != nil {
		slog.Warn("File validation failed (does not exist)", "path", absPath)
		return
	}
	ext := strings.ToLower(filepath.Ext(absPath))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
		slog.Warn("File validation failed (invalid extension)", "path", absPath)
		return
	}

	// تشغيل الأمر المخصص لنوع نظام التشغيل
	if err := printFileOS(absPath); err != nil {
		slog.Error("Failed to print/open file", "path", absPath, "error", err.Error())
	}
}
