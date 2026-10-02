package service

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"grido/internal/utils"
)

// crashHooks يسجّل ما طلبه مسار الانهيار فعلاً (خروج/إعادة تشغيل) بدل تنفيذه.
type crashHooks struct {
	ExitCodes []int
	Restarts  int
}

// stubCrashHooks يستبدل خطافات العملية كي لا يُسقط الاختبار العملية ولا يُطلق
// عملية حقيقية، ويُبقي إعادة التشغيل معطّلة افتراضياً — الاختبارات التي تريد
// مسار إعادة التشغيل تُفعّلها صراحة.
func stubCrashHooks(t *testing.T) *crashHooks {
	t.Helper()

	originalExit := exitProcess
	originalRestart := restartProcess
	originalEnabled := autoRestartEnabled
	t.Cleanup(func() {
		exitProcess = originalExit
		restartProcess = originalRestart
		autoRestartEnabled = originalEnabled
	})

	hooks := &crashHooks{}
	exitProcess = func(code int) { hooks.ExitCodes = append(hooks.ExitCodes, code) }
	restartProcess = func() error {
		hooks.Restarts++
		return nil
	}
	autoRestartEnabled = false
	return hooks
}

func writeCrashRestartGuardFile(t *testing.T, state crashRestartGuard) {
	t.Helper()

	data, err := json.Marshal(state)
	if err != nil {
		t.Fatalf("failed to marshal guard state: %v", err)
	}
	if err := os.WriteFile(crashRestartGuardPath(), data, 0600); err != nil {
		t.Fatalf("failed to write guard state: %v", err)
	}
}

func TestCrashGuardService_HandleAndRecover(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	svc := NewCrashGuardService()

	// 1. لا يوجد تقرير قبل حدوث أي انهيار
	report, err := svc.GetPendingCrashReport()
	if err != nil {
		t.Fatalf("unexpected error getting pending report: %v", err)
	}
	if report != nil {
		t.Fatalf("expected nil report initially, got: %+v", report)
	}

	// 2. محاكاة وجود مسودة حفظ تلقائي
	autosavePath := filepath.Join(tempDir, "autosave.json")
	if err := os.WriteFile(autosavePath, []byte(`{"version":1,"elements":[]}`), 0644); err != nil {
		t.Fatalf("failed to create dummy autosave: %v", err)
	}

	// 3. التقاط panic وحفظ التقرير الذري
	simulatedErr := errors.New("runtime error: index out of range [5] with length 2")
	simulatedStack := "goroutine 1 [running]:\nmain.testPanic()\n\tc:/projects/grido/main.go:42"

	if err := svc.HandlePanic(simulatedErr, simulatedStack); err != nil {
		t.Fatalf("HandlePanic failed: %v", err)
	}

	// 4. استرجاع التقرير والتحقق من صحة الحقول
	report, err = svc.GetPendingCrashReport()
	if err != nil {
		t.Fatalf("GetPendingCrashReport failed: %v", err)
	}
	if report == nil {
		t.Fatal("expected report to be non-nil")
	}

	if report.Error != simulatedErr.Error() {
		t.Errorf("expected error %q, got %q", simulatedErr.Error(), report.Error)
	}
	if report.StackTrace != simulatedStack {
		t.Errorf("expected stack trace %q, got %q", simulatedStack, report.StackTrace)
	}
	if !report.HasAutosave {
		t.Errorf("expected HasAutosave to be true")
	}
	if report.OS == "" || report.Arch == "" {
		t.Errorf("expected OS and Arch to be populated")
	}

	// 5. إقرار التقرير وحذفه
	if err := svc.DismissCrashReport(); err != nil {
		t.Fatalf("DismissCrashReport failed: %v", err)
	}

	// 6. التحقق من عدم وجوده مجدداً
	reportAfterDismiss, err := svc.GetPendingCrashReport()
	if err != nil {
		t.Fatalf("unexpected error after dismiss: %v", err)
	}
	if reportAfterDismiss != nil {
		t.Errorf("expected nil report after dismiss, got: %+v", reportAfterDismiss)
	}
}

