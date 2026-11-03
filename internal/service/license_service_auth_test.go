package service

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"grido/internal/core/domain"
	"grido/internal/repository"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestService(t *testing.T) (*LicenseService, *httptest.Server) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	_ = db.AutoMigrate(&domain.UserProfile{})
	repo := repository.NewLicenseRepository(db)
	svc := NewLicenseService(repo)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if strings.Contains(r.URL.Path, "/auth/v1/signup") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(SupabaseAuthResponse{
				User: struct {
					ID       string                 `json:"id"`
					Email    string                 `json:"email"`
					UserMeta map[string]interface{} `json:"user_metadata"`
				}{ID: "test-id", Email: "test@example.com"},
			})
			return
		}

		if strings.Contains(r.URL.Path, "/auth/v1/token") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(SupabaseAuthResponse{
				AccessToken: "mock-token",
				User: struct {
					ID       string                 `json:"id"`
					Email    string                 `json:"email"`
					UserMeta map[string]interface{} `json:"user_metadata"`
				}{ID: "test-id", Email: "test@example.com"},
			})
			return
		}

		if strings.Contains(r.URL.Path, "/auth/v1/verify") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(SupabaseAuthResponse{
				AccessToken: "mock-token",
				User: struct {
					ID       string                 `json:"id"`
					Email    string                 `json:"email"`
					UserMeta map[string]interface{} `json:"user_metadata"`
				}{ID: "test-id", Email: "test@example.com"},
			})
			return
		}

		if strings.Contains(r.URL.Path, "/auth/v1/resend") {
			w.WriteHeader(http.StatusOK)
			return
		}

		if strings.Contains(r.URL.Path, "/rest/v1/profiles") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]SupabaseProfile{
				{Plan: "pro", Status: "active"},
			})
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))

	SupabaseURL = ts.URL
	SupabaseAnonKey = "test-key"

	return svc, ts
}

func TestLicenseService_Register(t *testing.T) {
	svc, ts := setupTestService(t)
	defer ts.Close()

	prof, err := svc.Register("Test", "test@example.com", "password123")
	if err != nil {
		t.Fatalf("Register failed: %v", err)
	}

	if prof.Email != "test@example.com" || prof.Status != "pending_otp" {
		t.Errorf("Expected pending_otp status, got %s", prof.Status)
	}
}

func TestLicenseService_PasswordPolicyValidation(t *testing.T) {
	svc, ts := setupTestService(t)
	defer ts.Close()

	// 1. كلمة مرور قصيرة (< 8 أحرف)
	if _, err := svc.Register("Test", "test@example.com", "pass1"); err == nil || !strings.Contains(err.Error(), "8 أحرف") {
		t.Errorf("Expected error for short password, got %v", err)
	}

	// 2. حروف فقط دون أرقام
	if _, err := svc.Register("Test", "test@example.com", "passwordonly"); err == nil || !strings.Contains(err.Error(), "حروفاً وأرقاماً") {
		t.Errorf("Expected error for letters-only password, got %v", err)
	}

	// 3. أرقام فقط دون حروف
	if _, err := svc.Register("Test", "test@example.com", "12345678"); err == nil || !strings.Contains(err.Error(), "حروفاً وأرقاماً") {
		t.Errorf("Expected error for digits-only password, got %v", err)
	}

	// 4. استعادة الحساب بكلمة مرور لا تلبي المعايير
	if _, err := svc.VerifyRecoveryOTP("test@example.com", "123456", "short"); err == nil || !strings.Contains(err.Error(), "8 أحرف") {
		t.Errorf("Expected error for weak recovery password, got %v", err)
	}
}

func TestLicenseService_Login(t *testing.T) {
	svc, ts := setupTestService(t)
	defer ts.Close()

	prof, err := svc.Login("test@example.com", "password123")
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}

	if prof.Token != "mock-token" || prof.Plan != "pro" {
		t.Errorf("Login failed to populate profile correctly")
	}
}

func TestLicenseService_VerifyOTP(t *testing.T) {
	svc, ts := setupTestService(t)
	defer ts.Close()

	prof, err := svc.VerifyOTP("test@example.com", "123456")
	if err != nil {
		t.Fatalf("VerifyOTP failed: %v", err)
	}

	if prof.Token != "mock-token" || prof.Plan != "pro" {
		t.Errorf("VerifyOTP failed to populate profile correctly")
	}
}

