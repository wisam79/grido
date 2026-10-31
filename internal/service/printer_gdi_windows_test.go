//go:build windows

package service

import (
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// printer_gdi_windows_test.go — تقييد مسار الطباعة المباشرة وتحويل DIB
//
// يقفل عقود محرك GDI:
//   1. sanitizePrintFilePath يطابق print_native.go: Exports أو grido_print_*
//      في Temp فقط، بفاصل مسار إلزامي (لا ExportsEvil) وتطبيع روابط رموز.
//   2. convertToBottomUpDIB: ترتيب BGRA، أسطر Bottom-Up، وإزالة أثر الشفافية
//      (un-premultiply) التي كان غيابها يُطبع البكسلات شبه الشفافة أغمق.
//   3. formNameField: حقل DmFormName[32] يُنهى بـ NUL دائماً حتى مع أسماء
//      تتجاوز 31 محرفاً (الحلقة القديمة تركت نصاً غير منتهٍ يقرأه الدرايفر).
//   4. validateDirectPrintRequest: أبعاد الورقة والنسخ تبقى داخل مدى تحويل
//      int16 (عُشر المليمتر) بدل اللفّ الصامت إلى سالب داخل devmode.
// ─────────────────────────────────────────────────────────────────────────────

func TestPrintNative_GDI_RelativeAppDir(t *testing.T) {
	exportsFile, evilFile := setupRelativePrintExports(t)
	for _, path := range []string{exportsFile, evilFile} {
		for _, absolute := range []bool{false, true} {
			candidate := path
			if absolute {
				var err error
				candidate, err = filepath.Abs(path)
				if err != nil {
					t.Fatal(err)
				}
			}
			_, err := sanitizePrintFilePath(candidate)
			if path == exportsFile && err != nil {
				t.Errorf("legitimate export %q rejected: %v", candidate, err)
			}
			if path == evilFile && (err == nil || !strings.Contains(err.Error(), "غير مصرح")) {
				t.Errorf("sibling export %q must be rejected, got: %v", candidate, err)
			}
		}
	}
}

func TestSanitizePrintFilePath_GDI(t *testing.T) {
	appDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", appDir)

	exportsDir := filepath.Join(appDir, "Exports")
	if err := os.MkdirAll(exportsDir, 0o755); err != nil {
		t.Fatalf("mkdir exports: %v", err)
	}

	validExportsFile := filepath.Join(exportsDir, "print_test.jpg")
	if err := os.WriteFile(validExportsFile, []byte("fake-jpeg"), 0o644); err != nil {
		t.Fatalf("write exports file: %v", err)
	}

	evilDir := filepath.Join(appDir, "ExportsEvil")
	if err := os.MkdirAll(evilDir, 0o755); err != nil {
		t.Fatalf("mkdir evil: %v", err)
	}
	evilFile := filepath.Join(evilDir, "print_test.jpg")
	if err := os.WriteFile(evilFile, []byte("fake-jpeg"), 0o644); err != nil {
		t.Fatalf("write evil file: %v", err)
	}

	nonImageFile := filepath.Join(exportsDir, "print_test.txt")
	if err := os.WriteFile(nonImageFile, []byte("text"), 0o644); err != nil {
		t.Fatalf("write non-image: %v", err)
	}

	// ملف داخل Temp النظام بلا بادئة grido_print_ — مرفوض (اتساع temp الأعمى سابقاً)
	tempNoPrefix := filepath.Join(t.TempDir(), "other-app-cache.jpg")
	if err := os.WriteFile(tempNoPrefix, []byte("fake-jpeg"), 0o644); err != nil {
		t.Fatalf("write temp file: %v", err)
	}

	// ملف Temp بالبادئة المعتمدة من التطبيق — مقبول
	tempPrefixed := filepath.Join(os.TempDir(), "grido_print_test_"+time.Now().Format("150405.000000000")+".png")
	if err := os.WriteFile(tempPrefixed, []byte("fake-png"), 0o644); err != nil {
		t.Fatalf("write prefixed temp: %v", err)
	}
	defer os.Remove(tempPrefixed)

	tests := []struct {
		name    string
		path    string
		wantErr bool
	}{
		{"يقبل ملف صورة داخل Exports", validExportsFile, false},
		{"يرفض مساراً فارغاً", "", true},
		{"يرفض مجلداً وليس ملفاً", exportsDir, true},
		{"يرفض ملفاً غير موجود", filepath.Join(exportsDir, "missing.jpg"), true},
		{"يرفض امتداداً غير صورة", nonImageFile, true},
		{"يرفض شقيق Exports ببادئة مشتركة (ExportsEvil)", evilFile, true},
		{"يرفض ملف Temp بلا بادئة grido_print_", tempNoPrefix, true},
		{"يقبل ملف Temp ببادئة grido_print_", tempPrefixed, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := sanitizePrintFilePath(tt.path)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("sanitizePrintFilePath(%q) = %q, want error", tt.path, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("sanitizePrintFilePath(%q) unexpected error: %v", tt.path, err)
			}
			// المسار المُعاد مُطبَّع عبر EvalSymlinks (اسم 8.3 القصير يصبح الاسم
			// الطويل الكامل) — نطابق القيمة المتوقعة بنفس التطبيع.
			expected := tt.path
			if resolved, rerr := filepath.EvalSymlinks(filepath.Clean(tt.path)); rerr == nil {
				expected = resolved
			}
			if !strings.EqualFold(filepath.Clean(got), filepath.Clean(expected)) {
				t.Fatalf("sanitizePrintFilePath(%q) = %q, want %q", tt.path, got, expected)
			}
		})
	}
}

