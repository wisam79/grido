package service

import (
	"fmt"
	"html"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_native.go — إطلاق نافذة الطباعة الأصلية لنظام التشغيل
//
// ويندوز: Edge أولاً (يدعم @page CSS كاملة) ثم rundll32 FileProtocolHandler
// (تجنّباً لاستيفاء cmd /c start). ماك/لينكس: lpr.
// ─────────────────────────────────────────────────────────────────────────────

// PrintNative launches the OS native print dialog for a generated file on disk
func (s *PrintService) PrintNative(filePath string) error {
	if filePath == "" {
		return fmt.Errorf("مسار ملف الطباعة غير صالح")
	}

	cleanPath := filepath.Clean(filePath)
	resolved, err := filepath.EvalSymlinks(cleanPath)
	if err == nil {
		cleanPath = resolved
	}

	info, err := os.Stat(cleanPath)
	if err != nil {
		return fmt.Errorf("ملف الطباعة غير موجود: %w", err)
	}
	if info.IsDir() {
		return fmt.Errorf("المسار المحدد مجلد وليس ملفاً قابلاً للطباعة")
	}

	ext := strings.ToLower(filepath.Ext(cleanPath))
	validExts := map[string]bool{
		".png": true, ".jpg": true, ".jpeg": true, ".tiff": true, ".tif": true, ".pdf": true, ".html": true,
	}
	if !validExts[ext] {
		return fmt.Errorf("نوع الملف غير مدعوم للطباعة: %s", ext)
	}

	if runtime.GOOS == "windows" {
		targetPath := cleanPath
		if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".tiff" || ext == ".tif" {
			htmlPath := strings.TrimSuffix(cleanPath, filepath.Ext(cleanPath)) + ".html"
			if _, err := os.Stat(htmlPath); err == nil {
				targetPath = htmlPath
			} else {
				fileURI := "file:///" + strings.ReplaceAll(filepath.ToSlash(cleanPath), " ", "%20")
				escapedURI := html.EscapeString(fileURI)
				htmlContent := fmt.Sprintf(`<!DOCTYPE html><html><head><style>@page{margin:0;size:auto;}html,body{margin:0;padding:0;width:100%%;height:100%%;}img{width:100%%;height:100%%;object-fit:contain;}</style></head><body onload="setTimeout(function(){window.print();window.close();},500)"><img src="%s"/></body></html>`, escapedURI)
				_ = os.WriteFile(htmlPath, []byte(htmlContent), 0644)
				targetPath = htmlPath
			}
		}

		// Try launching with modern Edge first (supports full CSS @page size & orientation)
		edgePaths := []string{
			`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
			`C:\Program Files\Microsoft\Edge\Application\msedge.exe`,
		}
		for _, edgePath := range edgePaths {
			if _, err := os.Stat(edgePath); err == nil {
				cmd := exec.Command(edgePath, targetPath)
				if err := cmd.Start(); err == nil {
					return nil
				}
			}
		}

		// Safe fallback: Launch via explorer/rundll without raw cmd /c start interpolation
		cmd := exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", targetPath)
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("تعذر إطلاق نافذة طباعة الويندوز: %w", err)
		}
		return nil
	}

	if runtime.GOOS == "darwin" || runtime.GOOS == "linux" {
		cmd := exec.Command("lpr", cleanPath)
		return cmd.Run()
	}

	return fmt.Errorf("نظام التشغيل غير مدعوم للطباعة الأصلية")
}
