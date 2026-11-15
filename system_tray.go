package main

import (
	_ "embed"
	"log/slog"

	"grido/internal/service"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed build/appicon.png
var trayIconPNG []byte

// appQuitEvent اسم حدث طلب الخروج — على الواجهة الاستماع له وتنفيذ بروتوكول الحفظ ثم التأكيد.
const appQuitEvent = "app:quit-requested"

// SetupSystemTray ينشئ أيقونة صينية النظام القياسية للتطبيق.
//
// الممارسة القياسية لتطبيقات الإنتاج: وجود دائم في الصينية يمنح المستخدم
// نقطة استعادة للنافذة (إظهار/تركيز) ومسار خروج سريع، ويبقي التطبيق
// قابلاً للوصول أثناء عمليات الخلفية (تصدير/ذكاء اصطناعي) حتى لو أُخفيت النافذة.
func SetupSystemTray(wailsApp *application.App, mainWindow *application.WebviewWindow, quitCoordinator *service.QuitCoordinator) {
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
		// خروج نظيف موحد عبر QuitCoordinator (حفظ حالة النافذة + بث app:quit-requested)
		if quitCoordinator != nil {
			quitCoordinator.RequestQuit()
			return
		}
		wailsApp.Quit()
	})
	tray.SetMenu(menu)

	// نقرة واحدة تستعيد النافذة، والنقرة المزدوجة كذلك (سلوك ويندوز المألوف)
	tray.OnClick(showWindow)
	tray.OnDoubleClick(showWindow)

	slog.Info("System tray initialised")
}
