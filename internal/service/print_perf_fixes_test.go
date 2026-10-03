package service

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"math"
	"math/rand"
	"os"
	"path/filepath"
	"testing"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"
	"golang.org/x/image/tiff"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// اختبارات إصلاحات الأداء:
//   1. الدمج المركّب للسطوع/التباين يطابق تسلسل imaging الأصلي ±2
//   2. الكتابة المتدفقة تحقن JFIF/pHYs وتنتج ملفات صالحة مكافئة للطريقة القديمة
//   3. استنساخ الشبكة على جانب Go يطابق التكرار اليدوي
//   4. Benchmarks دائمة لمراحل المعالجة والترميز لتتبع الانحدار
// ─────────────────────────────────────────────────────────────────────────────

func randomTestImage(t *testing.T, w, h int) *image.NRGBA {
	t.Helper()
	rng := rand.New(rand.NewSource(42))
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for i := range img.Pix {
		img.Pix[i] = uint8(rng.Intn(256))
	}
	return img
}

// newTestContext كانفس gg ممتلئ بمحتوى غير بسيط (رسم عشوائي) — كانفس فارغ
// شفاف يضغط إلى كيلوبايتات فلا يمثل الأداء الحقيقي
func newTestContext(t *testing.T, w, h int) *gg.Context {
	t.Helper()
	dc := gg.NewContext(w, h)
	dc.SetColor(color.White)
	dc.Clear()
	rng := rand.New(rand.NewSource(7))
	for i := 0; i < 200; i++ {
		dc.SetColor(color.RGBA{
			R: uint8(rng.Intn(256)), G: uint8(rng.Intn(256)),
			B: uint8(rng.Intn(256)), A: 255,
		})
		x := float64(rng.Intn(w))
		y := float64(rng.Intn(h))
		dc.DrawCircle(x, y, 5+float64(rng.Intn(30)))
		dc.Fill()
	}
	return dc
}

// 1️⃣ دمج الفلاتر: مطابقة بكسل-بكسل ضمن تسامح ±2 مع التسلسل الأصلي
func TestMergedBrightnessContrast_MatchesSequenced(t *testing.T) {
	src := randomTestImage(t, 64, 64)

	cases := [][2]float64{
		{110, 100}, {100, 120}, {90, 80}, {130, 115}, {80, 130},
		{120, -0}, {100, 100}, // بلا تعديل
	}
	for _, c := range cases {
		brightness, contrast := c[0], c[1]

		// التسلسل المرجعي (طريقة imaging القديمة)
		ref := imaging.AdjustBrightness(src, brightness-100)
		ref = imaging.AdjustContrast(ref, contrast-100)

		// الدمج الجديد
		got := applyColorAdjustments(src, brightness, contrast, 100)

		refN := ref.Bounds()
		for y := 0; y < refN.Dy(); y++ {
			for x := 0; x < refN.Dx(); x++ {
				r1, g1, b1, _ := ref.At(x, y).RGBA()
				r2, g2, b2, _ := got.At(x, y).RGBA()
				dr := int(r1>>8) - int(r2>>8)
				dg := int(g1>>8) - int(g2>>8)
				db := int(b1>>8) - int(b2>>8)
				if dr < -2 || dr > 2 || dg < -2 || dg > 2 || db < -2 || db > 2 {
					t.Fatalf("brightness=%.0f contrast=%.0f pixel(%d,%d): ref=(%d,%d,%d) got=(%d,%d,%d) exceeds ±2",
						brightness, contrast, x, y, r1>>8, g1>>8, b1>>8, r2>>8, g2>>8, b2>>8)
				}
			}
		}
	}
}

// بلا تعديلات: الدالة تعيد الصورة الأصلية دون نسخ (اختبار الهوية)
func TestApplyColorAdjustments_NoOpIdentity(t *testing.T) {
	src := randomTestImage(t, 32, 32)
	got := applyColorAdjustments(src, 100, 100, 100)
	if got != image.Image(src) {
		t.Fatal("no-op adjustments must return the original image without copying")
	}
}

// 2️⃣ الكاتب المتدفق JPEG: حقن JFIF صحيح بعد SOI
func TestDPIJPEGWriter_InjectsJFIF(t *testing.T) {
	src := randomTestImage(t, 80, 60)
	var buf bytes.Buffer
	if err := jpeg.Encode(&dpiJPEGWriter{w: &buf, dpi: 300}, src, &jpeg.Options{Quality: 95}); err != nil {
		t.Fatal(err)
	}

	restStart, err := jpegDPIRestStart(buf.Bytes())
	if err != nil {
		t.Fatalf("output is not valid JPEG with injectable JFIF position: %v", err)
	}
	// SOI (2) + قطعة APP0 (18 بايت إجمالاً: marker 2 + length 16) ← البقية عند 18
	if restStart != 2+16 {
		t.Fatalf("expected JFIF APP0 injected (rest at %d), got rest at %d", 2+16, restStart)
	}
}

