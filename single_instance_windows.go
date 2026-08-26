//go:build windows && !bindings

package main

import (
	"fmt"
	"unsafe"

	syswin "golang.org/x/sys/windows"
)

var (
	user32               = syswin.NewLazyDLL("user32.dll")
	procFindWindowW      = user32.NewProc("FindWindowW")
	procShowWindow       = user32.NewProc("ShowWindow")
	procSetForegroundWin = user32.NewProc("SetForegroundWindow")
)

const swRestore = 9 // SW_RESTORE

func focusExistingWindow() {
	windowTitle, err := syswin.UTF16PtrFromString("Grido Studio")
	if err != nil {
		return
	}
	hwnd, _, _ := procFindWindowW.Call(0, uintptr(unsafe.Pointer(windowTitle)))
	if hwnd != 0 {
		_, _, _ = procShowWindow.Call(hwnd, uintptr(swRestore))
		_, _, _ = procSetForegroundWin.Call(hwnd)
	}
}

func checkSingleInstance() (func(), error) {
	mutexName := "GridoStudio_SingleInstance_Mutex"
	h, err := syswin.CreateMutex(nil, false, syswin.StringToUTF16Ptr(mutexName))
	if err != nil {
		return nil, fmt.Errorf("error creating named mutex: %w", err)
	}

	if syswin.GetLastError() == syswin.ERROR_ALREADY_EXISTS {
		_ = syswin.CloseHandle(h)
		focusExistingWindow()
		return nil, fmt.Errorf("application instance already running")
	}

	cleanup := func() {
		_ = syswin.CloseHandle(h)
	}
	return cleanup, nil
}
