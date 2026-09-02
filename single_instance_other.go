//go:build !windows && !bindings

package main

import (
	"fmt"
	"net"
	"os"
	"path/filepath"

	"grido/internal/utils"
)

func checkSingleInstance() (func(), error) {
	appDir := utils.GetAppDir()
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return nil, fmt.Errorf("cannot create app dir: %w", err)
	}
	lockFile := filepath.Join(appDir, "grido_studio_inst.lock")
	ln, err := net.Listen("unix", lockFile)
	if err != nil {
		// Try to connect to it to see if it's a stale socket
		if conn, dialErr := net.Dial("unix", lockFile); dialErr == nil {
			conn.Close()
			return nil, fmt.Errorf("application instance already running")
		}
		// Stale socket, remove and try again
		_ = os.Remove(lockFile)
		ln, err = net.Listen("unix", lockFile)
		if err != nil {
			return nil, fmt.Errorf("application instance already running")
		}
	}

	cleanup := func() {
		_ = ln.Close()
		_ = os.Remove(lockFile)
	}
	return cleanup, nil
}

func isPointOnAnyMonitor(_, _ int) bool {
	return true
}
