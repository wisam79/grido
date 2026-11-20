//go:build e2e

package main

import (
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func TestE2EHarnessOptions(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	harnessPort = 49231
	opts := application.Options{
		Windows:        application.WindowsOptions{WebviewUserDataPath: "isolated/cache"},
		SingleInstance: &application.SingleInstanceOptions{UniqueID: "production-lock"},
	}
	configureRuntimeHarness(&opts)
	if opts.Server.Host != "127.0.0.1" || opts.Server.Port != harnessPort {
		t.Fatalf("not loopback/selected port: %+v", opts.Server)
	}
	if opts.Server.WebSocketAllowAllOrigins || len(opts.Server.WebSocketOriginPatterns) != 0 {
		t.Fatal("harness must preserve origin protections")
	}
	if opts.Windows.WebviewUserDataPath != "isolated/cache" {
		t.Fatal("harness must preserve isolated WebView2 cache")
	}
	if opts.SingleInstance.UniqueID == "production-lock" {
		t.Fatal("single-instance lock must be run-scoped")
	}
	if runtimeHarnessMode == "native" {
		if len(opts.Windows.AdditionalBrowserArgs) != 2 || opts.Windows.AdditionalBrowserArgs[0] != "--remote-debugging-port=49231" || opts.Windows.AdditionalBrowserArgs[1] != "--remote-debugging-address=127.0.0.1" {
			t.Fatalf("incorrect native CDP args: %v", opts.Windows.AdditionalBrowserArgs)
		}
	} else if len(opts.Windows.AdditionalBrowserArgs) != 0 {
		t.Fatal("server build must not configure CDP")
	}
}

func TestE2EHarnessEndpointBoundary(t *testing.T) {
	for _, valid := range []string{"http://127.0.0.1:54321", "http://[::1]:54321", "https://127.0.0.1:443"} {
		if err := requireHarnessLoopbackURL(valid); err != nil {
			t.Errorf("valid loopback %q rejected: %v", valid, err)
		}
	}
	for _, invalid := range []string{"https://production.example.test", "http://localhost:54321", "http://0.0.0.0:54321", "http://127.0.0.1.evil.test", "file:///tmp/auth", "http://secret@127.0.0.1:54321", "http://127.0.0.1:54321?token=secret"} {
		if err := requireHarnessLoopbackURL(invalid); err == nil {
			t.Errorf("unsafe endpoint %q accepted", invalid)
		}
	}
}
