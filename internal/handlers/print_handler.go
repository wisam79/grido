package handlers

import (
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
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

	// 🔒 التحقق الأمني: التأكد من وجود الملف وأنه ينتهي بامتداد آمن لمنع تشغيل ملفات ضارة
	if _, err := os.Stat(path); err != nil {
		slog.Warn("File validation failed (does not exist)", "path", path)
		return
	}
	ext := strings.ToLower(filepath.Ext(path))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
		slog.Warn("File validation failed (invalid extension)", "path", path)
		return
	}

	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		// استخدام rundll32 لتفادي تشغيل موجه الأوامر cmd.exe ومنع ثغرات Command Injection
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", path)
	case "darwin":
		cmd = exec.Command("open", "--", path)
	default: // linux
		cmd = exec.Command("xdg-open", path)
	}
	if err := cmd.Start(); err != nil {
		slog.Error("Failed to open file in default viewer", "path", path, "error", err.Error())
	}
}
