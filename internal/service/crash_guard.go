package service

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"grido/internal/utils"
)

// CrashReport يمثل التقرير الذري للانهيار المخزن محلياً فقط (Privacy-first)
type CrashReport struct {
	Timestamp   string `json:"timestamp"`
	AppVersion  string `json:"app_version"`
	OS          string `json:"os"`
	Arch        string `json:"arch"`
	Error       string `json:"error"`
	StackTrace  string `json:"stack_trace"`
	HasAutosave bool   `json:"has_autosave"`
}

// CrashGuardService يدير رصد الانهيارات وحفظ تقارير crash-dump.json الذرية والتعافي منها
type CrashGuardService struct {
	mu sync.Mutex
}

func NewCrashGuardService() *CrashGuardService {
	return &CrashGuardService{}
}

// defaultCrashGuard الحارس المشترك لكل مصادر الانهيار (PanicHandler في Wails،
// غلاف goroutines، أي مسار آخر): قفل واحد يمنع إعادة تشغيل مزدوجة عندما تنهار
// عدة goroutines في اللحظة نفسها.
//
// ⚠️ كل مصدر انهيار في الإنتاج يجب أن يستخدم هذه النسخة الواحدة بالضبط (عبر
// DefaultCrashGuard). إنشاء نسخة CrashGuardService ثانية — كما كان يفعل App في
// NewApp — يبطل العقد: القفل داخل النسخة، فلا يمنع مصدرين من إطلاق نسختين
// وإعادة تشغيل مزدوجة عند انهيار متزامن.
var defaultCrashGuard = NewCrashGuardService()

// DefaultCrashGuard يعيد الحارس المشترك الذي يستخدمه مسار الانهيار في التطبيق.
func DefaultCrashGuard() *CrashGuardService { return defaultCrashGuard }

// crashRestartGuardMu يحمي عدّاد إعادات التشغيل من سباق القراءة–التعديل–الكتابة
// على الملف. القفل داخل CrashGuardService وحده لا يكفي: انهيارات من مصادر مختلفة
// وخدمات مختلفة كانت قد تتسابق على نفس الملف (تكتبان العدّاد نفسه ⇒ محاولتين
// مسموحتين من محاولة واحدة).
var crashRestartGuardMu sync.Mutex

// ReportGoroutinePanic مستقبل panics goroutines التطبيق — يُربط في main كـ
// utils.PanicReporter، فيُمرّرها إلى مسار الانهيار الذري نفسه (تقرير + إعادة
// تشغيل + إنهاء) بدل موت صامت بلا أثر.
func ReportGoroutinePanic(name string, err error, stack string) {
	slog.Error("Panic recovered in application goroutine",
		"goroutine", name, "error", err.Error())
	defaultCrashGuard.HandleFatalPanic(err, stack)
}

func (s *CrashGuardService) GetDumpPath() string {
	return filepath.Join(utils.GetAppDir(), "crash-dump.json")
}

// exitProcess تُنهي العملية — متغير قابل للاستبدال في الاختبارات فقط.
// القيمة الافتراضية os.Exit مطابقة لمسار Wails الافتراضي:
// defaultPanicHandler ⇒ fatal ⇒ handleFatalError ⇒ os.Exit(1).
var exitProcess = os.Exit

// autoRestartEnabled يمنع إعادة التشغيل التلقائي في بيئة التطوير: التنفيذي
// هناك مؤقت (wails3 dev) ولا يصلح لإعادة الإطلاق. قابل للاستبدال في الاختبارات.
var autoRestartEnabled = !serviceDevBuild && !utils.IsDevEnvironment()

// restartProcess يُطلق نسخة جديدة من التطبيق بعد الانهيار — قابل للاستبدال في
// الاختبارات كي لا تُطلق اختبارات الوحدة عملية حقيقية.
var restartProcess = defaultRestartProcess

