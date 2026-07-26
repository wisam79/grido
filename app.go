package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/png"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"grido/internal/core/domain"
	"grido/internal/repository"
	"grido/internal/service"
	"grido/internal/utils"

	"github.com/disintegration/imaging"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type aiRateEntry struct {
	count    int
	resetDay string
}

type aiRateLimiter struct {
	mu    sync.Mutex
	usage map[string]*aiRateEntry
}

var aiLimiter = &aiRateLimiter{
	usage: make(map[string]*aiRateEntry),
}

func (l *aiRateLimiter) checkAndIncrement(key string, limit int) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	entry, exists := l.usage[key]
	if !exists || entry.resetDay != today {
		entry = &aiRateEntry{count: 0, resetDay: today}
		l.usage[key] = entry
	}

	if entry.count >= limit {
		return fmt.Errorf("تم تجاوز الحد اليومي لاستخدام الذكاء الاصطناعي (%d صورة/يومياً). يتجدد الرصيد غداً", limit)
	}
	entry.count++
	return nil
}

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	service.InitLogger()
}

func (a *App) shutdown(_ context.Context) {
	// ... clean up resources ...
}

func (a *App) LogFrontendError(level, message, stackTrace string) {
	if service.GlobalLogger == nil {
		return
	}
	switch level {
	case "info":
		service.GlobalLogger.Info(message, "source", "frontend", "stack", stackTrace)
	case "warn":
		service.GlobalLogger.Warn(message, "source", "frontend", "stack", stackTrace)
	case "error":
		service.GlobalLogger.Error(message, "source", "frontend", "stack", stackTrace)
	default:
		service.GlobalLogger.Error(message, "source", "frontend", "stack", stackTrace)
	}
}

func (a *App) ExportSupportLogs() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("failed to get config dir: %w", err)
	}
	logDir := filepath.Join(configDir, "GridoStudio", "logs")
	
	// Create a temp zip file
	tempZip, err := os.CreateTemp("", "grido_logs_*.zip")
	if err != nil {
		return "", err
	}
	defer tempZip.Close()
	defer os.Remove(tempZip.Name())
	
	// Implementation of zip creation can be done via shell command for simplicity or zip package
	// Actually let's just copy the current log file path and ask the user to save it.
	
	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: "grido_support_logs.zip",
		Filters: []runtime.FileFilter{
			{DisplayName: "Zip Files (*.zip)", Pattern: "*.zip"},
		},
		Title: "تصدير سجلات الأخطاء",
	})
	
	if err != nil || savePath == "" {
		return "", nil // user cancelled
	}
	
	// To simplify, we will just copy the main log file to the destination, and rename it .log or .zip
	// Let's actually zip the log directory.
	err = service.ZipDirectory(logDir, savePath)
	if err != nil {
		return "", fmt.Errorf("failed to zip logs: %w", err)
	}
	
	return savePath, nil
}

// Write the ZipDirectory helper directly inside app.go if needed, but better in service.
// Let's call service.ZipDirectory.

var imageFilters = []runtime.FileFilter{
	{DisplayName: "Images (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp)", Pattern: "*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp"},
}

var saveFilters = []runtime.FileFilter{
	{DisplayName: "PNG Image (*.png)", Pattern: "*.png"},
	{DisplayName: "JPEG Image (*.jpg;*.jpeg)", Pattern: "*.jpg;*.jpeg"},
}

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

