//go:build !windows && !bindings

package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"strings"
)

func GetDeviceID() string {
	// Try reading Linux/Unix machine-id
	if id, err := readMachineID(); err == nil && id != "" {
		hash := sha256.Sum256([]byte(id))
		return hex.EncodeToString(hash[:12])
	}

	// Fallback to hostname + MAC address
	return getFallbackDeviceID()
}

func readMachineID() (string, error) {
	// Common Linux paths
	paths := []string{"/etc/machine-id", "/var/lib/dbus/machine-id"}
	for _, p := range paths {
		data, err := os.ReadFile(p)
		if err == nil {
			id := strings.TrimSpace(string(data))
			if id != "" {
				return id, nil
			}
		}
	}
	return "", os.ErrNotExist
}
