//go:build windows

package service

import (
	"fmt"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
)

// runAsAdmin يشغّل الملف التنفيذي بصلاحيات مسؤول عبر ShellExecuteW بنمط runas
func runAsAdmin(exePath string, args string) error {
	shell32 := syscall.NewLazyDLL("shell32.dll")
	shellExecute := shell32.NewProc("ShellExecuteW")

	verb, _ := syscall.UTF16PtrFromString("runas")
	exe, _ := syscall.UTF16PtrFromString(exePath)
	params, _ := syscall.UTF16PtrFromString(args)
	dir, _ := syscall.UTF16PtrFromString(filepath.Dir(exePath))

	ret, _, _ := shellExecute.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(exe)),
		uintptr(unsafe.Pointer(params)),
		uintptr(unsafe.Pointer(dir)),
		1,
	)

	if ret <= 32 {
		return fmt.Errorf("ShellExecute failed with code %d", ret)
	}

	return nil
}

// waitForInstallerStart ينتظر ظهور عملية المثبت فعلياً (بحد أقصى timeout) ويعيد
// هل رصدناها. بديل عن النوم الأعمى 200ms قبل Quit(): إغلاق التطبيق قبل أن يبدأ
// المثبت — على جهاز بطيء أو مع نسخ الشبكة/الحماية — يترك ملفاتنا مقفلة أمامه.
// ShellExecuteW لا يعود إلا بعد إنشاء العملية المرفوعة، فإن لم نرصدها فالحالة
// غير متوقعة ونُغلق التطبيق على أي حال بعد انتهاء المهلة (لا نعلّق المستخدم).
func waitForInstallerStart(exePath string, timeout time.Duration) bool {
	target := strings.ToLower(filepath.Base(exePath))
	deadline := time.Now().Add(timeout)

	for {
		if isProcessImageRunning(target) {
			return true
		}
		if time.Now().After(deadline) {
			return false
		}
		time.Sleep(50 * time.Millisecond)
	}
}

// isProcessImageRunning يفحص لقطة أنظمة العمليات بحثاً عن صورة بهذا الاسم
func isProcessImageRunning(targetLower string) bool {
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return false
	}
	defer windows.CloseHandle(snapshot)

	var entry windows.ProcessEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))

	for err = windows.Process32First(snapshot, &entry); err == nil; err = windows.Process32Next(snapshot, &entry) {
		if strings.EqualFold(windows.UTF16ToString(entry.ExeFile[:]), targetLower) {
			return true
		}
	}
	return false
}
