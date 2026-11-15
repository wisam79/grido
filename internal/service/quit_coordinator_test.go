package service_test

import (
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"grido/internal/service"
)

type fakeQuitTimer struct {
	mu      sync.Mutex
	delay   time.Duration
	fn      func()
	stopped bool
	fired   bool
}

func (t *fakeQuitTimer) Stop() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.stopped || t.fired {
		return false
	}
	t.stopped = true
	return true
}

func (t *fakeQuitTimer) Fire() {
	t.mu.Lock()
	if t.stopped || t.fired {
		t.mu.Unlock()
		return
	}
	t.fired = true
	fn := t.fn
	t.mu.Unlock()
	if fn != nil {
		fn()
	}
}

// FireEvenAfterStop simulates a timer callback that had already started right as Stop() ran.
func (t *fakeQuitTimer) FireRace() {
	t.mu.Lock()
	fn := t.fn
	t.mu.Unlock()
	if fn != nil {
		fn()
	}
}

type fakeTimerRig struct {
	mu     sync.Mutex
	timers []*fakeQuitTimer
}

func (r *fakeTimerRig) AfterFunc(d time.Duration, f func()) service.QuitTimer {
	t := &fakeQuitTimer{delay: d, fn: f}
	r.mu.Lock()
	r.timers = append(r.timers, t)
	r.mu.Unlock()
	return t
}

func (r *fakeTimerRig) Last() *fakeQuitTimer {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.timers) == 0 {
		return nil
	}
	return r.timers[len(r.timers)-1]
}

func (r *fakeTimerRig) Count() int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return len(r.timers)
}

func TestQuitCoordinator_SaveLongerThanAckTimeout(t *testing.T) {
	rig := &fakeTimerRig{}
	var saveWinCalls, emitCalls, quitCalls atomic.Int32
	var emittedID atomic.Uint64

	qc := service.NewQuitCoordinator(service.QuitCoordinatorHooks{
		SaveWindowState:   func() { saveWinCalls.Add(1) },
		EmitQuitRequested: func(id uint64) { emitCalls.Add(1); emittedID.Store(id) },
		PerformQuit:       func() { quitCalls.Add(1) },
		AfterFunc:         rig.AfterFunc,
		AckTimeout:        5 * time.Second,
		SavingTimeout:     30 * time.Second,
	})

	reqID := qc.RequestQuit()
	if reqID != 1 || emittedID.Load() != 1 {
		t.Fatalf("expected requestID 1, got %d (emitted %d)", reqID, emittedID.Load())
	}
	if saveWinCalls.Load() != 1 || emitCalls.Load() != 1 {
		t.Fatalf("expected 1 saveWindowState and 1 emit, got %d/%d", saveWinCalls.Load(), emitCalls.Load())
	}

	ackTimer := rig.Last()
	if ackTimer.delay != 5*time.Second {
		t.Fatalf("expected 5s ack timer, got %v", ackTimer.delay)
	}

	// Frontend acknowledges and starts a slow save -> transitions to 30s saving timer.
	if !qc.Respond(reqID, "saving") {
		t.Fatal("expected saving response to succeed")
	}
	if qc.Stage() != service.QuitStageSaving {
		t.Fatalf("expected saving stage, got %s", qc.Stage())
	}
	// Old ack timer firing concurrently must do nothing.
	ackTimer.FireRace()
	if quitCalls.Load() != 0 {
		t.Fatalf("ack timer must not quit once saving started, got %d quits", quitCalls.Load())
	}

	savingTimer := rig.Last()
	if savingTimer.delay != 30*time.Second {
		t.Fatalf("expected 30s saving timer, got %v", savingTimer.delay)
	}

	// Duplicate RequestQuit while saving must not re-emit or reset timer.
	if dupID := qc.RequestQuit(); dupID != reqID {
		t.Fatalf("expected duplicate request to return %d, got %d", reqID, dupID)
	}
	if emitCalls.Load() != 1 || rig.Count() != 2 {
		t.Fatalf("duplicate request re-emitted or re-armed timer: emits=%d timers=%d", emitCalls.Load(), rig.Count())
	}

	// Frontend finishes save -> confirm quits once and stops saving timer.
	if !qc.Respond(reqID, "confirm") {
		t.Fatal("expected confirm to succeed")
	}
	if quitCalls.Load() != 1 {
		t.Fatalf("expected 1 quit call, got %d", quitCalls.Load())
	}
	// Concurrent saving timer callback arriving simultaneously must not quit twice.
	savingTimer.FireRace()
	if quitCalls.Load() != 1 {
		t.Fatalf("concurrent timer race triggered extra quit: got %d", quitCalls.Load())
	}
}

