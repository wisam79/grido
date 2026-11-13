package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"testing"

	"grido/internal/core/domain"
)

type rgbaParityManifest struct {
	Files []struct {
		Path       string `json:"path"`
		Width      int    `json:"width"`
		Height     int    `json:"height"`
		Stride     int    `json:"stride"`
		ByteLength int    `json:"byteLength"`
		SHA256     string `json:"sha256"`
	} `json:"files"`
	ComparisonPolicies map[string]struct {
		MaxAbsoluteErrorByChannel map[string]int `json:"maxAbsoluteErrorByChannel"`
	} `json:"comparisonPolicies"`
	Suites struct {
		Filters struct {
			Cases []struct {
				ID               string          `json:"id"`
				Source           string          `json:"source"`
				Expected         string          `json:"expected"`
				Operation        string          `json:"operation"`
				Parameters       json.RawMessage `json:"parameters"`
				ComparisonPolicy string          `json:"comparisonPolicy"`
			} `json:"cases"`
		} `json:"filters"`
	} `json:"suites"`
}

func loadRGBAParityManifest(t *testing.T) rgbaParityManifest {
	t.Helper()
	path := filepath.Join("..", "..", "test-fixtures", "print-rgba", "manifest.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read independent RGBA manifest %s: %v", path, err)
	}
	var manifest rgbaParityManifest
	if err := json.Unmarshal(data, &manifest); err != nil {
		t.Fatalf("decode independent RGBA manifest: %v", err)
	}
	return manifest
}

func rgbaParityFixture(t *testing.T, manifest rgbaParityManifest, path string) *image.NRGBA {
	t.Helper()
	var record *struct {
		Path       string `json:"path"`
		Width      int    `json:"width"`
		Height     int    `json:"height"`
		Stride     int    `json:"stride"`
		ByteLength int    `json:"byteLength"`
		SHA256     string `json:"sha256"`
	}
	for i := range manifest.Files {
		if manifest.Files[i].Path == path {
			record = &manifest.Files[i]
			break
		}
	}
	if record == nil {
		t.Fatalf("fixture %q is not present in manifest", path)
	}
	fullPath := filepath.Join("..", "..", "test-fixtures", "print-rgba", filepath.FromSlash(path))
	data, err := os.ReadFile(fullPath)
	if err != nil {
		t.Fatalf("read fixture %s: %v", fullPath, err)
	}
	if record.Stride != record.Width*4 || record.ByteLength != record.Width*record.Height*4 || len(data) != record.ByteLength {
		t.Fatalf("fixture %s metadata/length mismatch: stride=%d length=%d/%d", path, record.Stride, len(data), record.ByteLength)
	}
	digest := sha256.Sum256(data)
	if hex.EncodeToString(digest[:]) != record.SHA256 {
		t.Fatalf("fixture %s SHA-256 mismatch", path)
	}
	img := image.NewNRGBA(image.Rect(0, 0, record.Width, record.Height))
	copy(img.Pix, data)
	return img
}

func rgbaParityOperation(t *testing.T, operation string, raw json.RawMessage) []printFilterOperation {
	t.Helper()
	var params struct {
		Factor    float64 `json:"factor"`
		Amount    float64 `json:"amount"`
		Level     float64 `json:"level"`
		BlockSize float64 `json:"blockSize"`
	}
	if err := json.Unmarshal(raw, &params); err != nil {
		t.Fatalf("decode %s fixture parameters: %v", operation, err)
	}
	switch operation {
	case "identity":
		return nil
	case "brightness":
		return []printFilterOperation{{kind: printFilterBrightness, amount: params.Factor}}
	case "contrast":
		return []printFilterOperation{{kind: printFilterContrast, amount: params.Factor}}
	case "saturation":
		return []printFilterOperation{{kind: printFilterSaturation, amount: params.Factor}}
	case "sepia":
		return []printFilterOperation{{kind: printFilterSepia, amount: params.Amount}}
	case "grayscale":
		return []printFilterOperation{{kind: printFilterGrayscale, amount: params.Amount}}
	case "invert":
		return []printFilterOperation{{kind: printFilterInvert, amount: params.Amount}}
	case "threshold":
		return []printFilterOperation{{kind: printFilterThreshold, amount: params.Level}}
	case "pixelate":
		return []printFilterOperation{{kind: printFilterPixelate, amount: params.BlockSize}}
	default:
		t.Fatalf("unsupported fixture operation %q", operation)
		return nil
	}
}

func rgbaParityPixel(img image.Image, x, y int) color.NRGBA {
	return color.NRGBAModel.Convert(img.At(x, y)).(color.NRGBA)
}

