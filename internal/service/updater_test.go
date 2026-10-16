package service

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"grido/internal/core/domain"
)

func TestIsVersionGreater(t *testing.T) {
	tests := []struct {
		v1       string
		v2       string
		expected bool
	}{
		{"1.0.1", "1.0.0", true},
		{"1.0.0", "1.0.1", false},
		{"1.1.0", "1.0.9", true},
		{"2.0.0", "1.9.9", true},
		{"1.0.1", "1.0.1", false},
		// صيغ غير عادية
		{"1.0", "1.0.0", false},
		{"1.0.0", "1.0", false}, // it parses 1.0 as 1.0.0
		// لاحقات
		{"1.0.2-beta", "1.0.1", true},
		{"1.0.2", "1.0.2-alpha", false},
		// قيم فارغة
		{"", "1.0.0", false},
		{"1.0.0", "", true},
		{"", "", false},
	}

	for _, tt := range tests {
		result := isVersionGreater(tt.v1, tt.v2)
		if result != tt.expected {
			t.Errorf("isVersionGreater(%q, %q) = %v; expected %v", tt.v1, tt.v2, result, tt.expected)
		}
	}
}

// ─── التحقق من توقيع المثبت (Ed25519 على بصمة SHA-256) ──────────────
//
// العقد المُختبَر: بناء بمفتاح عام مثبّت لا يقبل أي مثبت بلا توقيع صالح، وتوقيع
// صالح للمفتاح نفسه يُقبل، وتوقيع مفتاح آخر أو بصمة مُعدَّلة يُرفض.

func TestVerifyInstallerSignature(t *testing.T) {
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("failed to generate ed25519 key: %v", err)
	}
	otherPublicKey, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("failed to generate second ed25519 key: %v", err)
	}

	digest := sha256.Sum256([]byte("installer bytes v1.14.3"))
	digestHex := hex.EncodeToString(digest[:])
	signature := ed25519.Sign(privateKey, digest[:])

	publicKeyB64 := base64.StdEncoding.EncodeToString(publicKey)
	publicKeyRawB64 := base64.RawStdEncoding.EncodeToString(publicKey)
	otherPublicKeyB64 := base64.StdEncoding.EncodeToString(otherPublicKey)
	signatureB64 := base64.StdEncoding.EncodeToString(signature)
	signatureRawB64 := base64.RawStdEncoding.EncodeToString(signature)

	tamperedDigest := sha256.Sum256([]byte("installer bytes v1.14.3 — معدَّل"))
	tamperedDigestHex := hex.EncodeToString(tamperedDigest[:])

	tests := []struct {
		name         string
		publicKey    string
		sha256Hex    string
		signatureB64 string
		wantErr      bool
		errContains  string
	}{
		{
			name:         "valid signature",
			publicKey:    publicKeyB64,
			sha256Hex:    digestHex,
			signatureB64: signatureB64,
		},
		{
			name:         "valid signature with unpadded base64",
			publicKey:    publicKeyRawB64,
			sha256Hex:    digestHex,
			signatureB64: signatureRawB64,
		},
		{
			name:         "signature from a different key",
			publicKey:    otherPublicKeyB64,
			sha256Hex:    digestHex,
			signatureB64: signatureB64,
			wantErr:      true,
			errContains:  "does not match the pinned public key",
		},
		{
			name:         "signature valid for a different digest",
			publicKey:    publicKeyB64,
			sha256Hex:    tamperedDigestHex,
			signatureB64: signatureB64,
			wantErr:      true,
			errContains:  "does not match the pinned public key",
		},
		{
			name:         "missing signature",
			publicKey:    publicKeyB64,
			sha256Hex:    digestHex,
			signatureB64: "   ",
			wantErr:      true,
			errContains:  "no signature published",
		},
		{
			name:         "malformed signature encoding",
			publicKey:    publicKeyB64,
			sha256Hex:    digestHex,
			signatureB64: "not a base64 signature!!",
			wantErr:      true,
			errContains:  "invalid signature encoding",
		},
		{
			name:         "truncated signature",
			publicKey:    publicKeyB64,
			sha256Hex:    digestHex,
			signatureB64: base64.StdEncoding.EncodeToString(signature[:16]),
			wantErr:      true,
			errContains:  "invalid signature length",
		},
		{
			name:         "no public key pinned",
			publicKey:    "",
			sha256Hex:    digestHex,
			signatureB64: signatureB64,
			wantErr:      true,
			errContains:  "no updater public key pinned",
		},
		{
			name:         "public key with wrong length",
			publicKey:    base64.StdEncoding.EncodeToString(publicKey[:16]),
			sha256Hex:    digestHex,
			signatureB64: signatureB64,
			wantErr:      true,
			errContains:  "invalid updater public key length",
		},
		{
			name:         "malformed checksum encoding",
			publicKey:    publicKeyB64,
			sha256Hex:    "zzzz-not-hex",
			signatureB64: signatureB64,
			wantErr:      true,
			errContains:  "invalid checksum encoding",
		},
		{
			name:         "checksum with wrong length",
			publicKey:    publicKeyB64,
			sha256Hex:    "aabbccdd",
			signatureB64: signatureB64,
			wantErr:      true,
			errContains:  "invalid checksum length",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := verifyInstallerSignature(tt.publicKey, tt.sha256Hex, tt.signatureB64)
			if tt.wantErr && err == nil {
				t.Fatalf("expected an error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
			if tt.errContains != "" && (err == nil || !strings.Contains(err.Error(), tt.errContains)) {
				t.Fatalf("error = %v, want it to contain %q", err, tt.errContains)
			}
		})
	}
}

