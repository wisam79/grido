package service

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"grido/internal/utils"
)

// منظف مركزي لملفات HTML المؤقتة — كان كل طباعة تطلق goroutine نائمة 3 دقائق
// (100 طبعة دفعية = 100 نائمة) وتتراكم الملفات لو قُتل التطبيق قبل الاستيقاظ
var printTempJanitorOnce sync.Once

func schedulePrintTempCleanup() {
	printTempJanitorOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(5 * time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				entries, err := os.ReadDir(os.TempDir())
				if err != nil {
					continue
				}
				cutoff := time.Now().Add(-5 * time.Minute)
				for _, e := range entries {
					if e.IsDir() || !strings.HasPrefix(e.Name(), "grido_print_") || !strings.HasSuffix(e.Name(), ".html") {
						continue
					}
					if info, err := e.Info(); err == nil && info.ModTime().Before(cutoff) {
						_ = os.Remove(filepath.Join(os.TempDir(), e.Name()))
					}
				}
			}
		}()
	})
}

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

	// 🔒 حصر الطباعة في مخرجات التطبيق: مجلد Exports أو ملفات HTML المؤقتة
	// التي ينشئها التطبيق نفسه — يمنع تمرير أي مسار نظامي من الواجهة.
	exportsDir, expErr := filepath.Abs(filepath.Join(utils.GetAppDir(), "Exports"))
	if expErr != nil {
		return fmt.Errorf("تعذر تحديد مجلد التصدير: %w", expErr)
	}
	if resolvedBase, err := filepath.EvalSymlinks(exportsDir); err == nil {
		exportsDir = resolvedBase
	}
	tempDir, tempErr := filepath.Abs(os.TempDir())
	if tempErr == nil {
		if resolvedTmp, err := filepath.EvalSymlinks(tempDir); err == nil {
			tempDir = resolvedTmp
		}
	}
	absClean, absErr := filepath.Abs(cleanPath)
	if absErr != nil {
		return fmt.Errorf("مسار الطباعة غير صالح: %w", absErr)
	}
	inExports := strings.HasPrefix(absClean, filepath.Clean(exportsDir)+string(filepath.Separator))
	inPrintTemp := tempErr == nil &&
		strings.HasPrefix(absClean, filepath.Clean(tempDir)+string(filepath.Separator)) &&
		strings.HasPrefix(filepath.Base(absClean), "grido_print_")
	if !inExports && !inPrintTemp {
		return fmt.Errorf("مسار الطباعة خارج النطاق المسموح")
	}

	return launchOSPrint(cleanPath, ext)
}
