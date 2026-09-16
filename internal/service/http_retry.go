package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// ────────────────────────────────────────────────────────────────────────────
// http_retry.go — سياسة إعادة المحاولة الموحّدة لطلبات الشبكة
//
// كانت الحلقة مكتوبة يدوياً في موضعين بسلوكين مختلفين:
//   - supabase_client.go: backoff 200ms*(i+1) وطمس السبب الأصلي.
//   - license_service.go: backoff 500ms*attempt على POST لتدوير التوكن.
//
// كلاهما استُبدل بهذا المساعد الواحد مع قيود صريحة:
//   - إعادة المحاولة على الأخطاء العابرة فقط (نقل، 408، 429، 5xx محددة).
//   - لا إعادة محاولة لجسم غير قابل للإعادة (هروب من إرسال جزئي/مكرر).
//   - احترام Retry-After مع سقف أقصى، ونوم واعٍ بالسياق (بلا time.Sleep أعمى).
//   - استنزاف وإغلاق الجسم قبل الإعادة لمنع تسريب الاتصالات.
// ─────────────────────────────────────────────────────────────────────────────

const (
	// maxRetryDelay سقف التأخير بين المحاولات (يمنع تأخيراً أسّياً غير محدود).
	maxRetryDelay = 5 * time.Second
	// maxRetryAfter سقف لتلميح الخادم (Retry-After) حتى لا يجمّد خادم معادٍ الواجهة.
	maxRetryAfter = 30 * time.Second
	// retryJitterRatio نسبة التشتيت ±20% لمنع تزامن المحاولات (thundering herd).
	retryJitterRatio = 0.2
)

// RetryPolicy سياسة إعادة المحاولة.
type RetryPolicy struct {
	MaxAttempts int
	BaseDelay   time.Duration
	// RetryOnStatus: عند false يُعاد المحاولة على أخطاء النقل فقط (لم يصل رد)،
	// وهو المطلوب للطلبات غير القابلة للتكرار منطقياً مثل تدوير refresh_token
	// (قد يكون الخادم نفّذ التدوير فعلاً ثم فشل الرد).
	RetryOnStatus bool
}

// defaultRetryPolicy سياسة قياسية: 3 محاولات بتأخير متدرج من 300ms.
func defaultRetryPolicy() RetryPolicy {
	return RetryPolicy{MaxAttempts: 3, BaseDelay: 300 * time.Millisecond, RetryOnStatus: true}
}