func TestConvertToBottomUpDIB_BGRA_RowOrder_Alpha(t *testing.T) {
	img := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	img.SetNRGBA(0, 0, color.NRGBA{R: 255, G: 0, B: 0, A: 255})     // أعلى يسار: أحمر
	img.SetNRGBA(1, 0, color.NRGBA{R: 0, G: 255, B: 0, A: 255})     // أعلى يمين: أخضر
	img.SetNRGBA(0, 1, color.NRGBA{R: 0, G: 0, B: 255, A: 255})     // أسفل يسار: أزرق
	img.SetNRGBA(1, 1, color.NRGBA{R: 100, G: 150, B: 200, A: 128}) // أسفل يمين: شبه شفاف

	buf, bmi := convertToBottomUpDIB(img)

	if len(buf) != 16 {
		t.Fatalf("buf len = %d, want 16", len(buf))
	}
	if bmi.BmiHeader.BiWidth != 2 || bmi.BmiHeader.BiHeight != 2 {
		t.Fatalf("bmi dims = %dx%d, want 2x2", bmi.BmiHeader.BiWidth, bmi.BmiHeader.BiHeight)
	}
	if bmi.BmiHeader.BiBitCount != 32 || bmi.BmiHeader.BiSizeImage != 16 {
		t.Fatalf("bmi bitCount=%d sizeImage=%d, want 32/16", bmi.BmiHeader.BiBitCount, bmi.BmiHeader.BiSizeImage)
	}

	// الصف الأول في الذاكرة = الصف السفلي في الصورة (Bottom-Up) بصيغة BGRA
	bottomLeft := buf[0:4]
	if bottomLeft[0] != 255 || bottomLeft[1] != 0 || bottomLeft[2] != 0 || bottomLeft[3] != 255 {
		t.Fatalf("bottom-left BGRA = %v, want [255 0 0 255]", bottomLeft)
	}

	topLeft := buf[8:12]
	if topLeft[0] != 0 || topLeft[1] != 0 || topLeft[2] != 255 || topLeft[3] != 255 {
		t.Fatalf("top-left BGRA = %v, want [0 0 255 255]", topLeft)
	}
	topRight := buf[12:16]
	if topRight[0] != 0 || topRight[1] != 255 || topRight[2] != 0 || topRight[3] != 255 {
		t.Fatalf("top-right BGRA = %v, want [0 255 0 255]", topRight)
	}

	// البكسل شبه الشفاف: BI_RGB يتجاهل الألفا فيُدمج اللون فوق أبيض الورقة
	// (جلسة 1.67): compose(c) = (c·a+127)/255 + (255−a)
	// B: (200·128+127)/255=100 ثم +127 = 227
	// G: (150·128+127)/255=75  ثم +127 = 202
	// R: (100·128+127)/255=50  ثم +127 = 177
	semi := buf[4:8]
	if semi[0] != 227 || semi[1] != 202 || semi[2] != 177 {
		t.Fatalf("semi-transparent flattened BGRA = %v, want [227 202 177]", semi)
	}
	if semi[3] != 128 {
		t.Fatalf("semi-transparent alpha = %d, want 128", semi[3])
	}

	// بكسل شفاف تماماً: أبيض الورقة لا أسود BI_RGB (كان RGB=0 يُطبع أسوداً)
	transparent := image.NewNRGBA(image.Rect(0, 0, 1, 1))
	transparent.SetNRGBA(0, 0, color.NRGBA{R: 255, G: 0, B: 0, A: 0})
	tbuf, _ := convertToBottomUpDIB(transparent)
	if tbuf[0] != 255 || tbuf[1] != 255 || tbuf[2] != 255 || tbuf[3] != 0 {
		t.Fatalf("transparent pixel = %v, want [255 255 255 0] (white)", tbuf[:4])
	}

	// مسار *image.RGBA المضروب مسبقاً: شفاف كلياً يخرج أبيضاً أيضاً
	premul := image.NewRGBA(image.Rect(0, 0, 1, 1))
	premul.SetRGBA(0, 0, color.RGBA{R: 0, G: 0, B: 0, A: 0})
	pbuf, _ := convertToBottomUpDIB(premul)
	if pbuf[0] != 255 || pbuf[1] != 255 || pbuf[2] != 255 {
		t.Fatalf("premultiplied transparent = %v, want white RGB", pbuf[:4])
	}
}

func TestWin32ErrText_NoSuccessGotcha(t *testing.T) {
	// Errno(0) يطبع «The operation completed successfully.» — يجب استبداله
	if got := win32ErrText(windows.ERROR_SUCCESS); strings.Contains(got, "successfully") {
		t.Fatalf("win32ErrText(ERROR_SUCCESS) leaked misleading message: %q", got)
	}
	if got := win32ErrText(windows.ERROR_INVALID_PARAMETER); !strings.Contains(got, "parameter") {
		t.Fatalf("win32ErrText(ERROR_INVALID_PARAMETER) = %q, want real message", got)
	}
	if got := win32ErrText(nil); got == "" {
		t.Fatalf("win32ErrText(nil) should return neutral fallback text")
	}
}

func TestFormNameField_NULTermination(t *testing.T) {
	tests := []struct {
		name string
		form string
	}{
		{"اسم قصير ينتهي بـ NUL", "A4"},
		{"اسم بحد 31 محرفاً يُحفظ كاملاً", strings.Repeat("a", 31)},
		{"اسم 32 محرفاً يُقصّ إلى 31 + NUL", strings.Repeat("b", 32)},
		{"اسم طويل جداً يُقصّ بأمان", strings.Repeat("محرف", 20)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formNameField(tt.form)

			if got[31] != 0 {
				t.Fatalf("DmFormName غير منتهٍ بـ NUL: got[31]=0x%X", got[31])
			}

			wantUnits := windows.StringToUTF16(tt.form)
			wantN := len(wantUnits) - 1
			if wantN > len(got)-1 {
				wantN = len(got) - 1
			}
			if text, want := windows.UTF16ToString(got[:]), windows.UTF16ToString(wantUnits[:wantN]); text != want {
				t.Fatalf("DmFormName = %q, want %q", text, want)
			}
		})
	}
}

