//go:build !windows

package handlers

import (
	"os/exec"
	"runtime"
)

func printFileOS(absPath string) error {
	var cmd *exec.Cmd
	if runtime.GOOS == "darwin" {
		cmd = exec.Command("open", "--", absPath)
	} else {
		cmd = exec.Command("xdg-open", "--", absPath)
	}
	return cmd.Start()
}
