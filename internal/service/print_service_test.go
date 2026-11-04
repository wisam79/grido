package service

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

func TestPrintService_GeneratePrintSheet(t *testing.T) {
	// 1. إنشاء صورة اختبارية عبر عقد الإدخال الإنتاجي (RV-Print-07).
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	dummyImgSrc := stagePrintTestImage(t, "dummy", 100, 100, color.RGBA{0, 0, 255, 255})

	// 2. إعداد طلب الطباعة
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    100.0, // 100x100mm
		PaperHeightMM:   100.0,
		DPI:             300,
		BackgroundColor: "#FF0000", // خلفية حمراء
		ShowCutLines:    true,
		CutLines: []domain.CutLine{
			{X1: 10, Y1: 10, X2: 90, Y2: 10},
		},
		Items: []domain.PrintItem{
			{
				ImageSrc:   dummyImgSrc,
				X:          20,
				Y:          20,
				W:          50,
				H:          50,
				Brightness: 110,
				Contrast:   105,
				Saturation: 100,
			},
		},
	}

	// 3. تشغيل الخدمة لتوليد ورقة الطباعة
	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("unexpected error generating print sheet: %v", err)
	}
	defer os.Remove(outPath)

	// 4. التحقق من وجود الملف الناتج وصحته
	if _, err := os.Stat(outPath); os.IsNotExist(err) {
		t.Errorf("output file does not exist: %s", outPath)
	}

	// قراءة الملف الناتج للتحقق من أبعاده بالبكسل
	// بما أن outPath قد يكون ملف HTML، نستنتج مسار الـ PNG
	pngPath := outPath
	if strings.HasSuffix(outPath, ".html") {
		pngPath = strings.TrimSuffix(outPath, ".html") + ".png"
		defer os.Remove(pngPath) // تأكد من حذف الصورة أيضاً
	}

	outImg, err := imaging.Open(pngPath)
	if err != nil {
		t.Fatalf("failed to open output image: %v", err)
	}

	bounds := outImg.Bounds()
	// 100mm @ 300 DPI = (100 * 300) / 25.4 = 1181.1 px (حوالي 1181 px)
	expectedW := 1181
	expectedH := 1181

	// السماح بهامش خطأ 2 بكسل بسبب التقريب
	if diff := mathAbs(bounds.Dx() - expectedW); diff > 2 {
		t.Errorf("expected width close to %d, got %d", expectedW, bounds.Dx())
	}
	if diff := mathAbs(bounds.Dy() - expectedH); diff > 2 {
		t.Errorf("expected height close to %d, got %d", expectedH, bounds.Dy())
	}
}

func TestPrintService_ParseColor(t *testing.T) {
	tests := []struct {
		hex      string
		expected color.RGBA
	}{
		{"#fff", color.RGBA{255, 255, 255, 255}},
		{"#000", color.RGBA{0, 0, 0, 255}},
		{"#f00f", color.RGBA{255, 0, 0, 255}},
		{"#0000", color.RGBA{0, 0, 0, 0}},
		{"#FF0000", color.RGBA{255, 0, 0, 255}},
		{"#00FF0080", color.RGBA{0, 255, 0, 128}},
		{"transparent", color.RGBA{0, 0, 0, 0}},
		{"invalid", color.RGBA{255, 255, 255, 255}}, // Fallback to white
	}

	for _, tc := range tests {
		result := parseColor(tc.hex)
		r, g, b, a := result.RGBA()
		got := color.RGBA{uint8(r >> 8), uint8(g >> 8), uint8(b >> 8), uint8(a >> 8)}
		if got != tc.expected {
			t.Errorf("parseColor(%q): expected %+v, got %+v", tc.hex, tc.expected, got)
		}
	}
}