// TestCrashGuardService_HandleFatalPanicWritesThenExits يثبّت العقد الحرج:
// التقرير يُكتب أولاً ثم تُنهى العملية برمز الخروج 1 (سلوك Wails الافتراضي).
func TestCrashGuardService_HandleFatalPanicWritesThenExits(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	hooks := stubCrashHooks(t)

	svc := NewCrashGuardService()
	svc.HandleFatalPanic(errors.New("fatal boom"), "goroutine 1 [running]: main.testPanic()")

	if len(hooks.ExitCodes) != 1 || hooks.ExitCodes[0] != 1 {
		t.Fatalf("expected exactly one exit with code 1, got %v", hooks.ExitCodes)
	}
	if hooks.Restarts != 0 {
		t.Fatalf("auto-restart must not run when disabled, got %d relaunches", hooks.Restarts)
	}

	report, err := svc.GetPendingCrashReport()
	if err != nil {
		t.Fatalf("GetPendingCrashReport failed: %v", err)
	}
	if report == nil {
		t.Fatal("crash report must be persisted before the process exits")
	}
	if report.Error != "fatal boom" {
		t.Errorf("expected persisted error %q, got %q", "fatal boom", report.Error)
	}
}

// TestCrashGuardService_HandleFatalPanicExitsEvenIfPersistFails يضمن أن فشل
// الكتابة لا يمنع الإنهاء — الاستمرار بعد panic أسوأ من فقدان تقرير.
func TestCrashGuardService_HandleFatalPanicExitsEvenIfPersistFails(t *testing.T) {
	tempDir := t.TempDir()
	// مسار الهدف مجلد وليس ملفاً ⇒ يفشل الإحلال الذري (rename) حتماً على
	// ويندوز (MoveFileEx) و لينكس (EISDIR) — وGetAppDir/إنشاء المؤقت لا يُصلحانه.
	if err := os.MkdirAll(filepath.Join(tempDir, "crash-dump.json"), 0755); err != nil {
		t.Fatalf("failed to prepare blocking directory: %v", err)
	}
	t.Setenv("GRIDO_APP_DIR", tempDir)

	hooks := stubCrashHooks(t)

	svc := NewCrashGuardService()
	svc.HandleFatalPanic(errors.New("boom"), "stack")

	if len(hooks.ExitCodes) != 1 || hooks.ExitCodes[0] != 1 {
		t.Fatalf("expected exit code 1 even when dump write fails, got %v", hooks.ExitCodes)
	}
	if report, err := svc.GetPendingCrashReport(); err == nil && report != nil {
		t.Fatalf("expected no readable crash dump on write failure, got %+v", report)
	}
}

// TestCrashGuardService_HandleFatalPanicRelaunchesAndExits يتحقق من السلوك
// المطلوب: كتابة التقرير ثم إعادة إطلاق التطبيق ثم إنهاء هذه العملية.
func TestCrashGuardService_HandleFatalPanicRelaunchesAndExits(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	hooks := stubCrashHooks(t)
	autoRestartEnabled = true

	svc := NewCrashGuardService()
	svc.HandleFatalPanic(errors.New("boom"), "stack")

	if hooks.Restarts != 1 {
		t.Fatalf("expected exactly one relaunch, got %d", hooks.Restarts)
	}
	if len(hooks.ExitCodes) != 1 || hooks.ExitCodes[0] != 1 {
		t.Fatalf("expected exit code 1 after relaunch, got %v", hooks.ExitCodes)
	}
	if state := readCrashRestartGuard(); state.Count != 1 {
		t.Fatalf("expected the loop guard to record attempt 1, got %+v", state)
	}

	// التقرير يبقى على القرص ⇒ حوار استعادة المسودة في النسخة الجديدة
	report, err := svc.GetPendingCrashReport()
	if err != nil || report == nil {
		t.Fatalf("crash report must survive the restart: report=%+v err=%v", report, err)
	}
	if report.Error != "boom" {
		t.Errorf("expected persisted error %q, got %q", "boom", report.Error)
	}
}

