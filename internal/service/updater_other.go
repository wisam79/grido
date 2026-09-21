//go:build !windows

package service

import (
	"fmt"
	"time"
)

// runAsAdmin غير مدعوم خارج ويندوز — التحديث التلقائي متاح لنسخة Windows فقط حالياً
func runAsAdmin(_ string, _ string) error {
	return fmt.Errorf("automatic update elevation is only supported on Windows")
}

// waitForInstallerStart: لا مثبّت خارج ويندوز (runAsAdmin يفشل قبل الوصول هنا) —
// نعتبر الانتظار منتهياً فوراً حتى لا نؤخّر مسار الإغلاق.
func waitForInstallerStart(_ string, _ time.Duration) bool {
	return false
}
