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

	// 2. مسار احتياطي موثوق عبر كائن Shell.Application في PowerShell
	psScript := fmt.Sprintf(
		`$s = New-Object -ComObject Shell.Application; $f = $s.Namespace('%s'); if ($f) { $it = $f.ParseName('%s'); if ($it) { $it.InvokeVerb('Print') } }`,
		strings.ReplaceAll(filepath.Dir(filePath), "'", "''"),
		strings.ReplaceAll(filepath.Base(filePath), "'", "''"),
	)
	cmd := exec.Command("powershell.exe", "-NoProfile", "-WindowStyle", "Hidden", "-Command", psScript)
	if err := cmd.Start(); err == nil {
		return nil
	}

	return fmt.Errorf("تعذر إطلاق معالج طباعة الصور في ويندوز (كود الخطأ %d)", ret)
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
