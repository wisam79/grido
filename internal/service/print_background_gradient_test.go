package service

import (
	"context"
	"errors"
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"

	"github.com/fogleman/gg"
)

func backgroundTestRGBA(c color.Color) color.RGBA {
	r, g, b, a := c.RGBA()
	return color.RGBA{R: uint8(r >> 8), G: uint8(g >> 8), B: uint8(b >> 8), A: uint8(a >> 8)}
}

func newBackgroundTestContext(w, h int) *gg.Context {
	dc := gg.NewContext(w, h)
	dc.SetColor(color.White)
	dc.Clear()
	return dc
}

func TestDrawBackgroundBlocks_GradientAnglesMatchFrontendGeometry(t *testing.T) {
	const (
		width  = 100
		height = 60
	)
	for _, angle := range []float64{0, 45, 90, 135, 270} {
		t.Run(strconv.FormatFloat(angle, 'f', -1, 64), func(t *testing.T) {
			dc := newBackgroundTestContext(width, height)
			drawBackgroundBlocks(dc, []domain.PrintBackgroundBlock{{
				X: 0, Y: 0, W: width / 10.0, H: height / 10.0,
				Color: "#ff0000", Color2: "#0000ff", Angle: angle,
			}}, 254)

			rad := angle * math.Pi / 180
			dx, dy := math.Cos(rad)*0.5, math.Sin(rad)*0.5
			startX, startY := (0.5-dx)*width, (0.5-dy)*height
			endX, endY := (0.5+dx)*width, (0.5+dy)*height
			vx, vy := endX-startX, endY-startY
			denom := vx*vx + vy*vy
			project := func(x, y float64) float64 {
				return ((x-startX)*vx + (y-startY)*vy) / denom
			}

			var low, high color.RGBA
			lowT, highT := math.Inf(1), math.Inf(-1)
			for y := 1; y < height-1; y++ {
				for x := 1; x < width-1; x++ {
					v := project(float64(x), float64(y))
					if v < lowT {
						lowT, low = v, backgroundTestRGBA(dc.Image().At(x, y))
					}
					if v > highT {
						highT, high = v, backgroundTestRGBA(dc.Image().At(x, y))
					}
				}
			}
			if low.R <= low.B+100 {
				t.Fatalf("angle %.0f start-side color = %+v, want red-dominant", angle, low)
			}
			if high.B <= high.R+100 {
				t.Fatalf("angle %.0f end-side color = %+v, want blue-dominant", angle, high)
			}
		})
	}
}

func TestDrawBackgroundBlocks_AreLocalAndRepeatDeterministically(t *testing.T) {
	dc := newBackgroundTestContext(80, 30)
	blocks := []domain.PrintBackgroundBlock{
		{X: 1, Y: 0.5, W: 2, H: 1, Color: "#ff0000", Color2: "#0000ff", Angle: 0},
		{X: 4.5, Y: 0.5, W: 2, H: 1, Color: "#ff0000", Color2: "#0000ff", Angle: 0},
	}
	drawBackgroundBlocks(dc, blocks, 254)

	for _, pair := range [][2]image.Point{{{11, 10}, {46, 10}}, {{20, 10}, {55, 10}}, {{28, 10}, {63, 10}}} {
		left := backgroundTestRGBA(dc.Image().At(pair[0].X, pair[0].Y))
		right := backgroundTestRGBA(dc.Image().At(pair[1].X, pair[1].Y))
		if left != right {
			t.Fatalf("local gradient mismatch at %v/%v: %+v vs %+v", pair[0], pair[1], left, right)
		}
	}
	if got := backgroundTestRGBA(dc.Image().At(int(mmToPx(3.8, 254)), int(mmToPx(1, 254)))); got != (color.RGBA{R: 255, G: 255, B: 255, A: 255}) {
		t.Fatalf("gradient leaked outside block: %+v", got)
	}
}

func TestDrawBackgroundBlocks_SolidPreservedAndItemsOverlay(t *testing.T) {
	dc := newBackgroundTestContext(50, 30)
	drawBackgroundBlocks(dc, []domain.PrintBackgroundBlock{{X: 0.5, Y: 0.5, W: 3, H: 1.5, Color: "#00ff00"}}, 254)
	if got := backgroundTestRGBA(dc.Image().At(10, 10)); got != (color.RGBA{G: 255, A: 255}) {
		t.Fatalf("solid background block = %+v, want green", got)
	}
	drawItemImage(dc, nil, domain.PrintItem{X: 0.8, Y: 0.8, W: 0.8, H: 0.8, BgColor: "#000000"}, 254)
	if got := backgroundTestRGBA(dc.Image().At(10, 10)); got != (color.RGBA{A: 255}) {
		t.Fatalf("item did not overlay background block: %+v", got)
	}
}