func TestPrintService_Validation(t *testing.T) {
	svc := NewPrintService()

	// 1. اختبار DPI غير صالح (أقل من 50)
	req1 := domain.PrintRequest{DPI: 40, PaperWidthMM: 100, PaperHeightMM: 100}
	_, _, err := svc.GeneratePrintSheet(req1)
	if err == nil || !strings.Contains(err.Error(), "invalid DPI") {
		t.Errorf("expected error for DPI < 50, got: %v", err)
	}

	// 2. اختبار DPI غير صالح (أكبر من 600)
	req2 := domain.PrintRequest{DPI: 800, PaperWidthMM: 100, PaperHeightMM: 100}
	_, _, err = svc.GeneratePrintSheet(req2)
	if err == nil || !strings.Contains(err.Error(), "invalid DPI") {
		t.Errorf("expected error for DPI > 600, got: %v", err)
	}

	// 3. اختبار أبعاد غير صالحة (عرض الورقة أقل من 10mm)
	req3 := domain.PrintRequest{DPI: 300, PaperWidthMM: 5, PaperHeightMM: 100}
	_, _, err = svc.GeneratePrintSheet(req3)
	if err == nil || !strings.Contains(err.Error(), "invalid PaperWidthMM") {
		t.Errorf("expected error for PaperWidthMM < 10, got: %v", err)
	}

	// 4. اختبار أبعاد غير صالحة (طول الورقة أكبر من 1000mm)
	req4 := domain.PrintRequest{DPI: 300, PaperWidthMM: 100, PaperHeightMM: 1200}
	_, _, err = svc.GeneratePrintSheet(req4)
	if err == nil || !strings.Contains(err.Error(), "invalid PaperHeightMM") {
		t.Errorf("expected error for PaperHeightMM > 1000, got: %v", err)
	}

	// 5. اختبار عدد بكسلات ضخم جداً لمنع OOM
	req5 := domain.PrintRequest{DPI: 600, PaperWidthMM: 900, PaperHeightMM: 900}
	_, _, err = svc.GeneratePrintSheet(req5)
	if err == nil || !strings.Contains(err.Error(), "pixels exceed 144 megapixels") {
		t.Errorf("expected error for huge canvas size, got: %v", err)
	}

	// 6. اختبار إرسال ملف صورة غير موجود
	req6 := domain.PrintRequest{
		DPI:           300,
		PaperWidthMM:  100,
		PaperHeightMM: 100,
		Items: []domain.PrintItem{
			{ImageSrc: "/local-image/nonexistent_file.png", X: 10, Y: 10, W: 50, H: 50},
		},
	}
	_, _, err = svc.GeneratePrintSheet(req6)
	if err == nil || !strings.Contains(err.Error(), "image file does not exist") {
		t.Errorf("expected error for missing image file, got: %v", err)
	}

	// 7. اختبار عنصر كامل التغطية (Bleed) يتجاوز الورقة بأجزاء من المئة من المليمتر
	// بسبب تحويل بكسل→مم (A4@300DPI = 2480×3508 بكسل ← 209.97×297.01mm)
	req7 := domain.PrintRequest{
		DPI:           300,
		PaperWidthMM:  210.0,
		PaperHeightMM: 297.0,
		Items: []domain.PrintItem{
			{ImageSrc: "/local-image/nonexistent_file.png", X: 0, Y: 0, W: 209.97, H: 297.01},
		},
	}
	_, _, err = svc.GeneratePrintSheet(req7)
	if err == nil || !strings.Contains(err.Error(), "image file does not exist") {
		t.Errorf("expected float-rounding full-bleed item to pass geometry guard, got: %v", err)
	}

	// 8. اختبار عنصر يتجاوز الورقة فعلياً (أكبر من التسامح 0.1mm) — يجب رفضه
	req8 := domain.PrintRequest{
		DPI:           300,
		PaperWidthMM:  210.0,
		PaperHeightMM: 297.0,
		Items: []domain.PrintItem{
			{ImageSrc: "/local-image/nonexistent_file.png", X: 0, Y: 0, W: 210, H: 300},
		},
	}
	_, _, err = svc.GeneratePrintSheet(req8)
	if err == nil || !strings.Contains(err.Error(), "invalid item geometry") {
		t.Errorf("expected oversized item to be rejected, got: %v", err)
	}
}

