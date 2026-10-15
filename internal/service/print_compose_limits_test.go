package service

import (
	"image"
	"image/color"
	"math"
	"os"
	"strings"
	"testing"
	"time"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_compose_limits_test.go — سقوف ذاكرة كانفس التركيب والتحجيم
//
// ثغرة مثبتة: CanvasWidthMM=9000 @600DPI يعني ~212,598px ضلعاً (~180GB) تصل
// إلى gg.NewContext بلا سقف أعلى، وعنصر تركيب بـ W/H=50,000,000 يصل إلى
// imaging.Resize داخل عامل errgroup بلا سقف وبلا recover — panic في goroutine
// غير مُلتقط يقتل التطبيق كاملاً. الطبقة الدفاعية ترفض كل ذلك قبل أي تخصيص.
// ─────────────────────────────────────────────────────────────────────────────

// TestValidatePrintRequest_RejectsOversizedCompositionCanvas — سيناريو الثغرة
// نفسه (9000مم @600DPI) + تجاوز كل من ضلع 65535 والحد الإجمالي 144MP.
func TestValidatePrintRequest_RejectsOversizedCompositionCanvas(t *testing.T) {
	cases := []struct {
		name string
		comp *domain.CanvasComposition
	}{
		{
			"9000mm square at 600dpi (~180GB)",
			&domain.CanvasComposition{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: 9000, CanvasHeightMM: 9000},
		},
		{
			"one side over 65535px",
			&domain.CanvasComposition{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: 3000, CanvasHeightMM: 100},
		},
		{
			"over 144 megapixels within side caps",
			&domain.CanvasComposition{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: 2000, CanvasHeightMM: 2000},
		},
	}

	svc := NewPrintService()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := domain.PrintRequest{
				PaperWidthMM: 100, PaperHeightMM: 100, DPI: 600,
				Composition: tc.comp,
			}
			if _, _, err := svc.validatePrintRequest(req); err == nil || !strings.Contains(err.Error(), "كبير جداً") {
				t.Fatalf("expected clean oversized-canvas rejection, got: %v", err)
			}
		})
	}
}

// TestValidatePrintRequest_AcceptsCompositionAtPixelCapBoundary — 508مم @600DPI
// = 12000×12000 = 144MP بالضبط: على الحد لا فوقه فتبقى مقبولة (عدم مبالغة في الرفض).
func TestValidatePrintRequest_AcceptsCompositionAtPixelCapBoundary(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 100, PaperHeightMM: 100, DPI: 600,
		Composition: &domain.CanvasComposition{
			CanvasWidthPx: 12000, CanvasHeightPx: 12000,
			CanvasWidthMM: 508, CanvasHeightMM: 508,
		},
	}
	if _, _, err := svc.validatePrintRequest(req); err != nil {
		t.Fatalf("exactly 144MP composition must pass validation, got: %v", err)
	}
}

// TestValidatePrintRequest_RejectsNonFiniteCompositionValues — NaN/Inf تمرّ من
// حارس composeCanvas (W <= 0 لا يلتقط NaN) وعنصر NaN يفقد التحجيم معناه.
func TestValidatePrintRequest_RejectsNonFiniteCompositionValues(t *testing.T) {
	cases := []struct {
		name string
		comp *domain.CanvasComposition
	}{
		{
			"NaN canvas width MM",
			&domain.CanvasComposition{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: math.NaN(), CanvasHeightMM: 100},
		},
		{
			"+Inf canvas height MM",
			&domain.CanvasComposition{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: 100, CanvasHeightMM: math.Inf(1)},
		},
		{
			"NaN composition item W",
			&domain.CanvasComposition{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: 100, CanvasHeightMM: 100,
				Items: []domain.PrintItem{{ImageSrc: "x", W: math.NaN(), H: 10}}},
		},
		{
			"-Inf composition item H",
			&domain.CanvasComposition{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: 100, CanvasHeightMM: 100,
				Items: []domain.PrintItem{{ImageSrc: "x", W: 10, H: math.Inf(-1)}}},
		},
	}

	svc := NewPrintService()
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := domain.PrintRequest{
				PaperWidthMM: 100, PaperHeightMM: 100, DPI: 150,
				Composition: tc.comp,
			}
			if _, _, err := svc.validatePrintRequest(req); err == nil || !strings.Contains(err.Error(), "غير منتهية") {
				t.Fatalf("expected non-finite rejection, got: %v", err)
			}
		})
	}
}

