package service

import (
	"image"
	"image/color"
	"math"
	"runtime"
	"strings"
	"sync"

	"grido/internal/core/domain"
	"grido/internal/utils"
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
		utils.SafeGo("print.cmyk-convert", func() {
			defer wg.Done()
			if isRGBA {
				for y := startY; y < endY; y++ {
					srcOffset := y * rgba.Stride
					dstOffset := y * cmykImg.Stride
					for x := 0; x < w; x++ {
						// 🖨️ تسطيح ألفا على الورق الأبيض: RGBA مخزّن premultiplied
						// (rp = R*a/255) فالشفاف raw يُقرأ أسوداً؛ التركيب فوق
						// أبيض 255 يتبسّط إلى: F = rp + (255-a) (مضمون ≤ 255).
						rp := uint32(rgba.Pix[srcOffset+x*4])
						gp := uint32(rgba.Pix[srcOffset+x*4+1])
						bp := uint32(rgba.Pix[srcOffset+x*4+2])
						a := uint32(rgba.Pix[srcOffset+x*4+3])
						fr := uint8(min(255, rp+255-a))
						fg := uint8(min(255, gp+255-a))
						fb := uint8(min(255, bp+255-a))
						c, m, yVal, k := rgbToRichCMYK(fr, fg, fb)
						cmykOffset := dstOffset + x*4
						cmykImg.Pix[cmykOffset] = c
						cmykImg.Pix[cmykOffset+1] = m
						cmykImg.Pix[cmykOffset+2] = yVal
						cmykImg.Pix[cmykOffset+3] = k
					}
				}
			} else {
				for y := startY; y < endY; y++ {
					dstOffset := y * cmykImg.Stride
					for x := 0; x < w; x++ {
						// 🖨️ تسطيح ألفا على الأبيض للصور غير RGBA: واجهة
						// color.Color تُعيد قيماً premultiplied بدقة 16بت —
						// التركيب فوق أبيض (65535): F = rp + (65535-a).
						r, g, b, a := src.At(x, y).RGBA()
						ia := 65535 - a
						fr := uint8(min(65535, r+ia) >> 8)
						fg := uint8(min(65535, g+ia) >> 8)
						fb := uint8(min(65535, b+ia) >> 8)
						c, m, yVal, k := rgbToRichCMYK(fr, fg, fb)
						cmykOffset := dstOffset + x*4
						cmykImg.Pix[cmykOffset] = c
						cmykImg.Pix[cmykOffset+1] = m
						cmykImg.Pix[cmykOffset+2] = yVal
						cmykImg.Pix[cmykOffset+3] = k
					}
				}
			}
		})
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

	lineWidth := mmToPx(0.20, req.DPI)
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

	// setThick يرسم قرصاً نصف قطره halfW حول (cx,cy) مقصوصاً بالكانفس.
	// halfW ثابت لكل الاستدعاء (يعتمد على lineWidth فقط) فيُحسب مرة واحدة.
	halfW := int(math.Round(lineWidth / 2.0))
	if halfW < 1 {
		halfW = 1
	}
	setThick := func(cx, cy int) {
		for dy := -halfW; dy <= halfW; dy++ {
			for dx := -halfW; dx <= halfW; dx++ {
				if dx*dx+dy*dy > halfW*halfW {
					continue
				}
				px, py := cx+dx, cy+dy
				if px >= 0 && px < maxW && py >= 0 && py < maxH {
					cmykImg.SetCMYK(px, py, pureBlack)
				}
			}
		}
	}

	// 🖨️ RV-16-M2: نمط cropmarks يرسم أذرع الزوايا فقط (نفس هندسة المعاينة
	// وdrawCutLines) — كان يُعامل كخطوط صلبة كاملة فتظهر في المطبعة خطوط
	// لم يرها المستخدم في المعاينة.
	segments := req.CutLines
	if style == "cropmarks" {
		segments = cropMarkSegments(req)
	}

	for _, line := range segments {
		x1 := math.Round(mmToPx(line.X1, req.DPI))
		y1 := math.Round(mmToPx(line.Y1, req.DPI))
		x2 := math.Round(mmToPx(line.X2, req.DPI))
		y2 := math.Round(mmToPx(line.Y2, req.DPI))

		if x1 == x2 { // Vertical cut line
			// 🛡️ RV-16-L3: الخط المعكوس (y2 < y1) كان يُسقط بصمت هنا بينما
			// يرسمه drawCutLines — نرسم المدى بالترتيب ونحفظ أصل إيقاع الشرطات
			lo, hi := y1, y2
			if lo > hi {
				lo, hi = hi, lo
			}
			startY := int(math.Max(0, lo))
			endY := int(math.Min(float64(maxH-1), hi))
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
			// 🛡️ RV-16-L3: نفس حارس الترتيب المعكوس أفقياً (x2 < x1)
			lo, hi := x1, x2
			if lo > hi {
				lo, hi = hi, lo
			}
			startX := int(math.Max(0, lo))
			endX := int(math.Min(float64(maxW-1), hi))
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
		} else {
			// 🖨️ خط مائل/حر (RV-Print-02): كان يُسقط بصمت في CMYK بينما
			// يظهر في المعاينة وPDF — الآن Bresenham مُعامَل بالطول t مع
			// نفس إيقاع الشرطات inDash(t)، وسماكة قرصية نصف قطرها halfW.
			dx := x2 - x1
			dy := y2 - y1
			length := math.Hypot(dx, dy)
			if length <= 0 {
				continue
			}
			steps := int(math.Ceil(length))
			for s := 0; s <= steps; s++ {
				t := float64(s)
				if t > length {
					t = length
				}
				if !inDash(t) {
					continue
				}
				fx := x1 + dx*t/length
				fy := y1 + dy*t/length
				setThick(int(math.Round(fx)), int(math.Round(fy)))
			}
		}
	}
}
