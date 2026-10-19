package main

import (
	_ "embed"
	"log/slog"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed build/appicon.png
var trayIconPNG []byte

// ─────────────────────────────────────────────────────────────────────────────
// 🛑 عقد الخروج النظيف (Graceful Quit Contract)
//
// المشكلة: كل مسارات الخروج السابقة كانت تُنهي التطبيق فوراً (زر الصينية أو
// إغلاق النافذة)، أي أن الحفظ التلقائي وجلسات الخلفية لم تكن تحظى بفرصة
// التفريغ قبل إغلاق قاعدة البيانات وموت العملية.
//
// العقد الجديد: Go لا يُنهي مباشرةً، بل يبعث حدث **app:quit-requested**
// للواجهة؛ تستمع الواجهة للحدث وتُفرغ الحفظ التلقائي ثم تؤكّد الخروج
// باستدعاء `Quit()` من جسر الرنتايم (`@wailsio/runtime` → `Application.Quit`
// → method 2 في MessageProcessor → `App.Quit()` في Wails) بلا أي ربط Go جديد.
// الوصول إلى Quit الحقيقي يعني `App.Quit()` ⇒ `cleanup()` ⇒ OnShutdown
// (حفظ حالة النافذة، إيقاف المهام، إغلاق قاعدة البيانات) ثم خروج الحلقة.
//
// شبكة الأمان: مهلة 5 ثوانٍ إن لم تُؤكّد الواجهة الخروج (جسر منقطع أو صفحة
// لم تُحمّل بعد) فيُنهي التطبيق قسرياً بدل أن يبقى حياً بلا واجهة تستجيب.
// ─────────────────────────────────────────────────────────────────────────────

// appQuitEvent اسم حدث طلب الخروج — على الواجهة الاستماع له ثم استدعاء Quit.
const appQuitEvent = "app:quit-requested"

// quitSafetyTimeout مهلة الانتظار قبل الخروج القسري عند غياب تأكيد الواجهة.
const quitSafetyTimeout = 5 * time.Second

// quitRequestMu يحمي حالة مقبض الخروج النظيف (مؤقت الأمان) من تسابق خيط
// مستمع WindowClosing مع خيط زر الصينية.
var quitRequestMu sync.Mutex

// quitSafetyTimer غير nil يعني أن هناك طلب خروج معلّق ينتظر تأكيد الواجهة.
var quitSafetyTimer *time.Timer

// requestGracefulQuit يطلب خروجاً نظيفاً من التطبيق: يبعث app:quit-requested
// للواجهة لتفريغ الحفظ التلقائي، ويسلّح مهلة أمان تُنهي العملية إن لم يصل
// التأكيد. الطلبات المتكررة أثناء الانتظار لا تُعيد البعث ولا تُسلّح مؤقتاً
// جديداً — العقد هو طلب واحد معلّق.
func requestGracefulQuit(wailsApp *application.App) {
	if wailsApp == nil {
		return
	}

	quitRequestMu.Lock()
	if quitSafetyTimer != nil {
		// طلب معلّق سابق: لا نُكرّر البعث ولا نُطيل المهلة بإعادة التسليح
		quitRequestMu.Unlock()
		return
	}
	slog.Info("Graceful quit requested — awaiting frontend autosave flush",
		"event", appQuitEvent, "safety_timeout", quitSafetyTimeout.String())
	wailsApp.Event.Emit(appQuitEvent)
	quitSafetyTimer = time.AfterFunc(quitSafetyTimeout, func() {
		slog.Warn("Frontend never confirmed quit — quitting after safety timeout",
			"event", appQuitEvent, "timeout", quitSafetyTimeout.String())
		wailsApp.Quit()
	})
	quitRequestMu.Unlock()
}

// cancelQuitSafetyTimeout يُلغي مؤقت أمان الخروج عند وصول الخروج الحقيقي.
// يُستدعى من OnShutdown: الخروج المؤكَّد يصل دائماً عبر App.Quit() (الواجهة
// تؤكّد، أو المثبّت، أو المهلة نفسها) وهو وحده يُشغّل OnShutdown.
func cancelQuitSafetyTimeout() {
	quitRequestMu.Lock()
	defer quitRequestMu.Unlock()
	if quitSafetyTimer != nil {
		quitSafetyTimer.Stop()
		quitSafetyTimer = nil
	}
}

// SetupSystemTray ينشئ أيقونة صينية النظام القياسية للتطبيق.
//
// الممارسة القياسية لتطبيقات الإنتاج: وجود دائم في الصينية يمنح المستخدم
// نقطة استعادة للنافذة (إظهار/تركيز) ومسار خروج سريع، ويبقي التطبيق
// قابلاً للوصول أثناء عمليات الخلفية (تصدير/ذكاء اصطناعي) حتى لو أُخفيت النافذة.
func SetupSystemTray(wailsApp *application.App, mainWindow *application.WebviewWindow) {
	tray := wailsApp.SystemTray.New()
	if len(trayIconPNG) > 0 {
		tray.SetIcon(trayIconPNG)
	}
	tray.SetTooltip("Grido Studio")

	showWindow := func() {
		if mainWindow == nil {
			return
		}
		if mainWindow.IsMinimised() {
			mainWindow.UnMinimise()
		}
		mainWindow.Show()
		mainWindow.Focus()
	}

	menu := wailsApp.NewMenu()
	menu.Add("إظهار النافذة").OnClick(func(_ *application.Context) {
		showWindow()
	})
	menu.AddSeparator()
	menu.Add("إنهاء Grido Studio").OnClick(func(_ *application.Context) {
		// خروج نظيف: نطلب من الواجهة تفريغ الحفظ التلقائي أولاً وتأكيد الخروج
		// عبر Quit في الرنتايم — لا إنهاء مباشر (انظر عقد الخروج أعلى الملف).
		requestGracefulQuit(wailsApp)
	})
	tray.SetMenu(menu)

	// نقرة واحدة تستعيد النافذة، والنقرة المزدوجة كذلك (سلوك ويندوز المألوف)
	tray.OnClick(showWindow)
	tray.OnDoubleClick(showWindow)

	slog.Info("System tray initialised")
}
