package main

import (
	_ "embed"
	"log/slog"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed build/appicon.png
var trayIconPNG []byte

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
		wailsApp.Quit()
	})
	tray.SetMenu(menu)

	// نقرة واحدة تستعيد النافذة، والنقرة المزدوجة كذلك (سلوك ويندوز المألوف)
	tray.OnClick(showWindow)
	tray.OnDoubleClick(showWindow)

	slog.Info("System tray initialised")
}
