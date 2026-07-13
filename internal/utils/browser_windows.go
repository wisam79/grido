//go:build windows

package utils

import "os/exec"

// OpenBrowser opens the specified URL in the default browser of the user.
func OpenBrowser(url string) error {
	return exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}