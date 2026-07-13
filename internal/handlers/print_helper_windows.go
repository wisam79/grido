//go:build windows

package handlers

import (
	"fmt"
	"strings"
	"syscall"
	"unsafe"
)

func printFileOS(absPath string) error {
	hwnd := uintptr(0)
	action := "print"
	if strings.HasSuffix(strings.ToLower(absPath), ".html") {
		action = "open"
	}
	opPtr, err := syscall.UTF16PtrFromString(action)
	if err != nil {
		return err
	}

	filePtr, err := syscall.UTF16PtrFromString(absPath)
	if err != nil {
		return err
	}

	shell32 := syscall.NewLazyDLL("shell32.dll")
	procShellExecuteW := shell32.NewProc("ShellExecuteW")

	// SW_SHOWNORMAL = 1
	ret, _, errVal := procShellExecuteW.Call(
		hwnd,
		uintptr(unsafe.Pointer(opPtr)),
		uintptr(unsafe.Pointer(filePtr)),
		0,
		0,
		1,
	)
	// ShellExecute returns value > 32 on success
	if ret <= 32 {
		return fmt.Errorf("ShellExecuteW failed to print: %v (code %d)", errVal, ret)
	}
	return nil
}
