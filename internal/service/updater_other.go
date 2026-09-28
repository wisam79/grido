//go:build !windows

package service

import (
	"fmt"
	"time"
)

// runInstaller غير مدعوم خارج ويندوز — التحديث التلقائي متاح لنسخة Windows فقط حالياً
func runInstaller(_ string, _ string) error {
	return fmt.Errorf("automatic update installer is only supported on Windows")
}

// waitForInstallerStart: لا مثبّت خارج ويندوز (runInstaller يفشل قبل الوصول هنا) —
// نعتبر الانتظار منتهياً فوراً حتى لا نؤخّر مسار الإغلاق.
func waitForInstallerStart(_ string, _ time.Duration) bool {
	return false
}
