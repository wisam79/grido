package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

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
	// 🌟 Load .env locally if it exists in current or parent dirs (only for development)
	for _, envPath := range []string{".env", "../.env", "../../.env"} {
		if envBytes, err := os.ReadFile(envPath); err == nil {
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
					if os.Getenv(key) == "" {
						os.Setenv(key, val)
					}
				}
			}
			break
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
	if ModalAIKey == "" {
		ModalAIKey = "grido_sec_ai_live_8f3d9b4c2e1a70562e84d9c0a1b3f5e76812c9d4a0b6f8e235d7c9a1e4f6b802"
	}
}

// GetModalAIKey returns the active Modal AI API key with fallback
func GetModalAIKey() string {
	if ModalAIKey != "" {
		return ModalAIKey
	}
	if key := os.Getenv("MODAL_AI_KEY"); key != "" {
		return key
	}
	if key := os.Getenv("GRIDO_AI_SECRET_KEY"); key != "" {
		return key
	}
	return "grido_sec_ai_live_8f3d9b4c2e1a70562e84d9c0a1b3f5e76812c9d4a0b6f8e235d7c9a1e4f6b802"
}

var sharedClient = &http.Client{Timeout: 10 * time.Second}

const maxResponseSize = 64 * 1024 // 64 KB limit for HTTP responses

var ErrUnauthorized = errors.New("unauthorized")

// Supabase Auth Payloads
type SupabaseAuthRequest struct {
	Email    string                 `json:"email"`
	Password string                 `json:"password"`
	Data     map[string]interface{} `json:"data,omitempty"`
}

type SupabaseVerifyRequest struct {
	Type  string `json:"type"`
	Email string `json:"email"`
	Token string `json:"token"`
}

type SupabaseAuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	User         struct {
		ID       string                 `json:"id"`
		Email    string                 `json:"email"`
		UserMeta map[string]interface{} `json:"user_metadata"`
	} `json:"user"`
	ID  string `json:"id,omitempty"`  // When email confirmations are enabled
	Msg string `json:"msg,omitempty"` // for error messages
}

func (r *SupabaseAuthResponse) GetUserID() string {
	if r.User.ID != "" {
		return r.User.ID
	}
	return r.ID
}

// Supabase REST Profile Payload
type SupabaseProfile struct {
	Plan       string    `json:"plan"`
	ExpiresAt  time.Time `json:"expires_at"`
	LicenseKey string    `json:"license_key"`
	Status     string    `json:"status"`
}

// RPC Payload
type LicenseKeyRequest struct {
	PKey      string `json:"p_key"`
	PDeviceID string `json:"p_device_id"`
}

func (s *LicenseService) ensureProfileViaRPC(token string) (*SupabaseProfile, error) {
	req, err := http.NewRequest("POST", SupabaseURL+"/rest/v1/rpc/ensure_profile_exists", bytes.NewBuffer([]byte("{}")))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := sharedClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("rpc ensure_profile_exists status: %d", resp.StatusCode)
	}

	var prof SupabaseProfile
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&prof); err != nil {
		return nil, err
	}
	return &prof, nil
}

func (s *LicenseService) fetchProfile(token, userID string) (*SupabaseProfile, error) {
	encodedUserID := url.QueryEscape(userID)
	req, err := http.NewRequest("GET", SupabaseURL+"/rest/v1/profiles?select=*&id=eq."+encodedUserID, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := sharedClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("failed to fetch profile: %w", ErrUnauthorized)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch profile, status: %d", resp.StatusCode)
	}

	var profiles []SupabaseProfile
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&profiles); err != nil {
		return nil, err
	}
	if len(profiles) == 0 {
		// Try fallback RPC to ensure profile exists
		profRPC, errRPC := s.ensureProfileViaRPC(token)
		if errRPC == nil && profRPC != nil {
			return profRPC, nil
		}
		return nil, errors.New("profile not found")
	}

	return &profiles[0], nil
}

