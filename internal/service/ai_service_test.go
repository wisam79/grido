package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

type aiTestRoundTripper func(*http.Request) (*http.Response, error)

func (f aiTestRoundTripper) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// No test may fall back to production endpoints, even with build-time credentials.
func isolateAITransport(t *testing.T) {
	t.Helper()
	oldURL, oldKey, oldModal := SupabaseURL, SupabaseAnonKey, ModalAIURL
	oldAuth, oldUsage, oldEnhance := aiSupabaseClient, aiUsageClient, aiEnhanceClient
	userPlanCacheMu.Lock()
	oldCache := userPlanCache
	userPlanCache = make(map[string]userPlanCacheEntry)
	userPlanCacheMu.Unlock()
	SupabaseURL, SupabaseAnonKey, ModalAIURL = "", "", "http://127.0.0.1:1"
	transport := aiTestRoundTripper(func(r *http.Request) (*http.Response, error) {
		if host := r.URL.Hostname(); host != "127.0.0.1" && host != "::1" && host != "localhost" {
			return nil, fmt.Errorf("non-loopback HTTP is forbidden in AI tests")
		}
		return http.DefaultTransport.RoundTrip(r)
	})
	aiSupabaseClient = &http.Client{Transport: transport, Timeout: 10 * time.Second}
	aiUsageClient = &http.Client{Transport: transport, Timeout: 15 * time.Second}
	aiEnhanceClient = &http.Client{Transport: transport, Timeout: aiEnhancementBudget}
	t.Cleanup(func() {
		SupabaseURL, SupabaseAnonKey, ModalAIURL = oldURL, oldKey, oldModal
		aiSupabaseClient, aiUsageClient, aiEnhanceClient = oldAuth, oldUsage, oldEnhance
		userPlanCacheMu.Lock()
		userPlanCache = oldCache
		userPlanCacheMu.Unlock()
	})
}

func aiTestPNG(t *testing.T) string {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewNRGBA(image.Rect(0, 0, 3, 2))); err != nil {
		t.Fatal(err)
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
}

func aiTestResponse(body string) *http.Response {
	return &http.Response{
		StatusCode: http.StatusOK, Header: make(http.Header),
		Body: io.NopCloser(strings.NewReader(body)), ContentLength: int64(len(body)),
	}
}

func aiTestSuccessBody(t *testing.T) string {
	t.Helper()
	body, err := json.Marshal(map[string]interface{}{
		"success": true, "usage_recorded": true, "image": aiTestPNG(t),
	})
	if err != nil {
		t.Fatal(err)
	}
	return string(body)
}

