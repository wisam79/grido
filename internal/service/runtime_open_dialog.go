package service

import "grido/internal/core/domain"

// These concrete bridge methods only select paths. Callers retain all real
// import, directory processing and export logic; the bridge is not registered
// as a Wails service, so no new IPC methods are exposed.
func (WailsRuntimeBridge) OpenFileDialog(title string, filters []domain.FileFilter) (string, error) {
	paths, err := selectOpenRuntimeDialog(runtimeDialogRequest{kind: "open-file", title: title, filters: filters})
	return firstDialogPath(paths), err
}

func (WailsRuntimeBridge) OpenFilesDialog(title string, filters []domain.FileFilter) ([]string, error) {
	return selectOpenRuntimeDialog(runtimeDialogRequest{kind: "open-files", title: title, filters: filters})
}

func (WailsRuntimeBridge) OpenDirectoryDialog(title string) (string, error) {
	paths, err := selectOpenRuntimeDialog(runtimeDialogRequest{kind: "open-directory", title: title})
	return firstDialogPath(paths), err
}
