//go:build !ios

package main

import "github.com/wailsapp/wails/v3/pkg/application"

// ModifyOptionsForIOS is a no-op on non-iOS platforms
func ModifyOptionsForIOS(opts *application.Options) {
	// No modifications needed for non-iOS platforms
}