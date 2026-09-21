package service

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestParseColor_RecognizedFormats يثبّت أن كل الصيغ المدعومة تُقرأ بلا أصفار صامتة
// (fmt.Sscanf السابق كان يفشل بصمت ويترك اللون أسود/أبيض بلا أي إشارة).
func TestParseColor_RecognizedFormats(t *testing.T) {
	cases := []struct {
		in      string
		r, g, b uint8
		alpha   uint8
	}{
		{"#fff", 0xFF, 0xFF, 0xFF, 0xFF},
		{"#f00", 0xFF, 0x00, 0x00, 0xFF},
		{"#0f0", 0x00, 0xFF, 0x00, 0xFF},
		{"#123456", 0x12, 0x34, 0x56, 0xFF},
		{"123456", 0x12, 0x34, 0x56, 0xFF},
		{"#0f08", 0x00, 0xFF, 0x00, 0x88},
		{"#12345678", 0x12, 0x34, 0x56, 0x78},
	}

	for _, tc := range cases {
		rgba, ok := parseColor(tc.in).(color.RGBA)
		if !ok {
			t.Errorf("parseColor(%q): expected color.RGBA, got %T", tc.in, parseColor(tc.in))
			continue
		}
		if rgba.R != tc.r || rgba.G != tc.g || rgba.B != tc.b || rgba.A != tc.alpha {
			t.Errorf("parseColor(%q) = #%02x%02x%02x%02x, want #%02x%02x%02x%02x",
				tc.in, rgba.R, rgba.G, rgba.B, rgba.A, tc.r, tc.g, tc.b, tc.alpha)
		}
	}

	// color.Transparent هو Alpha16{0} لا RGBA — نتحقق عبر RGBA() (الشفافية الكاملة = أصفار)
	if r, g, b, a := parseColor("transparent").RGBA(); r != 0 || g != 0 || b != 0 || a != 0 {
		t.Errorf("parseColor(\"transparent\") should be fully transparent, got r=%d g=%d b=%d a=%d", r, g, b, a)
	}
}

// TestParseColor_MalformedFallsBackToWhite يضمن سلوكاً ثابتاً (أبيض) بدل أسود صامت
// أو مدخل غريب يُفسَّر جزئياً.
func TestParseColor_MalformedFallsBackToWhite(t *testing.T) {
	for _, in := range []string{"", "  ", "#12", "#12345", "#GGGGGG", "red", "rgb(1,2,3)", "#1234567"} {
		r, g, b, a := parseColor(in).RGBA()
		if r != 0xFFFF || g != 0xFFFF || b != 0xFFFF || a != 0xFFFF {
			t.Errorf("parseColor(%q) should fall back to opaque white, got r=%d g=%d b=%d a=%d", in, r, g, b, a)
		}
	}
}

func encodeDataURL(mime string, payload []byte) string {
	return "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(payload)
}

// TestSaveImageFromBase64_RejectsNonImageContent: الامتداد يُشتق من النوع المُعلن،
// فقبل الإصلاح كانت أي حمولة (HTML/JS/نص) تُكتب داخل مجلد الوسائط المخدوم.
func TestSaveImageFromBase64_RejectsNonImageContent(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	svc := NewMediaService()

	html := encodeDataURL("image/png", []byte("<!DOCTYPE html><html><script>alert(1)</script></html>"))
	if _, err := svc.SaveImageFromBase64(html); err == nil {
		t.Error("HTML payload declared as image/png must be rejected")
	}

	// بلا نوع مُعلن إطلاقاً (الافتراضي image/jpeg) مع محتوى نصي
	plain := base64.StdEncoding.EncodeToString([]byte("just some plain text, not an image"))
	if _, err := svc.SaveImageFromBase64(plain); err == nil {
		t.Error("plain-text payload must be rejected")
	}

	// نوع مُعلن غير صورة
	if _, err := svc.SaveImageFromBase64("data:text/plain;base64," + base64.StdEncoding.EncodeToString([]byte("<svg></svg>"))); err == nil {
		t.Error("non-image declared mime must be rejected")
	}
}

// TestSaveImageFromBase64_AcceptsRealImages يضمن أن التشديد لم يمنع مسارات مشروعة:
// PNG حقيقي، وSVG نصّي حقيقي، وتنسيق ثنائي لا يميّزه net/http (TIFF) يُقبل بنوعه المُعلن.
func TestSaveImageFromBase64_AcceptsRealImages(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	svc := NewMediaService()

	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewRGBA(image.Rect(0, 0, 4, 4))); err != nil {
		t.Fatalf("encode png: %v", err)
	}

	cases := []struct {
		name    string
		dataURL string
		wantExt string
	}{
		{"png", encodeDataURL("image/png", buf.Bytes()), ".png"},
		{"svg", encodeDataURL("image/svg+xml", []byte(`<svg xmlns="http://www.w3.org/2000/svg"><rect width="4" height="4"/></svg>`)), ".svg"},
		// بايتات ثنائية لا يصنّفها net/http (كحال TIFF/AVIF/HEIC) — تُقبل بالنوع المُعلن
		{"opaque-tiff", encodeDataURL("image/tiff", []byte{0xFF, 0x80, 0x00, 0xC3, 0x7F, 0x01, 0xFE}), ".tiff"},
	}

	for _, tc := range cases {
		saved, err := svc.SaveImageFromBase64(tc.dataURL)
		if err != nil {
			t.Errorf("%s: unexpected error: %v", tc.name, err)
			continue
		}
		if !strings.HasPrefix(saved, "/local-image/") || !strings.HasSuffix(saved, tc.wantExt) {
			t.Errorf("%s: saved path %q should end with %q", tc.name, saved, tc.wantExt)
		}
		name := strings.TrimPrefix(saved, "/local-image/")
		if _, err := os.Stat(filepath.Join(svc.GetMediaDir(), name)); err != nil {
			t.Errorf("%s: file not written: %v", tc.name, err)
		}
	}
}