func TestValidateDirectPrintRequest_GDI(t *testing.T) {
	tests := []struct {
		name    string
		req     domain.DirectPrintRequest
		wantErr bool
	}{
		{"طلب صالح بأبعاد كاملة (A4 أفقي)", domain.DirectPrintRequest{PaperWidthMM: 297, PaperHeightMM: 210, Copies: 1}, false},
		{"بلا أبعاد مخصصة — افتراضي الدرايفر", domain.DirectPrintRequest{PrinterName: "P"}, false},
		{"عرض بلا ارتفاع مرفوض", domain.DirectPrintRequest{PaperWidthMM: 210}, true},
		{"ارتفاع بلا عرض مرفوض", domain.DirectPrintRequest{PaperHeightMM: 297}, true},
		{"أبعاد 10مم مرفوضة (حد التحقق نفسه)", domain.DirectPrintRequest{PaperWidthMM: 10, PaperHeightMM: 10}, true},
		{"أبعاد تتجاوز 1000مم مرفوضة (فائض int16)", domain.DirectPrintRequest{PaperWidthMM: 4000, PaperHeightMM: 3000}, true},
		{"نسخ سالبة مرفوضة", domain.DirectPrintRequest{Copies: -1}, true},
		{"نسخ 1000 مرفوضة (سقف العملي)", domain.DirectPrintRequest{Copies: 1000}, true},
		{"نسخ صفر مقبولة (افتراضي الدرايفر)", domain.DirectPrintRequest{Copies: 0}, false},
		{"قيم غير منتهية مرفوضة", domain.DirectPrintRequest{PaperWidthMM: math.NaN(), PaperHeightMM: 210}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateDirectPrintRequest(tt.req)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("validateDirectPrintRequest(%+v) = nil, want error", tt.req)
				}
				return
			}
			if err != nil {
				t.Fatalf("validateDirectPrintRequest(%+v) unexpected error: %v", tt.req, err)
			}
		})
	}
}

func TestMatchStandardPaperID(t *testing.T) {
	tests := []struct {
		name   string
		w, h   float64
		wantID uint16
	}{
		{"A4 طولي", 210, 297, 9},
		{"A4 عرضي", 297, 210, 9},
		{"A3 طولي", 297, 420, 8},
		{"A3 عرضي", 420, 297, 8},
		{"A5 طولي", 148, 210, 11},
		{"Letter طولي", 215.9, 279.4, 1},
		{"Legal طولي", 215.9, 355.6, 5},
		{"Tabloid طولي", 279.4, 431.8, 3},
		{"B5 JIS", 182, 257, 13},
		{"B4 JIS", 250, 354, 12},
		{"Executive", 184.15, 266.7, 7},
		{"مقاس مخصص غير قياسي (لا يطابق)", 100, 150, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := matchStandardPaperID(tt.w, tt.h)
			if got != tt.wantID {
				t.Fatalf("matchStandardPaperID(%.1f, %.1f) = %d, want %d", tt.w, tt.h, got, tt.wantID)
			}
		})
	}
}

