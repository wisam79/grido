package service

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
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
	defer func() { select { case e := <-errChan: t.Errorf("server error: %v", e); default: } }()

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
	defer func() { select { case e := <-errChan: t.Errorf("server error: %v", e); default: } }()

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