func TestFindSignatureAssetURL(t *testing.T) {
	tests := []struct {
		name     string
		assets   []ReleaseAsset
		expected string
	}{
		{
			name: "direct signature asset",
			assets: []ReleaseAsset{
				{Name: "grido-checksums.txt", BrowserDownloadURL: "https://cdn.example.com/checksums.txt"},
				{Name: "grido-checksums.txt.sig", BrowserDownloadURL: "https://cdn.example.com/checksums.txt.sig"},
			},
			expected: "https://cdn.example.com/checksums.txt.sig",
		},
		{
			name: "github signature asset needs auth — skipped",
			assets: []ReleaseAsset{
				{Name: "installer.exe.sig", BrowserDownloadURL: "https://github.com/wisam79/grido/releases/download/v1/x.sig"},
			},
			expected: "",
		},
		{
			name:     "no signature asset",
			assets:   []ReleaseAsset{{Name: "installer.exe", BrowserDownloadURL: "https://cdn.example.com/i.exe"}},
			expected: "",
		},
		{
			name:     "signature asset without url",
			assets:   []ReleaseAsset{{Name: "installer.exe.sig", BrowserDownloadURL: ""}},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := findSignatureAssetURL(tt.assets); got != tt.expected {
				t.Errorf("findSignatureAssetURL() = %q, want %q", got, tt.expected)
			}
		})
	}
}

func TestFirstSignatureLine(t *testing.T) {
	tests := []struct {
		name     string
		content  string
		expected string
	}{
		{name: "plain signature", content: "AbCd==\n", expected: "AbCd=="},
		{name: "skips comments and blank lines", content: "\n# signed by release key\n\nEfGh==", expected: "EfGh=="},
		{name: "empty content", content: "\n  \n", expected: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := firstSignatureLine(tt.content); got != tt.expected {
				t.Errorf("firstSignatureLine() = %q, want %q", got, tt.expected)
			}
		})
	}
}

