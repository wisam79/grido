//go:build !windows

package service

import "fmt"

// runAsAdmin غير مدعوم خارج ويندوز — التحديث التلقائي متاح لنسخة Windows فقط حالياً
func runAsAdmin(_ string, _ string) error {
	return fmt.Errorf("automatic update elevation is only supported on Windows")
}
