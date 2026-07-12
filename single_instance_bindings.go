//go:build bindings

package main

func checkSingleInstance() (func(), error) {
	// No-op during Wails bindings extraction compile runs
	return func() {}, nil
}
