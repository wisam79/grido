package service

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// ────────────────────────────────────────────────────────────────────────────
// اختبارات سياسة إعادة المحاولة الموحّدة — دالة backoff نقية + httptest
// ────────────────────────────────────────────────────────────────────────────

func TestBackoffDelay_GrowthCapAndJitter(t *testing.T) {
	base := 100 * time.Millisecond

	if got := backoffDelay(base, 0, 0); got != base {
		t.Errorf("attempt 0 = %v, want %v", got, base)
	}
	if got := backoffDelay(base, 1, 0); got != 2*base {
		t.Errorf("attempt 1 = %v, want %v", got, 2*base)
	}
	if got := backoffDelay(base, 2, 0); got != 4*base {
		t.Errorf("attempt 2 = %v, want %v", got, 4*base)
	}

	// السقف الأقصى
	if got := backoffDelay(base, 10, 0); got != maxRetryDelay {
		t.Errorf("attempt 10 = %v, want cap %v", got, maxRetryDelay)
	}

	// التشتيت ±20%
	if got := backoffDelay(base, 0, 1); got != time.Duration(float64(base)*1.2) {
		t.Errorf("jitter +1 = %v, want %v", got, time.Duration(float64(base)*1.2))
	}
	if got := backoffDelay(base, 0, -1); got != time.Duration(float64(base)*0.8) {
		t.Errorf("jitter -1 = %v, want %v", got, time.Duration(float64(base)*0.8))
	}

	// قيم شاذة لا تُنتج تأخيراً سالباً
	if got := backoffDelay(0, 3, 1); got != 0 {
		t.Errorf("zero base = %v, want 0", got)
	}
}

func TestParseRetryAfter_SecondsAndDateAndCap(t *testing.T) {
	if d, ok := parseRetryAfter("2"); !ok || d != 2*time.Second {
		t.Errorf("seconds parse = (%v, %v), want (2s, true)", d, ok)
	}
	if _, ok := parseRetryAfter("not-a-date"); ok {
		t.Error("garbage value must not parse")
	}
	if _, ok := parseRetryAfter(""); ok {
		t.Error("empty value must not parse")
	}
	if d, ok := parseRetryAfter("99999"); !ok || d != maxRetryAfter {
		t.Errorf("huge value = (%v, %v), want capped at %v", d, ok, maxRetryAfter)
	}
	future := time.Now().Add(1 * time.Minute).UTC().Format(http.TimeFormat)
	if d, ok := parseRetryAfter(future); !ok || d <= 0 || d > maxRetryAfter {
		t.Errorf("http-date parse = (%v, %v), want bounded positive duration", d, ok)
	}
}

func TestHTTPDoWithRetry_RetriesOn503ThenSucceeds(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if atomic.AddInt32(&calls, 1) < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}))
	defer srv.Close()

	req, err := http.NewRequest(http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	resp, err := httpDoWithRetry(context.Background(), srv.Client(), req, RetryPolicy{
		MaxAttempts: 3, BaseDelay: 5 * time.Millisecond, RetryOnStatus: true,
	})
	if err != nil {
		t.Fatalf("expected success after retries, got %v", err)
	}
	defer drainAndClose(resp.Body)

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Errorf("server calls = %d, want 3", got)
	}
}

func TestHTTPDoWithRetry_NoRetryOn400(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusBadRequest)
	}))
	defer srv.Close()

	req, err := http.NewRequest(http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	resp, err := httpDoWithRetry(context.Background(), srv.Client(), req, defaultRetryPolicy())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer drainAndClose(resp.Body)

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", resp.StatusCode)
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Errorf("server calls = %d, want 1 (4xx must not be retried)", got)
	}
}

