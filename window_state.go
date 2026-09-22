package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"grido/internal/utils"
)

type windowState struct {
	Width  int  `json:"width"`
	Height int  `json:"height"`
	X      int  `json:"x"`
	Y      int  `json:"y"`
	Max    bool `json:"max"`
}

// المقاسات الافتراضية للنافذة — الافتراضي الحالي 1280×800، وما قبله كان
// يُفتح في الوضع المدمج (أصغر من نقطة انكسار الواجهة 1024).
const (
	defaultWindowWidth  = 1280
	defaultWindowHeight = 800
)

// isLegacyDefaultWindowSize يميّز المقاسات الافتراضية القديمة عن مقاس اختاره
// المستخدم بنفسه: المحفوظات 960×640 (الافتراضي الأقدم) و 1024×720 تُرقّى
// مرة واحدة إلى الافتراضي الجديد، وأي مقاس آخر يُحترم كما هو.
func isLegacyDefaultWindowSize(width, height int) bool {
	return (width == 960 && height == 640) || (width == 1024 && height == 720)
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
