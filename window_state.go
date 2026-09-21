package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"grido/internal/utils"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type windowState struct {
	Width  int  `json:"width"`
	Height int  `json:"height"`
	X      int  `json:"x"`
	Y      int  `json:"y"`
	Max    bool `json:"max"`
}

func getWindowStatePath() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "window.json")
}

func loadWindowState() (windowState, error) {
	path := getWindowStatePath()
	var state windowState
	data, err := os.ReadFile(path)
	if err != nil {
		return state, err
	}
	err = json.Unmarshal(data, &state)
	return state, err
}

func saveWindowState(state windowState) error {
	path := getWindowStatePath()
	if path == "" {
		return fmt.Errorf("could not get config path")
	}
	// تأكد من وجود المجلد
	dir := filepath.Dir(path)
	_ = os.MkdirAll(dir, 0755)

	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	// كتابة ذرية موحّدة (utils.AtomicWriteFile) — انقطاع أثناء الحفظ
	// لا يترك window.json تالفاً أو صفرياً
	return utils.AtomicWriteFile(path, data, 0o644)
}

func getWebviewCacheDir() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "webview_cache")
}

// persistWindowState يلتقط أبعاد وموضع وحالة النافذة الحالية ويحفظها
// ذرياً — يُستدعى عند الإغلاق وعند كل تحوّل حالة (تكبير/استعادة)
// حتى تنجو الاستعادة من الإنهاء المفاجئ أيضاً، لا الإغلاق النظيف فقط.
//
// ⚠️ أثناء التكبير يُرجع Size() أبعاد ملء مساحة العمل لا الأبعاد العادية —
// حفظها كان يُلوث أبعاد الاستعادة (إلغاء التكبير لاحقاً يفتح نافذة بحجم
// الشاشة). لذا عند التكبير نُحدّث علم Max فقط ونُبقي آخر أبعاد عادية.
func persistWindowState(mainWindow *application.WebviewWindow) {
	if mainWindow == nil {
		return
	}
	if mainWindow.IsMaximised() {
		if prev, err := loadWindowState(); err == nil && prev.Width > 0 && prev.Height > 0 {
			prev.Max = true
			_ = saveWindowState(prev)
			return
		}
		// لا حالة عادية سابقة (تكبير قبل أي حفظ): علم مع أبعاد افتراضية آمنة
		_ = saveWindowState(windowState{
			Width:  defaultWindowWidth,
			Height: defaultWindowHeight,
			Max:    true,
		})
		return
	}
	w, h := mainWindow.Size()
	x, y := mainWindow.Position()
	_ = saveWindowState(windowState{
		Width:  w,
		Height: h,
		X:      x,
		Y:      y,
		Max:    false,
	})
}
