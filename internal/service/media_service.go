package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/webp"
	"golang.org/x/sync/errgroup"

	"grido/internal/utils"
)

const MaxFileSize = 50 * 1024 * 1024 // 50MB

var ErrInvalidBase64 = errors.New("invalid base64 payload")

type ImageDimensions struct {
	Width       int  `json:"width"`
	Height      int  `json:"height"`
	Orientation int  `json:"orientation"`
	IsRotated   bool `json:"isRotated"`
}

type MediaService struct{}

func NewMediaService() *MediaService {
	return &MediaService{}
}

// readExifOrientation يستخرج وسم اتجاه الكاميرا (EXIF Orientation 1..8) من صور JPEG
// بسرعة فائقة عبر فحص الترويسة فقط دون فك تشفير البكسلات — يدفع العبء عن V8 والمتصفح
func readExifOrientation(r io.ReadSeeker) int {
	if _, err := r.Seek(0, io.SeekStart); err != nil {
		return 1
	}

	var header [2]byte
	if _, err := io.ReadFull(r, header[:]); err != nil || header[0] != 0xFF || header[1] != 0xD8 {
		return 1 // ليس JPEG
	}

	for {
		var marker [2]byte
		if _, err := io.ReadFull(r, marker[:]); err != nil {
			return 1
		}
		if marker[0] != 0xFF {
			return 1
		}

		for marker[1] == 0xFF {
			if _, err := io.ReadFull(r, marker[1:]); err != nil {
				return 1
			}
		}

		if marker[1] == 0xDA || marker[1] == 0xD9 { // SOS أو EOI
			return 1
		}

		var lengthBytes [2]byte
		if _, err := io.ReadFull(r, lengthBytes[:]); err != nil {
			return 1
		}
		length := int(binary.BigEndian.Uint16(lengthBytes[:]))
		if length < 2 {
			return 1
		}

		if marker[1] == 0xE1 { // APP1 (EXIF)
			data := make([]byte, length-2)
			if _, err := io.ReadFull(r, data); err != nil {
				return 1
			}
			if len(data) >= 14 && string(data[:6]) == "Exif\x00\x00" {
				tiffData := data[6:]
				var byteOrder binary.ByteOrder
				if string(tiffData[:2]) == "II" {
					byteOrder = binary.LittleEndian
				} else if string(tiffData[:2]) == "MM" {
					byteOrder = binary.BigEndian
				} else {
					return 1
				}

				if byteOrder.Uint16(tiffData[2:4]) != 42 {
					return 1
				}

				firstIFDOffset := int(byteOrder.Uint32(tiffData[4:8]))
				if firstIFDOffset < 8 || firstIFDOffset >= len(tiffData) {
					return 1
				}

				entriesOffset := firstIFDOffset
				if entriesOffset+2 > len(tiffData) {
					return 1
				}
				numEntries := int(byteOrder.Uint16(tiffData[entriesOffset : entriesOffset+2]))
				entriesOffset += 2

				for i := 0; i < numEntries; i++ {
					entryStart := entriesOffset + i*12
					if entryStart+12 > len(tiffData) {
						break
					}
					tag := byteOrder.Uint16(tiffData[entryStart : entryStart+2])
					if tag == 0x0112 { // Orientation Tag
						format := byteOrder.Uint16(tiffData[entryStart+2 : entryStart+4])
						if format == 3 { // SHORT
							orientation := int(byteOrder.Uint16(tiffData[entryStart+8 : entryStart+10]))
							if orientation >= 1 && orientation <= 8 {
								return orientation
							}
						}
					}
				}
			}
			return 1
		}

		if _, err := r.Seek(int64(length-2), io.SeekCurrent); err != nil {
			return 1
		}
	}
}

