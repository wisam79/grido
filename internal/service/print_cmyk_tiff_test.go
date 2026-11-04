package service

import (
	"bytes"
	"compress/zlib"
	"encoding/binary"
	"encoding/hex"
	"fmt"
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

// ─────────────────────────────────────────────────────────────────────────────
// 🧮 الحاضنات الذهبية bit-identical (دفعة الأداء — الطباعة):
// البايتات أدناه مأخوذة حرفياً من مخرجات المسار القديم (بناء bytes.Buffer ثم
// حقن injectTIFFResolution كنسخة ثانية) قبل إعادة كتابة المشفّر ببث متدفق.
// أي تغيير بايت واحد لاحقاً = انحدار حقيقي يوقف الاختبار — لا خفض دقة ولا
// تغيير قنوات بصمت.
// ─────────────────────────────────────────────────────────────────────────────

// goldenCMYKSource يبني صورة CMYK اصطناعية 3×2 ببكسلات مميزة (نفس المدخل الذي
// وُلّدت منه البايتات الذهبية أدناه — لا يُغيَّر أبداً).
func goldenCMYKSource() *image.CMYK {
	src := image.NewCMYK(image.Rect(0, 0, 3, 2))
	src.SetCMYK(0, 0, color.CMYK{C: 10, M: 20, Y: 30, K: 40})
	src.SetCMYK(1, 0, color.CMYK{C: 200, M: 100, Y: 50, K: 255})
	src.SetCMYK(2, 1, color.CMYK{C: 255, M: 255, Y: 0, K: 10})
	return src
}

// goldenCMYKTIFFHex مخرج encodeCMYKTIFF(src, 300) القديم حرفياً (233 بايت):
// رأس II/42 + شريط zlib + BitsPerSample + IFD0 (14 إدخالاً بينها 282/283/296)
// + ذيل النسب (300/1)×2.
const goldenCMYKTIFFHex = "49492a002b000000789ce21291d3389162f49f0109fcffcfc005080000ffff3b3204ca08000800080008000e0000010400010000000300000001010400010000000200000002010300040000002300000003010300010000000800000006010300010000000500000011010400010000000800000015010300010000000400000016010400010000000200000017010400010000001b0000001a01050001000000d90000001b01050001000000e10000001c01030001000000010000002801030001000000020000004c0103000100000001000000000000002c010000010000002c01000001000000"

func TestEncodeCMYKTIFF_GoldenBytes(t *testing.T) {
	want, err := hex.DecodeString(goldenCMYKTIFFHex)
	if err != nil {
		t.Fatalf("decode golden: %v", err)
	}
	got, err := encodeCMYKTIFF(goldenCMYKSource(), 300)
	if err != nil {
		t.Fatalf("encodeCMYKTIFF: %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("encodeCMYKTIFF output diverged from golden: got %d bytes, want %d (bit-identical contract broken)", len(got), len(want))
	}
}

// TestEncodeCMYKTIFFToWriter_GoldenBytes: المسار المتدفق ينتج البايتات الذهبية
// نفسها — على مخزن قابل للبحث وعلى ملف قرص حقيقي (os.File يلزم لترقيع الترويسة).
func TestEncodeCMYKTIFFToWriter_GoldenBytes(t *testing.T) {
	want, err := hex.DecodeString(goldenCMYKTIFFHex)
	if err != nil {
		t.Fatalf("decode golden: %v", err)
	}
	src := goldenCMYKSource()

	var buf writeSeekBuffer
	if err := encodeCMYKTIFFToWriter(src, 300, &buf); err != nil {
		t.Fatalf("encodeCMYKTIFFToWriter(buffer): %v", err)
	}
	if !bytes.Equal(buf.b, want) {
		t.Fatalf("streamed buffer output diverged from golden: got %d bytes, want %d", len(buf.b), len(want))
	}

	path := filepath.Join(t.TempDir(), "cmyk_golden.tif")
	f, ferr := os.Create(path)
	if ferr != nil {
		t.Fatalf("create temp file: %v", ferr)
	}
	if werr := encodeCMYKTIFFToWriter(src, 300, f); werr != nil {
		_ = f.Close()
		t.Fatalf("encodeCMYKTIFFToWriter(file): %v", werr)
	}
	// إغلاق صريح (قاعدة ويندوز) قبل القراءة.
	if cerr := f.Close(); cerr != nil {
		t.Fatalf("close temp file: %v", cerr)
	}
	diskBytes, rerr := os.ReadFile(path)
	if rerr != nil {
		t.Fatalf("read streamed file: %v", rerr)
	}
	if !bytes.Equal(diskBytes, want) {
		t.Fatalf("streamed file output diverged from golden: got %d bytes, want %d", len(diskBytes), len(want))
	}
}

// TestEncodeCMYKTIFFToWriter_RejectsNonSeekingWriter: كاتب بلا Seeker يُرفض
// صراحةً بدل ملف تالف بإزاحة IFD صفرية.
func TestEncodeCMYKTIFFToWriter_RejectsNonSeekingWriter(t *testing.T) {
	var sink bytes.Buffer
	if err := encodeCMYKTIFFToWriter(goldenCMYKSource(), 300, &sink); err == nil {
		t.Fatal("non-seeking writer must fail explicitly")
	}
}

// TestEncodeCMYKTIFF_StreamedMatchesLegacyInjection: مطابقة مزدوجة — المخرج
// المتدفق يجب أن يطابق إعادة بناء المسار القديم (بناء ثم injectTIFFResolution)
// على مدخلات متعددة، لا على الحاضنة الذهبية وحدها.
func TestEncodeCMYKTIFF_StreamedMatchesLegacyInjection(t *testing.T) {
	for _, tc := range []struct {
		name string
		w, h int
		dpi  int
	}{
		{name: "3x2-300", w: 3, h: 2, dpi: 300},
		{name: "1x1-150", w: 1, h: 1, dpi: 150},
		{name: "17x9-600", w: 17, h: 9, dpi: 600},
	} {
		t.Run(tc.name, func(t *testing.T) {
			src := image.NewCMYK(image.Rect(0, 0, tc.w, tc.h))
			for y := 0; y < tc.h; y++ {
				for x := 0; x < tc.w; x++ {
					src.SetCMYK(x, y, color.CMYK{C: uint8(x * 17), M: uint8(y * 23), Y: uint8(x*y*7 + 1), K: uint8((x + y) * 11)})
				}
			}
			legacy, lerr := encodeCMYKTIFFLegacyInjectReference(t, src, tc.dpi)
			if lerr != nil {
				t.Fatalf("legacy reference: %v", lerr)
			}
			got, gerr := encodeCMYKTIFF(src, tc.dpi)
			if gerr != nil {
				t.Fatalf("encodeCMYKTIFF: %v", gerr)
			}
			if !bytes.Equal(got, legacy) {
				t.Fatalf("streamed output != legacy build+inject reference (%d vs %d bytes)", len(got), len(legacy))
			}
		})
	}
}

// encodeCMYKTIFFLegacyInjectReference يعيد بناء المسار القديم حرفياً (مرجع
// اختبار فقط): بناء TIFF أساس بلا وسوم دقة ثم حقن النسب بنسخة ثانية.
func encodeCMYKTIFFLegacyInjectReference(t *testing.T, img *image.CMYK, dpi int) ([]byte, error) {
	t.Helper()
	if img == nil {
		return nil, fmt.Errorf("cmyk tiff: nil image")
	}
	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	if w <= 0 || h <= 0 {
		return nil, fmt.Errorf("cmyk tiff: invalid dimensions %dx%d", w, h)
	}
	var out bytes.Buffer
	out.Grow(8 + w*h*4/2)
	out.Write([]byte{'I', 'I', 0x2A, 0x00, 0, 0, 0, 0})
	stripOffset := uint32(out.Len())
	zw := zlib.NewWriter(&out)
	row := make([]byte, w*4)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		off := img.PixOffset(bounds.Min.X, y)
		copy(row, img.Pix[off:off+w*4])
		if _, err := zw.Write(row); err != nil {
			return nil, err
		}
	}
	if err := zw.Close(); err != nil {
		return nil, err
	}
	stripLen := out.Len() - int(stripOffset)
	bitsOffset := uint32(out.Len())
	out.Write([]byte{8, 0, 8, 0, 8, 0, 8, 0})
	ifdOffset := uint32(out.Len())
	binary.LittleEndian.PutUint32(out.Bytes()[4:8], ifdOffset)
	entries := []struct {
		tag, typ uint16
		count    uint32
		value    uint32
	}{
		{tiffTagImageWidth, tiffTypeLong, 1, uint32(w)},
		{tiffTagImageLength, tiffTypeLong, 1, uint32(h)},
		{tiffTagBitsPerSample, tiffTypeShort, 4, bitsOffset},
		{tiffTagCompression, tiffTypeShort, 1, tiffCompressionDeflate},
		{tiffTagPhotometricInt, tiffTypeShort, 1, tiffPhotometricSeparated},
		{tiffTagStripOffsets, tiffTypeLong, 1, stripOffset},
		{tiffTagSamplesPerPix, tiffTypeShort, 1, 4},
		{tiffTagRowsPerStrip, tiffTypeLong, 1, uint32(h)},
		{tiffTagStripByteCount, tiffTypeLong, 1, uint32(stripLen)},
		{tiffTagPlanarConfig, tiffTypeShort, 1, tiffPlanarChunky},
		{tiffTagInkSet, tiffTypeShort, 1, tiffInkSetCMYK},
	}
	var countBuf [2]byte
	binary.LittleEndian.PutUint16(countBuf[:], uint16(len(entries)))
	out.Write(countBuf[:])
	var entryBuf [12]byte
	for _, e := range entries {
		binary.LittleEndian.PutUint16(entryBuf[0:2], e.tag)
		binary.LittleEndian.PutUint16(entryBuf[2:4], e.typ)
		binary.LittleEndian.PutUint32(entryBuf[4:8], e.count)
		binary.LittleEndian.PutUint32(entryBuf[8:12], e.value)
		out.Write(entryBuf[:])
	}
	out.Write([]byte{0, 0, 0, 0})
	return injectTIFFResolution(out.Bytes(), dpi)
}

// TestInjectTIFFResolution_GoldenBytes: قفل بايتات مسار الحقن نفسه (يبقى معنا
// لمسارات TIFF الأخرى) — قاعدة TIFF أصغرية مبنية يدوياً + مخرج الحقن القديم حرفياً.
func TestInjectTIFFResolution_GoldenBytes(t *testing.T) {
	base := []byte{}
	base = append(base, 'I', 'I', 0x2A, 0x00)
	base = append(base, 0x08, 0x00, 0x00, 0x00) // ifdOffset=8
	base = append(base, 0x02, 0x00)             // count=2
	// 256: LONG 1 = 3
	base = append(base, 0x00, 0x01, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00)
	// 273: LONG 1 = 100 (إزاحة خارجية بعد الـIFD تُزاح بنمو الـIFD)
	base = append(base, 0x11, 0x01, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00)
	base = append(base, 0x00, 0x00, 0x00, 0x00) // next=0
	base = append(base, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0x11, 0x22, 0x33, 0x44, 0x55)
	base = append(base, 0x66, 0x77, 0x88, 0x99, 0x00, 0xFF, 0xEE, 0xDD, 0xCC, 0xBB)

	wantOut, err := hex.DecodeString("49492a000800000005000001040001000000030000001101040001000000640000001a010500010000005e0000001b010500010000006600000028010300010000000200000000000000aabbccddee11223344556677889900ffeeddccbb2c010000010000002c01000001000000")
	if err != nil {
		t.Fatalf("decode golden: %v", err)
	}
	got, err := injectTIFFResolution(base, 300)
	if err != nil {
		t.Fatalf("injectTIFFResolution: %v", err)
	}
	if !bytes.Equal(got, wantOut) {
		t.Fatalf("injectTIFFResolution output diverged from golden: got %d bytes, want %d", len(got), len(wantOut))
	}
}
