package utils

import (
	"fmt"
	"log/slog"
	"runtime/debug"
	"sync"
)

// ─────────────────────────────────────────────────────────────────────────────
// safe_go.go — غلاف موحّد لـ goroutines التطبيق
//
// PanicHandler في Wails لا يرى إلا المسارات التي يديرها (دورة الحياة، الأحداث،
// الـ mainthread، الحوارات، الاختصارات). أما goroutines التطبيق — عمال معالجة
// الصور والطباعة، خوادم OAuth وجسر الهاتف، منظفات الخلفية — فأي panic فيها كان
// يقتل العملية بلا تقرير انهيار وبلا إعادة تشغيل، والمكدس يذهب إلى stderr غير
// المرئي في تطبيق GUI. SafeGo يجعل كل هذه المصادر تمر عبر مسار الانهيار نفسه.
//
// العقد: الغلاف لا يبتلع خطأً أبداً. بلا مستقبل مسجَّل يُسجَّل الـ panic ثم يُعاد
// إطلاقه (سلوك Go الافتراضي) — فالانهيار لا يُخفى حتى لو نُسي الربط.
// ─────────────────────────────────────────────────────────────────────────────

// PanicReporter مستقبل panics الـ goroutines: اسم المصدر، الخطأ، وتتبّع المكدس.
type PanicReporter func(name string, err error, stack string)

var (
	panicReporterMu sync.RWMutex
	panicReporter   PanicReporter
)

// SetPanicReporter يربط مستقبل panics (يُربط في main بمسار الانهيار قبل إطلاق أي
// goroutine محمية). التغيير آمن أثناء العمل لكنه يُقصد أن يقع عند الإقلاع.
// يعيد المستقبل السابق (nil إن لم يوجد) — للاختبارات وأي ربط مؤقت.
func SetPanicReporter(reporter PanicReporter) PanicReporter {
	panicReporterMu.Lock()
	defer panicReporterMu.Unlock()

	previous := panicReporter
	panicReporter = reporter
	return previous
}

func currentPanicReporter() PanicReporter {
	panicReporterMu.RLock()
	defer panicReporterMu.RUnlock()
	return panicReporter
}

// SafeGo يشغّل fn في goroutine محمية: أي panic داخلها يُمرَّر إلى مسار الانهيار
// الموحّد بدل موت صامت. name يظهر في تقرير الانهيار لتحديد المصدر.
func SafeGo(name string, fn func()) {
	go func() {
		defer func() {
			r := recover()
			if r == nil {
				return
			}

			err := fmt.Errorf("panic in %s: %v", name, r)
			stack := string(debug.Stack())

			if reporter := currentPanicReporter(); reporter != nil {
				reporter(name, err, stack)
				return
			}

			// لا مستقبل ⇒ لا نُخفي الانهيار: نسجّله ثم نعيد إطلاقه كما لو لم
			// يوجد الغلاف (يفشل الاختبار/العملية بصوت مسموع).
			slog.Error("Unhandled panic in application goroutine (no crash reporter registered)",
				"goroutine", name, "error", err.Error(), "stack", stack)
			panic(r)
		}()
		fn()
	}()
}
