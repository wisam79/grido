package handlers_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"grido/internal/core/domain"
	"grido/internal/handlers"
	"grido/internal/repository"
	"grido/internal/service"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}
	db.AutoMigrate(&domain.UserProfile{})
	return db
}

func setupTestLicenseHandler(t *testing.T) (*handlers.LicenseHandler, *httptest.Server, *gorm.DB) {
	db := setupTestDB(t)
	repo := repository.NewLicenseRepository(db)
	svc := service.NewLicenseService(repo)
	handler := handlers.NewLicenseHandler(svc)

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		if strings.Contains(r.URL.Path, "/auth/v1/signup") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"user": map[string]interface{}{
					"id":    "usr-123",
					"email": "test@example.com",
				},
			})
			return
		}

		if strings.Contains(r.URL.Path, "/auth/v1/token") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token": "mock-access-token",
				"user": map[string]interface{}{
					"id":    "usr-123",
					"email": "test@example.com",
				},
			})
			return
		}

		if strings.Contains(r.URL.Path, "/auth/v1/verify") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"access_token": "mock-access-token",
				"user": map[string]interface{}{
					"id":    "usr-123",
					"email": "test@example.com",
				},
			})
			return
		}

		if strings.Contains(r.URL.Path, "/auth/v1/resend") {
			w.WriteHeader(http.StatusOK)
			return
		}

		if strings.Contains(r.URL.Path, "/rest/v1/profiles") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode([]map[string]interface{}{
				{"plan": "pro", "status": "active"},
			})
			return
		}

		if strings.Contains(r.URL.Path, "/auth/v1/recover") {
			w.WriteHeader(http.StatusOK)
			return
		}

		if strings.Contains(r.URL.Path, "/auth/v1/user") {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":    "usr-123",
				"email": "test@example.com",
			})
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))

	service.SupabaseURL = ts.URL
	service.SupabaseAnonKey = "mock-key"

	return handler, ts, db
}

func TestLicenseHandler_FullLifecycle(t *testing.T) {
	handler, ts, _ := setupTestLicenseHandler(t)
	defer ts.Close()

	// 1. Initial status when unauthenticated (Free tier)
	status, err := handler.GetLicenseStatus()
	if err != nil {
		t.Fatalf("GetLicenseStatus failed: %v", err)
	}
	if status.Plan != "free" {
		t.Errorf("expected plan 'free', got %q", status.Plan)
	}

	// 2. Register Account -> status pending_otp
	prof, err := handler.RegisterAccount("Test User", "test@example.com", "secret123")
	if err != nil {
		t.Fatalf("RegisterAccount failed: %v", err)
	}
	if prof.Status != "pending_otp" {
		t.Errorf("expected status 'pending_otp', got %q", prof.Status)
	}

	// 3. Resend OTP
	resendProf, err := handler.ResendOTP("test@example.com")
	if err != nil {
		t.Fatalf("ResendOTP failed: %v", err)
	}
	if resendProf.Status != "pending_otp" {
		t.Errorf("expected status 'pending_otp', got %q", resendProf.Status)
	}

	// 4. Verify OTP
	verifiedProf, err := handler.VerifyOTP("test@example.com", "123456")
	if err != nil {
		t.Fatalf("VerifyOTP failed: %v", err)
	}
	if verifiedProf.Token != "mock-access-token" || verifiedProf.Plan != "pro" {
		t.Errorf("expected active pro token, got %+v", verifiedProf)
	}

	// 5. Login Account
	loginProf, err := handler.LoginAccount("test@example.com", "secret123")
	if err != nil {
		t.Fatalf("LoginAccount failed: %v", err)
	}
	if loginProf.Token != "mock-access-token" || loginProf.Plan != "pro" {
		t.Errorf("expected active pro token on login, got %+v", loginProf)
	}

	// 6. Reset Password Request
	resetRes, err := handler.ResetPassword("test@example.com")
	if err != nil {
		t.Fatalf("ResetPassword failed: %v", err)
	}
	if resetRes != "success" {
		t.Errorf("expected 'success', got %q", resetRes)
	}

	// 7. Verify Recovery OTP
	recoveryProf, err := handler.VerifyRecoveryOTP("test@example.com", "123456", "newpass123")
	if err != nil {
		t.Fatalf("VerifyRecoveryOTP failed: %v", err)
	}
	if recoveryProf.Token != "mock-access-token" {
		t.Errorf("expected token on recovery, got %+v", recoveryProf)
	}

	// 8. Logout
	logoutRes, err := handler.Logout()
	if err != nil {
		t.Fatalf("Logout failed: %v", err)
	}
	if logoutRes != "success" {
		t.Errorf("expected 'success', got %q", logoutRes)
	}

	// 9. Status after logout -> Free
	statusAfterLogout, err := handler.GetLicenseStatus()
	if err != nil {
		t.Fatalf("GetLicenseStatus after logout failed: %v", err)
	}
	if statusAfterLogout.Plan != "free" {
		t.Errorf("expected plan 'free' after logout, got %q", statusAfterLogout.Plan)
	}
}

