package service

import (
	"image"
	"image/color"
	"math"
	"runtime"
	"strings"
	"sync"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_cmyk.go — تحويل فضاء الألوان إلى CMYK وخطوط القص النقية للطباعة الاحترافية
//
// التحويل متوازٍ على مستوى الصفوف مع وصول مباشر للمصفوفات (بلا استدعاءات At/Set
// في المسار السريع RGBA)، مع تعزيز الظلال العميقة (Rich Black).
// ─────────────────────────────────────────────────────────────────────────────

// rgbToRichCMYK converts RGB to CMYK with Photographic Rich Black enhancement for deep shadows
func rgbToRichCMYK(r, g, b uint8) (uint8, uint8, uint8, uint8) {
	c, m, yVal, k := color.RGBToCMYK(r, g, b)
	if k > 220 && c < 50 && m < 50 && yVal < 50 {
		richFactor := float64(k-220) / 35.0
		c = uint8(math.Min(255, float64(c)+40.0*richFactor))
		m = uint8(math.Min(255, float64(m)+30.0*richFactor))
		yVal = uint8(math.Min(255, float64(yVal)+30.0*richFactor))
	}
	return c, m, yVal, k
}

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
						c, m, yVal, k := rgbToRichCMYK(r, g, b)
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
						c, m, yVal, k := rgbToRichCMYK(uint8(r>>8), uint8(g>>8), uint8(b>>8))
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

// ApplyPureBlackCutLines enforces pure black (C:0 M:0 Y:0 K:255) for cut lines in CMYK space.
// It mirrors the dashed rhythm used by drawCutLines (1.5mm dash + 1.5mm gap) so the printed
// marks stay consistent between the sRGB preview and the CMYK/TIFF export.
func ApplyPureBlackCutLines(cmykImg *image.CMYK, req domain.PrintRequest) {
	if !req.ShowCutLines || len(req.CutLines) == 0 {
		return
	}

	lineWidth := mmToPx(0.25, req.DPI)
	if lineWidth < 1.0 {
		lineWidth = 1.0
	}
	dashSize := mmToPx(1.5, req.DPI)
	if dashSize < 1.0 {
		dashSize = 1.0
	}

	bounds := cmykImg.Bounds()
	maxW, maxH := bounds.Dx(), bounds.Dy()
	pureBlack := color.CMYK{C: 0, M: 0, Y: 0, K: 255}

	style := strings.ToLower(strings.TrimSpace(req.CutLineStyle))
	inDash := func(t float64) bool {
		if style == "solid" || style == "cropmarks" {
			return true
		}
		if style == "dotted" {
			mod := math.Mod(t, 2*dashSize)
			return mod >= 0 && mod < (0.4*dashSize)
		}
		mod := math.Mod(t, 2*dashSize)
		return mod >= 0 && mod < dashSize
	}

	for _, line := range req.CutLines {
		x1 := math.Round(mmToPx(line.X1, req.DPI))
		y1 := math.Round(mmToPx(line.Y1, req.DPI))
		x2 := math.Round(mmToPx(line.X2, req.DPI))
		y2 := math.Round(mmToPx(line.Y2, req.DPI))

		halfW := int(math.Round(lineWidth / 2.0))
		if halfW < 1 {
			halfW = 1
		}

		if x1 == x2 { // Vertical cut line
			startY := int(math.Max(0, float64(y1)))
			endY := int(math.Min(float64(maxH-1), float64(y2)))
			px := int(x1)
			for y := startY; y <= endY; y++ {
				if !inDash(float64(y) - y1) {
					continue
				}
				for dx := -halfW; dx <= halfW; dx++ {
					cx := px + dx
					if cx >= 0 && cx < maxW {
						cmykImg.SetCMYK(cx, y, pureBlack)
					}
				}
			}
		} else if y1 == y2 { // Horizontal cut line
			startX := int(math.Max(0, float64(x1)))
			endX := int(math.Min(float64(maxW-1), float64(x2)))
			py := int(y1)
			for x := startX; x <= endX; x++ {
				if !inDash(float64(x) - x1) {
					continue
				}
				for dy := -halfW; dy <= halfW; dy++ {
					cy := py + dy
					if cy >= 0 && cy < maxH {
						cmykImg.SetCMYK(x, cy, pureBlack)
					}
				}
			}
		}
	}
}
