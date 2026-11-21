package service

import (
	"errors"

	"grido/internal/core/domain"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// Internal request: this is not a bound service or a second file-processing path.
type runtimeDialogRequest struct {
	kind            string
	title           string
	defaultFilename string
	filters         []domain.FileFilter
}

func firstDialogPath(paths []string) string {
	if len(paths) == 0 {
		return ""
	}
	return paths[0]
}

func nativeOpenFileDialog(req runtimeDialogRequest) ([]string, error) {
	app := application.Get()
	if app == nil {
		return nil, errors.New("dialog service not configured: application runtime is nil")
	}
	d := app.Dialog.OpenFile()
	d.SetTitle(req.title)
	for _, f := range req.filters {
		d.AddFilter(f.DisplayName, f.Pattern)
	}
	if req.kind == "open-directory" {
		d.CanChooseDirectories(true)
		d.CanChooseFiles(false)
	}
	if req.kind == "open-files" {
		return d.PromptForMultipleSelection()
	}
	path, err := d.PromptForSingleSelection()
	if path == "" {
		return nil, err
	}
	return []string{path}, err
}

func nativeSaveFileDialog(req runtimeDialogRequest) ([]string, error) {
	app := application.Get()
	if app == nil {
		return nil, errors.New("dialog service not configured: application runtime is nil")
	}
	d := app.Dialog.SaveFile()
	if req.title != "" {
		d.SetMessage(req.title)
	}
	if req.defaultFilename != "" {
		d.SetFilename(req.defaultFilename)
	}
	for _, f := range req.filters {
		d.AddFilter(f.DisplayName, f.Pattern)
	}
	path, err := d.PromptForSingleSelection()
	if path == "" {
		return nil, err
	}
	return []string{path}, err
}
