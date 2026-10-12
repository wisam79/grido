//go:build !windows || bindings

package desktop

func IsPointOnAnyMonitor(_, _ int) bool {
	return true
}

// WorkAreaForPointOrPrimary: لا استعلام شاشات أصلي على هذه المنصة — Wails نفسه
// يتولى التوسيط داخل مساحة عمل الشاشة الأساسية، فنجيب "لا معلومات" (ok=false)
// فتمرّ المقاسات والموضع كما هما بلا أي تعديل.
func WorkAreaForPointOrPrimary(_, _ int) (ScreenWorkArea, bool) {
	return ScreenWorkArea{}, false
}
