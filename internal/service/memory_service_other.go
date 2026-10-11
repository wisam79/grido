//go:build !windows

package service

import (
	"runtime"
	"runtime/debug"
)

func trimPlatformMemory() {
	runtime.GC()
	debug.FreeOSMemory()
}