func TestLicenseService_ResendOTP(t *testing.T) {
	svc, ts := setupTestService(t)
	defer ts.Close()

	prof, err := svc.ResendOTP("test@example.com")
	if err != nil {
		t.Fatalf("ResendOTP failed: %v", err)
	}

	if prof.Status != "pending_otp" {
		t.Errorf("ResendOTP should return pending_otp status")
	}
}

func TestStartOAuthLocalServer_CallbackServesPageWithState(t *testing.T) {
	callbackURL, _, errChan, shutdown, state, err := startOAuthLocalServer()
	if err != nil {
		t.Fatalf("startOAuthLocalServer failed: %v", err)
	}
	defer shutdown()
	defer func() {
		select {
		case e := <-errChan:
			t.Errorf("server error: %v", e)
		default:
		}
	}()

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(callbackURL)
	if err != nil {
		t.Fatalf("GET /callback failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	if ct := resp.Header.Get("Content-Type"); !strings.Contains(ct, "text/html") {
		t.Errorf("expected html content type, got %q", ct)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body failed: %v", err)
	}
	if !strings.Contains(string(body), state) {
		t.Errorf("callback page should embed session state %q", state)
	}
	if strings.Contains(string(body), "EXPECTED_STATE") {
		t.Error("callback page should not contain raw EXPECTED_STATE placeholder")
	}
}

func TestStartOAuthLocalServer_ExchangeFlow(t *testing.T) {
	callbackURL, tokenChan, errChan, shutdown, state, err := startOAuthLocalServer()
	if err != nil {
		t.Fatalf("startOAuthLocalServer failed: %v", err)
	}
	defer shutdown()
	defer func() {
		select {
		case e := <-errChan:
			t.Errorf("server error: %v", e)
		default:
		}
	}()

	origin := strings.Replace(callbackURL, "/callback", "", 1)
	client := &http.Client{Timeout: 5 * time.Second}
	exchangeWithOrigin := func(originHeader, body string) *http.Response {
		req, err := http.NewRequest(http.MethodPost, strings.Replace(callbackURL, "/callback", "/exchange", 1), strings.NewReader(body))
		if err != nil {
			t.Fatalf("build request failed: %v", err)
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		if originHeader != "" {
			req.Header.Set("Origin", originHeader)
		}
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("POST /exchange failed: %v", err)
		}
		return resp
	}

	exchange := func(body string) *http.Response {
		return exchangeWithOrigin(origin, body)
	}

	// 1) محاولة بدون Origin → مرفوضة
	resp := exchangeWithOrigin("", "access_token=x&state="+state)
	resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("missing origin should be 403, got %d", resp.StatusCode)
	}

	// 2) محاولة بـ Origin صحيح لكن state خاطئ → مرفوضة
	resp = exchange("access_token=x&state=wrong")
	resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Errorf("wrong state should be 403, got %d", resp.StatusCode)
	}

	// 3) تدفق المتصفح الحقيقي: fragment يتضمن state قديم من GoTrue → يُقبل ويوصِل الرمز
	fragment := "access_token=abc123&expires_in=3600&refresh_token=refresh&state=old-gotrue-state"
	body := strings.Replace(fragment, "state=old-gotrue-state", "", 1) + "&state=" + state
	resp = exchange(body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("valid exchange should be 200, got %d", resp.StatusCode)
	}

	select {
	case received := <-tokenChan:
		if !strings.Contains(received, "access_token=abc123") {
			t.Errorf("token channel should carry the exchanged body, got %q", received)
		}
	default:
		t.Fatal("token channel should have received the body")
	}

	// 4) طلب مكرر → 409 (لا يُوصِل رمزاً ثانياً)
	resp = exchange("access_token=abc123&state=" + state)
	resp.Body.Close()
	if resp.StatusCode != http.StatusConflict {
		t.Errorf("duplicate exchange should be 409, got %d", resp.StatusCode)
	}
	select {
	case <-tokenChan:
		t.Error("duplicate exchange should not deliver a second token")
	default:
	}
}

// newRefreshRaceTestService يهيّئ خدمة ترخيص مع مستودع SQLite حقيقي ومعزول
// (مجلد بيانات مستقل كي يدور ملف التوكن المشفّر داخل الاختبار فقط).
func newRefreshRaceTestService(t *testing.T) (*LicenseService, domain.LicenseRepository) {
	t.Helper()
	t.Setenv("GRIDO_APP_DIR", t.TempDir())

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}
	if err := db.AutoMigrate(&domain.UserProfile{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}
	licenseRepo := repository.NewLicenseRepository(db)
	return NewLicenseService(licenseRepo), licenseRepo
}