// 3️⃣ الكاتب المتدفق PNG: pHYs محقونة بعد IHDR
func TestDPINGWriter_InjectsPHYS(t *testing.T) {
	src := randomTestImage(t, 40, 40)
	var buf bytes.Buffer
	enc := png.Encoder{CompressionLevel: png.BestSpeed}
	if err := enc.Encode(&dpiPNGWriter{w: &buf, dpi: 600}, src); err != nil {
		t.Fatal(err)
	}
	if _, _, err := pngDPIInsertPos(buf.Bytes()); err != nil {
		t.Fatalf("output is not valid PNG: %v", err)
	}
	// البحث عن قطعة pHYs
	data := buf.Bytes()
	for pos := 8; pos+8 <= len(data); {
		chunkLen := int(uint32(data[pos])<<24 | uint32(data[pos+1])<<16 | uint32(data[pos+2])<<8 | uint32(data[pos+3]))
		chunkType := string(data[pos+4 : pos+8])
		if chunkType == "pHYs" {
			ppm := uint32(data[pos+8])<<24 | uint32(data[pos+9])<<16 | uint32(data[pos+10])<<8 | uint32(data[pos+11])
			expected := uint32(math.Round(600.0 / 0.0254))
			if diff := int(ppm) - int(expected); diff < -2 || diff > 2 {
				t.Fatalf("pHYs ppm=%d, expected ~%d", ppm, expected)
			}
			return
		}
		pos += 4 + 4 + chunkLen + 4
	}
	t.Fatal("pHYs chunk not found in streamed PNG")
}

// 4️⃣ استنساخ الشبكة يطابق التكرار اليدوي (نفس منطق الكولاج السابق في الواجهة)
func TestExpandGridItems_MatchesManualDuplication(t *testing.T) {
	tpl := domain.PrintItem{
		ImageSrc: "/local-image/test.jpg", X: 10, Y: 5, W: 60, H: 40,
		Brightness: 120, Filter: "grayscale",
		Copies: 6, CopyCols: 3, CopyStepX: 62, CopyStepY: 42,
	}
	others := domain.PrintItem{ImageSrc: "/local-image/other.jpg", X: 1, Y: 2, W: 30, H: 20}

	expanded := expandGridItems([]domain.PrintItem{tpl, others})
	if expanded == nil {
		t.Fatal("expected expansion, got nil")
	}
	if len(expanded) != 6+1 {
		t.Fatalf("expected 7 items, got %d", len(expanded))
	}

	for c := 0; c < 6; c++ {
		got := expanded[c]
		wantX := 10 + float64(c%3)*62
		wantY := 5 + float64(c/3)*42
		if got.X != wantX || got.Y != wantY {
			t.Fatalf("copy %d: pos=(%.1f,%.1f), want=(%.1f,%.1f)", c, got.X, got.Y, wantX, wantY)
		}
		if got.Copies != 0 || got.CopyCols != 0 {
			t.Fatalf("copy %d: grid metadata not cleared", c)
		}
		if got.ImageSrc != tpl.ImageSrc || got.Brightness != tpl.Brightness || got.Filter != tpl.Filter {
			t.Fatalf("copy %d: template fields not preserved", c)
		}
	}
	if expanded[6] != others {
		t.Fatal("non-grid item must pass through unchanged")
	}

	// بلا قوالب شبكية: nil (مسار عادي بلا تخصيص)
	if expandGridItems([]domain.PrintItem{others}) != nil {
		t.Fatal("no grid templates must return nil")
	}
}

