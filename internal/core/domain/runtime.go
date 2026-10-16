package domain

import "errors"

// RuntimeBridge منفذ رنتايم التطبيق المضيف: بث الأحداث للواجهة، فتح الروابط
// الخارجية، وطلب إغلاق نظيف. الإعلان في طبقة النطاق يفصل خدمات الأعمال
// (الترخيص/جسر الهاتف/المحدّث) عن رنتايم Wails — الملف الوحيد الذي يلمس
// application.Get() هو WailsRuntimeBridge في طبقة الخدمات (runtime_wails.go)،
// والخدمات تتحدث إلى هذا المنفذ فقط (نفس نمط LicenseRepository).
type RuntimeBridge interface {
	// Emit يبث حدثاً للواجهة (اسم الحدث + الحمولات).
	Emit(name string, data ...any)
	// OpenURL يفتح رابطاً في المتصفح الافتراضي.
	OpenURL(url string) error
	// Quit يطلب إغلاق التطبيق نظيفاً (تنفيذ OnShutdown قبل خروج العملية).
	Quit()
}

// NoopRuntimeBridge جسر صامت آمن لبيئات بلا رنتايم مضيف: لا يبث ولا يغلق،
// ويفشل فتح الروابط بخطأ واضح بدل سلوك غامض.
type NoopRuntimeBridge struct{}

func (NoopRuntimeBridge) Emit(string, ...any) {}

func (NoopRuntimeBridge) OpenURL(string) error {
	return errors.New("browser opener is not configured: no runtime bridge")
}

func (NoopRuntimeBridge) Quit() {}