// httpDoWithRetry ينفّذ الطلب وفق السياسة المعطاة.
// عند عدم إمكانية/جدوى الإعادة يعيد الرد (إن وُجد) والخطأ كما هما للمستدعي.
func httpDoWithRetry(ctx context.Context, client *http.Client, req *http.Request, policy RetryPolicy) (*http.Response, error) {
	if req == nil {
		return nil, errors.New("http retry: nil request")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if client == nil {
		client = sharedClient
	}
	if policy.MaxAttempts < 1 {
		policy.MaxAttempts = 1
	}
	if policy.BaseDelay <= 0 {
		policy.BaseDelay = defaultRetryPolicy().BaseDelay
	}

	replayable := isReplayable(req)

	for attempt := 0; attempt < policy.MaxAttempts; attempt++ {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		attemptReq := req
		if attempt > 0 {
			rebuilt, err := rebuildRequest(req)
			if err != nil {
				// جسم غير قابل للإعادة — نوقف المحاولات بدل إرسال طلب مشوّه
				return nil, err
			}
			attemptReq = rebuilt
		}

		resp, err := client.Do(attemptReq)

		transient := err != nil
		if err == nil && policy.RetryOnStatus && isRetryableStatus(resp.StatusCode) {
			transient = true
		}
		if !transient {
			return resp, nil
		}

		// لا مزيد من المحاولات، أو أن الطلب غير قابل للإعادة أصلاً
		if attempt == policy.MaxAttempts-1 || !replayable {
			return resp, err
		}

		wait := backoffDelay(policy.BaseDelay, attempt, randomJitter())
		if resp != nil {
			if hinted, ok := parseRetryAfter(resp.Header.Get("Retry-After")); ok {
				wait = hinted
			}
			drainAndClose(resp.Body)
		}

		if sleepErr := sleepWithContext(ctx, wait); sleepErr != nil {
			return nil, sleepErr
		}
	}

	// غير قابل للوصول عملياً (الحلقة تعيد دائماً أو تنهيها)
	return nil, fmt.Errorf("http retry: exhausted %d attempts", policy.MaxAttempts)
}
// isReplayable يحدد إن كان الطلب قابلاً للإعادة الآمنة: طرق القراءة، أو
// طلب يملك GetBody لإعادة بناء جسمه.
func isReplayable(req *http.Request) bool {
	switch req.Method {
	case http.MethodGet, http.MethodHead, http.MethodOptions, http.MethodTrace:
		return true
	}
	return req.GetBody != nil
}

// rebuildRequest ينسخ الطلب ويعيد بناء جسمه من GetBody.
func rebuildRequest(req *http.Request) (*http.Request, error) {
	clone := req.Clone(req.Context())
	if req.GetBody == nil {
		if req.Body != nil {
			return nil, errors.New("http retry: request body is not replayable")
		}
		return clone, nil
	}
	body, err := req.GetBody()
	if err != nil {
		return nil, fmt.Errorf("http retry: rebuild body: %w", err)
	}
	clone.Body = body
	return clone, nil
}

// isRetryableStatus حالات الخادم العابرة (لا تشمل 4xx منطقية كـ 400/401/404).
func isRetryableStatus(code int) bool {
	switch code {
	case http.StatusRequestTimeout, http.StatusTooManyRequests,
		http.StatusInternalServerError, http.StatusBadGateway,
		http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return true
	}
	return false
}

// backoffDelay تأخير أسّي مقيّد مع تشتيت: base * 2^attempt * (1 ± 20%).
// jitterFactor في المجال [-1, 1] — دالة نقية قابلة للاختبار بلا شبكة.
func backoffDelay(base time.Duration, attempt int, jitterFactor float64) time.Duration {
	if base <= 0 {
		return 0
	}
	if attempt < 0 {
		attempt = 0
	}
	delay := base
	for i := 0; i < attempt; i++ {
		delay *= 2
		if delay >= maxRetryDelay {
			delay = maxRetryDelay
			break
		}
	}
	if delay > maxRetryDelay {
		delay = maxRetryDelay
	}

	if jitterFactor > 1 {
		jitterFactor = 1
	} else if jitterFactor < -1 {
		jitterFactor = -1
	}
	scaled := float64(delay) * (1 + retryJitterRatio*jitterFactor)
	if scaled < 0 {
		return 0
	}
	return time.Duration(scaled)
}

// randomJitter قيمة تشتيت في [-1, 1).
func randomJitter() float64 {
	return rand.Float64()*2 - 1
}

// parseRetryAfter يقرأ ترويسة Retry-After (ثوانٍ أو تاريخ HTTP) مع سقف أقصى.
func parseRetryAfter(value string) (time.Duration, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, false
	}

	var d time.Duration
	if secs, err := strconv.Atoi(value); err == nil {
		if secs < 0 {
			secs = 0
		}
		d = time.Duration(secs) * time.Second
	} else if when, err := http.ParseTime(value); err == nil {
		d = time.Until(when)
		if d < 0 {
			d = 0
		}
	} else {
		return 0, false
	}

	if d > maxRetryAfter {
		d = maxRetryAfter
	}
	return d, true
}

// sleepWithContext نوم واعٍ بالسياق — الإلغاء يقطع الانتظار فوراً.
func sleepWithContext(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

// drainAndClose يستنزف بقية الجسم (حتى حد معقول) ثم يغلقه — يسمح بإعادة استخدام
// الاتصال في المحاولة التالية بدل إغلاقه وفتح اتصال جديد.
func drainAndClose(body io.ReadCloser) {
	if body == nil {
		return
	}
	_, _ = io.Copy(io.Discard, io.LimitReader(body, 32*1024))
	_ = body.Close()
}