func (s *MediaService) GetImageDimensions(localPath string) (ImageDimensions, error) {
	normalized := strings.ReplaceAll(localPath, "\\", "/")
	filename := filepath.Base(filepath.Clean(strings.TrimPrefix(normalized, "/local-image/")))
	var baseDir string

	// معاينات الطباعة (print_*) تُوجَّه لمجلد Exports في main.go —
	// فحص baseDir هنا يمنع فشل قراءة أبعاد صور المعاينة ويحمي ضد Path Traversal
	if strings.HasPrefix(filename, "print_") {
		baseDir = filepath.Join(utils.GetAppDir(), "Exports")
	} else {
		baseDir = s.GetMediaDir()
	}
	fullPath := filepath.Join(baseDir, filename)

	resolved, err := filepath.EvalSymlinks(fullPath)
	if err != nil {
		resolved = fullPath
	}
	resolvedBase, err := filepath.EvalSymlinks(baseDir)
	if err == nil {
		baseDir = resolvedBase
	}
	if !strings.HasPrefix(filepath.Clean(resolved), filepath.Clean(baseDir)+string(filepath.Separator)) {
		return ImageDimensions{}, fmt.Errorf("invalid path: outside allowed directory")
	}

	f, err := os.Open(resolved)
	if err != nil {
		return ImageDimensions{}, fmt.Errorf("open image file: %w", err)
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return ImageDimensions{}, fmt.Errorf("decode image config: %w", err)
	}

	orientation := readExifOrientation(f)
	isRotated := orientation >= 5 && orientation <= 8

	return ImageDimensions{
		Width:       cfg.Width,
		Height:      cfg.Height,
		Orientation: orientation,
		IsRotated:   isRotated,
	}, nil
}

// GetBatchImageDimensions يسترجع أبعاد وتوجيه مجموعة صور دفعة واحدة وبسرعة فائقة
func (s *MediaService) GetBatchImageDimensions(localPaths []string) map[string]ImageDimensions {
	res := make(map[string]ImageDimensions)
	for _, p := range localPaths {
		dims, err := s.GetImageDimensions(p)
		if err == nil {
			res[p] = dims
		}
	}
	return res
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
	switch strings.ToLower(mimeType) {
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "image/bmp", "image/x-windows-bmp":
		return ".bmp"
	case "image/tiff", "image/x-tiff":
		return ".tiff"
	case "image/svg+xml":
		return ".svg"
	default:
		return ".jpg"
	}
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

	// Prevent extension bypass by enforcing extension from MIME type
	ext := s.GetExtensionFromMime(detectedType)
	newName := fmt.Sprintf("img_%d%s", time.Now().UnixNano(), ext)
	newPath := filepath.Join(mediaDir, newName)

	// كتابة ذرية موحّدة: ملف مؤقت + fsync + rename — النسخ المباشر كان يترك
	// ملفاً تالفاً/0 بايت عند انقطاع مفاجئ أثناء النقل
	af, err := utils.CreateAtomic(newPath, 0o644)
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	defer af.Abort()

	if _, err := io.Copy(af, srcFile); err != nil {
		return "", fmt.Errorf("copy file: %w", err)
	}
	if err := af.Commit(); err != nil {
		return "", fmt.Errorf("finalize media file: %w", err)
	}

	return "/local-image/" + newName, nil
}