func TestValidatePrintRequest_Wave2FContract(t *testing.T) {
	base := domain.PrintRequest{PaperWidthMM: 100, PaperHeightMM: 100, DPI: 100}
	validItem := domain.PrintItem{X: 1, Y: 1, W: 10, H: 10, Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100}

	tests := []struct {
		name string
		edit func(*domain.PrintRequest)
		want string
	}{
		{"paper finite", func(r *domain.PrintRequest) { r.MarginMM = math.NaN() }, "must be finite"},
		{"enum orientation", func(r *domain.PrintRequest) { r.Orientation = "sideways" }, "unsupported print orientation"},
		{"enum orientation whitespace", func(r *domain.PrintRequest) { r.Orientation = " portrait " }, "unsupported print orientation"},
		{"enum cut line", func(r *domain.PrintRequest) { r.CutLineStyle = "zigzag" }, "unsupported cut line style"},
		{"enum color space", func(r *domain.PrintRequest) { r.ColorSpace = "Lab" }, "unsupported print color space"},
		{"enum format", func(r *domain.PrintRequest) { r.ExportFormat = "bmp" }, "unsupported print export format"},
		{"cut line finite", func(r *domain.PrintRequest) { r.CutLines = []domain.CutLine{{X1: math.NaN()}} }, "cut line 1"},
		{"top filter", func(r *domain.PrintRequest) { r.Items = []domain.PrintItem{validItem}; r.Items[0].Filter = "bogus" }, "unsupported print image filter"},
		{"top adjustment", func(r *domain.PrintRequest) { r.Items = []domain.PrintItem{validItem}; r.Items[0].Brightness = 201 }, "outside range"},
		{"composition filter", func(r *domain.PrintRequest) {
			r.Composition = &domain.CanvasComposition{CanvasWidthPx: 10, CanvasHeightPx: 10, CanvasWidthMM: 10, CanvasHeightMM: 10, Items: []domain.PrintItem{validItem}}
			r.Composition.Items[0].Filter = "bogus"
		}, "composition item 1"},
		{"background finite", func(r *domain.PrintRequest) {
			r.BackgroundBlocks = []domain.PrintBackgroundBlock{{X: math.Inf(1), W: 10, H: 10, Color: "#fff"}}
		}, "must be finite"},
		{"background angle", func(r *domain.PrintRequest) {
			r.BackgroundBlocks = []domain.PrintBackgroundBlock{{W: 10, H: 10, Color: "#fff", Angle: 361}}
		}, "between 0 and 360"},
		{"background bounds", func(r *domain.PrintRequest) {
			r.BackgroundBlocks = []domain.PrintBackgroundBlock{{X: 95, Y: 0, W: 10, H: 10, Color: "#fff"}}
		}, "must fit within paper"},
		{"background color", func(r *domain.PrintRequest) {
			r.BackgroundBlocks = []domain.PrintBackgroundBlock{{W: 10, H: 10, Color: "red"}}
		}, "unsupported color"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := base
			tc.edit(&req)
			if _, _, err := NewPrintService().validatePrintRequest(req); err == nil || !strings.Contains(err.Error(), tc.want) {
				t.Fatalf("error = %v, want substring %q", err, tc.want)
			}
		})
	}
}

func TestPrintJobID_IsSafeUniqueAndCallerCancelable(t *testing.T) {
	for _, id := range []string{" job", "../job", "job/id", strings.Repeat("a", maxPrintJobIDLength+1)} {
		if _, err := normalizeRequestedPrintJobID(id); err == nil {
			t.Fatalf("unsafe job id %q accepted", id)
		}
	}

	id, ctx, cancel, err := newPrintJob(context.Background(), "client-job_42")
	if err != nil || id != "client-job_42" {
		t.Fatalf("newPrintJob = %q, %v", id, err)
	}
	defer removePrintJob(id, cancel)
	if _, _, duplicateCancel, err := newPrintJob(context.Background(), id); err == nil {
		if duplicateCancel != nil {
			duplicateCancel()
		}
		t.Fatal("duplicate active job id accepted")
	}
	if err := CancelPrintJob(id); err != nil {
		t.Fatalf("CancelPrintJob: %v", err)
	}
	if !errors.Is(ctx.Err(), context.Canceled) {
		t.Fatalf("caller-owned job context = %v, want canceled", ctx.Err())
	}
}

