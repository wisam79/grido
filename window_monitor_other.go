//go:build !windows || bindings

package main

func isPointOnAnyMonitor(_, _ int) bool {
	return true
}