// withSupabaseStub يوجّه SupabaseURL/AnonKey إلى خادم الاختبار ويعيّنهما بعد الانتهاء.
func withSupabaseStub(t *testing.T, ts *httptest.Server) {
	t.Helper()
	oldURL, oldKey := SupabaseURL, SupabaseAnonKey
	SupabaseURL, SupabaseAnonKey = ts.URL, "test-key"
	t.Cleanup(func() { SupabaseURL, SupabaseAnonKey = oldURL, oldKey })
}

// TestLicenseService_ConcurrentCheckStatus_RefreshRaceKeepsSession (SEC-08):
// نداءان متزامنان لـ CheckStatus — الأول يدوّر التوكن (RT1→RT2)؛ الثاني لو قرأ
// التوكن القديم لفشل تدويره بـ 400 وكان (قبل الإصلاح) يمسح الجلسة بـ repo.Clear
// فيتسجّل المستخدم خروجاً نهائياً. العقد: بعد النداءين تبقى الجلسة حيّة بالتوكن
// المدوَّر، والخادم لم يرَ أي post لتوكن قديم بعد التدوير.
func TestLicenseService_ConcurrentCheckStatus_RefreshRaceKeepsSession(t *testing.T) {
	svc, repo := newRefreshRaceTestService(t)

	// جلسة مزروعة بالتوكن القديم RT1
	seed := &domain.UserProfile{
		ID:           "race-user",
		Email:        "race@example.com",
		Plan:         "pro",
		Status:       "active",
		Token:        "AT1",
		RefreshToken: "RT1",
		ExpiresAt:    time.Now().Add(24 * time.Hour),
	}
	if err := repo.Save(seed); err != nil {
		t.Fatalf("seed session: %v", err)
	}

	var mu sync.Mutex
	rotated := false
	refreshedWith := make([]string, 0, 2)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case strings.Contains(r.URL.Path, "/rest/v1/profiles"):
			// التوكن AT1 منتهي (هذا ما يستدعي التدوير أصلاً) — AT2 فقط يعمل
			if strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ") != "AT2" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			_ = json.NewEncoder(w).Encode([]SupabaseProfile{{Plan: "pro", Status: "active"}})
		case strings.Contains(r.URL.Path, "/auth/v1/token"):
			var body struct {
				RefreshToken string `json:"refresh_token"`
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			mu.Lock()
			defer mu.Unlock()
			refreshedWith = append(refreshedWith, body.RefreshToken)
			if body.RefreshToken == "RT1" && !rotated {
				rotated = true
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(SupabaseAuthResponse{AccessToken: "AT2", RefreshToken: "RT2"})
				return
			}
			if body.RefreshToken == "RT2" && rotated {
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(SupabaseAuthResponse{AccessToken: "AT2", RefreshToken: "RT2"})
				return
			}
			// توكن قديم بعد التدوير — بالضبط الطلب الذي كان يمسح الجلسة
			w.WriteHeader(http.StatusBadRequest)
		case strings.Contains(r.URL.Path, "/rest/v1/rpc/"):
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`{"success":true,"active":true}`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()
	withSupabaseStub(t, ts)

	// الإقلاع + المؤقّت الدوري (نفس تداخل الواجهة الحقيقي)
	const n = 2
	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = svc.CheckStatus()
		}()
	}
	wg.Wait()

	// التوكن القديم يُرسَل مرة واحدة كحد أقصى — إرساله مرتين يعني نداءً ثانياً
	// استعمل توكن مدوَّراً (كان سبب 400 والمسح قبل الإصلاح)
	mu.Lock()
	staleReuse := 0
	for _, used := range refreshedWith {
		if used == "RT1" {
			staleReuse++
		}
	}
	mu.Unlock()
	if staleReuse > 1 {
		t.Errorf("stale token RT1 was submitted %d times — a concurrent CheckStatus reused it after rotation", staleReuse)
	}

	// العقد الحرج: الجلسة لم تُمسح — المخزن ما زال يحمل صف المستخدم مع التوكن المدوَّر
	stored, err := repo.Get()
	if err != nil {
		t.Fatalf("session was wiped by the concurrent refresh race: %v", err)
	}
	if stored.Token != "AT2" || stored.RefreshToken != "RT2" {
		t.Errorf("expected rotated tokens AT2/RT2, got AT=%q RT=%q", stored.Token, stored.RefreshToken)
	}
	if stored.Plan != "pro" || stored.Status != "active" {
		t.Errorf("expected pro/active session to survive, got plan=%s status=%s", stored.Plan, stored.Status)
	}
}

