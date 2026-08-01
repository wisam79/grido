package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"html"
	"io"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"log/slog"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"golang.org/x/image/tiff"
	"golang.org/x/sync/errgroup"

	"grido/internal/core/domain"
	"grido/internal/utils"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"
)

// ConvertRGBAtoCMYK converts an image.Image to an image.CMYK instance using parallel workers and direct slice access
func ConvertRGBAtoCMYK(src image.Image) *image.CMYK {
	bounds := src.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	cmykImg := image.NewCMYK(image.Rect(0, 0, w, h))

	rgba, isRGBA := src.(*image.RGBA)
	numCPU := runtime.NumCPU()
	if numCPU < 1 {
		numCPU = 1
	}

	var wg sync.WaitGroup
	rowsPerWorker := (h + numCPU - 1) / numCPU

	for worker := 0; worker < numCPU; worker++ {
		startY := worker * rowsPerWorker
		endY := startY + rowsPerWorker
		if endY > h {
			endY = h
		}
		if startY >= endY {
			continue
		}

		wg.Add(1)
		go func(sy, ey int) {
			defer wg.Done()
			if isRGBA {
				for y := sy; y < ey; y++ {
					srcOffset := y * rgba.Stride
					dstOffset := y * cmykImg.Stride
					for x := 0; x < w; x++ {
						r := rgba.Pix[srcOffset+x*4]
						g := rgba.Pix[srcOffset+x*4+1]
						b := rgba.Pix[srcOffset+x*4+2]
						c, m, yVal, k := color.RGBToCMYK(r, g, b)
						cmykOffset := dstOffset + x*4
						cmykImg.Pix[cmykOffset] = c
						cmykImg.Pix[cmykOffset+1] = m
						cmykImg.Pix[cmykOffset+2] = yVal
						cmykImg.Pix[cmykOffset+3] = k
					}
				}
			} else {
				for y := sy; y < ey; y++ {
					dstOffset := y * cmykImg.Stride
					for x := 0; x < w; x++ {
						r, g, b, _ := src.At(x, y).RGBA()
						c, m, yVal, k := color.RGBToCMYK(uint8(r>>8), uint8(g>>8), uint8(b>>8))
						cmykOffset := dstOffset + x*4
						cmykImg.Pix[cmykOffset] = c
						cmykImg.Pix[cmykOffset+1] = m
						cmykImg.Pix[cmykOffset+2] = yVal
						cmykImg.Pix[cmykOffset+3] = k
					}
				}
			}
		}(startY, endY)
	}
	wg.Wait()

	return cmykImg
}

// ApplyPureBlackCutLines enforces pure black (C:0 M:0 Y:0 K:255) for cut lines in CMYK space
func ApplyPureBlackCutLines(cmykImg *image.CMYK, req domain.PrintRequest) {
	if !req.ShowCutLines || len(req.CutLines) == 0 {
		return
	}

	lineWidth := mmToPx(0.25, req.DPI)
	if lineWidth < 1.0 {
		lineWidth = 1.0
	}

	bounds := cmykImg.Bounds()
	maxW, maxH := bounds.Dx(), bounds.Dy()
	pureBlack := color.CMYK{C: 0, M: 0, Y: 0, K: 255}

	for _, line := range req.CutLines {
		x1 := int(math.Round(mmToPx(line.X1, req.DPI)))
		y1 := int(math.Round(mmToPx(line.Y1, req.DPI)))
		x2 := int(math.Round(mmToPx(line.X2, req.DPI)))
		y2 := int(math.Round(mmToPx(line.Y2, req.DPI)))

		halfW := int(math.Round(lineWidth / 2.0))
		if halfW < 1 {
			halfW = 1
		}

		if x1 == x2 { // Vertical cut line
			for y := math.Max(0, float64(y1)); y <= math.Min(float64(maxH-1), float64(y2)); y++ {
				for dx := -halfW; dx <= halfW; dx++ {
					px := x1 + dx
					if px >= 0 && px < maxW {
						cmykImg.SetCMYK(px, int(y), pureBlack)
					}
				}
			}
		} else if y1 == y2 { // Horizontal cut line
			for x := math.Max(0, float64(x1)); x <= math.Min(float64(maxW-1), float64(x2)); x++ {
				for dy := -halfW; dy <= halfW; dy++ {
					py := y1 + dy
					if py >= 0 && py < maxH {
						cmykImg.SetCMYK(int(x), py, pureBlack)
					}
				}
			}
		}
	}
}