// TestEnhanceImageWithAI_Success verifies end-to-end connection, payload structure,
// User-Agent header, trailing slash cleanup, and successful JSON response parsing.
func TestEnhanceImageWithAI_Success(t *testing.T) {
	isolateAITransport(t)
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	GlobalAIRateLimiter.mu.Lock()
	oldFilePath := GlobalAIRateLimiter.filePath
	oldLoaded := GlobalAIRateLimiter.loaded
	GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
	GlobalAIRateLimiter.filePath = filepath.Join(tempDir, "ai_rate_limits.json")
	GlobalAIRateLimiter.loaded = true
	GlobalAIRateLimiter.mu.Unlock()

	defer func() {
		GlobalAIRateLimiter.mu.Lock()
		GlobalAIRateLimiter.filePath = oldFilePath
		GlobalAIRateLimiter.loaded = oldLoaded
		GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
		GlobalAIRateLimiter.mu.Unlock()
	}()

	// Mock Modal AI HTTP Server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Verify HTTP Method
		if r.Method != "POST" {
			t.Errorf("Expected POST method, got %s", r.Method)
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}

		// 2. Verify User-Agent Header
		ua := r.Header.Get("User-Agent")
		if !strings.Contains(ua, "GridoStudio-Desktop") {
			t.Errorf("Expected User-Agent containing GridoStudio-Desktop, got '%s'", ua)
		}

		// 3. Verify Bearer Authorization Header
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-jwt-token" {
			t.Errorf("Expected Authorization 'Bearer test-jwt-token', got '%s'", auth)
		}

		// 4. Decode Payload
		var reqPayload struct {
			Image      string `json:"image"`
			DailyLimit int    `json:"dailyLimit"`
		}
		if err := json.NewDecoder(r.Body).Decode(&reqPayload); err != nil {
			t.Errorf("Failed to decode request body: %v", err)
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		if reqPayload.Image != aiTestPNG(t) {
			t.Errorf("Unexpected image data: %s", reqPayload.Image)
		}

		// 5. Send Successful 200 OK Response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"image": aiTestPNG(t), "execution_seconds": 2.4, "total_cost_usd": 0.0012})
	}))
	defer ts.Close()

	// Override ModalAIURL with trailing slash to test URL normalization
	ModalAIURL = ts.URL + "///"
	defer func() { ModalAIURL = "" }()

	aiSvc := NewAIService()
	respStr, err := aiSvc.EnhanceImageWithAI(aiTestPNG(t), "test-jwt-token", 5)

	if err != nil {
		t.Fatalf("EnhanceImageWithAI failed unexpectedly: %v", err)
	}

	var resp struct {
		Image            string  `json:"image"`
		ExecutionSeconds float64 `json:"execution_seconds"`
	}
	if err := json.Unmarshal([]byte(respStr), &resp); err != nil {
		t.Fatalf("Failed to parse returned JSON: %v", err)
	}

	if resp.Image != aiTestPNG(t) {
		t.Errorf("Expected enhanced image, got '%s'", resp.Image)
	}
}

// TestEnhanceImageWithAI_Unauthenticated verifies that empty tokens are rejected immediately.
func TestEnhanceImageWithAI_Unauthenticated(t *testing.T) {
	aiSvc := NewAIService()
	_, err := aiSvc.EnhanceImageWithAI(aiTestPNG(t), "", 5)
	if err == nil {
		t.Error("Expected error for empty token, got nil")
	}
	if !strings.Contains(err.Error(), "تسجيل الدخول مطلوب") {
		t.Errorf("Unexpected error message: %v", err)
	}
}

// TestEnhanceImageWithAI_HTTPError_Rollback verifies rate limit rollback on HTTP 404 or 500 error.
func TestEnhanceImageWithAI_HTTPError_Rollback(t *testing.T) {
	isolateAITransport(t)
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	GlobalAIRateLimiter.mu.Lock()
	oldFilePath := GlobalAIRateLimiter.filePath
	oldLoaded := GlobalAIRateLimiter.loaded
	GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
	GlobalAIRateLimiter.filePath = filepath.Join(tempDir, "ai_rate_limits.json")
	GlobalAIRateLimiter.loaded = true
	GlobalAIRateLimiter.mu.Unlock()

	defer func() {
		GlobalAIRateLimiter.mu.Lock()
		GlobalAIRateLimiter.filePath = oldFilePath
		GlobalAIRateLimiter.loaded = oldLoaded
		GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
		GlobalAIRateLimiter.mu.Unlock()
	}()

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error": "Endpoint not found"}`, http.StatusNotFound)
	}))
	defer ts.Close()

	ModalAIURL = ts.URL
	defer func() { ModalAIURL = "" }()

	aiSvc := NewAIService()
	_, err := aiSvc.EnhanceImageWithAI(aiTestPNG(t), "test-jwt-rollback", 5)

	if err == nil {
		t.Error("Expected error for 404 response, got nil")
	}

	// Verify that error message contains original error response
	if !strings.Contains(err.Error(), "Endpoint not found") && !strings.Contains(err.Error(), "404") {
		t.Errorf("Expected error to contain 'Endpoint not found', got: %v", err)
	}
}

