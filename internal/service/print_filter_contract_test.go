package service

import (
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func onePixelNRGBA(c color.NRGBA) *image.NRGBA {
	img := image.NewNRGBA(image.Rect(0, 0, 1, 1))
	img.SetNRGBA(0, 0, c)
	return img
}

func pixelNRGBA(img image.Image, x, y int) color.NRGBA {
	return color.NRGBAModel.Convert(img.At(x, y)).(color.NRGBA)
}

func fixtureRGBAImage(t *testing.T, name string, width, height int) *image.NRGBA {
	t.Helper()
	path := filepath.Join("..", "..", "test-fixtures", "print-rgba", "filters", name)
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read independent fixture %s: %v", path, err)
	}
	if len(data) != width*height*4 {
		t.Fatalf("fixture %s has %d bytes, want %d", path, len(data), width*height*4)
	}
	img := image.NewNRGBA(image.Rect(0, 0, width, height))
	copy(img.Pix, data)
	return img
}

func assertRGBAFixture(t *testing.T, got image.Image, fixture string, width, height, rgbTolerance int) {
	t.Helper()
	want := fixtureRGBAImage(t, fixture, width, height)
	if got.Bounds().Dx() != width || got.Bounds().Dy() != height {
		t.Fatalf("%s dimensions = %v, want %dx%d", fixture, got.Bounds(), width, height)
	}
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			actual := pixelNRGBA(got, x, y)
			expected := want.NRGBAAt(x, y)
			if actual.A != expected.A {
				t.Fatalf("%s pixel (%d,%d) alpha=%d, want %d", fixture, x, y, actual.A, expected.A)
			}
			for channel, pair := range map[string][2]uint8{
				"R": {actual.R, expected.R},
				"G": {actual.G, expected.G},
				"B": {actual.B, expected.B},
			} {
				delta := int(pair[0]) - int(pair[1])
				if delta < -rgbTolerance || delta > rgbTolerance {
					t.Fatalf("%s pixel (%d,%d) %s=%d, want %d (tolerance %d)", fixture, x, y, channel, pair[0], pair[1], rgbTolerance)
				}
			}
		}
	}
}

func TestPrintFilterContract_IndependentRGBAFixtures(t *testing.T) {
	const width, height = 21, 21
	source := fixtureRGBAImage(t, "source-21x21.rgba", width, height)
	tests := []struct {
		name      string
		apply     func(image.Image) image.Image
		fixture   string
		tolerance int
	}{
		{name: "identity", apply: func(img image.Image) image.Image { return applyPrintImageFilterPipeline(img, "none", 100, 100, 100) }, fixture: "expected-identity.rgba"},
		{name: "brightness", apply: func(img image.Image) image.Image { return applyColorAdjustments(img, 120, 100, 100) }, fixture: "expected-brightness.rgba", tolerance: 1},
		{name: "contrast", apply: func(img image.Image) image.Image { return applyColorAdjustments(img, 100, 125, 100) }, fixture: "expected-contrast.rgba", tolerance: 1},
		{name: "saturation", apply: func(img image.Image) image.Image { return applyColorAdjustments(img, 100, 100, 140) }, fixture: "expected-saturation.rgba", tolerance: 1},
		{name: "sepia", apply: func(img image.Image) image.Image { return applyFilter(img, "sepia") }, fixture: "expected-sepia.rgba", tolerance: 1},
		{name: "grayscale", apply: func(img image.Image) image.Image { return applyFilter(img, "grayscale") }, fixture: "expected-grayscale.rgba", tolerance: 1},
		{name: "invert", apply: func(img image.Image) image.Image { return applyFilter(img, "invert") }, fixture: "expected-invert.rgba"},
		{name: "threshold", apply: func(img image.Image) image.Image { return applyFilter(img, "threshold") }, fixture: "expected-threshold.rgba"},
		{name: "pixelate", apply: func(img image.Image) image.Image { return applyFilter(img, "pixelate") }, fixture: "expected-pixelate.rgba"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			assertRGBAFixture(t, tc.apply(source), tc.fixture, width, height, tc.tolerance)
		})
	}
}

