package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

// ─────────────────────────────────────────────────────────────────────────────
// license_service.go — تهيئة الإعدادات ودورة حياة الجلسة المحلية
//
// تقسيم الملف الأصلي إلى مسؤوليات مفردة:
//   - license_service.go : الإعدادات (ldflags/.env) + دورة الجلسة (تفعيل/فحص/خروج)
//   - supabase_client.go : عميل HTTP منخفض المستوى لأنواع Supabase وأخطائه
//   - auth_flows.go      : تدفقات المصادقة (تسجيل/دخول/OTP/استعادة كلمة المرور)
//   - oauth_server.go    : خادم OAuth المحلي (loopback) لدخول Google
// ─────────────────────────────────────────────────────────────────────────────

type LicenseService struct {
	repo domain.LicenseRepository
}

func NewLicenseService(repo domain.LicenseRepository) *LicenseService {
	return &LicenseService{repo: repo}
}

// SupabaseURL and SupabaseAnonKey are injected at build time via:
//
//	-ldflags "-X grido/internal/service.SupabaseURL=https://... -X grido/internal/service.SupabaseAnonKey=..."
//
// For local development, set SUPABASE_URL and SUPABASE_ANON_KEY in a .env file
// and load it before running (see .env.example).
var (
	SupabaseURL     = "" // injected via ldflags at build time
	SupabaseAnonKey = "" // injected via ldflags at build time
	ModalAIURL      = "" // injected via ldflags at build time
	ModalAIKey      = "" // injected via ldflags at build time
)

func init() {
	// 🌟 Load .env from the app config directory or current directory (for development)
	envPath := filepath.Join(utils.GetAppDir(), ".env")
	if _, err := os.Stat(envPath); err != nil {
		envPath = ".env"
	}
	if envBytes, err := os.ReadFile(envPath); err == nil {
		envVars := make(map[string]string)
		for _, line := range strings.Split(string(envBytes), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				val := strings.TrimSpace(parts[1])
				val = strings.Trim(val, `"'`)
				envVars[key] = val
			}
		}
		// Apply env vars to package variables directly (no os.Setenv)
		if v, ok := envVars["SUPABASE_URL"]; ok && SupabaseURL == "" {
			SupabaseURL = v
		}
		if v, ok := envVars["SUPABASE_ANON_KEY"]; ok && SupabaseAnonKey == "" {
			SupabaseAnonKey = v
		}
		if v, ok := envVars["MODAL_AI_URL"]; ok && ModalAIURL == "" {
			ModalAIURL = v
		}
		if v, ok := envVars["MODAL_AI_KEY"]; ok && ModalAIKey == "" {
			ModalAIKey = v
		}
		if v, ok := envVars["GRIDO_AI_SECRET_KEY"]; ok && ModalAIKey == "" {
			ModalAIKey = v
		}
	}

	// Fallback to environment variables if ldflags not set (local dev)
	if SupabaseURL == "" {
		SupabaseURL = os.Getenv("SUPABASE_URL")
	}
	if SupabaseAnonKey == "" {
		SupabaseAnonKey = os.Getenv("SUPABASE_ANON_KEY")
	}
	if SupabaseURL == "" || SupabaseAnonKey == "" {
		slog.Warn("Supabase credentials not configured — set SUPABASE_URL and SUPABASE_ANON_KEY")
	}
	if ModalAIURL == "" {
		ModalAIURL = os.Getenv("MODAL_AI_URL")
	}
	if ModalAIKey == "" {
		ModalAIKey = os.Getenv("MODAL_AI_KEY")
	}
	if ModalAIKey == "" {
		ModalAIKey = os.Getenv("GRIDO_AI_SECRET_KEY")
	}
	// 🔒 إزالة المفتاح الافتراضي المكشوف - يجب تعيينه في .env أو عبر ldflags
	if ModalAIKey == "" {
		slog.Warn("MODAL_AI_KEY not configured - AI features will be disabled")
	}
}

// GetModalAIKey returns the active Modal AI API key or error if not configured
func GetModalAIKey() (string, error) {
	if ModalAIKey != "" {
		return ModalAIKey, nil
	}
	if key := os.Getenv("MODAL_AI_KEY"); key != "" {
		return key, nil
	}
	if key := os.Getenv("GRIDO_AI_SECRET_KEY"); key != "" {
		return key, nil
	}
	return "", errors.New("MODAL_AI_KEY is required but not configured. Please set it in .env or via ldflags")
}