func TestCompletePrintJob_ClosesCancellationRace(t *testing.T) {
	id, ctx, cancel, err := newPrintJob(context.Background(), "complete-race")
	if err != nil {
		t.Fatal(err)
	}
	if err := completePrintJob(id, ctx, cancel); err != nil {
		t.Fatalf("completePrintJob: %v", err)
	}
	if err := CancelPrintJob(id); err == nil {
		t.Fatal("completed job remained cancellable")
	}

	id, ctx, cancel, err = newPrintJob(context.Background(), "cancel-race")
	if err != nil {
		t.Fatal(err)
	}
	if err := CancelPrintJob(id); err != nil {
		t.Fatal(err)
	}
	if err := completePrintJob(id, ctx, cancel); !errors.Is(err, context.Canceled) {
		t.Fatalf("completion after cancellation = %v, want context.Canceled", err)
	}
	removePrintJob(id, cancel)
}

func TestPrintCancellation_DeterministicBarriersLeaveNoOutput(t *testing.T) {
	stages := []printGenerationStage{printStageDrawBefore, printStageSaveBefore, printStageSaveAfter}
	for _, stage := range stages {
		t.Run(strconv.Itoa(int(stage)), func(t *testing.T) {
			appDir := t.TempDir()
			t.Setenv("GRIDO_APP_DIR", appDir)
			req := domain.PrintRequest{
				JobID: "cancel-" + strconv.Itoa(int(stage)), PaperWidthMM: 20, PaperHeightMM: 20, DPI: 100,
				BackgroundColor: "#ffffff", ExportFormat: "png",
				Items: []domain.PrintItem{{X: 1, Y: 1, W: 5, H: 5, BgColor: "#000000"}},
			}

			reached := make(chan struct{})
			release := make(chan struct{})
			var once sync.Once
			barrier := func(got printGenerationStage, _ int) {
				if got != stage {
					return
				}
				once.Do(func() { close(reached) })
				<-release
			}
			done := make(chan error, 1)
			go func() {
				_, _, err := NewPrintService().generatePrintSheet(context.Background(), req, barrier)
				done <- err
			}()
			<-reached
			if err := CancelPrintJob(req.JobID); err != nil {
				t.Fatalf("CancelPrintJob: %v", err)
			}
			close(release)
			if err := <-done; !errors.Is(err, context.Canceled) {
				t.Fatalf("generation error = %v, want context.Canceled", err)
			}
			entries, err := os.ReadDir(utils.GetExportsDir())
			if err != nil {
				t.Fatal(err)
			}
			for _, entry := range entries {
				if strings.HasPrefix(entry.Name(), "print_") || strings.HasSuffix(entry.Name(), ".tmp") {
					t.Fatalf("cancelled generation left output %s", filepath.Join(utils.GetExportsDir(), entry.Name()))
				}
			}
		})
	}
}

func TestComposeCanvas_CancelledBeforeScheduling(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	cache := &imageCache{images: make(map[string]image.Image), access: make(map[string]time.Time)}
	_, err := NewPrintService().composeCanvas(ctx, domain.PrintRequest{
		DPI:         100,
		Composition: &domain.CanvasComposition{CanvasWidthPx: 10, CanvasHeightPx: 10, CanvasWidthMM: 10, CanvasHeightMM: 10},
	}, cache, nil)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("composeCanvas error = %v, want context.Canceled", err)
	}
}

func TestComposeCanvas_CancelledInsideWorkerAfterProcessing(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	src := stagePrintTestImage(t, "compose-cancel", 8, 8, color.RGBA{R: 40, G: 80, B: 120, A: 255})
	ctx, cancel := context.WithCancel(context.Background())
	cache := &imageCache{images: make(map[string]image.Image), access: make(map[string]time.Time)}
	barrier := func(stage printGenerationStage, _ int) {
		if stage == printStageComposeWorkerAfter {
			cancel()
		}
	}
	_, err := NewPrintService().composeCanvas(ctx, domain.PrintRequest{
		DPI: 100,
		Composition: &domain.CanvasComposition{
			CanvasWidthPx: 10, CanvasHeightPx: 10, CanvasWidthMM: 10, CanvasHeightMM: 10,
			Items: []domain.PrintItem{{ImageSrc: src, W: 10, H: 10, Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100}},
		},
	}, cache, barrier)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("composeCanvas error = %v, want context.Canceled", err)
	}
}
