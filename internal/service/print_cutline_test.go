package service

import (
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"testing"

	"grido/internal/core/domain"

	"github.com/disintegration/imaging"
)

// TestPrintService_CutLineEdgeVisibility reproduces the default full-page borderless scenario:
// A4 portrait, image fills the whole page (margin auto-zeroed), end-of-print line at
// offsetY + rows*(h+gap) - gap/2 = 298mm on a 297mm paper.
func TestPrintService_CutLineEdgeVisibility(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "print_cutline_edge_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	dummyImgPath := filepath.Join(tempDir, "dummy.png")
	dummyImg := image.NewRGBA(image.Rect(0, 0, 100, 100))
	for x := 0; x < 100; x++ {
		for y := 0; y < 100; y++ {
			dummyImg.Set(x, y, color.RGBA{255, 255, 255, 255})
		}
	}
	if err := imaging.Save(dummyImg, dummyImgPath); err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}

	svc := NewPrintService()

	// Case A: line at 298mm (outside 297mm paper) — must NOT silently render at the wrong place;
	// with the Go-side guard it must be clamped inside and still visible.
	// Case B: line at 296mm (inside, after the 1mm-inset frontend clamp) — must be visible.
	for name, cyMM := range map[string]float64{"at298mm": 298.0, "at296mm": 296.0} {
		t.Run(name, func(t *testing.T) {
			req := domain.PrintRequest{
				PaperWidthMM:    210.0,
				PaperHeightMM:   297.0,
				DPI:             300,
				BackgroundColor: "#FFFFFF",
				ShowCutLines:    true,
				CutLines: []domain.CutLine{
					{X1: 0, Y1: cyMM, X2: 210, Y2: cyMM},
				},
				Items: []domain.PrintItem{
					{ImageSrc: dummyImgPath, X: 0, Y: 0, W: 210, H: 297, Brightness: 100, Contrast: 100, Saturation: 100},
				},
			}

			outPath, _, err := svc.GeneratePrintSheet(req)
			if err != nil {
				t.Fatalf("GeneratePrintSheet failed: %v", err)
			}
			defer os.Remove(outPath)

			outImg, err := imaging.Open(outPath)
			if err != nil {
				t.Fatalf("failed to open output image: %v", err)
			}
			bounds := outImg.Bounds()
			w, h := bounds.Dx(), bounds.Dy()

			yLine := int(float64(cyMM) * 300 / 25.4)

			// The line must be fully inside the canvas (clamped), not clipped away.
			if yLine >= h {
				yLine = h - 3
			}

			foundBlack := false
			searchY := yLine
			for _, dy := range []int{0, 1, -1, 2, -2} {
				y := searchY + dy
				if y < 0 || y >= h {
					continue
				}
				for x := w / 4; x < 3*w/4; x += 3 {
					r, g, b, _ := outImg.At(x, y).RGBA()
					if int(r>>8) < 160 && int(g>>8) < 160 && int(b>>8) < 160 {
						foundBlack = true
						break
					}
				}
				if foundBlack {
					break
				}
			}
			if !foundBlack {
				t.Errorf("cut line at %.0fmm: expected visible black dashed line around y=%dpx, but no dark pixels found (clipped out of canvas?)", cyMM, yLine)
			}
		})
	}
}

func TestPrintService_UserLoggedCutLines(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    210.0,
		PaperHeightMM:   297.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ShowCutLines:    true,
		ColorSpace:      "CMYK",
		ExportFormat:    "tiff",
		CutLines: []domain.CutLine{
			{X1: 4.01, Y1: 4, X2: 4.01, Y2: 86},
			{X1: 37.01, Y1: 4, X2: 37.01, Y2: 86},
			{X1: 71.01, Y1: 4, X2: 71.01, Y2: 86},
			{X1: 105.01, Y1: 4, X2: 105.01, Y2: 86},
			{X1: 139.01, Y1: 4, X2: 139.01, Y2: 86},
			{X1: 172.01, Y1: 4, X2: 172.01, Y2: 86},
			{X1: 4.01, Y1: 4, X2: 172.01, Y2: 4},
			{X1: 4.01, Y1: 45, X2: 172.01, Y2: 45},
			{X1: 0, Y1: 86, X2: 210, Y2: 86},
		},
		Items: []domain.PrintItem{},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("GeneratePrintSheet failed: %v", err)
	}
	t.Logf("outPath: %s", outPath)
	t.Logf("htmlDoc len: %d", len(htmlDoc))

	outImg, err := imaging.Open(outPath)
	if err != nil {
		t.Fatalf("failed to open output image: %v", err)
	}

	// Verify line at y=86mm (px ~ 1016)
	bounds := outImg.Bounds()
	yPx := int(math.Round(86.0 * 300.0 / 25.4))
	foundDark := false
	for x := 100; x < bounds.Dx()-100; x++ {
		r, g, b, _ := outImg.At(x, yPx).RGBA()
		if (r>>8) < 100 && (g>>8) < 100 && (b>>8) < 100 {
			foundDark = true
			break
		}
	}
	if !foundDark {
		t.Errorf("line at y=86mm not found in exported image")
	}
}
