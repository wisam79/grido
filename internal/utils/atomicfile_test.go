package utils

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// countTmpFiles يعدّ ملفات .tmp في المجلد — الثابت الأساسي للكتابة الذرية
// هو أنه لا يبقى أي مؤقت بعد أي مسار (نجاح أو فشل).
func countTmpFiles(t *testing.T, dir string) int {
	t.Helper()
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read dir %s: %v", dir, err)
	}
	n := 0
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".tmp") {
			n++
		}
	}
	return n
}

func TestAtomicWriteFile_WritesContentAndLeavesNoTmp(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "payload.json")
	payload := []byte(`{"hello":"world"}`)

	if err := AtomicWriteFile(path, payload, 0o644); err != nil {
		t.Fatalf("AtomicWriteFile failed: %v", err)
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read final file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Errorf("content mismatch: got %q want %q", got, payload)
	}
	if n := countTmpFiles(t, dir); n != 0 {
		t.Errorf("expected 0 leftover .tmp files, got %d", n)
	}
}

func TestAtomicFile_AbortRemovesTmp(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "aborted.bin")

	a, err := CreateAtomic(path, 0o644)
	if err != nil {
		t.Fatalf("CreateAtomic failed: %v", err)
	}
	if _, err := a.WriteString("partial"); err != nil {
		t.Fatalf("write failed: %v", err)
	}
	a.Abort()

	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Errorf("final file must not exist after Abort, stat err=%v", err)
	}
	if n := countTmpFiles(t, dir); n != 0 {
		t.Errorf("expected 0 leftover .tmp files, got %d", n)
	}
}

func TestAtomicFile_AbortAfterCommitKeepsFinalFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "kept.txt")

	a, err := CreateAtomic(path, 0o644)
	if err != nil {
		t.Fatalf("CreateAtomic failed: %v", err)
	}
	if _, err := a.WriteString("keep me"); err != nil {
		t.Fatalf("write failed: %v", err)
	}
	if err := a.Commit(); err != nil {
		t.Fatalf("Commit failed: %v", err)
	}
	a.Abort() // no-op — يجب ألا يحذف الملف النهائي

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("final file missing after Abort post-commit: %v", err)
	}
	if string(got) != "keep me" {
		t.Errorf("content mismatch: got %q", got)
	}
}

func TestAtomicFile_CommitAfterAbortFailsCleanly(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "noop.txt")

	a, err := CreateAtomic(path, 0o644)
	if err != nil {
		t.Fatalf("CreateAtomic failed: %v", err)
	}
	a.Abort()

	if err := a.Commit(); err == nil {
		t.Fatal("expected error when committing after Abort")
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Errorf("no final file must be created, stat err=%v", err)
	}
	if n := countTmpFiles(t, dir); n != 0 {
		t.Errorf("expected 0 leftover .tmp files, got %d", n)
	}
}

func TestAtomicFile_ReplacesExistingFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "replace.txt")
	if err := os.WriteFile(path, []byte("very old longer content"), 0o644); err != nil {
		t.Fatalf("seed file: %v", err)
	}

	if err := AtomicWriteFile(path, []byte("new"), 0o644); err != nil {
		t.Fatalf("AtomicWriteFile failed: %v", err)
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read final file: %v", err)
	}
	if string(got) != "new" {
		t.Errorf("expected full replacement, got %q", got)
	}
	if n := countTmpFiles(t, dir); n != 0 {
		t.Errorf("expected 0 leftover .tmp files, got %d", n)
	}
}

func TestAtomicFile_ReadFromLargeStream(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "large.bin")

	payload := bytes.Repeat([]byte("grido"), 256*1024) // ~1.3MB

	a, err := CreateAtomic(path, 0o644)
	if err != nil {
		t.Fatalf("CreateAtomic failed: %v", err)
	}
	defer a.Abort()

	n, err := io.Copy(a, bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("io.Copy failed: %v", err)
	}
	if n != int64(len(payload)) {
		t.Errorf("copied %d bytes, want %d", n, len(payload))
	}
	if err := a.Commit(); err != nil {
		t.Fatalf("Commit failed: %v", err)
	}

	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read final file: %v", err)
	}
	if !bytes.Equal(got, payload) {
		t.Errorf("streamed content mismatch: got %d bytes want %d", len(got), len(payload))
	}
}

func TestAtomicFile_InvalidDirLeavesNoTmp(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "missing-subdir", "file.txt")

	if err := AtomicWriteFile(path, []byte("x"), 0o644); err == nil {
		t.Fatal("expected error for non-existent parent directory")
	}
	if n := countTmpFiles(t, dir); n != 0 {
		t.Errorf("expected 0 leftover .tmp files, got %d", n)
	}
}

func TestAtomicFile_PermissionSensitive(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("file modes are not enforced on Windows")
	}

	dir := t.TempDir()
	path := filepath.Join(dir, ".license_token")

	if err := AtomicWriteFile(path, []byte("ciphertext"), 0o600); err != nil {
		t.Fatalf("AtomicWriteFile failed: %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat final file: %v", err)
	}
	if perm := info.Mode().Perm(); perm != 0o600 {
		t.Errorf("sensitive file permission = %o, want 600", perm)
	}
}