func TestPrintFilterContract_CanonicalAdjustmentVectors(t *testing.T) {
	tests := []struct {
		name                 string
		in                   color.NRGBA
		brightness, contrast float64
		saturation           float64
		want                 color.NRGBA
	}{
		{
			name:       "multiplicative brightness clamps each channel",
			in:         color.NRGBA{R: 100, G: 150, B: 250, A: 37},
			brightness: 150, contrast: 100, saturation: 100,
			want: color.NRGBA{R: 150, G: 225, B: 255, A: 37},
		},
		{
			name:       "linear contrast pivots around one half",
			in:         color.NRGBA{R: 64, G: 128, B: 192, A: 91},
			brightness: 100, contrast: 50, saturation: 100,
			want: color.NRGBA{R: 96, G: 128, B: 160, A: 91},
		},
		{
			name:       "rec709 zero saturation",
			in:         color.NRGBA{R: 255, G: 0, B: 0, A: 143},
			brightness: 100, contrast: 100, saturation: 0,
			want: color.NRGBA{R: 54, G: 54, B: 54, A: 143},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := pixelNRGBA(applyColorAdjustments(onePixelNRGBA(tc.in), tc.brightness, tc.contrast, tc.saturation), 0, 0)
			if got != tc.want {
				t.Fatalf("got %+v, want %+v", got, tc.want)
			}
		})
	}
}

func TestPrintFilterContract_BaseRecipeThenUserAdjustments(t *testing.T) {
	input := onePixelNRGBA(color.NRGBA{R: 20, G: 100, B: 220, A: 63})
	operations := []printFilterOperation{
		// Independent Uint8ClampedArray derivation, one quantization per CSS function:
		// input                 (20,100,220)
		// contrast(1.10)         (9,97,229)
		// saturate(1.15)         (0,98,250)
		// sepia(5%)              (6,99,242)
		// brightness(1.02)       (6,101,247)
		// user brightness(75%)   (4,76,185) — exact .5 uses ties-to-even
		// user contrast(140%)    (0,55,208)
		// user saturation(60%)   (22,55,147)
		{kind: printFilterContrast, amount: 1.10},
		{kind: printFilterSaturation, amount: 1.15},
		{kind: printFilterSepia, amount: 0.05},
		{kind: printFilterBrightness, amount: 1.02},
		{kind: printFilterBrightness, amount: 0.75},
		{kind: printFilterContrast, amount: 1.40},
		{kind: printFilterSaturation, amount: 0.60},
	}
	wantSteps := []color.NRGBA{
		{R: 9, G: 97, B: 229, A: 63},
		{R: 0, G: 98, B: 250, A: 63},
		{R: 6, G: 99, B: 242, A: 63},
		{R: 6, G: 101, B: 247, A: 63},
		{R: 4, G: 76, B: 185, A: 63},
		{R: 0, G: 55, B: 208, A: 63},
		{R: 22, G: 55, B: 147, A: 63},
	}
	step := image.Image(input)
	for i, operation := range operations {
		step = applyPrintFilterOperations(step, []printFilterOperation{operation})
		if got := pixelNRGBA(step, 0, 0); got != wantSteps[i] {
			t.Fatalf("independent derivation step %d got %+v, want %+v", i+1, got, wantSteps[i])
		}
	}

	got := pixelNRGBA(applyPrintImageFilterPipeline(input, "cinematic", 75, 140, 60), 0, 0)
	want := wantSteps[len(wantSteps)-1]
	if got != want {
		t.Fatalf("canonical catalog→user order got %+v, want %+v", got, want)
	}

	mutated := applyPrintFilterOperations(input, []printFilterOperation{
		{kind: printFilterBrightness, amount: 0.75},
		{kind: printFilterContrast, amount: 1.40},
		{kind: printFilterSaturation, amount: 0.60},
		{kind: printFilterContrast, amount: 1.10},
		{kind: printFilterSaturation, amount: 1.15},
		{kind: printFilterSepia, amount: 0.05},
		{kind: printFilterBrightness, amount: 1.02},
	})
	mutatedPixel := pixelNRGBA(mutated, 0, 0)
	if mutatedPixel == got {
		t.Fatalf("mutation guard failed: reversed base/user order produced the same pixel %+v", got)
	}
}

