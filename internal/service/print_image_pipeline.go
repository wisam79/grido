package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"io"
	"log/slog"
	"math"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/disintegration/imaging"
	"golang.org/x/sync/singleflight"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_image_pipeline.go — خط أنابيب معالجة صور الطباعة
//
// كاشان LRU (خام/معالج) بمنع تكرار التحميل الجاري عبر sync.Cond،
// حل المسارات الآمن، الاقتصاص والتدوير والفلاتر المطابقة للمحرر (WYSIWYG).
// ─────────────────────────────────────────────────────────────────────────────

func resolveLocalPath(src string) string {
	if strings.HasPrefix(src, "/local-image/") {
		filename := filepath.Base(filepath.Clean(strings.TrimPrefix(src, "/local-image/")))
		appDir := utils.GetAppDir()
		mediaDir := filepath.Join(appDir, "Media")
		fullPath := filepath.Join(mediaDir, filename)

		resolved, err := filepath.EvalSymlinks(fullPath)
		if err != nil {
			return fullPath
		}
		if !strings.HasPrefix(filepath.Clean(resolved), filepath.Clean(mediaDir)+string(filepath.Separator)) {
			slog.Warn("Blocked path traversal attempt in resolveLocalPath", "path", src)
			return ""
		}
		return resolved
	}
	return src
}

func applyColorAdjustments(img image.Image, brightness, contrast, saturation float64) image.Image {
	if brightness != 100 {
		img = imaging.AdjustBrightness(img, brightness-100)
	}
	if contrast != 100 {
		img = imaging.AdjustContrast(img, contrast-100)
	}
	if saturation != 100 {
		img = imaging.AdjustSaturation(img, saturation-100)
	}
	return img
}

func applyFilter(img image.Image, filter string) image.Image {
	switch filter {
	case "grayscale":
		return imaging.Grayscale(img)
	case "invert":
		return imaging.Invert(img)
	case "blur":
		return imaging.Blur(img, 4.0)
	case "sepia":
		return applySepia(img)
	case "enhance":
		img = imaging.AdjustContrast(img, 8)
		img = imaging.AdjustSaturation(img, 12)
		img = imaging.AdjustBrightness(img, 2)
		return img
	case "skinGlow":
		// مطابق حرفياً لتعريف CSS في frontend/src/lib/templates/constants.ts —
		// أي تأثير إضافي هنا يكسر مبدأ WYSIWYG (المعاينة وتصدير الصور يعتمدان CSS)
		img = imaging.AdjustBrightness(img, 6)
		img = imaging.AdjustContrast(img, -6)
		img = imaging.AdjustSaturation(img, 8)
		img = applySepiaRatio(img, 0.10)
		return img
	case "clarity":
		img = imaging.AdjustContrast(img, 22)
		img = imaging.AdjustSaturation(img, 20)
		img = imaging.AdjustBrightness(img, -2)
		return img
	case "lowlight":
		img = imaging.AdjustBrightness(img, 16)
		img = imaging.AdjustContrast(img, -10)
		img = imaging.AdjustSaturation(img, 5)
		return img
	case "cinematic":
		img = imaging.AdjustContrast(img, 10)
		img = imaging.AdjustSaturation(img, 15)
		img = applySepiaRatio(img, 0.05)
		img = imaging.AdjustBrightness(img, 2)
		return img
	case "monoPro":
		img = imaging.Grayscale(img)
		img = imaging.AdjustContrast(img, 25)
		img = imaging.AdjustBrightness(img, 2)
		return img
	}
	return img
}

func applySepia(img image.Image) image.Image {
	return applySepiaRatio(img, 1.0)
}

func applySepiaRatio(img image.Image, ratio float64) image.Image {
	return imaging.AdjustFunc(img, func(c color.NRGBA) color.NRGBA {
		r := float64(c.R)
		g := float64(c.G)
		b := float64(c.B)

		tr := (r * 0.393) + (g * 0.769) + (b * 0.189)
		tg := (r * 0.349) + (g * 0.686) + (b * 0.168)
		tb := (r * 0.272) + (g * 0.534) + (b * 0.131)

		if tr > 255 {
			tr = 255
		}
		if tg > 255 {
			tg = 255
		}
		if tb > 255 {
			tb = 255
		}

		outR := r + (tr-r)*ratio
		outG := g + (tg-g)*ratio
		outB := b + (tb-b)*ratio

		return color.NRGBA{R: uint8(outR), G: uint8(outG), B: uint8(outB), A: c.A}
	})
}

