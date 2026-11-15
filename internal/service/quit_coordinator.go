package service

import (
	"log/slog"
	"sync"
	"time"
)

// QuitStage يمثّل المرحلة الحالية لبروتوكول الإغلاق النظيف الموحّد.
type QuitStage string

const (
	QuitStageIdle             QuitStage = "idle"
	QuitStageRequested        QuitStage = "requested"
	QuitStageSaving           QuitStage = "saving"
	QuitStageAwaitingDecision QuitStage = "awaiting-decision"
	QuitStageShuttingDown     QuitStage = "shutting-down"
)

const (
	// DefaultQuitAckTimeout مهلة انتظار استجابة الواجهة الأولى عند طلب الخروج.
	DefaultQuitAckTimeout = 5 * time.Second
	// DefaultQuitSavingTimeout مهلة أمان قصوى أثناء إتمام الحفظ التلقائي النهائي.
	DefaultQuitSavingTimeout = 30 * time.Second
)

// QuitTimer تجريد بسيط لمؤقت الإغلاق لتمكين الاختبار الحتمي دون انتظار زمني حقيقي.
type QuitTimer interface {
	Stop() bool
}

// QuitCoordinatorHooks دوال الحقن المستخدمة من طبقة التطبيق (Wails / Main).
type QuitCoordinatorHooks struct {
	SaveWindowState   func()
	EmitQuitRequested func(requestID uint64)
	PerformQuit       func()
	AfterFunc         func(d time.Duration, f func()) QuitTimer
	AckTimeout        time.Duration
	SavingTimeout     time.Duration
}

// QuitCoordinator منسّق مركزي لبروتوكول الإغلاق النظيف يجمع كل نقاط الدخول
// (الإغلاق الأصلي، Alt+F4، زر الإغلاق المخصص، وصينية النظام) خلف آلة حالة واحدة
// ومعرّفات طلب متزايدة تمنع التكرار وسباق المؤقت مع التأكيد.
type QuitCoordinator struct {
	mu        sync.Mutex
	stage     QuitStage
	requestID uint64
	timerGen  uint64
	timer     QuitTimer

	hooks         QuitCoordinatorHooks
	ackTimeout    time.Duration
	savingTimeout time.Duration
}

// NewQuitCoordinator ينشئ منسق إغلاق موحد بالقيم الافتراضية أو المخصّصة للاختبار.
func NewQuitCoordinator(hooks QuitCoordinatorHooks) *QuitCoordinator {
	ackTimeout := hooks.AckTimeout
	if ackTimeout <= 0 {
		ackTimeout = DefaultQuitAckTimeout
	}
	savingTimeout := hooks.SavingTimeout
	if savingTimeout <= 0 {
		savingTimeout = DefaultQuitSavingTimeout
	}
	if hooks.AfterFunc == nil {
		hooks.AfterFunc = func(d time.Duration, f func()) QuitTimer {
			return time.AfterFunc(d, f)
		}
	}
	return &QuitCoordinator{
		stage:         QuitStageIdle,
		hooks:         hooks,
		ackTimeout:    ackTimeout,
		savingTimeout: savingTimeout,
	}
}

// Stage يعيد المرحلة الحالية (لأغراض الرصد والاختبار).
func (c *QuitCoordinator) Stage() QuitStage {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.stage
}

// RequestQuit يبدأ طلب خروج نظيف جديداً إذا لم يكن هناك طلب قائم.
// الطلبات المتكررة أثناء الانتظار أو عرض حوار القرار تعيد نفس المعرّف دون
// إعادة البعث أو تصفير المؤقت أو إطلاق حفظ موازٍ.
func (c *QuitCoordinator) RequestQuit() uint64 {
	c.mu.Lock()
	if c.stage == QuitStageShuttingDown {
		c.mu.Unlock()
		return 0
	}
	if c.stage != QuitStageIdle {
		reqID := c.requestID
		c.mu.Unlock()
		return reqID
	}

	c.requestID++
	reqID := c.requestID
	c.stage = QuitStageRequested
	c.stopTimerLocked()
	c.armTimerLocked(
		reqID,
		c.ackTimeout,
		"Frontend never acknowledged quit request — quitting after ack timeout",
	)
	saveWindowState := c.hooks.SaveWindowState
	emitQuit := c.hooks.EmitQuitRequested
	c.mu.Unlock()

	slog.Info("Graceful quit requested — awaiting frontend autosave flush",
		"request_id", reqID, "ack_timeout", c.ackTimeout.String())

	if saveWindowState != nil {
		saveWindowState()
	}
	if emitQuit != nil {
		emitQuit(reqID)
	}
	return reqID
}

