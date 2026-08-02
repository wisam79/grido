package service

import (
	"image/color"
	"math"
	"os"
	"path/filepath"
	"testing"

	"grido/internal/core/domain"

	"github.com/disintegration/imaging"
)

// TestPrintService_MultiCellAndCutLines is a regression test for two combined bugs:
//  1. Only the first cell was rendered (gg v1.3.0 Push/Clip/Pop accumulates the mask,
//     so every later cell was clipped to the intersection of all previous clips → empty).
//  2. Cut lines outside the last item's clip region were invisible for the same reason.
func TestPrintService_MultiCellAndCutLines(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "print_multicell")
	if err != nil {
		t.Fatalf("temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// One solid-colored dummy image per slot (cell-sized 105x148.5mm @ 300 DPI)
	colors := map[string]color.RGBA{
		"red":    {R: 255, G: 0, B: 0, A: 255},
		"green":  {R: 0, G: 255, B: 0, A: 255},
		"blue":   {R: 0, G: 0, B: 255, A: 255},
		"yellow": {R: 255, G: 255, B: 0, A: 255},
	}
	paths := map[string]string{}
	for name, c := range colors {
		p := filepath.Join(tempDir, name+".png")
		img := imaging.New(1240, 1755, c)
		if err := imaging.Save(img, p); err != nil {
			t.Fatalf("save %s: %v", name, err)
		}
		paths[name] = p
	}

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM:    210.0,
		PaperHeightMM:   297.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ShowCutLines:    true,
		// 2x2 grid cut lines exactly as calculatePrintCutLines would emit them
		CutLines: []domain.CutLine{
			{X1: 0, Y1: 0, X2: 0, Y2: 297},
			{X1: 105, Y1: 0, X2: 105, Y2: 297},
			{X1: 210, Y1: 0, X2: 210, Y2: 297},
			{X1: 0, Y1: 0, X2: 210, Y2: 0},
			{X1: 0, Y1: 148.5, X2: 210, Y2: 148.5},
			{X1: 0, Y1: 297, X2: 210, Y2: 297},
		},
		Items: []domain.PrintItem{
			{ImageSrc: paths["red"], X: 0, Y: 0, W: 105, H: 148.5, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: paths["green"], X: 107, Y: 0, W: 105, H: 148.5, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: paths["blue"], X: 0, Y: 150.5, W: 105, H: 148.5, Brightness: 100, Contrast: 100, Saturation: 100},
			{ImageSrc: paths["yellow"], X: 107, Y: 150.5, W: 105, H: 148.5, Brightness: 100, Contrast: 100, Saturation: 100},
		},
	}

	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("GeneratePrintSheet: %v", err)
	}
	defer os.Remove(outPath)

	outImg, err := imaging.Open(outPath)
	if err != nil {
		t.Fatalf("open output: %v", err)
	}
	bounds := outImg.Bounds()
	if bounds.Dx() != 2480 || bounds.Dy() != 3508 {
		t.Fatalf("unexpected output size %dx%d", bounds.Dx(), bounds.Dy())
	}

	// 1. Every cell must be visible with its own color at its expected position
	type sample struct {
		mmX, mmY float64
		expect   color.RGBA
	}
	samples := []sample{
		{52.5, 74, colors["red"]},
		{157.5, 74, colors["green"]},
		{52.5, 223, colors["blue"]},
		{157.5, 223, colors["yellow"]},
	}
	for _, s := range samples {
		x := int(math.Round(s.mmX * 300 / 25.4))
		y := int(math.Round(s.mmY * 300 / 25.4))
		r, g, b, _ := outImg.At(x, y).RGBA()
		got := color.RGBA{R: uint8(r >> 8), G: uint8(g >> 8), B: uint8(b >> 8), A: 255}
		if got != s.expect {
			t.Errorf("cell at (%.1f, %.1f)mm: expected %v, got %v", s.mmX, s.mmY, s.expect, got)
		}
	}

	// 2. Cut lines must be visible along their full length (dashed → many dark pixels)
	verticalX := int(math.Round(105 * 300 / 25.4))
	verticalHits := 0
	for y := 0; y < bounds.Dy(); y++ {
		r, g, b, _ := outImg.At(verticalX, y).RGBA()
		if int(r>>8) < 160 && int(g>>8) < 160 && int(b>>8) < 160 {
			verticalHits++
		}
	}
	if verticalHits == 0 {
		t.Error("vertical cut line at x=105mm: no dark pixels found")
	}

	horizontalY := int(math.Round(148.5 * 300 / 25.4))
	horizontalHits := 0
	for x := 0; x < bounds.Dx(); x++ {
		r, g, b, _ := outImg.At(x, horizontalY).RGBA()
		if int(r>>8) < 160 && int(g>>8) < 160 && int(b>>8) < 160 {
			horizontalHits++
		}
	}
	if horizontalHits == 0 {
		t.Error("horizontal cut line at y=148.5mm: no dark pixels found")
	}
}
