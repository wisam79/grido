package service

import (
	"errors"
	"net/url"
	"strings"
	"testing"
)

// ────────────────────────────────────────────────────────────────────────────
// اختبارات منفذ فتح المتصفح الموحّد (MAINT-06)
//
// كانت الطبقة ثلاث نسخ build-tag (rundll32/xdg-open/open) بلا مستدعٍ سوى
// oauth_server.go — استُبدلت بمنفذ محقون قابل للاختبار في LicenseService بلا
// فتح متصفح حقيقي. المنفذ الافتراضي الآن جسر الرنتايم (WailsRuntimeBridge)
// ويبقى قابلاً للاستبدال المباشر بالحقل أو بـ SetBrowserOpener.
// ────────────────────────────────────────────────────────────────────────────

func TestBuildOAuthAuthorizeURL_ContainsProviderAndCallback(t *testing.T) {
	callback := "http://127.0.0.1:54321/callback"

	got := buildOAuthAuthorizeURL(callback)

	if !strings.Contains(got, "/auth/v1/authorize?provider=google") {
		t.Errorf("authorize URL missing google provider: %s", got)
	}
	// redirect_to مُرمَّز (QueryEscape) ويحمل نفس الخادم المحلي
	parsed, err := url.Parse(got)
	if err != nil {
		t.Fatalf("authorize URL is not parseable: %v", err)
	}
	if redirect := parsed.Query().Get("redirect_to"); redirect != callback {
		t.Errorf("redirect_to = %q, want %q", redirect, callback)
	}
}

func TestOpenBrowserURL_UsesInjectedOpener(t *testing.T) {
	svc := NewLicenseService(nil)

	var captured string
	svc.browserOpen = func(u string) error {
		captured = u
		return nil
	}

	if err := svc.openBrowserURL("https://example.test/authorize"); err != nil {
		t.Fatalf("openBrowserURL returned error: %v", err)
	}
	if captured != "https://example.test/authorize" {
		t.Errorf("opener received %q, want the authorize URL", captured)
	}
}

func TestOpenBrowserURL_ReturnsOpenerError(t *testing.T) {
	svc := NewLicenseService(nil)
	wantErr := errors.New("no browser")
	svc.browserOpen = func(string) error { return wantErr }

	if err := svc.openBrowserURL("https://example.test/authorize"); !errors.Is(err, wantErr) {
		t.Errorf("error = %v, want %v", err, wantErr)
	}
}

// بلا رنتايم Wails (بيئة اختبارات/CLI) يُرجع المنفذ الافتراضي (جسر الرنتايم)
// خطأ واضحاً ولا يُسبب ذعراً أو سلوكاً صامتاً غامضاً.
func TestOpenBrowserURL_NotConfiguredFailsClearly(t *testing.T) {
	svc := NewLicenseService(nil)

	err := svc.openBrowserURL("https://example.test/authorize")
	if err == nil {
		t.Fatal("expected error when browser opener is not configured")
	}
	if !strings.Contains(err.Error(), "browser opener") {
		t.Errorf("error = %v, want a clear 'browser opener' message", err)
	}
}

// SetBrowserOpener(nil) يجب أن يُتجاهل ويُبقي المنفذ الافتراضي موصولاً
func TestSetBrowserOpener_NilIsIgnored(t *testing.T) {
	svc := NewLicenseService(nil)

	svc.SetBrowserOpener(nil)

	if svc.browserOpen == nil {
		t.Error("browserOpen must stay wired when a nil opener is passed")
	}
}

// SetBrowserOpener يستبدل المنفذ الافتراضي فعلاً
func TestSetBrowserOpener_OverridesDefault(t *testing.T) {
	svc := NewLicenseService(nil)

	called := false
	svc.SetBrowserOpener(func(string) error {
		called = true
		return nil
	})

	if err := svc.openBrowserURL("https://example.test/authorize"); err != nil {
		t.Fatalf("openBrowserURL returned error: %v", err)
	}
	if !called {
		t.Error("injected opener was not used")
	}
}
