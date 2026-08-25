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
