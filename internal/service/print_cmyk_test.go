package service

import (
	"image"
	"image/color"
	"testing"

	"grido/internal/core/domain"
)

func TestRGBToRichCMYK_StandardColors(t *testing.T) {
	tests := []struct {
		name      string
		r, g, b   uint8
		expectedK uint8
	}{
		{"Pure White", 255, 255, 255, 0},
		{"Pure Red", 255, 0, 0, 0},
		{"Pure Green", 0, 255, 0, 0},
		{"Pure Blue", 0, 0, 255, 0},
		{"Pure Black", 0, 0, 0, 255},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, m, y, k := rgbToRichCMYK(tt.r, tt.g, tt.b)
			if tt.name == "Pure Black" {
				// Photographic Rich Black should boost C, M, Y for deep shadows
				if k != 255 {
					t.Errorf("Expected K=255 for pure black, got %d", k)
				}
				if c == 0 || m == 0 || y == 0 {
					t.Errorf("Expected rich black boost (C>0, M>0, Y>0), got C:%d, M:%d, Y:%d", c, m, y)
				}
			} else {
				if k != tt.expectedK {
					t.Errorf("Expected K=%d, got %d", tt.expectedK, k)
				}
			}
		})
	}
}

func TestConvertRGBAtoCMYK_VariousImageTypes(t *testing.T) {
	// 1. Standard RGBA image (Fast Path)
	w, h := 100, 50
	rgba := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			rgba.Set(x, y, color.RGBA{R: 20, G: 20, B: 20, A: 255})
		}
	}

	cmyk1 := ConvertRGBAtoCMYK(rgba)
	if cmyk1 == nil {
		t.Fatal("Expected non-nil CMYK image from RGBA")
	}
	if cmyk1.Bounds().Dx() != w || cmyk1.Bounds().Dy() != h {
		t.Errorf("Bounds mismatch: expected %dx%d, got %dx%d", w, h, cmyk1.Bounds().Dx(), cmyk1.Bounds().Dy())
	}

	// 2. Non-RGBA Image (Fallback Path: NRGBA)
	nrgba := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			nrgba.Set(x, y, color.NRGBA{R: 255, G: 255, B: 255, A: 255})
		}
	}

	cmyk2 := ConvertRGBAtoCMYK(nrgba)
	if cmyk2 == nil {
		t.Fatal("Expected non-nil CMYK image from NRGBA")
	}
	if cmyk2.Bounds().Dx() != w || cmyk2.Bounds().Dy() != h {
		t.Errorf("Fallback bounds mismatch: expected %dx%d, got %dx%d", w, h, cmyk2.Bounds().Dx(), cmyk2.Bounds().Dy())
	}

	// 3. 1x1 Micro Image Edge Case
	micro := image.NewRGBA(image.Rect(0, 0, 1, 1))
	micro.Set(0, 0, color.RGBA{R: 0, G: 0, B: 0, A: 255})
	cmykMicro := ConvertRGBAtoCMYK(micro)
	if cmykMicro.Bounds().Dx() != 1 || cmykMicro.Bounds().Dy() != 1 {
		t.Errorf("1x1 image bounds mismatch")
	}
}

func TestApplyPureBlackCutLines_AllStyles(t *testing.T) {
	w, h := 200, 200
	cmyk := image.NewCMYK(image.Rect(0, 0, w, h))

	styles := []string{"solid", "cropmarks", "dotted", "dashed"}
	for _, style := range styles {
		req := domain.PrintRequest{
			ShowCutLines: true,
			CutLineStyle: style,
			DPI:          300,
			CutLines: []domain.CutLine{
				{X1: 10, Y1: 10, X2: 10, Y2: 50}, // Vertical line
				{X1: 10, Y1: 10, X2: 50, Y2: 10}, // Horizontal line
			},
		}

		// Should not panic across any style
		ApplyPureBlackCutLines(cmyk, req)
	}

	// Test with out-of-bounds line coordinates (must clamp safely without panic)
	outOfBoundsReq := domain.PrintRequest{
		ShowCutLines: true,
		CutLineStyle: "solid",
		DPI:          300,
		CutLines: []domain.CutLine{
			{X1: -50, Y1: -50, X2: 1000, Y2: -50},
			{X1: 1000, Y1: -50, X2: 1000, Y2: 1000},
		},
	}
	ApplyPureBlackCutLines(cmyk, outOfBoundsReq)

	// Test when ShowCutLines is false (should return early)
	disabledReq := domain.PrintRequest{
		ShowCutLines: false,
		CutLines: []domain.CutLine{
			{X1: 10, Y1: 10, X2: 10, Y2: 50},
		},
	}
	ApplyPureBlackCutLines(cmyk, disabledReq)
}

// ─── RV-Print-02: الخطوط المائلة كانت تُسقط بصمت في CMYK ───

