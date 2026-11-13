package service

import (
	"context"
	"fmt"
	"image"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"runtime/debug"
	"strings"
	"sync"
	"sync/atomic"
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
	// maxBackgroundBlocks bounds page-local fills independently of print items.
	maxBackgroundBlocks = 1000
	// maxCanvasPixels سقف بكسل المخرج (الورقة أو كانفس التركيب) — مصدر واحد
	// للسياسة: 144 ميغابكسل (مثال: 12000×12000 بكسل @600DPI).
	maxCanvasPixels = 144_000_000
	// maxCanvasSidePx أقصى طول لضلع واحد بالبكسل (سقف آمن لأبعاد gg/imaging).
	maxCanvasSidePx = 65535
	// Client-owned generation IDs are deliberately narrow: they cross IPC, become
	// registry keys, and are echoed in cancellation errors/logs.
	maxPrintJobIDLength = 96
)

var safePrintJobID = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]*$`)

type PrintService struct{}

type printGenerationStage uint8

const (
	printStageRegistered printGenerationStage = iota
	printStageComposeWorkerBefore
	printStageComposeWorkerAfter
	printStageDrawBefore
	printStageSaveBefore
	printStageSaveAfter
)

type printGenerationBarrier func(stage printGenerationStage, index int)

func reachPrintGenerationBarrier(barrier printGenerationBarrier, stage printGenerationStage, index int) {
	if barrier != nil {
		barrier(stage, index)
	}
}

// printJobSem يمنع تنفيذ طلبتَي طباعة معاً: كل طلب يخصّص كانفس الورقة +
// كانفس التركيب + صور العناصر المعالَجة، وتزامن طلبين كان يضاعف الذروة.
var printJobSem = make(chan struct{}, 1)

// printBatchBudgetBytes ميزانية الصور المعالَجة في الدفعة الواحدة. كانت
// المعالجة السابقة تُبقي كل صور العناصر حيّةً حتى نهاية الرسم (مجموع كامل)،
// بينما الرسم الآن يجري دفعةً بدفعة فتُحرَّر مراجع الدفعة السابقة فوراً.
const printBatchBudgetBytes = 512 << 20 // 512 MiB

// ─────────────────────────────────────────────────────────────────────────────
// 🛑 إلغاء مهام الطباعة (C4): سجل المهام الجارية + سياق قابل للإلغاء لكل مهمة.
// PrintService ليس معروضاً لـ IPC مباشرة (الربطات عبر PrintHandler حصراً) —
// الواجهة الجديدة هي PrintHandler.CancelPrintJob(jobID) والمتكامل يولّد
// ربطاتها. لا تغيير على توقيعات الدوال المعرضة الحالية.
// ─────────────────────────────────────────────────────────────────────────────

var activePrintJobs = struct {
	mu   sync.Mutex
	jobs map[string]context.CancelFunc
}{jobs: make(map[string]context.CancelFunc)}

// printJobSeq مولّد تفرد لمعرّفات المهام (زمنياً + عدّاد) ضد أي تصادم.
var printJobSeq atomic.Int64

// normalizeRequestedPrintJobID accepts only a bounded, log-safe identifier. An
// empty value preserves legacy callers by selecting a generated identifier.
func normalizeRequestedPrintJobID(requested string) (string, error) {
	if requested == "" {
		return "", nil
	}
	if requested != strings.TrimSpace(requested) {
		return "", fmt.Errorf("invalid print job id: leading or trailing whitespace is not allowed")
	}
	if len(requested) > maxPrintJobIDLength || !safePrintJobID.MatchString(requested) {
		return "", fmt.Errorf("invalid print job id: use 1-%d ASCII letters, digits, dot, underscore, or hyphen", maxPrintJobIDLength)
	}
	return requested, nil
}

func generatedPrintJobID() string {
	return fmt.Sprintf("print-%d-%d", time.Now().UnixNano(), printJobSeq.Add(1))
}

// newPrintJob registers before semaphore acquisition so cancellation also reaches
// queued jobs. A caller-supplied ID must be unique among active jobs.
func newPrintJob(parent context.Context, requested string) (string, context.Context, context.CancelFunc, error) {
	jobID, err := normalizeRequestedPrintJobID(requested)
	if err != nil {
		return "", nil, nil, err
	}
	if jobID == "" {
		jobID = generatedPrintJobID()
	}

	ctx, cancel := context.WithCancel(parent)
	activePrintJobs.mu.Lock()
	if _, exists := activePrintJobs.jobs[jobID]; exists {
		activePrintJobs.mu.Unlock()
		cancel()
		return "", nil, nil, fmt.Errorf("print job id is already active: %s", jobID)
	}
	activePrintJobs.jobs[jobID] = cancel
	activePrintJobs.mu.Unlock()
	return jobID, ctx, cancel, nil
}

// removePrintJob يمسح المهمة من السجل ويحرر موارد السياق — يُستدعى بـ defer
// في كل مخارج التوليد.
func removePrintJob(jobID string, cancel context.CancelFunc) {
	activePrintJobs.mu.Lock()
	delete(activePrintJobs.jobs, jobID)
	activePrintJobs.mu.Unlock()
	cancel()
}

// completePrintJob atomically closes the registry race at successful return:
// cancellation that acquires the same lock first wins; cancellation after deletion
// receives "not found" and cannot claim that a completed output was cancelled.
func completePrintJob(jobID string, ctx context.Context, cancel context.CancelFunc) error {
	activePrintJobs.mu.Lock()
	if err := ctx.Err(); err != nil {
		activePrintJobs.mu.Unlock()
		return err
	}
	delete(activePrintJobs.jobs, jobID)
	activePrintJobs.mu.Unlock()
	cancel()
	return nil
}

// CancelPrintJob يلغي مهمة توليد ورقة طباعة جارية بمعرّفها المسجّل — تتوقف
// عند أول نقطة تحقق (انتظار الـsemaphore، بدء معالجة عنصر، حد الدفعة، قبل
// الحفظ). معرّف غير موجود أو مهمة انتهت أصلاً = خطأ صريح واضح.
func CancelPrintJob(jobID string) error {
	validated, err := normalizeRequestedPrintJobID(jobID)
	if err != nil {
		return err
	}
	if validated == "" {
		return fmt.Errorf("print job id is empty")
	}
	activePrintJobs.mu.Lock()
	cancel, ok := activePrintJobs.jobs[validated]
	if ok {
		cancel()
	}
	activePrintJobs.mu.Unlock()
	if !ok {
		return fmt.Errorf("print job not found (unknown id or already finished): %s", validated)
	}
	return nil
}

// CancelAllPrintJobs يلغي كل مهام توليد ورقة الطباعة المسجّلة (الجارية
// والمنتظرة على الـsemaphore) — يُستخدم عند إلغاء المستخدم من حوار الطباعة
// حيث لا تعرف الواجهة معرّف المهمة الفردي أثناء تنفيذ ExportPrintSheet.
// الإلغاء يمسّ التوليد الحسابي فقط ولا يمس مهام سبول الطابعة المرسلة أصلاً
// (لها AbortDoc ومسارات إلغاء النظام الخاصة بها). لا مهام = خطأ صريح،
// والواجهة تتعامل معه كـno-op صامت.
func CancelAllPrintJobs() error {
	activePrintJobs.mu.Lock()
	cancels := make([]context.CancelFunc, 0, len(activePrintJobs.jobs))
	for _, cancel := range activePrintJobs.jobs {
		cancels = append(cancels, cancel)
	}
	activePrintJobs.mu.Unlock()
	if len(cancels) == 0 {
		return fmt.Errorf("no active print jobs to cancel")
	}
	for _, cancel := range cancels {
		cancel()
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧠 جسر العمل الثقيل (C6): علامات MarkHeavyWorkStart/End في MemoryService
// تجعل التقليم التلقائي يتخطى الفحص كلياً أثناء التوليد. PrintService لا يملك
// مثال MemoryService (يُبنى في main.go / app.go خارج ملفات هذه الدفعة) —
// الجسر يُضبط بخط واحد من التكوين الجذري: service.SetPrintMemoryBridge(memorySvc)
// وقبل ضبطه تبقى العلامات no-op بلا انكسار.
// ─────────────────────────────────────────────────────────────────────────────

var printMemoryBridge atomic.Pointer[MemoryService]

// SetPrintMemoryBridge يربط خدمة الذاكرة بعلامات العمل الثقيل لمسار الطباعة.
func SetPrintMemoryBridge(ms *MemoryService) { printMemoryBridge.Store(ms) }

func NewPrintService() *PrintService {
	return &PrintService{}
}

func enumAllowed(value string, allow ...string) bool {
	for _, candidate := range allow {
		if strings.EqualFold(value, candidate) {
			return true
		}
	}
	return false
}

func validatePrintItem(item domain.PrintItem, index int, scope string) error {
	fields := []struct {
		name  string
		value float64
	}{
		{"x", item.X}, {"y", item.Y}, {"w", item.W}, {"h", item.H},
		{"cropX", item.CropX}, {"cropY", item.CropY}, {"cropW", item.CropW}, {"cropH", item.CropH},
		{"cornerRadiusMM", item.CornerRadiusMM}, {"borderWidthMM", item.BorderWidthMM},
		{"rotation", item.Rotation}, {"slotAspect", item.SlotAspect}, {"zoom", item.Zoom},
		{"dragX", item.DragX}, {"dragY", item.DragY},
		{"copyStepX", item.CopyStepX}, {"copyStepY", item.CopyStepY},
	}
	for _, field := range fields {
		if math.IsNaN(field.value) || math.IsInf(field.value, 0) {
			return fmt.Errorf("%s item %d %s has invalid NaN or Inf value (غير منتهية)", scope, index+1, field.name)
		}
	}
	if err := ValidatePrintImageFilter(item.Filter); err != nil {
		return fmt.Errorf("%s item %d: %w", scope, index+1, err)
	}
	if err := ValidatePrintImageAdjustments(item.Brightness, item.Contrast, item.Saturation); err != nil {
		return fmt.Errorf("%s item %d: %w", scope, index+1, err)
	}
	return nil
}

func validateCutLines(lines []domain.CutLine) error {
	for i, line := range lines {
		fields := []struct {
			name  string
			value float64
		}{{"x1", line.X1}, {"y1", line.Y1}, {"x2", line.X2}, {"y2", line.Y2}}
		for _, field := range fields {
			if math.IsNaN(field.value) || math.IsInf(field.value, 0) {
				return fmt.Errorf("cut line %d %s must be finite", i+1, field.name)
			}
		}
	}
	return nil
}

func validateBackgroundBlocks(blocks []domain.PrintBackgroundBlock, paperW, paperH float64) error {
	if len(blocks) > maxBackgroundBlocks {
		return fmt.Errorf("too many background blocks: %d (max limit is %d)", len(blocks), maxBackgroundBlocks)
	}
	for i, block := range blocks {
		fields := []struct {
			name  string
			value float64
		}{{"x", block.X}, {"y", block.Y}, {"w", block.W}, {"h", block.H}, {"angle", block.Angle}}
		for _, field := range fields {
			if math.IsNaN(field.value) || math.IsInf(field.value, 0) {
				return fmt.Errorf("background block %d %s must be finite", i+1, field.name)
			}
		}
		if block.Angle < 0 || block.Angle > 360 {
			return fmt.Errorf("background block %d angle %.4g must be between 0 and 360 degrees", i+1, block.Angle)
		}
		if block.W <= 0 || block.H <= 0 || block.X < 0 || block.Y < 0 ||
			block.X+block.W > paperW || block.Y+block.H > paperH {
			return fmt.Errorf("background block %d must fit within paper %.2fx%.2f mm", i+1, paperW, paperH)
		}
		if err := validatePrintColor(block.Color, false); err != nil {
			return fmt.Errorf("background block %d color: %w", i+1, err)
		}
		if block.Color2 != "" {
			if err := validatePrintColor(block.Color2, false); err != nil {
				return fmt.Errorf("background block %d color2: %w", i+1, err)
			}
		}
	}
	return nil
}

// validatePrintRequest يتحقق من صحة بيانات طلب الطباعة وحجم الكانفس
func (s *PrintService) validatePrintRequest(req domain.PrintRequest) (int, int, error) {
	if _, err := normalizeRequestedPrintJobID(req.JobID); err != nil {
		return 0, 0, err
	}
	if math.IsNaN(req.PaperWidthMM) || math.IsInf(req.PaperWidthMM, 0) ||
		math.IsNaN(req.PaperHeightMM) || math.IsInf(req.PaperHeightMM, 0) ||
		math.IsNaN(req.MarginMM) || math.IsInf(req.MarginMM, 0) ||
		math.IsNaN(req.GapMM) || math.IsInf(req.GapMM, 0) {
		return 0, 0, fmt.Errorf("paper width, height, margin, and gap must be finite")
	}
	if req.MarginMM < 0 || req.GapMM < 0 {
		return 0, 0, fmt.Errorf("paper margin and gap must be non-negative")
	}
	if !enumAllowed(req.Orientation, "", "portrait", "landscape") {
		return 0, 0, fmt.Errorf("unsupported print orientation %q", req.Orientation)
	}
	if !enumAllowed(req.CutLineStyle, "", "dashed", "dotted", "solid", "cropmarks") {
		return 0, 0, fmt.Errorf("unsupported cut line style %q", req.CutLineStyle)
	}
	if !enumAllowed(req.ColorSpace, "", "sRGB", "CMYK") {
		return 0, 0, fmt.Errorf("unsupported print color space %q", req.ColorSpace)
	}
	if !enumAllowed(req.ExportFormat, "", "png", "jpeg", "jpg", "tiff", "tif", "pdf") {
		return 0, 0, fmt.Errorf("unsupported print export format %q", req.ExportFormat)
	}
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
	if err := validateBackgroundBlocks(req.BackgroundBlocks, req.PaperWidthMM, req.PaperHeightMM); err != nil {
		return 0, 0, err
	}
	for i, item := range req.Items {
		if err := validatePrintItem(item, i, "print"); err != nil {
			return 0, 0, err
		}
	}
	if err := validateCutLines(req.CutLines); err != nil {
		return 0, 0, err
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

	for i, item := range comp.Items {
		if err := validatePrintItem(item, i, "composition"); err != nil {
			return err
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
// يجمع وسم العنصر النهائي (W×H بالبكسل عند DPI × 4 بايت) مع وزن مساحة
// المصدر المفكوك (أبعاد المصدر بعد EXIF × 4 — C3): المصدر المفكوك يبقى
// حياً كاملاً أثناء المعالجة إلى جانب الناتج، ودفعة صغيرة من الأهداف
// المصغّرة كانت تحتشد صوراً عملاقة المصدر. الحد الأدنى 1 حتى لا يتجاوز
// عنصر ضخم وحده الميزانية، والأقصى عدد أنوية المعالجة. لا يتغير حد الدفعة
// الإجمالي ولا ترتيب العناصر.
func printBatchSize(req domain.PrintRequest, maxParallel int) int {
	if len(req.Items) == 0 || maxParallel < 1 {
		return 1
	}
	var totalBytes int64
	var counted int64
	// أبعاد المصدر لكل ImageSrc فريد (ترويسة فقط — بلا فك بكسلات)
	srcDims := make(map[string][2]int64)
	for _, item := range req.Items {
		if item.ImageSrc == "" {
			continue
		}
		w := int64(math.Round(mmToPx(item.W, req.DPI)))
		h := int64(math.Round(mmToPx(item.H, req.DPI)))
		if w <= 0 || h <= 0 {
			continue
		}
		weight := w * h * 4
		if srcW, srcH, ok := itemSourceDims(srcDims, item.ImageSrc); ok {
			weight += srcW * srcH * 4
		}
		totalBytes += weight
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

// itemSourceDims يعيد أبعاد صورة المصدر بعد تطبيع EXIF مع كاش لكل مسار
// فريد داخل استدعاء printBatchSize الواحد. الفشل (ملف مفقود/ترويسة غير
// مدعومة) يعني لا وزن إضافي — سلوك التقدير السابق.
func itemSourceDims(cache map[string][2]int64, imageSrc string) (int64, int64, bool) {
	if d, ok := cache[imageSrc]; ok {
		return d[0], d[1], d[0] > 0 && d[1] > 0
	}
	filePath := resolveLocalPath(imageSrc)
	w, h, ok := sourceDecodedDims(filePath)
	cache[imageSrc] = [2]int64{w, h}
	return w, h, ok
}

// GeneratePrintSheet يولّد ورقة الطباعة كاملة: تحقق ← تركيب ← معالجة متوازية للصور
// ← رسم تسلسلي (gg ليس آمناً للتزامن) ← خطوط قص ← حفظ المخرجات.
// التوقيع محفوظ للربطات الحالية — الإلغاء عبر GeneratePrintSheetWithContext.
func (s *PrintService) GeneratePrintSheet(req domain.PrintRequest) (string, string, error) {
	return s.generatePrintSheet(context.Background(), req, nil)
}

// GeneratePrintSheetWithContext نسخة واعية بالسياق لنفس التوليد: تمكّن
// الإلغاء الخارجي (service.CancelPrintJob) وتوقف العمل فعلياً عند نقاط
// التحقق. PrintService ليس على سطح عقود IPC فلا يتغير شيء للربطات.
func (s *PrintService) GeneratePrintSheetWithContext(ctx context.Context, req domain.PrintRequest) (string, string, error) {
	return s.generatePrintSheet(ctx, req, nil)
}

func removeGeneratedPrintOutput(imagePath string) {
	if imagePath == "" {
		return
	}
	_ = os.Remove(imagePath)
	base := strings.TrimSuffix(imagePath, filepath.Ext(imagePath))
	_ = os.Remove(base + ".html")
	_ = os.Remove(base + "_preview.png")
	_ = os.Remove(base + "_preview.jpg")
	_ = os.Remove(imagePath + ".tmp")
	_ = os.Remove(base + ".html.tmp")
	_ = os.Remove(base + "_preview.png.tmp")
	_ = os.Remove(base + "_preview.jpg.tmp")
}

func (s *PrintService) saveOutputCancellable(ctx context.Context, dc *gg.Context, req domain.PrintRequest, barrier printGenerationBarrier) (string, string, error) {
	if err := ctx.Err(); err != nil {
		return "", "", err
	}
	imagePath, htmlDoc, err := s.saveOutput(dc, req)
	if err != nil {
		return "", "", err
	}
	reachPrintGenerationBarrier(barrier, printStageSaveAfter, -1)
	if err := ctx.Err(); err != nil {
		removeGeneratedPrintOutput(imagePath)
		return "", "", err
	}
	return imagePath, htmlDoc, nil
}

func (s *PrintService) generatePrintSheet(ctx context.Context, req domain.PrintRequest, barrier printGenerationBarrier) (string, string, error) {
	// Reject malformed caller-owned IDs before they can enter the cancellation registry.
	if _, err := normalizeRequestedPrintJobID(req.JobID); err != nil {
		return "", "", err
	}
	jobID, jobCtx, cancelJob, err := newPrintJob(ctx, req.JobID)
	if err != nil {
		return "", "", err
	}
	jobCompleted := false
	defer func() {
		if !jobCompleted {
			removePrintJob(jobID, cancelJob)
		}
	}()
	reachPrintGenerationBarrier(barrier, printStageRegistered, -1)

	// طلب واحد في كل مرة — يمنع مضاعفة ذروة الذاكرة عند نقرتين متتاليتين،
	// والاستحواذ الآن واعٍ بالسياق: إلغاء مهمة معلقة في الطابور يوقفها فوراً.
	select {
	case printJobSem <- struct{}{}:
	case <-jobCtx.Done():
		return "", "", fmt.Errorf("print job %s cancelled while waiting: %w", jobID, jobCtx.Err())
	}
	defer func() { <-printJobSem }()

	// 🧠 علامة العمل الثقيل (C6): تمنع تقليم الذاكرة التلقائي أثناء التوليد
	// (runtime.GC وإفراغ مجموعات العمل وسط رسم ثقيل يُجمّد الواجهة).
	// الجسر اختياري — قبل ضبطه (main.go) تبقى العلامات no-op بلا انكسار.
	if ms := printMemoryBridge.Load(); ms != nil {
		ms.MarkHeavyWorkStart()
		defer ms.MarkHeavyWorkEnd()
	}

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
	drawBackgroundBlocks(dc, req.BackgroundBlocks, req.DPI)

	imgCache := &imageCache{
		images: make(map[string]image.Image),
		access: make(map[string]time.Time),
	}
	procCache := &processedCache{
		images: make(map[processedKey]image.Image),
		access: make(map[processedKey]time.Time),
		refs:   make(map[image.Image]int),
	}

	// 🛑 نقطة تحقق قبل مرحلة التركيب (C4)
	if err := jobCtx.Err(); err != nil {
		return "", "", fmt.Errorf("print job %s cancelled: %w", jobID, err)
	}

	// 0. تركيب كانفاس الوضع الحر (اختياري): يُرسم مرة واحدة بدقة الطباعة
	// ثم تُستنسخ نسخه في الخلايا — بدل لقطة كانفس + إعادة ترميز
	composedCanvas, err := s.composeCanvas(jobCtx, req, imgCache, barrier)
	if err != nil {
		if cerr := jobCtx.Err(); cerr != nil {
			return "", "", fmt.Errorf("print job %s cancelled: %w", jobID, cerr)
		}
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
			// Preserve free-canvas placeholders. Without a composition, a nil image
			// still draws the slot's background/border; unstyled empties are a no-op.
			img = composedCanvas
		}
		drawItemImage(dc, img, item, req.DPI)
	}

	for start := 0; start < len(req.Items); start += batchSize {
		// 🛑 نقطة تحقق بين الدفعات (C4): الإلغاء يوقف بدء أي عمل جديد
		// فوراً — العناصر المتبقية لا تُعالَج ولا يُحفظ مخرج ناقص.
		if cerr := jobCtx.Err(); cerr != nil {
			return "", "", fmt.Errorf("print job %s cancelled: %w", jobID, cerr)
		}
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
			if err := jobCtx.Err(); err != nil {
				return "", "", fmt.Errorf("print job %s cancelled: %w", jobID, err)
			}
			g.Go(func() (err error) {
				if cerr := jobCtx.Err(); cerr != nil {
					return fmt.Errorf("print job %s cancelled: %w", jobID, cerr)
				}
				defer recoverPrintWorkerPanic(i, &err)
				img, err := s.loadAndProcessImage(req.Items[i], req.DPI, imgCache, procCache)
				if err != nil {
					return err
				}
				if cerr := jobCtx.Err(); cerr != nil {
					return fmt.Errorf("print job %s cancelled: %w", jobID, cerr)
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
			if err := jobCtx.Err(); err != nil {
				return "", "", fmt.Errorf("print job %s cancelled: %w", jobID, err)
			}
			reachPrintGenerationBarrier(barrier, printStageDrawBefore, i)
			if err := jobCtx.Err(); err != nil {
				return "", "", fmt.Errorf("print job %s cancelled: %w", jobID, err)
			}
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
	procCache.refs = nil
	imgCache = nil
	procCache = nil

	// 🛑 نقطة تحقق قبل الحفظ (C4): مهمة ملغاة لا تُنتج ملفاً.
	if err := jobCtx.Err(); err != nil {
		return "", "", fmt.Errorf("print job %s cancelled: %w", jobID, err)
	}
	reachPrintGenerationBarrier(barrier, printStageSaveBefore, -1)
	if err := jobCtx.Err(); err != nil {
		return "", "", fmt.Errorf("print job %s cancelled: %w", jobID, err)
	}

	imagePath, htmlDoc, err := s.saveOutputCancellable(jobCtx, dc, req, barrier)
	if err != nil {
		return "", "", fmt.Errorf("print job %s failed or cancelled: %w", jobID, err)
	}
	if err := completePrintJob(jobID, jobCtx, cancelJob); err != nil {
		removeGeneratedPrintOutput(imagePath)
		return "", "", fmt.Errorf("print job %s cancelled: %w", jobID, err)
	}
	jobCompleted = true
	return imagePath, htmlDoc, nil
}
