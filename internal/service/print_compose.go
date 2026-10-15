package service

import (
	"fmt"
	"image"
	"image/color"
	"log/slog"
	"math"
	"runtime"
	"strconv"
	"strings"

	"github.com/fogleman/gg"
	"golang.org/x/sync/errgroup"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_compose.go — رسم كانفس الطباعة بدقة DPI كاملة (fogleman/gg)
//
// أدوات القياس والألوان، خطوط القص المتقطعة، رسم عناصر الصور داخل الخلايا،
// وتركيب كانفاس الوضع الحر.
// ─────────────────────────────────────────────────────────────────────────────

// parseHexPair يقرأ خانتين سادس-عشرية — يفشل صراحةً بدل إنتاج أصفار صامتة
func parseHexPair(s string) (uint8, bool) {
	v, err := strconv.ParseUint(s, 16, 32)
	if err != nil {
		return 0, false
	}
	return uint8(v), true
}

// parseColor يفهم #RGB/#RGBA/#RRGGBB/#RRGGBBAA و"transparent".
// ⚠️ كان يستخدم fmt.Sscanf الذي يفشل صامتاً (فيبقى اللون أسود = أصفار) أو
// يُسقط المدخل الغريب إلى أبيض بلا أي أثر — الآن يفشل بصوت مسموع وسلوك ثابت.
func parseColor(hex string) color.Color {
	raw := strings.TrimSpace(hex)
	if strings.EqualFold(raw, "transparent") {
		return color.Transparent
	}
	trimmed := strings.TrimPrefix(raw, "#")

	// الصيغة المختصرة: كل خانة تُكرَّر ("f" ← "ff") قبل القراءة
	if len(trimmed) == 3 || len(trimmed) == 4 {
		expanded := make([]byte, 0, len(trimmed)*2)
		for i := 0; i < len(trimmed); i++ {
			expanded = append(expanded, trimmed[i], trimmed[i])
		}
		trimmed = string(expanded)
	}

	if len(trimmed) != 6 && len(trimmed) != 8 {
		slog.Warn("parseColor: unrecognized color format, using white", "color", raw)
		return color.White
	}

	r, okR := parseHexPair(trimmed[0:2])
	g, okG := parseHexPair(trimmed[2:4])
	b, okB := parseHexPair(trimmed[4:6])
	a := uint8(255)
	okA := true
	if len(trimmed) == 8 {
		a, okA = parseHexPair(trimmed[6:8])
	}
	if !okR || !okG || !okB || !okA {
		slog.Warn("parseColor: malformed hex color, using white", "color", raw)
		return color.White
	}
	return color.RGBA{R: r, G: g, B: b, A: a}
}

func mmToPx(mm float64, dpi int) float64 {
	return (mm * float64(dpi)) / 25.4
}

// drawCutLines يرسم خطوط القص على الكانفس بالرمادي 120 (نفس درجة PDF في
// drawPDFCutLines) مع إزاحة حافة أمان. المسار CMYK يعيد رسمها أسودَ نقياً
// فوق ذلك في ApplyPureBlackCutLines (print_cmyk.go) — هذا فارق مقصود:
// خطوط إرشادية رمادية هادئة في المعاينة/sRGB، وأسود نقي وحيد الحبر في المطبعة.
func (s *PrintService) drawCutLines(dc *gg.Context, req domain.PrintRequest) {
	if !req.ShowCutLines {
		return
	}
	dc.SetColor(color.RGBA{R: 120, G: 120, B: 120, A: 255})
	lineWidth := mmToPx(0.20, req.DPI)
	if lineWidth < 1.0 {
		lineWidth = 1.0
	}
	dashSize := mmToPx(1.5, req.DPI)
	if dashSize < 1.0 {
		dashSize = 1.0
	}
	dc.SetLineWidth(lineWidth)

	style := strings.ToLower(strings.TrimSpace(req.CutLineStyle))
	if style == "cropmarks" {
		// 🖨️ RV-16-M2: علامات زوايا فقط (نفس هندسة معاينة الواجهة في
		// print-preview.tsx) — كانت تُرسم خطوطاً كاملة صلبة فتنطبق الورقة
		// بخطوط لم يرها المستخدم في المعاينة. بلا سحب للحافة (clamp): الأذرع
		// خارج الورقة تُقص عند حدود الكانفس تلقائياً كما تقصها المعاينة.
		for _, seg := range cropMarkSegments(req) {
			dc.DrawLine(mmToPx(seg.X1, req.DPI), mmToPx(seg.Y1, req.DPI), mmToPx(seg.X2, req.DPI), mmToPx(seg.Y2, req.DPI))
		}
		dc.Stroke()
		return
	}
	if style == "solid" {
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

		// 🛡️ حماية من الإحداثيات غير المنتهية/NaN فقط: تمرير قيمة واحدة تالفة إلى
		// gg يُفسد مسار الرسم بأكمله (فتختفي **كل** خطوط القص لا خط واحد).
		// ⚠️ الخط الخارج عن الورقة يبقى يُسحب إلى الحافة عمداً (سلوك موثَّق، واختبار
		// TestPrintService_CutLineEdgeVisibility يشترط ظهور خط 298mm على ورقة 297mm
		// على حافة الورقة) — الإسقاط كان سيجعل الورقة بلا خط نهاية طباعة بلا تفسير.
		if math.IsNaN(x1) || math.IsNaN(y1) || math.IsNaN(x2) || math.IsNaN(y2) ||
			math.IsInf(x1, 0) || math.IsInf(y1, 0) || math.IsInf(x2, 0) || math.IsInf(y2, 0) {
			continue
		}

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
	}
	dc.Stroke()
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

// cropMarkSegments يعيد أذرع علامات القص الزاوية (8 قطع: أفقي + رأسي لكل ركن
// من أركان صندوق إحاطة خطوط القص) — نفس هندسة معاينة الواجهة في print-preview.tsx:
// طول الذراع 4% من الضلع الأقصر للورقة (بحد أدنى 2مم) ممتداً خارج الصندوق.
// الإحداثيات غير المنتهية/NaN تُتجاهل كما في drawCutLines؛ لا خطوط صالحة ⇒ nil.
// تستهلكها المسارات الثلاثة (نقطي drawCutLines، أسود CMYK نقي، ومتجه PDF)
// فيبقى نمط cropmarks متطابقاً بين المعاينة والمخرجات.
func cropMarkSegments(req domain.PrintRequest) []domain.CutLine {
	if len(req.CutLines) == 0 {
		return nil
	}
	minX, minY := math.Inf(1), math.Inf(1)
	maxX, maxY := math.Inf(-1), math.Inf(-1)
	for _, l := range req.CutLines {
		if math.IsNaN(l.X1) || math.IsNaN(l.Y1) || math.IsNaN(l.X2) || math.IsNaN(l.Y2) ||
			math.IsInf(l.X1, 0) || math.IsInf(l.Y1, 0) || math.IsInf(l.X2, 0) || math.IsInf(l.Y2, 0) {
			continue
		}
		minX = math.Min(minX, math.Min(l.X1, l.X2))
		maxX = math.Max(maxX, math.Max(l.X1, l.X2))
		minY = math.Min(minY, math.Min(l.Y1, l.Y2))
		maxY = math.Max(maxY, math.Max(l.Y1, l.Y2))
	}
	if math.IsInf(minX, 1) || math.IsInf(minY, 1) || math.IsInf(maxX, -1) || math.IsInf(maxY, -1) {
		return nil
	}

	arm := math.Max(2, math.Min(req.PaperWidthMM, req.PaperHeightMM)*0.04)

	type corner struct {
		x, y, hx, hy float64
	}
	corners := []corner{
		{minX, minY, 1, 1},
		{maxX, minY, -1, 1},
		{minX, maxY, 1, -1},
		{maxX, maxY, -1, -1},
	}

	segs := make([]domain.CutLine, 0, len(corners)*2)
	for _, c := range corners {
		hStart, hEnd := c.x, c.x
		if c.hx > 0 {
			hEnd = c.x + arm
		} else {
			hStart = c.x - arm
		}
		segs = append(segs, domain.CutLine{X1: hStart, Y1: c.y, X2: hEnd, Y2: c.y})

		vStart, vEnd := c.y, c.y
		if c.hy > 0 {
			vEnd = c.y + arm
		} else {
			vStart = c.y - arm
		}
		segs = append(segs, domain.CutLine{X1: c.x, Y1: vStart, X2: c.x, Y2: vEnd})
	}
	return segs
}

// composeCanvas يرسم محتوى كانفاس الوضع الحر (خلفية + صور) بدقة الطباعة.
// العناصر تُفسَّر في فضاء الكانفاس (px): X/Y/W/H و CornerRadiusMM بالبكسل —
// يرسل الواجهة عناصر صالحة فقط (بلا دوران/شفافية/ظلال) مطابقة لعرض Konva.
// عقد الإرجاع: صورة مركبة، أو (nil, nil) عند غياب التركيب أو أبعاد غير صالحة
// (تُسجَّل تحذيراً وتُتجاوز — المتصل يرسم الخلايا الفارغة أو يتخطاها).
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
	if outW <= 0 || outH <= 0 || comp.CanvasWidthPx <= 0 || comp.CanvasHeightPx <= 0 ||
		math.IsNaN(comp.CanvasWidthMM) || math.IsNaN(comp.CanvasHeightMM) ||
		math.IsInf(comp.CanvasWidthMM, 0) || math.IsInf(comp.CanvasHeightMM, 0) {
		slog.Warn("print_compose: invalid composition dimensions, skipping composition",
			"canvasWidthPx", comp.CanvasWidthPx, "canvasHeightPx", comp.CanvasHeightPx,
			"canvasWidthMM", comp.CanvasWidthMM, "canvasHeightMM", comp.CanvasHeightMM,
			"dpi", req.DPI, "outW", outW, "outH", outH)
		return nil, nil
	}
	if len(comp.Items) > 100 {
		return nil, fmt.Errorf("too many composition items: %d (max limit is 100)", len(comp.Items))
	}

	scaleX := float64(outW) / float64(comp.CanvasWidthPx)
	scaleY := float64(outH) / float64(comp.CanvasHeightPx)

	dc := gg.NewContext(outW, outH)
	dc.SetColor(parseColor(comp.BackgroundColor))
	dc.Clear()

	// المرحلة 1 — تحميل ومعالجة متوازية (مقيدة بعدد الأنوية) بدل التسلسل.
	// الرسم يبقى تسلسلياً لأن gg.Context ليس آمناً للتزامن.
	type preparedItem struct {
		item         domain.PrintItem
		processedImg image.Image
	}
	prepared := make([]*preparedItem, len(comp.Items))
	var g errgroup.Group
	maxConcurrency := runtime.NumCPU()
	if maxConcurrency < 2 {
		maxConcurrency = 2
	}
	g.SetLimit(maxConcurrency)
	for i, item := range comp.Items {
		if item.ImageSrc == "" || item.W <= 0 || item.H <= 0 {
			continue
		}
		i, item := i, item
		g.Go(func() (err error) {
			// 🛡️ أي panic داخل العامل (مثل imaging.Resize على هدف ضخم) يتحول
			// لخطأ يحمل فهرس العنصر بدل إسقاط التطبيق كاملاً
			defer recoverPrintWorkerPanic(i, &err)
			filePath := resolveLocalPath(item.ImageSrc)
			cacheKey := computeImageCacheKey(filePath)
			img, err := loadRawImage(filePath, cacheKey, imgCache)
			if err != nil {
				return err
			}

			// 🛡️ سقف هدف التحجيم قبل imaging.Resize: أبعاد العنصر بوحدات
			// كانفاس-بكسل وقابلة للضخامة (50,000,000×50,000,000) فتُرفض هنا
			// بالقيمة العائمة أولاً (تحويل NaN/Inf/ضخم إلى int غير معرّف)
			targetWf := math.Round(item.W * scaleX)
			targetHf := math.Round(item.H * scaleY)
			if math.IsNaN(targetWf) || math.IsInf(targetWf, 0) ||
				math.IsNaN(targetHf) || math.IsInf(targetHf, 0) {
				return fmt.Errorf("أبعاد العنصر %d في كانفس التركيب غير صالحة بعد التحجيم (العرض=%.2f الارتفاع=%.2f)",
					i+1, item.W, item.H)
			}
			if targetWf > maxCanvasSidePx || targetHf > maxCanvasSidePx {
				return fmt.Errorf("العنصر %d في كانفس التركيب كبير جداً: %.0f×%.0f بكسل يتجاوز الحد الأقصى للضلع (%d بكسل)",
					i+1, targetWf, targetHf, maxCanvasSidePx)
			}
			targetW := int(targetWf)
			targetH := int(targetHf)
			if targetW < 1 {
				targetW = 1
			}
			if targetH < 1 {
				targetH = 1
			}
			if int64(targetW)*int64(targetH) > maxCanvasPixels {
				return fmt.Errorf("العنصر %d في كانفس التركيب كبير جداً: %d×%d بكسل يتجاوز الحد الأقصى (%d ميغابكسل)",
					i+1, targetW, targetH, maxCanvasPixels/1_000_000)
			}
			prepared[i] = &preparedItem{item: item, processedImg: applyImageProcessing(img, item, targetW, targetH)}
			return nil
		})
	}
	if err := g.Wait(); err != nil {
		return nil, err
	}

	// المرحلة 2 — رسم تسلسلي بالترتيب الأصلي
	for _, p := range prepared {
		if p == nil {
			continue
		}
		item := p.item
		processedImg := p.processedImg

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
		// ⚠️ في سياق التركيب (composeCanvas) تُفسَّر X/Y/W/H/CornerRadiusMM بكسل
		// الكانفاس لا بالمليمتر (خلافاً لمسار drawItemImage الذي يستقبل عناصر
		// موضوعة على الورقة بالمليمتر) — لذا الضرب في scaleX هو التحويل الصحيح
		// هنا، واستخدام mmToPx كان سيكبّر نصف القطر بمعامل مم/بكسل.
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
			// بكسل كانفاس في هذا السياق (سطر واحد مع نصف القطر أعلاه)
			bPx := item.BorderWidthMM * scaleX
			dc.SetHexColor(item.BorderColor)
			dc.SetLineWidth(bPx)
			dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
			dc.Stroke()
		}
	}

	return dc.Image(), nil
}
