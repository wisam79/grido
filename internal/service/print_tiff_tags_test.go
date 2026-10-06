package service

import (
	"bytes"
	"image"
	"image/color"
	"os"
	"path/filepath"
	"strings"
	"testing"

	xximage_tiff "golang.org/x/image/tiff"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_tiff_tags_test.go — حقن وسوم الدقة X/YResolution + ResolutionUnit
// (RV-Print-04): TIFF المطابع بلا وسوم كان يُفترض 72dpi.
// ─────────────────────────────────────────────────────────────────────────────

// parseTIFFFirstIFD يفك IFD0 ويعيد (tag → قيمة uint32 للـ SHORT/LONG المفردة،
// tag → [num,den] للـ RATIONAL المفردة). مستقل عن كود الإنتاج (مرجع تحقق).
func parseTIFFFirstIFD(t *testing.T, data []byte) (singles map[uint16]uint32, rationals map[uint16][2]uint32, orderStr string) {
	t.Helper()
	if len(data) < 8 {
		t.Fatalf("tiff too short: %d", len(data))
	}
	getOrder := func() (isLE bool) {
		switch string(data[:2]) {
		case "II":
			return true
		case "MM":
			return false
		default:
			t.Fatalf("bad byte order %.2q", data[:2])
			return false
		}
	}
	isLE := getOrder()
	u16 := func(b []byte) uint16 {
		if isLE {
			return uint16(b[0]) | uint16(b[1])<<8
		}
		return uint16(b[0])<<8 | uint16(b[1])
	}
	u32 := func(b []byte) uint32 {
		if isLE {
			return uint32(b[0]) | uint32(b[1])<<8 | uint32(b[2])<<16 | uint32(b[3])<<24
		}
		return uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	}
	if isLE {
		orderStr = "II"
	} else {
		orderStr = "MM"
	}
	ifdOff := u32(data[4:8])
	count := int(u16(data[ifdOff : ifdOff+2]))
	singles = map[uint16]uint32{}
	rationals = map[uint16][2]uint32{}
	var prevTag uint16
	for i := 0; i < count; i++ {
		off := ifdOff + 2 + uint32(i)*12
		tag, typ, cnt, val := u16(data[off:off+2]), u16(data[off+2:off+4]), u32(data[off+4:off+8]), u32(data[off+8:off+12])
		if i > 0 && tag < prevTag {
			t.Errorf("IFD entries not sorted: tag %d after %d", tag, prevTag)
		}
		if _, dup := singles[tag]; dup {
			t.Errorf("duplicate tag %d in IFD", tag)
		}
		prevTag = tag
		switch {
		case typ == 3 && cnt == 1:
			// SHORT مضمّنة في أول بايتين حسب الترتيب.
			if isLE {
				singles[tag] = val & 0xFFFF
			} else {
				singles[tag] = val >> 16
			}
		case typ == 4 && cnt == 1:
			singles[tag] = val
		case typ == 5 && cnt == 1:
			if int(val)+8 > len(data) {
				t.Fatalf("rational tag %d offset %d out of range", tag, val)
			}
			rationals[tag] = [2]uint32{u32(data[val : val+4]), u32(data[val+4 : val+8])}
		}
	}
	return singles, rationals, orderStr
}

func encodeTinyTIFF(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 16, 12))
	for y := 0; y < 12; y++ {
		for x := 0; x < 16; x++ {
			img.Set(x, y, color.RGBA{R: uint8(x * 16), G: uint8(y * 20), B: 128, A: 255})
		}
	}
	var buf bytes.Buffer
	if err := xximage_tiff.Encode(&buf, img, &xximage_tiff.Options{Compression: xximage_tiff.Deflate, Predictor: true}); err != nil {
		t.Fatalf("encode tiny tiff: %v", err)
	}
	return buf.Bytes()
}

func TestInjectTIFFResolution_RoundTrip(t *testing.T) {
	raw := encodeTinyTIFF(t)
	tagged, err := injectTIFFResolution(raw, 300)
	if err != nil {
		t.Fatalf("inject: %v", err)
	}
	singles, rationals, orderStr := parseTIFFFirstIFD(t, tagged)
	if orderStr != "II" {
		t.Errorf("byte order changed: %s", orderStr)
	}
	if got := rationals[tiffTagXResolution]; got != [2]uint32{300, 1} {
		t.Errorf("XResolution = %v, want [300 1]", got)
	}
	if got := rationals[tiffTagYResolution]; got != [2]uint32{300, 1} {
		t.Errorf("YResolution = %v, want [300 1]", got)
	}
	if got := singles[tiffTagResolutionUnit]; got != 2 {
		t.Errorf("ResolutionUnit = %d, want 2 (inch)", got)
	}
	// سلامة البكسلات: الملف المحقون ما زال TIFF صالحاً بنفس الأبعاد.
	dec, err := xximage_tiff.Decode(bytes.NewReader(tagged))
	if err != nil {
		t.Fatalf("decode tagged tiff: %v", err)
	}
	if dec.Bounds().Dx() != 16 || dec.Bounds().Dy() != 12 {
		t.Errorf("bounds changed: %v", dec.Bounds())
	}
}

