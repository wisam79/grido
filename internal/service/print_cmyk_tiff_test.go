package service

import (
	"bytes"
	"compress/zlib"
	"image"
	"image/color"
	"io"
	"os"
	"path/filepath"
	"testing"

	"grido/internal/core/domain"
)

// writeTempFile يكتب بايتات في ملف مؤقت داخل مجلد الاختبار ويعيد مساره.
func writeTempFile(t *testing.T, data []byte, name string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatalf("write temp file: %v", err)
	}
	return path
}

// ─────────────────────────────────────────────────────────────────────────────
// print_cmyk_tiff_test.go — TIFF بفصل أحبار CMYK حقيقي (photometric=5)
//
// يقفل الانحدار المكتشف أثناء وصل حوار التصدير بمسار CMYK: تمرير *image.CMYK
// إلى x/image/tiff كان يكتب RGB محوّلاً (photometric=2) مع قناة ألفا، فيضيع
// فصل الأحبار تماماً بينما يُسمّى الملف «CMYK TIFF». الاختبارات هنا تقرأ بنية
// الملف فعلياً (وسوم + شريط مضغوط) لا نوع الصورة المُعاد من مفكّك عام.
// ─────────────────────────────────────────────────────────────────────────────

// cmykFromTIFFFile يقرأ TIFF بفصل أحبار ويعيد الصورة بقيم CMYK كما كتبها
// المشفّر حرفياً — x/image/tiff لا يفكّ photometric=5 (UnsupportedError)،
// فيُقرأ الشريط هنا مباشرةً كمرجع تحقق مستقل عن كود الإنتاج.
func cmykFromTIFFFile(t *testing.T, path string) *image.CMYK {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read cmyk tiff: %v", err)
	}
	singles, _, _ := parseTIFFFirstIFD(t, data)

	// القيم 5/4/1/1 مكتوبة حرفياً عمداً (نصّ مواصفة TIFF 6.0) ولا تُقارن بثوابت
	// المشفّر في `print_cmyk_tiff.go` — وإلا صار التأكيد دائرياً (فحص الطفرة أثبت
	// أن مقارنة `tiffPhotometricSeparated` بالثابت نفسه لا تكشف تحويل 5 إلى 2).
	if got := singles[tiffTagPhotometricInt]; got != 5 {
		t.Fatalf("PhotometricInterpretation = %d, want 5 (Separated/CMYK)", got)
	}
	if got := singles[tiffTagSamplesPerPix]; got != 4 {
		t.Errorf("SamplesPerPixel = %d, want 4", got)
	}
	if got := singles[tiffTagPlanarConfig]; got != 1 {
		t.Errorf("PlanarConfiguration = %d, want 1 (chunky)", got)
	}
	if got := singles[tiffTagInkSet]; got != 1 {
		t.Errorf("InkSet = %d, want 1 (CMYK)", got)
	}
	if _, has := singles[tiffTagExtraSamplesTag]; has {
		t.Errorf("ExtraSamples must be absent for separated CMYK")
	}

	w, h := int(singles[tiffTagImageWidth]), int(singles[tiffTagImageLength])
	off, size := int(singles[tiffTagStripOffsets]), int(singles[tiffTagStripByteCount])
	if off <= 0 || size <= 0 || off+size > len(data) {
		t.Fatalf("invalid strip range off=%d size=%d file=%d", off, size, len(data))
	}

	var raw []byte
	if singles[tiffTagCompression] == tiffCompressionDeflate {
		zr, zerr := zlib.NewReader(bytes.NewReader(data[off : off+size]))
		if zerr != nil {
			t.Fatalf("inflate strip: %v", zerr)
		}
		defer zr.Close()
		raw, err = io.ReadAll(zr)
		if err != nil {
			t.Fatalf("read strip: %v", err)
		}
	} else {
		raw = data[off : off+size]
	}
	if len(raw) != w*h*4 {
		t.Fatalf("strip holds %d bytes, want %d (%dx%d×4)", len(raw), w*h*4, w, h)
	}

	img := image.NewCMYK(image.Rect(0, 0, w, h))
	copy(img.Pix, raw)
	return img
}