func TestQuitCoordinator_FailureStopsTimerAndSupportsCancelRetryConfirm(t *testing.T) {
	rig := &fakeTimerRig{}
	var quitCalls atomic.Int32

	qc := service.NewQuitCoordinator(service.QuitCoordinatorHooks{
		PerformQuit: func() { quitCalls.Add(1) },
		AfterFunc:   rig.AfterFunc,
	})

	req1 := qc.RequestQuit()
	if !qc.Respond(req1, "saving") {
		t.Fatal("saving ack failed")
	}
	savingTimer := rig.Last()

	// Save fails -> enters awaiting-decision and stops safety timer.
	if !qc.Respond(req1, "failed") {
		t.Fatal("failed transition failed")
	}
	if qc.Stage() != service.QuitStageAwaitingDecision {
		t.Fatalf("expected awaiting-decision, got %s", qc.Stage())
	}
	savingTimer.FireRace()
	if quitCalls.Load() != 0 {
		t.Fatalf("must not auto-quit while awaiting user decision, got %d", quitCalls.Load())
	}

	// User cancels quit -> returns to idle.
	if !qc.Respond(req1, "cancel") {
		t.Fatal("cancel failed")
	}
	if qc.Stage() != service.QuitStageIdle {
		t.Fatalf("expected idle after cancel, got %s", qc.Stage())
	}

	// Stale requestID from cancelled attempt is rejected.
	if qc.Respond(req1, "confirm") {
		t.Fatal("stale requestID must be rejected after cancel")
	}

	// Second close attempt gets a fresh requestID and can confirm after failure retry.
	req2 := qc.RequestQuit()
	if req2 <= req1 {
		t.Fatalf("expected monotonic requestID > %d, got %d", req1, req2)
	}
	if !qc.Respond(req2, "saving") || !qc.Respond(req2, "failed") {
		t.Fatal("expected retry sequence to reach awaiting-decision")
	}
	// Explicit "Quit without saving" confirms req2.
	if !qc.Respond(req2, "confirm") {
		t.Fatal("explicit confirm after failure failed")
	}
	if quitCalls.Load() != 1 {
		t.Fatalf("expected 1 quit call, got %d", quitCalls.Load())
	}
}

func TestQuitCoordinator_UnresponsiveFrontendQuitsOnAckTimeout(t *testing.T) {
	rig := &fakeTimerRig{}
	var quitCalls atomic.Int32

	qc := service.NewQuitCoordinator(service.QuitCoordinatorHooks{
		PerformQuit: func() { quitCalls.Add(1) },
		AfterFunc:   rig.AfterFunc,
	})

	qc.RequestQuit()
	rig.Last().Fire()

	if quitCalls.Load() != 1 {
		t.Fatalf("expected unresponsive frontend to quit on ack timeout, got %d", quitCalls.Load())
	}
	if qc.Stage() != service.QuitStageShuttingDown {
		t.Fatalf("expected shutting-down stage, got %s", qc.Stage())
	}
	if qc.RequestQuit() != 0 {
		t.Fatal("expected RequestQuit after shutdown to return 0")
	}
}
