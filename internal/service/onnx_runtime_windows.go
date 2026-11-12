//go:build windows

package service

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	ort "github.com/yalue/onnxruntime_go"

	"grido/internal/utils"
)

var onnxRuntimeOwner struct {
	sync.Mutex
	users       int
	initialized bool
}

// acquireONNXRuntime serializes extraction and process-global environment initialization.
// Each native service releases exactly one acquired user after destroying its own sessions.
func acquireONNXRuntime() error {
	onnxRuntimeOwner.Lock()
	defer onnxRuntimeOwner.Unlock()
	if onnxRuntimeOwner.initialized {
		onnxRuntimeOwner.users++
		return nil
	}
	if len(embeddedOnnxRuntimeDLL) == 0 {
		return fmt.Errorf("embedded onnxruntime.dll is empty")
	}
	binDir := filepath.Join(utils.GetAppDir(), "bin")
	if err := os.MkdirAll(binDir, 0o755); err != nil {
		return fmt.Errorf("create ONNX runtime directory: %w", err)
	}
	targetPath := filepath.Join(binDir, "onnxruntime.dll")
	if stat, err := os.Stat(targetPath); err != nil || stat.Size() != int64(len(embeddedOnnxRuntimeDLL)) {
		if err := utils.AtomicWriteFile(targetPath, embeddedOnnxRuntimeDLL, 0o755); err != nil {
			return fmt.Errorf("extract onnxruntime.dll: %w", err)
		}
	}
	ort.SetSharedLibraryPath(targetPath)
	if !ort.IsInitialized() {
		if err := ort.InitializeEnvironment(); err != nil {
			return fmt.Errorf("initialize onnxruntime environment: %w", err)
		}
	}
	onnxRuntimeOwner.initialized = true
	onnxRuntimeOwner.users = 1
	return nil
}

func releaseONNXRuntime() error {
	onnxRuntimeOwner.Lock()
	defer onnxRuntimeOwner.Unlock()
	if onnxRuntimeOwner.users > 0 {
		onnxRuntimeOwner.users--
	}
	if onnxRuntimeOwner.users != 0 || !onnxRuntimeOwner.initialized {
		return nil
	}
	if ort.IsInitialized() {
		if err := ort.DestroyEnvironment(); err != nil {
			return fmt.Errorf("destroy onnxruntime environment: %w", err)
		}
	}
	onnxRuntimeOwner.initialized = false
	return nil
}
