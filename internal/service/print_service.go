package service

import (
	"fmt"
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"

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
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) == 3 {
		var r, g, b uint8
		fmt.Sscanf(hex, "%1x%1x%1x", &r, &g, &b)
		return color.RGBA{R: r * 17, G: g * 17, B: b * 17, A: 255}
	}
	if len(hex) == 6 {
		var r, g, b uint8
		fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
		return color.RGBA{R: r, G: g, B: b, A: 255}
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

func (s *PrintService) GeneratePrintSheet(req domain.PrintRequest) (string, error) {
	// Calculate canvas dimensions in pixels
	widthPx := int(math.Round(mmToPx(req.PaperWidthMM, req.DPI)))
	heightPx := int(math.Round(mmToPx(req.PaperHeightMM, req.DPI)))

	dc := gg.NewContext(widthPx, heightPx)

	// Draw Background
	bgColor := parseColor(req.BackgroundColor)
	dc.SetColor(bgColor)
	dc.Clear()

	// 📸 ذاكرة تخزين مؤقت لفك تشفير الصور وتعديلها لتفادي تكرار العمليات الثقيلة (خصوصاً عند طباعة نسخ متعددة من نفس الصورة)
	type processedKey struct {
		filePath   string
		brightness float64
		contrast   float64
		saturation float64
		targetW    int
		targetH    int
	}
	imageCache := make(map[string]image.Image)
	processedCache := make(map[processedKey]image.Image)

	for _, item := range req.Items {
		if item.ImageSrc == "" {
			continue
		}

		filePath := resolveLocalPath(item.ImageSrc)
		
		// Calculate target width and height in px
		targetW := int(math.Round(mmToPx(item.W, req.DPI)))
		targetH := int(math.Round(mmToPx(item.H, req.DPI)))

		pKey := processedKey{
			filePath:   filePath,
			brightness: item.Brightness,
			contrast:   item.Contrast,
			saturation: item.Saturation,
			targetW:    targetW,
			targetH:    targetH,
		}

		var processedImg image.Image
		if cached, ok := processedCache[pKey]; ok {
			processedImg = cached
		} else {
			var img image.Image
			var err error
			if cachedRaw, ok := imageCache[filePath]; ok {
				img = cachedRaw
			} else {
				img, err = imaging.Open(filePath)
				if err != nil {
					return "", fmt.Errorf("failed to open image %s: %w", filepath.Base(filePath), err)
				}
				if len(imageCache) >= 8 {
					for k := range imageCache {
						delete(imageCache, k)
						break
					}
				}
				imageCache[filePath] = img
			}

			// Adjust colors
			adjustedImg := applyColorAdjustments(img, item.Brightness, item.Contrast, item.Saturation)

			// Resize/Crop to fill exactly targetW x targetH
			processedImg = imaging.Fill(adjustedImg, targetW, targetH, imaging.Center, imaging.Lanczos)
			
			if len(processedCache) >= 12 {
				for k := range processedCache {
					delete(processedCache, k)
					break
				}
			}
			processedCache[pKey] = processedImg
		}

		xPx := int(math.Round(mmToPx(item.X, req.DPI)))
		yPx := int(math.Round(mmToPx(item.Y, req.DPI)))

		// Draw on canvas
		dc.DrawImage(processedImg, xPx, yPx)
	}

	// Draw CutLines
	if req.ShowCutLines {
		dc.SetColor(color.RGBA{R: 255, G: 0, B: 0, A: 255})
		dc.SetLineWidth(1.5)
		// We use a simple dashed line effect (not perfectly supported by gg natively, but we can draw solid red lines or use setdash)
		dc.SetDash(5, 5)

		for _, line := range req.CutLines {
			x1 := mmToPx(line.X1, req.DPI)
			y1 := mmToPx(line.Y1, req.DPI)
			x2 := mmToPx(line.X2, req.DPI)
			y2 := mmToPx(line.Y2, req.DPI)

			dc.DrawLine(x1, y1, x2, y2)
			dc.Stroke()
		}
	}

	// Save to a local file in AppData or Desktop
	appDir := utils.GetAppDir()
	outDir := filepath.Join(appDir, "Exports")
	_ = os.MkdirAll(outDir, 0755)

	filename := fmt.Sprintf("print_%d.png", time.Now().Unix())
	outPath := filepath.Join(outDir, filename)

	err := dc.SavePNG(outPath)
	if err != nil {
		return "", err
	}

	return outPath, nil
}
