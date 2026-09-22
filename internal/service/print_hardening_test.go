package service

import (
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_hardening_test.go — تقوية نظام الطباعة: تحقق المدخلات، مسارات التصدير
// غير المغطاة (CMYK/JPEG)، توليد HTML، وأنماط خطوط القص.
// ─────────────────────────────────────────────────────────────────────────────

func rgbaOf(c color.Color) color.RGBA {
	r, g, b, a := c.RGBA()
	return color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), uint8(a >> 8)}
}

// 1. الصيغ المختصرة #RGB/#RGBA تُوسَّع بتكرار الخانة
func TestParseColor_ShortHexExpansion(t *testing.T) {
	if got := rgbaOf(parseColor("#abc")); got != (color.RGBA{0xaa, 0xbb, 0xcc, 255}) {
		t.Errorf("parseColor(#abc) = %+v, want {aa bb cc ff}", got)
	}
	if got := rgbaOf(parseColor("#abcd")); got != (color.RGBA{0xaa, 0xbb, 0xcc, 0xdd}) {
		t.Errorf("parseColor(#abcd) = %+v, want {aa bb cc dd}", got)
	}
	if got := rgbaOf(parseColor("#FFF")); got != (color.RGBA{255, 255, 255, 255}) {
		t.Errorf("parseColor(#FFF) = %+v, want white", got)
	}
}

// 2. الألوان التالفة تسقط للأبيض بدل الأسود الصامت
func TestParseColor_InvalidFallsBackWhite(t *testing.T) {
	for _, bad := range []string{"", "#", "#12", "#12345", "#gggggg", "#zzzzzzzz", "red", "  "} {
		if got := rgbaOf(parseColor(bad)); got != (color.RGBA{255, 255, 255, 255}) {
			t.Errorf("parseColor(%q) = %+v, want white fallback", bad, got)
		}
	}
}

// 3. هندسة عنصر NaN/Inf تُرفض قبل الرسم
func TestValidatePrintRequest_NaNItemGeometryRejected(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 100, PaperHeightMM: 100, DPI: 150,
		Items: []domain.PrintItem{{ImageSrc: "x", X: math.NaN(), Y: 10, W: 50, H: 50}},
	}
	_, _, err := svc.GeneratePrintSheet(req)
	if err == nil || !strings.Contains(err.Error(), "NaN or Inf") {
		t.Fatalf("expected NaN geometry rejection, got: %v", err)
	}
}

// 4. منطقة اقتصاص متناقضة (عرض دون ارتفاع) تُرفض
func TestValidatePrintRequest_ContradictoryCropRejected(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 100, PaperHeightMM: 100, DPI: 150,
		Items: []domain.PrintItem{{ImageSrc: "x", X: 10, Y: 10, W: 50, H: 50, CropW: 10, CropH: 0}},
	}
	_, _, err := svc.GeneratePrintSheet(req)
	if err == nil || !strings.Contains(err.Error(), "invalid crop region") {
		t.Fatalf("expected crop region rejection, got: %v", err)
	}
}

// 5. عنصر يتجاوز الورقة فوق التسامح يُرفض
func TestValidatePrintRequest_OversizedItemRejected(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 210, PaperHeightMM: 297, DPI: 150,
		Items: []domain.PrintItem{{ImageSrc: "x", X: 0, Y: 0, W: 300, H: 100}},
	}
	_, _, err := svc.GeneratePrintSheet(req)
	if err == nil || !strings.Contains(err.Error(), "invalid item geometry") {
		t.Fatalf("expected oversized item rejection, got: %v", err)
	}
}

// 6. أكثر من 1000 عنصر يُرفض قبل تخصيص أي ذاكرة
func TestValidatePrintRequest_TooManyItemsRejected(t *testing.T) {
	svc := NewPrintService()
	items := make([]domain.PrintItem, 0, 1001)
	for i := 0; i < 1001; i++ {
		items = append(items, domain.PrintItem{})
	}
	req := domain.PrintRequest{
		PaperWidthMM: 100, PaperHeightMM: 100, DPI: 150, Items: items,
	}
	_, _, err := svc.GeneratePrintSheet(req)
	if err == nil || !strings.Contains(err.Error(), "too many items") {
		t.Fatalf("expected too-many-items rejection, got: %v", err)
	}
}

