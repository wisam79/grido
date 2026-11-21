//go:build e2e

package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"grido/internal/utils"
)

var e2eDialogMu sync.Mutex

const maxDialogFixtureBytes = 64 << 10

type e2eDialogChoice struct {
	Kind   string   `json:"kind"`
	Title  string   `json:"title,omitempty"`
	Paths  []string `json:"paths,omitempty"`
	Cancel bool     `json:"cancel,omitempty"`
}

func selectRuntimeDialog(req runtimeDialogRequest) ([]string, error) {
	return queuedRuntimeDialog(req)
}

func selectOpenRuntimeDialog(req runtimeDialogRequest) ([]string, error) {
	return queuedRuntimeDialog(req)
}

// Adapter coverage excludes OS picker UI. Only paths/cancellation are selected;
// all decoding, media import, SQLite, autosave and export stay in production Go.
// No adapter is a registered service, API route or generated binding.
func queuedRuntimeDialog(req runtimeDialogRequest) ([]string, error) {
	e2eDialogMu.Lock()
	defer e2eDialogMu.Unlock()
	root, err := e2eDialogRoot()
	if err != nil {
		return nil, err
	}
	pending, err := e2eContainedPath(root, "e2e-dialogs/pending", false)
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(pending)
	if err != nil {
		return nil, fmt.Errorf("read e2e dialog queue: %w", err)
	}
	var names []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".json") {
			names = append(names, entry.Name())
		}
	}
	if len(names) == 0 {
		return nil, fmt.Errorf("e2e dialog queue empty for %s (%s); OS UI is excluded", req.kind, req.title)
	}
	sort.Strings(names)
	fixture, err := e2eContainedPath(root, filepath.Join("e2e-dialogs", "pending", names[0]), false)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(fixture)
	if err != nil {
		return nil, err
	}
	decoder := json.NewDecoder(io.LimitReader(f, maxDialogFixtureBytes+1))
	decoder.DisallowUnknownFields()
	var choice e2eDialogChoice
	err = decoder.Decode(&choice)
	if err == nil {
		var extra any
		if decoder.Decode(&extra) != io.EOF {
			err = errors.New("dialog fixture must contain exactly one JSON value")
		}
	}
	info, statErr := f.Stat()
	closeErr := f.Close()
	if err != nil {
		return nil, fmt.Errorf("invalid e2e dialog fixture: %w", err)
	}
	if statErr != nil || !info.Mode().IsRegular() || info.Size() > maxDialogFixtureBytes {
		return nil, errors.New("dialog fixture must be a regular file of at most 64 KiB")
	}
	if closeErr != nil {
		return nil, closeErr
	}
	if choice.Kind != req.kind || (choice.Title != "" && choice.Title != req.title) {
		return nil, fmt.Errorf("e2e dialog FIFO mismatch: expected %s (%s), queued %s (%s)", req.kind, req.title, choice.Kind, choice.Title)
	}
	var selected []string
	if choice.Cancel {
		if len(choice.Paths) != 0 {
			return nil, errors.New("cancelled dialog must not contain paths")
		}
	} else {
		if len(choice.Paths) == 0 || len(choice.Paths) > 256 || (req.kind != "open-files" && len(choice.Paths) != 1) {
			return nil, errors.New("invalid e2e dialog path count")
		}
		for _, path := range choice.Paths {
			resolved, err := e2eContainedPath(root, path, req.kind == "save-file")
			if err != nil {
				return nil, err
			}
			info, statErr := os.Stat(resolved)
			if req.kind == "save-file" {
				if statErr != nil && !errors.Is(statErr, os.ErrNotExist) {
					return nil, statErr
				}
				if statErr == nil && !info.Mode().IsRegular() {
					return nil, errors.New("save-file choice is not a regular file")
				}
			} else {
				if statErr != nil {
					return nil, statErr
				}
				if req.kind == "open-directory" && !info.IsDir() {
					return nil, errors.New("open-directory choice is not a directory")
				}
				if req.kind != "open-directory" && !info.Mode().IsRegular() {
					return nil, errors.New("open-file choice is not a regular file")
				}
			}
			selected = append(selected, resolved)
		}
	}
	consumedDir, err := e2eContainedPath(root, "e2e-dialogs/consumed", false)
	if err != nil {
		return nil, err
	}
	receipt := struct {
		Kind            string   `json:"kind"`
		Title           string   `json:"title"`
		DefaultFilename string   `json:"defaultFilename,omitempty"`
		Paths           []string `json:"paths"`
		Cancelled       bool     `json:"cancelled"`
		Coverage        string   `json:"coverage"`
	}{req.kind, req.title, req.defaultFilename, selected, choice.Cancel, "dialog-adapter-only; excludes-os-ui"}
	data, err := json.MarshalIndent(receipt, "", "  ")
	if err != nil {
		return nil, err
	}
	if err := utils.AtomicWriteFile(filepath.Join(consumedDir, names[0]), data, 0o600); err != nil {
		return nil, err
	}
	if err := os.Remove(fixture); err != nil {
		return nil, err
	}
	return selected, nil
}

func e2eDialogRoot() (string, error) {
	root := os.Getenv("GRIDO_E2E_DIALOG_ROOT")
	if root == "" || !filepath.IsAbs(root) || root != os.Getenv("GRIDO_APP_DIR") {
		return "", errors.New("e2e dialogs require absolute GRIDO_E2E_DIALOG_ROOT equal to GRIDO_APP_DIR")
	}
	resolved, err := filepath.EvalSymlinks(root)
	if err != nil {
		return "", err
	}
	if filepath.Clean(root) != filepath.Clean(resolved) {
		return "", errors.New("e2e dialog root must not have symlink ancestors")
	}
	return resolved, nil
}

// Every fixture/result path is root-relative, non-traversing and canonical.
// Saves permit a missing leaf only; its parent must already exist inside root.
func e2eContainedPath(root, relative string, missingLeaf bool) (string, error) {
	normalized := strings.ReplaceAll(relative, "\\", "/")
	if normalized == "" || strings.HasPrefix(normalized, "/") || strings.Contains(normalized, ":") || filepath.IsAbs(normalized) {
		return "", errors.New("dialog path must be root-relative")
	}
	for _, part := range strings.Split(normalized, "/") {
		if part == ".." || part == "." || part == "" {
			return "", errors.New("dialog path contains traversal/empty component")
		}
	}
	path := filepath.Join(root, filepath.FromSlash(normalized))
	resolved, err := filepath.EvalSymlinks(path)
	if missingLeaf && errors.Is(err, os.ErrNotExist) {
		// Lstat prevents an existing dangling symlink from being treated as a
		// harmless missing output file.
		if _, leafErr := os.Lstat(path); !errors.Is(leafErr, os.ErrNotExist) {
			return "", errors.New("save target is not a missing regular leaf")
		}
		parent, parentErr := filepath.EvalSymlinks(filepath.Dir(path))
		if parentErr != nil {
			return "", parentErr
		}
		resolved, err = filepath.Join(parent, filepath.Base(path)), nil
	}
	if err != nil {
		return "", err
	}
	if !utils.PathWithinDir(resolved, root) || filepath.Clean(resolved) != filepath.Clean(path) {
		return "", errors.New("dialog path escapes root or traverses a symlink")
	}
	return resolved, nil
}
