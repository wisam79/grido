package service_test

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"grido/internal/desktop"
	"grido/internal/service"
)

func TestMemoryService_TrimNow(t *testing.T) {
	memSvc := service.NewMemoryService()
	memSvc.TrimNow() // Should execute without crashing or hanging
}

func TestMemoryService_Lifecycle(t *testing.T) {
	memSvc := service.NewMemoryService()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	memSvc.StartAutoTrim(ctx)
	time.Sleep(50 * time.Millisecond)
	memSvc.Stop()
}

// TestMemoryService_ConcurrentTrimNowCoalesces يتحقق من حارس in-flight ونافذة
// الدمج: نداءات TrimNow متزامنة أثناء دورة جارية، ونداء متقارب بعد انتهائها،
// كلها تنتج دورة تنفيذ واحدة — ودورة ثانية فقط بعد انقضاء نافذة الدمج.
func TestMemoryService_ConcurrentTrimNowCoalesces(t *testing.T) {
	var cycles atomic.Int32
	memSvc := service.NewMemoryService()
	memSvc.ConfigureForTest(service.TestConfig{
		TrimExec: func() {
			cycles.Add(1)
			time.Sleep(50 * time.Millisecond) // دورة طويلة بما يكفي لتتزامن الطلبات
		},
		CoalesceWindow: 200 * time.Millisecond,
	})
	defer memSvc.Stop()

	const callers = 8
	var wg sync.WaitGroup
	for i := 0; i < callers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			memSvc.TrimNow()
		}()
	}
	wg.Wait()

	// طلب مباشر بعد انتهاء الدورة المتزامنة داخل نافذة الدمج — يُدمَج أيضاً
	memSvc.TrimNow()
	if n := cycles.Load(); n != 1 {
		t.Fatalf("concurrent + nearby TrimNow executed %d cycle(s), want 1", n)
	}

	// بعد انقضاء نافذة الدمج يعمل الطلب الصريح من جديد
	time.Sleep(300 * time.Millisecond)
	memSvc.TrimNow()
	if n := cycles.Load(); n != 2 {
		t.Fatalf("TrimNow after coalesce window executed %d cycle(s), want 2", n)
	}
}

// TestMemoryService_HeavyWorkBlocksAutoTrimButNotExplicit يتحقق من عدّاد العمل
// الثقيل: العدّاد > 0 يمنع الفحص الدوري والتقليم التلقائي تماماً، بينما
// TrimNow الصريح يظل يعمل دائماً، والمسار التلقائي يستعيد عمله بعد انتهاء
// العمل الثقيل.
func TestMemoryService_HeavyWorkBlocksAutoTrimButNotExplicit(t *testing.T) {
	var cycles atomic.Int32
	exec := func() {
		cycles.Add(1)
		time.Sleep(5 * time.Millisecond)
	}

	memSvc := service.NewMemoryService()
	memSvc.ConfigureForTest(service.TestConfig{
		TrimExec:      exec,
		StartupDelay:  20 * time.Millisecond,
		CheckInterval: 20 * time.Millisecond,
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	memSvc.MarkHeavyWorkStart()
	memSvc.StartAutoTrim(ctx)

	// عدة فحوص دورية (كل 20ms) أثناء العمل الثقيل — يجب أن تتخطى كلها
	time.Sleep(200 * time.Millisecond)
	if n := cycles.Load(); n != 0 {
		t.Fatalf("auto trim executed %d cycle(s) during heavy work, want 0", n)
	}

	// التقليم الصريح يتجاوز حارس العمل الثقيل دائماً
	memSvc.TrimNow()
	if n := cycles.Load(); n != 1 {
		t.Fatalf("explicit TrimNow executed %d cycle(s) during heavy work, want 1", n)
	}

	memSvc.MarkHeavyWorkEnd()
	cancel()
	memSvc.Stop()

	// بعد انتهاء العمل الثقيل يستعيد المسار التلقائي (TrimThrottled) عمله
	fresh := service.NewMemoryService()
	fresh.ConfigureForTest(service.TestConfig{TrimExec: exec})
	defer fresh.Stop()
	fresh.TrimThrottled()
	if n := cycles.Load(); n != 2 {
		t.Fatalf("throttled trim after heavy work ended executed %d cycle(s), want 2", n)
	}
}

// TestWindowState_SaveSkipsIdenticalAndWritesChanged يتحقق من memoization
// حالة النافذة: حفظ الحالة المطابقة تماماً لآخر قيمة محفوظة يتخطى الكتابة
// الذرية كلياً (يُثبت بعبث خارجي بملف الهدف — يبقى محتواه المعبث)، وحفظ
// حالة متغيرة يكتب فعلاً فوق الملف.
func TestWindowState_SaveSkipsIdenticalAndWritesChanged(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tmp)

	first := desktop.WindowState{Width: 1280, Height: 800, X: 100, Y: 90, Max: false}
	if err := desktop.SaveWindowState(first); err != nil {
		t.Fatalf("first save: %v", err)
	}
	path := desktop.GetWindowStatePath()

	// عبث خارجي بالملف: إن أعادت الكتابة الحالة المطابقة لاحقاً سيتغير محتواه
	tampered := []byte(`{"width":1,"height":1,"x":0,"y":0,"max":false}`)
	if err := os.WriteFile(path, tampered, 0644); err != nil {
		t.Fatalf("tamper file: %v", err)
	}

	// حفظ الحالة المطابقة تماماً — يجب تخطي الكتابة كلياً (يبقى المحتوى المعبث)
	if err := desktop.SaveWindowState(first); err != nil {
		t.Fatalf("identical save: %v", err)
	}
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read after identical save: %v", err)
	}
	if !bytes.Equal(got, tampered) {
		t.Fatalf("identical state was re-written: got %q, want untouched %q", got, tampered)
	}

	// حالة متغيّرة — يجب أن تُكتب فعلاً فوق المحتوى المعبث
	second := desktop.WindowState{Width: 1440, Height: 900, X: 55, Y: 66, Max: true}
	if err := desktop.SaveWindowState(second); err != nil {
		t.Fatalf("changed save: %v", err)
	}
	got, err = os.ReadFile(path)
	if err != nil {
		t.Fatalf("read after changed save: %v", err)
	}
	want, err := json.Marshal(second)
	if err != nil {
		t.Fatalf("marshal second state: %v", err)
	}
	if !bytes.Equal(got, want) {
		t.Fatalf("changed state not written: got %q, want %q", got, want)
	}
}