// TestCrashGuardService_RestartLoopGuardTripsAtCap يمنع حلقة إعادة تشغيل
// لا نهائية: بعد السقف تُنهى العملية بلا إعادة إطلاق، مع بقاء التقرير.
func TestCrashGuardService_RestartLoopGuardTripsAtCap(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	hooks := stubCrashHooks(t)
	autoRestartEnabled = true

	svc := NewCrashGuardService()
	totalCrashes := crashRestartMaxAttempts + 2
	for i := 0; i < totalCrashes; i++ {
		svc.HandleFatalPanic(errors.New("boom"), "stack")
	}

	if hooks.Restarts != crashRestartMaxAttempts {
		t.Fatalf("expected at most %d relaunches, got %d", crashRestartMaxAttempts, hooks.Restarts)
	}
	if len(hooks.ExitCodes) != totalCrashes {
		t.Fatalf("the process must exit on every crash: expected %d exits, got %d", totalCrashes, len(hooks.ExitCodes))
	}
	for i, code := range hooks.ExitCodes {
		if code != 1 {
			t.Fatalf("exit #%d used code %d instead of 1", i+1, code)
		}
	}
}

// TestCrashGuardService_RelaunchFailureStillExits يضمن أن فشل الإطلاق لا
// يترك العملية حية بحالة فاسدة.
func TestCrashGuardService_RelaunchFailureStillExits(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	hooks := stubCrashHooks(t)
	autoRestartEnabled = true
	restartProcess = func() error { return errors.New("spawn failed") }

	svc := NewCrashGuardService()
	svc.HandleFatalPanic(errors.New("boom"), "stack")

	if len(hooks.ExitCodes) != 1 || hooks.ExitCodes[0] != 1 {
		t.Fatalf("expected exit code 1 even when the relaunch fails, got %v", hooks.ExitCodes)
	}
}

// TestCrashRestartGuard_FailsClosedWhenStateCannotBePersisted: بلا عدّاد محفوظ
// لا إعادة تشغيل (وإلا صارت حلقة محتملة)، لكن الإنهاء والتقرير يقعان دائماً.
func TestCrashRestartGuard_FailsClosedWhenStateCannotBePersisted(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)
	if err := os.MkdirAll(crashRestartGuardPath(), 0755); err != nil {
		t.Fatalf("failed to prepare blocking directory: %v", err)
	}

	hooks := stubCrashHooks(t)
	autoRestartEnabled = true

	svc := NewCrashGuardService()
	svc.HandleFatalPanic(errors.New("boom"), "stack")

	if hooks.Restarts != 0 {
		t.Fatalf("expected no relaunch when the loop guard cannot be persisted, got %d", hooks.Restarts)
	}
	if len(hooks.ExitCodes) != 1 || hooks.ExitCodes[0] != 1 {
		t.Fatalf("expected exit code 1, got %v", hooks.ExitCodes)
	}
	if report, err := svc.GetPendingCrashReport(); err != nil || report == nil {
		t.Fatalf("the crash report must still be written: report=%+v err=%v", report, err)
	}
}

func TestCrashRestartGuard_WindowExpiryStartsFreshSeries(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	// سلسلة بلغت السقف لكن آخر انهيار فيها خارج النافذة الزمنية ⇒ سلسلة جديدة
	stale := time.Now().Add(-crashRestartWindow - time.Minute).UTC().Format(time.RFC3339)
	writeCrashRestartGuardFile(t, crashRestartGuard{Count: crashRestartMaxAttempts, FirstCrashAt: stale})

	attempt, allowed := claimCrashRestartAttempt(time.Now())
	if !allowed || attempt != 1 {
		t.Fatalf("expected a fresh series (attempt=1, allowed=true), got attempt=%d allowed=%v", attempt, allowed)
	}
}

func TestCrashRestartGuard_CorruptStateStartsFreshSeries(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	if err := os.WriteFile(crashRestartGuardPath(), []byte("{ ليس JSON صالحاً"), 0600); err != nil {
		t.Fatalf("failed to write corrupt guard state: %v", err)
	}

	attempt, allowed := claimCrashRestartAttempt(time.Now())
	if !allowed || attempt != 1 {
		t.Fatalf("corrupt state must degrade to a fresh series, got attempt=%d allowed=%v", attempt, allowed)
	}
}