// POST لتدوير refresh_token: لا إعادة محاولة عند 5xx لأن الخادم قد يكون
// نفّذ التدوير فعلاً — إعادة الإرسال تُبطل التوكن الحالي.
func TestHTTPDoWithRetry_StatusRetryDisabledForPost(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	req, err := http.NewRequest(http.MethodPost, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	resp, err := httpDoWithRetry(context.Background(), srv.Client(), req, RetryPolicy{
		MaxAttempts: 3, BaseDelay: 5 * time.Millisecond, RetryOnStatus: false,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer drainAndClose(resp.Body)

	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Errorf("server calls = %d, want 1 (status retry disabled)", got)
	}
}

// failingTransport يفشل في أول n محاولة بخطأ نقل (لا رد) ثم يمرّر للشبكة الحقيقية.
type failingTransport struct {
	failures int32
	inner    http.RoundTripper
}

func (f *failingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	if atomic.AddInt32(&f.failures, -1) >= 0 {
		return nil, errors.New("simulated transport failure")
	}
	return f.inner.RoundTrip(req)
}

func TestHTTPDoWithRetry_RetriesTransportErrors(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	client := &http.Client{Transport: &failingTransport{failures: 2, inner: http.DefaultTransport}}
	req, err := http.NewRequest(http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	resp, err := httpDoWithRetry(context.Background(), client, req, RetryPolicy{
		MaxAttempts: 3, BaseDelay: 5 * time.Millisecond, RetryOnStatus: false,
	})
	if err != nil {
		t.Fatalf("expected success after transport retries, got %v", err)
	}
	defer drainAndClose(resp.Body)

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Errorf("server calls = %d, want 1 (two failures were transport-level)", got)
	}
}

// POST بلا GetBody غير قابل للإعادة ⇒ لا محاولة ثانية إطلاقاً.
func TestHTTPDoWithRetry_NonReplayableBodyNotRetried(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	body := io.NopCloser(strings.NewReader("payload"))
	req, err := http.NewRequest(http.MethodPost, srv.URL, body)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.GetBody = nil // نُلغيه صراحةً لمحاكاة جسم غير قابل للإعادة

	resp, err := httpDoWithRetry(context.Background(), srv.Client(), req, defaultRetryPolicy())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer drainAndClose(resp.Body)

	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Errorf("server calls = %d, want 1 (body not replayable)", got)
	}
}

func TestHTTPDoWithRetry_ContextCanceledBeforeFirstAttempt(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	req, err := http.NewRequest(http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	if _, err := httpDoWithRetry(ctx, srv.Client(), req, defaultRetryPolicy()); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
	if got := atomic.LoadInt32(&calls); got != 0 {
		t.Errorf("server calls = %d, want 0 (canceled before attempt)", got)
	}
}

func TestHTTPDoWithRetry_ContextCanceledDuringBackoff(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())
	// نلغي السياق بعد بدء الانتظار بين المحاولات
	time.AfterFunc(30*time.Millisecond, cancel)

	req, err := http.NewRequest(http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	start := time.Now()
	_, err = httpDoWithRetry(ctx, srv.Client(), req, RetryPolicy{
		MaxAttempts: 3, BaseDelay: 2 * time.Second, RetryOnStatus: true,
	})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
	if elapsed := time.Since(start); elapsed > time.Second {
		t.Errorf("canceled backoff took %v — الإلغاء يجب أن يقطع الانتظار فوراً", elapsed)
	}
}

func TestHTTPDoWithRetry_HonorsRetryAfter(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if atomic.AddInt32(&calls, 1) == 1 {
			w.Header().Set("Retry-After", "0")
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	req, err := http.NewRequest(http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	// base كبير جداً: النجاح السريع يثبت أن Retry-After هو المستخدم فعلاً
	resp, err := httpDoWithRetry(context.Background(), srv.Client(), req, RetryPolicy{
		MaxAttempts: 2, BaseDelay: 30 * time.Second, RetryOnStatus: true,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer drainAndClose(resp.Body)

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want 200", resp.StatusCode)
	}
	if got := atomic.LoadInt32(&calls); got != 2 {
		t.Errorf("server calls = %d, want 2", got)
	}
}

func TestHTTPDoWithRetry_NilRequestFailsFast(t *testing.T) {
	if _, err := httpDoWithRetry(context.Background(), nil, nil, defaultRetryPolicy()); err == nil {
		t.Fatal("expected error for nil request")
	}
}

func TestHTTPDoWithRetry_ExhaustsAttemptsOnPersistentFailure(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	req, err := http.NewRequest(http.MethodGet, srv.URL, nil)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}

	resp, err := httpDoWithRetry(context.Background(), srv.Client(), req, RetryPolicy{
		MaxAttempts: 3, BaseDelay: 2 * time.Millisecond, RetryOnStatus: true,
	})
	if err != nil {
		t.Fatalf("unexpected transport error: %v", err)
	}
	defer drainAndClose(resp.Body)

	if got := atomic.LoadInt32(&calls); got != 3 {
		t.Errorf("server calls = %d, want 3 (all attempts used)", got)
	}
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("final status = %d, want 503 returned to caller", resp.StatusCode)
	}
}