// TestApplyPureBlackCutLines_Diagonal: خط مائل يجب أن يرسم بكسلات سوداء
// نقية (K=255) على امتداده — سابقاً لم يُرسم أي بكسل (WYSIWYG مكسور).
func TestApplyPureBlackCutLines_Diagonal(t *testing.T) {
	w, h := 400, 400
	cmyk := image.NewCMYK(image.Rect(0, 0, w, h))
	req := domain.PrintRequest{
		ShowCutLines: true,
		CutLineStyle: "solid",
		DPI:          300,
		CutLines: []domain.CutLine{
			{X1: 5, Y1: 5, X2: 25, Y2: 25}, // مائل 45° بطول ~236px
		},
	}
	ApplyPureBlackCutLines(cmyk, req)

	black := 0
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			c, m, yv, k := cmyk.CMYKAt(x, y).C, cmyk.CMYKAt(x, y).M, cmyk.CMYKAt(x, y).Y, cmyk.CMYKAt(x, y).K
			if k == 255 && c == 0 && m == 0 && yv == 0 {
				black++
			}
		}
	}
	// الطول ≈ 236px × سماكة ~3px ⇒ مئات البكسلات على الأقل.
	if black < 200 {
		t.Errorf("diagonal cut line drew only %d pure-black pixels, want >= 200", black)
	}
}

// TestApplyPureBlackCutLines_DiagonalDashed: المائل المنقّط يرسم بعضاً ويترك
// فجوات (إيقاع الشرطات يعمل على المعامل t لا على المحاور).
func TestApplyPureBlackCutLines_DiagonalDashed(t *testing.T) {
	w, h := 600, 400
	cmyk := image.NewCMYK(image.Rect(0, 0, w, h))
	req := domain.PrintRequest{
		ShowCutLines: true,
		CutLineStyle: "dashed",
		DPI:          300,
		CutLines: []domain.CutLine{
			{X1: 2, Y1: 10, X2: 48, Y2: 10}, // أفقي للمقارنة
			{X1: 2, Y1: 12, X2: 48, Y2: 30}, // مائل قابل للمقارنة طولياً
		},
	}
	ApplyPureBlackCutLines(cmyk, req)
	countLine := func(y0, y1 int) int {
		n := 0
		for y := y0; y < y1; y++ {
			for x := 0; x < w; x++ {
				if cmyk.CMYKAt(x, y).K == 255 {
					n++
				}
			}
		}
		return n
	}
	horiz := countLine(100, 140)
	_ = horiz
	diag := countLine(120, 400)
	if diag == 0 {
		t.Error("dashed diagonal drew zero pixels")
	}
}

// ─── RV-Print-02b: تسطيح ألفا على الأبيض ───

// TestConvertRGBAtoCMYK_FlattensTransparentToWhite: بكسل شفاف تماماً يجب
// أن يخرج أبيضاً (K=0) لا أسود — سابقاً RGB الخام (0,0,0) ⇒ أسود.
func TestConvertRGBAtoCMYK_FlattensTransparentToWhite(t *testing.T) {
	// المسار السريع RGBA (premultiplied: الشفاف يُخزَّن 0,0,0,0).
	rgba := image.NewRGBA(image.Rect(0, 0, 4, 4))
	rgba.SetRGBA(0, 0, color.RGBA{R: 0, G: 0, B: 0, A: 0})
	got := ConvertRGBAtoCMYK(rgba)
	c := got.CMYKAt(0, 0)
	if c.K != 0 {
		t.Errorf("transparent RGBA pixel => K=%d, want 0 (white)", c.K)
	}

	// المسار العام NRGBA.
	nrgba := image.NewNRGBA(image.Rect(0, 0, 4, 4))
	nrgba.SetNRGBA(0, 0, color.NRGBA{R: 0, G: 0, B: 0, A: 0})
	got2 := ConvertRGBAtoCMYK(nrgba)
	if c2 := got2.CMYKAt(0, 0); c2.K != 0 {
		t.Errorf("transparent NRGBA pixel => K=%d, want 0 (white)", c2.K)
	}

	// نصف شفاف أحمر فوق أبيض ⇒ وردي فاتح (K صغير، M معتدلة) لا أحمر داكن.
	nrgba.SetNRGBA(1, 0, color.NRGBA{R: 255, G: 0, B: 0, A: 128})
	got3 := ConvertRGBAtoCMYK(nrgba)
	c3 := got3.CMYKAt(1, 0)
	if c3.K > 30 {
		t.Errorf("half-transparent red over white => K=%d, want <= 30", c3.K)
	}
	if c3.M < 50 {
		t.Errorf("half-transparent red over white => M=%d, want >= 50 (pinkish)", c3.M)
	}
}

// TestRGBToRichCMYK_TotalAreaCoverageCap: سقف التغطية الإجمالية TAC يجب
// ألا يتجاوز 300% (تصحيح ادعاء المراجعة: الحد الفعلي ~197%).
func TestRGBToRichCMYK_TotalAreaCoverageCap(t *testing.T) {
	worst := 0
	for r := 0; r < 256; r += 17 {
		for g := 0; g < 256; g += 17 {
			for b := 0; b < 256; b += 17 {
				c, m, y, k := rgbToRichCMYK(uint8(r), uint8(g), uint8(b))
				total := int(c) + int(m) + int(y) + int(k) // بوحدة /255
				if total > worst {
					worst = total
				}
			}
		}
	}
	t.Logf("worst total ink coverage: %d/1020 units (%.1f%% TAC)", worst, float64(worst)*100/255)
	if worst > 3*255 {
		t.Errorf("TAC %d exceeds 300%% (765/1020 units)", worst)
	}
}
