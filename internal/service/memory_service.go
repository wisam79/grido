package service

import (
	"context"
	"log/slog"
	"runtime"
	"sync"
	"sync/atomic"
	"time"
)

// أسباب دورات التقليم — تظهر في سجل Info لتشخيص مصدر كل دورة.
const (
	trimReasonExplicit        = "explicit"         // طلب صريح (TrimNow من الواجهة أو /api/trim-memory)
	trimReasonWindowMinimise  = "window-minimise"  // خنق تصغير النافذة
	trimReasonHeapPressure    = "heap-pressure"    // الكومة تجاوزت الحد
	trimReasonIdleMaintenance = "idle-maintenance" // فترة صيانة طويلة بلا تقليم
)

// MemoryService manages native memory compaction and OS working set trimming.
type MemoryService struct {
	mu     sync.Mutex
	stopCh chan struct{}

	// ── جدولة الفحص الدوري (قابلة للضبط عبر ConfigureForTest فقط) ──
	startupTrimDelay time.Duration
	autoTrimInterval time.Duration

	// trimMu يحمي حالة جدولة دورات التقليم أدناه. دورة تقليم كاملة تُجمّد
	// Go (runtime.GC = stop-the-world) وتُعيد ضبط مجموعات عمل كل عمليات
	// WebView2 التابعة، فحمايتها من التزامن والتقارب إلزامية.
	trimMu sync.Mutex
	// lastTrimTime زمن آخر دورة تقليم (بدايتها أو نهايتها) — يغذي الخنق
	// الزمني (trimCooldown) ونافذة دمج الطلبات المتقاربة (trimCoalesceWindow).
	lastTrimTime time.Time
	// trimInFlight true أثناء تنفيذ دورة فعلية؛ أي طلب متزامن يعود فوراً
	// دون انتظار ويُدمَج في الدورة الجارية (حارس in-flight ذري المنطق).
	trimInFlight bool
	// trimExec منفّذ دورة التقليم عبر المنصة — الافتراضي trimPlatformMemory،
	// ويُستبدل في الاختبارات فقط.
	trimExec func()
	// coalesceWindow نافذة دمج الطلبات المتقاربة (قابلة للضبط في الاختبارات).
	coalesceWindow time.Duration

	// heavyWork عدد الأعمال الثقيلة الجارية حالياً (تصدير طباعة، عزل خلفية…).
	// حين يكون أكبر من صفر يتخطى الفحص الدوري والتقليم التلقائي كلياً:
	// runtime.GC (stop-the-world) وسط عمل ثقيل يُجمّد الواجهة ويُفسد قياسات
	// الأداء. التقليم الصريح (TrimNow) يتجاوز هذا الحارس دائماً.
	heavyWork atomic.Int32
}

func NewMemoryService() *MemoryService {
	return &MemoryService{
		stopCh:           make(chan struct{}),
		startupTrimDelay: defaultStartupTrimDelay,
		autoTrimInterval: defaultAutoTrimInterval,
		trimExec:         trimPlatformMemory,
		coalesceWindow:   trimCoalesceWindow,
	}
}

// trimCooldown أقل فاصل زمني مسموح بين دورتَي تقليم مُخنقَتين. أي تصغير أو
// فقدان تركيز يقع داخل هذه النافذة يُتجاهل: الذاكرة مُدارة بالتقليم الدوري.
const trimCooldown = 5 * time.Minute

// trimCoalesceWindow نافذة دمج الطلبات المتقاربة: طلبان صريحان يقعان ضمن
// هاتين الثانيتين يُنفَّذ لهما دورة واحدة — لا دورتين stop-the-world متقاربتين.
const trimCoalesceWindow = 2 * time.Second

