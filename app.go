package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"grido/internal/utils"

	"github.com/disintegration/imaging"
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

	// فتح الملف الأصلي وتفادي قراءته بالكامل في الرام دفعة واحدة
	srcFile, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("open file: %w", err)
	}
	defer srcFile.Close()

	// 🔒 التحقق من نوع MIME الفعلي للملف (قراءة أول 512 بايت فقط)
	buf := make([]byte, 512)
	n, err := srcFile.Read(buf)
	if err != nil && err != io.EOF {
		return "", fmt.Errorf("read file header: %w", err)
	}
	
	detectedType := http.DetectContentType(buf[:n])
	if !strings.HasPrefix(detectedType, "image/") {
		return "", fmt.Errorf("invalid file type: %s (expected image)", detectedType)
	}

	// إرجاع مؤشر القراءة للبداية قبل النسخ
	_, err = srcFile.Seek(0, io.SeekStart)
	if err != nil {
		return "", fmt.Errorf("seek file: %w", err)
	}

	// Generate unique name and copy to Media directory
	mediaDir := getMediaDir()
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

	// 🔒 التحقق من الحجم لبيانات Base64 لمنع ثغرات نفاذ الذاكرة
	if len(decoded) > maxFileSize {
		return nil, "", fmt.Errorf("decoded data size exceeds limit: %d bytes (max %d)", len(decoded), maxFileSize)
	}

	return decoded, mimeType, nil
}

func getExtensionFromMime(mimeType string) string {
	if mimeType == "image/png" {
		return ".png"
	}
	return ".jpg"
}

func (a *App) SaveFile(base64Data string) (string, error) {
	decoded, mimeType, err := decodeBase64Image(base64Data)
	if err != nil {
		return "", err
	}

	ext := getExtensionFromMime(mimeType)
	defaultName := "edited_photo" + ext

	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Save Image",
		DefaultFilename: defaultName,
		Filters:         saveFilters,
	})
	if err != nil {
		return "", fmt.Errorf("save dialog: %w", err)
	}
	if filePath == "" {
		return "", nil // 🔒 إرجاع نص فارغ بدلاً من "cancelled" ليكون متسقاً مع OpenFile
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
	ext := getExtensionFromMime(mimeType)
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

	// 🔒 التحقق من الحجم
	if len(decoded) > maxFileSize {
		return "", fmt.Errorf("file size too large: %d bytes (max %d)", len(decoded), maxFileSize)
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
		return "", nil // إلغاء — نُرجع سلسلة فارغة ليكون متسقاً مع SaveFile وOpenFile
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

func (a *App) ApplyMaskToImage(localImagePath string, maskBase64 string) (string, error) {
	var srcImg image.Image
	var err error
	mediaDir := getMediaDir()

	if strings.HasPrefix(localImagePath, "data:image/") {
		decodedSrc, _, err := decodeBase64Image(localImagePath)
		if err != nil {
			return "", fmt.Errorf("decode source base64: %w", err)
		}
		srcImg, err = imaging.Decode(bytes.NewReader(decodedSrc))
		if err != nil {
			return "", fmt.Errorf("decode source image: %w", err)
		}
	} else {
		fileName := filepath.Base(filepath.Clean(localImagePath))
		actualImagePath := filepath.Join(mediaDir, fileName)

		if _, err := os.Stat(actualImagePath); err != nil {
			return "", fmt.Errorf("image file not found: %w", err)
		}

		srcImg, err = imaging.Open(actualImagePath)
		if err != nil {
			return "", fmt.Errorf("open original image: %w", err)
		}
	}

	// 2. Decode the mask base64
	decodedMask, _, err := decodeBase64Image(maskBase64)
	if err != nil {
		return "", fmt.Errorf("decode mask: %w", err)
	}

	// 4. Open mask image
	maskImg, err := imaging.Decode(bytes.NewReader(decodedMask))
	if err != nil {
		return "", fmt.Errorf("decode mask image: %w", err)
	}

	// 5. Resize mask to match original image dimensions if they differ
	srcBounds := srcImg.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()

	maskBounds := maskImg.Bounds()
	if maskBounds.Dx() != srcW || maskBounds.Dy() != srcH {
		maskImg = imaging.Resize(maskImg, srcW, srcH, imaging.Linear)
	}

	// 6. Apply mask using fast direct slice access (*image.NRGBA)
	srcNRGBA := imaging.Clone(srcImg)
	maskNRGBA := imaging.Clone(maskImg)
	outImg := image.NewNRGBA(image.Rect(0, 0, srcW, srcH))

	srcPix := srcNRGBA.Pix
	maskPix := maskNRGBA.Pix
	outPix := outImg.Pix

	// 🔒 Bounds check: ensure all three arrays are large enough before flat looping.
	// This prevents an index-out-of-range panic if resize produces unexpected dimensions.
	maxSafe := len(srcPix)
	if len(maskPix) < maxSafe {
		maxSafe = len(maskPix)
	}
	if len(outPix) < maxSafe {
		maxSafe = len(outPix)
	}
	maxSafe = (maxSafe / 4) * 4 // floor to nearest full RGBA pixel

	for i := 0; i < maxSafe; i += 4 {
		mr := uint32(maskPix[i])
		mg := uint32(maskPix[i+1])
		mb := uint32(maskPix[i+2])
		alpha := uint8((mr + mg + mb) / 3)

		outPix[i] = srcPix[i]
		outPix[i+1] = srcPix[i+1]
		outPix[i+2] = srcPix[i+2]
		outPix[i+3] = alpha
	}

	// 7. Save output image as PNG
	newName := fmt.Sprintf("img_%d.png", time.Now().UnixNano())
	newPath := filepath.Join(mediaDir, newName)

	if err := imaging.Save(outImg, newPath); err != nil {
		return "", fmt.Errorf("save final image: %w", err)
	}

	return "/local-image/" + newName, nil
}

