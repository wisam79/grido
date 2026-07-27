package service

import (
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"grido/internal/utils"
)

const MaxFileSize = 50 * 1024 * 1024 // 50MB

var ErrInvalidBase64 = errors.New("invalid base64 payload")

type MediaService struct{}

func NewMediaService() *MediaService {
	return &MediaService{}
}

func (s *MediaService) GetMediaDir() string {
	appDir := utils.GetAppDir()
	mediaDir := filepath.Join(appDir, "Media")
	_ = os.MkdirAll(mediaDir, 0755)
	return mediaDir
}

func (s *MediaService) DecodeBase64Image(base64Data string) ([]byte, string, error) {
	mimeType, payload, found := strings.Cut(base64Data, ",")
	if !found {
		payload = base64Data
		mimeType = "image/jpeg"
	}
	mimeType = strings.TrimSpace(strings.TrimPrefix(mimeType, "data:"))
	mimeType = strings.SplitN(mimeType, ";", 2)[0]

	trimmedPayload := strings.TrimSpace(payload)
	if len(trimmedPayload) > MaxFileSize*4/3+4 {
		return nil, "", fmt.Errorf("base64 payload too large: %d chars (max %d)", len(trimmedPayload), MaxFileSize*4/3+4)
	}

	decoded, err := base64.StdEncoding.DecodeString(trimmedPayload)
	if err != nil {
		return nil, "", fmt.Errorf("%w: %v", ErrInvalidBase64, err)
	}

	return decoded, mimeType, nil
}

func (s *MediaService) GetExtensionFromMime(mimeType string) string {
	if mimeType == "image/png" {
		return ".png"
	}
	return ".jpg"
}

func (s *MediaService) ProcessOpenedFile(filePath string) (string, error) {
	stat, err := os.Stat(filePath)
	if err != nil {
		return "", fmt.Errorf("stat file: %w", err)
	}
	if stat.Size() > MaxFileSize {
		return "", fmt.Errorf("file too large: %d bytes (max %d)", stat.Size(), MaxFileSize)
	}

	srcFile, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("open file: %w", err)
	}
	defer srcFile.Close()

	buf := make([]byte, 512)
	n, err := srcFile.Read(buf)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("read file header: %w", err)
	}

	detectedType := http.DetectContentType(buf[:n])
	if !strings.HasPrefix(detectedType, "image/") {
		return "", fmt.Errorf("invalid file type: %s (expected image)", detectedType)
	}

	_, err = srcFile.Seek(0, io.SeekStart)
	if err != nil {
		return "", fmt.Errorf("seek file: %w", err)
	}

	mediaDir := s.GetMediaDir()
	ext := filepath.Ext(filePath)
	newName := fmt.Sprintf("img_%d%s", time.Now().UnixNano(), ext)
	newPath := filepath.Join(mediaDir, newName)

	destFile, err := os.OpenFile(newPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		return "", fmt.Errorf("create dest file: %w", err)
	}
	defer destFile.Close()

	if _, err := io.Copy(destFile, srcFile); err != nil {
		return "", fmt.Errorf("copy file: %w", err)
	}

	return "/local-image/" + newName, nil
}

func (s *MediaService) ProcessMultipleOpenedFiles(filePaths []string) ([]string, error) {
	var results []string
	var skippedNames []string
	mediaDir := s.GetMediaDir()

	for _, filePath := range filePaths {
		stat, err := os.Stat(filePath)
		if err != nil {
			skippedNames = append(skippedNames, filepath.Base(filePath))
			slog.Warn("Skipped file in multi-select: stat error", "file", filepath.Base(filePath), "error", err)
			continue
		}
		if stat.Size() > MaxFileSize {
			skippedNames = append(skippedNames, filepath.Base(filePath))
			slog.Warn("Skipped file in multi-select: exceeds size limit", "file", filepath.Base(filePath), "size", stat.Size())
			continue
		}

		srcFile, err := os.Open(filePath)
		if err != nil {
			skippedNames = append(skippedNames, filepath.Base(filePath))
			slog.Warn("Skipped file in multi-select: open error", "file", filepath.Base(filePath), "error", err)
			continue
		}

		buf := make([]byte, 512)
		n, err := srcFile.Read(buf)
		if err != nil && err != io.EOF {
			srcFile.Close()
			skippedNames = append(skippedNames, filepath.Base(filePath))
			slog.Warn("Skipped file in multi-select: read error", "file", filepath.Base(filePath), "error", err)
			continue
		}

		detectedType := http.DetectContentType(buf[:n])
		if !strings.HasPrefix(detectedType, "image/") {
			srcFile.Close()
			skippedNames = append(skippedNames, filepath.Base(filePath))
			slog.Warn("Skipped file in multi-select: not an image", "file", filepath.Base(filePath), "detected", detectedType)
			continue
		}

		_, _ = srcFile.Seek(0, io.SeekStart)

		newName := fmt.Sprintf("img_%d_%s", time.Now().UnixNano(), filepath.Base(filePath))
		newPath := filepath.Join(mediaDir, newName)

		destFile, err := os.OpenFile(newPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
		if err != nil {
			srcFile.Close()
			skippedNames = append(skippedNames, filepath.Base(filePath))
			slog.Warn("Skipped file in multi-select: dest create error", "file", filepath.Base(filePath), "error", err)
			continue
		}

		_, copyErr := io.Copy(destFile, srcFile)
		destFile.Close()
		srcFile.Close()

		if copyErr == nil {
			results = append(results, "/local-image/"+newName)
		} else {
			skippedNames = append(skippedNames, filepath.Base(filePath))
			slog.Warn("Skipped file in multi-select: copy error", "file", filepath.Base(filePath), "error", copyErr)
		}
	}

	if len(skippedNames) > 0 {
		slog.Warn("Some files were skipped during multi-select", "skipped", skippedNames, "total", len(filePaths), "loaded", len(results))
	}

	return results, nil
}

func (s *MediaService) SaveImageFromBase64(base64Data string) (string, error) {
	decoded, mimeType, err := s.DecodeBase64Image(base64Data)
	if err != nil {
		return "", err
	}

	mediaDir := s.GetMediaDir()
	ext := s.GetExtensionFromMime(mimeType)
	newName := fmt.Sprintf("img_%d%s", time.Now().UnixNano(), ext)
	newPath := filepath.Join(mediaDir, newName)
	tmpPath := newPath + ".tmp"

	if err := os.WriteFile(tmpPath, decoded, 0644); err != nil {
		return "", fmt.Errorf("write tmp file: %w", err)
	}
	defer os.Remove(tmpPath)

	if err := os.Rename(tmpPath, newPath); err != nil {
		return "", fmt.Errorf("rename file: %w", err)
	}

	return "/local-image/" + newName, nil
}