func TestConvertToBottomUpDIB_FastPaths(t *testing.T) {
	// 1. اختبار مسار *image.RGBA
	rgba := image.NewRGBA(image.Rect(0, 0, 2, 2))
	rgba.Set(0, 0, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	rgba.Set(1, 0, color.RGBA{R: 0, G: 255, B: 0, A: 255})
	rgba.Set(0, 1, color.RGBA{R: 0, G: 0, B: 255, A: 255})
	rgba.Set(1, 1, color.RGBA{R: 255, G: 255, B: 255, A: 255})
	bufRGBA, bmiRGBA := convertToBottomUpDIB(rgba)
	if len(bufRGBA) != 16 || bmiRGBA.BmiHeader.BiWidth != 2 || bmiRGBA.BmiHeader.BiHeight != 2 {
		t.Fatalf("bufRGBA len=%d, dims=%dx%d", len(bufRGBA), bmiRGBA.BmiHeader.BiWidth, bmiRGBA.BmiHeader.BiHeight)
	}
	// الصف السفلي (srcY=1): أزرق عند (0,1) في أول 4 بايتات
	if bufRGBA[0] != 255 || bufRGBA[1] != 0 || bufRGBA[2] != 0 || bufRGBA[3] != 255 {
		t.Fatalf("rgba bottom-left BGRA = %v, want [255 0 0 255]", bufRGBA[:4])
	}

	// 2. اختبار مسار *image.YCbCr
	ycbcr := image.NewYCbCr(image.Rect(0, 0, 2, 2), image.YCbCrSubsampleRatio420)
	for i := range ycbcr.Y {
		ycbcr.Y[i] = 255 // أبيض
	}
	for i := range ycbcr.Cb {
		ycbcr.Cb[i] = 128
		ycbcr.Cr[i] = 128
	}
	bufYCbCr, _ := convertToBottomUpDIB(ycbcr)
	if len(bufYCbCr) != 16 {
		t.Fatalf("bufYCbCr len=%d, want 16", len(bufYCbCr))
	}
	// جميع البكسلات بيضاء [255 255 255 255]
	for i := 0; i < 4; i++ {
		pix := bufYCbCr[i*4 : (i+1)*4]
		if pix[0] < 250 || pix[1] < 250 || pix[2] < 250 || pix[3] != 255 {
			t.Fatalf("pixel %d = %v, want ~[255 255 255 255]", i, pix)
		}
	}
}

func TestCalculatePrintDestRect_BorderlessCover(t *testing.T) {
	metrics := deviceMetrics{
		PhysicalWidth:   4000,
		PhysicalHeight:  4000,
		MarginLeft:      50,
		MarginTop:       50,
		PrintableWidth:  3900,
		PrintableHeight: 3900,
	}
	// صورة 3000x2000 في وضع Borderless
	// scaleX = 4000/3000 = 1.3333333333, scaleY = 4000/2000 = 2.0 -> scale = 1.3333333333 (Contain لحماية الورقة من القص)
	// destW = floor(3000*1.3333333333) = 4000, destH = floor(2000*1.3333333333) = 2666
	// originX = -50, originY = -50
	// destX = max(0, -50 + (4000-4000)/2) = max(0, -50) = 0
	// destY = max(0, -50 + (4000-2666)/2) = max(0, -50 + 667) = 617
	destX, destY, destW, destH := calculatePrintDestRect(metrics, 3000, 2000, true)
	if destX != 0 || destY != 617 || destW != 4000 || destH != 2666 {
		t.Fatalf("calculatePrintDestRect (borderless contain) = (%d, %d, %d, %d), want (0, 617, 4000, 2666)",
			destX, destY, destW, destH)
	}
}

func TestCalculatePrintDestRect_StandardContain(t *testing.T) {
	metrics := deviceMetrics{
		PrintableWidth:  3000,
		PrintableHeight: 4000,
	}
	// صورة 6000x4000 في الوضع العادي
	// scaleX = 3000/6000 = 0.5, scaleY = 4000/4000 = 1.0 -> scale = 0.5 (Contain)
	// destW = 3000, destH = 2000
	// destX = (3000-3000)/2 = 0, destY = (4000-2000)/2 = 1000
	destX, destY, destW, destH := calculatePrintDestRect(metrics, 6000, 4000, false)
	if destX != 0 || destY != 1000 || destW != 3000 || destH != 2000 {
		t.Fatalf("calculatePrintDestRect (standard) = (%d, %d, %d, %d), want (0, 1000, 3000, 2000)",
			destX, destY, destW, destH)
	}
}

func TestCalculatePrintDestRect_FallbackWhenPhysicalZero(t *testing.T) {
	metrics := deviceMetrics{
		PhysicalWidth:   0,
		PhysicalHeight:  0,
		MarginLeft:      100,
		MarginTop:       100,
		PrintableWidth:  2000,
		PrintableHeight: 3000,
	}
	// أبعاد فيزيائية صفرية في Borderless يجب أن ترجع بأمان إلى أبعاد المساحة القابلة للطباعة مع origin=0
	destX, destY, destW, destH := calculatePrintDestRect(metrics, 2000, 3000, true)
	if destX != 0 || destY != 0 || destW != 2000 || destH != 3000 {
		t.Fatalf("calculatePrintDestRect (fallback) = (%d, %d, %d, %d), want (0, 0, 2000, 3000)",
			destX, destY, destW, destH)
	}

	// صورة بأبعاد صفرية أو سالبة
	zeroX, zeroY, zeroW, zeroH := calculatePrintDestRect(metrics, 0, 100, true)
	if zeroX != 0 || zeroY != 0 || zeroW != 0 || zeroH != 0 {
		t.Fatalf("calculatePrintDestRect with zero dimensions should return all zeros, got (%d, %d, %d, %d)",
			zeroX, zeroY, zeroW, zeroH)
	}
}

func TestConvertToBottomUpDIB_NRGBA_TransparentPixelZeroing(t *testing.T) {
	nrgba := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	// بكسل (0, 0) شفاف تماماً
	nrgba.SetNRGBA(0, 0, color.NRGBA{R: 200, G: 100, B: 50, A: 0})
	// بكسل (1, 0) معتم بالكامل
	nrgba.SetNRGBA(1, 0, color.NRGBA{R: 255, G: 128, B: 64, A: 255})
	// بكسل (0, 1) شبه شفاف
	nrgba.SetNRGBA(0, 1, color.NRGBA{R: 100, G: 200, B: 50, A: 128})
	// بكسل (1, 1) شفاف تماماً
	nrgba.SetNRGBA(1, 1, color.NRGBA{R: 0, G: 0, B: 0, A: 0})

	buf, bmi := convertToBottomUpDIB(nrgba)
	if len(buf) != 16 || bmi.BmiHeader.BiWidth != 2 || bmi.BmiHeader.BiHeight != 2 {
		t.Fatalf("unexpected DIB header/buffer: len=%d, dims=%dx%d", len(buf), bmi.BmiHeader.BiWidth, bmi.BmiHeader.BiHeight)
	}

	// في Bottom-Up DIB:
	// الصف 0 في الذاكرة (bytes 0..7) يقابل srcY=1 (السطر السفلي من الصورة):
	// البكسل (0, 1) في bytes [0:4] -> BGRA
	if buf[3] != 128 {
		t.Fatalf("pixel (0,1) alpha = %d, want 128", buf[3])
	}
	// البكسل (1, 1) شفاف A=0 في bytes [4:8] -> أبيض الورقة (جلسة 1.67:
	// تسطيح الشفافية على أبيض بدل أسود BI_RGB)
	for i := 4; i < 7; i++ {
		if buf[i] != 255 {
			t.Fatalf("pixel (1,1) byte %d = %d, want 255 (white) for transparent pixel", i, buf[i])
		}
	}
	if buf[7] != 0 {
		t.Fatalf("pixel (1,1) alpha = %d, want 0", buf[7])
	}

	// الصف 1 في الذاكرة (bytes 8..15) يقابل srcY=0 (السطر العلوي من الصورة):
	// البكسل (0, 0) شفاف A=0 في bytes [8:12] -> أبيض الورقة (RGB=255، ألفا 0)
	for i := 8; i < 11; i++ {
		if buf[i] != 255 {
			t.Fatalf("pixel (0,0) byte %d = %d, want 255 (white) for transparent pixel", i, buf[i])
		}
	}
	if buf[11] != 0 {
		t.Fatalf("pixel (0,0) alpha = %d, want 0", buf[11])
	}
	// البكسل (1, 0) معتم A=255 في bytes [12:16] -> BGRA = [64, 128, 255, 255]
	if buf[12] != 64 || buf[13] != 128 || buf[14] != 255 || buf[15] != 255 {
		t.Fatalf("pixel (1,0) BGRA = %v, want [64 128 255 255]", buf[12:16])
	}
}

func TestEvaluateJobStatus_Bitmasks(t *testing.T) {
	tests := []struct {
		name        string
		statusBits  uint32
		driverMsg   string
		wantStatus  string
		wantSuccess bool
	}{
		{"افتراضي بلا بتات (Spooling)", 0, "", "Spooling", true},
		{"خطأ عام (Error)", jobStatusError, "", "Error", false},
		{"نفاد الورق (Paperout)", jobStatusPaperout, "", "Out of Paper", false},
		{"الطابعة مفصولة (Offline)", jobStatusOffline, "", "Printer Offline", false},
		{"جاري الطباعة (Printing)", jobStatusPrinting, "", "Printing", true},
		{"اكتملت الطباعة (Printed)", jobStatusPrinted, "", "Printed", true},
		{"مكتملة (Complete)", jobStatusComplete, "", "Printed", true},
		{"رسالة درايفر مخصصة مع نجاح", jobStatusPrinting, "جاري معالجة الصفحة 1", "جاري معالجة الصفحة 1", true},
		{"رسالة درايفر مخصصة مع خطأ ورق (الحكم للبتات)", jobStatusPaperout, "درج الورق فارغ", "درج الورق فارغ", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotStatus, gotSuccess := evaluateJobStatus(tt.statusBits, tt.driverMsg)
			if gotStatus != tt.wantStatus || gotSuccess != tt.wantSuccess {
				t.Fatalf("evaluateJobStatus(0x%X, %q) = (%q, %v), want (%q, %v)",
					tt.statusBits, tt.driverMsg, gotStatus, gotSuccess, tt.wantStatus, tt.wantSuccess)
			}
		})
	}
}