type PrintService struct{}

func NewPrintService() *PrintService {
	return &PrintService{}
}

func parseColor(hex string) color.Color {
	hex = strings.TrimSpace(strings.TrimPrefix(hex, "#"))
	if strings.ToLower(hex) == "transparent" {
		return color.Transparent
	}
	if len(hex) == 3 {
		var r, g, b uint8
		fmt.Sscanf(hex, "%1x%1x%1x", &r, &g, &b)
		return color.RGBA{R: r * 17, G: g * 17, B: b * 17, A: 255}
	}
	if len(hex) == 4 {
		var r, g, b, a uint8
		fmt.Sscanf(hex, "%1x%1x%1x%1x", &r, &g, &b, &a)
		return color.RGBA{R: r * 17, G: g * 17, B: b * 17, A: a * 17}
	}
	if len(hex) == 6 {
		var r, g, b uint8
		fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
		return color.RGBA{R: r, G: g, B: b, A: 255}
	}
	if len(hex) == 8 {
		var r, g, b, a uint8
		fmt.Sscanf(hex, "%02x%02x%02x%02x", &r, &g, &b, &a)
		return color.RGBA{R: r, G: g, B: b, A: a}
	}
	return color.White
}

func mmToPx(mm float64, dpi int) float64 {
	return (mm * float64(dpi)) / 25.4
}

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
		img = imaging.AdjustBrightness(img, 6)
		img = imaging.AdjustContrast(img, -6)
		img = imaging.AdjustSaturation(img, 8)
		img = applySepiaRatio(img, 0.10)
		img = applySkinGlowBlur(img)
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

func isSkinColor(r, g, b uint8) bool {
	if r <= 95 || g <= 40 || b <= 20 || r <= g || r <= b {
		return false
	}
	min := g
	if b < g {
		min = b
	}
	return (r-min) > 15 && (r-g) > 15
}

func applySkinGlowBlur(img image.Image) image.Image {
	srcNRGBA := imaging.Clone(img)
	bounds := srcNRGBA.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	orig := make([]uint8, len(srcNRGBA.Pix))
	copy(orig, srcNRGBA.Pix)

	isSkin := make([]bool, width*height)
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			idx := (y*width + x) * 4
			if idx+2 < len(orig) {
				r := orig[idx]
				g := orig[idx+1]
				b := orig[idx+2]
				if isSkinColor(r, g, b) {
					isSkin[y*width+x] = true
				}
			}
		}
	}

	for y := 1; y < height-1; y++ {
		for x := 1; x < width-1; x++ {
			i := y*width + x
			if isSkin[i] {
				var sumR, sumG, sumB, count int
				for dy := -1; dy <= 1; dy++ {
					for dx := -1; dx <= 1; dx++ {
						ni := (y+dy)*width + (x+dx)
						if isSkin[ni] {
							nIdx := ni * 4
							if nIdx+2 < len(orig) {
								sumR += int(orig[nIdx])
								sumG += int(orig[nIdx+1])
								sumB += int(orig[nIdx+2])
								count++
							}
						}
					}
				}
				if count > 0 {
					idx := i * 4
					if idx+2 < len(srcNRGBA.Pix) {
						srcNRGBA.Pix[idx] = uint8(sumR / count)
						srcNRGBA.Pix[idx+1] = uint8(sumG / count)
						srcNRGBA.Pix[idx+2] = uint8(sumB / count)
					}
				}
			}
		}
	}

	return srcNRGBA
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

