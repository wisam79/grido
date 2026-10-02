//go:build windows

package service

import (
	"syscall"

	"golang.org/x/sys/windows"
)

// detachedSysProcAttr يفصل الطفل عن أي نافذة كونسول موروثة وعن مجموعة عمليات
// الأب (DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP)، فيبقى حياً بعد أن تُنهي
// العملية المنهارة نفسها.
func detachedSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{
		CreationFlags: windows.DETACHED_PROCESS | windows.CREATE_NEW_PROCESS_GROUP,
	}
}
