package main

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) shutdown(_ context.Context) {
	a.ctx = context.Background()
}

var imageFilters = []runtime.FileFilter{
	{DisplayName: "Images (*.png;*.jpg;*.jpeg)", Pattern: "*.png;*.jpg;*.jpeg"},
}

var saveFilters = []runtime.FileFilter{
	{DisplayName: "PNG Image (*.png)", Pattern: "*.png"},
	{DisplayName: "JPEG Image (*.jpg;*.jpeg)", Pattern: "*.jpg;*.jpeg"},
}

var supportedMime = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
}

func mimeTypeForPath(path string) string {
	if m, ok := supportedMime[strings.ToLower(filepath.Ext(path))]; ok {
		return m
	}
	return "image/jpeg"
}

var errEmptySelection = errors.New("no file selected")
var errInvalidBase64 = errors.New("invalid base64 payload")

func (a *App) OpenFile() (string, error) {
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select an Image",
		Filters: imageFilters,
	})
	if err != nil {
		return "", fmt.Errorf("open dialog: %w", err)
	}
	if filePath == "" {
		return "", nil
	}

	bytes, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("read file: %w", err)
	}

	mimeType := mimeTypeForPath(filePath)
	encoded := base64.StdEncoding.EncodeToString(bytes)
	return "data:" + mimeType + ";base64," + encoded, nil
}

func decodeBase64Image(base64Data string) ([]byte, string, error) {
	mimeType, payload, found := strings.Cut(base64Data, ",")
	if !found {
		payload = base64Data
		mimeType = "image/jpeg"
	}
	mimeType = strings.TrimSpace(strings.TrimPrefix(mimeType, "data:"))
	mimeType = strings.SplitN(mimeType, ";", 2)[0]

	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(payload))
	if err != nil {
		return nil, "", fmt.Errorf("%w: %v", errInvalidBase64, err)
	}
	return decoded, mimeType, nil
}

func (a *App) SaveFile(base64Data string) (string, error) {
	decoded, mimeType, err := decodeBase64Image(base64Data)
	if err != nil {
		return "", err
	}

	defaultName := "edited_photo.png"
	if mimeType == "image/png" {
		defaultName = "edited_photo.png"
	}

	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Image",
		DefaultFilename: defaultName,
		Filters:         saveFilters,
	})
	if err != nil {
		return "", fmt.Errorf("save dialog: %w", err)
	}
	if filePath == "" {
		return "", errEmptySelection
	}

	if err := os.WriteFile(filePath, decoded, 0o644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return "success", nil
}

func (a *App) SaveFileDialog(base64Data string, defaultFilename string, displayName string, pattern string) (string, error) {
	var decoded []byte
	var err error

	if strings.HasPrefix(base64Data, "data:") {
		decoded, _, err = decodeBase64Image(base64Data)
		if err != nil {
			return "", err
		}
	} else {
		// Treat as plain text (e.g. JSON)
		decoded = []byte(base64Data)
	}

	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save File",
		DefaultFilename: defaultFilename,
		Filters: []runtime.FileFilter{
			{DisplayName: displayName, Pattern: pattern},
		},
	})
	if err != nil {
		return "", fmt.Errorf("save dialog: %w", err)
	}
	if filePath == "" {
		return "", errEmptySelection
	}

	if err := os.WriteFile(filePath, decoded, 0o644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return "success", nil
}

