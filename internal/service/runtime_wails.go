package service

import (
	"errors"

	"grido/internal/core/domain"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// WailsRuntimeBridge — ملف التكيّف الوحيد الذي يلمس application.Get() نيابة عن
// خدمات الأعمال (التوافق مع سلوك ما قبل الفصل حرفياً):
//   - بلا تطبيق Wails (اختبارات/CLI) يصير البث والإغلاق no-op بدل الذعر.
//   - فتح المتصفح يفشل بخطأ واضح بدل سلوك غامض.
//
// يُحقن افتراضياً في الخدمات ويُستبدل في الاختبارات بـ SetRuntimeBridge
// (أو SetBrowserOpener في الترخيص).
type WailsRuntimeBridge struct{}

var _ domain.RuntimeBridge = WailsRuntimeBridge{}

func NewWailsRuntimeBridge() WailsRuntimeBridge { return WailsRuntimeBridge{} }

func (WailsRuntimeBridge) Emit(name string, data ...any) {
	if app := application.Get(); app != nil {
		app.Event.Emit(name, data...)
	}
}

func (WailsRuntimeBridge) OpenURL(target string) error {
	app := application.Get()
	if app == nil {
		return errors.New("browser opener is not configured: application runtime is nil")
	}
	return app.Browser.OpenURL(target)
}

func (WailsRuntimeBridge) Quit() {
	if app := application.Get(); app != nil {
		app.Quit()
	}
}

func (WailsRuntimeBridge) SaveFileDialog(title, defaultFilename string, filters []domain.FileFilter) (string, error) {
	app := application.Get()
	if app == nil {
		return "", errors.New("dialog service not configured: application runtime is nil")
	}
	d := app.Dialog.SaveFile()
	if title != "" {
		d.SetMessage(title)
	}
	if defaultFilename != "" {
		d.SetFilename(defaultFilename)
	}
	for _, f := range filters {
		d.AddFilter(f.DisplayName, f.Pattern)
	}
	return d.PromptForSingleSelection()
}

