//go:build windows

package utils

import (
	"errors"
	"net/url"
	"os/exec"
)

// OpenBrowser opens the specified URL in the default browser of the user.
func OpenBrowser(targetURL string) error {
	u, err := url.Parse(targetURL)
	if err != nil {
		return err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return errors.New("unsupported protocol scheme")
	}
	return exec.Command("cmd", "/c", "start", "", targetURL).Start()
}