func mathAbs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// TestPrintService_JPEGExport يتحقق من مسار تصدير JPEG للطباعة الملونة:
// الملف الناتج بامتداد .jpg، يُفك ترميزه بنجاح، ويحمل كثافة JFIF صحيحة
// (مطابقة لـ DPI المطلوب) لتطبيق مقاس الورقة الفيزيائي
func TestPrintService_JPEGExport(t *testing.T) {
	// 🖨️ عقد الإدخال الإنتاجي (RV-Print-07).
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	dummyImgSrc := stagePrintTestImage(t, "dummy", 800, 600, color.RGBA{0, 128, 255, 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    210.0,
		PaperHeightMM:   297.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "jpeg",
		Items: []domain.PrintItem{
			{ImageSrc: dummyImgSrc, X: 0, Y: 0, W: 210, H: 297, Brightness: 100, Contrast: 100, Saturation: 100},
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("unexpected error generating JPEG print sheet: %v", err)
	}

	jpgPath := outPath
	if strings.HasSuffix(outPath, ".html") {
		jpgPath = strings.TrimSuffix(outPath, ".html") + ".jpg"
	}
	if _, err := os.Stat(jpgPath); os.IsNotExist(err) {
		t.Errorf("expected JPEG output file to exist: %s", jpgPath)
	}

	data, err := os.ReadFile(jpgPath)
	if err != nil {
		t.Fatalf("failed to read JPEG output: %v", err)
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Errorf("expected HTML document for iframe print, got: %s", htmlDoc[:min(50, len(htmlDoc))])
	}
	// OFFSET داخل قطعة APP0 المضافة بعد SOI: "JFIF\0" عند 6، units عند 13، Xdensity عند 14
	if len(data) < 18 || !bytes.Contains(data[:16], []byte("JFIF")) {
		t.Errorf("expected JFIF segment in JPEG output")
	}
	if len(data) < 14 || data[13] != 1 {
		t.Errorf("expected JFIF density units = 1 (DPI), got %v", data[13])
	}
	density := binary.BigEndian.Uint16(data[14:16])
	if density != 300 {
		t.Errorf("expected X density 300 DPI, got %d", density)
	}

	outImg, err := imaging.Open(jpgPath)
	if err != nil {
		t.Fatalf("failed to decode JPEG output: %v", err)
	}
	bounds := outImg.Bounds()
	// 210×297mm @ 300 DPI = 2480×3508 بكسل (±2 سماح تقريب)
	if diff := mathAbs(bounds.Dx() - 2480); diff > 2 {
		t.Errorf("expected width close to 2480, got %d", bounds.Dx())
	}
	if diff := mathAbs(bounds.Dy() - 3508); diff > 2 {
		t.Errorf("expected height close to 3508, got %d", bounds.Dy())
	}
}

func BenchmarkPrintService_GeneratePrintSheet(b *testing.B) {
	// 🖨️ عقد الإدخال الإنتاجي (RV-Print-07) — تهيئة يدوية لبيئة القياس
	// (stagePrintTestImage مخصص لـ *testing.T).
	tmp := b.TempDir()
	oldAppDir, hadAppDir := os.LookupEnv("GRIDO_APP_DIR")
	_ = os.Setenv("GRIDO_APP_DIR", tmp)
	b.Cleanup(func() {
		if hadAppDir {
			_ = os.Setenv("GRIDO_APP_DIR", oldAppDir)
		} else {
			_ = os.Unsetenv("GRIDO_APP_DIR")
		}
	})
	mediaDir := filepath.Join(tmp, "Media")
	if err := os.MkdirAll(mediaDir, 0o755); err != nil {
		b.Fatalf("mkdir Media: %v", err)
	}
	dummyImgSrc := "/local-image/dummy_bench.png"
	dummyImg := image.NewRGBA(image.Rect(0, 0, 800, 800))
	for x := 0; x < 800; x++ {
		for y := 0; y < 800; y++ {
			dummyImg.Set(x, y, color.RGBA{0, 255, 0, 255})
		}
	}
	if err := imaging.Save(dummyImg, filepath.Join(mediaDir, "dummy_bench.png")); err != nil {
		b.Fatalf("failed to save dummy image: %v", err)
	}

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    210.0, // A4
		PaperHeightMM:   297.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ShowCutLines:    true,
		CutLines: []domain.CutLine{
			{X1: 10, Y1: 10, X2: 200, Y2: 10},
		},
		Items: []domain.PrintItem{
			{ImageSrc: dummyImgSrc, X: 15, Y: 15, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgSrc, X: 65, Y: 15, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgSrc, X: 115, Y: 15, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgSrc, X: 15, Y: 65, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgSrc, X: 65, Y: 65, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: dummyImgSrc, X: 115, Y: 65, W: 45, H: 45, Brightness: 100, Contrast: 100, Saturation: 100},
		},
	}

	for b.Loop() {
		out, _, err := svc.GeneratePrintSheet(req)
		if err != nil {
			b.Fatalf("GeneratePrintSheet failed: %v", err)
		}
		_ = os.Remove(out)
		if strings.HasSuffix(out, ".html") {
			_ = os.Remove(strings.TrimSuffix(out, ".html") + ".png")
		}
	}
}

func TestPrintService_CanvasComposition(t *testing.T) {
	// 🖨️ عقد الإدخال الإنتاجي (RV-Print-07).
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	// صورة زرقاء 100×100 — تُوضع في النصف العلوي الأيسر من الكانفاس (0..500px)
	dummyImgSrc := stagePrintTestImage(t, "dummy", 100, 100, color.RGBA{0, 0, 255, 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    200.0,
		PaperHeightMM:   200.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "png",
		Items: []domain.PrintItem{
			// خلية بلا imageSrc — يُرسم فيها الكانفاس المركّب
			{X: 10, Y: 10, W: 100, H: 100},
		},
		Composition: &domain.CanvasComposition{
			CanvasWidthPx:   1000,
			CanvasHeightPx:  1000,
			CanvasWidthMM:   100,
			CanvasHeightMM:  100,
			BackgroundColor: "#00FF00",
			Items: []domain.PrintItem{
				{
					ImageSrc: dummyImgSrc,
					X:        0, Y: 0, W: 500, H: 500,
					Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100,
				},
			},
		},
	}

	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("unexpected error generating composition print sheet: %v", err)
	}
	defer os.Remove(outPath)
	pngPath := outPath
	if strings.HasSuffix(outPath, ".html") {
		pngPath = strings.TrimSuffix(outPath, ".html") + ".png"
		defer os.Remove(pngPath)
	}

	outImg, err := imaging.Open(pngPath)
	if err != nil {
		t.Fatalf("failed to open output image: %v", err)
	}

	pixelAt := func(xMM, yMM int) color.RGBA {
		px := int(math.Round(mmToPx(float64(xMM), 300)))
		py := int(math.Round(mmToPx(float64(yMM), 300)))
		return outImg.At(px, py).(color.RGBA)
	}

	// (50,50)mm داخل منطقة الصورة الزرقاء في الكانفاس (250px كانفاس → 295px من أصل 1181)
	blue := pixelAt(50, 50)
	if blue.R != 0 || blue.G != 0 || blue.B < 240 {
		t.Errorf("expected blue composition image at cell center, got %+v", blue)
	}
	// (90,50)mm داخل الكانفاس لكن خارج الصورة → خلفية الكانفاس الخضراء
	green := pixelAt(90, 50)
	if green.G < 240 || green.B > 20 {
		t.Errorf("expected green composition background, got %+v", green)
	}
	// (5,5)mm خارج الخلية → ورق أبيض
	white := pixelAt(5, 5)
	if white.R < 240 || white.G < 240 || white.B < 240 {
		t.Errorf("expected white paper outside cell, got %+v", white)
	}
}

func TestPrintService_EmptySrcItemsSkippedWithoutComposition(t *testing.T) {
	// سلوك تاريخي محفوظ: عنصر بلا imageSrc وبدون composition يُتجاهل بصمت — لا فشل
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    100.0,
		PaperHeightMM:   100.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "png",
		Items: []domain.PrintItem{
			{X: 10, Y: 10, W: 50, H: 50},
		},
	}

	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("expected empty-src items to be skipped silently, got error: %v", err)
	}
	defer os.Remove(outPath)
	if strings.HasSuffix(outPath, ".html") {
		defer os.Remove(strings.TrimSuffix(outPath, ".html") + ".png")
	}
}