func TestInjectTIFFResolution_ReplacesOldTags(t *testing.T) {
	raw := encodeTinyTIFF(t)
	once, err := injectTIFFResolution(raw, 72)
	if err != nil {
		t.Fatalf("first inject: %v", err)
	}
	twice, err := injectTIFFResolution(once, 150)
	if err != nil {
		t.Fatalf("second inject: %v", err)
	}
	singles, rationals, _ := parseTIFFFirstIFD(t, twice)
	if got := rationals[tiffTagXResolution]; got != [2]uint32{150, 1} {
		t.Errorf("XResolution after re-inject = %v, want [150 1]", got)
	}
	if got := singles[tiffTagResolutionUnit]; got != 2 {
		t.Errorf("ResolutionUnit = %d, want 2", got)
	}
}

func TestInjectTIFFResolution_RejectsBadInput(t *testing.T) {
	raw := encodeTinyTIFF(t)
	for _, dpi := range []int{0, -300, 20000} {
		if _, err := injectTIFFResolution(raw, dpi); err == nil {
			t.Errorf("dpi=%d must be rejected", dpi)
		}
	}
	if _, err := injectTIFFResolution([]byte("not a tiff at all...."), 300); err == nil {
		t.Error("garbage must be rejected")
	}
	if _, err := injectTIFFResolution(raw[:20], 300); err == nil {
		t.Error("truncated tiff must be rejected")
	}
}

// TestInjectTIFFResolution_BigEndian: ملف BE مُصنّع يدوياً — يغطي فرع ترتيب
// البايتات المعكوس وقيمة SHORT المزاحة.
func TestInjectTIFFResolution_BigEndian(t *testing.T) {
	var buf bytes.Buffer
	buf.WriteString("MM")
	buf.Write([]byte{0, 42})
	buf.Write([]byte{0, 0, 0, 8}) // IFD at 8
	buf.Write([]byte{0, 1})       // 1 entry
	buf.Write([]byte{1, 0})       // tag 256 (ImageWidth)
	buf.Write([]byte{0, 4})       // LONG
	buf.Write([]byte{0, 0, 0, 1}) // count 1
	buf.Write([]byte{0, 0, 0, 16})
	buf.Write([]byte{0, 0, 0, 0}) // next = 0
	raw := buf.Bytes()

	tagged, err := injectTIFFResolution(raw, 200)
	if err != nil {
		t.Fatalf("inject BE: %v", err)
	}
	singles, rationals, orderStr := parseTIFFFirstIFD(t, tagged)
	if orderStr != "MM" {
		t.Errorf("byte order changed: %s", orderStr)
	}
	if got := rationals[tiffTagXResolution]; got != [2]uint32{200, 1} {
		t.Errorf("BE XResolution = %v, want [200 1]", got)
	}
	if got := singles[tiffTagResolutionUnit]; got != 2 {
		t.Errorf("BE ResolutionUnit = %d, want 2", got)
	}
	if got := singles[256]; got != 16 {
		t.Errorf("original tag 256 lost: %d", got)
	}
}

// TestGeneratePrintSheet_CMYKTIFFHasResolutionTags: إثبات نهاية-لنهاية أن
// مخرج TIFF الفعلي يحمل وسوم الدقة (RV-Print-04).
func TestGeneratePrintSheet_CMYKTIFFHasResolutionTags(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    20,
		PaperHeightMM:   20,
		DPI:             150,
		ColorSpace:      "cmyk",
		ShowCutLines:    true,
		CutLineStyle:    "dashed",
		CutLines:        []domain.CutLine{{X1: 2, Y1: 2, X2: 2, Y2: 18}},
		BackgroundColor: "#ffffff",
	}
	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("GeneratePrintSheet cmyk: %v", err)
	}
	if !strings.HasSuffix(strings.ToLower(outPath), ".tif") && !strings.HasSuffix(strings.ToLower(outPath), ".tiff") {
		t.Fatalf("expected .tif output, got %s", outPath)
	}
	base := strings.TrimSuffix(outPath, filepath.Ext(outPath))
	defer os.Remove(outPath)
	defer os.Remove(base + ".html")
	defer os.Remove(base + "_preview.png")
	defer os.Remove(base + "_preview.jpg")

	data, err := os.ReadFile(outPath)
	if err != nil {
		t.Fatalf("read tif: %v", err)
	}
	_, rationals, _ := parseTIFFFirstIFD(t, data)
	if got := rationals[tiffTagXResolution]; got != [2]uint32{150, 1} {
		t.Errorf("output XResolution = %v, want [150 1]", got)
	}
	if got := rationals[tiffTagYResolution]; got != [2]uint32{150, 1} {
		t.Errorf("output YResolution = %v, want [150 1]", got)
	}
}
