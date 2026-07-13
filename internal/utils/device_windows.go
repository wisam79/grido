//go:build windows

package utils

import (
	"crypto/sha256"
	"encoding/hex"

	"golang.org/x/sys/windows/registry"
)

func GetDeviceID() string {
	// Try to get stable Windows MachineGuid first
	guid, err := getMachineGuid()
	if err == nil && guid != "" {
		hash := sha256.Sum256([]byte(guid))
		return hex.EncodeToString(hash[:12])
	}

	// Fallback to hostname + MAC address
	return getFallbackDeviceID()
}

func getMachineGuid() (string, error) {
	k, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Cryptography`, registry.QUERY_VALUE)
	if err != nil {
		return "", err
	}
	defer k.Close()

	guid, _, err := k.GetStringValue("MachineGuid")
	if err != nil {
		return "", err
	}
	return guid, nil
}