func TestDrawItemImageDecorationWithoutSource(t *testing.T) {
	for _, tc := range []struct {
		name      string
		item      domain.PrintItem
		center    color.Color
		topBorder color.Color
	}{
		{name: "fill", item: domain.PrintItem{BgColor: "#ff0000"}, center: color.RGBA{R: 255, A: 255}, topBorder: color.RGBA{R: 255, A: 255}},
		{name: "border", item: domain.PrintItem{BorderWidthMM: 0.4, BorderColor: "#0000ff"}, center: color.White, topBorder: color.RGBA{B: 255, A: 255}},
		{name: "fill-and-border", item: domain.PrintItem{BgColor: "#ff0000", BorderWidthMM: 0.4, BorderColor: "#0000ff"}, center: color.RGBA{R: 255, A: 255}, topBorder: color.RGBA{B: 255, A: 255}},
		{name: "empty", center: color.White, topBorder: color.White},
		{name: "transparent", item: domain.PrintItem{BgColor: " TRANSPARENT ", BorderWidthMM: 0.4, BorderColor: "Transparent"}, center: color.White, topBorder: color.White},
		{name: "missing-border-color", item: domain.PrintItem{BgColor: " ", BorderWidthMM: 0.4}, center: color.White, topBorder: color.White},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dc := gg.NewContext(120, 80)
			dc.SetColor(color.White)
			dc.Clear()
			item := tc.item
			item.X, item.Y, item.W, item.H = 1, 1, 6, 4
			item.CornerRadiusMM, item.Rotation = 1, 90
			drawItemImage(dc, nil, item, 254) // 10 px/mm, including a nil quarter-turn image

			for _, point := range []struct {
				x, y int
				want color.Color
			}{
				{40, 30, tc.center},
				{40, 11, tc.topBorder},
				{10, 10, color.White}, // rounded corner is not filled
				{5, 30, color.White},  // outside the fixed slot rectangle
			} {
				if got := dc.Image().At(point.x, point.y); !sameColor(got, point.want) {
					t.Errorf("pixel (%d,%d) = %v, want %v", point.x, point.y, got, point.want)
				}
			}

			// A nil-image decoration must not leave its clip mask on the next item.
			next := domain.PrintItem{X: 8, Y: 1, W: 2, H: 4, BgColor: "#00ff00"}
			drawItemImage(dc, nil, next, 254)
			if got := dc.Image().At(90, 30); !sameColor(got, color.RGBA{G: 255, A: 255}) {
				t.Errorf("next slot was clipped by the decoration: %v", got)
			}
		})
	}
}

func TestPrintService_DecorativeSlotsAndMixedCopies(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	blue := color.RGBA{B: 255, A: 255}
	red := color.RGBA{R: 255, A: 255}
	green := color.RGBA{G: 255, A: 255}
	src := stagePrintTestImage(t, "mixed-decoration", 30, 20, blue)
	req := domain.PrintRequest{
		PaperWidthMM: 40, PaperHeightMM: 40, DPI: 254,
		BackgroundColor: "#ffffff", ExportFormat: "png",
		Items: []domain.PrintItem{
			{X: 2, Y: 2, W: 6, H: 4, BgColor: "#ff0000", CornerRadiusMM: 1, Rotation: 90},
			{ImageSrc: src, X: 10, Y: 2, W: 6, H: 4, SlotAspect: 1.5, Rotation: 270, FlipX: true, Brightness: 100, Contrast: 100, Saturation: 100},
			{X: 2, Y: 9, W: 6, H: 4, BorderWidthMM: 0.4, BorderColor: "#00ff00", CornerRadiusMM: 1, Rotation: 270},
			{X: 10, Y: 9, W: 6, H: 4},
		},
	}
	for i := range req.Items {
		req.Items[i].Copies, req.Items[i].CopyCols = 4, 2
		req.Items[i].CopyStepX, req.Items[i].CopyStepY = 18, 16
	}

	outPath, _, err := NewPrintService().GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("mixed decorative print failed: %v", err)
	}
	pngPath := strings.TrimSuffix(outPath, ".html")
	if pngPath != outPath {
		pngPath += ".png"
	}
	out, err := imaging.Open(pngPath)
	if err != nil {
		t.Fatalf("open mixed decorative print: %v", err)
	}
	if out.Bounds().Dx() != 400 || out.Bounds().Dy() != 400 {
		t.Fatalf("sheet dimensions = %v, want 400x400", out.Bounds())
	}

	for copyIndex := 0; copyIndex < 4; copyIndex++ {
		dx, dy := float64(copyIndex%2)*18, float64(copyIndex/2)*16
		for _, point := range []struct {
			x, y float64
			want color.Color
		}{
			{5, 4, red},
			{2.1, 2.1, color.White}, // rounded fill corner
			{10.3, 4, blue},         // rotated image covers both ends of the non-square slot
			{15.7, 4, blue},
			{5, 9.1, green},       // border-only slot survives expansion and batching
			{5, 11, color.White},  // no fake image or fill inside that border
			{13, 11, color.White}, // genuinely empty slot is still skipped
		} {
			x := int(math.Round(mmToPx(point.x+dx, req.DPI)))
			y := int(math.Round(mmToPx(point.y+dy, req.DPI)))
			if got := out.At(x, y); !sameColor(got, point.want) {
				t.Errorf("copy %d pixel (%d,%d) = %v, want %v", copyIndex, x, y, got, point.want)
			}
		}
	}
}

