package service

import (
	"bytes"
	"context"
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

	"github.com/wailsapp/wails/v3/pkg/application"
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
	// browserOpen يفتح رابط تفويض OAuth في المتصفح الافتراضي.
	// قابل للاستبدال داخل الاختبارات.
	browserOpen func(url string) error
}

func NewLicenseService(repo domain.LicenseRepository) *LicenseService {
	return &LicenseService{repo: repo}
}

// SetContext يحافظ على التوافقية مع Wails Runtime
func (s *LicenseService) SetContext(ctx context.Context) {
	if s == nil || ctx == nil {
		return
	}
	s.browserOpen = func(url string) error {
		if app := application.Get(); app != nil {
			return app.Browser.OpenURL(url)
		}
		return errors.New("browser opener is not configured: application runtime is nil")
	}
}

// openBrowserURL يفتح الرابط عبر المنفذ المحقون (يبقى قابلاً للاختبار).
func (s *LicenseService) openBrowserURL(target string) error {
	if s == nil || s.browserOpen == nil {
		return errors.New("browser opener is not configured")
	}
	return s.browserOpen(target)
}

// SupabaseURL and SupabaseAnonKey are injected at build time via:
//
//	-ldflags "-X grido/internal/service.SupabaseURL=https://... -X grido/internal/service.SupabaseAnonKey=..."
//
// For local development, set SUPABASE_URL and SUPABASE_ANON_KEY in a .env file
// and load it before running (see .env.example).
//
// 🔒 لا يوجد سرّ مشترك لخادم الذكاء الاصطناعي (Modal): التوثيق حصراً عبر JWT
// المستخدم (Authorization: Bearer) الذي يتحقق منه modal_ai/upscaler.py مع Supabase.
// حُذف ModalAIKey/GetModalAIKey (2026-09-25 — تدقيق C-02) لأنه كان سرّاً ميتاً
// يُحقن في كل بناء بلا أي مستهلك إنتاجي، ويُستخرج من الثنائي بـ strings.
var (
	SupabaseURL     = "" // injected via ldflags at build time
	SupabaseAnonKey = "" // injected via ldflags at build time
	ModalAIURL      = "" // عنوان النقطة النهائية (اختياري) عبر .env/MODAL_AI_URL — لا حقن ldflags
)

// loadEnvConfigFile يقرأ ملف `.env` من مجلد بيانات التطبيق (مجلد يملكه المستخدم
// ويُوثَّق كبيئة تشغيل محلية).
//
// 🔒 الارتداد إلى `.env` في **مجلد العمل الحالي** مسموح فقط في وضع التطوير
// (`allowCwdFallback`): تشغيل الإنتاج من مجلد يحوي `.env` ملقَّمًا يعيد توجيه
// `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`MODAL_AI_URL` إلى خادم مهاجم — فيُرسَل إليه
// بريد المستخدم وكلمة مروره ورمز التحقق و JWT وكل صور الترميم. الإنتاج يُحقن بـ
// ldflags، وليس بملف يُقرأ من مجلد العمل (قاعدة AGENTS.md: الفحص الاحتياطي
// مشروط ببيئة التطوير المحلي).
func loadEnvConfigFile(appDir string, allowCwdFallback bool) map[string]string {
	envVars := make(map[string]string)

	envPath := filepath.Join(appDir, ".env")
	if _, err := os.Stat(envPath); err != nil {
		if !allowCwdFallback {
			slog.Warn("No .env in app data directory and current-directory fallback is disabled (production) — relying on ldflags/env vars")
			return envVars
		}
		envPath = ".env"
	}

	envBytes, err := os.ReadFile(envPath)
	if err != nil {
		return envVars
	}

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
	return envVars
}

func init() {
	// 🌟 ملف .env: مجلد بيانات التطبيق دائماً، ومجلد العمل في وضع التطوير فقط
	// (wails3 task dev) — انظر loadEnvConfigFile أعلاه.
	envVars := loadEnvConfigFile(utils.GetAppDir(), serviceDevBuild || utils.IsDevEnvironment())

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
		// 🛡️ الجلسة الواحدة النشطة (Last-Wins): بعد تحقق شبكي ناجح فقط —
		// 1) احجز جلسة محلية لم تُحجز بعد (حسابات ما قبل الميزة/دخول أوفلاين).
		// 2) تحقق أن جلستنا هي النشطة؛ المطرودة تُمسح برسالة صريحة.
		// فشل الشبكة هنا مستحيل (fetchProfile نجح) — أي خطأ تحقق لاحق هو شبكي
		// ويعني سماح عدم اتصال، لا طرداً.
		_ = s.ensureSessionClaimed(local.Token)
		if ok, sessErr := s.verifyActiveSession(local.Token); !ok && sessErr != nil {
			if errors.Is(sessErr, ErrSessionSuperseded) {
				slog.Warn("Session superseded by a newer login — evicting local session")
				_ = s.repo.Clear()
				return nil, ErrSessionSuperseded
			}
			slog.Warn("Session verify failed (network?) — keeping session", "error", sessErr)
		}
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

	req, err := http.NewRequest("POST", SupabaseURL+"/auth/v1/token?grant_type=refresh_token", bytes.NewBuffer(payload))
	if err != nil {
		return err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	// سياسة موحّدة (http_retry.go) مع RetryOnStatus=false: يُعاد المحاولة على
	// أخطاء النقل فقط — الخادم قد يكون نفّذ تدوير التوكن فعلاً ثم فشل الرد،
	// فإعادة إرسال POST للتدوير تُبطل التوكن الجديد وهو خطأ أمني/وظيفي.
	resp, err := httpDoWithRetry(context.Background(), sharedClient, req, RetryPolicy{
		MaxAttempts:   3,
		BaseDelay:     500 * time.Millisecond,
		RetryOnStatus: false,
	})
	if err != nil {
		return err
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
	// 🛡️ الجلسة الواحدة: امسح الجلسة المحلية فقط (لا تحذف صف الخادم —
	// قد يكون ملك جلسة أحدث من جهاز آخر، وحذفه سيفقدنا أثر الطرد).
	_ = utils.ClearSessionID()
	return s.repo.Clear()
}
