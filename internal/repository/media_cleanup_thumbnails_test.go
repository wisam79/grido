package repository

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func agePath(t *testing.T, path string, age time.Duration) {
	t.Helper()
	ts := time.Now().Add(-age)
	if err := os.Chtimes(path, ts, ts); err != nil {
		t.Fatalf("chtimes %s: %v", path, err)
	}
}

func setupThumbnails(t *testing.T) (mediaDir string, helper func()) {
	t.Helper()
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)
	mediaDir = filepath.Join(tempDir, "Media")
	thumbDir := filepath.Join(mediaDir, ".thumbs")
	if err := os.MkdirAll(thumbDir, 0o755); err != nil {
		t.Fatalf("mkdir thumbs: %v", err)
	}
	return mediaDir, func() {}
}

func TestCleanupThumbnails_KeepsActiveAndRemovesOrphans(t *testing.T) {
	mediaDir, _ := setupThumbnails(t)

	activeOriginal := "img_active.png"
	activeThumb := "img_active.png__w128.png"
	unreferencedOriginal := "img_old.png"
	unreferencedThumb := "img_old.png__w128.png"
	missingThumb := "img_missing.png__w128.png"
	junkFile := "__w999.png"

	for _, name := range []string{activeOriginal, unreferencedOriginal} {
		if err := os.WriteFile(filepath.Join(mediaDir, name), []byte("x"), 0o644); err != nil {
			t.Fatalf("write original %s: %v", name, err)
		}
	}
	for _, name := range []string{activeThumb, unreferencedThumb, missingThumb, junkFile} {
		if err := os.WriteFile(filepath.Join(mediaDir, ".thumbs", name), []byte("x"), 0o644); err != nil {
			t.Fatalf("write thumb %s: %v", name, err)
		}
	}

	// المصغرة غير المرجعية حديثة العهد يجب أن تبقى بفضل مهلة 24 ساعة.
	agePath(t, filepath.Join(mediaDir, unreferencedOriginal), 48*time.Hour)
	agePath(t, filepath.Join(mediaDir, ".thumbs", unreferencedThumb), time.Minute)
	agePath(t, filepath.Join(mediaDir, ".thumbs", activeThumb), time.Minute)
	agePath(t, filepath.Join(mediaDir, ".thumbs", missingThumb), 2*time.Hour)

	count, freed := cleanupThumbnails(mediaDir, map[string]bool{activeOriginal: true}, 24*time.Hour)
	if count != 1 || freed != 1 {
		t.Fatalf("expected 1 removed thumbnail, got count=%d freed=%d", count, freed)
	}

	if _, err := os.Stat(filepath.Join(mediaDir, ".thumbs", activeThumb)); err != nil {
		t.Fatalf("active thumbnail removed: %v", err)
	}
	if _, err := os.Stat(filepath.Join(mediaDir, ".thumbs", unreferencedThumb)); err != nil {
		t.Fatalf("recent unreferenced thumbnail removed early: %v", err)
	}
	if _, err := os.Stat(filepath.Join(mediaDir, ".thumbs", junkFile)); err != nil {
		t.Fatalf("non-thumbnail file removed: %v", err)
	}
	if _, err := os.Stat(filepath.Join(mediaDir, ".thumbs", missingThumb)); !os.IsNotExist(err) {
		t.Fatalf("missing-original thumbnail should be removed, got err=%v", err)
	}
}