func TestPrintService_DecorationDoesNotHideUnreadableImage(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	req := domain.PrintRequest{
		PaperWidthMM: 40, PaperHeightMM: 40, DPI: 100,
		BackgroundColor: "#ffffff", ExportFormat: "png",
		Items: []domain.PrintItem{
			{X: 2, Y: 2, W: 6, H: 4, ImageSrc: "data:image/png;base64,broken", BgColor: "#ff0000", BorderWidthMM: 0.4, BorderColor: "#0000ff"},
		},
	}
	if _, _, err := NewPrintService().GeneratePrintSheet(req); err == nil {
		t.Fatal("an unreadable image with decoration must still fail the print request")
	}
}

func TestSetJpegDPI_ReplaceExistingAPP0(t *testing.T) {
	// Construct a dummy JPEG with SOI + existing APP0 (72 DPI) + dummy payload + EOI
	existingAPP0 := []byte{
		0xFF, 0xD8, // SOI
		0xFF, 0xE0, // APP0 marker
		0x00, 0x10, // length = 16
		'J', 'F', 'I', 'F', 0x00,
		0x01, 0x01,
		0x01,       // units = DPI
		0x00, 0x48, // X density = 72
		0x00, 0x48, // Y density = 72
		0x00, 0x00, // thumbnail
		0xFF, 0xDA, // SOS dummy
		0x12, 0x34,
		0xFF, 0xD9, // EOI
	}

	updated, err := setJpegDPI(existingAPP0, 300)
	if err != nil {
		t.Fatalf("setJpegDPI failed: %v", err)
	}

	// Verify only one APP0 segment exists
	app0Count := bytes.Count(updated, []byte{0xFF, 0xE0})
	if app0Count != 1 {
		t.Errorf("expected exactly 1 APP0 segment, got %d", app0Count)
	}

	// Verify new DPI is 300
	density := binary.BigEndian.Uint16(updated[14:16])
	if density != 300 {
		t.Errorf("expected updated density 300 DPI, got %d", density)
	}

	// Verify trailing bytes survived
	if !bytes.HasSuffix(updated, []byte{0xFF, 0xDA, 0x12, 0x34, 0xFF, 0xD9}) {
		t.Errorf("expected trailing JPEG payload to be preserved")
	}
}

func TestPrintService_HTMLDocUsesLocalImage(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    100.0,
		PaperHeightMM:   100.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "jpeg",
		Items:           []domain.PrintItem{},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("GeneratePrintSheet failed: %v", err)
	}
	defer os.Remove(outPath)
	if strings.HasSuffix(outPath, ".html") {
		defer os.Remove(strings.TrimSuffix(outPath, ".html") + ".jpg")
	}

	// 🔒 The self-contained HTML for WebView2 iframe MUST use /local-image/ to avoid CSP block
	if !strings.Contains(htmlDoc, `src="/local-image/print_`) {
		t.Errorf("expected htmlDoc to use /local-image/print_... path for WebView2 CSP compliance, got: %s", htmlDoc)
	}
	if strings.Contains(htmlDoc, `src="file:///`) {
		t.Errorf("htmlDoc must NOT contain file:/// URI which is blocked by WebView2 CSP")
	}
}

func TestPrintService_UploadImageInExportsResolved(t *testing.T) {
	appDir := utils.GetAppDir()
	exportsDir := filepath.Join(appDir, "Exports")
	_ = os.MkdirAll(exportsDir, 0755)

	uploadFilename := fmt.Sprintf("print_upload_test_%d.png", time.Now().UnixNano())
	uploadFilePath := filepath.Join(exportsDir, uploadFilename)

	dummyImg := image.NewRGBA(image.Rect(0, 0, 50, 50))
	if err := imaging.Save(dummyImg, uploadFilePath); err != nil {
		t.Fatalf("failed to create dummy upload image in Exports: %v", err)
	}
	defer os.Remove(uploadFilePath)

	// Item with /local-image/print_upload_... path as sent from frontend
	itemSrc := "/local-image/" + uploadFilename
	resolved := resolveLocalPath(itemSrc)
	if resolved == "" {
		t.Fatalf("resolveLocalPath blocked or failed to resolve upload image: %s", itemSrc)
	}
	if _, err := os.Stat(resolved); err != nil {
		t.Fatalf("resolved path does not exist: %s (err: %v)", resolved, err)
	}

	// Verify GeneratePrintSheet succeeds with this item
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    100.0,
		PaperHeightMM:   100.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "jpeg",
		Items: []domain.PrintItem{
			{ImageSrc: itemSrc, X: 10, Y: 10, W: 50, H: 50},
		},
	}
	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("GeneratePrintSheet failed with upload image in Exports: %v", err)
	}
	defer os.Remove(outPath)
	if strings.HasSuffix(outPath, ".html") {
		defer os.Remove(strings.TrimSuffix(outPath, ".html") + ".jpg")
	}
}

