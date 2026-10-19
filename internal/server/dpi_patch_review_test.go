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