func (s *LicenseService) Register(name, email, password string) (*domain.UserProfile, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	name = strings.TrimSpace(name)
	if email == "" || password == "" {
		return nil, errors.New("البريد الإلكتروني وكلمة المرور مطلوبة")
	}
	if len(password) < 6 {
		return nil, errors.New("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
	}
	if len(password) > 128 {
		return nil, errors.New("كلمة المرور يجب أن لا تتجاوز 128 حرفاً")
	}

	payload, err := json.Marshal(SupabaseAuthRequest{
		Email:    email,
		Password: password,
		Data:     map[string]interface{}{"name": name},
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", SupabaseURL+"/auth/v1/signup", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := sharedClient.Do(req)
	if err != nil {
		slog.Error("Network error during registration", "error", err, "email", email)
		return nil, errors.New("تعذر الاتصال بخوادم Grido. يرجى التحقق من اتصال الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		slog.Error("Supabase signup error", "status", resp.StatusCode, "body", string(body), "email", email)
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, fmt.Errorf("فشل التسجيل (رمز الخطأ: %d)", resp.StatusCode)
	}

	var authRes SupabaseAuthResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&authRes); err != nil {
		return nil, err
	}

	userID := authRes.GetUserID()
	if userID == "" {
		return &domain.UserProfile{Email: email, Status: "pending_otp"}, nil
	}

	// User.ID is present — registration succeeded with a session (email confirmation disabled)
	if authRes.AccessToken != "" {
		prof, err := s.fetchProfileWithRetry(authRes.AccessToken, userID, 3)
		if err == nil {
			displayName := email
			if n, ok := authRes.User.UserMeta["name"].(string); ok && n != "" {
				displayName = n
			} else if name != "" {
				displayName = name
			}
			user := &domain.UserProfile{
				ID:           userID,
				Name:         displayName,
				Email:        email,
				Plan:         prof.Plan,
				Token:        authRes.AccessToken,
				RefreshToken: authRes.RefreshToken,
				CreatedAt:    time.Now(),
				ExpiresAt:    prof.ExpiresAt,
				LicenseKey:   prof.LicenseKey,
				Status:       prof.Status,
				UpdatedAt:    time.Now(),
			}
			if err := s.repo.Clear(); err != nil {
				slog.Warn("Failed to clear repo after registration", "error", err)
			}
			if err := s.repo.Save(user); err != nil {
				return nil, fmt.Errorf("failed to save local session: %w", err)
			}
			return user, nil
		}
	}

	return &domain.UserProfile{Email: email, Status: "pending_otp"}, nil
}

func (s *LicenseService) ResendOTP(email string) (*domain.UserProfile, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return nil, errors.New("البريد الإلكتروني مطلوب لإعادة الإرسال")
	}

	payload, err := json.Marshal(map[string]string{
		"type":  "signup",
		"email": email,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", SupabaseURL+"/auth/v1/resend", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := sharedClient.Do(req)
	if err != nil {
		slog.Error("Network error during OTP resend", "error", err, "email", email)
		return nil, errors.New("تعذر الاتصال بخوادم Grido. يرجى التحقق من اتصال الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		slog.Error("Supabase resend OTP error", "status", resp.StatusCode, "body", string(body), "email", email)
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, errors.New("فشل إعادة إرسال كود التحقق. يرجى المحاولة لاحقاً")
	}

	return &domain.UserProfile{Email: email, Status: "pending_otp"}, nil
}

func (s *LicenseService) VerifyOTP(email, token string) (*domain.UserProfile, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	token = strings.TrimSpace(token)
	if email == "" || token == "" {
		return nil, errors.New("البريد الإلكتروني ورمز التحقق مطلوبان")
	}

	// Extract token if user pasted a full magic link URL
	if strings.Contains(token, "token=") || strings.Contains(token, "token_hash=") {
		var tokenParam string
		if strings.Contains(token, "token=") {
			tokenParam = "token="
		} else {
			tokenParam = "token_hash="
		}
		parts := strings.Split(token, tokenParam)
		if len(parts) > 1 {
			val := parts[1]
			if idx := strings.IndexAny(val, "&/#?"); idx != -1 {
				val = val[:idx]
			}
			token = strings.TrimSpace(val)
		}
	}

	verifyTypes := []string{"signup", "email", "magiclink"}
	var lastErr error
	var authRes SupabaseAuthResponse

	for _, vType := range verifyTypes {
		payload, err := json.Marshal(SupabaseVerifyRequest{
			Type:  vType,
			Email: email,
			Token: token,
		})
		if err != nil {
			return nil, err
		}

		req, err := http.NewRequest("POST", SupabaseURL+"/auth/v1/verify", bytes.NewBuffer(payload))
		if err != nil {
			return nil, err
		}
		req.Header.Set("apikey", SupabaseAnonKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := sharedClient.Do(req)
		if err != nil {
			slog.Error("Network error during OTP verification", "error", err, "email", email)
			return nil, errors.New("تعذر الاتصال بخوادم Grido. يرجى التحقق من اتصال الإنترنت")
		}

		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			if err := json.Unmarshal(body, &authRes); err == nil && authRes.GetUserID() != "" {
				lastErr = nil
				break
			}
		}

		slog.Warn("Supabase verify attempt failed", "type", vType, "status", resp.StatusCode, "body", string(body))
		if errMsg := parseSupabaseError(body); errMsg != "" {
			lastErr = errors.New(errMsg)
		} else {
			lastErr = errors.New("رمز التحقق غير صحيح أو منتهي الصلاحية")
		}
	}

	if lastErr != nil {
		return nil, lastErr
	}

	userID := authRes.GetUserID()
	if userID == "" {
		return nil, errors.New("رمز التحقق غير مكتمل")
	}

	prof, err := s.fetchProfileWithRetry(authRes.AccessToken, userID, 3)
	if err != nil {
		return nil, errors.New("فشل جلب بيانات الحساب الشخصي")
	}

	name := email
	if n, ok := authRes.User.UserMeta["name"].(string); ok && n != "" {
		name = n
	}

	user := &domain.UserProfile{
		ID:           userID,
		Name:         name,
		Email:        email,
		Plan:         prof.Plan,
		Token:        authRes.AccessToken,
		RefreshToken: authRes.RefreshToken,
		CreatedAt:    time.Now(),
		ExpiresAt:    prof.ExpiresAt,
		LicenseKey:   prof.LicenseKey,
		Status:       prof.Status,
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.Clear(); err != nil {
		slog.Warn("Failed to clear repo", "error", err)
	}
	if err := s.repo.Save(user); err != nil {
		return nil, fmt.Errorf("failed to save local session: %w", err)
	}
	return user, nil
}

func (s *LicenseService) Login(email, password string) (*domain.UserProfile, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" || password == "" {
		return nil, errors.New("البريد الإلكتروني وكلمة المرور مطلوبة")
	}
	if len(password) < 6 {
		return nil, errors.New("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
	}
	if len(password) > 128 {
		return nil, errors.New("كلمة المرور يجب أن لا تتجاوز 128 حرفاً")
	}

	payload, err := json.Marshal(SupabaseAuthRequest{
		Email:    email,
		Password: password,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", SupabaseURL+"/auth/v1/token?grant_type=password", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := sharedClient.Do(req)
	if err != nil {
		slog.Error("Network error during login", "error", err, "email", email)
		return nil, errors.New("تعذر الاتصال بخوادم Grido. يرجى التحقق من اتصال الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		slog.Error("Supabase login error", "status", resp.StatusCode, "body", string(body), "email", email)
		if errMsg := parseSupabaseError(body); errMsg != "" {
			if strings.Contains(errMsg, "تأكيد") || strings.Contains(string(body), "Email not confirmed") {
				return nil, errors.New(errMsg) // Wails will just pass the error string
			}
			return nil, errors.New(errMsg)
		}
		return nil, errors.New("البريد الإلكتروني أو كلمة المرور غير صحيحة")
	}

	var authRes SupabaseAuthResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&authRes); err != nil {
		return nil, err
	}

	userID := authRes.GetUserID()
	if userID == "" {
		return nil, errors.New("لم يتم العثور على معرف المستخدم في استجابة الخادم")
	}

	prof, err := s.fetchProfileWithRetry(authRes.AccessToken, userID, 3)
	if err != nil {
		return nil, errors.New("فشل جلب بيانات الحساب الشخصي من السيرفر")
	}

	name := email
	if n, ok := authRes.User.UserMeta["name"].(string); ok && n != "" {
		name = n
	}

	user := &domain.UserProfile{
		ID:           userID,
		Name:         name,
		Email:        email,
		Plan:         prof.Plan,
		Token:        authRes.AccessToken,
		RefreshToken: authRes.RefreshToken,
		CreatedAt:    time.Now(),
		ExpiresAt:    prof.ExpiresAt,
		LicenseKey:   prof.LicenseKey,
		Status:       prof.Status,
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.Clear(); err != nil {
		slog.Warn("Failed to clear repo", "error", err)
	}
	if err := s.repo.Save(user); err != nil {
		return nil, fmt.Errorf("failed to save session: %w", err)
	}
	return user, nil
}

// fetchOAuthUserDetails يجلب بيانات المستخدم من Supabase بعد نجاح OAuth
func (s *LicenseService) fetchOAuthUserDetails(accessToken string) (userID, email, fullName string, err error) {
	userReq, err := http.NewRequest("GET", SupabaseURL+"/auth/v1/user", nil)
	if err != nil {
		return "", "", "", err
	}
	userReq.Header.Set("apikey", SupabaseAnonKey)
	userReq.Header.Set("Authorization", "Bearer "+accessToken)

	userResp, err := sharedClient.Do(userReq)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to fetch user details: %w", err)
	}
	defer userResp.Body.Close()

	if userResp.StatusCode != http.StatusOK {
		return "", "", "", fmt.Errorf("failed to get user, status: %d", userResp.StatusCode)
	}

	var supabaseUser struct {
		ID       string `json:"id"`
		Email    string `json:"email"`
		UserMeta struct {
			Name string `json:"full_name"`
		} `json:"user_metadata"`
	}
	if err := json.NewDecoder(io.LimitReader(userResp.Body, maxResponseSize)).Decode(&supabaseUser); err != nil {
		return "", "", "", err
	}

	return supabaseUser.ID, supabaseUser.Email, supabaseUser.UserMeta.Name, nil
}

// fetchProfileWithRetry يحاول جلب بيانات الحساب الشخصي مع إعادة المحاولة
func (s *LicenseService) fetchProfileWithRetry(token, userID string, maxRetries int) (*SupabaseProfile, error) {
	var prof *SupabaseProfile
	var err error
	for i := 0; i < maxRetries; i++ {
		prof, err = s.fetchProfile(token, userID)
		if err == nil {
			break
		}
		if i < maxRetries-1 {
			time.Sleep(time.Duration(200*(i+1)) * time.Millisecond)
		}
	}
	if prof == nil {
		return nil, errors.New("فشل جلب بيانات الحساب الشخصي من السيرفر")
	}
	return prof, nil
}

const oauthCallbackHTML = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>جاري تسجيل الدخول...</title>
</head>
<body style="font-family: system-ui, sans-serif; text-align: center; margin-top: 50px; background-color: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80vh;">
    <div style="background-color: #1e293b; border: 1px solid #334155; padding: 30px; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); max-width: 400px; width: 90%;">
        <h2 id="msg" style="font-weight: 800; font-size: 1.25rem; margin-bottom: 10px;">جاري مصادقة الحساب، يرجى الانتظار...</h2>
        <p style="color: #94a3b8; font-size: 0.875rem;">يمكنك العودة إلى تطبيق Grido Studio بعد نجاح المصادقة.</p>
    </div>
    <script>
        const hash = window.location.hash;
        if (hash) {
            fetch('/exchange', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: hash.substring(1)
            }).then(r => {
                if (r.ok) {
                    document.getElementById("msg").innerHTML = 'تم تسجيل الدخول بنجاح! 🎉<br>يمكنك إغلاق هذه النافذة والعودة إلى التطبيق.';
                    setTimeout(() => window.close(), 3000);
                } else {
                    document.getElementById("msg").innerHTML = 'حدث خطأ أثناء المصادقة.';
                }
            }).catch(e => {
                document.getElementById("msg").innerHTML = 'حدث خطأ أثناء المصادقة.';
            });
        } else {
            document.getElementById("msg").innerHTML = 'الرابط غير صحيح أو منتهي الصلاحية.';
        }
    </script>
</body>
</html>
`

func (s *LicenseService) LoginWithGoogle() (*domain.UserProfile, error) {
	if SupabaseURL == "" {
		return nil, errors.New("بيئة التطوير تفتقد لروابط قاعدة البيانات (SUPABASE_URL). يرجى إعداد ملف .env للمصادقة")
	}

	tokenChan := make(chan string, 1)
	errChan := make(chan error, 1)

	listener, err := net.Listen("tcp", "127.0.0.1:34567")
	if err != nil {
		return nil, fmt.Errorf("المنفذ 34567 مشغول، يرجى التأكد من عدم تشغيل محاولة تسجيل دخول أخرى: %w", err)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, oauthCallbackHTML)
	})

	mux.HandleFunc("/exchange", func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" || (origin != "https://grido.cloud-ip.cc" && origin != "http://127.0.0.1:34567" && origin != "http://localhost:34567") {
			slog.Warn("Blocked OAuth exchange from untrusted origin", "origin", origin)
			http.Error(w, "Forbidden Origin", http.StatusForbidden)
			return
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		bodyBytes, err := io.ReadAll(io.LimitReader(r.Body, maxResponseSize))
		if err != nil {
			errChan <- err
			http.Error(w, "Read error", http.StatusBadRequest)
			return
		}

		tokenChan <- string(bodyBytes)
		w.WriteHeader(http.StatusOK)
	})

	srv := &http.Server{Handler: mux}

	go func() {
		if err := srv.Serve(listener); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	authURL := fmt.Sprintf("%s/auth/v1/authorize?provider=google&redirect_to=http://127.0.0.1:34567/callback", SupabaseURL)
	_ = utils.OpenBrowser(authURL)

	var oauthBody string
	select {
	case oauthBody = <-tokenChan:
	case err := <-errChan:
		_ = srv.Shutdown(context.Background())
		return nil, fmt.Errorf("خطأ في الخادم المحلي: %w", err)
	case <-time.After(2 * time.Minute):
		_ = srv.Shutdown(context.Background())
		return nil, errors.New("انتهى وقت تسجيل الدخول (2 دقيقة)")
	}

	_ = srv.Shutdown(context.Background())

	values, err := url.ParseQuery(oauthBody)
	if err != nil {
		return nil, fmt.Errorf("failed to parse oauth response: %w", err)
	}

	accessToken := values.Get("access_token")
	if accessToken == "" {
		return nil, errors.New("لم يتم استلام رمز الدخول من جوجل")
	}
	refreshToken := values.Get("refresh_token")

	userID, userEmail, userName, err := s.fetchOAuthUserDetails(accessToken)
	if err != nil {
		return nil, err
	}

	prof, err := s.fetchProfileWithRetry(accessToken, userID, 3)
	if err != nil {
		return nil, err
	}

	name := userName
	if name == "" {
		name = userEmail
	}

	userProfile := &domain.UserProfile{
		ID:           userID,
		Name:         name,
		Email:        userEmail,
		Plan:         prof.Plan,
		Token:        accessToken,
		RefreshToken: refreshToken,
		CreatedAt:    time.Now(),
		ExpiresAt:    prof.ExpiresAt,
		LicenseKey:   prof.LicenseKey,
		Status:       prof.Status,
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.Clear(); err != nil {
		slog.Warn("Failed to clear repo", "error", err)
	}
	if err := s.repo.Save(userProfile); err != nil {
		return nil, fmt.Errorf("failed to save session: %w", err)
	}
	return userProfile, nil
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
		if refreshErr := s.refreshTokenIfNeeded(local); refreshErr == nil {
			prof, err = s.fetchProfile(local.Token, local.ID)
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
	} else if errors.Is(err, ErrUnauthorized) {
		_ = s.repo.Clear()
		return &domain.UserProfile{Plan: "free", Status: "none"}, nil
	}

	return local, nil
}

func (s *LicenseService) refreshTokenIfNeeded(local *domain.UserProfile) error {
	if local.RefreshToken == "" {
		return errors.New("no refresh token available")
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

	resp, err := sharedClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
			local.RefreshToken = ""
			_ = s.repo.Save(local)
		}
		return fmt.Errorf("failed to refresh token: status %d", resp.StatusCode)
	}

	var authRes SupabaseAuthResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&authRes); err != nil {
		return err
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
	if err == nil && local != nil && local.Token != "" {
		req, _ := http.NewRequest("POST", SupabaseURL+"/auth/v1/logout", nil)
		req.Header.Set("apikey", SupabaseAnonKey)
		req.Header.Set("Authorization", "Bearer "+local.Token)
		_, _ = sharedClient.Do(req)
	}
	return s.repo.Clear()
}

func (s *LicenseService) ResetPassword(email string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return errors.New("البريد الإلكتروني مطلوب")
	}

	payload, err := json.Marshal(map[string]string{
		"email": email,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", SupabaseURL+"/auth/v1/recover", bytes.NewBuffer(payload))
	if err != nil {
		return err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := sharedClient.Do(req)
	if err != nil {
		return errors.New("تعذر الاتصال بخوادم Grido. يرجى التحقق من اتصال الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return errors.New(errMsg)
		}
		return errors.New("فشل إرسال رابط إعادة تعيين كلمة المرور")
	}

	return nil
}

func (s *LicenseService) VerifyRecoveryOTP(email, token, newPassword string) (*domain.UserProfile, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	token = strings.TrimSpace(token)
	newPassword = strings.TrimSpace(newPassword)
	if email == "" || token == "" || newPassword == "" {
		return nil, errors.New("جميع الحقول مطلوبة")
	}
	if len(newPassword) < 6 {
		return nil, errors.New("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
	}

	verifyTypes := []string{"recovery", "magiclink", "signup", "email"}
	var lastErr error
	var authRes SupabaseAuthResponse

	for _, vType := range verifyTypes {
		payload, err := json.Marshal(SupabaseVerifyRequest{
			Type:  vType,
			Email: email,
			Token: token,
		})
		if err != nil {
			return nil, err
		}

		req, err := http.NewRequest("POST", SupabaseURL+"/auth/v1/verify", bytes.NewBuffer(payload))
		if err != nil {
			return nil, err
		}
		req.Header.Set("apikey", SupabaseAnonKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := sharedClient.Do(req)
		if err != nil {
			slog.Error("Network error verifying OTP", "error", err, "type", vType)
			return nil, errors.New("تعذر الاتصال بخوادم Grido. يرجى التحقق من اتصال الإنترنت")
		}

		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		resp.Body.Close()

		slog.Info("Supabase Verify OTP response", "type", vType, "status", resp.StatusCode, "body", string(body))

		if resp.StatusCode == http.StatusOK {
			if err := json.NewDecoder(bytes.NewReader(body)).Decode(&authRes); err == nil && authRes.AccessToken != "" {
				lastErr = nil
				break
			} else {
				slog.Error("Failed to decode auth response or missing access token", "error", err, "body", string(body))
			}
		}

		if errMsg := parseSupabaseError(body); errMsg != "" {
			lastErr = errors.New(errMsg)
		} else {
			lastErr = errors.New("كود الاستعادة غير صحيح أو منتهي الصلاحية")
		}
	}

	if lastErr != nil {
		slog.Error("All OTP verify types failed", "lastErr", lastErr)
		return nil, lastErr
	}

	updatePayload, _ := json.Marshal(map[string]string{
		"password": newPassword,
	})
	updateReq, err := http.NewRequest("PUT", SupabaseURL+"/auth/v1/user", bytes.NewBuffer(updatePayload))
	if err != nil {
		return nil, err
	}
	updateReq.Header.Set("apikey", SupabaseAnonKey)
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("Authorization", "Bearer "+authRes.AccessToken)

	updateResp, err := sharedClient.Do(updateReq)
	if err != nil {
		slog.Error("Network error updating password", "error", err)
		return nil, errors.New("فشل تحديث كلمة المرور الجديدة")
	}
	defer updateResp.Body.Close()

	if updateResp.StatusCode != http.StatusOK {
		updateBody, _ := io.ReadAll(io.LimitReader(updateResp.Body, maxResponseSize))
		slog.Error("Supabase update password failed", "status", updateResp.StatusCode, "body", string(updateBody))
		if errMsg := parseSupabaseError(updateBody); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, errors.New("تعذر تغيير كلمة المرور")
	}

	userID := authRes.GetUserID()
	prof, err := s.fetchProfileWithRetry(authRes.AccessToken, userID, 3)
	if err != nil {
		prof = &SupabaseProfile{Plan: "trial", Status: "active"}
	}

	displayName := email
	if n, ok := authRes.User.UserMeta["name"].(string); ok && n != "" {
		displayName = n
	}

	profile := &domain.UserProfile{
		ID:         userID,
		Email:      email,
		Name:       displayName,
		Plan:       prof.Plan,
		Status:     prof.Status,
		ExpiresAt:  prof.ExpiresAt,
		LicenseKey: prof.LicenseKey,
		Token:      authRes.AccessToken,
	}


	if err := s.repo.Save(profile); err != nil {
		slog.Error("Failed to persist user profile after password reset", "error", err)
	}

	return profile, nil
}

func parseSupabaseError(body []byte) string {
	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return ""
	}

	var rawMsg string
	if msg, ok := data["msg"].(string); ok && msg != "" {
		rawMsg = msg
	} else if msg, ok := data["message"].(string); ok && msg != "" {
		rawMsg = msg
	} else if desc, ok := data["error_description"].(string); ok && desc != "" {
		rawMsg = desc
	} else if errStr, ok := data["error"].(string); ok && errStr != "" {
		rawMsg = errStr
	}

	lower := strings.ToLower(rawMsg)
	switch {
	case strings.Contains(lower, "invalid login credentials") || strings.Contains(lower, "invalid_credentials"):
		return "البريد الإلكتروني أو كلمة المرور غير صحيحة"
	case strings.Contains(lower, "user already registered") || strings.Contains(lower, "already_registered") || strings.Contains(lower, "user_already_exists"):
		return "هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول مباشرة"
	case strings.Contains(lower, "email not confirmed") || strings.Contains(lower, "email_not_confirmed"):
		return "البريد الإلكتروني بحاجة لتأكيد. يرجى إدخال كود التحقق (OTP) الخاص بك"
	case strings.Contains(lower, "over_email_send_rate_limit") || strings.Contains(lower, "rate limit exceeded") || strings.Contains(lower, "too many requests"):
		return "تم تجاوز حد إرسال الطلبات المسموح به. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً"
	case strings.Contains(lower, "password should be at least") || strings.Contains(lower, "weak_password"):
		return "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
	case strings.Contains(lower, "token has expired") || strings.Contains(lower, "token is invalid") || strings.Contains(lower, "invalid_grant") || strings.Contains(lower, "otp_expired"):
		return "رمز التحقق غير صحيح أو منتهي الصلاحية"
	case strings.Contains(lower, "signup_disabled"):
		return "تسجيل الحسابات الجديدة متوقف مؤقتاً في الوقت الحالي"
	case strings.Contains(lower, "jwt expired") || strings.Contains(lower, "token_expired"):
		return "انتهت صلاحية جلسة تسجيل الدخول، يرجى إعادة تسجيل الدخول"
	case rawMsg != "":
		return rawMsg
	}
	return ""
}