func TestAIRateLimiter_ConcurrentReserves(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	limiter := &AIRateLimiter{
		usage: make(map[string]*AIRateEntry),
	}

	key := "test-device-user"
	limit := 10
	var wg sync.WaitGroup
	successCount := 0
	var mu sync.Mutex

	// Launch 25 concurrent requests for a limit of 10
	for i := 0; i < 25; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			err := limiter.Reserve(key, limit)
			if err == nil {
				mu.Lock()
				successCount++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()

	if successCount != limit {
		t.Errorf("Expected exactly %d successes, got %d", limit, successCount)
	}

	// Rollback one and reserve again
	limiter.Rollback(key)
	if err := limiter.Reserve(key, limit); err != nil {
		t.Errorf("Expected successful reserve after rollback, got error: %v", err)
	}
}

// isolateGlobalRateLimiter يعزل المُقيِّد المحلي على ملف مؤقت ويعيد حالته بعد الاختبار
func isolateGlobalRateLimiter(t *testing.T) {
	t.Helper()
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	GlobalAIRateLimiter.mu.Lock()
	oldFilePath := GlobalAIRateLimiter.filePath
	oldLoaded := GlobalAIRateLimiter.loaded
	GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
	GlobalAIRateLimiter.filePath = filepath.Join(t.TempDir(), "ai_rate_limits.json")
	GlobalAIRateLimiter.loaded = true
	GlobalAIRateLimiter.mu.Unlock()

	t.Cleanup(func() {
		GlobalAIRateLimiter.mu.Lock()
		GlobalAIRateLimiter.filePath = oldFilePath
		GlobalAIRateLimiter.loaded = oldLoaded
		GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
		GlobalAIRateLimiter.mu.Unlock()
	})
}

// fixClock يثبّت ساعة المُقيِّد للاختبار ويعيدها بعده.
func fixClock(t *testing.T, instant time.Time) {
	t.Helper()
	original := aiLimiterClock
	aiLimiterClock = func() time.Time { return instant }
	t.Cleanup(func() { aiLimiterClock = original })
}

// TestAIRateLimiter_UsesUTCForDayKey يُثبت أن مفتاح اليوم UTC لا محلي — وهو شرط
// تطابق المُقيِّد المحلي مع عدّاد الخادم (`date_trunc('day', timezone('utc', now()))`).
// الفحص مُعِدّ بمنطقة زمنية محلية UTC+3 حتى يكون مميّزًا فعلًا (لو عاد الكود إلى
// الوقت المحلي لصار المفتاح 2026-01-02 وفشل الاختبار).
func TestAIRateLimiter_UsesUTCForDayKey(t *testing.T) {
	isolateGlobalRateLimiter(t)

	originalLocal := time.Local
	time.Local = time.FixedZone("TEST+3", 3*60*60)
	t.Cleanup(func() { time.Local = originalLocal })

	limiter := &AIRateLimiter{usage: make(map[string]*AIRateEntry)}
	key := "utc-day-key"

	// 23:30 UTC = 02:30 من اليوم التالي محليًا (UTC+3)
	fixClock(t, time.Date(2026, 1, 1, 23, 30, 0, 0, time.UTC))
	if err := limiter.Reserve(key, 2); err != nil {
		t.Fatalf("unexpected reserve error: %v", err)
	}

	limiter.mu.Lock()
	storedDay := limiter.usage[key].ResetDay
	limiter.mu.Unlock()
	if storedDay != "2026-01-01" {
		t.Errorf("expected UTC day key 2026-01-01, got %q (local day would be 2026-01-02)", storedDay)
	}

	// تجاوز منتصف الليل UTC بثانيتين يصفر العدّاد فورًا
	fixClock(t, time.Date(2026, 1, 2, 0, 0, 2, 0, time.UTC))
	if err := limiter.Reserve(key, 2); err != nil {
		t.Fatalf("expected the counter to reset on a new UTC day, got: %v", err)
	}
}

// TestAIRateLimiter_SyncFromServerIsAuthoritative يُثبت أن القيمة الخادمية (Sync)
// هي الحاكمة، وأن Rollback لا ينزل تحت خط الأساس الخادمي.
func TestAIRateLimiter_SyncFromServerIsAuthoritative(t *testing.T) {
	isolateGlobalRateLimiter(t)
	fixClock(t, time.Date(2026, 1, 1, 10, 0, 0, 0, time.UTC))

	limiter := &AIRateLimiter{usage: make(map[string]*AIRateEntry)}
	key := "server-authoritative"

	// الخادم يقول: 5 من 5 مستهلكة اليوم
	limiter.Sync(key, 5)
	if err := limiter.Reserve(key, 5); err == nil {
		t.Error("expected Reserve to fail after syncing a full server-side count")
	}

	// Rollback بعد المزامنة لا يجوز أن يهبط تحت قيمة الخادم
	limiter.Rollback(key)
	limiter.mu.Lock()
	count := limiter.usage[key].Count
	baseline := limiter.usage[key].Baseline
	limiter.mu.Unlock()
	if count != 5 || baseline != 5 {
		t.Errorf("expected rollback to stop at the server baseline (5/5), got count=%d baseline=%d", count, baseline)
	}

	// والعدّاد الخادمي الأقل يفتح مجالًا جديدًا
	limiter.Sync(key, 1)
	if err := limiter.Reserve(key, 5); err != nil {
		t.Errorf("expected Reserve to succeed after syncing a lower server count: %v", err)
	}
}

// TestCallAIUsageRPC_ParsesServerQuota يُثبت أن لقطة الحصة الخادمية تُقرأ من الرد.
func TestCallAIUsageRPC_ParsesServerQuota(t *testing.T) {
	isolateAITransport(t)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/rpc/check_and_record_ai_usage") {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if auth := r.Header.Get("Authorization"); auth != "Bearer quota-token" {
			t.Errorf("expected user bearer token, got %q", auth)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success": true, "used_today": 3, "daily_limit": 15, "check_only": true}`))
	}))
	defer ts.Close()

	oldURL, oldKey := SupabaseURL, SupabaseAnonKey
	SupabaseURL, SupabaseAnonKey = ts.URL, "test-anon-key"
	defer func() { SupabaseURL, SupabaseAnonKey = oldURL, oldKey }()

	snapshot, err := callAIUsageRPC(context.Background(), "quota-token", "user-1", 1024, true)
	if err != nil {
		t.Fatalf("callAIUsageRPC failed: %v", err)
	}
	if snapshot == nil {
		t.Fatal("expected a parsed quota snapshot, got nil")
	}
	if snapshot.UsedToday != 3 || snapshot.DailyLimit != 15 {
		t.Errorf("unexpected snapshot: %+v", *snapshot)
	}
}