func (s *LicenseService) ActivateKey(key string) (*domain.UserProfile, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, errors.New("مفتاح الترخيص لا يمكن أن يكون فارغاً")
	}

	local, err := s.repo.Get()
	if err != nil || local == nil {
		return nil, errors.New("يرجى تسجيل الدخول أولاً قبل تفعيل الترخيص")
	}

	deviceID := utils.GetDeviceID()

	payload, err := json.Marshal(LicenseKeyRequest{PKey: key, PDeviceID: deviceID})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", SupabaseURL+"/rest/v1/rpc/activate_license", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+local.Token)

	resp, err := sharedClient.Do(req)
	if err != nil {
		return nil, errors.New("تعذر الاتصال بخوادم Grido. يرجى التحقق من اتصال الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errRes struct {
			Message string `json:"message"`
		}
		_ = json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&errRes)
		if errRes.Message != "" {
			return nil, errors.New(errRes.Message)
		}
		return nil, errors.New("الكود المدخل غير صالح أو تم استخدامه مسبقاً")
	}

	prof, err := s.fetchProfile(local.Token, local.ID)
	if err == nil {
		local.Plan = prof.Plan
		local.ExpiresAt = prof.ExpiresAt
		local.Status = prof.Status
		local.LicenseKey = prof.LicenseKey
		local.UpdatedAt = time.Now()
		if err := s.repo.Save(local); err != nil {
			slog.Warn("Failed to save local repo after activation", "error", err)
		}
	}

	return local, nil
}

func (s *LicenseService) CheckStatus() (*domain.UserProfile, error) {
	local, err := s.repo.Get()
	if err != nil || local == nil {
		return &domain.UserProfile{Plan: "free", Status: "none"}, nil
	}

	if local.Plan != "free" && !local.ExpiresAt.IsZero() && time.Now().After(local.ExpiresAt) {
		local.Plan = "free"
		local.Status = "expired"
		local.UpdatedAt = time.Now()
		if err := s.repo.Save(local); err != nil {
			slog.Error("Failed to save expired license state", "error", err)
		}
		return local, nil
	}

	prof, err := s.fetchProfile(local.Token, local.ID)
	if err != nil && errors.Is(err, ErrUnauthorized) {
		refreshErr := s.refreshTokenIfNeeded(local)
		if refreshErr == nil {
			prof, err = s.fetchProfile(local.Token, local.ID)
		} else if errors.Is(refreshErr, ErrInvalidRefreshToken) {
			slog.Warn("Session refresh token revoked or invalid, clearing session", "error", refreshErr)
			_ = s.repo.Clear()
			return &domain.UserProfile{Plan: "free", Status: "none"}, nil
		} else {
			// Temporary network connection error upon waking from PC sleep -> retain cached local session
			slog.Warn("Token refresh failed due to network/transient error, retaining cached session", "error", refreshErr)
			return local, nil
		}
	}

	if err == nil {
		local.Plan = prof.Plan
		local.ExpiresAt = prof.ExpiresAt
		local.Status = prof.Status
		local.LicenseKey = prof.LicenseKey
		local.UpdatedAt = time.Now()
		if saveErr := s.repo.Save(local); saveErr != nil {
			slog.Error("Failed to save updated license profile", "error", saveErr)
		}
		return local, nil
	}

	// For network errors during fetchProfile, retain cached local session from disk
	return local, nil
}

func (s *LicenseService) refreshTokenIfNeeded(local *domain.UserProfile) error {
	if local.RefreshToken == "" {
		return ErrInvalidRefreshToken
	}

	payload, err := json.Marshal(map[string]string{
		"refresh_token": local.RefreshToken,
	})
	if err != nil {
		return err
	}

	var resp *http.Response
	var lastErr error

	// Retry up to 3 times with backoff for network adapter recovery after PC sleep/idle
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt*500) * time.Millisecond)
		}

		req, err := http.NewRequest("POST", SupabaseURL+"/auth/v1/token?grant_type=refresh_token", bytes.NewBuffer(payload))
		if err != nil {
			return err
		}
		req.Header.Set("apikey", SupabaseAnonKey)
		req.Header.Set("Content-Type", "application/json")

		resp, lastErr = sharedClient.Do(req)
		if lastErr == nil {
			break
		}
	}

	if lastErr != nil {
		return lastErr
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		slog.Warn("Failed to refresh token", "status", resp.StatusCode, "body", string(body))

		if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
			local.RefreshToken = ""
			_ = s.repo.Save(local)
			return ErrInvalidRefreshToken
		}
		return fmt.Errorf("failed to refresh token: status %d", resp.StatusCode)
	}

	var authRes SupabaseAuthResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&authRes); err != nil {
		return err
	}

	if authRes.AccessToken == "" {
		return errors.New("empty access token in refresh response")
	}

	local.Token = authRes.AccessToken
	if authRes.RefreshToken != "" {
		local.RefreshToken = authRes.RefreshToken
	}
	_ = s.repo.Save(local)
	return nil
}

func (s *LicenseService) Logout() error {
	local, err := s.repo.Get()
	if err == nil && local != nil && local.Token != "" && SupabaseURL != "" {
		req, reqErr := http.NewRequest("POST", SupabaseURL+"/auth/v1/logout", nil)
		if reqErr == nil {
			req.Header.Set("apikey", SupabaseAnonKey)
			req.Header.Set("Authorization", "Bearer "+local.Token)
			if resp, doErr := sharedClient.Do(req); doErr == nil {
				// 🛡️ إغلاق جسم الاستجابة لإعادة الاتصال للمسبح — تسريب الاتصال يستهلك المنافذ
				_ = resp.Body.Close()
			}
		}
	}
	return s.repo.Clear()
}
