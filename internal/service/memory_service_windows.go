//go:build windows

package service

import (
	"os"
	"runtime"
	"runtime/debug"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	modPsapi    = windows.NewLazySystemDLL("psapi.dll")
	procEmptyWS = modPsapi.NewProc("EmptyWorkingSet")
)

func trimProcessHandle(h windows.Handle) {
	_, _, _ = procEmptyWS.Call(uintptr(h))
	_ = windows.SetProcessWorkingSetSizeEx(h, ^uintptr(0), ^uintptr(0), 0)
}

func trimPlatformMemory() {
	// 1. Force Go GC and return memory pages to OS
	runtime.GC()
	debug.FreeOSMemory()

	// 2. Trim our own process working set
	trimProcessHandle(windows.CurrentProcess())

	// 3. Trim all descendant WebView2 processes (renderer, gpu, broker, utility)
	myPid := uint32(os.Getpid())
	childPids := getDescendantProcessIDs(myPid)
	for _, pid := range childPids {
		h, err := windows.OpenProcess(windows.PROCESS_SET_QUOTA|windows.PROCESS_QUERY_INFORMATION, false, pid)
		if err == nil {
			trimProcessHandle(h)
			_ = windows.CloseHandle(h)
		}
	}
}

func getDescendantProcessIDs(parentPid uint32) []uint32 {
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil
	}
	defer windows.CloseHandle(snapshot)

	var entry windows.ProcessEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))

	if err := windows.Process32First(snapshot, &entry); err != nil {
		return nil
	}

	// Map parent PID -> slice of child PIDs
	tree := make(map[uint32][]uint32)
	for {
		tree[entry.ParentProcessID] = append(tree[entry.ParentProcessID], entry.ProcessID)
		if err := windows.Process32Next(snapshot, &entry); err != nil {
			break
		}
	}

	// Breadth-first search to find all descendant PIDs
	var descendants []uint32
	queue := []uint32{parentPid}
	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]
		for _, child := range tree[curr] {
			descendants = append(descendants, child)
			queue = append(queue, child)
		}
	}

	return descendants
}