func (a *App) OpenMultipleFiles() ([]string, error) {

	filePaths, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Select Images",
		Filters: imageFilters,
	})
	if err != nil {
		return nil, fmt.Errorf("open multiple dialog: %w", err)
	}
	if len(filePaths) == 0 {
		return []string{}, nil
	}

	var results []string
	var skippedNames []string
	mediaDir := getMediaDir()

	for _, filePath := range filePaths {
		stat, err := os.Stat(filePath)
		if err != nil {
			skippedNames = append(skippedNames, filepath.Base(filePath))
			slog.Warn("Skipped file in multi-select: stat error", "file", filepath.Base(filePath), "error", err)
			continue
		}
		if stat.Size() > maxFileSize {
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

func decodeBase64Image(base64Data string) ([]byte, string, error) {
	mimeType, payload, found := strings.Cut(base64Data, ",")
	if !found {
		payload = base64Data
		mimeType = "image/jpeg"
	}
	mimeType = strings.TrimSpace(strings.TrimPrefix(mimeType, "data:"))
	mimeType = strings.SplitN(mimeType, ";", 2)[0]

	trimmedPayload := strings.TrimSpace(payload)
	// 🔒 التحقق من حجم السلسلة قبل فك تشفيرها لتفادي تخصيص ذاكرة ضخم
	if len(trimmedPayload) > maxFileSize*4/3+4 {
		return nil, "", fmt.Errorf("base64 payload too large: %d chars (max %d)", len(trimmedPayload), maxFileSize*4/3+4)
	}

	decoded, err := base64.StdEncoding.DecodeString(trimmedPayload)
	if err != nil {
		return nil, "", fmt.Errorf("%w: %v", errInvalidBase64, err)
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

func (a *App) SaveCustomTemplate(name string, slots int, cellsJSON string) (domain.CustomTemplate, error) {
	db, err := repository.InitDB()
	if err != nil {
		return domain.CustomTemplate{}, err
	}
	tmpl := domain.CustomTemplate{
		Name:  name,
		Slots: slots,
		Cells: domain.JSONText(cellsJSON),
	}
	result := db.Create(&tmpl)
	return tmpl, result.Error
}

func (a *App) GetCustomTemplates() ([]domain.CustomTemplate, error) {
	db, err := repository.InitDB()
	if err != nil {
		return nil, err
	}
	var templates []domain.CustomTemplate
	result := db.Find(&templates)
	return templates, result.Error
}

func (a *App) DeleteCustomTemplate(id uint) error {
	db, err := repository.InitDB()
	if err != nil {
		return err
	}
	result := db.Delete(&domain.CustomTemplate{}, id)
	return result.Error
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
	if len(jsonData) > 100*1024*1024 { // 100MB limit
		return fmt.Errorf("autosave payload too large: %d bytes (limit 100MB)", len(jsonData))
	}
	path := getSavePath()
	tmpPath := path + ".tmp"
	
	// Clean up tmp file on exit. If rename succeeds, this will quietly do nothing because the file no longer exists at tmpPath.
	defer os.Remove(tmpPath)

	if err := os.WriteFile(tmpPath, []byte(jsonData), 0644); err != nil {
		return fmt.Errorf("failed to write tmp autosave file: %w", err)
	}
	return os.Rename(tmpPath, path)
}

func (a *App) ClearAutoSave() error {
	path := getSavePath()
	err := os.Remove(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// resizeGrayLinear performs linear interpolation resizing on an 8-bit *image.Gray image.
func resizeGrayLinear(src *image.Gray, w, h int) *image.Gray {
	dst := image.NewGray(image.Rect(0, 0, w, h))
	srcBounds := src.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()
	if srcW == 0 || srcH == 0 {
		return dst
	}
	for y := 0; y < h; y++ {
		srcY := float64(y) * float64(srcH) / float64(h)
		y0 := int(srcY)
		y1 := y0 + 1
		if y1 >= srcH {
			y1 = srcH - 1
		}
		dy := srcY - float64(y0)

		y0Stride := y0 * src.Stride
		y1Stride := y1 * src.Stride
		dstStride := y * dst.Stride

		for x := 0; x < w; x++ {
			srcX := float64(x) * float64(srcW) / float64(w)
			x0 := int(srcX)
			x1 := x0 + 1
			if x1 >= srcW {
				x1 = srcW - 1
			}
			dx := srcX - float64(x0)

			val00 := float64(src.Pix[y0Stride+x0])
			val10 := float64(src.Pix[y0Stride+x1])
			val01 := float64(src.Pix[y1Stride+x0])
			val11 := float64(src.Pix[y1Stride+x1])

			val := (1-dy)*((1-dx)*val00+dx*val10) + dy*((1-dx)*val01+dx*val11)
			dst.Pix[dstStride+x] = uint8(val)
		}
	}
	return dst
}

// blurGray performs a highly optimized 3x3 box blur approximation on an 8-bit *image.Gray image.
func blurGray(src *image.Gray) *image.Gray {
	w, h := src.Bounds().Dx(), src.Bounds().Dy()
	dst := image.NewGray(image.Rect(0, 0, w, h))

	for y := 0; y < h; y++ {
		yStride := y * src.Stride
		dstStride := y * dst.Stride

		ym1 := (y - 1)
		if ym1 < 0 {
			ym1 = 0
		}
		ym1Stride := ym1 * src.Stride

		yp1 := (y + 1)
		if yp1 >= h {
			yp1 = h - 1
		}
		yp1Stride := yp1 * src.Stride

		for x := 0; x < w; x++ {
			xm1 := x - 1
			if xm1 < 0 {
				xm1 = 0
			}
			xp1 := x + 1
			if xp1 >= w {
				xp1 = w - 1
			}

			// Weights: center=4, adjacent=2, diagonal=1 (Total = 16)
			sum := uint32(src.Pix[yStride+x]) * 4

			sum += uint32(src.Pix[yStride+xm1]) * 2
			sum += uint32(src.Pix[yStride+xp1]) * 2
			sum += uint32(src.Pix[ym1Stride+x]) * 2
			sum += uint32(src.Pix[yp1Stride+x]) * 2

			sum += uint32(src.Pix[ym1Stride+xm1])
			sum += uint32(src.Pix[ym1Stride+xp1])
			sum += uint32(src.Pix[yp1Stride+xm1])
			sum += uint32(src.Pix[yp1Stride+xp1])

			dst.Pix[dstStride+x] = uint8(sum >> 4) // divide by 16
		}
	}
	return dst
}

func (a *App) ApplyMaskToImage(localImagePath string, maskBase64 string, maskW int, maskH int) (string, error) {
	maskBytes, err := base64.StdEncoding.DecodeString(maskBase64)
	if err != nil {
		return "", fmt.Errorf("decode mask base64: %w", err)
	}

	var srcImg image.Image
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
		decodedSrc = nil // release decoded bytes early
	} else {
		fileName := filepath.Base(filepath.Clean(localImagePath))
		actualImagePath := filepath.Join(mediaDir, fileName)

		// 🔒 Symlink resolution protection check
		resolvedPath, err := filepath.EvalSymlinks(actualImagePath)
		if err != nil {
			return "", fmt.Errorf("eval symlink: %w", err)
		}
		if !strings.HasPrefix(filepath.Clean(resolvedPath), filepath.Clean(mediaDir)) {
			return "", fmt.Errorf("invalid image path: outside media directory")
		}

		if _, err := os.Stat(resolvedPath); err != nil {
			return "", fmt.Errorf("image file not found: %w", err)
		}

		srcImg, err = imaging.Open(resolvedPath)
		if err != nil {
			return "", fmt.Errorf("open original image: %w", err)
		}
	}

	if len(maskBytes) != maskW*maskH {
		return "", fmt.Errorf("mask bytes size mismatch: expected %d, got %d", maskW*maskH, len(maskBytes))
	}

	// 4. Create mask image directly from raw grayscale bytes
	maskImg := &image.Gray{
		Pix:    maskBytes,
		Stride: maskW,
		Rect:   image.Rect(0, 0, maskW, maskH),
	}

	// 5. Resize mask to match original image dimensions if they differ
	srcBounds := srcImg.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()

	var maskResized *image.Gray = maskImg
	if maskW != srcW || maskH != srcH {
		maskResized = resizeGrayLinear(maskImg, srcW, srcH)
	}

	// Apply feathering (blur) directly to the grayscale mask (radius 0.8 / 3x3 box blur)
	maskBlurred := blurGray(maskResized)
	maskResized = nil
	maskImg = nil

	// 6. Convert source image to NRGBA for fast slice access if it's not already
	srcNRGBA, ok := srcImg.(*image.NRGBA)
	if !ok {
		srcNRGBA = imaging.Clone(srcImg)
	}
	srcImg = nil // release original image reference

	outImg := image.NewNRGBA(image.Rect(0, 0, srcW, srcH))

	srcPix := srcNRGBA.Pix
	maskPix := maskBlurred.Pix
	outPix := outImg.Pix

	// Loop over rows and columns using fast direct slice index offsets
	for y := 0; y < srcH; y++ {
		srcRowOffset := y * srcNRGBA.Stride
		maskRowOffset := y * maskBlurred.Stride
		outRowOffset := y * outImg.Stride

		for x := 0; x < srcW; x++ {
			srcIdx := srcRowOffset + x*4
			outIdx := outRowOffset + x*4
			maskIdx := maskRowOffset + x

			alpha := maskPix[maskIdx]

			outPix[outIdx] = srcPix[srcIdx]
			outPix[outIdx+1] = srcPix[srcIdx+1]
			outPix[outIdx+2] = srcPix[srcIdx+2]
			outPix[outIdx+3] = alpha
		}
	}

	// 7. Save output image as PNG using BestSpeed encoder
	newName := fmt.Sprintf("img_%d.png", time.Now().UnixNano())
	newPath := filepath.Join(mediaDir, newName)

	f, err := os.Create(newPath)
	if err != nil {
		return "", fmt.Errorf("create file for saving: %w", err)
	}

	var encodeErr error
	defer func() {
		f.Close()
		if encodeErr != nil {
			os.Remove(newPath) // cleanup on failure
		}
	}()

	encoder := png.Encoder{CompressionLevel: png.BestSpeed}
	encodeErr = encoder.Encode(f, outImg)
	if encodeErr != nil {
		return "", fmt.Errorf("save final image: %w", encodeErr)
	}

	return "/local-image/" + newName, nil
}

func (a *App) EnhanceImageWithAI(base64Image string, token string, limit int) (string, error) {
	// 🔒 Backend rate limit: cap AI enhance calls per user per day
	rateKey := "anonymous"
	if token != "" {
		tokenHash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))[:16]
		rateKey = tokenHash
	}
	if err := aiLimiter.checkAndIncrement(rateKey, limit); err != nil {
		return "", err
	}

	// 1. إذا كان المستخدم مسجلاً لدخوله ومفاتيح Supabase متوفرة، نستخدم خادم Edge Function
	if token != "" && service.SupabaseURL != "" {
		url := service.SupabaseURL + "/functions/v1/ai-enhance"
		payload, err := json.Marshal(map[string]string{
			"image": base64Image,
		})
		if err == nil {
			req, err := http.NewRequest("POST", url, bytes.NewBuffer(payload))
			if err == nil {
				req.Header.Set("Authorization", "Bearer "+token)
				req.Header.Set("Content-Type", "application/json")
				if service.SupabaseAnonKey != "" {
					req.Header.Set("apikey", service.SupabaseAnonKey)
				}

				client := &http.Client{Timeout: 3 * time.Minute}
				resp, err := client.Do(req)
				if err == nil {
					defer resp.Body.Close()
					if resp.StatusCode == http.StatusOK {
						body, readErr := io.ReadAll(resp.Body)
						if readErr == nil {
							return string(body), nil
						}
					}
				} else if resp != nil {
					resp.Body.Close()
				}
			}
		}
	}

	// 2. المسار الاحتياطي الآمن (Direct Go-to-Modal Call):
	// يتم إجراء الطلب المباشر من الخلفية (Go) بدلاً من متصفح JS، مما يحافظ على سرية المفتاح تماماً وتشفيره داخل الـ Binary
	modalURL := service.ModalAIURL
	if modalURL == "" {
		modalURL = "https://wisamsamir78--grido-ai-upscaler-imageenhancer-enhance.modal.run"
	}
	payload, err := json.Marshal(map[string]string{
		"image": base64Image,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", modalURL, bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	if aiKey, err := service.GetModalAIKey(); err == nil && aiKey != "" {
		req.Header.Set("X-Grido-Api-Key", aiKey)
	}

	client := &http.Client{Timeout: 3 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("خطأ في الاتصال بخادم الذكاء الاصطناعي: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("فشل قراءة الرد من الخادم: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errRes struct {
			Error string `json:"error"`
		}
		if err := json.Unmarshal(body, &errRes); err == nil && errRes.Error != "" {
			return "", errors.New(errRes.Error)
		}
		return "", fmt.Errorf("فشل خادم الذكاء الاصطناعي: %d", resp.StatusCode)
	}

	return string(body), nil
}

func (a *App) CheckForUpdate() (*service.UpdateInfo, error) {
	updater := service.NewUpdaterService()
	return updater.CheckForUpdate()
}

func (a *App) DownloadAndInstallUpdate(url string) error {
	updater := service.NewUpdaterService()
	return updater.DownloadAndInstall(a.ctx, url)
}