// TestEnhanceImageWithAI_InjectsServerQuotaSnapshot يتحقق أن الواجهة تستقبل قيم
// الحصة الخادمية (used_today/daily_limit) في نفس رد التحسين، وأن المُقيِّد المحلي
// يُزامن عليها — فلا تحسب الواجهة حصتها بنفسها.
func TestEnhanceImageWithAI_InjectsServerQuotaSnapshot(t *testing.T) {
	isolateAITransport(t)
	isolateGlobalRateLimiter(t)

	supabase := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.HasSuffix(r.URL.Path, "/auth/v1/user"):
			_, _ = w.Write([]byte(`{"id":"user-quota"}`))
		case strings.HasSuffix(r.URL.Path, "/rest/v1/profiles"):
			_, _ = w.Write([]byte(`[{"plan":"pro"}]`))
		case strings.HasSuffix(r.URL.Path, "/rpc/check_and_record_ai_usage"):
			_, _ = w.Write([]byte(`{"success": true, "used_today": 2, "daily_limit": 15}`))
		default:
			t.Errorf("unexpected Supabase path: %s", r.URL.Path)
		}
	}))
	defer supabase.Close()

	modal := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"image": aiTestPNG(t), "execution_seconds": 2.4, "total_cost_usd": 0.0012})
	}))
	defer modal.Close()

	oldURL, oldKey, oldModal := SupabaseURL, SupabaseAnonKey, ModalAIURL
	SupabaseURL, SupabaseAnonKey, ModalAIURL = supabase.URL, "test-anon-key", modal.URL
	defer func() { SupabaseURL, SupabaseAnonKey, ModalAIURL = oldURL, oldKey, oldModal }()

	token := "test-jwt-quota-inject"
	aiSvc := NewAIService()
	respStr, err := aiSvc.EnhanceImageWithAI(aiTestPNG(t), token, 5)
	if err != nil {
		t.Fatalf("EnhanceImageWithAI failed: %v", err)
	}

	var resp struct {
		Image      string `json:"image"`
		UsedToday  int    `json:"used_today"`
		DailyLimit int    `json:"daily_limit"`
	}
	if err := json.Unmarshal([]byte(respStr), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	if resp.Image != aiTestPNG(t) {
		t.Errorf("expected the Modal image to be preserved, got %q", resp.Image)
	}
	// العدّاد الخادمي قبل الطلب = 2، وهذه العملية مسجَّلة مرة واحدة ⇒ 3
	if resp.UsedToday != 3 || resp.DailyLimit != 15 {
		t.Errorf("expected server quota (used 3 / limit 15) in the response, got used=%d limit=%d", resp.UsedToday, resp.DailyLimit)
	}

	tokenHash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))[:16]
	GlobalAIRateLimiter.mu.Lock()
	entry := GlobalAIRateLimiter.usage[tokenHash]
	GlobalAIRateLimiter.mu.Unlock()
	if entry == nil {
		t.Fatal("expected the local limiter to mirror the server count, got no entry")
	}
	if entry.Count != 2 || entry.Baseline != 2 {
		t.Errorf("expected the local mirror to sync to 2/2, got count=%d baseline=%d", entry.Count, entry.Baseline)
	}
}

