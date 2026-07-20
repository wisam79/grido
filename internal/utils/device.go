package utils

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"net"
	"os"
)

func getFallbackDeviceID() string {
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown-host"
	}

	var macAddr string
	interfaces, err := net.Interfaces()
	if err == nil {
		for _, i := range interfaces {
			if i.Flags&net.FlagUp != 0 && !bytes.Equal(i.HardwareAddr, nil) {
				macAddr = i.HardwareAddr.String()
				break
			}
		}
	}

	rawID := hostname + ":" + macAddr
	hash := sha256.Sum256([]byte(rawID))
	return hex.EncodeToString(hash[:12]) // Use first 12 bytes
}