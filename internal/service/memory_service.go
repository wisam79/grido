package service

import (
	"context"
	"log/slog"
	"runtime"
	"sync"
	"time"
)

// MemoryService manages native memory compaction and OS working set trimming.
type MemoryService struct {
	mu     sync.Mutex
	stopCh chan struct{}

	// trimMu + lastTrimTime يُخنقان التقليم غير الصريح: دورة تقليم كاملة
	// تُجمّد Go (runtime.GC = stop-the-world) وتُعيد ضبط مجموعات عمل كل
	// عمليات WebView2 التابعة، فتنفيذها عند كل حدث نافذة عابر (تصغير/تركيز)
	// يُثقل الجهاز بلا فائدة. التقليمان الصريحان (TrimNow من واجهة التطبيق
	// أو من خادم الأصول /api/trim-memory) لا يُخنقان — المستخدم طلبها.
	trimMu       sync.Mutex
	lastTrimTime time.Time
}

func NewMemoryService() *MemoryService {
	return &MemoryService{
		stopCh: make(chan struct{}),
	}
}

// trimCooldown أقل فاصل زمني مسموح بين دورتَي تقليم مُخنقَتين. أي تصغير أو
// فقدان تركيز يقع داخل هذه النافذة يُتجاهل: الذاكرة مُدارة بالتقليم الدوري.
const trimCooldown = 5 * time.Minute

const (
	// autoTrimInterval فاصل فحص ضغط الذاكرة. الفحص رخيص (ReadMemStats)؛
	// التقليم نفسه هو المكلف ولا يُنفَّذ إلا عند تجاوز أحد الحدود أدناه.
	autoTrimInterval = 45 * time.Second

	// heapTrimThreshold: عند تجاوز الذاكرة الحيّة لهذا الحد (بعد تصدير كبير
	// أو معالجة صور) نُقليم فوراً بدل انتظار الدورة الصيانوية.
	heapTrimThreshold = 320 << 20 // 320 MiB

	// idleMaintenanceTrim: تقليم صيانوي حتى لو لم يتجاوز الكومة الحد، لإعادة
	// صفحات WebView2 غير المستخدمة. كل 30 ثانية كان يجمّد الواجهة بلا داعٍ؛
	// عشر دقائق تكفي لاستعادة الذاكرة دون التضحية بسلاسة الرسم.
	idleMaintenanceTrim = 10 * time.Minute

	// startupTrimDelay تأخير أول تقليم بعد الإقلاع لتجاوز اندفاع التحميل الأولي.
	startupTrimDelay = 4 * time.Second
)

// StartAutoTrim starts periodic background memory pressure checks, trimming only
// when the live heap is large or a long idle interval has elapsed.
func (s *MemoryService) StartAutoTrim(ctx context.Context) {
	go func() {
		// First cleanup cycle shortly after startup
		select {
		case <-time.After(startupTrimDelay):
			s.TrimNow()
		case <-ctx.Done():
			return
		case <-s.stopCh:
			return
		}

		ticker := time.NewTicker(autoTrimInterval)
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

// trimIfNeeded ينفّذ التقليم فقط عند وجود ضغط فعلي على الكومة أو بعد مرور
// فترة صيانة طويلة. هذا يمنع التقليم الدوري العنيف (GC كامل + إفراغ مجموعات
// عمل WebView2) الذي كان يسبّب تجمّدات واسترجاع صفحات من القرص كل 30 ثانية.
func (s *MemoryService) trimIfNeeded() {
	var ms runtime.MemStats
	runtime.ReadMemStats(&ms)

	s.trimMu.Lock()
	sinceLast := time.Since(s.lastTrimTime)
	s.trimMu.Unlock()

	if ms.HeapAlloc >= heapTrimThreshold || sinceLast >= idleMaintenanceTrim {
		s.TrimNow()
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
func (s *MemoryService) TrimNow() {
	slog.Debug("Executing native memory trim cycle")
	s.rememberTrim()
	trimPlatformMemory()
}

// TrimThrottled triggers a memory compaction only if the last trim cycle is
// older than trimCooldown. Used for implicit triggers (window minimise) so
// that unavoidable OS churn (WM_WINDOWPOSCHANGING during minimise) does not
// turn into a repeated stop-the-world GC storm.
func (s *MemoryService) TrimThrottled() {
	s.trimMu.Lock()
	elapsed := time.Since(s.lastTrimTime)
	allowed := elapsed >= trimCooldown
	if allowed {
		s.lastTrimTime = time.Now()
	}
	s.trimMu.Unlock()

	if !allowed {
		slog.Debug("Skipping throttled memory trim — cooldown still active", "elapsed", elapsed.String())
		return
	}
	s.TrimNow()
}

// rememberTrim يسجّل زمن آخر تقليم فعلي (يعمل أيضاً كـ TrimNow المباشر)
func (s *MemoryService) rememberTrim() {
	s.trimMu.Lock()
	s.lastTrimTime = time.Now()
	s.trimMu.Unlock()
}
