package desktop

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"grido/internal/utils"
)

type WindowState struct {
	Width  int  `json:"width"`
	Height int  `json:"height"`
	X      int  `json:"x"`
	Y      int  `json:"y"`
	Max    bool `json:"max"`
}

// المقاسات الافتراضية للنافذة — الافتراضي الحالي 1280×800، وما قبله كان
// يُفتح في الوضع المدمج (أصغر من نقطة انكسار الواجهة 1024).
const (
	DefaultWindowWidth  = 1280
	DefaultWindowHeight = 800
)

// IsLegacyDefaultWindowSize يميّز المقاسات الافتراضية القديمة عن مقاس اختاره
// المستخدم بنفسه: المحفوظات 960×640 (الافتراضي الأقدم) و 1024×720 تُرقّى
// مرة واحدة إلى الافتراضي الجديد، وأي مقاس آخر يُحترم كما هو.
func IsLegacyDefaultWindowSize(width, height int) bool {
	return (width == 960 && height == 640) || (width == 1024 && height == 720)
}

func GetWindowStatePath() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "window.json")
}

func LoadWindowState() (WindowState, error) {
	path := GetWindowStatePath()
	var state WindowState
	data, err := os.ReadFile(path)
	if err != nil {
		return state, err
	}
	err = json.Unmarshal(data, &state)
	return state, err
}

func SaveWindowState(state WindowState) error {
	path := GetWindowStatePath()
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
	return utils.AtomicWriteFile(path, data, 0644)
}

func GetWebviewCacheDir() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "webview_cache")
}