type processedKey struct {
	filePath   string
	brightness float64
	contrast   float64
	saturation float64
	filter     string
	targetW    int
	targetH    int
	cropX      float64
	cropY      float64
	cropW      float64
	cropH      float64
	flipX      bool
	flipY      bool
	rotation   float64
	slotAspect float64
	zoom       float64
	dragX      float64
	dragY      float64
}

type imageCache struct {
	mu     sync.RWMutex
	images map[string]image.Image
	access map[string]time.Time
	group  singleflight.Group
}

type processedCache struct {
	mu     sync.RWMutex
	images map[processedKey]image.Image
	access map[processedKey]time.Time
	group  singleflight.Group
}

// computeImageCacheKey يحسب مفتاح كاش للصورة (مع تجنب Hash كامل لـ Base64 الضخمة)
func computeImageCacheKey(filePath string) string {
	if strings.HasPrefix(filePath, "data:image/") {
		if len(filePath) > 1024 {
			h := sha256.New()
			h.Write([]byte(filePath[:512]))
			h.Write([]byte(filePath[len(filePath)-512:]))
			return fmt.Sprintf("b64_%x_len%d", h.Sum(nil), len(filePath))
		}
		return fmt.Sprintf("b64_%x", sha256.Sum256([]byte(filePath)))
	}
	return filePath
}

// loadRawImage يفتح الصورة من ملف أو Base64 مع كاش LRU ومنع تكرار التحميل الجاري (In-Flight Deduplication) عبر singleflight
func loadRawImage(filePath string, cacheKey string, imgCache *imageCache) (image.Image, error) {
	imgCache.mu.RLock()
	if cachedRaw, ok := imgCache.images[cacheKey]; ok {
		imgCache.mu.RUnlock()
		imgCache.mu.Lock()
		imgCache.access[cacheKey] = time.Now()
		imgCache.mu.Unlock()
		return cachedRaw, nil
	}
	imgCache.mu.RUnlock()

	res, err, _ := imgCache.group.Do(cacheKey, func() (interface{}, error) {
		imgCache.mu.RLock()
		if cachedRaw, ok := imgCache.images[cacheKey]; ok {
			imgCache.mu.RUnlock()
			return cachedRaw, nil
		}
		imgCache.mu.RUnlock()

		var img image.Image
		var err error

		if strings.HasPrefix(filePath, "data:image/") {
			commaIdx := strings.Index(filePath, ",")
			if commaIdx == -1 {
				return nil, fmt.Errorf("invalid base64 image format")
			}
			b64Data := filePath[commaIdx+1:]
			if len(b64Data) > 50*1024*1024 {
				return nil, fmt.Errorf("base64 image data too large: %d bytes (max %d)", len(b64Data), 50*1024*1024)
			}
			data, err := base64.StdEncoding.DecodeString(b64Data)
			if err != nil {
				return nil, fmt.Errorf("failed to decode base64 image: %w", err)
			}
			img, err = imaging.Decode(io.LimitReader(bytes.NewReader(data), 100*1024*1024))
			if err != nil {
				return nil, fmt.Errorf("failed to decode image from base64 data: %w", err)
			}
		} else {
			img, err = imaging.Open(filePath)
			if err != nil {
				return nil, fmt.Errorf("failed to open image %s: %w", filepath.Base(filePath), err)
			}
		}

		imgCache.mu.Lock()
		if len(imgCache.images) >= 8 {
			var oldestKey string
			var oldestTime time.Time
			first := true
			for k := range imgCache.images {
				t := imgCache.access[k]
				if first || t.Before(oldestTime) {
					oldestTime = t
					oldestKey = k
					first = false
				}
			}
			delete(imgCache.images, oldestKey)
			delete(imgCache.access, oldestKey)
		}
		imgCache.images[cacheKey] = img
		imgCache.access[cacheKey] = time.Now()
		imgCache.mu.Unlock()

		return img, nil
	})

	if err != nil {
		return nil, err
	}
	return res.(image.Image), nil
}

