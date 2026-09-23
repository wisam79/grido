package service

import (
	"fmt"
	"html"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
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

	if runtime.GOOS == "windows" {
		targetPath := cleanPath
		if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".tiff" || ext == ".tif" {
			// التحقق أولاً من وجود ملف HTML مرافق مولّد مسبقاً بنفس الاسم في مجلد Exports
			// ويحتوي بالفعل على أبعاد الورقة الدقيقة بالمليمتر (@page size: Wmm Hmm)
			companionHTML := strings.TrimSuffix(cleanPath, filepath.Ext(cleanPath)) + ".html"
			if info, err := os.Stat(companionHTML); err == nil && !info.IsDir() {
				targetPath = companionHTML
			} else {
				htmlPath := filepath.Join(os.TempDir(), fmt.Sprintf("grido_print_%d.html", time.Now().UnixNano()))
				fileURI := "file:///" + strings.ReplaceAll(filepath.ToSlash(cleanPath), " ", "%20")
				escapedURI := html.EscapeString(fileURI)
				htmlContent := fmt.Sprintf(`<!DOCTYPE html><html><head><style>@page{margin:0;size:auto;}html,body{margin:0;padding:0;width:100%%;height:100%%;position:relative;overflow:hidden;}img{position:absolute;top:0;left:0;width:100%%;height:100%%;object-fit:contain;margin:0;padding:0;}</style></head><body onload="setTimeout(function(){window.print();window.close();},500)"><img src="%s"/></body></html>`, escapedURI)
				if err := os.WriteFile(htmlPath, []byte(htmlContent), 0644); err == nil {
					targetPath = htmlPath
					// المنظف المركزي يزيل الملفات الأقدم من 5 دقائق (بما فيها بقايا
					// جلسات سابقة قُتلت قبل التنظيف) — عامل واحد بدل نائم لكل طباعة
					schedulePrintTempCleanup()
				}
			}
		}

		// Try launching with modern Edge first (supports full CSS @page size & orientation)
		var edgePaths []string
		if p86 := os.Getenv("ProgramFiles(x86)"); p86 != "" {
			edgePaths = append(edgePaths, filepath.Join(p86, "Microsoft", "Edge", "Application", "msedge.exe"))
		}
		if pf := os.Getenv("ProgramFiles"); pf != "" {
			edgePaths = append(edgePaths, filepath.Join(pf, "Microsoft", "Edge", "Application", "msedge.exe"))
		}
		if la := os.Getenv("LocalAppData"); la != "" {
			edgePaths = append(edgePaths, filepath.Join(la, "Microsoft", "Edge", "Application", "msedge.exe"))
		}
		if lp, err := exec.LookPath("msedge.exe"); err == nil {
			edgePaths = append(edgePaths, lp)
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