func TestCrashRestartGuard_ClearUnlocksFreshSeries(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	writeCrashRestartGuardFile(t, crashRestartGuard{
		Count:        crashRestartMaxAttempts,
		FirstCrashAt: time.Now().UTC().Format(time.RFC3339),
	})

	// داخل النافذة وعند السقف ⇒ مُنع
	if attempt, allowed := claimCrashRestartAttempt(time.Now()); allowed {
		t.Fatalf("expected the cap to block the relaunch, got attempt=%d", attempt)
	}

	// الإقلاع اليدوي يصفّر السلسلة
	if err := ClearCrashRestartGuard(); err != nil {
		t.Fatalf("ClearCrashRestartGuard failed: %v", err)
	}
	attempt, allowed := claimCrashRestartAttempt(time.Now())
	if !allowed || attempt != 1 {
		t.Fatalf("a manual launch must reset the series, got attempt=%d allowed=%v", attempt, allowed)
	}
}

func TestCrashRestartGuard_ClearIsIdempotent(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	if err := ClearCrashRestartGuard(); err != nil {
		t.Fatalf("clearing a missing guard must succeed, got %v", err)
	}
}

// stubGoroutineReporter يربط مستقبل panics الـ goroutines بمسار الانهيار ويعيد
// الحالة السابقة بعد الاختبار.
func stubGoroutineReporter(t *testing.T) {
	t.Helper()

	previous := utils.SetPanicReporter(ReportGoroutinePanic)
	t.Cleanup(func() { utils.SetPanicReporter(previous) })
}

func TestSafeGo_RunsNormallyWithoutCrashPath(t *testing.T) {
	hooks := stubCrashHooks(t)
	stubGoroutineReporter(t)

	done := make(chan struct{})
	utils.SafeGo("test.noop", func() { close(done) })

	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("SafeGo did not run the function")
	}

	if len(hooks.ExitCodes) != 0 || hooks.Restarts != 0 {
		t.Fatalf("a healthy goroutine must not touch the crash path: exits=%v restarts=%d", hooks.ExitCodes, hooks.Restarts)
	}
}

// TestSafeGo_FunnelsPanicIntoCrashPath يثبّت الغرض من الغلاف: panic في goroutine
// التطبيق يصل إلى تقرير الانهيار نفسه بدل موت صامت بلا أثر.
func TestSafeGo_FunnelsPanicIntoCrashPath(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	hooks := stubCrashHooks(t)
	stubGoroutineReporter(t)

	exited := make(chan int, 1)
	exitProcess = func(code int) {
		hooks.ExitCodes = append(hooks.ExitCodes, code)
		exited <- code
	}

	utils.SafeGo("test.image-worker", func() { panic("index out of range [5] with length 2") })

	select {
	case code := <-exited:
		if code != 1 {
			t.Fatalf("expected exit code 1 after a goroutine panic, got %d", code)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("goroutine panic never reached the crash path")
	}

	report, err := NewCrashGuardService().GetPendingCrashReport()
	if err != nil || report == nil {
		t.Fatalf("expected a crash dump from the goroutine panic: report=%+v err=%v", report, err)
	}
	if !strings.Contains(report.Error, "test.image-worker") {
		t.Errorf("crash report must name the goroutine source, got %q", report.Error)
	}
	if !strings.Contains(report.StackTrace, "TestSafeGo_FunnelsPanicIntoCrashPath") {
		t.Errorf("crash report must carry the goroutine stack, got %q", report.StackTrace)
	}
}

func TestIsCrashRelaunch(t *testing.T) {
	cases := []struct {
		name string
		args []string
		want bool
	}{
		{"flag only", []string{CrashRelaunchFlag}, true},
		{"flag with startup file", []string{"photo.png", CrashRelaunchFlag}, true},
		{"startup file only", []string{"photo.png"}, false},
		{"no args", nil, false},
	}

	for _, tc := range cases {
		if got := IsCrashRelaunch(tc.args); got != tc.want {
			t.Errorf("%s: IsCrashRelaunch(%v) = %v, want %v", tc.name, tc.args, got, tc.want)
		}
	}
}