// 7. مسار CMYK/JPEG غير المغطى: ملف صالح + وثيقة HTML
func TestSaveOutput_CMYK_JPEG_Branch(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "print_hardening_cmykjpg_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	imgPath := filepath.Join(tempDir, "photo.png")
	img := image.NewRGBA(image.Rect(0, 0, 200, 200))
	for x := 0; x < 200; x++ {
		for y := 0; y < 200; y++ {
			img.Set(x, y, color.RGBA{R: 160, G: 40, B: 40, A: 255})
		}
	}
	if err := imaging.Save(img, imgPath); err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 148.0, PaperHeightMM: 210.0, DPI: 150,
		BackgroundColor: "#FFFFFF", ExportFormat: "jpeg", ColorSpace: "cmyk",
		Items: []domain.PrintItem{
			{ImageSrc: imgPath, X: 10, Y: 10, W: 60, H: 90, Brightness: 100, Contrast: 100, Saturation: 100},
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("CMYK JPEG sheet failed: %v", err)
	}
	if !strings.HasSuffix(outPath, ".jpg") {
		t.Fatalf("expected JPEG output, got: %s", outPath)
	}
	defer os.Remove(outPath)

	if _, err := imaging.Open(outPath); err != nil {
		t.Fatalf("failed to decode CMYK JPEG output: %v", err)
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Errorf("expected HTML document for iframe print")
	}
}

// 8. صفحة الطباعة الأصلية تحمل مقاس الورقة ومصدراً مُهرَّباً
func TestBuildNativePrintHTML_PaperSizeAndEscapedSrc(t *testing.T) {
	html := buildNativePrintHTML(210, 297, "file:///C:/a&b/print.png")
	if !strings.Contains(html, "size: 210.00mm 297.00mm") {
		t.Errorf("expected @page size 210x297mm in HTML")
	}
	if !strings.Contains(html, "file:///C:/a&amp;b/print.png") {
		t.Errorf("expected HTML-escaped image src in HTML")
	}
	if strings.Contains(html, "a&b/print") {
		t.Errorf("unescaped & must not appear raw in HTML src")
	}
}

// 9. وثيقة WebView2 تستخدم مسار /local-image/ المتوافق مع CSP
func TestBuildSelfContainedHTML_LocalImageSrc(t *testing.T) {
	html := buildSelfContainedHTML(100, 150, "/local-image/print_123.png")
	if !strings.Contains(html, `src="/local-image/print_123.png"`) {
		t.Errorf("expected local-image src in self-contained HTML")
	}
	if !strings.Contains(html, "size: 100.00mm 150.00mm") {
		t.Errorf("expected @page size 100x150mm in HTML")
	}
}

// 10. كل أنماط خطوط القص تُرسم بلا انهيار، والرمادي يظهر على الخط
func TestDrawCutLines_AllStylesNoPanic(t *testing.T) {
	svc := NewPrintService()
	// إحداثيات بالمليمتر تُسقط داخل سياق 200×200 بكسل عند 150DPI
	// (y=16.9مم ← 99.8px، والخط بعرض 1.18px يغطي الصف 100)
	line := domain.CutLine{X1: 5, Y1: 16.9, X2: 30, Y2: 16.9}

	for _, style := range []string{"dashed", "dotted", "solid", "cropmarks", ""} {
		dc := gg.NewContext(200, 200)
		dc.SetRGB(1, 1, 1)
		dc.Clear()
		svc.drawCutLines(dc, domain.PrintRequest{
			DPI: 150, ShowCutLines: true, CutLineStyle: style,
			CutLines: []domain.CutLine{line},
		})
	}

	// إحداثيات NaN تُتجاوز بصمت بدل إفساد المسار
	dc := gg.NewContext(200, 200)
	dc.SetRGB(1, 1, 1)
	dc.Clear()
	svc.drawCutLines(dc, domain.PrintRequest{
		DPI: 150, ShowCutLines: true, CutLineStyle: "dashed",
		CutLines: []domain.CutLine{{X1: math.NaN(), Y1: 0, X2: 10, Y2: 10}, line},
	})

	// الخط الصلب الرمادي (120,120,120) يظهر في منتصفه
	dcSolid := gg.NewContext(200, 200)
	dcSolid.SetRGB(1, 1, 1)
	dcSolid.Clear()
	svc.drawCutLines(dcSolid, domain.PrintRequest{
		DPI: 150, ShowCutLines: true, CutLineStyle: "solid",
		CutLines: []domain.CutLine{line},
	})
	r, g, b, _ := dcSolid.Image().At(100, 100).RGBA()
	px := color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), 255}
	if px.R < 50 || px.R != px.G || px.G != px.B {
		t.Errorf("expected gray cut-line pixel at (100,100), got %+v", px)
	}

	// إطفاء الخطوط لا يرسم شيئاً
	dcOff := gg.NewContext(200, 200)
	dcOff.SetRGB(1, 1, 1)
	dcOff.Clear()
	svc.drawCutLines(dcOff, domain.PrintRequest{
		DPI: 150, ShowCutLines: false,
		CutLines: []domain.CutLine{line},
	})
	r2, g2, b2, _ := dcOff.Image().At(100, 100).RGBA()
	off := color.RGBA{uint8(r2 >> 8), uint8(g2 >> 8), uint8(b2 >> 8), 255}
	if off.R != 255 || off.G != 255 || off.B != 255 {
		t.Errorf("expected untouched white pixel when cut lines disabled, got %+v", off)
	}
}
