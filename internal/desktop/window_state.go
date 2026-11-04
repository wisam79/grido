package desktop

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

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

// lastSavedWindowState يتذكّر آخر سلسلة مُسلسَلة كُتبت فعلاً على القرص.
// الحفظ الدوري كل 30 ثانية يقارن الحالة الحالية بها ويتخطى الكتابة الذرية
// كلياً عند التطابق (لا تغيّر في الهندسة أو وضع التكبير) فلا يُلمس الملف
// بلا داعٍ ولا تُستدعى دورة fsync/rename فارغة. القفل يحمي القيمة ويُسلسل
// الكتّاب المتزامنين (خيط الإغلاق والحفظ الدوري).
var (
	windowStateMu        sync.Mutex
	lastSavedWindowState string
)

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

	windowStateMu.Lock()
	defer windowStateMu.Unlock()

	// الحالة مطابقة تماماً لآخر قيمة محفوظة في الذاكرة — تخطَّ الكتابة
	// الذرية كلياً (لا .tmp ولا fsync ولا rename).
	if string(data) == lastSavedWindowState {
		return nil
	}
	if err := utils.AtomicWriteFile(path, data, 0644); err != nil {
		return err
	}
	lastSavedWindowState = string(data)
	return nil
}

func GetWebviewCacheDir() string {
	appDir := utils.GetAppDir()
	return filepath.Join(appDir, "webview_cache")
}