func (s *MediaService) ProcessMultipleOpenedFiles(filePaths []string) ([]string, error) {
	// 🚀 معالجة متوازية بعدد أنوية المعالج (errgroup.SetLimit) — كانت تسلسلية
	// مع fsync لكل ملف على حدة فتستغرق N×(نسخ+مزامنة) لعشرات الصور المحددة
	g, ctx := errgroup.WithContext(context.Background())
	g.SetLimit(runtime.NumCPU())

	mediaDir := s.GetMediaDir()
	results := make([]string, len(filePaths))
	skippedNames := make([]string, 0)
	var mu sync.Mutex

	for i, filePath := range filePaths {
		i, filePath := i, filePath
		g.Go(func() error {
			select {
			case <-ctx.Done():
				return nil
			default:
			}

			stat, err := os.Stat(filePath)
			if err != nil {
				mu.Lock()
				skippedNames = append(skippedNames, filepath.Base(filePath))
				mu.Unlock()
				slog.Warn("Skipped file in multi-select: stat error", "file", filepath.Base(filePath), "error", err)
				return nil
			}
			if stat.Size() > MaxFileSize {
				mu.Lock()
				skippedNames = append(skippedNames, filepath.Base(filePath))
				mu.Unlock()
				slog.Warn("Skipped file in multi-select: exceeds size limit", "file", filepath.Base(filePath), "size", stat.Size())
				return nil
			}

			srcFile, err := os.Open(filePath)
			if err != nil {
				mu.Lock()
				skippedNames = append(skippedNames, filepath.Base(filePath))
				mu.Unlock()
				slog.Warn("Skipped file in multi-select: open error", "file", filepath.Base(filePath), "error", err)
				return nil
			}
			defer srcFile.Close()

			buf := make([]byte, 512)
			n, err := srcFile.Read(buf)
			if err != nil && err != io.EOF {
				mu.Lock()
				skippedNames = append(skippedNames, filepath.Base(filePath))
				mu.Unlock()
				slog.Warn("Skipped file in multi-select: read error", "file", filepath.Base(filePath), "error", err)
				return nil
			}

			detectedType := http.DetectContentType(buf[:n])
			if !strings.HasPrefix(detectedType, "image/") {
				mu.Lock()
				skippedNames = append(skippedNames, filepath.Base(filePath))
				mu.Unlock()
				slog.Warn("Skipped file in multi-select: not an image", "file", filepath.Base(filePath), "detected", detectedType)
				return nil
			}

			_, _ = srcFile.Seek(0, io.SeekStart)

			// Prevent extension bypass
			ext := s.GetExtensionFromMime(detectedType)
			// UnixNano فريد لكل نداء لكن التوازي قد يجلب نفس النانو — الفهرس i
			// يضمن التفرد (وهو أيضاً ما يحفظ ترتيب النتائج مطابقاً لترتيب التحديد)
			newName := fmt.Sprintf("img_%d_%d%s", time.Now().UnixNano(), i, ext)
			newPath := filepath.Join(mediaDir, newName)

			// كتابة ذرية موحّدة (utils.AtomicFile) — الاسم فريد لكل عنصر
			// فيبقى كاتب واحد لكل مسار هدف حتى مع التوازي
			af, err := utils.CreateAtomic(newPath, 0o644)
			if err != nil {
				mu.Lock()
				skippedNames = append(skippedNames, filepath.Base(filePath))
				mu.Unlock()
				slog.Warn("Skipped file in multi-select: dest create error", "file", filepath.Base(filePath), "error", err)
				return nil
			}

			_, copyErr := io.Copy(af, srcFile)

			if copyErr != nil {
				af.Abort()
				mu.Lock()
				skippedNames = append(skippedNames, filepath.Base(filePath))
				mu.Unlock()
				slog.Warn("Skipped file in multi-select: write error", "file", filepath.Base(filePath), "copyErr", copyErr)
				return nil
			}

			if err := af.Commit(); err != nil {
				mu.Lock()
				skippedNames = append(skippedNames, filepath.Base(filePath))
				mu.Unlock()
				slog.Warn("Skipped file in multi-select: commit error", "file", filepath.Base(filePath), "error", err)
				return nil
			}

			results[i] = "/local-image/" + newName
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	// تجميع النتائج بترتيب التحديد الأصلي — النتائج الفارغة (الملفات المتخطاة) تُسقط
	loaded := make([]string, 0, len(filePaths))
	for _, r := range results {
		if r != "" {
			loaded = append(loaded, r)
		}
	}

	if len(skippedNames) > 0 {
		slog.Warn("Some files were skipped during multi-select", "skipped", skippedNames, "total", len(filePaths), "loaded", len(loaded))
	}

	return loaded, nil
}

// isOpaqueBinaryContent: تنسيقات صور لا يميّزها net/http (TIFF/AVIF/HEIC/JXL…)
// تُكتشف كبايتات غير معروفة. نسمح بها اعتماداً على النوع المُعلن لأنها بيانات
// ثنائية لا تُنفَّذ — رفضها كان يمنع حفظ صور مشروعة من الحافظة.
func isOpaqueBinaryContent(detected string) bool {
	return detected == "application/octet-stream"
}

func (s *MediaService) SaveImageFromBase64(base64Data string) (string, error) {
	decoded, mimeType, err := s.DecodeBase64Image(base64Data)
	if err != nil {
		return "", err
	}

	// 🛡️ لا نثق بنوع MIME المُعلن من العميل: نتحقق من المحتوى الفعلي. بدونه كان
	// يمكن كتابة أي محتوى (نص/HTML/JS) في مجلد الوسائط الذي يخدمه مخدّم الأصول.
	detected := http.DetectContentType(decoded)
	declared := strings.ToLower(strings.TrimSpace(mimeType))
	isDetectedImage := strings.HasPrefix(detected, "image/")

	head := decoded
	if len(head) > 512 {
		head = head[:512]
	}
	// SVG مشروع: يكتشفه net/http كنص/xml — نقبله فقط إن كان وسم SVG فعلياً
	looksLikeSvg := strings.Contains(declared, "svg") &&
		(bytes.Contains(head, []byte("<svg")) || bytes.Contains(head, []byte("<SVG")) ||
			bytes.Contains(head, []byte("<?xml")))

	switch {
	case !strings.HasPrefix(declared, "image/"):
		return "", fmt.Errorf("refusing to store non-image payload (declared %q)", mimeType)
	case !isDetectedImage && !looksLikeSvg && !isOpaqueBinaryContent(detected):
		// نص/HTML/JSON مُعلَن كصورة — لا يُكتب على القرص بامتداد صورة
		return "", fmt.Errorf("refusing to store %q content declared as %q", detected, mimeType)
	}

	mediaDir := s.GetMediaDir()
	// الامتداد من المحتوى المكتشف لا من ادعاء العميل (منع حقن الامتدادات)
	ext := s.GetExtensionFromMime(mimeType)
	if isDetectedImage {
		ext = s.GetExtensionFromMime(detected)
	}
	newName := fmt.Sprintf("img_%d%s", time.Now().UnixNano(), ext)
	newPath := filepath.Join(mediaDir, newName)

	// كتابة ذرية موحّدة (utils.AtomicWriteFile)
	if err := utils.AtomicWriteFile(newPath, decoded, 0o644); err != nil {
		return "", fmt.Errorf("save decoded image: %w", err)
	}

	return "/local-image/" + newName, nil
}

func (s *MediaService) ProcessDirectoryImages(dirPath string) ([]string, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("read dir: %w", err)
	}

	validExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
		".bmp":  true,
		".gif":  true,
		".tiff": true,
		".tif":  true,
	}

	var imagePaths []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if validExts[ext] {
			imagePaths = append(imagePaths, filepath.Join(dirPath, entry.Name()))
		}
	}

	if len(imagePaths) == 0 {
		return []string{}, nil
	}

	// سقف الدفعة: مجلد بآلاف الصور كان يطفح طابور goroutines ونتائج RAM —
	// SetLimit يقيد التنفيذ لكن كل المهام + fsync تُحجز مسبقاً
	const maxDirectoryBatch = 500
	if len(imagePaths) > maxDirectoryBatch {
		return nil, fmt.Errorf("too many images in directory: %d (max %d)", len(imagePaths), maxDirectoryBatch)
	}

	return s.ProcessMultipleOpenedFiles(imagePaths)
}

type MediaStorageStats struct {
	Count      int   `json:"count"`
	TotalBytes int64 `json:"totalBytes"`
}

func (s *MediaService) GetStorageStats() (MediaStorageStats, error) {
	mediaDir := s.GetMediaDir()
	entries, err := os.ReadDir(mediaDir)
	if err != nil {
		if os.IsNotExist(err) {
			return MediaStorageStats{}, nil
		}
		return MediaStorageStats{}, err
	}

	var stats MediaStorageStats
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err == nil {
			stats.Count++
			stats.TotalBytes += info.Size()
		}
	}
	return stats, nil
}
