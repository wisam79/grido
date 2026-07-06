package main

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"grido/internal/utils"

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

func getMediaDir() string {
	appDir := utils.GetAppDir()
	mediaDir := filepath.Join(appDir, "Media")
	_ = os.MkdirAll(mediaDir, 0755)
	return mediaDir
}

// الحد الأقصى لحجم الملف المرفوع (50 ميغابايت)
const maxFileSize = 50 * 1024 * 1024

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

	// 🔒 التحقق من حجم الملف قبل قراءته لتفادي نفاذ الذاكرة
	stat, err := os.Stat(filePath)
	if err != nil {
		return "", fmt.Errorf("stat file: %w", err)
	}
	if stat.Size() > maxFileSize {
		return "", fmt.Errorf("file too large: %d bytes (max %d)", stat.Size(), maxFileSize)
	}

	// Read original file
	input, err := os.ReadFile(filePath)
	if err != nil {
		return "", fmt.Errorf("read file: %w", err)
	}

	// 🔒 التحقق من نوع MIME الفعلي للملف (بناءً على المحتوى وليس الامتداد فقط)
	detectedType := http.DetectContentType(input)
	if !strings.HasPrefix(detectedType, "image/") {
		return "", fmt.Errorf("invalid file type: %s (expected image)", detectedType)
	}

	// Generate unique name and copy to Media directory
	mediaDir := getMediaDir()
	ext := filepath.Ext(filePath)
	newName := fmt.Sprintf("img_%d%s", time.Now().UnixNano(), ext)
	newPath := filepath.Join(mediaDir, newName)

	if err := os.WriteFile(newPath, input, 0644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return "/local-image/" + newName, nil
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

	defaultName := "edited_photo.jpg"
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
		return "cancelled", nil
	}

	if err := os.WriteFile(filePath, decoded, 0o644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return "success", nil
}

func (a *App) SaveImageFromBase64(base64Data string) (string, error) {
	decoded, mimeType, err := decodeBase64Image(base64Data)
	if err != nil {
		return "", err
	}

	mediaDir := getMediaDir()
	ext := ".jpg"
	if mimeType == "image/png" {
		ext = ".png"
	}
	newName := fmt.Sprintf("img_%d%s", time.Now().UnixNano(), ext)
	newPath := filepath.Join(mediaDir, newName)

	if err := os.WriteFile(newPath, decoded, 0644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return "/local-image/" + newName, nil
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
		return "cancelled", nil
	}

	if err := os.WriteFile(filePath, decoded, 0o644); err != nil {
		return "", fmt.Errorf("write file: %w", err)
	}

	return "success", nil
}

func getSavePath() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "autosave.json")
}

func (a *App) LoadAutoSave() (string, error) {
	path := getSavePath()
	bytes, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return string(bytes), nil
}

func (a *App) SaveAutoSave(jsonData string) error {
	path := getSavePath()
	return os.WriteFile(path, []byte(jsonData), 0644)
}

func (a *App) ClearAutoSave() error {
	path := getSavePath()
	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

