package server

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
	"testing"
)

// realJFIF builds a minimal but structurally valid JFIF JPEG:
// SOI + APP0(len=16,'JFIF\0',v1.01,units=0,72x72) + EOI.
func realJFIF() []byte {
	app0 := []byte{
		0xFF, 0xE0, // APP0 marker
		0x00, 0x10, // length = 16
		'J', 'F', 'I', 'F', 0,
		0x01, 0x01, // version 1.01
		0x00,       // units: 0 = none
		0x00, 0x48, // X density 72
		0x00, 0x48, // Y density 72
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // no thumbnail
	}
	out := []byte{0xFF, 0xD8}
	out = append(out, app0...)
	out = append(out, 0xFF, 0xD9)
	return out
}

func TestSetJPEGDPIRealJFIF(t *testing.T) {
	src := realJFIF()
	got := setJPEGDPI(src, 300)
	if bytes.Equal(got, src) {
		t.Fatal("setJPEGDPI left a real JFIF header untouched — DPI injection is dead for JPEG")
	}
	// units byte is at offset 13; X/Y density at 14..17
	if got[13] != 1 {
		t.Fatalf("units byte at 13 = %d, want 1", got[13])
	}
	if binary.BigEndian.Uint16(got[14:16]) != 300 || binary.BigEndian.Uint16(got[16:18]) != 300 {
		t.Fatalf("density at 14..17 = %v %v, want 300 300", got[14:16], got[16:18])
	}
	// must not corrupt anything else
	if !bytes.Equal(got[:13], src[:13]) {
		t.Fatal("bytes before units changed unexpectedly")
	}
	if !bytes.Equal(got[18:], src[18:]) {
		t.Fatal("bytes after density changed unexpectedly")
	}
}

func TestSetJPEGDPIIdempotentSecondCall(t *testing.T) {
	once := setJPEGDPI(realJFIF(), 300)
	twice := setJPEGDPI(once, 600)
	if binary.BigEndian.Uint16(twice[14:16]) != 600 {
		t.Fatalf("re-patch should update density, got %v", twice[14:16])
	}
}

func TestSetPNGDPIInjectsPhys(t *testing.T) {
	// minimal PNG: sig + IHDR(13) + IDAT(4) + IEND
	mk := func() []byte {
		var b []byte
		b = append(b, PNGSignature...)
		ihdr := []byte("IHDR")
		ihdr = append(ihdr, make([]byte, 13)...)
		b = appendChunk(b, ihdr)
		b = appendChunk(b, []byte("IDAT"))
		b = appendChunk(b, []byte("IEND"))
		return b
	}
	src := mk()
	got := setPNGDPI(src, 300)
	// expect 21-byte pHYs chunk right after IHDR chunk (sig 8 + chunk 4+4+13+4 = 33)
	phys := got[33 : 33+21]
	if string(phys[4:8]) != "pHYs" {
		t.Fatalf("no pHYs chunk found after IHDR: % x", got[8:33])
	}
	ppm := binary.BigEndian.Uint32(phys[8:12])
	wantPPM := pixelsPerMeter(300)
	if ppm != wantPPM {
		t.Fatalf("ppm = %d, want %d", ppm, wantPPM)
	}
	if phys[16] != 1 {
		t.Fatalf("unit byte = %d", phys[16])
	}
	// second patch must be a no-op
	if !bytes.Equal(setPNGDPI(got, 600), got) {
		t.Fatal("second patch changed bytes although pHYs exists")
	}
}

