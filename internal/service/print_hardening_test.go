package service

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"hash/crc32"
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

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

// 3-6. مدخلات غير صالحة تُرفض قبل تخصيص أي ذاكرة أو رسم — جدول واحد
// (نفس الهيكل، يختلف المدخل والرسالة المتوقعة فقط)
func TestValidatePrintRequest_RejectsInvalidInput(t *testing.T) {
	oversized := make([]domain.PrintItem, 0, 1001)
	for i := 0; i < 1001; i++ {
		oversized = append(oversized, domain.PrintItem{})
	}
	cases := []struct {
		name    string
		paperW  float64
		paperH  float64
		items   []domain.PrintItem
		wantErr string
	}{
		{"NaN geometry", 100, 100, []domain.PrintItem{{ImageSrc: "x", X: math.NaN(), Y: 10, W: 50, H: 50}}, "NaN or Inf"},
		{"contradictory crop", 100, 100, []domain.PrintItem{{ImageSrc: "x", X: 10, Y: 10, W: 50, H: 50, CropW: 10, CropH: 0}}, "invalid crop region"},
		{"oversized item", 210, 297, []domain.PrintItem{{ImageSrc: "x", X: 0, Y: 0, W: 300, H: 100}}, "invalid item geometry"},
		{"too many items", 100, 100, oversized, "too many items"},
	}

	svc := NewPrintService()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := domain.PrintRequest{
				PaperWidthMM: tc.paperW, PaperHeightMM: tc.paperH, DPI: 150, Items: tc.items,
			}
			_, _, err := svc.GeneratePrintSheet(req)
			if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("expected %q rejection, got: %v", tc.wantErr, err)
			}
		})
	}
}