func TestPrintService_HiRes300DPI_A4_FullScaleVerification(t *testing.T) {
	// 🖨️ عقد الإدخال الإنتاجي (RV-Print-07).
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	// Create test photo
	testImgSrc := stagePrintTestImage(t, "photo", 400, 600, color.RGBA{R: 240, G: 180, B: 100, A: 255})

	svc := NewPrintService()

	// A4 Standard: 210mm x 297mm at 300 DPI -> 2480 x 3508 pixels
	req := domain.PrintRequest{
		PaperWidthMM:    210.0,
		PaperHeightMM:   297.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ExportFormat:    "jpeg",
		ShowCutLines:    true,
		CutLines: []domain.CutLine{
			{X1: 15, Y1: 15, X2: 195, Y2: 15},
			{X1: 15, Y1: 280, X2: 195, Y2: 280},
		},
		Items: []domain.PrintItem{
			{ImageSrc: testImgSrc, X: 20, Y: 20, W: 80, H: 120},
			{ImageSrc: testImgSrc, X: 110, Y: 20, W: 80, H: 120},
		},
	}

	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("GeneratePrintSheet 300 DPI A4 failed: %v", err)
	}
	defer os.Remove(outPath)

	actualJpg := outPath
	if strings.HasSuffix(outPath, ".html") {
		actualJpg = strings.TrimSuffix(outPath, ".html") + ".jpg"
		defer os.Remove(actualJpg)
	}

	fileInfo, err := os.Stat(actualJpg)
	if err != nil {
		t.Fatalf("Generated print sheet JPG not found: %v", err)
	}
	if fileInfo.Size() < 5000 {
		t.Errorf("Generated JPEG file is suspiciously small: %d bytes", fileInfo.Size())
	}

	// Verify image dimensions: must match A4 at 300 DPI (2480 x 3508)
	f, err := os.Open(actualJpg)
	if err != nil {
		t.Fatalf("Failed to open generated JPEG: %v", err)
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		t.Fatalf("Failed to decode JPEG config: %v", err)
	}

	expectedW := int(math.Round(210.0 * 300.0 / 25.4))
	expectedH := int(math.Round(297.0 * 300.0 / 25.4))

	if cfg.Width != expectedW || cfg.Height != expectedH {
		t.Errorf("A4 300 DPI dimensions mismatch. Expected %dx%d, got %dx%d", expectedW, expectedH, cfg.Width, cfg.Height)
	}

	// Verify JPEG APP0 DPI marker
	jpgData, err := os.ReadFile(actualJpg)
	if err != nil {
		t.Fatalf("Failed to read generated JPEG file: %v", err)
	}
	if len(jpgData) >= 18 && bytes.Contains(jpgData[:16], []byte("JFIF")) {
		if jpgData[13] != 1 {
			t.Errorf("Expected JFIF density units = 1 (DPI), got %v", jpgData[13])
		}
		xDensity := binary.BigEndian.Uint16(jpgData[14:16])
		yDensity := binary.BigEndian.Uint16(jpgData[16:18])
		if xDensity != 300 || yDensity != 300 {
			t.Errorf("Expected JPEG DPI 300x300, got %dx%d", xDensity, yDensity)
		}
	} else {
		t.Errorf("Expected valid JFIF APP0 segment in JPEG output")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧮 دفعة الأداء C3 — وزن مساحة المصدر المفكوك في تقدير الدفعة: دفعة صغيرة
// من الأهداف المصغّرة لا تحتشد صوراً عملاقة المصدر (المصدر يبقى حياً أثناء
// المعالجة إلى جانب الناتج). لا تغيير على حد الدفعة الإجمالي ولا الترتيب.
// ─────────────────────────────────────────────────────────────────────────────

// writeFakePNGHeader يكتب PNG صغيراً بترويسة تُعلن أبعاداً ضخمة — يكفي
// image.DecodeConfig (يقرأ IHDR فقط) لتقدير المصدر بلا فك بكسلات.
func writeFakePNGHeader(t *testing.T, dir, name string, w, h int) string {
	t.Helper()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	var buf bytes.Buffer
	buf.Write([]byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})
	chunk := make([]byte, 0, 25)
	chunk = append(chunk, 0, 0, 0, 13)
	chunk = append(chunk, []byte("IHDR")...)
	var dims [8]byte
	binary.BigEndian.PutUint32(dims[0:4], uint32(w))
	binary.BigEndian.PutUint32(dims[4:8], uint32(h))
	chunk = append(chunk, dims[:]...)
	chunk = append(chunk, 8, 2, 0, 0, 0) // bit depth 8, RGBA
	crc := crc32.ChecksumIEEE(chunk[4:21])
	var crcB [4]byte
	binary.BigEndian.PutUint32(crcB[:], crc)
	chunk = append(chunk, crcB[:]...)
	buf.Write(chunk)
	buf.Write([]byte{0, 0, 0, 0, 'I', 'E', 'N', 'D', 0xAE, 0x42, 0x60, 0x82})
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		t.Fatalf("write fake png: %v", err)
	}
	return path
}

func TestPrintBatchSize_WeightsSourceArea(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tmp)

	// مصدر عملاق معلن: 10000×10000 = 100MP ≈ 400MB RGBA مفكوك
	huge := writeFakePNGHeader(t, filepath.Join(tmp, "Media"), "huge_src.png", 10000, 10000)
	// مصدر صغير للتحكم: 100×100
	tiny := writeFakePNGHeader(t, filepath.Join(tmp, "Media"), "tiny_src.png", 100, 100)

	mkReq := func(src string) domain.PrintRequest {
		items := make([]domain.PrintItem, 8)
		for i := range items {
			items[i] = domain.PrintItem{ImageSrc: "/local-image/" + filepath.Base(src), X: 1, Y: 1, W: 10, H: 10}
		}
		return domain.PrintRequest{DPI: 100, Items: items}
	}

	const maxParallel = 8

	// المصدر العملاق: الهدف 10×10مم @100DPI = 40×40px = 6.4KB فقط — بدون وزن
	// المصدر كانت الدفعة تتسع لكل الأنوية (maxParallel)؛ الآن وزن 400MB يجعلها 1.
	if size := printBatchSize(mkReq(huge), maxParallel); size != 1 {
		t.Fatalf("huge source batch size = %d, want 1 (crowding giant sources in one batch)", size)
	}
	// المصدر الصغير: السلوك السابق محفوظ — الدفعة تصل حد الأنوية.
	if size := printBatchSize(mkReq(tiny), maxParallel); size != maxParallel {
		t.Fatalf("tiny source batch size = %d, want %d (unchanged behavior)", size, maxParallel)
	}
	// بلا صور: لا تغيير.
	if size := printBatchSize(domain.PrintRequest{Items: []domain.PrintItem{{W: 5, H: 5}}}, maxParallel); size != maxParallel {
		t.Fatalf("no-image batch size = %d, want %d", size, maxParallel)
	}
}