// validatePrintRequest يتحقق من صحة بيانات طلب الطباعة وحجم الكانفس
func (s *PrintService) validatePrintRequest(req domain.PrintRequest) (int, int, error) {
	if req.DPI < 50 || req.DPI > 600 {
		return 0, 0, fmt.Errorf("invalid DPI: %d (must be between 50 and 600)", req.DPI)
	}
	if req.PaperWidthMM <= 10 || req.PaperWidthMM > 1000 {
		return 0, 0, fmt.Errorf("invalid PaperWidthMM: %.2f (must be between 10mm and 1000mm)", req.PaperWidthMM)
	}
	if req.PaperHeightMM <= 10 || req.PaperHeightMM > 1000 {
		return 0, 0, fmt.Errorf("invalid PaperHeightMM: %.2f (must be between 10mm and 1000mm)", req.PaperHeightMM)
	}
	if len(req.Items) > 1000 {
		return 0, 0, fmt.Errorf("too many items: %d (max limit is 1000)", len(req.Items))
	}

	widthPx := int(math.Round(mmToPx(req.PaperWidthMM, req.DPI)))
	heightPx := int(math.Round(mmToPx(req.PaperHeightMM, req.DPI)))

	if int64(widthPx)*int64(heightPx) > 144000000 { // حد أقصى 144 ميغابكسل
		return 0, 0, fmt.Errorf("requested print size is too large (total pixels exceed 144 megapixels)")
	}

	for _, item := range req.Items {
		// 🛡️ رفض هندسة عناصر غير منطقية (منع تخصيص ذاكرة ضخمة عبر W/H غير مقيد)
		if !math.IsNaN(item.W) && !math.IsNaN(item.H) &&
			(item.W <= 0 || item.H <= 0 || item.W > req.PaperWidthMM || item.H > req.PaperHeightMM) {
			return 0, 0, fmt.Errorf("invalid item geometry: W=%.2f H=%.2f (must fit within paper %.0f×%.0f mm)", item.W, item.H, req.PaperWidthMM, req.PaperHeightMM)
		}
		// 🛡️ رفض نسب اقتصاص سلبية أو متناقضة
		if (item.CropW > 0 || item.CropH > 0) && (item.CropW <= 0 || item.CropH <= 0) {
			return 0, 0, fmt.Errorf("invalid crop region: CropW=%.2f CropH=%.2f must both be positive or both zero", item.CropW, item.CropH)
		}
	}

	for _, item := range req.Items {
		if item.ImageSrc == "" {
			continue
		}
		filePath := resolveLocalPath(item.ImageSrc)
		if strings.HasPrefix(filePath, "data:image/") {
			commaIdx := strings.Index(filePath, ",")
			if commaIdx != -1 {
				b64Len := len(filePath) - commaIdx - 1
				if b64Len > 50*1024*1024 {
					return 0, 0, fmt.Errorf("image data too large: %d bytes max", 50*1024*1024)
				}
			}
		} else {
			if _, err := os.Stat(filePath); err != nil {
				return 0, 0, fmt.Errorf("image file does not exist: %s", filepath.Base(filePath))
			}
		}
	}

	return widthPx, heightPx, nil
}

type imageCache struct {
	mu       sync.RWMutex
	images   map[string]image.Image
	access   map[string]time.Time
	inFlight map[string]*sync.Cond
}

