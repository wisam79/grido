//go:build windows

package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

// launchOSPrint ينفذ الطباعة الأصلية لنظام Windows بحسب نوع الملف
func launchOSPrint(cleanPath string, ext string) error {
	isImage := ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".tiff" || ext == ".tif"
	if isImage {
		// 🖨️ فحص وجود وثيقة HTML مرافقة للملف — تضمن طباعة بدقة مليمترية 1:1
		// وتتجنب عارض صور ويندوز العتيق (photowiz.dll) الذي يشوه القياسات
		// ويفشل مع طابعات Brother وEpson بـ "An internal error occurred".
		companionHTML := strings.TrimSuffix(cleanPath, ext) + ".html"
		if info, err := os.Stat(companionHTML); err == nil && !info.IsDir() {
			return launchWindowsDocumentPrint(companionHTML)
		}
		return launchWindowsPhotoPrint(cleanPath)
	}
	return launchWindowsDocumentPrint(cleanPath)
}

// launchWindowsPhotoPrint يطلق معالج طباعة الصور الأصلي لنظام Windows 11
// بدون المرور عبر المتصفح أو لغة HTML، لضمان مخرجات نظيفة 100% بدون أي روابط أو تواريخ
func launchWindowsPhotoPrint(filePath string) error {
	shell32 := syscall.NewLazyDLL("shell32.dll")
	shellExecute := shell32.NewProc("ShellExecuteW")

	verb, _ := syscall.UTF16PtrFromString("print")
	file, _ := syscall.UTF16PtrFromString(filePath)
	dir, _ := syscall.UTF16PtrFromString(filepath.Dir(filePath))

	// 1. استدعاء ShellExecuteW بنمط "print" — المسار القياسي لمعالج صور ويندوز
	ret, _, _ := shellExecute.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(file)),
		0,
		uintptr(unsafe.Pointer(dir)),
		1, // SW_SHOWNORMAL
	)

	if ret > 32 {
		return nil
	}

	// 2. مسار احتياطي موثوق عبر كائن Shell.Application في PowerShell.
	// 🖨️ تمرير المسار عبر متغيرات البيئة (RV-Print-10) بدل استيفائه في نص
	// السكربت: قيم env لا يُعاد تحليلها نحوياً إطلاقاً، فلا حقن ممكناً مهما
	// احتوى المسار (backtick أو $() أو علامات اقتباس) — وبلا Base64 الذي
	// تُعلّمه مضادات الفيروسات سلوكاً مشبوهاً (Sigma: encoded command).
	// الانتظار غير متزامن مع سجل: Start() وحده كان يدّعي النجاح دائماً.
	psScript := `$s = New-Object -ComObject Shell.Application; $f = $s.Namespace($env:GRIDO_PRINT_DIR); if ($f) { $it = $f.ParseName($env:GRIDO_PRINT_FILE); if ($it) { $it.InvokeVerb('Print') } }`
	cmd := exec.Command("powershell.exe", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", psScript)
	cmd.Env = append(os.Environ(),
		"GRIDO_PRINT_DIR="+filepath.Dir(filePath),
		"GRIDO_PRINT_FILE="+filepath.Base(filePath),
	)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("تعذر إطلاق معالج طباعة الصور في ويندوز (كود الخطأ %d): %w", ret, err)
	}
	// best-effort: لا نحجب IPC، لكن نلتقط الفشل الفعلي في السجل بدل الصمت.
	go func() {
		if waitErr := cmd.Wait(); waitErr != nil {
			fmt.Fprintf(os.Stderr, "grido print fallback failed for %s: %v\n", filepath.Base(filePath), waitErr)
		}
	}()
	return nil
}

// launchWindowsDocumentPrint يطلق طباعة المستندات (HTML / PDF) عبر Edge أو العارض الافتراضي
func launchWindowsDocumentPrint(targetPath string) error {
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

	cmd := exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", targetPath)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("تعذر إطلاق نافذة طباعة المستند: %w", err)
	}
	return nil
}
