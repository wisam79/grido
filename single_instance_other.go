//go:build !windows

package main

func checkSingleInstance() (func(), error) {
	cleanup := func() {}
	return cleanup, nil
}
