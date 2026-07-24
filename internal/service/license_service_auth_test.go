package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

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
