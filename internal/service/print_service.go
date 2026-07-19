package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"image"
	"image/color"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"

	"grido/internal/core/domain"
	"grido/internal/utils"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"
)

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
		return filepath.Join(appDir, "Media", filename)
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
		if item.ImageSrc == "" {
			continue
		}
		filePath := resolveLocalPath(item.ImageSrc)
		if !strings.HasPrefix(filePath, "data:image/") {
			if _, err := os.Stat(filePath); err != nil {
				return 0, 0, fmt.Errorf("image file does not exist: %s", filepath.Base(filePath))
			}
		}
	}

	return widthPx, heightPx, nil
}

type imageCache struct {
	mu     sync.RWMutex
	images map[string]image.Image
	access map[string]time.Time
}

type processedCache struct {
	mu     sync.RWMutex
	images map[processedKey]image.Image
	access map[processedKey]time.Time
}

// loadAndProcessImage يقوم بفتح الصورة ومعالجة ألوانها وأبعادها مع إدارة الذاكرة بنظام LRU
func (s *PrintService) loadAndProcessImage(
	item domain.PrintItem,
	dpi int,
	imgCache *imageCache,
	procCache *processedCache,
) (image.Image, error) {
	filePath := resolveLocalPath(item.ImageSrc)
	targetW := int(math.Round(mmToPx(item.W, dpi)))
	targetH := int(math.Round(mmToPx(item.H, dpi)))

	cacheKey := filePath
	if strings.HasPrefix(filePath, "data:image/") {
		// تلافي عمل Hash لسلسلة Base64 ضخمة قد تكون بحجم عشرات الميجابايت
		if len(filePath) > 1024 {
			h := sha256.New()
			h.Write([]byte(filePath[:512]))
			h.Write([]byte(filePath[len(filePath)-512:]))
			cacheKey = fmt.Sprintf("b64_%x_len%d", h.Sum(nil), len(filePath))
		} else {
			cacheKey = fmt.Sprintf("b64_%x", sha256.Sum256([]byte(filePath)))
		}
	}

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
	}

	procCache.mu.RLock()
	cached, ok := procCache.images[pKey]
	procCache.mu.RUnlock()

	if ok {
		procCache.mu.Lock()
		procCache.access[pKey] = time.Now()
		procCache.mu.Unlock()
		return cached, nil
	}

	var img image.Image
	var err error
	
	imgCache.mu.RLock()
	cachedRaw, ok := imgCache.images[cacheKey]
	imgCache.mu.RUnlock()

	if ok {
		img = cachedRaw
		imgCache.mu.Lock()
		imgCache.access[cacheKey] = time.Now()
		imgCache.mu.Unlock()
	} else {
		if strings.HasPrefix(filePath, "data:image/") {
			commaIdx := strings.Index(filePath, ",")
			if commaIdx == -1 {
				return nil, fmt.Errorf("invalid base64 image format")
			}
			b64Data := filePath[commaIdx+1:]
			data, err := base64.StdEncoding.DecodeString(b64Data)
			if err != nil {
				return nil, fmt.Errorf("failed to decode base64 image: %w", err)
			}
			img, err = imaging.Decode(bytes.NewReader(data))
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
	}

	if targetW <= 0 {
		targetW = 1
	}
	if targetH <= 0 {
		targetH = 1
	}

	if item.CropW > 0 && item.CropH > 0 {
		rect := image.Rect(
			int(math.Round(item.CropX)),
			int(math.Round(item.CropY)),
			int(math.Round(item.CropX+item.CropW)),
			int(math.Round(item.CropY+item.CropH)),
		)
		img = imaging.Crop(img, rect)
	}

	// Resize first to reduce pixel count before expensive color/filter operations
	var resizedImg image.Image
	bounds := img.Bounds()
	if bounds.Dx() == targetW && bounds.Dy() == targetH {
		resizedImg = img
	} else {
		resizedImg = imaging.Resize(img, targetW, targetH, imaging.Lanczos)
	}

	// Apply adjustments and filters on the much smaller resized image
	adjustedImg := applyColorAdjustments(resizedImg, item.Brightness, item.Contrast, item.Saturation)
	processedImg := applyFilter(adjustedImg, item.Filter)

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

	for _, line := range req.CutLines {
		x1 := mmToPx(line.X1, req.DPI)
		y1 := mmToPx(line.Y1, req.DPI)
		x2 := mmToPx(line.X2, req.DPI)
		y2 := mmToPx(line.Y2, req.DPI)

		dc.DrawLine(x1, y1, x2, y2)
		dc.Stroke()
	}
}