func TestPlanDailyLimit(t *testing.T) {
	if planDailyLimit("free") != 5 {
		t.Errorf("Expected free limit to be 5, got %d", planDailyLimit("free"))
	}
	if planDailyLimit("pro") != 15 {
		t.Errorf("Expected pro limit to be 15, got %d", planDailyLimit("pro"))
	}
	if planDailyLimit("enterprise") != 50 {
		t.Errorf("Expected enterprise limit to be 50, got %d", planDailyLimit("enterprise"))
	}
	if planDailyLimit("unknown") != 5 {
		t.Errorf("Expected unknown fallback limit to be 5, got %d", planDailyLimit("unknown"))
	}
}

func TestAIRateLimiter_DiskPersistence(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "ai_rate_limits.json")

	limiter1 := &AIRateLimiter{
		usage:    make(map[string]*AIRateEntry),
		filePath: filePath,
	}

	key := "test-user-persist"
	limit := 5

	for i := 0; i < 3; i++ {
		if err := limiter1.Reserve(key, limit); err != nil {
			t.Fatalf("Failed reserve %d: %v", i, err)
		}
	}

	// Instance 2 simulating app restart
	limiter2 := &AIRateLimiter{
		usage:    make(map[string]*AIRateEntry),
		filePath: filePath,
	}

	// Should be able to reserve 2 more
	if err := limiter2.Reserve(key, limit); err != nil {
		t.Fatalf("Expected success for 4th reserve, got: %v", err)
	}
	if err := limiter2.Reserve(key, limit); err != nil {
		t.Fatalf("Expected success for 5th reserve, got: %v", err)
	}

	// 6th should fail because limit is 5
	if err := limiter2.Reserve(key, limit); err == nil {
		t.Fatal("Expected error exceeding limit of 5, got nil")
	}

	// Rollback one
	limiter2.Rollback(key)

	// Instance 3 should now be able to reserve 1
	limiter3 := &AIRateLimiter{
		usage:    make(map[string]*AIRateEntry),
		filePath: filePath,
	}
	if err := limiter3.Reserve(key, limit); err != nil {
		t.Fatalf("Expected success after rollback in instance 3, got: %v", err)
	}
}