func TestParseSupportedPaperInfo(t *testing.T) {
	tests := []struct {
		name         string
		id           uint16
		paperName    string
		sizeX, sizeY int32
		wantW, wantH float64
		wantBorder   bool
	}{
		{"A4 قياسي", 9, "A4", 2100, 2970, 210.0, 297.0, false},
		{"A4 بلا حواف إنجليزية", 9, "A4 (Borderless)", 2100, 2970, 210.0, 297.0, true},
		{"4x6 بدون حواف عربية", 101, "4x6 بوصة بدون حواف", 1016, 1524, 101.6, 152.4, true},
		{"Letter قياسي", 1, "Letter", 2159, 2794, 215.9, 279.4, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rawUTF16 := windows.StringToUTF16(tt.paperName)
			got := parseSupportedPaperInfo(tt.id, rawUTF16, tt.sizeX, tt.sizeY)

			if got.ID != tt.id {
				t.Fatalf("ID = %d, want %d", got.ID, tt.id)
			}
			if got.Name != tt.paperName {
				t.Fatalf("Name = %q, want %q", got.Name, tt.paperName)
			}
			if math.Abs(got.WidthMM-tt.wantW) > 0.01 || math.Abs(got.HeightMM-tt.wantH) > 0.01 {
				t.Fatalf("Dims = (%.1f, %.1f), want (%.1f, %.1f)", got.WidthMM, got.HeightMM, tt.wantW, tt.wantH)
			}
			if got.IsBorderless != tt.wantBorder {
				t.Fatalf("IsBorderless = %v, want %v", got.IsBorderless, tt.wantBorder)
			}
		})
	}
}

func TestConvertToBottomUpDIB_GrayscaleFallback(t *testing.T) {
	gray := image.NewGray(image.Rect(0, 0, 2, 2))
	// Row 0 (Top): (0,0)=0 Black, (1,0)=128 Gray
	gray.SetGray(0, 0, color.Gray{Y: 0})
	gray.SetGray(1, 0, color.Gray{Y: 128})
	// Row 1 (Bottom): (0,1)=255 White, (1,1)=64 Dark Gray
	gray.SetGray(0, 1, color.Gray{Y: 255})
	gray.SetGray(1, 1, color.Gray{Y: 64})

	buf, bmi := convertToBottomUpDIB(gray)
	if len(buf) != 16 || bmi.BmiHeader.BiWidth != 2 || bmi.BmiHeader.BiHeight != 2 {
		t.Fatalf("Grayscale DIB len=%d, dims=%dx%d", len(buf), bmi.BmiHeader.BiWidth, bmi.BmiHeader.BiHeight)
	}

	// Bottom-Up: السطر 0 في الذاكرة يقابل Row 1 من الصورة الأصلية
	// بكسل (0, 1) أبيض [255 255 255 255]
	if buf[0] != 255 || buf[1] != 255 || buf[2] != 255 || buf[3] != 255 {
		t.Fatalf("pixel (0,1) = %v, want [255 255 255 255]", buf[:4])
	}
	// بكسل (1, 1) رمادي 64 [64 64 64 255]
	if buf[4] != 64 || buf[5] != 64 || buf[6] != 64 || buf[7] != 255 {
		t.Fatalf("pixel (1,1) = %v, want [64 64 64 255]", buf[4:8])
	}

	// السطر 1 في الذاكرة يقابل Row 0 من الصورة الأصلية
	// بكسل (0, 0) أسود [0 0 0 255]
	if buf[8] != 0 || buf[9] != 0 || buf[10] != 0 || buf[11] != 255 {
		t.Fatalf("pixel (0,0) = %v, want [0 0 0 255]", buf[8:12])
	}
	// بكسل (1, 0) رمادي 128 [128 128 128 255]
	if buf[12] != 128 || buf[13] != 128 || buf[14] != 128 || buf[15] != 255 {
		t.Fatalf("pixel (1,0) = %v, want [128 128 128 255]", buf[12:16])
	}
}

