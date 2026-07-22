package utils

import (
	"os"
	"path/filepath"
)

// GetAppDir returns the base directory for all Grido Studio configuration and data.
// It ensures the directory exists before returning.
func GetAppDir() string {
	if override := os.Getenv("GRIDO_APP_DIR"); override != "" {
		_ = os.MkdirAll(override, 0755)
		return override
	}
	configDir, err := os.UserConfigDir()
	if err != nil {
		// Fallback to TempDir if UserConfigDir fails to avoid writing to current working directory
		configDir = os.TempDir()
	}
	appDir := filepath.Join(configDir, "GridoStudio")
	_ = os.MkdirAll(appDir, 0755)
	return appDir
}