// TestEnhanceImageWithAI_LocalImagePath verifies that /local-image/... paths are resolved directly
// from disk, resized and encoded to JPEG in Go without requiring frontend pre-encoding.
func TestEnhanceImageWithAI_LocalImagePath(t *testing.T) {
	isolateAITransport(t)
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaDir := filepath.Join(tempDir, "Media")
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		t.Fatalf("Failed to create media dir: %v", err)
	}

	// Create a test 100x100 PNG image
	img := image.NewRGBA(image.Rect(0, 0, 100, 100))
	for y := 0; y < 100; y++ {
		for x := 0; x < 100; x++ {
			img.Set(x, y, color.RGBA{R: 200, G: 100, B: 50, A: 255})
		}
	}
	imgPath := filepath.Join(mediaDir, "sample_ai_test.png")
	f, err := os.Create(imgPath)
	if err != nil {
		t.Fatalf("Failed to create sample image: %v", err)
	}
	if err := png.Encode(f, img); err != nil {
		f.Close()
		t.Fatalf("Failed to encode sample image: %v", err)
	}
	f.Close()

	GlobalAIRateLimiter.mu.Lock()
	oldFilePath := GlobalAIRateLimiter.filePath
	oldLoaded := GlobalAIRateLimiter.loaded
	GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
	GlobalAIRateLimiter.filePath = filepath.Join(tempDir, "ai_rate_limits.json")
	GlobalAIRateLimiter.loaded = true
	GlobalAIRateLimiter.mu.Unlock()

	defer func() {
		GlobalAIRateLimiter.mu.Lock()
		GlobalAIRateLimiter.filePath = oldFilePath
		GlobalAIRateLimiter.loaded = oldLoaded
		GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
		GlobalAIRateLimiter.mu.Unlock()
	}()

	var receivedImagePayload string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var reqBody map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if imgStr, ok := reqBody["image"].(string); ok {
			receivedImagePayload = imgStr
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"image": aiTestPNG(t),
		})
	}))
	defer ts.Close()

	oldModalURL := ModalAIURL
	ModalAIURL = ts.URL
	defer func() { ModalAIURL = oldModalURL }()

	aiSvc := NewAIService()
	respStr, err := aiSvc.EnhanceImageWithAI("/local-image/sample_ai_test.png", "test-valid-token", 5)
	if err != nil {
		t.Fatalf("EnhanceImageWithAI failed for local image: %v", err)
	}

	if !strings.HasPrefix(receivedImagePayload, "data:image/jpeg;base64,") {
		t.Errorf("Expected payload to start with data:image/jpeg;base64, got %s", receivedImagePayload[:min(30, len(receivedImagePayload))])
	}
	if !strings.Contains(respStr, aiTestPNG(t)) {
		t.Error("Expected response to contain the enhanced PNG")
	}
}

