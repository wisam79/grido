package utils

import (
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// TestCreateAtomic_SerializesConcurrentWriters يثبّت قفل المسار الداخلي:
// قبل الإصلاح كان كاتبان متزامنان يتشاركان <path>.tmp نفسه (O_TRUNC) فيتداخل
// المحتوى ثم يُنفَّذ rename على نتيجة مدموجة — ملف توكن/مشروع تالف بلا خطأ.
func TestCreateAtomic_SerializesConcurrentWriters(t *testing.T) {
	target := filepath.Join(t.TempDir(), "payload.bin")

	const writers = 8
	const size = 64 * 1024

	var wg sync.WaitGroup
	for i := 0; i < writers; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			handle, err := CreateAtomic(target, 0o644)
			if err != nil {
				t.Errorf("CreateAtomic: %v", err)
				return
			}

			payload := strings.Repeat(string(rune('a'+id)), size)
			if _, err := handle.WriteString(payload); err != nil {
				handle.Abort()
				t.Errorf("WriteString: %v", err)
				return
			}
			if err := handle.Commit(); err != nil {
				t.Errorf("Commit: %v", err)
			}
		}(i)
	}
	wg.Wait()

	data, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read final file: %v", err)
	}
	if len(data) != size {
		t.Fatalf("final file has %d bytes, want %d — كتابات متداخلة", len(data), size)
	}
	for i, b := range data {
		if b != data[0] {
			t.Fatalf("final file mixes writers at byte %d (%q != %q) — تداخل كتابات", i, b, data[0])
		}
	}
}

// TestCreateAtomic_AbortReleasesLock يضمن أن الإلغاء لا يُسرّب القفل (تعليق أبدي).
func TestCreateAtomic_AbortReleasesLock(t *testing.T) {
	target := filepath.Join(t.TempDir(), "aborted.bin")

	first, err := CreateAtomic(target, 0o644)
	if err != nil {
		t.Fatalf("CreateAtomic: %v", err)
	}
	first.Abort()

	done := make(chan struct{})
	go func() {
		second, err := CreateAtomic(target, 0o644)
		if err != nil {
			t.Errorf("CreateAtomic after Abort: %v", err)
		} else {
			second.Abort()
		}
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(3 * time.Second):
		t.Fatal("القفل لم يُحرَّر بعد Abort — CreateAtomic التالي معلّق")
	}
}

// TestAtomicFile_CommitThenAbortIsNoop يضمن أن Abort بعد Commit لا يمس الهدف
// (سياسة defer Abort في AtomicWriteFile تعتمد عليها).
func TestAtomicFile_CommitThenAbortIsNoop(t *testing.T) {
	target := filepath.Join(t.TempDir(), "committed.txt")

	handle, err := CreateAtomic(target, 0o644)
	if err != nil {
		t.Fatalf("CreateAtomic: %v", err)
	}
	if _, err := handle.WriteString("kept"); err != nil {
		t.Fatalf("WriteString: %v", err)
	}
	if err := handle.Commit(); err != nil {
		t.Fatalf("Commit: %v", err)
	}
	handle.Abort()

	data, err := os.ReadFile(target)
	if err != nil {
		t.Fatalf("read after Abort post-Commit: %v", err)
	}
	if string(data) != "kept" {
		t.Fatalf("Abort after Commit removed the committed file: %q", data)
	}
	if _, err := os.Stat(target + ".tmp"); !os.IsNotExist(err) {
		t.Fatalf("temp file left behind after Commit: %v", err)
	}
}