// 5️⃣ end-to-end: ورقة كاملة عبر المسار المتدفق — ملف صالح بمقاس فيزيائي
func TestSaveOutputStreamed_ProducesValidFiles(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tmp)

	svc := NewPrintService()
	dc := newTestContext(t, 200, 150)

	req := domain.PrintRequest{
		PaperWidthMM: 50, PaperHeightMM: 40, DPI: 300,
		ColorSpace: "sRGB", ExportFormat: "jpeg",
	}

	imgPath, htmlDoc, err := svc.saveOutput(dc, req)
	if err != nil {
		t.Fatalf("saveOutput failed: %v", err)
	}
	if imgPath == "" || htmlDoc == "" {
		t.Fatal("expected image path and html doc")
	}
	data, err := os.ReadFile(imgPath)
	if err != nil {
		t.Fatal(err)
	}
	if len(data) < 2 || data[0] != 0xFF || data[1] != 0xD8 {
		t.Fatal("output is not a JPEG")
	}
	// التحقق من JFIF: restStart = 2 + 16 (APP0 بطول 16 بايت محسوبة من حقل الطول)
	restStart, err := jpegDPIRestStart(data)
	if err != nil || restStart != 2+16 {
		t.Fatalf("JFIF not injected: restStart=%d err=%v", restStart, err)
	}
}

// 6️⃣ مسار CMYK: معاينة PNG مصغرة بدل كامل الحجم
func TestSaveOutputCMYK_SmallPreview(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tmp)

	svc := NewPrintService()
	// كانفس 2400px عرضاً (> حد 1200 للمعاينة)
	dc := newTestContext(t, 2400, 1200)

	req := domain.PrintRequest{
		PaperWidthMM: 200, PaperHeightMM: 100, DPI: 300,
		ColorSpace: "CMYK", ExportFormat: "jpeg",
	}

	_, _, err := svc.saveOutput(dc, req)
	if err != nil {
		t.Fatalf("saveOutput CMYK failed: %v", err)
	}

	// المعاينة موجودة وأبعادها ≤ 1200 عرضاً
	entries, _ := os.ReadDir(filepath.Join(tmp, "Exports"))
	foundPreview := false
	for _, e := range entries {
		if filepath.Ext(e.Name()) == ".png" {
			foundPreview = true
			f, err := os.Open(filepath.Join(tmp, "Exports", e.Name()))
			if err != nil {
				t.Fatal(err)
			}
			cfg, _, err := image.DecodeConfig(f)
			f.Close()
			if err != nil {
				t.Fatalf("preview not decodable: %v", err)
			}
			if cfg.Width > 1200 {
				t.Fatalf("preview too wide: %d (max 1200)", cfg.Width)
			}
		}
	}
	if !foundPreview {
		t.Fatal("no preview PNG generated")
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Benchmarks دائمة — أساس الانحدار (pkg: go test -bench=PrintPipeline -benchmem)
// ─────────────────────────────────────────────────────────────────────────────

func benchImage(w, h int) *image.NRGBA {
	rng := rand.New(rand.NewSource(1))
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for i := range img.Pix {
		img.Pix[i] = uint8(rng.Intn(256))
	}
	return img
}

// BenchmarkPrintPipelineProcessing: معالجة لونية كاملة (دمج + تشبع)
func BenchmarkPrintPipelineProcessing(b *testing.B) {
	src := benchImage(1200, 900)
	item := domain.PrintItem{Brightness: 115, Contrast: 110, Saturation: 105}
	b.SetBytes(int64(1200 * 900 * 4))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = applyImageProcessing(src, item, 1200, 900)
	}
}

// BenchmarkPrintPipelineEncodeJPEG: ترميز A4@300DPI مكافئ (2480×3508) متدفق
func BenchmarkPrintPipelineEncodeJPEG(b *testing.B) {
	src := benchImage(2480, 3508)
	var sink bytes.Buffer
	b.SetBytes(int64(2480 * 3508 * 4))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sink.Reset()
		if err := jpeg.Encode(&dpiJPEGWriter{w: &sink, dpi: 300}, src, &jpeg.Options{Quality: 95}); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkPrintPipelineEncodeTIFF: مسار CMYK الافتراضي
func BenchmarkPrintPipelineEncodeTIFF(b *testing.B) {
	src := benchImage(1000, 700)
	var sink bytes.Buffer
	b.SetBytes(int64(1000 * 700 * 4))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sink.Reset()
		if err := tiff.Encode(&sink, src, &tiff.Options{Compression: tiff.Deflate, Predictor: true}); err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkPrintPipelineExpandGrid: توسيع شبكة كبيرة (24 قالب × 24 نسخة = 576)
func BenchmarkPrintPipelineExpandGrid(b *testing.B) {
	tpl := domain.PrintItem{X: 1, Y: 2, W: 60, H: 40, Copies: 24, CopyCols: 12, CopyStepX: 62, CopyStepY: 42}
	items := make([]domain.PrintItem, 24)
	for i := range items {
		items[i] = tpl
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = expandGridItems(items)
	}
}