// isQuarterRotation يعيد true عندما يكون التدوير 90° أو 270° (mod 360)
// — عندها يتبدل بُعد الصورة المعالجة وتُرسم متمركزة على الخلية
func isQuarterRotation(rotation float64) bool {
	rotDeg := int(math.Round(rotation)) % 360
	if rotDeg < 0 {
		rotDeg += 360
	}
	return rotDeg == 90 || rotDeg == 270
}

// computeCropFromSlot يحسب منطقة الاقتصاص بناءً على نسبة الخانة والزوم والسحب
func computeCropFromSlot(item domain.PrintItem, img image.Image) (cropX, cropY, cropW, cropH float64) {
	cropX = item.CropX
	cropY = item.CropY
	cropW = item.CropW
	cropH = item.CropH

	if (cropW <= 0 || cropH <= 0) && item.SlotAspect > 0 {
		imgW := float64(img.Bounds().Dx())
		imgH := float64(img.Bounds().Dy())
		imgAspect := imgW / imgH
		slotAspect := item.SlotAspect
		// 🛡️ إصلاح: عند التدوير 90/270 تتبدل نسبة الخلية الفعالة — Konva يبدّلها
		// (isRotated90or270 ? height/width : width/height) قبل حساب نافذة القصّ،
		// فكانت الطباعة تقصّ الخلايا المدوّرة بنسبة خاطئة مقابل المحرر
		if isQuarterRotation(item.Rotation) {
			slotAspect = 1 / slotAspect
		}

		sw := imgW
		sh := imgH

		if imgAspect > slotAspect {
			sw = imgH * slotAspect
		} else {
			sh = imgW / slotAspect
		}

		zoomVal := item.Zoom
		if zoomVal <= 0 {
			zoomVal = 1
		}

		sw = sw / zoomVal
		sh = sh / zoomVal

		defaultSx := 0.0
		defaultSy := 0.0
		if imgAspect > slotAspect {
			defaultSx = (imgW - sw) / 2
		} else {
			defaultSy = (imgH - sh) / 2
		}

		maxDragX := (imgW - sw) / 2
		maxDragY := (imgH - sh) / 2

		dragXClamped := math.Max(-maxDragX, math.Min(maxDragX, item.DragX))
		dragYClamped := math.Max(-maxDragY, math.Min(maxDragY, item.DragY))

		cropX = defaultSx + dragXClamped
		cropY = defaultSy + dragYClamped
		cropW = sw
		cropH = sh
	}

	return cropX, cropY, cropW, cropH
}

// applyImageProcessing يطبق التحجيم والاقتصاص والمرشحات على الصورة
func applyImageProcessing(img image.Image, item domain.PrintItem, targetW, targetH int) image.Image {
	cropX, cropY, cropW, cropH := computeCropFromSlot(item, img)

	if cropW > 0 && cropH > 0 {
		bounds := img.Bounds()
		imgW := float64(bounds.Dx())
		imgH := float64(bounds.Dy())

		// 🛡️ ضغط منطقة الاقتصاص داخل حدود الصورة — يمنع انهيار imaging.Crop
		// خارج النطاق عند وصول بيانات اقتصاص من واجهة لا تتطابق مع الصورة الحالية
		if cropX < 0 {
			cropW += cropX
			cropX = 0
		}
		if cropY < 0 {
			cropH += cropY
			cropY = 0
		}
		if cropX+cropW > imgW {
			cropW = imgW - cropX
		}
		if cropY+cropH > imgH {
			cropH = imgH - cropY
		}

		if cropW <= 0 || cropH <= 0 {
			return imaging.Resize(img, targetW, targetH, imaging.Lanczos)
		}

		rect := image.Rect(
			int(math.Round(cropX)),
			int(math.Round(cropY)),
			int(math.Round(cropX+cropW)),
			int(math.Round(cropY+cropH)),
		)
		img = imaging.Crop(img, rect)
	}

	// 🛡️ إصلاح: تدوير الصورة قبل التحجيم وتبديل الأبعاد المستهدفة عند 90/270 درجة
	// كان التدوير يُطبّق بعد التحجيم مما يسبب عدم تطابق الأبعاد للصور المدوّرة 90/270
	if item.Rotation != 0 {
		// 🛡️ إصلاح: imaging.Rotate يدور عكس عقارب الساعة للزوايا الموجبة، بينما
		// Konva/CSS/Canvas تدور مع عقارب الساعة — النفي يجعل الطباعة تطابق المحرر
		img = imaging.Rotate(img, -item.Rotation, color.Transparent)
		rotDeg := int(math.Round(item.Rotation)) % 360
		rotAbs := rotDeg
		if rotAbs < 0 {
			rotAbs = -rotAbs
		}
		if rotAbs == 90 || rotAbs == 270 {
			targetW, targetH = targetH, targetW
		}
	}

	bounds := img.Bounds()
	var resizedImg image.Image
	if bounds.Dx() == targetW && bounds.Dy() == targetH {
		resizedImg = img
	} else {
		resizedImg = imaging.Resize(img, targetW, targetH, imaging.Lanczos)
	}

	adjustedImg := applyColorAdjustments(resizedImg, item.Brightness, item.Contrast, item.Saturation)
	processedImg := applyFilter(adjustedImg, item.Filter)
	if item.FlipX {
		processedImg = imaging.FlipH(processedImg)
	}
	if item.FlipY {
		processedImg = imaging.FlipV(processedImg)
	}

	return processedImg
}

