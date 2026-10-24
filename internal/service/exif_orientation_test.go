package service

import (
	"bytes"
	"image"
	"os"
	"path/filepath"
	"strconv"
	"testing"

	"github.com/disintegration/imaging"
)

// تثبيت قارئ EXIF وتطبيقه على fixtures التوسيمات 1-8 — النمط البصري
// (ربع أحمر أعلى-يسار وربع أخضر أسفل-يمين في البكسل الخام) يجعل أي خطأ
// في اتجاه التطبيع يظهر بكسلياً فوراً (توازي from-image — §5.2).

const exifFixtureW, exifFixtureH = 64, 48

func loadExifFixture(t *testing.T, orientation int) []byte {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(scannerWarpFixturesDir, "exif", filepath.FromSlash(orientationName(orientation)+".jpg")))
	if err != nil {
		t.Fatalf("قراءة fixture التوسيم %d: %v (شغّل scripts/generate-scanner-exif-fixtures.py)", orientation, err)
	}
	return raw
}

func orientationName(n int) string {
	return "orientation_" + strconv.Itoa(n)
}

func TestReadJPEGExifOrientation(t *testing.T) {
	for n := 1; n <= 8; n++ {
		if got := ReadJPEGExifOrientation(loadExifFixture(t, n)); got != n {
			t.Errorf("التوسيم %d: قُرئ %d", n, got)
		}
	}
	if got := ReadJPEGExifOrientation([]byte{0xFF, 0xD8, 0xFF, 0xE0, 0, 16}); got != 1 {
		t.Errorf("JPEG بلا APP1 يجب أن يعيد 1 (حصل %d)", got)
	}
}

// جدول موقع الربع الأحمر المتوقع بعد التطبيع الصحيح (اشتقاق تحويلات EXIF).
var redQuadrantAfterOrientation = map[int]string{
	1: "TL", 2: "TR", 3: "BR", 4: "BL",
	5: "TL", 6: "TR", 7: "BR", 8: "BL",
}

func TestApplyExifOrientationQuadrants(t *testing.T) {
	for n := 1; n <= 8; n++ {
		t.Run(orientationName(n), func(t *testing.T) {
			decoded, err := imaging.Decode(bytes.NewReader(loadExifFixture(t, n)))
			if err != nil {
				t.Fatalf("فك JPEG: %v", err)
			}
			src, ok := decoded.(*image.NRGBA)
			if !ok {
				src = imaging.Clone(decoded)
			}

			normalized := ApplyExifOrientation(src, n)
			dw := normalized.Bounds().Dx()
			dh := normalized.Bounds().Dy()

			// التوسيمات 5-8 تُبدّل الأبعاد
			wantSwap := n >= 5
			if wantSwap && (dw != exifFixtureH || dh != exifFixtureW) {
				t.Fatalf("التوسيم %d: أبعاد %dx%d والمتوقع مبادلة إلى %dx%d", n, dw, dh, exifFixtureH, exifFixtureW)
			}
			if !wantSwap && (dw != exifFixtureW || dh != exifFixtureH) {
				t.Fatalf("التوسيم %d: الأبعاد تغيرت بلا مبرر: %dx%d", n, dw, dh)
			}

			quadrant := detectRedQuadrant(t, normalized)
			if quadrant != redQuadrantAfterOrientation[n] {
				t.Fatalf("التوسيم %d: الربع الأحمر في %s والمتوقع %s", n, quadrant, redQuadrantAfterOrientation[n])
			}
		})
	}
}

// detectRedQuadrant يجد أي ربع يحتوي البقعة الحمراء بفحص مراكز الأرباع.
func detectRedQuadrant(t *testing.T, img *image.NRGBA) string {
	t.Helper()
	dw := img.Bounds().Dx()
	dh := img.Bounds().Dy()
	probes := map[string][2]int{
		"TL": {dw / 8, dh / 8},
		"TR": {dw - dw/8, dh / 8},
		"BR": {dw - dw/8, dh - dh/8},
		"BL": {dw / 8, dh - dh/8},
	}
	found := ""
	for name, p := range probes {
		idx := p[1]*img.Stride + p[0]*4
		r, g, b := int(img.Pix[idx]), int(img.Pix[idx+1]), int(img.Pix[idx+2])
		if r > 180 && g < 120 && b < 120 && r > g+60 {
			if found != "" {
				t.Fatalf("بقع حمراء في أكثر من ربع (%s و%s) — fixture تالف", found, name)
			}
			found = name
		}
	}
	if found == "" {
		t.Fatal("لم يُعثر على الربع الأحمر — النمط البصري للfixture غير مكتمل")
	}
	return found
}
