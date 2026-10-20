package service

import (
	"fmt"
	"image"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"strings"
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

// سقوف التوسيع الشبكي (RV-Print-01): التحقق يقيّد القوالب (1000) لكن التوسيع
// كان يحدث بعده بلا سقف — Copies=2^31 يفجّر make() فوراً. السقوف هنا تُفحص
// بجمع int64 آمن من الفيض قبل أي تخصيص، والتوسيع بعده مأمون رياضياً.
const (
	// maxCopiesPerItem أعلى عدد نسخ لعنصر شبكي واحد (يكفي ملصقات A4 حتى 100×150).
	maxCopiesPerItem = 5000
	// maxExpandedPrintCells أعلى عدد خلايا مرسومة بعد التوسيع (قالب 48×24 الشائع
	// = 1,152 خلية؛ السقف يترك هامش ×20 مع بقاء زمن الرسم محدوداً).
	maxExpandedPrintCells = 25000
	// maxCanvasPixels سقف بكسل المخرج (الورقة أو كانفس التركيب) — مصدر واحد
	// للسياسة: 144 ميغابكسل (مثال: 12000×12000 بكسل @600DPI).
	maxCanvasPixels = 144_000_000
	// maxCanvasSidePx أقصى طول لضلع واحد بالبكسل (سقف آمن لأبعاد gg/imaging).
	maxCanvasSidePx = 65535
)

type PrintService struct{}

// printJobSem يمنع تنفيذ طلبتَي طباعة معاً: كل طلب يخصّص كانفس الورقة +
// كانفس التركيب + صور العناصر المعالَجة، وتزامن طلبين كان يضاعف الذروة.
var printJobSem = make(chan struct{}, 1)

// printBatchBudgetBytes ميزانية الصور المعالَجة في الدفعة الواحدة. كانت
// المعالجة السابقة تُبقي كل صور العناصر حيّةً حتى نهاية الرسم (مجموع كامل)،
// بينما الرسم الآن يجري دفعةً بدفعة فتُحرَّر مراجع الدفعة السابقة فوراً.
const printBatchBudgetBytes = 512 << 20 // 512 MiB

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

	if int64(widthPx)*int64(heightPx) > maxCanvasPixels { // حد أقصى 144 ميغابكسل
		return 0, 0, fmt.Errorf("requested print size is too large (total pixels exceed 144 megapixels)")
	}

	// 🛡️ فحص مبكر لكانفس الوضع الحر: أبعاد ضخمة (9000مم @600DPI ≈ 212,598px
	// ≈ 180GB) كانت تصل إلى gg.NewContext/imaging.Resize بلا سقف علوي.
	// composeCanvas يبقى الحاجز الدفاعي الثاني لمن يستدعيه مباشرة.
	if err := validateCanvasComposition(req.Composition, req.DPI); err != nil {
		return 0, 0, err
	}

	// 🛡️ سقف التوسيع الشبكي قبل أي تخصيص: Copies سالبة مرفوضة، والقيمة
	// المفردة محدودة، والمجموع الكلي (قوالب + نسخ موسّعة) محدود بجمع int64
	// آمن من فيض int (Copies قيمة JSON غير موقعة عملياً قد تبلغ 1e15).
	var totalExpanded int64
	for _, item := range req.Items {
		if item.Copies < 0 {
			return 0, 0, fmt.Errorf("invalid negative copies: %d", item.Copies)
		}
		if item.Copies > maxCopiesPerItem {
			return 0, 0, fmt.Errorf("too many copies for one item: %d (max %d)", item.Copies, maxCopiesPerItem)
		}
		if item.Copies > 1 {
			totalExpanded += int64(item.Copies)
		} else {
			totalExpanded++
		}
		if totalExpanded > maxExpandedPrintCells {
			return 0, 0, fmt.Errorf("too many expanded print cells (max %d): lower copies", maxExpandedPrintCells)
		}
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
		// 🖨️ مسار مرفوض من resolveLocalPath (خارج نطاق التطبيق) — خطأ صريح
		// بدل السقوط إلى imaging.Open برسالة مضللة (RV-Print-07).
		if filePath == "" {
			return 0, 0, fmt.Errorf("image source outside allowed app directories")
		}
		if strings.HasPrefix(filePath, "data:image/") {
			commaIdx := strings.Index(filePath, ",")
			if commaIdx != -1 {
				b64Len := len(filePath) - commaIdx - 1
				if b64Len > 50*1024*1024 {
					return 0, 0, fmt.Errorf("image data too large: %d bytes max", 50*1024*1024)
				}
			}
		} else {
			info, err := os.Stat(filePath)
			if err != nil {
				return 0, 0, fmt.Errorf("image file does not exist: %s", filepath.Base(filePath))
			}
			// فحص مباشر للحجم: ملف وُضع يدوياً في Media/Exports كان يتجاوز
			// سقوف الإدخال (50/60MB) ويدخل imaging.Open مباشرة
			const maxPrintInputBytes = int64(60 * 1024 * 1024)
			if info.Size() > maxPrintInputBytes {
				return 0, 0, fmt.Errorf("image file too large: %s (%d bytes max)", filepath.Base(filePath), maxPrintInputBytes)
			}
		}
	}

	return widthPx, heightPx, nil
}

