package main

// screenWorkArea هي مساحة العمل المتاحة في شاشة (الشاشة الكاملة ناقص
// شريط المهام والأشرطة المحجوزة للنظام). جميع القيم بالبكسل المنطقي.
// استخدام مساحة العمل بدل أبعاد الشاشة الكاملة هو ما يمنع اختفاء أسفل
// النافذة (شريط الحالة) خلف شريط مهام ويندوز.
type screenWorkArea struct {
	X, Y, W, H int
}

const (
	// الحجم الافتراضي المفضل: مدمج ومناسب لأول تشغيل
	defaultWindowWidth  = 800
	defaultWindowHeight = 600

	// هامش أمان حول النافذة داخل مساحة العمل حتى لا تلتصق تماماً
	// بحواف الشاشة أو شريط المهام عند الإنشاء/الاستعادة
	windowSafeMargin = 24

	// حدود دنيا مطلقة ضد قيم تالفة في ملف الحالة (أصغر من حد Wails
	// الأدنى عمداً — Wails سيطبّق حده الخاص فوقها عند الإنشاء)
	absoluteMinWidth  = 320
	absoluteMinHeight = 240
)

// resolveDefaultWindowSize يحسب حجم النافذة الافتراضي متكيفاً مع الشاشة:
// الحجم المفضل 800×600، ويتقلص فقط إذا كانت مساحة العمل أصغر (شاشات
// صغيرة أو تكبير DPI مرتفع)، مع هامش أمان من كل الجهات.
// workW/workH <= 0 تعني "شاشة غير معروفة" فيُرجع الحجم المفضل كما هو.
func resolveDefaultWindowSize(workW, workH int) (int, int) {
	w, h := defaultWindowWidth, defaultWindowHeight
	if workW > 0 {
		if maxW := workW - windowSafeMargin*2; w > maxW {
			w = maxW
			if w < absoluteMinWidth {
				w = absoluteMinWidth
			}
		}
	}
	if workH > 0 {
		if maxH := workH - windowSafeMargin*2; h > maxH {
			h = maxH
			if h < absoluteMinHeight {
				h = absoluteMinHeight
			}
		}
	}
	return w, h
}

// sanitizeRestoredSize ينظف أبعاداً مستعادة من ملف الحالة قد تكون تالفة
// (صفر/سالبة من كتابة متقطعة، أو ضخمة من شاشة سابقة أكبر بكثير).
func sanitizeRestoredSize(w, h int) (int, int) {
	if w < absoluteMinWidth || w > 7680 {
		w = defaultWindowWidth
	}
	if h < absoluteMinHeight || h > 4320 {
		h = defaultWindowHeight
	}
	return w, h
}

// centerInWorkArea يعيد إحداثيات توسيط نافذة داخل مساحة عمل — التوسيط
// داخل مساحة العمل (لا الشاشة الكاملة) يضمن عدم وقوع النافذة تحت شريط المهام.
func centerInWorkArea(w, h int, area screenWorkArea) (int, int) {
	x := area.X + (area.W-w)/2
	if x < area.X {
		x = area.X
	}
	y := area.Y + (area.H-h)/2
	if y < area.Y {
		y = area.Y
	}
	return x, y
}

// clampWindowToWorkArea يحصر حدود نافذة مستعادة داخل مساحة عمل واحدة:
// يختار المساحة المحتوية لنقطة التثبيت (شريط العنوان x+50,y+50) وإلا
// المساحة الأولى، ثم يقلّص الأبعاد المتجاوزة ويسحب الموضع للداخل.
// areas فارغة تعني "لا معلومات" فتُرجع الحدود كما هي دون تعديل.
func clampWindowToWorkArea(w, h, x, y int, areas []screenWorkArea) (int, int, int, int) {
	if len(areas) == 0 {
		return w, h, x, y
	}
	pick := areas[0]
	ax, ay := x+50, y+50
	for _, a := range areas {
		if a.W <= 0 || a.H <= 0 {
			continue
		}
		if ax >= a.X && ax < a.X+a.W && ay >= a.Y && ay < a.Y+a.H {
			pick = a
			break
		}
	}
	if pick.W <= 0 || pick.H <= 0 {
		return w, h, x, y
	}
	if w > pick.W {
		w = pick.W
	}
	if h > pick.H {
		h = pick.H
	}
	if x < pick.X {
		x = pick.X
	}
	if y < pick.Y {
		y = pick.Y
	}
	if x+w > pick.X+pick.W {
		x = pick.X + pick.W - w
	}
	if y+h > pick.Y+pick.H {
		y = pick.Y + pick.H - h
	}
	return w, h, x, y
}
