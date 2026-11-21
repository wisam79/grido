//go:build !e2e

package main

import "github.com/wailsapp/wails/v3/pkg/application"

func prepareRuntimeHarness() error                 { return nil }
func configureRuntimeHarness(*application.Options) {}
