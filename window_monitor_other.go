//go:build !windows || bindings

package main

func isPointOnAnyMonitor(_, _ int) bool {
	return true
}

// workAreaForPointOrPrimary: لا استعلام شاشات أصلي على هذه المنصة — Wails نفسه
// يتولى التوسيط داخل مساحة عمل الشاشة الأساسية، فنجيب "لا معلومات" (ok=false)
// فتمرّ المقاسات والموضع كما هما بلا أي تعديل.
func workAreaForPointOrPrimary(_, _ int) (screenWorkArea, bool) {
	return screenWorkArea{}, false
}