// 7. مسار CMYK/JPEG غير المغطى: ملف صالح + وثيقة HTML
func TestSaveOutput_CMYK_JPEG_Branch(t *testing.T) {
	// 🖨️ عقد الإدخال الإنتاجي (RV-Print-07).
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	imgSrc := stagePrintTestImage(t, "photo", 200, 200, color.RGBA{R: 160, G: 40, B: 40, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 148.0, PaperHeightMM: 210.0, DPI: 150,
		BackgroundColor: "#FFFFFF", ExportFormat: "jpeg", ColorSpace: "cmyk",
		Items: []domain.PrintItem{
			{ImageSrc: imgSrc, X: 10, Y: 10, W: 60, H: 90, Brightness: 100, Contrast: 100, Saturation: 100},
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
	// ⚖️ التحجيم يجب أن يحفظ النسبة: `fill` كان يمدّ ورقة التركيب لتطابق نسبة
	// أبعاد الورق المختار في حوار الطباعة الأصلي قسراً فيسحق التصميم.
	if strings.Contains(html, "object-fit: fill") {
		t.Errorf("print img must not use object-fit: fill (distorts on paper size change)")
	}
	if got := strings.Count(html, "object-fit: contain !important;"); got != 2 {
		t.Errorf("expected object-fit: contain on both screen and print rules, got %d", got)
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
	// ⚖️ نفس عقدة buildNativePrintHTML: لا `object-fit: fill` في أي من الوثيقتين.
	if strings.Contains(html, "object-fit: fill") {
		t.Errorf("print img must not use object-fit: fill (distorts on paper size change)")
	}
	if got := strings.Count(html, "object-fit: contain !important;"); got != 2 {
		t.Errorf("expected object-fit: contain on both screen and print rules, got %d", got)
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

// ─── RV-Print-01: سقوف التوسيع الشبكي ───

// rvPrintRequest طلب صالح أدنى للتحقق (100×100مم @300dpi ≈ 1.4MP).
func rvPrintRequest() domain.PrintRequest {
	return domain.PrintRequest{
		PaperWidthMM:  100,
		PaperHeightMM: 100,
		DPI:           300,
	}
}

func TestValidatePrintRequest_RejectsNegativeCopies(t *testing.T) {
	s := NewPrintService()
	req := rvPrintRequest()
	req.Items = []domain.PrintItem{{ImageSrc: "", X: 0, Y: 0, W: 10, H: 10, Copies: -3}}
	if _, _, err := s.validatePrintRequest(req); err == nil {
		t.Error("expected error for negative Copies, got nil")
	}
}

func TestValidatePrintRequest_RejectsHugeSingleCopies(t *testing.T) {
	s := NewPrintService()
	req := rvPrintRequest()
	req.Items = []domain.PrintItem{{ImageSrc: "", X: 0, Y: 0, W: 10, H: 10, Copies: 1 << 30}}
	if _, _, err := s.validatePrintRequest(req); err == nil {
		t.Error("expected error for Copies=2^30, got nil")
	}
}

func TestValidatePrintRequest_RejectsExplodedTotal(t *testing.T) {
	s := NewPrintService()
	req := rvPrintRequest()
	// 6 قوالب × 5000 نسخة = 30000 خلية > سقف 25000 (كل قيمة مفردة تحت سقفها).
	items := make([]domain.PrintItem, 0, 6)
	for i := 0; i < 6; i++ {
		items = append(items, domain.PrintItem{X: 0, Y: 0, W: 10, H: 10, Copies: 5000})
	}
	req.Items = items
	if _, _, err := s.validatePrintRequest(req); err == nil {
		t.Error("expected error for 30000 expanded cells, got nil")
	}
}

func TestValidatePrintRequest_AcceptsSaneGridExpansion(t *testing.T) {
	s := NewPrintService()
	req := rvPrintRequest()
	// شبكة واقعية: قالبان × 48 نسخة = 96 خلية < 25000.
	req.Items = []domain.PrintItem{
		{X: 0, Y: 0, W: 10, H: 10, Copies: 48, CopyCols: 8, CopyStepX: 5, CopyStepY: 5},
		{X: 0, Y: 0, W: 10, H: 10, Copies: 48, CopyCols: 8, CopyStepX: 5, CopyStepY: 5},
	}
	if _, _, err := s.validatePrintRequest(req); err != nil {
		t.Errorf("sane grid must pass validation, got %v", err)
	}
}

func TestExpandGridItems_BoundedAfterValidation(t *testing.T) {
	items := []domain.PrintItem{{X: 1, Y: 2, W: 10, H: 10, Copies: 48, CopyCols: 8, CopyStepX: 5, CopyStepY: 5}}
	out := expandGridItems(items)
	if len(out) != 48 {
		t.Fatalf("expandGridItems = %d items, want 48", len(out))
	}
	if out[9].X != 1+float64(9%8)*5 || out[9].Y != 2+float64(9/8)*5 {
		t.Errorf("grid offsets wrong: %+v", out[9])
	}
}

// ─── RV-Print-07: نطاق مسارات الصور ───

func TestResolveLocalPath_BlocksAbsoluteOutsideAppDir(t *testing.T) {
	// مسار نظامي حقيقي خارج التطبيق يجب أن يُرفض (لا يُمرَّر لـ imaging.Open).
	outside := filepath.Join(os.TempDir(), "grido_scope_probe.png")
	if got := resolveLocalPath(outside); got != "" {
		t.Errorf("resolveLocalPath(%q) = %q, want empty (blocked)", outside, got)
	}
}

func TestResolveLocalPath_AllowsDataURLs(t *testing.T) {
	src := "data:image/png;base64,iVBORw0KGgo="
	if got := resolveLocalPath(src); got != src {
		t.Errorf("data URL must pass through, got %q", got)
	}
}

// ─── RV-Print-08: سقف البكسلات المفكوكة ───

func TestCheckDecodedPixelCap_Boundaries(t *testing.T) {
	ok := image.Config{Width: 10000, Height: 9999} // 99.99MP
	if err := checkDecodedPixelCap(ok, "probe"); err != nil {
		t.Errorf("99.99MP must pass, got %v", err)
	}
	tooBig := image.Config{Width: 20000, Height: 20000} // 400MP
	if err := checkDecodedPixelCap(tooBig, "probe"); err == nil {
		t.Error("400MP must be rejected, got nil")
	}
	// أبعاد خبيثة تفيض int32 لكن int64 يكشفها (وليس التفافاً لرقم صغير).
	overflow := image.Config{Width: 100000, Height: 100000} // 10^10 بكسل
	if err := checkDecodedPixelCap(overflow, "probe"); err == nil {
		t.Error("10GP must be rejected, got nil")
	}
	zero := image.Config{Width: 0, Height: 100}
	if err := checkDecodedPixelCap(zero, "probe"); err == nil {
		t.Error("zero width must be rejected, got nil")
	}
}

// TestLoadRawImage_RejectsDimensionBomb: قنبلة حقيقية مصغّرة — ترويسة PNG
// تعلن 100000×100000 (10GP) بحجم ملف < 100 بايت؛ يجب أن تُرفض من الترويسة
// قبل أي تخصيص بكسلات (يكشف انزلاق check-then-decode).
func TestLoadRawImage_RejectsDimensionBomb(t *testing.T) {
	pngBomb := buildTinyPNGWithHugeIHDR(100000, 100000)
	b64 := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBomb)
	t.Logf("bomb file size: %d bytes (declares 10GP)", len(pngBomb))
	cache := &imageCache{images: make(map[string]image.Image), access: make(map[string]time.Time)}
	if _, err := loadRawImage(b64, "bomb-test", cache); err == nil {
		t.Fatal("dimension bomb must be rejected, got nil error")
	}
}

// buildTinyPNGWithHugeIHDR يبني PNG صالح الترويسة بأبعاد معلنة ضخمة وIDAT فارغ.
func buildTinyPNGWithHugeIHDR(w, h uint32) []byte {
	buf := &bytes.Buffer{}
	buf.Write([]byte{137, 80, 78, 71, 13, 10, 26, 10}) // signature
	writeChunk := func(typ string, data []byte) {
		var lb [4]byte
		binary.BigEndian.PutUint32(lb[:], uint32(len(data)))
		buf.Write(lb[:])
		buf.WriteString(typ)
		buf.Write(data)
		crc := crc32.ChecksumIEEE(append([]byte(typ), data...))
		binary.BigEndian.PutUint32(lb[:], crc)
		buf.Write(lb[:])
	}
	ihdr := make([]byte, 13)
	binary.BigEndian.PutUint32(ihdr[0:4], w)
	binary.BigEndian.PutUint32(ihdr[4:8], h)
	ihdr[8], ihdr[9], ihdr[10], ihdr[11], ihdr[12] = 8, 6, 0, 0, 0 // 8bit RGBA
	writeChunk("IHDR", ihdr)
	writeChunk("IDAT", []byte{0x78, 0x9c, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01})
	writeChunk("IEND", nil)
	return buf.Bytes()
}