func TestEncodeCMYKTIFF_RoundTripsChannels(t *testing.T) {
	src := image.NewCMYK(image.Rect(0, 0, 4, 3))
	// قيمة مميزة تُفقد تماماً لو مرّت عبر تحويل RGB (الانحدار القديم).
	src.SetCMYK(2, 1, color.CMYK{C: 10, M: 20, Y: 30, K: 40})

	data, err := encodeCMYKTIFF(src, 300)
	if err != nil {
		t.Fatalf("encodeCMYKTIFF: %v", err)
	}

	singles, rationals, order := parseTIFFFirstIFD(t, data)
	if order != "II" {
		t.Errorf("byte order = %s, want II", order)
	}
	if got := int(singles[tiffTagImageWidth]); got != 4 {
		t.Errorf("width = %d, want 4", got)
	}
	if got := int(singles[tiffTagImageLength]); got != 3 {
		t.Errorf("height = %d, want 3", got)
	}
	if got := rationals[tiffTagXResolution]; got != [2]uint32{300, 1} {
		t.Errorf("XResolution = %v, want [300 1]", got)
	}
	if got := rationals[tiffTagYResolution]; got != [2]uint32{300, 1} {
		t.Errorf("YResolution = %v, want [300 1]", got)
	}
	if got := singles[tiffTagResolutionUnit]; got != tiffResolutionUnitInch {
		t.Errorf("ResolutionUnit = %d, want %d", got, tiffResolutionUnitInch)
	}
	if got := singles[tiffTagRowsPerStrip]; got == 0 {
		t.Errorf("RowsPerStrip must not be zero")
	}

	// كتابة الملف ثم قراءته بالمرجع المستقل: القنوات الأربع ثابتة بلا تحويل لوني.
	path := writeTempFile(t, data, "cmyk_roundtrip.tif")
	got := cmykFromTIFFFile(t, path)
	if px := got.CMYKAt(2, 1); px != (color.CMYK{C: 10, M: 20, Y: 30, K: 40}) {
		t.Errorf("pixel(2,1) = %+v, want {C:10 M:20 Y:30 K:40}", px)
	}
	if px := got.CMYKAt(0, 0); px != (color.CMYK{}) {
		t.Errorf("pixel(0,0) = %+v, want zero CMYK", px)
	}
}

func TestEncodeCMYKTIFF_HandlesStridedSubImage(t *testing.T) {
	parent := image.NewCMYK(image.Rect(0, 0, 8, 8))
	parent.SetCMYK(5, 5, color.CMYK{C: 1, M: 2, Y: 3, K: 4})
	sub := parent.SubImage(image.Rect(4, 4, 8, 8)).(*image.CMYK)

	data, err := encodeCMYKTIFF(sub, 150)
	if err != nil {
		t.Fatalf("encodeCMYKTIFF(sub): %v", err)
	}
	path := writeTempFile(t, data, "cmyk_subimage.tif")
	got := cmykFromTIFFFile(t, path)

	if got.Bounds().Dx() != 4 || got.Bounds().Dy() != 4 {
		t.Fatalf("sub-image dims = %dx%d, want 4x4", got.Bounds().Dx(), got.Bounds().Dy())
	}
	// (5,5) في الأصل = (1,1) داخل الصورة الفرعية — يثبت أن Stride مُراعى.
	if px := got.CMYKAt(1, 1); px != (color.CMYK{C: 1, M: 2, Y: 3, K: 4}) {
		t.Errorf("pixel(1,1) = %+v, want {C:1 M:2 Y:3 K:4}", px)
	}
}

func TestEncodeCMYKTIFF_RejectsInvalidInput(t *testing.T) {
	if _, err := encodeCMYKTIFF(nil, 300); err == nil {
		t.Errorf("nil image must fail")
	}
	if _, err := encodeCMYKTIFF(image.NewCMYK(image.Rect(0, 0, 0, 0)), 300); err == nil {
		t.Errorf("zero-size image must fail")
	}
	valid := image.NewCMYK(image.Rect(0, 0, 2, 2))
	if _, err := encodeCMYKTIFF(valid, 0); err == nil {
		t.Errorf("dpi=0 must fail (وسوم الدقة لا تُكتب بقيمة غير صالحة)")
	}
	if _, err := encodeCMYKTIFF(valid, 20000); err == nil {
		t.Errorf("dpi above 9600 must fail")
	}
}

// TestGeneratePrintSheet_CMYKTIFFIsSeparated: نهاية-لنهاية — طلب CMYK TIFF عبر
// خدمة الطباعة يخرج بملف فصل أحبار، لا RGB موسوم خطأً.
func TestGeneratePrintSheet_CMYKTIFFIsSeparated(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    30,
		PaperHeightMM:   30,
		DPI:             150,
		BackgroundColor: "#ffffff",
		ColorSpace:      "cmyk",
		ExportFormat:    "tiff",
	}
	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("GeneratePrintSheet cmyk tiff: %v", err)
	}
	base := outPath[:len(outPath)-len(filepath.Ext(outPath))]
	t.Cleanup(func() {
		os.Remove(outPath)
		os.Remove(base + ".html")
		os.Remove(base + "_preview.png")
		os.Remove(base + "_preview.jpg")
	})

	img := cmykFromTIFFFile(t, outPath)
	expected := int(mmToPx(30, 150))
	if diff := img.Bounds().Dx() - expected; diff < -2 || diff > 2 {
		t.Errorf("width = %d, want ~%d", img.Bounds().Dx(), expected)
	}
}
