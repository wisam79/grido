package service

import (
	"image/color"
	"math"
	"os"
	"testing"

	"grido/internal/core/domain"

	"github.com/disintegration/imaging"
)

// TestPrintService_CutLineEdgeVisibility reproduces the default full-page borderless scenario:
// A4 portrait, image fills the whole page (margin auto-zeroed), end-of-print line at
// offsetY + rows*(h+gap) - gap/2 = 298mm on a 297mm paper.
func TestPrintService_CutLineEdgeVisibility(t *testing.T) {
	// 🖨️ عقد الإدخال الإنتاجي (RV-Print-07).
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	dummyImgSrc := stagePrintTestImage(t, "dummy", 100, 100, color.RGBA{255, 255, 255, 255})

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
					{ImageSrc: dummyImgSrc, X: 0, Y: 0, W: 210, H: 297, Brightness: 100, Contrast: 100, Saturation: 100},
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

// ─── RV-16-M2: هندسة علامات القص الزاوية (cropmarks) ───

// TestCropMarkSegments_Geometry يقفل هندسة الأذرع الزاوية على هندسة معاينة
// الواجهة (print-preview.tsx): صندوق إحاطة خطوط القص + ذراع 4% من الضلع
// الأقصر (بحد أدنى 2مم) ممتدة خارج الصندوق.
func TestCropMarkSegments_Geometry(t *testing.T) {
	req := domain.PrintRequest{
		PaperWidthMM:  100,
		PaperHeightMM: 150,
		DPI:           300,
		CutLines: []domain.CutLine{
			{X1: 10, Y1: 10, X2: 10, Y2: 50},
			{X1: 10, Y1: 10, X2: 50, Y2: 10},
			{X1: math.NaN(), Y1: 0, X2: 0, Y2: 0}, // تالفة: تُتجاهل
		},
	}

	segs := cropMarkSegments(req)
	if len(segs) != 8 {
		t.Fatalf("expected 8 arm segments (2 per corner), got %d", len(segs))
	}

	// arm = max(2, min(100,150)*0.04) = 4mm
	expect := []domain.CutLine{
		{X1: 10, Y1: 10, X2: 14, Y2: 10}, // ركن (10,10): أفقي خارج +
		{X1: 10, Y1: 10, X2: 10, Y2: 14}, // ركن (10,10): رأسي خارج +
		{X1: 46, Y1: 10, X2: 50, Y2: 10}, // ركن (50,10): أفقي خارج −
		{X1: 50, Y1: 10, X2: 50, Y2: 14}, // ركن (50,10): رأسي +
		{X1: 10, Y1: 50, X2: 14, Y2: 50}, // ركن (10,50)
		{X1: 10, Y1: 46, X2: 10, Y2: 50}, // ركن (10,50): رأسي −
		{X1: 46, Y1: 50, X2: 50, Y2: 50}, // ركن (50,50)
		{X1: 50, Y1: 46, X2: 50, Y2: 50}, // ركن (50,50)
	}
	for i, want := range expect {
		if segs[i] != want {
			t.Errorf("segment %d = %+v, want %+v", i, segs[i], want)
		}
	}
}

// TestCropMarkSegments_EmptyAndAllCorrupt: لا خطوط ⇒ nil، وكل الخطوط تالفة ⇒ nil
func TestCropMarkSegments_EmptyAndAllCorrupt(t *testing.T) {
	if got := cropMarkSegments(domain.PrintRequest{}); got != nil {
		t.Errorf("empty cut lines must yield nil, got %v", got)
	}
	if got := cropMarkSegments(domain.PrintRequest{
		PaperWidthMM: 100, PaperHeightMM: 150,
		CutLines: []domain.CutLine{{X1: math.Inf(1), Y1: 0, X2: 0, Y2: 0}},
	}); got != nil {
		t.Errorf("all-corrupt cut lines must yield nil, got %v", got)
	}
}

// TestPrintService_CropMarks_CornersOnly: نمط cropmarks يرسم أذرع الزوايا فقط —
// وسط حواف الصندوق يبقى نظيفاً (كان يُرسم خطاً صلباً كاملاً مخالفاً للمعاينة).
func TestPrintService_CropMarks_CornersOnly(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	svc := NewPrintService()

	// صندوق (25,25)-(75,125) على ورقة 100×150 — arm = max(2, 100*0.04) = 4mm
	req := domain.PrintRequest{
		PaperWidthMM:    100.0,
		PaperHeightMM:   150.0,
		DPI:             300,
		BackgroundColor: "#FFFFFF",
		ShowCutLines:    true,
		CutLineStyle:    "cropmarks",
		CutLines: []domain.CutLine{
			{X1: 25, Y1: 25, X2: 75, Y2: 25},
			{X1: 25, Y1: 125, X2: 75, Y2: 125},
			{X1: 25, Y1: 25, X2: 25, Y2: 125},
			{X1: 75, Y1: 25, X2: 75, Y2: 125},
		},
		Items: []domain.PrintItem{},
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

	mmToPx := func(mm float64) int { return int(math.Round(mm * 300 / 25.4)) }
	isDark := func(xMM, yMM float64) bool {
		x, y := mmToPx(xMM), mmToPx(yMM)
		// هامش 2px لامتصاص عرض الخط
		for dy := -2; dy <= 2; dy++ {
			for dx := -2; dx <= 2; dx++ {
				px, py := x+dx, y+dy
				if px < 0 || py < 0 || px >= bounds.Dx() || py >= bounds.Dy() {
					continue
				}
				r, g, b, _ := outImg.At(px, py).RGBA()
				if int(r>>8) < 160 && int(g>>8) < 160 && int(b>>8) < 160 {
					return true
				}
			}
		}
		return false
	}

	// الأذرع قرب الركن (25,25): أفقي عند x=27, y=25 ورأسي عند x=25, y=27
	if !isDark(27, 25) {
		t.Errorf("cropmarks: horizontal arm near corner (27,25)mm not drawn")
	}
	if !isDark(25, 27) {
		t.Errorf("cropmarks: vertical arm near corner (25,27)mm not drawn")
	}
	// وسط الحواف يجب أن يبقى نظيفاً — كانت تُرسم خطوطاً كاملة
	for _, pt := range [][2]float64{{50, 25}, {25, 75}, {50, 125}, {75, 75}} {
		if isDark(pt[0], pt[1]) {
			t.Errorf("cropmarks: full line drawn at edge middle (%.0f,%.0f)mm — must be corners only", pt[0], pt[1])
		}
	}
}
