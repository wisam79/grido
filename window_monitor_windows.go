//go:build windows && !bindings

package main

import (
	"unsafe"

	syswin "golang.org/x/sys/windows"
)

var (
	user32               = syswin.NewLazyDLL("user32.dll")
	procMonitorFromPoint = user32.NewProc("MonitorFromPoint")
	procGetMonitorInfoW  = user32.NewProc("GetMonitorInfoW")
)

const (
	// MONITOR_DEFAULTTONULL: صفر إن لم تكن النقطة على أي شاشة
	monitorDefaultToNull = 0x00000000
	// MONITOR_DEFAULTTOPRIMARY: الشاشة الأساسية دائماً
	monitorDefaultToPrimary = 0x00000001
)

// winRect و winMonitorInfo يطابقان RECT و MONITORINFO في Win32 API.
type winRect struct{ left, top, right, bottom int32 }

type winMonitorInfo struct {
	cbSize    uint32
	rcMonitor winRect
	rcWork    winRect
	dwFlags   uint32
}

// isPointOnAnyMonitor يتحقق مما إذا كانت نقطة معينة (x, y) تقع ضمن أي شاشة متصلة حالياً
func isPointOnAnyMonitor(x, y int) bool {
	hMonitor, _, _ := procMonitorFromPoint.Call(pointToUintptr(x, y), monitorDefaultToNull)
	return hMonitor != 0
}

// workAreaForPointOrPrimary يعيد مساحة عمل الشاشة التي تقع فيها النقطة (x,y)
// — أي الشاشة ناقص شريط المهام — أو مساحة عمل الشاشة الأساسية إن لم تقع
// النقطة على أي شاشة قائمة (شاشة فُصلت بعد حفظ الموضع مثلاً).
// ok=false تعني أن ويندوز لم يجب بأي معلومات ⇒ لا تعديل على المقاس/الموضع.
func workAreaForPointOrPrimary(x, y int) (screenWorkArea, bool) {
	hMonitor, _, _ := procMonitorFromPoint.Call(pointToUintptr(x, y), monitorDefaultToNull)
	if area, ok := monitorWorkArea(hMonitor); ok {
		return area, true
	}
	hPrimary, _, _ := procMonitorFromPoint.Call(0, monitorDefaultToPrimary)
	return monitorWorkArea(hPrimary)
}

// monitorWorkArea يقرأ rcWork (مساحة العمل) من مقبض شاشة.
func monitorWorkArea(hMonitor uintptr) (screenWorkArea, bool) {
	if hMonitor == 0 {
		return screenWorkArea{}, false
	}
	info := winMonitorInfo{cbSize: uint32(unsafe.Sizeof(winMonitorInfo{}))}
	ret, _, _ := procGetMonitorInfoW.Call(hMonitor, uintptr(unsafe.Pointer(&info)))
	if ret == 0 {
		return screenWorkArea{}, false
	}
	w := int(info.rcWork.right - info.rcWork.left)
	h := int(info.rcWork.bottom - info.rcWork.top)
	if w <= 0 || h <= 0 {
		return screenWorkArea{}, false
	}
	return screenWorkArea{X: int(info.rcWork.left), Y: int(info.rcWork.top), W: w, H: h}, true
}

func pointToUintptr(x, y int) uintptr {
	return uintptr(uint32(x)) | (uintptr(uint32(y)) << 32)
}