// craftJPEGWithExifOrientation يبني ترويسة JPEG أصغرية صالحة لـ DecodeConfig
// (SOI + APP1/Exif بوسم الاتجاه + SOF0 بالأبعاد) — تُستخدم لاختبار تطبيع
// الأبعاد بعد EXIF (الإتجاهات 5-8 تبدّل العرض/الارتفاع).
func craftJPEGWithExifOrientation(t *testing.T, orientation int, w, h int) []byte {
	t.Helper()
	// كتلة TIFF: II 42 + IFD بإدخال واحد (0x0112 SHORT = orientation) —
	// كل الأعداد صغيرة-النهاية ليتزامن مع توقيع II.
	tiff := []byte{'I', 'I', 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00}
	entry := make([]byte, 12)
	binary.LittleEndian.PutUint16(entry[0:2], 0x0112) // Orientation
	binary.LittleEndian.PutUint16(entry[2:4], 3)      // SHORT
	binary.LittleEndian.PutUint32(entry[4:8], 1)      // count
	binary.LittleEndian.PutUint16(entry[8:10], uint16(orientation))
	tiff = append(tiff, entry...)
	tiff = append(tiff, 0x00, 0x00, 0x00, 0x00) // next IFD

	app1 := []byte{0xFF, 0xE1}
	segLen := 2 + 6 + len(tiff)
	app1 = append(app1, byte(segLen>>8), byte(segLen))
	app1 = append(app1, []byte("Exif\x00\x00")...)
	app1 = append(app1, tiff...)

	sof0 := []byte{0xFF, 0xC0, 0x00, 0x11, 0x08}
	sof0 = append(sof0, byte(h>>8), byte(h), byte(w>>8), byte(w), 3)
	sof0 = append(sof0, 1, 0x11, 0, 2, 0x11, 0, 3, 0x11, 0)

	// SOS أصغرية: مفك Go لـ DecodeConfig لا يتوقف إلا عندها.
	sos := []byte{0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00}

	out := []byte{0xFF, 0xD8}
	out = append(out, app1...)
	out = append(out, sof0...)
	out = append(out, sos...)
	out = append(out, 0xFF, 0xD9)
	return out
}