const (
	// defaultAutoTrimInterval فاصل فحص ضغط الذاكرة. الفحص رخيص (ReadMemStats)؛
	// التقليم نفسه هو المكلف ولا يُنفَّذ إلا عند تجاوز أحد الحدود أدناه.
	defaultAutoTrimInterval = 45 * time.Second

	// heapTrimThreshold: عند تجاوز الذاكرة الحيّة لهذا الحد (بعد تصدير كبير
	// أو معالجة صور) نُقليم فوراً بدل انتظار الدورة الصيانوية.
	heapTrimThreshold = 320 << 20 // 320 MiB

	// idleMaintenanceTrim: تقليم صيانوي حتى لو لم يتجاوز الكومة الحد، لإعادة
	// صفحات WebView2 غير المستخدمة. كل 30 ثانية كان يجمّد الواجهة بلا داعٍ؛
	// عشر دقائق تكفي لاستعادة الذاكرة دون التضحية بسلاسة الرسم.
	idleMaintenanceTrim = 10 * time.Minute

	// defaultStartupTrimDelay تأخير أول تقليم بعد الإقلاع لتجاوز اندفاع
	// التحميل الأولي. هذا هو تقليم الإقلاع الوحيد في التطبيق (لا تقليم
	// مزدوج عند WindowRuntimeReady في main.go).
	defaultStartupTrimDelay = 4 * time.Second
)

// StartAutoTrim starts periodic background memory pressure checks, trimming only
// when the live heap is large or a long idle interval has elapsed.
func (s *MemoryService) StartAutoTrim(ctx context.Context) {
	go func() {
		// First cleanup cycle shortly after startup — مصدر تقليم الإقلاع الوحيد
		// (يمر عبر trimIfNeeded فيتخطى العمل الثقيل إن وُجد عند الإقلاع).
		select {
		case <-time.After(s.startupTrimDelay):
			s.trimIfNeeded()
		case <-ctx.Done():
			return
		case <-s.stopCh:
			return
		}

		ticker := time.NewTicker(s.autoTrimInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-s.stopCh:
				return
			case <-ticker.C:
				s.trimIfNeeded()
			}
		}
	}()
}

// MarkHeavyWorkStart يسجّل بدء عمل ثقيل (تصدير طباعة، عزل خلفية…) فيتخطى
// MemoryService الفحص الدوري والتقليم التلقائي حتى انتهائه. كل استدعاء
// يقابله MarkHeavyWorkEnd بالضبط — يُفضَّل استخدام defer.
func (s *MemoryService) MarkHeavyWorkStart() { s.SetHeavyWorkActive(1) }

// MarkHeavyWorkEnd يسجّل انتهاء عمل ثقيل بدأه MarkHeavyWorkStart.
func (s *MemoryService) MarkHeavyWorkEnd() { s.SetHeavyWorkActive(-1) }

// SetHeavyWorkActive يعدّل عدّاد الأعمال الثقيلة الجارية بالدلتا المعطاة
// (+1 بدء، −1 انتهاء). آمن للاستدعاء المتزامن من أي خدمة وبلا تبعيات —
// التصدير الثقيل يستدعيه لدى بدء الدفعة وانتهائها.
func (s *MemoryService) SetHeavyWorkActive(delta int) {
	s.heavyWork.Add(int32(delta))
}

// trimIfNeeded ينفّذ التقليم فقط عند وجود ضغط فعلي على الكومة أو بعد مرور
// فترة صيانة طويلة. هذا يمنع التقليم الدوري العنيف (GC كامل + إفراغ مجموعات
// عمل WebView2) الذي كان يسبّب تجمّدات واسترجاع صفحات من القرص كل 30 ثانية.
func (s *MemoryService) trimIfNeeded() {
	// حارس العمل الثقيل: تجاوز حتى ReadMemStats (يوقف العالم لحظياً) أثناء
	// العمل الثقيل — الفحص الدوري يتخطى تماماً بلا تكلفة.
	if s.heavyWork.Load() > 0 {
		slog.Debug("Skipping periodic memory check — heavy work in progress")
		return
	}

	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)

	s.trimMu.Lock()
	sinceLast := time.Since(s.lastTrimTime)
	s.trimMu.Unlock()

	if ms.HeapAlloc >= heapTrimThreshold {
		s.runTrimCycle(trimReasonHeapPressure)
		return
	}
	if sinceLast >= idleMaintenanceTrim {
		s.runTrimCycle(trimReasonIdleMaintenance)
		return
	}

	slog.Debug("Skipping auto memory trim — heap below pressure threshold",
		"heap_mb", ms.HeapAlloc>>20, "since_last_trim", sinceLast.String())
}

// Stop halts the background auto-trim routine.
func (s *MemoryService) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	select {
	case <-s.stopCh:
	default:
		close(s.stopCh)
	}
}

