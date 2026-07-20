//go:build !windows && !bindings

package main

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
)

func checkSingleInstance() (func(), error) {
	lockFile := filepath.Join(os.TempDir(), "grido_studio_single_instance.sock")
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
