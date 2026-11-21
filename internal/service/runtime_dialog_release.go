//go:build !e2e

package service

func selectRuntimeDialog(req runtimeDialogRequest) ([]string, error) {
	return nativeSaveFileDialog(req)
}

func selectOpenRuntimeDialog(req runtimeDialogRequest) ([]string, error) {
	return nativeOpenFileDialog(req)
}