func assertRGBAParity(t *testing.T, got image.Image, want *image.NRGBA, tolerances map[string]int) {
	t.Helper()
	if got.Bounds().Dx() != want.Bounds().Dx() || got.Bounds().Dy() != want.Bounds().Dy() {
		t.Fatalf("dimensions = %v, want %v", got.Bounds(), want.Bounds())
	}
	var squaredRGBError float64
	var comparedRGBChannels int
	for y := 0; y < want.Bounds().Dy(); y++ {
		for x := 0; x < want.Bounds().Dx(); x++ {
			actual := rgbaParityPixel(got, x, y)
			expected := want.NRGBAAt(x, y)
			channels := []struct {
				name string
				got  uint8
				want uint8
			}{{"R", actual.R, expected.R}, {"G", actual.G, expected.G}, {"B", actual.B, expected.B}, {"A", actual.A, expected.A}}
			for _, channel := range channels {
				delta := int(channel.got) - int(channel.want)
				absDelta := delta
				if absDelta < 0 {
					absDelta = -absDelta
				}
				if absDelta > tolerances[channel.name] {
					t.Fatalf("pixel (%d,%d) %s=%d, want %d (tolerance %d)", x, y, channel.name, channel.got, channel.want, tolerances[channel.name])
				}
				if channel.name != "A" {
					squaredRGBError += float64(delta * delta)
					comparedRGBChannels++
				}
			}
		}
	}
	rmse := math.Sqrt(squaredRGBError / float64(max(1, comparedRGBChannels)))
	if rmse >= 2 {
		t.Fatalf("RGB RMSE = %.4f, want < 2", rmse)
	}
}

func TestPrintRGBAParity_ManifestFilterFixtures(t *testing.T) {
	manifest := loadRGBAParityManifest(t)
	if len(manifest.Suites.Filters.Cases) != 9 {
		t.Fatalf("filter fixture count = %d, want 9", len(manifest.Suites.Filters.Cases))
	}
	for _, tc := range manifest.Suites.Filters.Cases {
		t.Run(tc.ID, func(t *testing.T) {
			source := rgbaParityFixture(t, manifest, tc.Source)
			want := rgbaParityFixture(t, manifest, tc.Expected)
			policy, ok := manifest.ComparisonPolicies[tc.ComparisonPolicy]
			if !ok {
				t.Fatalf("unknown comparison policy %q", tc.ComparisonPolicy)
			}
			got := applyPrintFilterOperations(source, rgbaParityOperation(t, tc.Operation, tc.Parameters))
			assertRGBAParity(t, got, want, policy.MaxAbsoluteErrorByChannel)
		})
	}
}

func TestPrintRGBAParity_FilterOrderMutationGuard(t *testing.T) {
	manifest := loadRGBAParityManifest(t)
	source := rgbaParityFixture(t, manifest, "filters/source-21x21.rgba")
	canonical := []printFilterOperation{
		{kind: printFilterContrast, amount: 1.10},
		{kind: printFilterSaturation, amount: 1.15},
		{kind: printFilterSepia, amount: 0.05},
		{kind: printFilterBrightness, amount: 1.02},
		{kind: printFilterBrightness, amount: 0.75},
		{kind: printFilterContrast, amount: 1.40},
		{kind: printFilterSaturation, amount: 0.60},
	}
	mutated := make([]printFilterOperation, len(canonical))
	for i := range canonical {
		mutated[len(canonical)-1-i] = canonical[i]
	}
	gotCanonical := applyPrintFilterOperations(source, canonical)
	gotMutated := applyPrintFilterOperations(source, mutated)
	if bytes.Equal(gotCanonical.(*image.NRGBA).Pix, gotMutated.(*image.NRGBA).Pix) {
		t.Fatal("filter-order mutation produced identical RGBA bytes")
	}
	for y := 0; y < source.Bounds().Dy(); y++ {
		for x := 0; x < source.Bounds().Dx(); x++ {
			if rgbaParityPixel(gotCanonical, x, y).A != source.NRGBAAt(x, y).A {
				t.Fatalf("canonical filter order changed alpha at (%d,%d)", x, y)
			}
		}
	}
}