type processedCache struct {
	mu       sync.RWMutex
	images   map[processedKey]image.Image
	access   map[processedKey]time.Time
	inFlight map[processedKey]*sync.Cond
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

// loadRawImage يفتح الصورة من ملف أو Base64 مع كاش LRU ومنع تكرار التحميل الجاري (In-Flight Deduplication)
func loadRawImage(filePath string, cacheKey string, imgCache *imageCache) (image.Image, error) {
	imgCache.mu.Lock()
	if cachedRaw, ok := imgCache.images[cacheKey]; ok {
		imgCache.access[cacheKey] = time.Now()
		imgCache.mu.Unlock()
		return cachedRaw, nil
	}

	if cond, loading := imgCache.inFlight[cacheKey]; loading {
		for {
			cond.Wait()
			if cachedRaw, ok := imgCache.images[cacheKey]; ok {
				imgCache.access[cacheKey] = time.Now()
				imgCache.mu.Unlock()
				return cachedRaw, nil
			}
			if _, stillLoading := imgCache.inFlight[cacheKey]; !stillLoading {
				break
			}
		}
	}

	cond := sync.NewCond(&imgCache.mu)
	imgCache.inFlight[cacheKey] = cond
	imgCache.mu.Unlock()

	defer func() {
		imgCache.mu.Lock()
		delete(imgCache.inFlight, cacheKey)
		cond.Broadcast()
		imgCache.mu.Unlock()
	}()

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
	if item.Rotation != 0 {
		processedImg = imaging.Rotate(processedImg, item.Rotation, color.Transparent)
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

	procCache.mu.Lock()
	if cached, ok := procCache.images[pKey]; ok {
		procCache.access[pKey] = time.Now()
		procCache.mu.Unlock()
		return cached, nil
	}

	if cond, loading := procCache.inFlight[pKey]; loading {
		for {
			cond.Wait()
			if cached, ok := procCache.images[pKey]; ok {
				procCache.access[pKey] = time.Now()
				procCache.mu.Unlock()
				return cached, nil
			}
			if _, stillLoading := procCache.inFlight[pKey]; !stillLoading {
				break
			}
		}
	}

	cond := sync.NewCond(&procCache.mu)
	procCache.inFlight[pKey] = cond
	procCache.mu.Unlock()

	defer func() {
		procCache.mu.Lock()
		delete(procCache.inFlight, pKey)
		cond.Broadcast()
		procCache.mu.Unlock()
	}()

	img, err := loadRawImage(filePath, cacheKey, imgCache)
	if err != nil {
		return nil, err
	}

	if targetW <= 0 {
		targetW = 1
	}
	if targetH <= 0 {
		targetH = 1
	}

	processedImg := applyImageProcessing(img, item, targetW, targetH)

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
}

// drawCutLines يرسم خطوط القص المتقطعة على الكانفس
func (s *PrintService) drawCutLines(dc *gg.Context, req domain.PrintRequest) {
	if !req.ShowCutLines {
		return
	}
	dc.SetColor(color.RGBA{R: 255, G: 0, B: 0, A: 255})
	lineWidth := mmToPx(0.25, req.DPI)
	if lineWidth < 1.0 {
		lineWidth = 1.0
	}
	dashSize := mmToPx(1.5, req.DPI)
	if dashSize < 1.0 {
		dashSize = 1.0
	}
	dc.SetLineWidth(lineWidth)
	dc.SetDash(dashSize, dashSize)

	paperW := float64(dc.Width())
	paperH := float64(dc.Height())

	for _, line := range req.CutLines {
		x1 := mmToPx(line.X1, req.DPI)
		y1 := mmToPx(line.Y1, req.DPI)
		x2 := mmToPx(line.X2, req.DPI)
		y2 := mmToPx(line.Y2, req.DPI)

		if x1 < 0 {
			x1 = 0
		}
		if x1 >= paperW {
			x1 = paperW - 2
		}
		if x2 < 0 {
			x2 = 0
		}
		if x2 >= paperW {
			x2 = paperW - 2
		}
		if y1 < 0 {
			y1 = 0
		}
		if y1 >= paperH {
			y1 = paperH - 2
		}
		if y2 < 0 {
			y2 = 0
		}
		if y2 >= paperH {
			y2 = paperH - 2
		}

		dc.DrawLine(x1, y1, x2, y2)
		dc.Stroke()
	}
}

func (s *PrintService) saveOutput(dc *gg.Context, req domain.PrintRequest) (string, string, error) {
	appDir := utils.GetAppDir()
	outDir := filepath.Join(appDir, "Exports")
	_ = os.MkdirAll(outDir, 0755)

	// 🧹 تنظيف المخرجات القديمة (أقدم من 24 ساعة) تلقائياً لتفادي امتلاء القرص
	// نقوم بحذف ملفات الطباعة print_* فقط — لا نلمس ملفات المستخدم الخاصة
	if files, err := os.ReadDir(outDir); err == nil {
		for _, f := range files {
			if !strings.HasPrefix(f.Name(), "print_") {
				continue
			}
			filePath := filepath.Join(outDir, f.Name())
			if info, err := os.Stat(filePath); err == nil {
				if time.Since(info.ModTime()) > 24*time.Hour {
					_ = os.Remove(filePath)
				}
			}
		}
	}

	baseName := fmt.Sprintf("print_%d", time.Now().UnixNano())
	isCMYK := strings.EqualFold(req.ColorSpace, "cmyk")

	var imageName string
	var imagePath string
	var htmlImageName string

	if isCMYK {
		cmykImg := ConvertRGBAtoCMYK(dc.Image())
		ApplyPureBlackCutLines(cmykImg, req)

		if strings.EqualFold(req.ExportFormat, "jpeg") || strings.EqualFold(req.ExportFormat, "jpg") {
			imageName = baseName + ".jpg"
			imagePath = filepath.Join(outDir, imageName)
			f, err := os.Create(imagePath)
			if err != nil {
				return "", "", fmt.Errorf("create cmyk jpeg: %w", err)
			}
			err = jpeg.Encode(f, cmykImg, &jpeg.Options{Quality: 95})
			f.Close()
			if err != nil {
				return "", "", fmt.Errorf("encode cmyk jpeg: %w", err)
			}
		} else {
			// Default format for CMYK is TIFF
			imageName = baseName + ".tif"
			imagePath = filepath.Join(outDir, imageName)
			f, err := os.Create(imagePath)
			if err != nil {
				return "", "", fmt.Errorf("create cmyk tiff: %w", err)
			}
			err = tiff.Encode(f, cmykImg, &tiff.Options{Compression: tiff.Uncompressed})
			f.Close()
			if err != nil {
				return "", "", fmt.Errorf("encode cmyk tiff: %w", err)
			}
		}

		// 🌟 Save a browser-compatible PNG for HTML print window preview (browsers cannot decode TIFF in <img> tags)
		htmlImageName = baseName + "_preview.png"
		htmlImagePath := filepath.Join(outDir, htmlImageName)
		var buf bytes.Buffer
		enc := &png.Encoder{CompressionLevel: png.BestSpeed}
		if err := enc.Encode(&buf, dc.Image()); err == nil {
			pngData := buf.Bytes()
			if updatedData, err := setPngDPI(pngData, req.DPI); err == nil {
				pngData = updatedData
			}
			_ = os.WriteFile(htmlImagePath, pngData, 0644)
		} else {
			htmlImageName = imageName
		}
	} else {
		// sRGB PNG
		imageName = baseName + ".png"
		htmlImageName = imageName
		imagePath = filepath.Join(outDir, imageName)
		var buf bytes.Buffer
		enc := &png.Encoder{CompressionLevel: png.BestSpeed}
		err := enc.Encode(&buf, dc.Image())
		if err != nil {
			return "", "", err
		}

		pngData := buf.Bytes()
		if updatedData, err := setPngDPI(pngData, req.DPI); err == nil {
			pngData = updatedData
		} else {
			slog.Warn("Failed to set PNG DPI", "error", err)
		}

		err = os.WriteFile(imagePath, pngData, 0644)
		if err != nil {
			return "", "", err
		}
	}

	htmlPath := filepath.Join(outDir, baseName+".html")

	// إنتاج ملف HTML لضمان طباعة دقيقة للمليمترات عبر متصفح الويب (يتجاهل عارض الصور الافتراضي للويندوز)
	// HTML file for native OS printing (uses file:// absolute path so external apps like mshtml.dll can load the image)
	absImagePath := filepath.Join(outDir, htmlImageName)
	fileURI := "file:///" + strings.ReplaceAll(filepath.ToSlash(absImagePath), " ", "%20")
	// Determine @page orientation keyword for the CSS
	pageOrientation := "portrait"
	if strings.EqualFold(req.Orientation, "landscape") {
		pageOrientation = "landscape"
	}

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>طباعة الكولاج - Grido Studio</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: flex-start; background: #525659; }
  img { 
    width: %.2fmm; 
    height: %.2fmm; 
    object-fit: contain; 
    box-shadow: 0 0 10px rgba(0,0,0,0.5); 
    margin-top: 20px; 
    background: white;
  }
  @media print {
    body { background: white; margin: 0; padding: 0; }
    img { box-shadow: none; margin: 0; padding: 0; }
    @page { margin: 0; size: %.2fmm %.2fmm %s; }
  }
</style>
</head>
<body onload="setTimeout(function(){ window.print(); window.close(); }, 500)">
  <img src="%s" />
</body>
</html>`, req.PaperWidthMM, req.PaperHeightMM, req.PaperWidthMM, req.PaperHeightMM, pageOrientation, fileURI)

	_ = os.WriteFile(htmlPath, []byte(htmlContent), 0644)

	// HTML مع مسار local-image للعرض داخل WebView2 عبر iframe
	selfContainedHTML := fmt.Sprintf(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>طباعة الكولاج - Grido Studio</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: %.2fmm; height: %.2fmm; margin: 0; padding: 0; overflow: hidden; background: white; }
  img { 
    width: 100%%; 
    height: 100%%; 
    object-fit: contain; 
    display: block;
  }
  @media print {
    html, body { width: %.2fmm; height: %.2fmm; }
    img { width: 100%%; height: 100%%; }
    @page { margin: 0; size: %.2fmm %.2fmm %s; }
  }
</style>
</head>
<body>
  <img src="/local-image/%s" />
</body>
</html>`, req.PaperWidthMM, req.PaperHeightMM, req.PaperWidthMM, req.PaperHeightMM, req.PaperWidthMM, req.PaperHeightMM, pageOrientation, htmlImageName)

	return imagePath, selfContainedHTML, nil
}

func (s *PrintService) GeneratePrintSheet(req domain.PrintRequest) (string, string, error) {
	// Ensure logical dimensions match orientation (defensive: callers may send raw 210x297 + landscape)
	if strings.EqualFold(req.Orientation, "landscape") && req.PaperWidthMM < req.PaperHeightMM {
		req.PaperWidthMM, req.PaperHeightMM = req.PaperHeightMM, req.PaperWidthMM
	}
	widthPx, heightPx, err := s.validatePrintRequest(req)
	if err != nil {
		return "", "", err
	}

	dc := gg.NewContext(widthPx, heightPx)

	bgColor := parseColor(req.BackgroundColor)
	dc.SetColor(bgColor)
	dc.Clear()

	imgCache := &imageCache{
		images:   make(map[string]image.Image),
		access:   make(map[string]time.Time),
		inFlight: make(map[string]*sync.Cond),
	}
	procCache := &processedCache{
		images:   make(map[processedKey]image.Image),
		access:   make(map[processedKey]time.Time),
		inFlight: make(map[processedKey]*sync.Cond),
	}

	// 1. Process all images in parallel
	processedImages := make([]image.Image, len(req.Items))
	var g errgroup.Group
	
	// Limit concurrency to number of CPUs to avoid memory spikes and context switching overhead
	maxConcurrency := runtime.NumCPU()
	if maxConcurrency < 2 {
		maxConcurrency = 2
	}
	g.SetLimit(maxConcurrency)

	for i, item := range req.Items {
		if item.ImageSrc == "" {
			continue
		}
		
		// Capture loop variables for the goroutine
		i, item := i, item 
		g.Go(func() error {
			img, err := s.loadAndProcessImage(item, req.DPI, imgCache, procCache)
			if err != nil {
				return err
			}
			processedImages[i] = img
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return "", "", err
	}

	// 2. Draw everything sequentially (gg.Context is NOT thread-safe)
	for i, item := range req.Items {
		if item.ImageSrc == "" || processedImages[i] == nil {
			continue
		}

		processedImg := processedImages[i]
		xPx := float64(int(math.Round(mmToPx(item.X, req.DPI))))
		yPx := float64(int(math.Round(mmToPx(item.Y, req.DPI))))
		wPx := float64(int(math.Round(mmToPx(item.W, req.DPI))))
		hPx := float64(int(math.Round(mmToPx(item.H, req.DPI))))

		dc.Push()
		if item.CornerRadiusMM > 0 {
			rPx := mmToPx(item.CornerRadiusMM, req.DPI)
			dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
			dc.Clip()
		}
		dc.DrawImage(processedImg, int(xPx), int(yPx))
		dc.Pop()

		if item.BorderWidthMM > 0 && item.BorderColor != "" {
			bPx := mmToPx(item.BorderWidthMM, req.DPI)
			rPx := mmToPx(item.CornerRadiusMM, req.DPI)
			dc.SetHexColor(item.BorderColor)
			dc.SetLineWidth(bPx)
			dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
			dc.Stroke()
		}
	}

	s.drawCutLines(dc, req)

	imgCache.images = nil
	procCache.images = nil
	imgCache = nil
	procCache = nil

	return s.saveOutput(dc, req)
}

// setPngDPI modifies a PNG byte slice to include a pHYs chunk with the specified DPI.
func setPngDPI(pngData []byte, dpi int) ([]byte, error) {
	if len(pngData) < 33 {
		return nil, fmt.Errorf("invalid PNG data")
	}

	sig := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	if !bytes.Equal(pngData[:8], sig) {
		return nil, fmt.Errorf("not a valid PNG")
	}

	ppm := uint32(math.Round(float64(dpi) / 0.0254))

	physType := []byte("pHYs")
	physData := make([]byte, 9)
	binary.BigEndian.PutUint32(physData[0:4], ppm)
	binary.BigEndian.PutUint32(physData[4:8], ppm)
	physData[8] = 1

	physChunk := make([]byte, 21)
	binary.BigEndian.PutUint32(physChunk[0:4], 9)
	copy(physChunk[4:8], physType)
	copy(physChunk[8:17], physData)

	crc := crc32.ChecksumIEEE(append(physType, physData...))
	binary.BigEndian.PutUint32(physChunk[17:21], crc)

	chunkLen := binary.BigEndian.Uint32(pngData[8:12])
	if string(pngData[12:16]) != "IHDR" {
		return nil, fmt.Errorf("first chunk is not IHDR")
	}
	insertPos := 8 + 4 + 4 + int(chunkLen) + 4 // sig + length + type + data + CRC
	if insertPos > len(pngData) {
		return nil, fmt.Errorf("corrupt PNG data: insert position out of bounds")
	}
	
	// Check if pHYs already exists right after IHDR
	if insertPos+8 <= len(pngData) && string(pngData[insertPos+4:insertPos+8]) == "pHYs" {
		// Replace existing pHYs chunk
		existingChunkLen := int(binary.BigEndian.Uint32(pngData[insertPos:insertPos+4]))
		nextChunkPos := insertPos + 4 + 4 + existingChunkLen + 4
		
		result := make([]byte, 0, len(pngData)-existingChunkLen+len(physData))
		result = append(result, pngData[:insertPos]...)
		result = append(result, physChunk...)
		result = append(result, pngData[nextChunkPos:]...)
		return result, nil
	}

	result := make([]byte, 0, len(pngData)+len(physChunk))
	result = append(result, pngData[:insertPos]...)
	result = append(result, physChunk...)
	result = append(result, pngData[insertPos:]...)

	return result, nil
}

// PrintNative launches the OS native Win32 print dialog for a generated file on disk
func (s *PrintService) PrintNative(filePath string) error {
	if filePath == "" {
		return fmt.Errorf("مسار ملف الطباعة غير صالح")
	}

	cleanPath := filepath.Clean(filePath)
	if _, err := os.Stat(cleanPath); err != nil {
		return fmt.Errorf("ملف الطباعة غير موجود: %w", err)
	}

	if runtime.GOOS == "windows" {
		ext := strings.ToLower(filepath.Ext(cleanPath))
		targetPath := cleanPath
		if ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".tiff" {
			// Create a temporary 100% scale HTML file for native mshtml printing
			htmlPath := cleanPath + ".html"
			// 🛡️ تهريب آمن للمسار في HTML/URL — يمنع حقن وسوم عند مسارات تحمل أحرف خاصة
			fileURI := "file:///" + strings.ReplaceAll(filepath.ToSlash(cleanPath), " ", "%20")
			escapedURI := html.EscapeString(fileURI)
			htmlContent := fmt.Sprintf(`<!DOCTYPE html><html><head><style>@page{margin:0;}html,body{margin:0;padding:0;width:100%%;height:100%%;}img{width:100%%;height:100%%;object-fit:contain;}</style></head><body onload="window.print()"><img src="%s"/></body></html>`, escapedURI)
			_ = os.WriteFile(htmlPath, []byte(htmlContent), 0644)
			targetPath = htmlPath
		}

		cmd := exec.Command("rundll32.exe", "mshtml.dll,PrintHTML", targetPath)
		if err := cmd.Start(); err != nil {
			return fmt.Errorf("تعذر إطلاق نافذة طباعة الويندوز: %w", err)
		}
		return nil
	}

	if runtime.GOOS == "darwin" || runtime.GOOS == "linux" {
		cmd := exec.Command("lpr", cleanPath)
		return cmd.Run()
	}

	return fmt.Errorf("نظام التشغيل غير مدعوم للطباعة الأصلية")
}