func appendChunk(b, dataWithType []byte) []byte {
	var lenBuf [4]byte
	binary.BigEndian.PutUint32(lenBuf[:], uint32(len(dataWithType)-4))
	b = append(b, lenBuf[:]...)
	b = append(b, dataWithType...)
	var crcBuf [4]byte
	binary.BigEndian.PutUint32(crcBuf[:], crc32.ChecksumIEEE(b[len(b)-len(dataWithType):]))
	return append(b, crcBuf[:]...)
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 دفعة الأداء — النسخ المتدفق: مسار newDPIStreamWriter يجب أن يطابق مسار
// patchImageDPI المخزّني بيت-بيت على كل الدخل المقبول، وعلى كل تقطيعات الكتابة
// (بايت-بايت أسوأ حالة لحدود القطع).
// ─────────────────────────────────────────────────────────────────────────────

func streamThroughDPIWriter(t *testing.T, data []byte, ext string, dpi int, chunk int) []byte {
	t.Helper()
	var out bytes.Buffer
	w := newDPIStreamWriter(&out, ext, dpi)
	for i := 0; i < len(data); i += chunk {
		end := i + chunk
		if end > len(data) {
			end = len(data)
		}
		if _, err := w.Write(data[i:end]); err != nil {
			t.Fatalf("stream write: %v", err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatalf("stream close: %v", err)
	}
	return out.Bytes()
}

func TestDPIStreamWriter_MatchesBufferPatch(t *testing.T) {
	minPNG := func() []byte {
		// sig + IHDR(13) + IDAT(4) + IEND — نفس بنية اختبار TestSetPNGDPIInjectsPhys
		ihdr := []byte{0, 0, 0, 13}
		ihdr = append(ihdr, []byte("IHDR")...)
		ihdr = append(ihdr, 0, 0, 0, 1, 0, 0, 0, 1, 8, 0, 0, 0, 0) // 13 بايت بيانات IHDR
		ihdrCRC := crc32.ChecksumIEEE(ihdr[4:21])
		crcB := make([]byte, 4)
		binary.BigEndian.PutUint32(crcB, ihdrCRC)
		ihdr = append(ihdr, crcB...)
		idat := []byte{0, 0, 0, 4}
		idat = append(idat, []byte("IDAT")...)
		idat = append(idat, 1, 2, 3, 4)
		idatCRC := crc32.ChecksumIEEE(idat[4:12])
		crcB2 := make([]byte, 4)
		binary.BigEndian.PutUint32(crcB2, idatCRC)
		idat = append(idat, crcB2...)
		iend := []byte{0, 0, 0, 0}
		iend = append(iend, []byte("IEND")...)
		iendCRC := crc32.ChecksumIEEE(iend[4:8])
		crcB3 := make([]byte, 4)
		binary.BigEndian.PutUint32(crcB3, iendCRC)
		iend = append(iend, crcB3...)
		out := append([]byte{}, PNGSignature...)
		out = append(out, ihdr...)
		out = append(out, idat...)
		out = append(out, iend...)
		return out
	}

	pngWithPhys := func() []byte {
		out := minPNG()
		// أدخل pHYs بعد IHDR مباشرة (الحقن ممنوع حينها)
		out = append(out[:8+25], pngPhysChunk(96)...)
		out = append(out, minPNG()[8+25:]...)
		return out
	}

	corruptLenPNG := func() []byte {
		out := minPNG()
		// قطعة gAMA بطول فاسد ضخم قبل IDAT ⇒ الأصل يعيد الدخل كما هو
		bogus := []byte{0x7F, 0xFF, 0xFF, 0xFF}
		bogus = append(bogus, []byte("gAMA")...)
		out = append(out[:8+25], bogus...)
		out = append(out, minPNG()[8+25:]...)
		return out
	}

	truncatedPNG := minPNG()[:8+25+6] // IDAT مبتور
	noIDAT := func() []byte {
		out := append([]byte{}, PNGSignature...)
		out = append(out, minPNG()[8:8+25]...) // IHDR فقط
		return out
	}

	cases := []struct {
		name string
		data []byte
		ext  string
	}{
		{name: "png-minimal", data: minPNG(), ext: ".png"},
		{name: "png-with-phys", data: pngWithPhys(), ext: ".png"},
		{name: "png-corrupt-length", data: corruptLenPNG(), ext: ".png"},
		{name: "png-truncated", data: truncatedPNG, ext: ".png"},
		{name: "png-no-idat", data: noIDAT(), ext: ".png"},
		{name: "png-bad-sig", data: append([]byte{0, 1, 2, 3, 4, 5, 6, 7}, minPNG()[8:]...), ext: ".png"},
		{name: "jpeg-real-jfif", data: realJFIF(), ext: ".jpg"},
		{name: "jpeg-not-jfif", data: func() []byte {
			out := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'X', 'F', 'I', 'F', 0, 1, 1, 0, 0, 0x48, 0, 0x48, 0, 0, 0, 0xFF, 0xD9}
			return out
		}(), ext: ".jpg"},
		{name: "jpeg-truncated-app0", data: []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 'J', 'F', 'I', 'F', 0, 1, 1, 0, 0x00, 0x48, 0x00}, ext: ".jpg"},
		{name: "jpeg-no-app0", data: []byte{0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x10, 0, 0, 0xFF, 0xD9}, ext: ".jpg"},
		{name: "jpeg-tiny", data: []byte{0xFF, 0xD8, 0xFF}, ext: ".jpg"},
		{name: "unknown-ext", data: minPNG(), ext: ".webp"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			want := patchImageDPI(tc.data, tc.ext, 300)
			for _, chunk := range []int{1, 3, 7, 4096, len(tc.data)} {
				got := streamThroughDPIWriter(t, tc.data, tc.ext, 300, chunk)
				if !bytes.Equal(got, want) {
					t.Fatalf("chunk=%d: streamed output != buffer patch (%d vs %d bytes)", chunk, len(got), len(want))
				}
			}
		})
	}
}

// TestDPIStreamWriter_InjectsPHYSAtIDAT: التحقق الموجب على المسار المتدفق —
// pHYs تُزرع فعلًا قبل أول IDAT وبنفس بايتات المسار المخزّني.
func TestDPIStreamWriter_InjectsPHYSAtIDAT(t *testing.T) {
	var out bytes.Buffer
	sig := []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}
	// اكتب التوقيع والـIHDR على دفعات صغيرة ثم IDAT — الحقن يقع عندها.
	w := newDPIStreamWriter(&out, ".png", 300)
	_, _ = w.Write(sig)
	ihdr := make([]byte, 25)
	ihdr[0], ihdr[1], ihdr[2], ihdr[3] = 0, 0, 0, 13
	copy(ihdr[4:8], "IHDR")
	_, _ = w.Write(ihdr[:10])
	_, _ = w.Write(ihdr[10:])
	idatHead := []byte{0, 0, 0, 4, 'I', 'D', 'A', 'T', 1, 2, 3, 4}
	_, _ = w.Write(idatHead)
	if err := w.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}
	got := out.Bytes()
	want := setPNGDPI(append(append(append([]byte{}, sig...), ihdr...), idatHead...), 300)
	if !bytes.Equal(got, want) {
		t.Fatalf("streamed injection != buffer injection (%d vs %d bytes)", len(got), len(want))
	}
	if !bytes.Contains(got, []byte("pHYs")) {
		t.Fatal("pHYs chunk was not injected in streaming path")
	}
}
