package service

import (
	"fmt"
	"image"
	"image/color"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/disintegration/imaging"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_test_staging_test.go — تدريج صور الاختبار عبر عقد الإدخال الإنتاجي
//
// سياسة النطاق (RV-Print-07) تحصر ImageSrc في: data: URLs و/local-image/…
// (Media/Exports داخل مجلد التطبيق). أي اختبار طباعة يحتاج صورة ملف يجب أن
// يمر من هنا — المسارات المطلقة الخارجية مرفوضة كما في الإنتاج تماماً.
// العزل: اسم الملف يتضمن اسم الاختبار (الكاش المشترك مفتاحه المسار، فالتكرار
// عبر الاختبارات كان سيلوّث الألوان بينها).
// المتطلب: GRIDO_APP_DIR مضبوط مسبقاً (t.Setenv) لعزل القرص عن المستخدم.
// ─────────────────────────────────────────────────────────────────────────────

// stagePrintTestImage تولّد صورة صلبة اللون w×h في <appDir>/Media وتعيد
// مسار /local-image/… كما يفعل نسخ الاستيراد الإنتاجي (MediaService).
func stagePrintTestImage(t *testing.T, name string, w, h int, fill color.RGBA) string {
	t.Helper()
	appDir := os.Getenv("GRIDO_APP_DIR")
	if appDir == "" {
		t.Fatal("stagePrintTestImage requires GRIDO_APP_DIR via t.Setenv (test disk isolation)")
	}
	mediaDir := filepath.Join(appDir, "Media")
	if err := os.MkdirAll(mediaDir, 0o755); err != nil {
		t.Fatalf("mkdir Media: %v", err)
	}
	safeTest := strings.ReplaceAll(strings.ReplaceAll(t.Name(), "/", "_"), " ", "_")
	fileName := fmt.Sprintf("%s_%s.png", safeTest, name)
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, fill)
		}
	}
	if err := imaging.Save(img, filepath.Join(mediaDir, fileName)); err != nil {
		t.Fatalf("save staged image: %v", err)
	}
	return "/local-image/" + fileName
}
