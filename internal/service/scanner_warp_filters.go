package service

import (
	"image"
	"math"
)

// 🎨 فلاتر ماسح المستندات في Go — منقولة حرفياً من
// frontend/src/components/editor/document-scanner/core/filters.ts
// ومثبَّتة بـfixtures توازٍ (RMSE < 2/255) لكل وضع.
// أي تعديل هنا يكسر التوازي مع الواجهة — يُحدَّث المساران معاً أو لا شيء.

func applyScannerFilterMode(img *image.NRGBA, mode ScannerFilterMode) *image.NRGBA {
	switch mode {
	case FilterMagic:
		applyScannerMagicFilter(img)
	case FilterBW:
		applyScannerOtsuFilter(img)
	case FilterGrayscale:
		applyScannerGrayscaleFilter(img)
	case FilterSharpen:
		applyScannerSharpenFilter(img)
	case FilterDeyellow:
		applyScannerDeyellowFilter(img)
	case FilterOriginal:
	}
	return img
}

// lumShift10 يكافئ `(306r + 601g + 117b) >> 10` في TS (قسمة صحيحة لأسفل).
func lumShift10(r, g, b uint8) int {
	return (306*int(r) + 601*int(g) + 117*int(b)) >> 10
}

// jsRoundF يكافئ Math.round في JS ثم كتابة في Uint8ClampedArray (قصّ 0..255).
func jsRoundF(x float64) uint8 {
	v := math.Floor(x + 0.5)
	if v < 0 {
		return 0
	}
	if v > 255 {
		return 255
	}
	return uint8(v)
}

// applyScannerMagicFilter منقولة من applyMagicColorFilter: تبييض الخلفية
// وتمديد النطاق الديناميكي مع حماية الألوان المشبعة.
func applyScannerMagicFilter(img *image.NRGBA) {
	w := img.Bounds().Dx()
	h := img.Bounds().Dy()
	pix := img.Pix
	stride := img.Stride

	// 1. متوسط إضاءة العينة الفاتحة لتقدير لون الورقة
	sampleStep := max(1, int(math.Floor(math.Sqrt(float64(w*h)/1500))))
	bgSum := 0.0
	bgCount := 0
	for y := 0; y < h; y += sampleStep {
		for x := 0; x < w; x += sampleStep {
			idx := y*stride + x*4
			gray := 0.299*float64(pix[idx]) + 0.587*float64(pix[idx+1]) + 0.114*float64(pix[idx+2])
			if gray > 115 {
				bgSum += gray
				bgCount++
			}
		}
	}
	avgBg := 210.0
	if bgCount > 0 {
		avgBg = bgSum / float64(bgCount)
	}
	whitePoint := math.Max(165, math.Min(245, avgBg*0.94))

	// 2. منحنى التباين الذكي
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			idx := y*stride + x*4
			ri, gi, bi := pix[idx], pix[idx+1], pix[idx+2]

			lum := lumShift10(ri, gi, bi)
			maxC := math.Max(float64(ri), math.Max(float64(gi), float64(bi)))
			minC := math.Min(float64(ri), math.Min(float64(gi), float64(bi)))
			saturation := 0.0
			if maxC > 0 {
				saturation = (maxC - minC) / maxC
			}

			r := math.Min(255, (float64(ri)/whitePoint)*255)
			g := math.Min(255, (float64(gi)/whitePoint)*255)
			b := math.Min(255, (float64(bi)/whitePoint)*255)

			if lum > 200 && saturation < 0.35 {
				boost := math.Min(1, float64(lum-200)/45)
				r = math.Min(255, r+(255-r)*boost)
				g = math.Min(255, g+(255-g)*boost)
				b = math.Min(255, b+(255-b)*boost)
			}

			if lum < 95 {
				r *= 0.82
				g *= 0.82
				b *= 0.82
			}

			pix[idx] = jsRoundF(r)
			pix[idx+1] = jsRoundF(g)
			pix[idx+2] = jsRoundF(b)
			pix[idx+3] = 255
		}
	}
}

// applyScannerOtsuFilter منقولة من applyOtsuFilter: عتبة تكيفية (Bradley)
// عبر الصورة التكاملية.
func applyScannerOtsuFilter(img *image.NRGBA) {
	w := img.Bounds().Dx()
	h := img.Bounds().Dy()
	pix := img.Pix
	stride := img.Stride

	gray := make([]uint8, w*h)
	for i := 0; i < w*h; i++ {
		idx := i * 4
		gray[i] = jsRoundF(0.299*float64(pix[idx]) + 0.587*float64(pix[idx+1]) + 0.114*float64(pix[idx+2]))
	}

	// الصورة التكاملية (uint64 يستوعب مجموع 255*w*h دائماً — يكافئ اختيار
	// Uint32/Float64 في buildIntegralImage)
	intW := w + 1
	integral := make([]uint64, intW*(h+1))
	for y := 0; y < h; y++ {
		rowSum := uint64(0)
		for x := 0; x < w; x++ {
			rowSum += uint64(gray[y*w+x])
			integral[(y+1)*intW+x+1] = integral[y*intW+x+1] + rowSum
		}
	}

	windowRadius := max(8, min(32, min(w, h)/18))
	const c = 8

	for y := 0; y < h; y++ {
		y1 := max(0, y-windowRadius)
		y2 := min(h, y+windowRadius+1)
		for x := 0; x < w; x++ {
			x1 := max(0, x-windowRadius)
			x2 := min(w, x+windowRadius+1)

			count := (y2 - y1) * (x2 - x1)
			sum := integral[y2*intW+x2] - integral[y1*intW+x2] - integral[y2*intW+x1] + integral[y1*intW+x1]

			localMean := float64(sum) / float64(count)
			val := uint8(255)
			if float64(gray[y*w+x]) < localMean-c {
				val = 0
			}

			idx := y*stride + x*4
			pix[idx] = val
			pix[idx+1] = val
			pix[idx+2] = val
		}
	}
}