// TestLicenseService_RefreshTokenRotatedByConcurrentCall (SEC-08) — دفاع العمق:
// فشل التدوير بـ 400 بينما المخزن يحمل توكن مختلفاً (نداء آخر دوّره وحفظه) يجب
// ألا يمسح الجلسة ولا يطمسها بنسخة بلا توكن؛ بل يتبنّى الحالة الجديدة ويعيد
// ErrRefreshTokenRotated القابل لإعادة المحاولة.
func TestLicenseService_RefreshTokenRotatedByConcurrentCall(t *testing.T) {
	svc, repo := newRefreshRaceTestService(t)

	// المخزن يحمل RT2 (نداء متزامن فاز بالتدوير) بينما نداؤنا ما زال بيد RT1
	winner := &domain.UserProfile{
		ID: "race-user", Email: "race@example.com",
		Plan: "pro", Status: "active",
		Token: "AT2", RefreshToken: "RT2",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	if err := repo.Save(winner); err != nil {
		t.Fatalf("seed winner session: %v", err)
	}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// الخادم يرفض RT1 بـ 400 حتماً (توكن مستهلك بالتدوير)
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"invalid_grant","error_description":"Invalid Refresh Token"}`))
	}))
	defer ts.Close()
	withSupabaseStub(t, ts)

	local := &domain.UserProfile{ID: "race-user", Token: "AT1", RefreshToken: "RT1"}
	err := svc.refreshTokenIfNeeded(local)
	if !errors.Is(err, ErrRefreshTokenRotated) {
		t.Fatalf("expected ErrRefreshTokenRotated, got %v", err)
	}
	if local.Token != "AT2" || local.RefreshToken != "RT2" {
		t.Errorf("expected local to adopt rotated tokens AT2/RT2, got AT=%q RT=%q", local.Token, local.RefreshToken)
	}

	// الجلسة الفائزة لم تُطمس بنسخة بلا توكن
	stored, gerr := repo.Get()
	if gerr != nil {
		t.Fatalf("winner session was wiped: %v", gerr)
	}
	if stored.Token != "AT2" || stored.RefreshToken != "RT2" {
		t.Errorf("winner session tokens must be intact, got AT=%q RT=%q", stored.Token, stored.RefreshToken)
	}
}

// TestLicenseService_RefreshGenuinelyInvalidClearsSession (SEC-08) — المقابل:
// المخزن ما زال يحمل التوكن نفسه الذي رفضه الخادم ⇒ إبطال حقيقي ⇒ مسح الجلسة
// (سلوك الإصلاح لا يغيّر المسار المشروع للتوكن المُبطل فعلاً).
func TestLicenseService_RefreshGenuinelyInvalidClearsSession(t *testing.T) {
	svc, repo := newRefreshRaceTestService(t)

	seed := &domain.UserProfile{
		ID: "solo-user", Email: "solo@example.com",
		Plan: "pro", Status: "active",
		Token: "AT1", RefreshToken: "RT1",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	if err := repo.Save(seed); err != nil {
		t.Fatalf("seed session: %v", err)
	}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"invalid_grant"}`))
	}))
	defer ts.Close()
	withSupabaseStub(t, ts)

	local := &domain.UserProfile{ID: "solo-user", Token: "AT1", RefreshToken: "RT1"}
	err := svc.refreshTokenIfNeeded(local)
	if !errors.Is(err, ErrInvalidRefreshToken) {
		t.Fatalf("expected ErrInvalidRefreshToken, got %v", err)
	}

	// الجلسة أُبطلت فعلاً: لا توكنات في المخزن بعد المسح/الحفظ البلا توكن
	stored, gerr := repo.Get()
	if gerr != nil {
		t.Fatalf("profile row should remain after invalidation, got error: %v", gerr)
	}
	if stored.RefreshToken != "" {
		t.Errorf("genuinely invalid refresh token should be wiped, got %q", stored.RefreshToken)
	}
}