func (s *PrintService) saveOutput(dc *gg.Context, req domain.PrintRequest) (string, string, error) {
	appDir := utils.GetAppDir()
	outDir := filepath.Join(appDir, "Exports")
	_ = os.MkdirAll(outDir, 0755)

	// 🧹 تنظيف المخرجات القديمة (أقدم من 24 ساعة) تلقائياً لتفادي امتلاء القرص
	if files, err := os.ReadDir(outDir); err == nil {
		for _, f := range files {
			if info, err := f.Info(); err == nil {
				if time.Since(info.ModTime()) > 24*time.Hour {
					_ = os.Remove(filepath.Join(outDir, f.Name()))
				}
			}
		}
	}

	baseName := fmt.Sprintf("print_%d", time.Now().UnixNano())
	pngPath := filepath.Join(outDir, baseName+".png")
	htmlPath := filepath.Join(outDir, baseName+".html")

	var buf bytes.Buffer
	err := dc.EncodePNG(&buf)
	if err != nil {
		return "", "", err
	}

	pngData := buf.Bytes()
	if updatedData, err := setPngDPI(pngData, req.DPI); err == nil {
		pngData = updatedData
	} else {
		slog.Warn("Failed to set PNG DPI", "error", err)
	}

	err = os.WriteFile(pngPath, pngData, 0644)
	if err != nil {
		return "", "", err
	}

	// إنتاج ملف HTML لضمان طباعة دقيقة للمليمترات عبر متصفح الويب (يتجاهل عارض الصور الافتراضي للويندوز)
	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>طباعة الكولاج - Grido Studio</title>
<style>
  body { margin: 0; padding: 0; display: flex; justify-content: center; background: #525659; }
  img { 
    width: %.2fmm; 
    height: %.2fmm; 
    object-fit: contain; 
    box-shadow: 0 0 10px rgba(0,0,0,0.5); 
    margin-top: 20px; 
    background: white;
  }
  @media print {
    body { background: white; }
    img { box-shadow: none; margin: 0; }
    @page { margin: 0; size: %.2fmm %.2fmm; }
  }
</style>
</head>
<body onload="setTimeout(() => { window.print(); window.close(); }, 500)">
  <img src="/local-image/%s" />
</body>
</html>`, req.PaperWidthMM, req.PaperHeightMM, req.PaperWidthMM, req.PaperHeightMM, baseName+".png")

	_ = os.WriteFile(htmlPath, []byte(htmlContent), 0644)

	// إرسال كود HTML يشير للمسار المحلي بدلاً من ترميز base64 لتفادي استهلاك الذاكرة العالي
	selfContainedHTML := fmt.Sprintf(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>طباعة الكولاج - Grido Studio</title>
<style>
  body { margin: 0; padding: 0; display: flex; justify-content: center; background: #525659; }
  img { 
    width: %.2fmm; 
    height: %.2fmm; 
    object-fit: contain; 
    box-shadow: 0 0 10px rgba(0,0,0,0.5); 
    margin-top: 20px; 
    background: white;
  }
  @media print {
    body { background: white; }
    img { box-shadow: none; margin: 0; }
    @page { margin: 0; size: %.2fmm %.2fmm; }
  }
</style>
</head>
<body>
  <img src="/local-image/%s" />
</body>
</html>`, req.PaperWidthMM, req.PaperHeightMM, req.PaperWidthMM, req.PaperHeightMM, baseName+".png")

	return htmlPath, selfContainedHTML, nil
}

func (s *PrintService) GeneratePrintSheet(req domain.PrintRequest) (string, string, error) {
	widthPx, heightPx, err := s.validatePrintRequest(req)
	if err != nil {
		return "", "", err
	}

	dc := gg.NewContext(widthPx, heightPx)

	bgColor := parseColor(req.BackgroundColor)
	dc.SetColor(bgColor)
	dc.Clear()

	imgCache := &imageCache{
		images: make(map[string]image.Image),
		access: make(map[string]time.Time),
	}
	procCache := &processedCache{
		images: make(map[processedKey]image.Image),
		access: make(map[processedKey]time.Time),
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
	insertPos := 8 + 12 + int(chunkLen)
	if insertPos > len(pngData) {
		return nil, fmt.Errorf("corrupt PNG data: insert position out of bounds")
	}

	result := make([]byte, 0, len(pngData)+len(physChunk))
	result = append(result, pngData[:insertPos]...)
	result = append(result, physChunk...)
	result = append(result, pngData[insertPos:]...)

	return result, nil
}
