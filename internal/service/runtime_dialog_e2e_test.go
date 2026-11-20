//go:build e2e

package service

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

func TestE2EDialogAdapter(t *testing.T) {
	root := t.TempDir()
	for _, dir := range []string{"fixtures", "Exports", "e2e-dialogs/pending", "e2e-dialogs/consumed"} {
		if err := os.MkdirAll(filepath.Join(root, dir), 0o700); err != nil {
			t.Fatal(err)
		}
	}
	t.Setenv("GRIDO_APP_DIR", root)
	t.Setenv("GRIDO_E2E_DIALOG_ROOT", root)
	queue := func(name string, choice e2eDialogChoice) {
		t.Helper()
		data, err := json.Marshal(choice)
		if err != nil {
			t.Fatal(err)
		}
		if err := utils.AtomicWriteFile(filepath.Join(root, "e2e-dialogs", "pending", name+".json"), data, 0o600); err != nil {
			t.Fatal(err)
		}
	}
	bridge := NewWailsRuntimeBridge()

	t.Run("only selects real existing input", func(t *testing.T) {
		input := filepath.Join(root, "fixtures", "input.png")
		if err := os.WriteFile(input, []byte("fixture bytes, not a mocked media result"), 0o600); err != nil {
			t.Fatal(err)
		}
		queue("0001", e2eDialogChoice{Kind: "open-file", Paths: []string{"fixtures/input.png"}})
		selected, err := bridge.OpenFileDialog("Select an Image", nil)
		if err != nil || selected != input {
			t.Fatalf("selection=%q err=%v", selected, err)
		}
		data, err := os.ReadFile(filepath.Join(root, "e2e-dialogs", "consumed", "0001.json"))
		if err != nil {
			t.Fatal(err)
		}
		var receipt map[string]any
		if err := json.Unmarshal(data, &receipt); err != nil {
			t.Fatal(err)
		}
		if receipt["coverage"] != "dialog-adapter-only; excludes-os-ui" {
			t.Fatalf("coverage missing: %v", receipt)
		}
	})

	t.Run("save does not fake any write", func(t *testing.T) {
		queue("0002", e2eDialogChoice{Kind: "save-file", Paths: []string{"Exports/result.png"}})
		selected, err := bridge.SaveFileDialog("Save File", "result.png", []domain.FileFilter{{Pattern: "*.png"}})
		if err != nil || selected != filepath.Join(root, "Exports", "result.png") {
			t.Fatalf("selection=%q err=%v", selected, err)
		}
		if _, err := os.Stat(selected); !os.IsNotExist(err) {
			t.Fatalf("adapter must not write output: %v", err)
		}
	})

	t.Run("cancel and empty queue are distinct", func(t *testing.T) {
		queue("0003", e2eDialogChoice{Kind: "open-files", Cancel: true})
		selected, err := bridge.OpenFilesDialog("Select Images", nil)
		if err != nil || len(selected) != 0 {
			t.Fatalf("selection=%v err=%v", selected, err)
		}
		if _, err := bridge.OpenFilesDialog("Select Images", nil); err == nil {
			t.Fatal("empty queue must fail rather than simulate cancellation")
		}
	})

	t.Run("FIFO mismatch is not silently consumed", func(t *testing.T) {
		queue("0004", e2eDialogChoice{Kind: "save-file", Cancel: true})
		if _, err := bridge.OpenFileDialog("Select an Image", nil); err == nil {
			t.Fatal("wrong dialog kind accepted")
		}
		if _, err := os.Stat(filepath.Join(root, "e2e-dialogs", "pending", "0004.json")); err != nil {
			t.Fatal("mismatched queue item must remain pending", err)
		}
		if _, err := bridge.SaveFileDialog("Save File", "", nil); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("rejects traversal and absent parent", func(t *testing.T) {
		for _, path := range []string{"../outside", "fixtures/../../outside", "fixtures\\..\\outside", "/absolute", "C:/absolute", "Exports//file.png", "Exports/./file.png", "absent/result.png"} {
			if _, err := e2eContainedPath(root, path, true); err == nil {
				t.Errorf("unsafe path accepted: %q", path)
			}
		}
	})

	t.Run("rejects symlink input and output ancestors", func(t *testing.T) {
		outside := t.TempDir()
		if err := os.Symlink(outside, filepath.Join(root, "fixtures", "link")); err != nil {
			t.Skipf("platform does not allow test symlinks: %v", err)
		}
		if _, err := e2eContainedPath(root, "fixtures/link/output.png", true); err == nil {
			t.Fatal("symlink output ancestor accepted")
		}
		if _, err := e2eContainedPath(root, "fixtures/link", false); err == nil {
			t.Fatal("symlink directory accepted")
		}
	})
}