// TestEnhanceImageWithAI_LocalImagePath_TransparentPNG verifies that transparent PNG images
// preserve their alpha channel and are sent as data:image/png;base64 to prevent black backgrounds.
func TestEnhanceImageWithAI_LocalImagePath_TransparentPNG(t *testing.T) {
	isolateAITransport(t)
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)

	mediaDir := filepath.Join(tempDir, "Media")
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		t.Fatalf("Failed to create media dir: %v", err)
	}

	// Create a test 100x100 PNG with transparency (cutout/background removed)
	img := image.NewNRGBA(image.Rect(0, 0, 100, 100))
	for y := 0; y < 100; y++ {
		for x := 0; x < 100; x++ {
			if x > 50 {
				img.Set(x, y, color.NRGBA{R: 200, G: 100, B: 50, A: 255})
			} else {
				img.Set(x, y, color.NRGBA{R: 0, G: 0, B: 0, A: 0}) // Transparent
			}
		}
	}
	imgPath := filepath.Join(mediaDir, "cutout_ai_test.png")
	f, err := os.Create(imgPath)
	if err != nil {
		t.Fatalf("Failed to create sample image: %v", err)
	}
	if err := png.Encode(f, img); err != nil {
		f.Close()
		t.Fatalf("Failed to encode sample image: %v", err)
	}
	f.Close()

	GlobalAIRateLimiter.mu.Lock()
	oldFilePath := GlobalAIRateLimiter.filePath
	oldLoaded := GlobalAIRateLimiter.loaded
	GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
	GlobalAIRateLimiter.filePath = filepath.Join(tempDir, "ai_rate_limits.json")
	GlobalAIRateLimiter.loaded = true
	GlobalAIRateLimiter.mu.Unlock()

	defer func() {
		GlobalAIRateLimiter.mu.Lock()
		GlobalAIRateLimiter.filePath = oldFilePath
		GlobalAIRateLimiter.loaded = oldLoaded
		GlobalAIRateLimiter.usage = make(map[string]*AIRateEntry)
		GlobalAIRateLimiter.mu.Unlock()
	}()

	var receivedImagePayload string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var reqBody map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if imgStr, ok := reqBody["image"].(string); ok {
			receivedImagePayload = imgStr
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"image": aiTestPNG(t),
		})
	}))
	defer ts.Close()

	oldModalURL := ModalAIURL
	ModalAIURL = ts.URL
	defer func() { ModalAIURL = oldModalURL }()

	aiSvc := NewAIService()
	respStr, err := aiSvc.EnhanceImageWithAI("/local-image/cutout_ai_test.png", "test-valid-token", 5)
	if err != nil {
		t.Fatalf("EnhanceImageWithAI failed for transparent local image: %v", err)
	}

	if !strings.HasPrefix(receivedImagePayload, "data:image/png;base64,") {
		t.Errorf("Expected payload to start with data:image/png;base64, got %s", receivedImagePayload[:min(30, len(receivedImagePayload))])
	}
	if !strings.Contains(respStr, aiTestPNG(t)) {
		t.Error("Expected response to contain the enhanced PNG")
	}
}

func TestEnhanceImageWithAI_AlphaAndFitRegressions(t *testing.T) {
	for _, tc := range []struct {
		name, ext string
		alpha     uint8
		isolated  bool
		width     int
		wantType  string
	}{
		{"alpha250", ".png", 250, false, 16, "png"},
		{"alpha251", ".png", 251, false, 16, "png"},
		{"alpha252", ".png", 252, false, 16, "png"},
		{"alpha253", ".png", 253, false, 16, "png"},
		{"alpha254", ".png", 254, false, 16, "png"},
		{"off-grid", ".png", 0, true, 16, "png"},
		{"misnamed-png", ".jpg", 0, true, 16, "png"},
		{"opaque", ".png", 255, false, 16, "jpeg"},
		{"opaque-fit", ".png", 255, false, 4096, "jpeg"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			isolateAITransport(t)
			isolateGlobalRateLimiter(t)
			mediaDir := filepath.Join(os.Getenv("GRIDO_APP_DIR"), "Media")
			if err := os.MkdirAll(mediaDir, 0755); err != nil {
				t.Fatal(err)
			}
			img := image.NewNRGBA(image.Rect(0, 0, tc.width, 16))
			for y := 0; y < 16; y++ {
				for x := 0; x < tc.width; x++ {
					a := tc.alpha
					if tc.isolated && (x != 1 || y != 1) {
						a = 255
					}
					img.SetNRGBA(x, y, color.NRGBA{R: 200, G: 100, B: 50, A: a})
				}
			}
			var source bytes.Buffer
			if err := png.Encode(&source, img); err != nil {
				t.Fatal(err)
			}
			name := "fixture" + tc.ext
			if err := os.WriteFile(filepath.Join(mediaDir, name), source.Bytes(), 0600); err != nil {
				t.Fatal(err)
			}
			var sent string
			aiEnhanceClient.Transport = aiTestRoundTripper(func(r *http.Request) (*http.Response, error) {
				var payload struct{ Image string }
				if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
					return nil, err
				}
				sent = payload.Image
				return aiTestResponse(aiTestSuccessBody(t)), nil
			})
			if _, err := NewAIService().EnhanceImageWithAI("/local-image/"+name, "alpha-token", 5); err != nil {
				t.Fatal(err)
			}
			if !strings.HasPrefix(sent, "data:image/"+tc.wantType+";base64,") {
				t.Fatalf("wrong transport image format, wanted %s", tc.wantType)
			}
			_, encoded, _ := strings.Cut(sent, ",")
			data, err := base64.StdEncoding.DecodeString(encoded)
			if err != nil {
				t.Fatal(err)
			}
			got, _, err := image.Decode(bytes.NewReader(data))
			if err != nil {
				t.Fatal(err)
			}
			wantWidth, wantHeight := tc.width, 16
			if tc.width > 2048 {
				wantWidth, wantHeight = 2048, 8
			}
			if got.Bounds().Dx() != wantWidth || got.Bounds().Dy() != wantHeight {
				t.Fatalf("bounds = %v, want %dx%d", got.Bounds(), wantWidth, wantHeight)
			}
			if tc.wantType == "png" {
				for y := 0; y < 16; y++ {
					for x := 0; x < tc.width; x++ {
						_, _, _, a := got.At(x, y).RGBA()
						want := uint32(img.NRGBAAt(x, y).A) * 257
						if a != want {
							t.Fatalf("alpha at (%d,%d) = %d, want %d", x, y, a, want)
						}
					}
				}
			}
		})
	}
}