func TestConvertToBottomUpDIB_SubImageBounds(t *testing.T) {
	// صورة 10x10 بخلفية حمراء كاملة
	rgba := image.NewRGBA(image.Rect(0, 0, 10, 10))
	for i := range rgba.Pix {
		if i%4 == 0 {
			rgba.Pix[i] = 255 // Red
		} else if i%4 == 3 {
			rgba.Pix[i] = 255 // Alpha
		}
	}

	// رسم منطقة خضراء 2x2 عند الإحداثيات (3, 3) إلى (5, 5)
	green := color.RGBA{R: 0, G: 255, B: 0, A: 255}
	for y := 3; y < 5; y++ {
		for x := 3; x < 5; x++ {
			rgba.Set(x, y, green)
		}
	}

	// اقتطاع SubImage بحجم 2x2
	sub := rgba.SubImage(image.Rect(3, 3, 5, 5))
	buf, bmi := convertToBottomUpDIB(sub)

	if len(buf) != 16 || bmi.BmiHeader.BiWidth != 2 || bmi.BmiHeader.BiHeight != 2 {
		t.Fatalf("SubImage DIB len=%d, dims=%dx%d", len(buf), bmi.BmiHeader.BiWidth, bmi.BmiHeader.BiHeight)
	}

	// كل البكسلات الأربعة يجب أن تكون خضراء نقية [0, 255, 0, 255]
	for i := 0; i < 4; i++ {
		pix := buf[i*4 : (i+1)*4]
		if pix[0] != 0 || pix[1] != 255 || pix[2] != 0 || pix[3] != 255 {
			t.Fatalf("SubImage pixel %d = %v, want [0 255 0 255]", i, pix)
		}
	}
}

func TestCalculatePrintDestRect_ExactAspectMatch(t *testing.T) {
	metrics := deviceMetrics{
		PrintableWidth:  3000,
		PrintableHeight: 2000,
		PhysicalWidth:   3000,
		PhysicalHeight:  2000,
	}

	// صورة 1500x1000 تطابق نسبة الورقة 1.5 تماماً
	// الوضع العادي: مقياس 2.0، لا فراغات
	destX, destY, destW, destH := calculatePrintDestRect(metrics, 1500, 1000, false)
	if destX != 0 || destY != 0 || destW != 3000 || destH != 2000 {
		t.Fatalf("Standard match = (%d, %d, %d, %d), want (0, 0, 3000, 2000)", destX, destY, destW, destH)
	}

	// وضع الحواف الصفرية: مقياس 2.0، تطابق تام
	destX, destY, destW, destH = calculatePrintDestRect(metrics, 1500, 1000, true)
	if destX != 0 || destY != 0 || destW != 3000 || destH != 2000 {
		t.Fatalf("Borderless match = (%d, %d, %d, %d), want (0, 0, 3000, 2000)", destX, destY, destW, destH)
	}
}

func TestCalculatePrintDestRect_ExtremePanorama(t *testing.T) {
	metrics := deviceMetrics{
		PrintableWidth:  3000,
		PrintableHeight: 1000,
		PhysicalWidth:   3000,
		PhysicalHeight:  1000,
	}

	// بانوراما فائقة العرض 6000x500 (نسبة 12:1)
	// 1. الوضع العادي (Contain): مقياس = min(3000/6000=0.5, 1000/500=2.0) = 0.5
	// destW = 3000, destH = 250, destX = 0, destY = (1000-250)/2 = 375
	destX, destY, destW, destH := calculatePrintDestRect(metrics, 6000, 500, false)
	if destX != 0 || destY != 375 || destW != 3000 || destH != 250 {
		t.Fatalf("Panorama contain = (%d, %d, %d, %d), want (0, 375, 3000, 250)", destX, destY, destW, destH)
	}

	// 2. وضع الحواف الصفرية (Contain لحماية الورقة من القص الكارثي): مقياس = min(0.5, 2.0) = 0.5
	// destW = 3000, destH = 250, destX = (3000-3000)/2 = 0, destY = (1000-250)/2 = 375
	destX, destY, destW, destH = calculatePrintDestRect(metrics, 6000, 500, true)
	if destX != 0 || destY != 375 || destW != 3000 || destH != 250 {
		t.Fatalf("Panorama borderless contain = (%d, %d, %d, %d), want (0, 375, 3000, 250)", destX, destY, destW, destH)
	}
}

func TestCalculatePrintDestRect_A4OnLetterPdf_NoTopClipping(t *testing.T) {
	// محاكاة درايفر Microsoft Print to PDF بمقاس Letter الافتراضي (600 DPI)
	metrics := deviceMetrics{
		PhysicalWidth:   5100,
		PhysicalHeight:  6600,
		PrintableWidth:  5100,
		PrintableHeight: 6600,
		MarginLeft:      0,
		MarginTop:       0,
	}
	// ورقة A4 كاملة مولدة بدقة 300 DPI (2480x3508)
	// يجب ألا تكون destY سالبة إطلاقاً في أي من الوضعين (العادي أو الحواف الصفرية)
	destX, destY, destW, destH := calculatePrintDestRect(metrics, 2480, 3508, true)
	if destY < 0 {
		t.Fatalf("borderless destY = %d (negative, causes top clipping)", destY)
	}
	if destX < 0 {
		t.Fatalf("borderless destX = %d (negative, causes left clipping)", destX)
	}
	if destW > 5100 || destH > 6600 {
		t.Fatalf("borderless dest dimensions (%d, %d) exceed page (5100, 6600)", destW, destH)
	}

	// الوضع العادي
	destXStd, destYStd, destWStd, destHStd := calculatePrintDestRect(metrics, 2480, 3508, false)
	if destYStd < 0 || destXStd < 0 {
		t.Fatalf("standard dest (%d, %d) has negative coordinates", destXStd, destYStd)
	}
	if destWStd > 5100 || destHStd > 6600 {
		t.Fatalf("standard dest dimensions (%d, %d) exceed page (5100, 6600)", destWStd, destHStd)
	}
}

func TestConfigurePrinterDevMode_StandardPaperIDPrecedence(t *testing.T) {
	// التحقق من أن أبعاد A4 القياسية ترجع DMPAPER_A4 = 9 حتى مع وجود FormName
	id := matchStandardPaperID(210, 297)
	if id != 9 {
		t.Fatalf("matchStandardPaperID(210, 297) = %d, want 9 (DMPAPER_A4)", id)
	}
}

