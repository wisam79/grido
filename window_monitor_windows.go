//go:build windows && !bindings

package main

import (
	syswin "golang.org/x/sys/windows"
)

var (
	user32               = syswin.NewLazyDLL("user32.dll")
	procMonitorFromPoint = user32.NewProc("MonitorFromPoint")
)

// isPointOnAnyMonitor يتحقق مما إذا كانت نقطة معينة (x, y) تقع ضمن أي شاشة متصلة حالياً
func isPointOnAnyMonitor(x, y int) bool {
	pt := uintptr(uint32(x)) | (uintptr(uint32(y)) << 32)
	hMonitor, _, _ := procMonitorFromPoint.Call(pt, 0)
	return hMonitor != 0
}