func TestSourceDecodedDims_ExactOrientationSwap(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tmp)

	// JPEG عادي 100×200 بلا EXIF اتجاه: بلا تبدويل.
	plainPath := filepath.Join(tmp, "plain.jpg")
	if err := os.WriteFile(plainPath, craftJPEGWithExifOrientation(t, 1, 100, 200), 0o644); err != nil {
		t.Fatal(err)
	}
	if w, h, ok := sourceDecodedDims(plainPath); !ok || w != 100 || h != 200 {
		t.Fatalf("plain portrait: w=%d h=%d ok=%v, want 100×200 true", w, h, ok)
	}
	// الاتجاه 6 (دوران 90): الأبعاد تتبدل كما يفعل imaging.AutoOrientation.
	rotPath := filepath.Join(tmp, "rot90.jpg")
	if err := os.WriteFile(rotPath, craftJPEGWithExifOrientation(t, 6, 100, 200), 0o644); err != nil {
		t.Fatal(err)
	}
	if w, h, ok := sourceDecodedDims(rotPath); !ok || w != 200 || h != 100 {
		t.Fatalf("orientation-6: w=%d h=%d ok=%v, want 200×100 true (EXIF swap)", w, h, ok)
	}
	// ملف مفقود: بلا وزن.
	if _, _, ok := sourceDecodedDims(filepath.Join(tmp, "missing.jpg")); ok {
		t.Fatal("missing file must yield ok=false")
	}
	// ملف غير صورة: بلا وزن.
	badPath := filepath.Join(tmp, "bad.png")
	if err := os.WriteFile(badPath, []byte("not an image"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, _, ok := sourceDecodedDims(badPath); ok {
		t.Fatal("non-image file must yield ok=false")
	}
}

func TestJPEGEXIFOrientation_ParsesAllQuirks(t *testing.T) {
	if got := jpegEXIFOrientation(craftJPEGWithExifOrientation(t, 8, 10, 10)); got != 8 {
		t.Fatalf("orientation 8 parsed as %d", got)
	}
	if got := jpegEXIFOrientation([]byte{0xFF, 0xD8, 0xFF, 0xD9}); got != 0 {
		t.Fatalf("bare SOI/EOI parsed as %d, want 0", got)
	}
	if got := jpegEXIFOrientation([]byte{0x12, 0x34}); got != 0 {
		t.Fatalf("non-JPEG parsed as %d, want 0", got)
	}
	// TIFF صغير مباشرة: II وMM
	ii := []byte{'I', 'I', 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00,
		0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0, 0, 0, 0}
	if got := tiffIFDOrientation(ii); got != 6 {
		t.Fatalf("II orientation = %d, want 6", got)
	}
	mm := []byte{'M', 'M', 0x00, 0x2A, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01,
		0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}
	if got := tiffIFDOrientation(mm); got != 6 {
		t.Fatalf("MM orientation = %d, want 6", got)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 🛑 دفعة الأداء C4 — إلغاء مهمة الطباعة: سجل المهام + سياق واعٍ يجعل الإلغاء
// يوقف العمل فعلياً (انتظار الطابور، بداية عنصر، حد الدفعة، قبل الحفظ) ويرجع
// خطأً صريحاً، مع مسح المهمة من السجل في كل المخارج.
// ─────────────────────────────────────────────────────────────────────────────

// waitForNewPrintJob ينتظر ظهور مهمة جديدة في السجل ويعيد معرّفها.
func waitForNewPrintJob(t *testing.T, known map[string]bool) string {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		activePrintJobs.mu.Lock()
		for id := range activePrintJobs.jobs {
			if !known[id] {
				activePrintJobs.mu.Unlock()
				return id
			}
		}
		activePrintJobs.mu.Unlock()
		time.Sleep(2 * time.Millisecond)
	}
	t.Fatal("no print job registered within 3s")
	return ""
}

// snapshotPrintJobs يلتقط معرّفات المهام الحالية (عزل عن أي اختبار سابق).
func snapshotPrintJobs() map[string]bool {
	activePrintJobs.mu.Lock()
	defer activePrintJobs.mu.Unlock()
	out := make(map[string]bool, len(activePrintJobs.jobs))
	for id := range activePrintJobs.jobs {
		out[id] = true
	}
	return out
}

func TestPrintJobCancel_WhileWaitingOnSemaphore(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{PaperWidthMM: 50, PaperHeightMM: 50, DPI: 100, ExportFormat: "png"}

	known := snapshotPrintJobs()

	// احتلال الـsemaphore: المهمة الجديدة تتعطل في الطابور حتماً.
	printJobSem <- struct{}{}
	release := false
	defer func() {
		if !release {
			<-printJobSem
		}
	}()

	done := make(chan error, 1)
	go func() {
		_, _, err := svc.GeneratePrintSheet(req)
		done <- err
	}()

	jobID := waitForNewPrintJob(t, known)
	if err := CancelPrintJob(jobID); err != nil {
		t.Fatalf("CancelPrintJob: %v", err)
	}

	select {
	case err := <-done:
		if err == nil || !strings.Contains(err.Error(), "cancelled") {
			t.Fatalf("waiting job must fail with cancelled error, got: %v", err)
		}
	case <-time.After(10 * time.Second):
		t.Fatal("cancelled job did not return within 10s")
	}

	// حرر الـsemaphore (المهمة الملغاة لم تكتسبه) وتأكد من مسح السجل.
	<-printJobSem
	release = true
	activePrintJobs.mu.Lock()
	_, still := activePrintJobs.jobs[jobID]
	activePrintJobs.mu.Unlock()
	if still {
		t.Fatal("cancelled job must be removed from the registry")
	}
}

func TestPrintJobCancel_StopsMidGeneration(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tmp)

	svc := NewPrintService()

	// مصدر 16MP حقيقي (لون صلب) + هدف 9.4MP: وزن كل عنصر ≈ 100MB ⇒ ميزانية
	// الدفعة تعطي حجم دفعة صغيراً والتوليد يستغرق مئات المللي ثانية —
	// يكفي لوصول الإلغاء في منتصف العمل (يُستقبل عادة خلال ~10ms).
	src := imaging.New(4000, 4000, color.NRGBA{R: 60, G: 120, B: 200, A: 255})
	var pngBuf bytes.Buffer
	if err := png.Encode(&pngBuf, src); err != nil {
		t.Fatal(err)
	}
	dataURL := "data:image/png;base64," + base64.StdEncoding.EncodeToString(pngBuf.Bytes())

	items := make([]domain.PrintItem, 2)
	for i := range items {
		items[i] = domain.PrintItem{ImageSrc: dataURL, X: 0, Y: 0, W: 240, H: 280}
	}
	req := domain.PrintRequest{
		PaperWidthMM: 240, PaperHeightMM: 280, DPI: 300,
		ExportFormat: "png", Items: items,
	}

	known := snapshotPrintJobs()

	done := make(chan error, 1)
	go func() {
		_, _, err := svc.GeneratePrintSheet(req) // مسار الإنتاج الحقيقي بلا سياق خارجي
		done <- err
	}()

	jobID := waitForNewPrintJob(t, known)
	if err := CancelPrintJob(jobID); err != nil {
		t.Fatalf("CancelPrintJob: %v", err)
	}

	select {
	case err := <-done:
		if err == nil || !strings.Contains(err.Error(), "cancelled") {
			t.Fatalf("mid-generation cancel must yield a cancelled error, got: %v", err)
		}
	case <-time.After(60 * time.Second):
		t.Fatal("cancelled generation did not return within 60s")
	}

	activePrintJobs.mu.Lock()
	_, still := activePrintJobs.jobs[jobID]
	activePrintJobs.mu.Unlock()
	if still {
		t.Fatal("cancelled job must be removed from the registry")
	}

	// معرّف غير موجود = خطأ صريح.
	if err := CancelPrintJob(jobID); err == nil {
		t.Fatal("cancelling a finished/unknown job must return an explicit error")
	}
	if err := CancelPrintJob(""); err == nil {
		t.Fatal("cancelling an empty id must return an explicit error")
	}
}