// applyScannerGrayscaleFilter منقولة من applyGrayscaleFilter — العينة هنا
// خطية على المصفوفة المسطحة (كل بكسل رقم sampleStep) كما في TS.
func applyScannerGrayscaleFilter(img *image.NRGBA) {
	w := img.Bounds().Dx()
	h := img.Bounds().Dy()
	pix := img.Pix
	stride := img.Stride
	total := w * h

	bgSum := 0
	bgCount := 0
	sampleStep := max(1, int(math.Floor(math.Sqrt(float64(total)/1000))))

	for i := 0; i < total; i += sampleStep {
		idx := i * 4
		lum := lumShift10(pix[idx], pix[idx+1], pix[idx+2])
		if lum > 130 {
			bgSum += lum
			bgCount++
		}
	}

	whitePoint := 220.0
	if bgCount > 0 {
		whitePoint = math.Max(30, math.Min(250, float64(bgSum)/float64(bgCount)*0.95))
	}

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			idx := y*stride + x*4
			lum := float64(lumShift10(pix[idx], pix[idx+1], pix[idx+2]))

			lum = math.Min(255, (lum/whitePoint)*255)
			if lum > 210 {
				lum = math.Min(255, lum+(255-lum)*0.85)
			} else if lum < 90 {
				lum *= 0.85
			}

			finalVal := jsRoundF(lum)
			pix[idx] = finalVal
			pix[idx+1] = finalVal
			pix[idx+2] = finalVal
			pix[idx+3] = 255
		}
	}
}

// applyScannerSharpenFilter منقولة من applySharpenFilter: نواة Laplacian
// (المركز 3.0 والجيران -0.5) مع نسخ الحواف.
func applyScannerSharpenFilter(img *image.NRGBA) {
	w := img.Bounds().Dx()
	h := img.Bounds().Dy()
	pix := img.Pix
	stride := img.Stride
	if w <= 2 || h <= 2 {
		return
	}

	src := make([]uint8, len(pix))
	copy(src, pix)

	const centerWeight = 3.0
	const neighborWeight = -0.5

	for y := 0; y < h; y++ {
		rowOffset := y * stride
		isBorderRow := y == 0 || y == h-1
		for x := 0; x < w; x++ {
			idx := rowOffset + x*4
			if isBorderRow || x == 0 || x == w-1 {
				pix[idx] = src[idx]
				pix[idx+1] = src[idx+1]
				pix[idx+2] = src[idx+2]
				pix[idx+3] = 255
				continue
			}

			idxUp := (y-1)*stride + x*4
			idxDown := (y+1)*stride + x*4
			idxLeft := rowOffset + (x-1)*4
			idxRight := rowOffset + (x+1)*4

			for c := 0; c < 3; c++ {
				val := float64(src[idx+c])*centerWeight +
					(float64(src[idxUp+c])+float64(src[idxDown+c])+float64(src[idxLeft+c])+float64(src[idxRight+c]))*neighborWeight
				pix[idx+c] = jsRoundF(val)
			}
			pix[idx+3] = 255
		}
	}
}

// applyScannerDeyellowFilter منقولة من applyDeYellowFilter: تعويض القناة
// الزرقاء الناقصة عند رصد اصفرار مع إبقاء الحبر الداكن كما هو.
func applyScannerDeyellowFilter(img *image.NRGBA) {
	w := img.Bounds().Dx()
	h := img.Bounds().Dy()
	pix := img.Pix
	stride := img.Stride

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			idx := y*stride + x*4
			r := pix[idx]
			g := pix[idx+1]
			b := float64(pix[idx+2])

			lum := lumShift10(r, g, pix[idx+2])
			yellowDiff := (float64(r)+float64(g))/2 - b

			if yellowDiff > 8 && lum > 90 {
				b = math.Min(255, b+yellowDiff*0.92)
			}

			pix[idx] = jsRoundF(math.Min(255, float64(r)))
			pix[idx+1] = jsRoundF(math.Min(255, float64(g)))
			pix[idx+2] = jsRoundF(b)
			pix[idx+3] = 255
		}
	}
}
