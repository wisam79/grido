//go:build e2e

package main

import (
	"crypto/sha256"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strconv"

	"grido/internal/service"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var harnessPort int

// This entire configuration (including CDP) is excluded from release binaries.
// The same main/services/assets/auth paths run in both acceptance modes.
func prepareRuntimeHarness() error {
	root := os.Getenv("GRIDO_APP_DIR")
	if root == "" || !filepath.IsAbs(root) || filepath.Clean(root) == filepath.VolumeName(root)+string(filepath.Separator) {
		return fmt.Errorf("e2e requires an absolute, non-volume-root GRIDO_APP_DIR")
	}
	if err := os.MkdirAll(root, 0o700); err != nil {
		return err
	}
	resolved, err := filepath.EvalSymlinks(root)
	if err != nil {
		return err
	}
	if filepath.Clean(resolved) != filepath.Clean(root) {
		return fmt.Errorf("e2e app directory must be canonical (no symlink ancestors)")
	}
	if os.Getenv("GRIDO_E2E_DIALOG_ROOT") != root {
		return fmt.Errorf("GRIDO_E2E_DIALOG_ROOT must equal GRIDO_APP_DIR")
	}
	if os.Getenv("GRIDO_E2E_MODE") != runtimeHarnessMode {
		return fmt.Errorf("GRIDO_E2E_MODE must match binary build mode %s", runtimeHarnessMode)
	}
	portEnv := "GRIDO_E2E_SERVER_PORT"
	if runtimeHarnessMode == "native" {
		if runtime.GOOS != "windows" {
			return fmt.Errorf("native e2e currently requires Windows WebView2")
		}
		portEnv = "GRIDO_E2E_CDP_PORT"
	}
	harnessPort, err = strconv.Atoi(os.Getenv(portEnv))
	if err != nil || harnessPort < 1024 || harnessPort > 65535 {
		return fmt.Errorf("%s must be a selected port in 1024..65535", portEnv)
	}
	// Wails gives these variables precedence over Options.Server. Overwrite
	// inherited values so the harness can never listen on a public interface.
	if err := os.Setenv("WAILS_SERVER_HOST", "127.0.0.1"); err != nil {
		return err
	}
	if err := os.Setenv("WAILS_SERVER_PORT", strconv.Itoa(harnessPort)); err != nil {
		return err
	}
	// Do not let a devserver or WebView2-wide environment override our assets
	// or debugging flags. Production binaries do not execute this code.
	for _, key := range []string{"FRONTEND_DEVSERVER_URL", "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "WEBVIEW2_USER_DATA_FOLDER"} {
		if err := os.Unsetenv(key); err != nil {
			return err
		}
	}
	// Dedicated sandbox aliases override only the endpoint/key, never a
	// profile, token, session or entitlement. Authentication remains real Go.
	if endpoint := os.Getenv("GRIDO_E2E_SUPABASE_URL"); endpoint != "" {
		service.SupabaseURL = endpoint
	}
	if key := os.Getenv("GRIDO_E2E_SUPABASE_ANON_KEY"); key != "" {
		service.SupabaseAnonKey = key
	}
	if service.SupabaseURL != "" {
		if err := requireHarnessLoopbackURL(service.SupabaseURL); err != nil {
			return fmt.Errorf("sandbox Supabase endpoint: %w", err)
		}
	}
	if service.ModalAIURL != "" {
		if err := requireHarnessLoopbackURL(service.ModalAIURL); err != nil {
			return fmt.Errorf("sandbox AI endpoint: %w", err)
		}
	}
	return nil
}

func requireHarnessLoopbackURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return fmt.Errorf("endpoint must be a loopback HTTP(S) URL without credentials/query/fragment")
	}
	ip := net.ParseIP(u.Hostname())
	if ip == nil || !ip.IsLoopback() {
		return fmt.Errorf("endpoint must use a literal loopback IP, not a DNS name")
	}
	return nil
}

func configureRuntimeHarness(opts *application.Options) {
	opts.Server.Host = "127.0.0.1"
	opts.Server.Port = harnessPort
	// Same real single-instance semantics, scoped to this isolated run.
	if opts.SingleInstance != nil {
		sum := sha256.Sum256([]byte(os.Getenv("GRIDO_APP_DIR")))
		opts.SingleInstance.UniqueID = fmt.Sprintf("grido-e2e-%x", sum[:16])
	}
	if runtimeHarnessMode == "native" {
		opts.Windows.AdditionalBrowserArgs = []string{
			fmt.Sprintf("--remote-debugging-port=%d", harnessPort),
			"--remote-debugging-address=127.0.0.1",
		}
	}
}
