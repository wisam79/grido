package utils

import (
	"fmt"
	"path/filepath"
	"sync"
	"testing"
)

// TestPathLocks_NoLeak_ConcurrentSamePath — 50 كاتب متزامن لنفس المسار.
// يثبّت أن عدّ المراجع يمنع التسريب: بعد انتهاء كل Commit/Abort يجب أن
// يعود PathLocksCount() إلى 0 (لا مفاتيح عالقة للأبد).
func TestPathLocks_NoLeak_ConcurrentSamePath(t *testing.T) {
	target := filepath.Join(t.TempDir(), "same_target.bin")

	if c := PathLocksCount(); c != 0 {
		t.Fatalf("pre-count: PathLocksCount=%d want 0", c)
	}

	const writers = 50
	var wg sync.WaitGroup
	for i := 0; i < writers; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			h, err := CreateAtomic(target, 0o644)
			if err != nil {
				t.Errorf("CreateAtomic #%d: %v", id, err)
				return
			}
			if _, err := h.WriteString(fmt.Sprintf("payload-%d", id)); err != nil {
				h.Abort()
				t.Errorf("WriteString #%d: %v", id, err)
				return
			}
			if err := h.Commit(); err != nil {
				t.Errorf("Commit #%d: %v", id, err)
			}
		}(i)
	}
	wg.Wait()

	if c := PathLocksCount(); c != 0 {
		t.Fatalf("after %d concurrent writers same path: PathLocksCount=%d want 0 — تسريب pathLocks", writers, c)
	}
}

// TestPathLocks_NoLeak_UniquePaths — 1000 مسار فريد (img_${nano}.png).
// يحاكي حفظ الوسائط الحقيقي حيث كل صورة لها مسار فريد؛ قبل الإصلاح كان
// sync.Map ينمو بلا حد (مفتاح لكل img يبقى للأبد).
func TestPathLocks_NoLeak_UniquePaths(t *testing.T) {
	dir := t.TempDir()

	if c := PathLocksCount(); c != 0 {
		t.Fatalf("pre-count: PathLocksCount=%d want 0", c)
	}

	const n = 1000
	for i := 0; i < n; i++ {
		path := filepath.Join(dir, fmt.Sprintf("img_%d.png", i))
		if err := AtomicWriteFile(path, []byte("x"), 0o644); err != nil {
			t.Fatalf("AtomicWriteFile #%d: %v", i, err)
		}
		if c := PathLocksCount(); c != 0 {
			t.Fatalf("after #%d/%d: PathLocksCount=%d want 0 — تسريب عند %s", i, n, c, path)
		}
	}

	if c := PathLocksCount(); c != 0 {
		t.Fatalf("final: PathLocksCount=%d want 0 after %d unique paths", c, n)
	}
}

// TestPathLocks_NoLeak_AbortPaths — 200 مسار مع Abort يضمن عدم التسريب
// حتى في مسار الفشل (CommitAfterAbort يحرّر القفل عبر release في CreateAtomic).
func TestPathLocks_NoLeak_AbortPaths(t *testing.T) {
	dir := t.TempDir()

	const n = 200
	for i := 0; i < n; i++ {
		path := filepath.Join(dir, fmt.Sprintf("abort_%d.bin", i))
		h, err := CreateAtomic(path, 0o644)
		if err != nil {
			t.Fatalf("CreateAtomic #%d: %v", i, err)
		}
		h.Abort()
		if c := PathLocksCount(); c != 0 {
			t.Fatalf("after abort #%d: PathLocksCount=%d want 0", i, c)
		}
		// كتابة ثانية لنفس المسار يجب أن تنجح بلا تعليق
		if err := AtomicWriteFile(path, []byte("ok"), 0o644); err != nil {
			t.Fatalf("AtomicWriteFile after Abort #%d: %v", i, err)
		}
		if c := PathLocksCount(); c != 0 {
			t.Fatalf("after write after abort #%d: PathLocksCount=%d want 0", i, c)
		}
	}

	if c := PathLocksCount(); c != 0 {
		t.Fatalf("final after aborts: PathLocksCount=%d want 0", c)
	}
}

// TestPathLocks_NoLeak_ConcurrentUniquePaths — 100 كاتب متزامن لمسارات
// فريدة يضمن أن الخريطة لا تنمو حتى تحت المنافسة.
func TestPathLocks_NoLeak_ConcurrentUniquePaths(t *testing.T) {
	dir := t.TempDir()

	const n = 100
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			path := filepath.Join(dir, fmt.Sprintf("conc_unique_%d.bin", id))
			if err := AtomicWriteFile(path, []byte(fmt.Sprintf("v-%d", id)), 0o644); err != nil {
				t.Errorf("AtomicWriteFile #%d: %v", id, err)
			}
		}(i)
	}
	wg.Wait()

	if c := PathLocksCount(); c != 0 {
		t.Fatalf("after %d concurrent unique paths: PathLocksCount=%d want 0", n, c)
	}
}
