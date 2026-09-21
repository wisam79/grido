//go:build !windows || bindings

package main

func isPointOnAnyMonitor(_, _ int) bool {
	return true
}

// getPrimaryWorkArea غير مدعومة خارج ويندوز — يُرجع false فيستخدم
// المتصل الحجم المفضل والتوسيط الافتراضي من Wails.
func getPrimaryWorkArea() (screenWorkArea, bool) {
	return screenWorkArea{}, false
}

// getWorkAreaForPoint غير مدعومة خارج ويندوز.
func getWorkAreaForPoint(_, _ int) (screenWorkArea, bool) {
	return screenWorkArea{}, false
}
