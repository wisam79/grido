package main

// window_sizing.go — حساب أبعاد النافذة وموضعها وفق مساحة العمل الفعلية.
//
// المصدر الوحيد للحجم المفضل هو window_state.go (defaultWindowWidth/Height)
// وهو أيضاً صاحب منطق ترقية المقاسات الافتراضية القديمة؛ هذا الملف يضيف فوقه:
//   • تقليص الافتراضي ليدخل في مساحة العمل (شاشات صغيرة أو تكبير DPI مرتفع)،
//   • تنظيف مقاسات مستعادة تالفة أو مبالغاً فيها من شاشة أكبر،
//   • حصر نافذة مستعادة داخل مساحة عمل الشاشة التي كانت عليها.
//
// مساحة العمل = الشاشة كاملة ناقص شريط المهام والأشرطة المحجوزة للنظام، وهي
// ما يمنع اختفاء أسفل النافذة (شريط الحالة) خلف شريط مهام ويندوز.

// screenWorkArea هي مساحة العمل المتاحة في شاشة واحدة (بالبكسل المنطقي).
type screenWorkArea struct {
	X, Y, W, H int
}

const (
	// هامش أمان حول النافذة داخل مساحة العمل حتى لا تلتصق تماماً بحواف
	// الشاشة أو شريط المهام عند الإنشاء/الاستعادة
	windowSafeMargin = 24

	// حدود دنيا مطلقة ضد قيم تالفة في ملف الحالة. أصغر من MinWidth/MinHeight
	// في خيارات النافذة (840×560) عمداً: Wails يطبّق حدّه فوقها، لكن لا نريد
	// إبطال مقاس محفوظ مشروع لمجرد أنه أصغر من الحد الأدنى للنافذة.
	absoluteMinWidth  = 320
	absoluteMinHeight = 240

	// سقف معقول لمقاس مستعاد (شاشات 8K وأعلى) — فوقه يُعاد للافتراضي
	maxSaneWidth  = 7680
	maxSaneHeight = 4320
)

// resolveDefaultWindowSize يحسب حجم النافذة الافتراضي متكيفاً مع مساحة العمل:
// الحجم المفضل (1280×800)، ويتقلص فقط إذا كانت مساحة العمل أصغر منه، مع هامش
// أمان من كل الجهات.
// workW/workH <= 0 تعني "شاشة غير معروفة" فيُرجع الحجم المفضل كما هو.
func resolveDefaultWindowSize(workW, workH int) (int, int) {
	w, h := defaultWindowWidth, defaultWindowHeight
	if workW > 0 {
		if maxW := workW - windowSafeMargin*2; w > maxW {
			w = maxW
		}
	}
	if workH > 0 {
		if maxH := workH - windowSafeMargin*2; h > maxH {
			h = maxH
		}
	}
	// لا ننزل تحت الحد الأدنى المطلق حتى على شاشة أصغر من الهامش مرتين
	if w < absoluteMinWidth {
		w = absoluteMinWidth
	}
	if h < absoluteMinHeight {
		h = absoluteMinHeight
	}
	return w, h
}

// sanitizeRestoredSize ينظف أبعاداً مستعادة من ملف الحالة قد تكون تالفة
// (صفر/سالبة من كتابة متقطعة، أو ضخمة من شاشة سابقة أكبر بكثير).
func sanitizeRestoredSize(w, h int) (int, int) {
	if w < absoluteMinWidth || w > maxSaneWidth {
		w = defaultWindowWidth
	}
	if h < absoluteMinHeight || h > maxSaneHeight {
		h = defaultWindowHeight
	}
	return w, h
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

// workAreasAround يعيد مساحات العمل المرشّحة لنقطة تثبيت نافذة (px,py):
// الشاشة المحتوية إن وُجدت وإلا الشاشة الأساسية (شاشة فُصلت بعد حفظ الوضع)،
// وإلا قائمة فارغة على المنصات التي لا استعلام شاشات فيها ⇒ لا تعديل.
func workAreasAround(px, py int) []screenWorkArea {
	if area, ok := workAreaForPointOrPrimary(px, py); ok {
		return []screenWorkArea{area}
	}
	return nil
}
