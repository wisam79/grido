package service

import (
	"fmt"
	"image"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/errgroup"

	"grido/internal/core/domain"

	"github.com/fogleman/gg"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_service.go — نقطة الدخول والتحقق من صحة طلبات الطباعة
//
// تقسيم الملف الأصلي إلى مسؤوليات مفردة:
//   - print_service.go        : التحقق + تنسيق خط أنابيب التوليد
//   - print_cmyk.go           : تحويل CMYK وخطوط القص النقية
//   - print_image_pipeline.go : كاش الصور ومعالجتها (قص/تدوير/فلاتر)
//   - print_compose.go        : الرسم على كانفس الطباعة (gg)
//   - print_export.go         : حفظ المخرجات + DPI metadata + الطباعة الأصلية
// ─────────────────────────────────────────────────────────────────────────────

type PrintService struct{}

func NewPrintService() *PrintService {
	return &PrintService{}
}

// validatePrintRequest يتحقق من صحة بيانات طلب الطباعة وحجم الكانفس
func (s *PrintService) validatePrintRequest(req domain.PrintRequest) (int, int, error) {
	if req.DPI < 50 || req.DPI > 600 {
		return 0, 0, fmt.Errorf("invalid DPI: %d (must be between 50 and 600)", req.DPI)
	}
	if req.PaperWidthMM <= 10 || req.PaperWidthMM > 1000 {
		return 0, 0, fmt.Errorf("invalid PaperWidthMM: %.2f (must be between 10mm and 1000mm)", req.PaperWidthMM)
	}
	if req.PaperHeightMM <= 10 || req.PaperHeightMM > 1000 {
		return 0, 0, fmt.Errorf("invalid PaperHeightMM: %.2f (must be between 10mm and 1000mm)", req.PaperHeightMM)
	}
	if len(req.Items) > 1000 {
		return 0, 0, fmt.Errorf("too many items: %d (max limit is 1000)", len(req.Items))
	}

	widthPx := int(math.Round(mmToPx(req.PaperWidthMM, req.DPI)))
	heightPx := int(math.Round(mmToPx(req.PaperHeightMM, req.DPI)))

	if int64(widthPx)*int64(heightPx) > 144000000 { // حد أقصى 144 ميغابكسل
		return 0, 0, fmt.Errorf("requested print size is too large (total pixels exceed 144 megapixels)")
	}

	for _, item := range req.Items {
		// 🛡️ فحص قيم NaN و Inf غير المعرفة لمنع الانهيار
		if math.IsNaN(item.X) || math.IsNaN(item.Y) || math.IsNaN(item.W) || math.IsNaN(item.H) ||
			math.IsNaN(item.Zoom) || math.IsNaN(item.DragX) || math.IsNaN(item.DragY) ||
			math.IsInf(item.X, 0) || math.IsInf(item.Y, 0) || math.IsInf(item.W, 0) || math.IsInf(item.H, 0) ||
			math.IsInf(item.Zoom, 0) || math.IsInf(item.DragX, 0) || math.IsInf(item.DragY, 0) {
			return 0, 0, fmt.Errorf("invalid NaN or Inf floating point values in print item geometry")
		}

		// 🛡️ رفض هندسة عناصر غير منطقية (منع تخصيص ذاكرة ضخمة عبر W/H غير مقيد)
		// تسامح 0.1mm لامتصاص أخطاء التقريب العائمة عند تحويل بكسل→مم للعناصر
		// كاملة التغطية (Bleed) التي قد تتجاوز الورقة بأجزاء من المئة من المليمتر
		// (مثل A4@300DPI = 2480×3508 بكسل ← 209.97×297.01mm)
		if item.W <= 0 || item.H <= 0 || item.W > req.PaperWidthMM+0.1 || item.H > req.PaperHeightMM+0.1 {
			return 0, 0, fmt.Errorf("invalid item geometry: W=%.2f H=%.2f (must fit within paper %.0f×%.0f mm)", item.W, item.H, req.PaperWidthMM, req.PaperHeightMM)
		}
		// 🛡️ رفض نسب اقتصاص سلبية أو متناقضة
		if (item.CropW > 0 || item.CropH > 0) && (item.CropW <= 0 || item.CropH <= 0) {
			return 0, 0, fmt.Errorf("invalid crop region: CropW=%.2f CropH=%.2f must both be positive or both zero", item.CropW, item.CropH)
		}
	}

	for _, item := range req.Items {
		if item.ImageSrc == "" {
			continue
		}
		filePath := resolveLocalPath(item.ImageSrc)
		if strings.HasPrefix(filePath, "data:image/") {
			commaIdx := strings.Index(filePath, ",")
			if commaIdx != -1 {
				b64Len := len(filePath) - commaIdx - 1
				if b64Len > 50*1024*1024 {
					return 0, 0, fmt.Errorf("image data too large: %d bytes max", 50*1024*1024)
				}
			}
		} else {
			if _, err := os.Stat(filePath); err != nil {
				return 0, 0, fmt.Errorf("image file does not exist: %s", filepath.Base(filePath))
			}
		}
	}

	return widthPx, heightPx, nil
}

// GeneratePrintSheet يولّد ورقة الطباعة كاملة: تحقق ← تركيب ← معالجة متوازية للصور
// ← رسم تسلسلي (gg ليس آمناً للتزامن) ← خطوط قص ← حفظ المخرجات.
func (s *PrintService) GeneratePrintSheet(req domain.PrintRequest) (string, string, error) {
	// Ensure logical dimensions match orientation (defensive: callers may send raw 210x297 + landscape)
	if strings.EqualFold(req.Orientation, "landscape") && req.PaperWidthMM < req.PaperHeightMM {
		req.PaperWidthMM, req.PaperHeightMM = req.PaperHeightMM, req.PaperWidthMM
	}
	widthPx, heightPx, err := s.validatePrintRequest(req)
	if err != nil {
		return "", "", err
	}

	dc := gg.NewContext(widthPx, heightPx)

	bgColor := parseColor(req.BackgroundColor)
	dc.SetColor(bgColor)
	dc.Clear()

	imgCache := &imageCache{
		images:   make(map[string]image.Image),
		access:   make(map[string]time.Time),
		inFlight: make(map[string]*sync.Cond),
	}
	procCache := &processedCache{
		images:   make(map[processedKey]image.Image),
		access:   make(map[processedKey]time.Time),
		inFlight: make(map[processedKey]*sync.Cond),
	}

	// 0. تركيب كانفاس الوضع الحر (اختياري): يُرسم مرة واحدة بدقة الطباعة
	// ثم تُستنسخ نسخه في الخلايا — بدل لقطة كانفس + إعادة ترميز
	composedCanvas, err := s.composeCanvas(req, imgCache)
	if err != nil {
		return "", "", err
	}

	// 1. Process all images in parallel
	processedImages := make([]image.Image, len(req.Items))
	var g errgroup.Group

	// Limit concurrency to number of CPUs to avoid memory spikes and context switching overhead
	maxConcurrency := runtime.NumCPU()
	if maxConcurrency < 2 {
		maxConcurrency = 2
	}
	g.SetLimit(maxConcurrency)

	for i, item := range req.Items {
		if item.ImageSrc == "" {
			continue
		}

		// Capture loop variables for the goroutine
		i, item := i, item
		g.Go(func() error {
			img, err := s.loadAndProcessImage(item, req.DPI, imgCache, procCache)
			if err != nil {
				return err
			}
			processedImages[i] = img
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return "", "", err
	}

	// 2. Draw everything sequentially (gg.Context is NOT thread-safe)
	for i, item := range req.Items {
		if item.ImageSrc == "" {
			// عنصر بلا صورة: إذا وُجد تركيب كانفاس (وضع حر من العناصر) نرسمه في الخلية،
			// وإلا نستبقيه فارغاً (السلوك التاريخي)
			if composedCanvas != nil {
				drawItemImage(dc, composedCanvas, item, req.DPI)
			}
			continue
		}
		if processedImages[i] == nil {
			continue
		}

		drawItemImage(dc, processedImages[i], item, req.DPI)
	}

	s.drawCutLines(dc, req)

	imgCache.images = nil
	procCache.images = nil
	imgCache = nil
	procCache = nil

	return s.saveOutput(dc, req)
}