// حارس حلقات إعادة التشغيل بعد الانهيار:
// سلسلة = انهيارات متتالية تفصلها أقل من crashRestartWindow، ويُسمح خلالها بـ
// crashRestartMaxAttempts إعادات على الأكثر. انهيار بعد هدوء أطول يبدأ سلسلة
// جديدة (تطبيق عمل ساعات ثم انهار لا يُحاسَب على انهيارات عمره السابق).
const (
	crashRestartMaxAttempts = 2
	crashRestartWindow      = 15 * time.Minute
	crashRestartGuardName   = "crash-restart-guard.json"
)

// crashRestartGuard حالة العدّاد المحفوظة على القرص.
type crashRestartGuard struct {
	Count        int    `json:"count"`
	FirstCrashAt string `json:"first_crash_at"`
}

func crashRestartGuardPath() string {
	return filepath.Join(utils.GetAppDir(), crashRestartGuardName)
}

// readCrashRestartGuard يقرأ الحالة بأمان: غيابها أو فسادها ⇒ حالة صفرية
// (سلسلة جديدة). تحمّل الفساد مقصود — الأسوأ إعادة تشغيل زائدة لا تعطّل تعافٍ.
func readCrashRestartGuard() crashRestartGuard {
	data, err := os.ReadFile(crashRestartGuardPath())
	if err != nil {
		return crashRestartGuard{}
	}
	var state crashRestartGuard
	if err := json.Unmarshal(data, &state); err != nil {
		return crashRestartGuard{}
	}
	return state
}

// ClearCrashRestartGuard يصفّر عدّاد إعادات التشغيل المتتالية، ويُستدعى في كل
// إقلاع يدوي (غير ناتج عن انهيار): وصول المستخدم بنفسه يعني انتهاء السلسلة.
func ClearCrashRestartGuard() error {
	crashRestartGuardMu.Lock()
	defer crashRestartGuardMu.Unlock()

	if err := os.Remove(crashRestartGuardPath()); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove crash restart guard: %w", err)
	}
	return nil
}

// claimCrashRestartAttempt يحجز محاولة إعادة تشغيل واحدة إن كان السقف يسمح.
// تعذّر حفظ العدّاد ⇒ لا إعادة تشغيل (فشل مغلق): إعادات بلا عدّاد محفوظ قد تدخل
// حلقة لا نهائية، والتقارير على القرص تكفي للتعافي اليدوي.
func claimCrashRestartAttempt(now time.Time) (int, bool) {
	crashRestartGuardMu.Lock()
	defer crashRestartGuardMu.Unlock()

	state := readCrashRestartGuard()

	attempt := 1
	firstCrashAt := now.UTC().Format(time.RFC3339)
	if ts, err := time.Parse(time.RFC3339, state.FirstCrashAt); err == nil && now.Sub(ts) <= crashRestartWindow {
		attempt = state.Count + 1
		firstCrashAt = state.FirstCrashAt
	}

	if attempt > crashRestartMaxAttempts {
		return attempt, false
	}

	data, err := json.MarshalIndent(crashRestartGuard{Count: attempt, FirstCrashAt: firstCrashAt}, "", "  ")
	if err != nil {
		slog.Error("Failed to marshal crash restart guard", "error", err)
		return attempt, false
	}
	if err := utils.AtomicWriteFile(crashRestartGuardPath(), data, 0600); err != nil {
		slog.Error("Failed to persist crash restart guard — skipping auto-restart", "error", err)
		return attempt, false
	}
	return attempt, true
}

// HandlePanic يحفظ تفاصيل الانهيار ذرياً دون إنهاء العملية (لأجل الاختبارات
// والأغراض غير المميتة). ⚠️ داخل PanicHandler استخدم HandleFatalPanic: الاستمرار
// بعد panic غير معالج خطر، وسلوك Wails الافتراضي هو الإنهاء الفوري.
func (s *CrashGuardService) HandlePanic(err error, stackTrace string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	errStr := "unknown panic"
	if err != nil {
		errStr = err.Error()
	}

	report := CrashReport{
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
		AppVersion:  AppVersion,
		OS:          runtime.GOOS,
		Arch:        runtime.GOARCH,
		Error:       errStr,
		StackTrace:  stackTrace,
		HasAutosave: s.checkAutosaveExists(),
	}

	data, marshalErr := json.MarshalIndent(report, "", "  ")
	if marshalErr != nil {
		slog.Error("Failed to marshal crash report", "error", marshalErr)
		return marshalErr
	}

	dumpPath := s.GetDumpPath()
	if writeErr := utils.AtomicWriteFile(dumpPath, data, 0600); writeErr != nil {
		slog.Error("Failed to write atomic crash dump", "error", writeErr, "path", dumpPath)
		return writeErr
	}

	slog.Info("Successfully wrote atomic crash dump", "path", dumpPath)
	return nil
}

