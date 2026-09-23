//go:build !windows

package service

import (
	"fmt"
	"os/exec"
	"runtime"
)

// launchOSPrint ينفذ الطباعة الأصلية لأنظمة Unix (macOS / Linux) عبر lpr
func launchOSPrint(cleanPath string, _ string) error {
	if runtime.GOOS == "darwin" || runtime.GOOS == "linux" {
		cmd := exec.Command("lpr", cleanPath)
		return cmd.Run()
	}
	return fmt.Errorf("نظام التشغيل غير مدعوم للطباعة الأصلية")
}