// Respond يحدّث حالة طلب الخروج من الواجهة وفق معرّف الطلب.
// القيم الصالحة لـ action: "saving" | "failed" | "cancel" | "confirm".
func (c *QuitCoordinator) Respond(requestID uint64, action string) bool {
	c.mu.Lock()
	if c.stage == QuitStageShuttingDown || c.stage == QuitStageIdle {
		c.mu.Unlock()
		return false
	}
	// قبول requestID == 0 فقط إذا طابق أو للتوافق عند غياب المعرّف؟ لا: نلزم مطابقة
	// المعرّف الحي لمنع استجابة متأخرة من طلب قديم مُلغى.
	if requestID == 0 || c.requestID != requestID {
		c.mu.Unlock()
		return false
	}

	switch action {
	case "saving":
		if c.stage != QuitStageRequested && c.stage != QuitStageSaving && c.stage != QuitStageAwaitingDecision {
			c.mu.Unlock()
			return false
		}
		c.stage = QuitStageSaving
		c.stopTimerLocked()
		c.armTimerLocked(
			requestID,
			c.savingTimeout,
			"Frontend final autosave exceeded saving timeout — quitting after safety budget",
		)
		c.mu.Unlock()
		return true

	case "failed":
		if c.stage != QuitStageRequested && c.stage != QuitStageSaving {
			c.mu.Unlock()
			return false
		}
		// عند فشل الحفظ يتوقف مؤقت الأمان فوراً كي لا يُغلق التطبيق فوق حوار قرار المستخدم.
		c.stage = QuitStageAwaitingDecision
		c.stopTimerLocked()
		c.mu.Unlock()
		slog.Warn("Frontend reported final autosave failure — awaiting explicit user decision",
			"request_id", requestID)
		return true

	case "cancel":
		c.stopTimerLocked()
		c.stage = QuitStageIdle
		c.mu.Unlock()
		slog.Info("Graceful quit cancelled by user", "request_id", requestID)
		return true

	case "confirm":
		c.stopTimerLocked()
		c.stage = QuitStageShuttingDown
		performQuit := c.hooks.PerformQuit
		c.mu.Unlock()
		slog.Info("Graceful quit confirmed — shutting down", "request_id", requestID)
		if performQuit != nil {
			performQuit()
		}
		return true

	default:
		c.mu.Unlock()
		return false
	}
}

// CancelOnShutdown يُلغي أي مؤقت أمان معلّق عند دخول Wails مسار الإغلاق النهائي
// (من التأكيد نفسه أو من المحدّث أو المثبّت)، ويمنع أي callback متأخر من إطلاق Quit ثانٍ.
func (c *QuitCoordinator) CancelOnShutdown() {
	c.mu.Lock()
	c.stopTimerLocked()
	c.stage = QuitStageShuttingDown
	c.mu.Unlock()
}

func (c *QuitCoordinator) stopTimerLocked() {
	c.timerGen++
	if c.timer != nil {
		c.timer.Stop()
		c.timer = nil
	}
}

func (c *QuitCoordinator) armTimerLocked(reqID uint64, d time.Duration, warnMsg string) {
	c.timerGen++
	gen := c.timerGen
	afterFunc := c.hooks.AfterFunc
	c.timer = afterFunc(d, func() {
		c.mu.Lock()
		if c.stage == QuitStageIdle ||
			c.stage == QuitStageShuttingDown ||
			c.stage == QuitStageAwaitingDecision ||
			c.requestID != reqID ||
			c.timerGen != gen {
			c.mu.Unlock()
			return
		}
		c.stage = QuitStageShuttingDown
		c.timer = nil
		performQuit := c.hooks.PerformQuit
		c.mu.Unlock()

		slog.Warn(warnMsg, "request_id", reqID, "timeout", d.String())
		if performQuit != nil {
			performQuit()
		}
	})
}