// TestPrintService_HugeCompositionCanvasRejectedCleanly — سيناريو المهاجم كاملاً
// عبر GeneratePrintSheet: خطأ نظيف قبل gg.NewContext (لو نُفّذ التخصيص لانهار
// الاختبار بـ OOM بدل فشل نظيف).
func TestPrintService_HugeCompositionCanvasRejectedCleanly(t *testing.T) {
	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 100, PaperHeightMM: 100, DPI: 600,
		BackgroundColor: "#FFFFFF", ExportFormat: "png",
		Composition: &domain.CanvasComposition{
			CanvasWidthPx: 1000, CanvasHeightPx: 1000,
			CanvasWidthMM: 9000, CanvasHeightMM: 9000,
			BackgroundColor: "#FFFFFF",
		},
	}

	_, _, err := svc.GeneratePrintSheet(req)
	if err == nil {
		t.Fatal("huge composition canvas must be rejected, got nil error")
	}
	if !strings.Contains(err.Error(), "كبير جداً") {
		t.Fatalf("expected clear oversized-canvas error, got: %v", err)
	}
}

// TestPrintService_RejectsOversizedCompositionItemTarget — المسار الذي يصل إلى
// العامل: كانفس صغير مشروع + عنصر واحد ضخم (50M×50M بكسل كانفاس). يجب أن يعود
// خطأ يحمل فهرس العنصر بدل panic/OOM داخل imaging.Resize.
func TestPrintService_RejectsOversizedCompositionItemTarget(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	photo := stagePrintTestImage(t, "huge_target", 100, 100, color.RGBA{R: 10, G: 20, B: 30, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 100, PaperHeightMM: 100, DPI: 150,
		BackgroundColor: "#FFFFFF", ExportFormat: "png",
		Composition: &domain.CanvasComposition{
			CanvasWidthPx: 1000, CanvasHeightPx: 1000,
			CanvasWidthMM: 100, CanvasHeightMM: 100,
			BackgroundColor: "#FFFFFF",
			Items: []domain.PrintItem{
				{
					ImageSrc: photo, X: 0, Y: 0, W: 50_000_000, H: 50_000_000,
					Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100,
				},
			},
		},
	}

	_, _, err := svc.GeneratePrintSheet(req)
	if err == nil {
		t.Fatal("oversized composition item target must be rejected, got nil error")
	}
	if !strings.Contains(err.Error(), "العنصر 1") {
		t.Fatalf("expected item-indexed rejection error, got: %v", err)
	}
}

// TestPrintService_LegitCompositionStillSucceeds — انحدار موجب: تركيب شرعي صغير
// (بنفس نمط print_composition_integration_test.go) يجب أن يظل ينجح كاملاً.
func TestPrintService_LegitCompositionStillSucceeds(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	photo := stagePrintTestImage(t, "legit", 120, 90, color.RGBA{R: 30, G: 120, B: 200, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 100, PaperHeightMM: 100, DPI: 150,
		BackgroundColor: "#FFFFFF", ExportFormat: "png",
		Items: []domain.PrintItem{
			// خلية بلا imageSrc — يُرسم فيها الكانفاس المركّب
			{X: 10, Y: 10, W: 50, H: 50},
		},
		Composition: &domain.CanvasComposition{
			CanvasWidthPx: 1000, CanvasHeightPx: 1000,
			CanvasWidthMM: 100, CanvasHeightMM: 100,
			BackgroundColor: "#00FF00",
			Items: []domain.PrintItem{
				{
					ImageSrc: photo, X: 0, Y: 0, W: 500, H: 500,
					Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100,
				},
			},
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("legit composition must still succeed, got: %v", err)
	}
	defer os.Remove(outPath)

	if _, err := os.Stat(outPath); err != nil {
		t.Fatalf("output file does not exist: %v", err)
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Errorf("expected HTML document for iframe print")
	}
}

// TestPrintService_ZeroSizeCompositionItemStillSkipped — سلوك محفوظ (شرط composeCanvas):
// عنصر بأبعاد ≤0 يُتخطى بلا فشل الطلب كاملاً (لا يُرفض في التحقق المبكر).
func TestPrintService_ZeroSizeCompositionItemStillSkipped(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	photo := stagePrintTestImage(t, "zero_item", 80, 80, color.RGBA{R: 200, G: 40, B: 40, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 100, PaperHeightMM: 100, DPI: 150,
		BackgroundColor: "#FFFFFF", ExportFormat: "png",
		Composition: &domain.CanvasComposition{
			CanvasWidthPx: 1000, CanvasHeightPx: 1000,
			CanvasWidthMM: 100, CanvasHeightMM: 100,
			BackgroundColor: "#FFFFFF",
			Items: []domain.PrintItem{
				{ImageSrc: photo, X: 0, Y: 0, W: 0, H: 10, Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100},
				{ImageSrc: photo, X: 0, Y: 0, W: 10, H: 10, Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100},
			},
		},
	}

	outPath, _, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("zero-size composition item must be skipped, not fail the request: %v", err)
	}
	defer os.Remove(outPath)
}

// TestComposeCanvas_InvalidDimsSecondBarrierFallback — الحاجز الدفاعي الثاني:
// composeCanvas نفسه (لمن يستدعيه مباشرة) يبقى يتجاوز الأبعاد غير الصالحة
// بإرجاع (nil, nil) بدل الانهيار.
func TestComposeCanvas_InvalidDimsSecondBarrierFallback(t *testing.T) {
	svc := NewPrintService()
	cache := &imageCache{images: make(map[string]image.Image), access: make(map[string]time.Time)}

	invalids := []*domain.CanvasComposition{
		{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: math.NaN(), CanvasHeightMM: 100},
		{CanvasWidthPx: 0, CanvasHeightPx: 1000, CanvasWidthMM: 100, CanvasHeightMM: 100},
		{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: 100, CanvasHeightMM: math.Inf(1)},
		{CanvasWidthPx: 1000, CanvasHeightPx: 1000, CanvasWidthMM: -5, CanvasHeightMM: 100},
	}

	for i, comp := range invalids {
		img, err := svc.composeCanvas(domain.PrintRequest{DPI: 150, Composition: comp}, cache)
		if err != nil {
			t.Fatalf("case %d: second barrier must not error, got: %v", i, err)
		}
		if img != nil {
			t.Fatalf("case %d: second barrier must skip invalid dims (nil image), got non-nil", i)
		}
	}
}

// TestRecoverPrintWorkerPanic_ConvertsPanicToError — آلية الاسترداد المستخدمة في
// عاملي errgroup (composeCanvas + processedImages): panic يتحول لخطأ يحمل فهرس
// العنصر بدل إسقاط العملية.
func TestRecoverPrintWorkerPanic_ConvertsPanicToError(t *testing.T) {
	var err error
	func() {
		defer recoverPrintWorkerPanic(2, &err)
		panic("simulated worker panic")
	}()
	if err == nil {
		t.Fatal("panic must be converted to a returned error")
	}
	if !strings.Contains(err.Error(), "العنصر 3") || !strings.Contains(err.Error(), "simulated worker panic") {
		t.Fatalf("unexpected recovery error: %v", err)
	}

	var clean error
	func() {
		defer recoverPrintWorkerPanic(0, &clean)
	}()
	if clean != nil {
		t.Fatalf("no panic must leave error nil, got: %v", clean)
	}
}