func TestMatchStandardPaper(t *testing.T) {
	tests := []struct {
		name     string
		w, h     float64
		wantID   uint16
		wantForm string
	}{
		{"A4 Portrait", 210, 297, 9, "A4"},
		{"A4 Landscape", 297, 210, 9, "A4"},
		{"Letter Portrait", 215.9, 279.4, 1, "Letter"},
		{"A3 Portrait", 297, 420, 8, "A3"},
		{"A5 Portrait", 148, 210, 11, "A5"},
		{"Unknown size", 80, 80, 0, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotID, gotForm := matchStandardPaper(tt.w, tt.h)
			if gotID != tt.wantID || gotForm != tt.wantForm {
				t.Fatalf("matchStandardPaper(%.1f, %.1f) = (%d, %q), want (%d, %q)",
					tt.w, tt.h, gotID, gotForm, tt.wantID, tt.wantForm)
			}
		})
	}
}

func TestStandardFormNameByID(t *testing.T) {
	if got := standardFormNameByID(9); got != "A4" {
		t.Fatalf("standardFormNameByID(9) = %q, want %q", got, "A4")
	}
	if got := standardFormNameByID(1); got != "Letter" {
		t.Fatalf("standardFormNameByID(1) = %q, want %q", got, "Letter")
	}
	if got := standardFormNameByID(8); got != "A3" {
		t.Fatalf("standardFormNameByID(8) = %q, want %q", got, "A3")
	}
	if got := standardFormNameByID(999); got != "" {
		t.Fatalf("standardFormNameByID(999) = %q, want empty", got)
	}
}

func TestConfigurePrinterDevMode_LiveA4Enforcement(t *testing.T) {
	printerName, err := GetDefaultPrinter()
	if err != nil || printerName == "" {
		t.Skip("لا توجد طابعة افتراضية متاحة في بيئة الاختبار")
	}

	req := domain.DirectPrintRequest{
		PrinterName:   printerName,
		PaperWidthMM:  210,
		PaperHeightMM: 297,
		Orientation:   "portrait",
		Copies:        1,
		Color:         true,
	}

	buf, err := configurePrinterDevMode(printerName, req)
	if err != nil || len(buf) == 0 {
		t.Fatalf("configurePrinterDevMode failed: %v", err)
	}

	dm := (*devModeW)(unsafe.Pointer(&buf[0]))
	if dm.DmPaperSize != 9 {
		t.Errorf("DmPaperSize = %d, want 9 (DMPAPER_A4)", dm.DmPaperSize)
	}
	formName := windows.UTF16ToString(dm.DmFormName[:])
	if formName != "A4" {
		t.Errorf("DmFormName = %q, want %q", formName, "A4")
	}
}

func TestMatchStandardPaperID_AllSupportedSizes(t *testing.T) {
	tests := []struct {
		name     string
		w, h     float64
		expected uint16
	}{
		{"A4 Portrait", 210, 297, 9},
		{"A4 Landscape", 297, 210, 9},
		{"A3 Portrait", 297, 420, 8},
		{"A5 Portrait", 148, 210, 11},
		{"A6 Portrait", 105, 148, 70},
		{"A2 Portrait", 420, 594, 66},
		{"Letter", 215.9, 279.4, 1},
		{"Legal", 215.9, 355.6, 5},
		{"Tabloid", 279.4, 431.8, 3},
		{"B5 JIS", 182, 257, 13},
		{"B4 JIS", 250, 354, 12},
		{"B6 JIS", 128, 182, 88},
		{"Japanese Postcard", 100, 148, 43},
		{"Statement", 139.7, 215.9, 6},
		{"10x14", 254, 355.6, 16},
		{"11x17 (Tabloid)", 279.4, 431.8, 3},
		{"Executive", 184.15, 266.7, 7},
		{"Custom Unknown Size (85x55 mm)", 85, 55, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := matchStandardPaperID(tt.w, tt.h)
			if got != tt.expected {
				t.Fatalf("matchStandardPaperID(%.1f, %.1f) = %d, want %d", tt.w, tt.h, got, tt.expected)
			}
		})
	}
}

func TestFindPrinterPaperMatch_NilPrinterFallback(t *testing.T) {
	// عند تمرير مؤشر طابعة فارغ، يجب ألا ينهار البرنامج ويعيد false بأمان
	paperID, formName, matched := findPrinterPaperMatch(nil, 85, 55, false, "Custom")
	if matched || paperID != 0 || formName != "Custom" {
		t.Fatalf("findPrinterPaperMatch(nil, 85, 55) = (%d, %q, %v), want (0, 'Custom', false)", paperID, formName, matched)
	}
}

func TestCalculatePrintDestRect_StudioPhotoPaperSizes(t *testing.T) {
	// مقاسات استوديوهات التصوير الفوتوغرافي الشائعة
	metrics := deviceMetrics{
		PhysicalWidth:   3600,
		PhysicalHeight:  5400,
		PrintableWidth:  3500,
		PrintableHeight: 5300,
		MarginLeft:      50,
		MarginTop:       50,
	}

	scenarios := []struct {
		name       string
		imgW, imgH int
	}{
		{"4x6 Photo (1200x1800)", 1200, 1800},
		{"5x7 Photo (1500x2100)", 1500, 2100},
		{"6x8 Photo (1800x2400)", 1800, 2400},
		{"ID Card (86x54 mm ratio)", 1016, 638},
		{"Panorama (1200x3600)", 1200, 3600},
	}

	for _, sc := range scenarios {
		t.Run(sc.name+"_Contain", func(t *testing.T) {
			destX, destY, destW, destH := calculatePrintDestRect(metrics, sc.imgW, sc.imgH, false)
			if destX < 0 || destY < 0 {
				t.Fatalf("unexpected negative coordinates: (%d, %d)", destX, destY)
			}
			if destW <= 0 || destH <= 0 {
				t.Fatalf("unexpected non-positive dimensions: %dx%d", destW, destH)
			}
			if int(destW) > metrics.PrintableWidth || int(destH) > metrics.PrintableHeight {
				t.Fatalf("contain exceeded printable area: %dx%d > %dx%d", destW, destH, metrics.PrintableWidth, metrics.PrintableHeight)
			}
		})

		t.Run(sc.name+"_BorderlessCover", func(t *testing.T) {
			_, _, destW, destH := calculatePrintDestRect(metrics, sc.imgW, sc.imgH, true)
			if destW <= 0 || destH <= 0 {
				t.Fatalf("unexpected non-positive borderless dimensions: %dx%d", destW, destH)
			}
			// في نمط الحواف الصفرية، الصورة يجب أن تغطي العرض الفيزيائي أو الارتفاع الفيزيائي كاملاً
			coversWidth := int(destW) >= metrics.PhysicalWidth
			coversHeight := int(destH) >= metrics.PhysicalHeight
			if !coversWidth && !coversHeight {
				t.Fatalf("borderless failed to cover physical page: %dx%d vs %dx%d", destW, destH, metrics.PhysicalWidth, metrics.PhysicalHeight)
			}
		})
	}
}