// TrimNow triggers immediate memory compaction across Go runtime and WebView2 processes.
// الطلب الصريح يتجاوز حارس العمل الثقيل دائماً، لكنه يخضع لحارس in-flight
// ونافذة الدمج: طلب متزامن مع دورة جارية أو متقارب مع دورة منتهية للتو
// يُدمَج (لا دورة ثانية) ويعود فوراً دون انتظار.
func (s *MemoryService) TrimNow() {
	s.runTrimCycle(trimReasonExplicit)
}

// TrimThrottled triggers a memory compaction only if the last trim cycle is
// older than trimCooldown. Used for implicit triggers (window minimise) so
// that unavoidable OS churn (WM_WINDOWPOSCHANGING during minimise) does not
// turn into a repeated stop-the-world GC storm.
func (s *MemoryService) TrimThrottled() {
	s.trimMu.Lock()
	elapsed := time.Since(s.lastTrimTime)
	allowed := elapsed >= trimCooldown
	s.trimMu.Unlock()

	if !allowed {
		slog.Debug("Skipping throttled memory trim — cooldown still active", "elapsed", elapsed.String())
		return
	}
	s.runTrimCycle(trimReasonWindowMinimise)
}

// runTrimCycle ينفّذ دورة تقليم واحدة بثلاثة حراس ذريين على الترتيب:
//  1. حارس العمل الثقيل: الفحص الدوري والتقليم التلقائي يتخطيان عندما يكون
//     عدّاد الأعمال الثقيلة أكبر من صفر؛ الطلب الصريح وحده يتجاوزه.
//  2. حارس in-flight: طلب أثناء دورة جارية يعود فوراً دون انتظار (يُدمَج).
//  3. نافذة الدمج: لا دورتين خلال trimCoalesceWindow — الطلبات المتقاربة
//     تُنفَّذ دورة واحدة.
func (s *MemoryService) runTrimCycle(reason string) {
	if reason != trimReasonExplicit && s.heavyWork.Load() > 0 {
		slog.Debug("Skipping memory trim — heavy work in progress", "reason", reason)
		return
	}

	s.trimMu.Lock()
	if s.trimInFlight {
		s.trimMu.Unlock()
		slog.Debug("Memory trim request coalesced — cycle already in flight", "reason", reason)
		return
	}
	if elapsed := time.Since(s.lastTrimTime); elapsed < s.coalesceWindow {
		s.trimMu.Unlock()
		slog.Debug("Memory trim request coalesced — recent cycle within coalesce window",
			"reason", reason, "since_last", elapsed.String())
		return
	}
	s.trimInFlight = true
	s.lastTrimTime = time.Now()
	exec := s.trimExec
	s.trimMu.Unlock()

	start := time.Now()
	exec()

	s.trimMu.Lock()
	s.trimInFlight = false
	s.lastTrimTime = time.Now()
	s.trimMu.Unlock()

	slog.Info("Native memory trim cycle completed", "reason", reason, "duration", time.Since(start).String())
}

// TestConfig عوامل ضبط MemoryService في الاختبارات فقط — القيم الصفرية
// تعني الإبقاء على الافتراضي المضبوط في NewMemoryService.
type TestConfig struct {
	// TrimExec يستبدل منفّذ دورة التقليم عبر المنصة (لعدّ الدورات في الاختبار).
	TrimExec func()
	// StartupDelay يضبط مهلة أول تقليم بعد الإقلاع.
	StartupDelay time.Duration
	// CheckInterval يضبط فاصل الفحص الدوري.
	CheckInterval time.Duration
	// CoalesceWindow يضبط نافذة دمج الطلبات المتقاربة.
	CoalesceWindow time.Duration
}

// ConfigureForTest يضبط عوامل التوقيت والمنفّذ في الاختبارات فقط — يحظر
// استخدامه في الإنتاج؛ القيم الإنتاجية تُضبط في NewMemoryService ولا تُعدَّل
// بعد الإنشاء.
func (s *MemoryService) ConfigureForTest(cfg TestConfig) {
	s.trimMu.Lock()
	defer s.trimMu.Unlock()
	if cfg.TrimExec != nil {
		s.trimExec = cfg.TrimExec
	}
	if cfg.StartupDelay > 0 {
		s.startupTrimDelay = cfg.StartupDelay
	}
	if cfg.CheckInterval > 0 {
		s.autoTrimInterval = cfg.CheckInterval
	}
	if cfg.CoalesceWindow > 0 {
		s.coalesceWindow = cfg.CoalesceWindow
	}
}
