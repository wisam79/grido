package service

import (
	"image"
	"image/color"
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

			foundRed := false
			searchY := yLine
			for _, dy := range []int{0, 1, -1, 2, -2} {
				y := searchY + dy
				if y < 0 || y >= h {
					continue
				}
				for x := w / 4; x < 3*w/4; x += 3 {
					r, g, b, _ := outImg.At(x, y).RGBA()
					if int(r>>8) > 200 && int(g>>8) < 100 && int(b>>8) < 100 {
						foundRed = true
						break
					}
				}
				if foundRed {
					break
				}
			}
			if !foundRed {
				t.Errorf("cut line at %.0fmm: expected visible red dashed line around y=%dpx, but no red pixels found (clipped out of canvas?)", cyMM, yLine)
			}
		})
	}
}
