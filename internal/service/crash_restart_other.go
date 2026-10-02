//go:build !windows

package service

import "syscall"

// detachedSysProcAttr يعزل الطفل في جلسة مستقلة (setsid) — المقابل لـ
// DETACHED_PROCESS على ويندوز، فيبقى حياً بعد موت العملية المنهارة.
func detachedSysProcAttr() *syscall.SysProcAttr {
	return &syscall.SysProcAttr{Setsid: true}
}