// validateCanvasComposition يرفض مبكراً أبعاد كانفس الوضع الحر غير الصالحة أو
// الضخمة قبل أي تخصيص ذاكرة. القيم غير المنتهية/≤0 لأبعاد الكانفس تُرفض صراحةً،
// والسقفان (144MP للبكسل و65535 للضلع) قبل حساب أهداف العناصر — عنصر بلا صورة
// أو بأبعاد ≤0 يبقى «يُتخطى» كما كان (composeCanvas سطر 328).
func validateCanvasComposition(comp *domain.CanvasComposition, dpi int) error {
	if comp == nil {
		return nil
	}

	if math.IsNaN(comp.CanvasWidthMM) || math.IsInf(comp.CanvasWidthMM, 0) ||
		math.IsNaN(comp.CanvasHeightMM) || math.IsInf(comp.CanvasHeightMM, 0) {
		return fmt.Errorf("أبعاد كانفس التركيب غير صالحة (قيم غير منتهية): العرض=%v الارتفاع=%v",
			comp.CanvasWidthMM, comp.CanvasHeightMM)
	}
	if comp.CanvasWidthMM <= 0 || comp.CanvasHeightMM <= 0 ||
		comp.CanvasWidthPx <= 0 || comp.CanvasHeightPx <= 0 {
		return fmt.Errorf("أبعاد كانفس التركيب يجب أن تكون أكبر من صفر: %.2f×%.2fمم (%d×%d بكسل)",
			comp.CanvasWidthMM, comp.CanvasHeightMM, comp.CanvasWidthPx, comp.CanvasHeightPx)
	}

	// السقفان على القيم العائمة قبل أي تحويل إلى int (تحويل float ضخم إلى int
	// سلوكه غير معرّف في Go؛ الفحص هنا يجعل ما بعده مأموناً رياضياً)
	outW := math.Round(mmToPx(comp.CanvasWidthMM, dpi))
	outH := math.Round(mmToPx(comp.CanvasHeightMM, dpi))
	if outW > maxCanvasSidePx || outH > maxCanvasSidePx || outW*outH > maxCanvasPixels {
		return fmt.Errorf("كانفس التركيب كبير جداً: %.0f×%.0f بكسل يتجاوز الحد الأقصى (%d ميغابكسل، ضلع أقصى %d بكسل)",
			outW, outH, maxCanvasPixels/1_000_000, maxCanvasSidePx)
	}

	// 🛡️ أبعاد العناصر غير المنتهية كانت تتسلل من حارس composeCanvas (W <= 0
	// لا يلتقط NaN)؛ الأبعاد ≤0 تبقى تُتخطى عمداً كما كان.
	for i, item := range comp.Items {
		if math.IsNaN(item.W) || math.IsInf(item.W, 0) || math.IsNaN(item.H) || math.IsInf(item.H, 0) {
			return fmt.Errorf("أبعاد العنصر %d في كانفس التركيب غير صالحة (قيم غير منتهية): العرض=%v الارتفاع=%v",
				i+1, item.W, item.H)
		}
	}
	return nil
}

// recoverPrintWorkerPanic يحوّل أي panic داخل عامل معالجة بالتوازي إلى خطأ
// مفهوم يحمل فهرس العنصر بدل إسقاط التطبيق كاملاً (panic في goroutine غير
// مُلتقط يتجاوز PanicHandler في Wails كما يتجاوز SafeGo لأنه ليس مساراً خاماً
// في errgroup). يُستدعى دائماً كـ defer مع نتيجة مُسمّاة.
func recoverPrintWorkerPanic(index int, err *error) {
	r := recover()
	if r == nil {
		return
	}
	slog.Error("print: recovered panic in parallel worker",
		"itemIndex", index, "panic", r, "stack", string(debug.Stack()))
	*err = fmt.Errorf("تعذرت معالجة العنصر %d: خطأ داخلي غير متوقع (%v)", index+1, r)
}