func TestEnhanceImageWithAI_EXIFOrientation(t *testing.T) {
	isolateAITransport(t)
	isolateGlobalRateLimiter(t)
	mediaDir := filepath.Join(os.Getenv("GRIDO_APP_DIR"), "Media")
	if err := os.MkdirAll(mediaDir, 0755); err != nil {
		t.Fatal(err)
	}
	img := image.NewNRGBA(image.Rect(0, 0, 40, 20))
	for y := 0; y < 20; y++ {
		for x := 0; x < 40; x++ {
			c := color.NRGBA{R: 255, A: 255}
			if x >= 20 {
				c = color.NRGBA{B: 255, A: 255}
			}
			img.SetNRGBA(x, y, c)
		}
	}
	var jpegData bytes.Buffer
	if err := jpeg.Encode(&jpegData, img, &jpeg.Options{Quality: 95}); err != nil {
		t.Fatal(err)
	}
	// APP1: little-endian TIFF, one SHORT orientation tag (6 = rotate 90 CW).
	exif := []byte{'E', 'x', 'i', 'f', 0, 0, 'I', 'I', 42, 0, 8, 0, 0, 0,
		1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0}
	source := append([]byte{0xff, 0xd8, 0xff, 0xe1, 0, byte(len(exif) + 2)}, exif...)
	source = append(source, jpegData.Bytes()[2:]...)
	if err := os.WriteFile(filepath.Join(mediaDir, "oriented.jpg"), source, 0600); err != nil {
		t.Fatal(err)
	}
	aiEnhanceClient.Transport = aiTestRoundTripper(func(r *http.Request) (*http.Response, error) {
		var payload struct{ Image string }
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			return nil, err
		}
		_, encoded, _ := strings.Cut(payload.Image, ",")
		data, err := base64.StdEncoding.DecodeString(encoded)
		if err != nil {
			return nil, err
		}
		got, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		if got.Bounds().Dx() != 20 || got.Bounds().Dy() != 40 {
			t.Errorf("EXIF was not applied: %v", got.Bounds())
		}
		rTop, _, bTop, _ := got.At(10, 5).RGBA()
		rBottom, _, bBottom, _ := got.At(10, 35).RGBA()
		if rTop <= bTop || bBottom <= rBottom {
			t.Error("EXIF rotation did not move the red/blue halves to top/bottom")
		}
		return aiTestResponse(aiTestSuccessBody(t)), nil
	})
	if _, err := NewAIService().EnhanceImageWithAI("/local-image/oriented.jpg", "orientation-token", 5); err != nil {
		t.Fatal(err)
	}
}