func TestConvertToBottomUpDIB_ExtremeAlphaCases(t *testing.T) {
	// 1. صورة شفافة 100%
	transparentImg := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	buf, bmi := convertToBottomUpDIB(transparentImg)
	if bmi.BmiHeader.BiWidth != 2 || bmi.BmiHeader.BiHeight != 2 {
		t.Fatalf("bmi dimensions (%d, %d) want (2, 2)", bmi.BmiHeader.BiWidth, bmi.BmiHeader.BiHeight)
	}
	if len(buf) != 2*2*4 {
		t.Fatalf("buffer length %d want 16", len(buf))
	}
	for i, b := range buf {
		// جلسة 1.67: الشفاف الكلي يُدمج فوق أبيض الورقة (RGB=255) وألفا 0
		if i%4 == 3 {
			if b != 0 {
				t.Fatalf("transparent alpha at %d is %d, want 0", i, b)
			}
		} else if b != 255 {
			t.Fatalf("transparent RGB byte at %d is %d, want 255 (white)", i, b)
		}
	}

	// 2. صورة معتمة تماماً بألوان زاهية
	opaqueImg := image.NewNRGBA(image.Rect(0, 0, 1, 1))
	opaqueImg.SetNRGBA(0, 0, color.NRGBA{R: 200, G: 100, B: 50, A: 255})
	bufOpaque, _ := convertToBottomUpDIB(opaqueImg)
	// ترتيب BGRA
	if bufOpaque[0] != 50 || bufOpaque[1] != 100 || bufOpaque[2] != 200 || bufOpaque[3] != 255 {
		t.Fatalf("opaque BGRA = (%d, %d, %d, %d), want (50, 100, 200, 255)",
			bufOpaque[0], bufOpaque[1], bufOpaque[2], bufOpaque[3])
	}
}

func TestValidateDirectPrintRequest_BoundaryAndExtremeCases(t *testing.T) {
	tests := []struct {
		name    string
		req     domain.DirectPrintRequest
		wantErr bool
	}{
		{
			name: "حد أدنى مسموح (10.1 مم)",
			req: domain.DirectPrintRequest{
				PaperWidthMM:  10.1,
				PaperHeightMM: 10.1,
				Copies:        1,
			},
			wantErr: false,
		},
		{
			name: "أقل من الحد الأدنى (9.9 مم)",
			req: domain.DirectPrintRequest{
				PaperWidthMM:  9.9,
				PaperHeightMM: 100,
				Copies:        1,
			},
			wantErr: true,
		},
		{
			name: "حد أقصى مسموح (1000 مم)",
			req: domain.DirectPrintRequest{
				PaperWidthMM:  1000,
				PaperHeightMM: 1000,
				Copies:        1,
			},
			wantErr: false,
		},
		{
			name: "أكبر من الحد الأقصى (1000.1 مم)",
			req: domain.DirectPrintRequest{
				PaperWidthMM:  1000.1,
				PaperHeightMM: 500,
				Copies:        1,
			},
			wantErr: true,
		},
		{
			name: "عدد نسخ 0 (مقبول — يسقط للافتراضي 1 في devmode)",
			req: domain.DirectPrintRequest{
				PaperWidthMM:  210,
				PaperHeightMM: 297,
				Copies:        0,
			},
			wantErr: false,
		},
		{
			name: "عدد نسخ أقصى 999",
			req: domain.DirectPrintRequest{
				PaperWidthMM:  210,
				PaperHeightMM: 297,
				Copies:        999,
			},
			wantErr: false,
		},
		{
			name: "عدد نسخ متجاوز 1000",
			req: domain.DirectPrintRequest{
				PaperWidthMM:  210,
				PaperHeightMM: 297,
				Copies:        1000,
			},
			wantErr: true,
		},
		{
			name: "أبعاد أفقية مع طلب portrait (يقبلها الفحص الهندسي)",
			req: domain.DirectPrintRequest{
				PaperWidthMM:  297,
				PaperHeightMM: 210,
				Orientation:   "portrait",
				Copies:        1,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateDirectPrintRequest(tt.req)
			if (err != nil) != tt.wantErr {
				t.Fatalf("validateDirectPrintRequest() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestPrintImageDirectGDI_CorruptedFile_ReturnsSafeError(t *testing.T) {
	// إنشاء ملف تالف ببادئة مقبولة في مجلد Temp
	corruptFile := filepath.Join(os.TempDir(), "grido_print_corrupt_"+time.Now().Format("150405.000000000")+".jpg")
	if err := os.WriteFile(corruptFile, []byte("NOT_A_REAL_JPEG_HEADER_CORRUPT"), 0o644); err != nil {
		t.Fatalf("failed to create corrupt temp file: %v", err)
	}
	defer os.Remove(corruptFile)

	svc := &PrintService{}
	req := domain.DirectPrintRequest{
		FilePath:      corruptFile,
		PrinterName:   "FakeNonExistentPrinter12345",
		PaperWidthMM:  210,
		PaperHeightMM: 297,
		Copies:        1,
	}

	jobID, err := svc.PrintImageDirectGDI(req)
	if err == nil {
		t.Fatalf("expected error for corrupted image file, got jobID=%d", jobID)
	}
	if !strings.Contains(err.Error(), "تعذر قراءة ترويسة الصورة") {
		t.Fatalf("expected header decode error, got: %v", err)
	}
}