// HandleFatalPanic يحفظ تقرير الانهيار، ثم يعيد تشغيل التطبيق تلقائياً إن كان
// ذلك مسموحاً، ثم يُنهي هذه العملية دائماً — إعادة فرض صريحة لسلوك Wails v3
// الافتراضي (defaultPanicHandler ⇒ fatal ⇒ handleFatalError ⇒ os.Exit(1)) مضافاً
// إليه التعافي: بلا الإنهاء تستمر العملية بحالة قد تكون فاسدة، وبلا إعادة التشغيل
// يُطرد المستخدم من عمله بلا سبب. التقرير يبقى على القرص، فيُعرض حوار استعادة
// المسودة في النسخة الجديدة.
//
// الحماية من الحلقات: claimCrashRestartAttempt يسمح بـ crashRestartMaxAttempts
// إعادات داخل crashRestartWindow، وتُصفّر السلسلة في أي إقلاع يدوي. تعذّر حفظ
// العدّاد أو إطلاق النسخة ⇒ لا إعادة تشغيل.
//
// الإنهاء مؤجَّل عبر defer فيقع دائماً — حتى لو فشلت الكتابة أو الإطلاق — ويقع
// قبل تحرير قفل الخدمة، فالقرار واحد لكل عملية.
func (s *CrashGuardService) HandleFatalPanic(err error, stackTrace string) {
	_ = s.HandlePanic(err, stackTrace) // أي فشل كتابة يُسجَّل داخل HandlePanic

	// ترتيب المؤجَّلات مقصود: Unlock يُسجَّل أولاً وexitProcess بعده، فتُنفَّذ
	// المؤجَّلات بترتيب عكسي (LIFO) ⇒ الإنهاء يقع والقفل ما زال محتجزاً. أي
	// goroutine أخرى انهارت في اللحظة نفسها تبقى محجوبة على القفل ولا تُطلق
	// نسخة ثانية ولا تستهلك محاولة إضافية من حارس الحلقات.
	s.mu.Lock()
	defer s.mu.Unlock()
	defer exitProcess(1)

	if !autoRestartEnabled {
		slog.Warn("Crash auto-restart disabled (development build) — terminating")
		return
	}

	attempt, allowed := claimCrashRestartAttempt(time.Now())
	if !allowed {
		slog.Error("Crash restart loop guard tripped — not restarting",
			"attempt", attempt, "max", crashRestartMaxAttempts, "window", crashRestartWindow.String())
		return
	}

	if restartErr := restartProcess(); restartErr != nil {
		slog.Error("Crash auto-restart failed — terminating", "error", restartErr, "attempt", attempt)
		return
	}
	slog.Info("Crash auto-restart: new instance launched", "attempt", attempt)
}

// GetPendingCrashReport يفحص وجود تقرير انهيار سابق لم يُعالج
func (s *CrashGuardService) GetPendingCrashReport() (*CrashReport, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	path := s.GetDumpPath()
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read crash dump: %w", err)
	}

	var report CrashReport
	if err := json.Unmarshal(data, &report); err != nil {
		return nil, fmt.Errorf("parse crash dump: %w", err)
	}

	return &report, nil
}

// DismissCrashReport يحذف ملف التقرير بعد إقراره من المستخدم
func (s *CrashGuardService) DismissCrashReport() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	path := s.GetDumpPath()
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove crash dump: %w", err)
	}
	return nil
}

func (s *CrashGuardService) checkAutosaveExists() bool {
	autosavePath := filepath.Join(utils.GetAppDir(), "autosave.json")
	fi, err := os.Stat(autosavePath)
	return err == nil && !fi.IsDir() && fi.Size() > 0
}