// expandGridItems يوسّع العناصر الشبكية (Copies > 1) إلى عناصر فردية محلياً —
// بديل تكرارها في الواجهة عبر IPC: عنصر القالب واحد والاستنساخ هنا داخل Go
// (صفر JSON مكرر، وprocCache يصير فعالاً لكل خانة فريدة بدل كل نسخة).
// تعيد nil إذا لا توجد عناصر شبكية (المسار العادي بلا نسخ/تخصيص).
func expandGridItems(items []domain.PrintItem) []domain.PrintItem {
	totalCopies := 0
	for i := range items {
		if items[i].Copies > 1 {
			totalCopies += items[i].Copies
		}
	}
	if totalCopies == 0 {
		return nil
	}

	out := make([]domain.PrintItem, 0, len(items)-countGridTemplates(items)+totalCopies)
	for _, item := range items {
		if item.Copies <= 1 {
			out = append(out, item)
			continue
		}
		cols := item.CopyCols
		if cols < 1 {
			cols = 1
		}
		for c := 0; c < item.Copies; c++ {
			copyItem := item
			copyItem.Copies, copyItem.CopyCols = 0, 0
			copyItem.CopyStepX, copyItem.CopyStepY = 0, 0
			copyItem.X = item.X + float64(c%cols)*item.CopyStepX
			copyItem.Y = item.Y + float64(c/cols)*item.CopyStepY
			out = append(out, copyItem)
		}
	}
	return out
}

func countGridTemplates(items []domain.PrintItem) int {
	n := 0
	for i := range items {
		if items[i].Copies > 1 {
			n++
		}
	}
	return n
}

// printBatchSize يحدد كم عنصراً تُعالَج صوره قبل رسمها وتحريرها. التقدير
// يعتمد على وسم العنصر النهائي (W×H بالبكسل عند DPI × 4 بايت)؛ الحد الأدنى 1
// حتى لا يتجاوز عنصر ضخم وحده الميزانية، والأقصى عدد أنوية المعالجة.
func printBatchSize(req domain.PrintRequest, maxParallel int) int {
	if len(req.Items) == 0 || maxParallel < 1 {
		return 1
	}
	var totalBytes int64
	var counted int64
	for _, item := range req.Items {
		if item.ImageSrc == "" {
			continue
		}
		w := int64(math.Round(mmToPx(item.W, req.DPI)))
		h := int64(math.Round(mmToPx(item.H, req.DPI)))
		if w <= 0 || h <= 0 {
			continue
		}
		totalBytes += w * h * 4
		counted++
	}
	if counted == 0 {
		return maxParallel
	}
	avg := totalBytes / counted
	if avg <= 0 {
		return maxParallel
	}
	size := int(int64(printBatchBudgetBytes) / avg)
	if size < 1 {
		size = 1
	}
	if size > maxParallel {
		size = maxParallel
	}
	return size
}

