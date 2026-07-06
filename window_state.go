package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"grido/internal/utils"
)

type windowState struct {
	Width  int  `json:"width"`
	Height int  `json:"height"`
	X      int  `json:"x"`
	Y      int  `json:"y"`
	Max    bool `json:"max"`
}

func getWindowStatePath() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "window.json")
}

func loadWindowState() (windowState, error) {
	path := getWindowStatePath()
	var state windowState
	data, err := os.ReadFile(path)
	if err != nil {
		return state, err
	}
	err = json.Unmarshal(data, &state)
	return state, err
}

func saveWindowState(state windowState) error {
	path := getWindowStatePath()
	if path == "" {
		return fmt.Errorf("could not get config path")
	}
	// تأكد من وجود المجلد
	dir := filepath.Dir(path)
	_ = os.MkdirAll(dir, 0755)

	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func getWebviewCacheDir() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "webview_cache")
}