// loadAndProcessImage يقوم بفتح الصورة ومعالجة ألوانها وأبعادها مع إدارة الذاكرة بنظام LRU وتفادي تكرار المعالجة الجارية
func (s *PrintService) loadAndProcessImage(
	item domain.PrintItem,
	dpi int,
	imgCache *imageCache,
	procCache *processedCache,
) (image.Image, error) {
	filePath := resolveLocalPath(item.ImageSrc)
	targetW := int(math.Round(mmToPx(item.W, dpi)))
	targetH := int(math.Round(mmToPx(item.H, dpi)))

	cacheKey := computeImageCacheKey(filePath)

	pKey := processedKey{
		filePath:   cacheKey,
		brightness: item.Brightness,
		contrast:   item.Contrast,
		saturation: item.Saturation,
		filter:     item.Filter,
		targetW:    targetW,
		targetH:    targetH,
		cropX:      item.CropX,
		cropY:      item.CropY,
		cropW:      item.CropW,
		cropH:      item.CropH,
		flipX:      item.FlipX,
		flipY:      item.FlipY,
		rotation:   item.Rotation,
		slotAspect: item.SlotAspect,
		zoom:       item.Zoom,
		dragX:      item.DragX,
		dragY:      item.DragY,
	}

	procCache.mu.RLock()
	if cached, ok := procCache.images[pKey]; ok {
		procCache.mu.RUnlock()
		procCache.mu.Lock()
		procCache.access[pKey] = time.Now()
		procCache.mu.Unlock()
		return cached, nil
	}
	procCache.mu.RUnlock()

	flightKey := fmt.Sprintf("%+v", pKey)
	res, err, _ := procCache.group.Do(flightKey, func() (interface{}, error) {
		procCache.mu.RLock()
		if cached, ok := procCache.images[pKey]; ok {
			procCache.mu.RUnlock()
			return cached, nil
		}
		procCache.mu.RUnlock()

		img, err := loadRawImage(filePath, cacheKey, imgCache)
		if err != nil {
			return nil, err
		}

		effW := targetW
		if effW <= 0 {
			effW = 1
		}
		effH := targetH
		if effH <= 0 {
			effH = 1
		}

		processedImg := applyImageProcessing(img, item, effW, effH)

		procCache.mu.Lock()
		if len(procCache.images) >= 16 {
			var oldestKey processedKey
			var oldestTime time.Time
			first := true
			for k := range procCache.images {
				t := procCache.access[k]
				if first || t.Before(oldestTime) {
					oldestTime = t
					oldestKey = k
					first = false
				}
			}
			delete(procCache.images, oldestKey)
			delete(procCache.access, oldestKey)
		}
		procCache.images[pKey] = processedImg
		procCache.access[pKey] = time.Now()
		procCache.mu.Unlock()

		return processedImg, nil
	})

	if err != nil {
		return nil, err
	}
	return res.(image.Image), nil
}
