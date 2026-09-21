//go:build windows && !bindings

package main

import (
	"unsafe"

	syswin "golang.org/x/sys/windows"
)

var (
	user32               = syswin.NewLazyDLL("user32.dll")
	procMonitorFromPoint = user32.NewProc("MonitorFromPoint")
	procGetMonitorInfo   = user32.NewProc("GetMonitorInfoW")
)

const (
	monitorDefaultToNull    = 0
	monitorDefaultToPrimary = 1
	monitorDefaultToNearest = 2
)

// winRect يطابق RECT في Win32 (أربعة int32 متتالية).
type winRect struct {
	Left, Top, Right, Bottom int32
}

// winMonitorInfo يطابق MONITORINFO في Win32 (40 بايت بالضبط:
// DWORD + RECT + RECT + DWORD بدون حشو).
type winMonitorInfo struct {
	CbSize    uint32
	RcMonitor winRect
	RcWork    winRect
	DwFlags   uint32
}

// isPointOnAnyMonitor يتحقق مما إذا كانت نقطة معينة (x, y) تقع ضمن أي شاشة متصلة حالياً
func isPointOnAnyMonitor(x, y int) bool {
	pt := uintptr(uint32(x)) | (uintptr(uint32(y)) << 32)
	hMonitor, _, _ := procMonitorFromPoint.Call(pt, 0)
	return hMonitor != 0
}

// workAreaOfMonitor يعيد مساحة العمل (الشاشة ناقص شريط المهام) لمعرّف شاشة.
func workAreaOfMonitor(hMonitor uintptr) (screenWorkArea, bool) {
	var mi winMonitorInfo
	mi.CbSize = uint32(unsafe.Sizeof(mi))
	r, _, _ := procGetMonitorInfo.Call(hMonitor, uintptr(unsafe.Pointer(&mi)))
	if r == 0 {
		return screenWorkArea{}, false
	}
	return screenWorkArea{
		X: int(mi.RcWork.Left),
		Y: int(mi.RcWork.Top),
		W: int(mi.RcWork.Right - mi.RcWork.Left),
		H: int(mi.RcWork.Bottom - mi.RcWork.Top),
	}, true
}

// getPrimaryWorkArea يعيد مساحة عمل الشاشة الرئيسية (تُستخدم للحجم
// الافتراضي والتوسيط الأول — التوسيط في مساحة العمل يجنّب شريط المهام).
func getPrimaryWorkArea() (screenWorkArea, bool) {
	hMonitor, _, _ := procMonitorFromPoint.Call(0, monitorDefaultToPrimary)
	if hMonitor == 0 {
		return screenWorkArea{}, false
	}
	return workAreaOfMonitor(hMonitor)
}

// getWorkAreaForPoint يعيد مساحة عمل أقرب شاشة لنقطة (تُستخدم لحصر
// موضع مستعاد من جلسة سابقة داخل شاشة متصلة فعلاً).
func getWorkAreaForPoint(x, y int) (screenWorkArea, bool) {
	pt := uintptr(uint32(x)) | (uintptr(uint32(y)) << 32)
	hMonitor, _, _ := procMonitorFromPoint.Call(pt, monitorDefaultToNearest)
	if hMonitor == 0 {
		return screenWorkArea{}, false
	}
	return workAreaOfMonitor(hMonitor)
}