func rgbaParityDataURL(t *testing.T, img image.Image) string {
	t.Helper()
	var encoded bytes.Buffer
	if err := png.Encode(&encoded, img); err != nil {
		t.Fatalf("encode fixture PNG: %v", err)
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(encoded.Bytes())
}

func rgbaParityDecodePNG(t *testing.T, path string) image.Image {
	t.Helper()
	file, err := os.Open(path)
	if err != nil {
		t.Fatalf("open generated sheet %s: %v", path, err)
	}
	defer file.Close()
	img, err := png.Decode(file)
	if err != nil {
		t.Fatalf("decode generated sheet %s: %v", path, err)
	}
	return img
}

func rgbaParityAssertNear(t *testing.T, label string, got, want color.NRGBA, rgbTolerance int) {
	t.Helper()
	if got.A != want.A {
		t.Fatalf("%s alpha=%d, want exact %d", label, got.A, want.A)
	}
	for channel, values := range map[string][2]uint8{
		"R": {got.R, want.R},
		"G": {got.G, want.G},
		"B": {got.B, want.B},
	} {
		delta := int(values[0]) - int(values[1])
		if delta < -rgbTolerance || delta > rgbTolerance {
			t.Fatalf("%s %s=%d, want %d (tolerance %d)", label, channel, values[0], values[1], rgbTolerance)
		}
	}
}

func TestPrintRGBAParity_TinyProductionSheetAnchorsAndCutLinesLast(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	manifest := loadRGBAParityManifest(t)
	coverSource := rgbaParityFixture(t, manifest, "cover/source-landscape-7x5.rgba")
	const dpi = 50
	const pixelMM = 25.4 / dpi

	base := domain.PrintRequest{
		PaperWidthMM:    50 * pixelMM,
		PaperHeightMM:   50 * pixelMM,
		DPI:             dpi,
		BackgroundColor: "#f1e2d3",
		ExportFormat:    "png",
		BackgroundBlocks: []domain.PrintBackgroundBlock{{
			X: 0, Y: 0, W: 25 * pixelMM, H: 50 * pixelMM, Color: "#204060",
		}},
		Items: []domain.PrintItem{
			{
				ImageSrc: rgbaParityDataURL(t, coverSource),
				X:        5 * pixelMM, Y: 5 * pixelMM, W: 3 * pixelMM, H: 5 * pixelMM,
				SlotAspect: 3.0 / 5.0, Zoom: 1, Filter: "invert",
				Brightness: 100, Contrast: 100, Saturation: 100,
			},
			{
				X: 25 * pixelMM, Y: 10 * pixelMM, W: 20 * pixelMM, H: 20 * pixelMM,
				BgColor: "#2a6c3c", BorderWidthMM: 2 * pixelMM, BorderColor: "#d040a0",
				Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100,
			},
		},
	}

	withoutPath, _, err := NewPrintService().GeneratePrintSheet(base)
	if err != nil {
		t.Fatalf("GeneratePrintSheet without cut line: %v", err)
	}
	defer os.Remove(withoutPath)
	without := rgbaParityDecodePNG(t, withoutPath)
	if without.Bounds().Dx() != 50 || without.Bounds().Dy() != 50 {
		t.Fatalf("tiny sheet dimensions = %v, want 50x50", without.Bounds())
	}

	// These are interior integer-pixel anchors. A full-sheet golden is deliberately
	// avoided: gg border/stroke antialiasing and Lanczos edge taps are physical
	// renderer contracts, not independent fixture math. RGB tolerance is ±1 only;
	// alpha remains exact. The image anchor is >1 px from any resample edge.
	rgbaParityAssertNear(t, "page background", rgbaParityPixel(without, 48, 48), color.NRGBA{R: 0xf1, G: 0xe2, B: 0xd3, A: 255}, 1)
	rgbaParityAssertNear(t, "background block", rgbaParityPixel(without, 10, 40), color.NRGBA{R: 0x20, G: 0x40, B: 0x60, A: 255}, 1)
	rgbaParityAssertNear(t, "cover+invert opaque center", rgbaParityPixel(without, 7, 7), color.NRGBA{R: 191, G: 63, B: 79, A: 255}, 1)
	rgbaParityAssertNear(t, "item background", rgbaParityPixel(without, 35, 15), color.NRGBA{R: 0x2a, G: 0x6c, B: 0x3c, A: 255}, 1)

	// The 2 px stroke is checked as a one-pixel interior region rather than a full
	// raster outline; corner joins and the outer 1 px antialias fringe are excluded.
	borderMatches := 0
	for y := 12; y <= 18; y++ {
		got := rgbaParityPixel(without, 25, y)
		if absInt(int(got.R)-0xd0) <= 1 && absInt(int(got.G)-0x40) <= 1 && absInt(int(got.B)-0xa0) <= 1 && got.A == 255 {
			borderMatches++
		}
	}
	if borderMatches < 5 {
		t.Fatalf("border interior anchors matching #d040a0 = %d, want at least 5", borderMatches)
	}

	withCut := base
	withCut.ShowCutLines = true
	withCut.CutLineStyle = "solid"
	// Half-pixel placement makes the 1 px production stroke deterministic at row 20.
	withCut.CutLines = []domain.CutLine{{X1: 0, Y1: 20.5 * pixelMM, X2: 50 * pixelMM, Y2: 20.5 * pixelMM}}
	withPath, _, err := NewPrintService().GeneratePrintSheet(withCut)
	if err != nil {
		t.Fatalf("GeneratePrintSheet with cut line: %v", err)
	}
	defer os.Remove(withPath)
	with := rgbaParityDecodePNG(t, withPath)

	before := rgbaParityPixel(without, 35, 20)
	after := rgbaParityPixel(with, 35, 20)
	rgbaParityAssertNear(t, "pre-cut item fill", before, color.NRGBA{R: 0x2a, G: 0x6c, B: 0x3c, A: 255}, 1)
	rgbaParityAssertNear(t, "cut-line overlay", after, color.NRGBA{R: cutLineGray, G: cutLineGray, B: cutLineGray, A: 255}, 1)
	if before == after {
		t.Fatal("cut-line-last mutation guard failed: overlay did not replace item pixels")
	}
}

func absInt(value int) int {
	if value < 0 {
		return -value
	}
	return value
}