func TestExtractInstallerDownloadURL(t *testing.T) {
	tests := []struct {
		name     string
		assets   []ReleaseAsset
		expected string
	}{
		{
			name: "installer exe asset",
			assets: []ReleaseAsset{
				{Name: "grido-checksums.txt", BrowserDownloadURL: "https://example.com/checksums.txt"},
				{Name: "GridoStudio.exe", BrowserDownloadURL: "https://example.com/portable.exe"},
				{Name: "GridoStudio-installer.exe", BrowserDownloadURL: "https://example.com/installer.exe"},
			},
			expected: "https://example.com/installer.exe",
		},
		{
			name: "setup exe asset",
			assets: []ReleaseAsset{
				{Name: "Grido.Studio.Setup.exe", BrowserDownloadURL: "https://example.com/setup.exe"},
			},
			expected: "https://example.com/setup.exe",
		},
		{
			name: "generic exe asset fallback",
			assets: []ReleaseAsset{
				{Name: "GridoStudio.exe", BrowserDownloadURL: "https://example.com/GridoStudio.exe"},
			},
			expected: "https://example.com/GridoStudio.exe",
		},
		{
			name: "private github release asset normalized to domain",
			assets: []ReleaseAsset{
				{Name: "GridoStudio-installer.exe", BrowserDownloadURL: "https://github.com/wisam79/grido/releases/download/v1.14.2/GridoStudio-installer.exe"},
			},
			expected: defaultInstallerFallbackURL,
		},
		{
			name:     "empty assets default fallback",
			assets:   []ReleaseAsset{},
			expected: defaultInstallerFallbackURL,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractInstallerDownloadURL(tt.assets)
			if got != tt.expected {
				t.Errorf("extractInstallerDownloadURL() = %v, want %v", got, tt.expected)
			}
		})
	}
}

// ─── رفض الرابط الأولي غير المشفّر ─────────────────────────────────
//
// العقد المُختبَر: DownloadAndInstall يرفض رابط http:// قبل أي طلب شبكة —
// فحص CheckRedirect وحده لا يغطي الطلب الأول. الخادم المحلي هنا يثبت عدم
// وقوع أي اتصال (عدّاد الطلبات = صفر) وليس مجرد وجود خطأ عائد.

func TestUpdaterRejectsNonHTTPSInitialURL(t *testing.T) {
	var hits int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		w.Header().Set("Content-Type", "application/octet-stream")
		_, _ = w.Write([]byte("http installer payload"))
	}))
	defer server.Close()

	payload := sha256.Sum256([]byte("http installer payload"))
	err := NewUpdaterService().DownloadAndInstall(
		context.Background(),
		server.URL+"/GridoStudio-installer.exe",
		hex.EncodeToString(payload[:]),
		"",
	)

	if err == nil {
		t.Fatal("expected DownloadAndInstall to reject a non-HTTPS initial URL, got nil")
	}
	if !strings.Contains(err.Error(), "https://") {
		t.Fatalf("error = %v, want it to state the https:// requirement", err)
	}
	if got := atomic.LoadInt32(&hits); got != 0 {
		t.Fatalf("server was contacted %d time(s) — a network request was attempted before the scheme guard", got)
	}
}

// ─── بث تقدم التنزيل عبر جسر الرنتايم المحقون ─────────────────────
//
// العقد المُختبَر: progressWriter يبث عبر المنفذ المحقون بلا أي رنتايم Wails،
// ولا يعيد بث نفس النسبة مرتين. هذا هو ما كان يستحيل اختباره عندما كان المحدّث
// يستدعي application.Get() مباشرة.

// recordingBridge يسجل أسماء الأحداث المبثوثة
type recordingBridge struct {
	domain.NoopRuntimeBridge
	events []string
}

func (b *recordingBridge) Emit(name string, _ ...any) {
	b.events = append(b.events, name)
}

func TestProgressWriterEmitsThroughInjectedBridge(t *testing.T) {
	recorder := &recordingBridge{}
	pw := &progressWriter{total: 100, runtime: recorder}

	// 25٪ ثم 50٪ ثم كتابة صفرية (لا بث) ثم 100٪
	for _, size := range []int{25, 25, 0, 50} {
		if _, err := pw.Write(make([]byte, size)); err != nil {
			t.Fatalf("Write(%d bytes): %v", size, err)
		}
	}

	if len(recorder.events) != 3 {
		t.Fatalf("emitted %d events (%v), want 3", len(recorder.events), recorder.events)
	}
	for i, name := range recorder.events {
		if name != "update-progress" {
			t.Errorf("event[%d] = %q, want %q", i, name, "update-progress")
		}
	}
}

func TestUpdaterServiceDefaultsToRuntimeBridge(t *testing.T) {
	svc := NewUpdaterService()

	svc.SetRuntimeBridge(nil)

	if svc.runtime == nil {
		t.Error("runtime bridge must stay wired when a nil bridge is passed")
	}
}
