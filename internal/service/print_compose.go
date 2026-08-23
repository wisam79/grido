package service

import (
	"fmt"
	"image"
	"image/color"
	"math"
	"strings"

	"github.com/fogleman/gg"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_compose.go — رسم كانفس الطباعة بدقة DPI كاملة (fogleman/gg)
//
// أدوات القياس والألوان، خطوط القص المتقطعة، رسم عناصر الصور داخل الخلايا،
// وتركيب كانفاس الوضع الحر.
// ─────────────────────────────────────────────────────────────────────────────

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

// drawCutLines يرسم خطوط القص المتقطعة على الكانفس بالأسود النقي مع إزاحة حافة أمان
func (s *PrintService) drawCutLines(dc *gg.Context, req domain.PrintRequest) {
	if !req.ShowCutLines {
		return
	}
	dc.SetColor(color.RGBA{R: 120, G: 120, B: 120, A: 255})
	lineWidth := mmToPx(0.18, req.DPI)
	if lineWidth < 1.0 {
		lineWidth = 1.0
	}
	dashSize := mmToPx(1.5, req.DPI)
	if dashSize < 1.0 {
		dashSize = 1.0
	}
	dc.SetLineWidth(lineWidth)

	style := strings.ToLower(strings.TrimSpace(req.CutLineStyle))
	if style == "solid" || style == "cropmarks" {
		// no dash
	} else if style == "dotted" {
		dc.SetDash(dashSize*0.4, dashSize*1.6)
	} else {
		dc.SetDash(dashSize, dashSize)
	}

	paperW := float64(dc.Width())
	paperH := float64(dc.Height())
	maxCanvasX := paperW - 1.5
	maxCanvasY := paperH - 1.5

	for _, line := range req.CutLines {
		x1 := mmToPx(line.X1, req.DPI)
		y1 := mmToPx(line.Y1, req.DPI)
		x2 := mmToPx(line.X2, req.DPI)
		y2 := mmToPx(line.Y2, req.DPI)

		// الإزاحة داخل نطاق البكسل القابل للرسم والطباعة بدون التقطع الكسري عند الحافة السفلية/الجانبية
		if x1 <= 0.5 {
			x1 = 1.5
		} else if x1 >= maxCanvasX {
			x1 = maxCanvasX
		}
		if x2 <= 0.5 {
			x2 = 1.5
		} else if x2 >= maxCanvasX {
			x2 = maxCanvasX
		}

		if y1 <= 0.5 {
			y1 = 1.5
		} else if y1 >= maxCanvasY {
			y1 = maxCanvasY
		}
		if y2 <= 0.5 {
			y2 = 1.5
		} else if y2 >= maxCanvasY {
			y2 = maxCanvasY
		}

		dc.DrawLine(x1, y1, x2, y2)
		dc.Stroke()
	}
}

// drawItemImage يرسم صورة معالجة داخل مستطيل العنصر بالمليمتر مع القص الدائري والإطار.
// ⚠️ gg v1.3.0: Pop() لا يستعيد القناع (mask) — يُبقيه متراكماً، لذا يجب مسحه يدوياً
// وإلا تتراكم مناطق القص وتصبح الخلايا التالية مقصوصة بالكامل (لا تُرسم إلا الأولى)
func drawItemImage(dc *gg.Context, img image.Image, item domain.PrintItem, dpi int) {
	xPx := float64(int(math.Round(mmToPx(item.X, dpi))))
	yPx := float64(int(math.Round(mmToPx(item.Y, dpi))))
	wPx := float64(int(math.Round(mmToPx(item.W, dpi))))
	hPx := float64(int(math.Round(mmToPx(item.H, dpi))))

	dc.Push()
	if item.CornerRadiusMM > 0 {
		rPx := mmToPx(item.CornerRadiusMM, dpi)
		dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
	} else {
		dc.DrawRectangle(xPx, yPx, wPx, hPx)
	}
	dc.Clip()

	// 🎨 إذا كان للعنصر لون خلفية مخصص (مثل خلفية صورة الهوية المعزولة أزرق/أبيض/رمادي)،
	// نقوم بملء مستطيل الخانة بلون الخلفية أولاً تحت الصورة المعزولة
	if item.BgColor != "" && !strings.EqualFold(item.BgColor, "transparent") {
		dc.SetColor(parseColor(item.BgColor))
		if item.CornerRadiusMM > 0 {
			rPx := mmToPx(item.CornerRadiusMM, dpi)
			dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
		} else {
			dc.DrawRectangle(xPx, yPx, wPx, hPx)
		}
		dc.Fill()
	}

	// 🛡️ إصلاح: الصورة المدوّرة 90/270 بُعدها المبدّل أكبر/أصغر من الخلية؛ تُرسم
	// متمركزة على الخلية لتطابق المحرر (Konva يدور حول المركز) — كان الرسم
	// بمحاذاة الزاوية فيزيح المحتوى المدوّر عن موضعه في المعاينة
	drawX, drawY := xPx, yPx
	if isQuarterRotation(item.Rotation) {
		drawX = xPx + (wPx-float64(img.Bounds().Dx()))/2
		drawY = yPx + (hPx-float64(img.Bounds().Dy()))/2
	}
	dc.DrawImage(img, int(drawX), int(drawY))
	dc.ResetClip()
	dc.Pop()

	if item.BorderWidthMM > 0 && item.BorderColor != "" {
		bPx := mmToPx(item.BorderWidthMM, dpi)
		rPx := mmToPx(item.CornerRadiusMM, dpi)
		dc.SetHexColor(item.BorderColor)
		dc.SetLineWidth(bPx)
		dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
		dc.Stroke()
	}
}

// composeCanvas يرسم محتوى كانفاس الوضع الحر (خلفية + صور) بدقة الطباعة.
// العناصر تُفسَّر في فضاء الكانفاس (px): X/Y/W/H و CornerRadiusMM بالبكسل —
// يرسل الواجهة عناصر صالحة فقط (بلا دوران/شفافية/ظلال) مطابقة لعرض Konva.
func (s *PrintService) composeCanvas(
	req domain.PrintRequest,
	imgCache *imageCache,
) (image.Image, error) {
	comp := req.Composition
	if comp == nil {
		return nil, nil
	}

	outW := int(math.Round(mmToPx(comp.CanvasWidthMM, req.DPI)))
	outH := int(math.Round(mmToPx(comp.CanvasHeightMM, req.DPI)))
	if outW <= 0 || outH <= 0 || comp.CanvasWidthPx <= 0 || comp.CanvasHeightPx <= 0 {
		return nil, fmt.Errorf("invalid canvas composition dimensions")
	}
	if len(comp.Items) > 100 {
		return nil, fmt.Errorf("too many composition items: %d (max limit is 100)", len(comp.Items))
	}

	scaleX := float64(outW) / float64(comp.CanvasWidthPx)
	scaleY := float64(outH) / float64(comp.CanvasHeightPx)

	dc := gg.NewContext(outW, outH)
	dc.SetColor(parseColor(comp.BackgroundColor))
	dc.Clear()

	for _, item := range comp.Items {
		if item.ImageSrc == "" {
			continue
		}
		if item.W <= 0 || item.H <= 0 {
			continue
		}

		filePath := resolveLocalPath(item.ImageSrc)
		cacheKey := computeImageCacheKey(filePath)
		img, err := loadRawImage(filePath, cacheKey, imgCache)
		if err != nil {
			return nil, err
		}

		targetW := int(math.Round(item.W * scaleX))
		targetH := int(math.Round(item.H * scaleY))
		if targetW < 1 {
			targetW = 1
		}
		if targetH < 1 {
			targetH = 1
		}
		processedImg := applyImageProcessing(img, item, targetW, targetH)

		xPx := float64(int(math.Round(item.X * scaleX)))
		yPx := float64(int(math.Round(item.Y * scaleY)))
		wPx := float64(int(math.Round(item.W * scaleX)))
		hPx := float64(int(math.Round(item.H * scaleY)))

		drawX, drawY := xPx, yPx
		if isQuarterRotation(item.Rotation) {
			drawX = xPx + (wPx-float64(processedImg.Bounds().Dx()))/2
			drawY = yPx + (hPx-float64(processedImg.Bounds().Dy()))/2
		}

		dc.Push()
		rPx := item.CornerRadiusMM * scaleX
		if rPx > 0 {
			dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
		} else {
			dc.DrawRectangle(xPx, yPx, wPx, hPx)
		}
		dc.Clip()

		// رسم خلفية العنصر إن وُجدت
		if item.BgColor != "" && !strings.EqualFold(item.BgColor, "transparent") {
			dc.SetColor(parseColor(item.BgColor))
			if rPx > 0 {
				dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
			} else {
				dc.DrawRectangle(xPx, yPx, wPx, hPx)
			}
			dc.Fill()
		}

		dc.DrawImage(processedImg, int(drawX), int(drawY))
		dc.ResetClip()
		dc.Pop()

		if item.BorderWidthMM > 0 && item.BorderColor != "" {
			bPx := item.BorderWidthMM * scaleX
			dc.SetHexColor(item.BorderColor)
			dc.SetLineWidth(bPx)
			dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
			dc.Stroke()
		}
	}

	return dc.Image(), nil
}