func TestPrintFilterContract_CatalogRecipeOrder(t *testing.T) {
	want := map[string][]printFilterOperation{
		"enhance": {
			{kind: printFilterContrast, amount: 1.08},
			{kind: printFilterSaturation, amount: 1.12},
			{kind: printFilterBrightness, amount: 1.02},
		},
		"skinGlow": {
			{kind: printFilterBrightness, amount: 1.06},
			{kind: printFilterContrast, amount: 0.94},
			{kind: printFilterSaturation, amount: 1.08},
			{kind: printFilterSepia, amount: 0.10},
		},
		"clarity": {
			{kind: printFilterContrast, amount: 1.22},
			{kind: printFilterSaturation, amount: 1.20},
			{kind: printFilterBrightness, amount: 0.98},
		},
		"lowlight": {
			{kind: printFilterBrightness, amount: 1.16},
			{kind: printFilterContrast, amount: 0.90},
			{kind: printFilterSaturation, amount: 1.05},
		},
		"cinematic": {
			{kind: printFilterContrast, amount: 1.10},
			{kind: printFilterSaturation, amount: 1.15},
			{kind: printFilterSepia, amount: 0.05},
			{kind: printFilterBrightness, amount: 1.02},
		},
		"monoPro": {
			{kind: printFilterGrayscale, amount: 1},
			{kind: printFilterContrast, amount: 1.25},
			{kind: printFilterBrightness, amount: 1.02},
		},
	}
	for filter, expected := range want {
		if actual := printFilterRecipes[filter]; !reflect.DeepEqual(actual, expected) {
			t.Errorf("%s recipe = %#v, want %#v", filter, actual, expected)
		}
	}
}

func TestPrintFilterContract_SepiaGrayscaleInvertThresholdAndAlpha(t *testing.T) {
	input := color.NRGBA{R: 100, G: 150, B: 200, A: 41}
	tests := []struct {
		filter string
		want   color.NRGBA
	}{
		{filter: "sepia", want: color.NRGBA{R: 192, G: 171, B: 134, A: 41}},
		{filter: "grayscale", want: color.NRGBA{R: 143, G: 143, B: 143, A: 41}},
		{filter: "invert", want: color.NRGBA{R: 155, G: 105, B: 55, A: 41}},
		{filter: "threshold", want: color.NRGBA{R: 255, G: 255, B: 255, A: 41}},
	}
	for _, tc := range tests {
		t.Run(tc.filter, func(t *testing.T) {
			got := pixelNRGBA(applyFilter(onePixelNRGBA(input), tc.filter), 0, 0)
			if got != tc.want {
				t.Fatalf("got %+v, want %+v", got, tc.want)
			}
		})
	}
}

func TestPrintFilterContract_PixelateAndBlurPreserveDimensions(t *testing.T) {
	img := image.NewNRGBA(image.Rect(0, 0, 23, 17))
	for y := 0; y < 17; y++ {
		for x := 0; x < 23; x++ {
			img.SetNRGBA(x, y, color.NRGBA{R: uint8(x * 9), G: uint8(y * 13), B: uint8((x + y) * 5), A: uint8(50 + (x+y)%200)})
		}
	}
	for _, filter := range []string{"pixelate", "blur"} {
		got := applyFilter(img, filter)
		if got.Bounds().Dx() != 23 || got.Bounds().Dy() != 17 {
			t.Fatalf("%s changed dimensions to %v", filter, got.Bounds())
		}
	}
}

func TestPrintFilterContract_ValidationHelpers(t *testing.T) {
	for _, filter := range []string{"", "none", "grayscale", "invert", "blur", "sepia", "enhance", "skinGlow", "clarity", "lowlight", "cinematic", "monoPro", "pixelate", "threshold"} {
		if err := ValidatePrintImageFilter(filter); err != nil {
			t.Errorf("supported filter %q rejected: %v", filter, err)
		}
	}
	if err := ValidatePrintImageFilter("not-a-filter"); err == nil || !strings.Contains(err.Error(), "unsupported") {
		t.Fatalf("unknown filter must be rejected, got %v", err)
	}

	for _, values := range [][3]float64{{0, 100, 200}, {200, 0, 100}, {100, 200, 0}} {
		if err := ValidatePrintImageAdjustments(values[0], values[1], values[2]); err != nil {
			t.Errorf("valid boundary values %v rejected: %v", values, err)
		}
	}
	for name, values := range map[string][3]float64{
		"nan":         {math.NaN(), 100, 100},
		"infinity":    {100, math.Inf(1), 100},
		"below range": {-1, 100, 100},
		"above range": {100, 100, 201},
	} {
		t.Run(name, func(t *testing.T) {
			if err := ValidatePrintImageAdjustments(values[0], values[1], values[2]); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}