// GeneratePrintSheet يولّد ورقة الطباعة كاملة: تحقق ← تركيب ← معالجة متوازية للصور
// ← رسم تسلسلي (gg ليس آمناً للتزامن) ← خطوط قص ← حفظ المخرجات.
func (s *PrintService) GeneratePrintSheet(req domain.PrintRequest) (string, string, error) {
	// طلب واحد في كل مرة — يمنع مضاعفة ذروة الذاكرة عند نقرتين متتاليتين
	printJobSem <- struct{}{}
	defer func() { <-printJobSem }()

	// Ensure logical dimensions match orientation (defensive: callers may send raw 210x297 + landscape or raw 297x210 + portrait)
	// 🖨️ RV-16-L8: التبديل كان يصحح الأبعاد بصمت فتُطمس دعوات غير متسقة — يُسجَّل
	// تحذيراً الآن كي يُكتشف المرسل المخالف بدل إخفائه (عناصر وخطوط القص لا
	// تُحوَّل مع الأبعاد، فالترتيب الصحيح من المستدعي شرط صحة المخرج).
	if strings.EqualFold(req.Orientation, "landscape") && req.PaperWidthMM < req.PaperHeightMM {
		slog.Warn("print: paper dimensions swapped to match landscape orientation — caller should send normalized dimensions",
			"paperWidthMM", req.PaperWidthMM, "paperHeightMM", req.PaperHeightMM, "orientation", req.Orientation)
		req.PaperWidthMM, req.PaperHeightMM = req.PaperHeightMM, req.PaperWidthMM
	} else if (req.Orientation == "" || strings.EqualFold(req.Orientation, "portrait")) && req.PaperWidthMM > req.PaperHeightMM {
		slog.Warn("print: paper dimensions swapped to match portrait orientation — caller should send normalized dimensions",
			"paperWidthMM", req.PaperWidthMM, "paperHeightMM", req.PaperHeightMM, "orientation", req.Orientation)
		req.PaperWidthMM, req.PaperHeightMM = req.PaperHeightMM, req.PaperWidthMM
	}
	// التحقق قبل التوسيع: حد 1000 وقواعد الهندسة تُطبق على القوالب (خانات فريدة
	// حتى ~48) — النسخ تشترك في W/H والصورة فتكفي قواعد القالب، والتوسيع بعدها
	// يُبقي الحد حاجياً لحجم IPC لا لعدد الخلايا المرسومة (شبكة 48×24 = 1,152 خلية
	// كانت تُرفض لأن العناصر كانت تُكرر عبر IPC؛ الآن العناصر المستلمة 24 فقط).
	widthPx, heightPx, err := s.validatePrintRequest(req)
	if err != nil {
		return "", "", err
	}

	// توسيع العناصر الشبكية بعد التحقق — كائن الطلب قيمة محلية هنا فالتعديل آمن
	if expanded := expandGridItems(req.Items); expanded != nil {
		req.Items = expanded
	}

	dc := gg.NewContext(widthPx, heightPx)

	bgColor := parseColor(req.BackgroundColor)
	dc.SetColor(bgColor)
	dc.Clear()

	imgCache := &imageCache{
		images: make(map[string]image.Image),
		access: make(map[string]time.Time),
	}
	procCache := &processedCache{
		images: make(map[processedKey]image.Image),
		access: make(map[processedKey]time.Time),
	}

	// 0. تركيب كانفاس الوضع الحر (اختياري): يُرسم مرة واحدة بدقة الطباعة
	// ثم تُستنسخ نسخه في الخلايا — بدل لقطة كانفس + إعادة ترميز
	composedCanvas, err := s.composeCanvas(req, imgCache)
	if err != nil {
		return "", "", err
	}

	// 1+2. Process images in memory-bounded batches, drawing each batch before
	// moving on. Keeping every processed image alive until the end meant peak
	// memory grew with the number of items (sum of all processed bitmaps).
	maxParallel := runtime.NumCPU()
	if maxParallel < 2 {
		maxParallel = 2
	}
	batchSize := printBatchSize(req, maxParallel)

	drawItem := func(i int, img image.Image) {
		item := req.Items[i]
		if item.ImageSrc == "" {
			// عنصر بلا صورة: إذا وُجد تركيب كانفاس (وضع حر من العناصر) نرسمه في الخلية،
			// وإلا نستبقيه فارغاً (السلوك التاريخي)
			if composedCanvas != nil {
				drawItemImage(dc, composedCanvas, item, req.DPI)
			}
			return
		}
		if img != nil {
			drawItemImage(dc, img, item, req.DPI)
		}
	}

	for start := 0; start < len(req.Items); start += batchSize {
		end := start + batchSize
		if end > len(req.Items) {
			end = len(req.Items)
		}
		batch := make([]image.Image, end-start)

		var g errgroup.Group
		g.SetLimit(maxParallel)
		for i := start; i < end; i++ {
			if req.Items[i].ImageSrc == "" {
				continue
			}
			i := i
			g.Go(func() (err error) {
				// 🛡️ أي panic داخل عامل المعالجة يتحول لخطأ يصل للمستخدم بدل
				// إسقاط العملية كاملاً (errgroup لا يلتقط panics بذاته)
				defer recoverPrintWorkerPanic(i, &err)
				img, err := s.loadAndProcessImage(req.Items[i], req.DPI, imgCache, procCache)
				if err != nil {
					return err
				}
				batch[i-start] = img
				return nil
			})
		}
		if err := g.Wait(); err != nil {
			return "", "", err
		}

		// 2. Draw sequentially (gg.Context is NOT thread-safe)
		for i := start; i < end; i++ {
			drawItem(i, batch[i-start])
		}
		clear(batch)
	}

	// 🖨️ RV-16-M1: مسار PDF يرسم خطوط القص متجهة فوق الصورة (drawPDFCutLines)
	// فلا تُخبز نقطياً في الصورة المضمّنة — كانت تُرسم مرتين (نقطية داخل JPEG +
	// متجهة فوقه) وتتضاعف عند حافة الورقة لأن النقطية مسحوبة 1.5px للداخل
	// بينما المتجهة على المليمتر الخام.
	if !strings.EqualFold(req.ExportFormat, "pdf") {
		s.drawCutLines(dc, req)
	}

	imgCache.images = nil
	procCache.images = nil
	imgCache = nil
	procCache = nil

	return s.saveOutput(dc, req)
}
