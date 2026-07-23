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
	// 🌟 Load .env locally if it exists (only for development)
	if envBytes, err := os.ReadFile(".env"); err == nil {
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

var sharedClient = &http.Client{Timeout: 10 * time.Second}

const maxResponseSize = 5 * 1024 * 1024 // 5 MB limit for HTTP responses

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

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch profile, status: %d", resp.StatusCode)
	}

	var profiles []SupabaseProfile
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&profiles); err != nil {
		return nil, err
	}
	if len(profiles) == 0 {
		return nil, errors.New("profile not found")
	}

	return &profiles[0], nil
}

// Safe wrapper to handle API requests
func (s *LicenseService) Register(name, email, password string) (*domain.UserProfile, error) {
	if email == "" || password == "" {
		return nil, errors.New("البريد الإلكتروني وكلمة المرور مطلوبة")
	}
	if len(password) < 6 {
		return nil, errors.New("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
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
		return nil, errors.New("خطأ في الاتصال بالخادم. يرجى التحقق من الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, fmt.Errorf("server returned status: %d", resp.StatusCode)
	}

	var authRes SupabaseAuthResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&authRes); err != nil {
		return nil, err
	}

	if authRes.User.ID == "" {
		if authRes.ID != "" {
			// This means email confirmation is required.
			// Return a dummy profile with "pending_otp" status to let the frontend know to show the OTP screen.
			return &domain.UserProfile{Email: email, Status: "pending_otp"}, nil
		}
		return nil, errors.New("حدث خطأ غير متوقع أثناء التسجيل")
	}

	// User.ID is present — registration succeeded with a session (email confirmation disabled)
	if authRes.AccessToken != "" {
		prof, err := s.fetchProfile(authRes.AccessToken, authRes.User.ID)
		if err == nil {
			name := email
			if n, ok := authRes.User.UserMeta["name"].(string); ok && n != "" {
				name = n
			}
			user := &domain.UserProfile{
				ID:           authRes.User.ID,
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
				slog.Warn("Failed to clear repo after registration", "error", err)
			}
			if err := s.repo.Save(user); err != nil {
				return nil, fmt.Errorf("failed to save local session: %w", err)
			}
			return user, nil
		}
	}

	return nil, errors.New("تم إنشاء الحساب بنجاح. يرجى تسجيل الدخول للمتابعة")
}

func (s *LicenseService) VerifyOTP(email, token string) (*domain.UserProfile, error) {
	if email == "" || token == "" {
		return nil, errors.New("البريد الإلكتروني ورمز التحقق مطلوبان")
	}

	payload, err := json.Marshal(SupabaseVerifyRequest{
		Type:  "signup",
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
		return nil, errors.New("خطأ في الاتصال بالخادم. يرجى التحقق من الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, errors.New("رمز التحقق غير صحيح أو منتهي الصلاحية")
	}

	var authRes SupabaseAuthResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&authRes); err != nil {
		return nil, err
	}

	prof, err := s.fetchProfile(authRes.AccessToken, authRes.User.ID)
	if err != nil {
		return nil, errors.New("فشل جلب بيانات الحساب الشخصي")
	}

	name := email
	if n, ok := authRes.User.UserMeta["name"].(string); ok && n != "" {
		name = n
	}

	user := &domain.UserProfile{
		ID:           authRes.User.ID,
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
	if email == "" || password == "" {
		return nil, errors.New("البريد الإلكتروني وكلمة المرور مطلوبة")
	}
	if len(password) < 6 {
		return nil, errors.New("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
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
		return nil, errors.New("خطأ في الاتصال بالخادم. يرجى التحقق من الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, errors.New("البريد الإلكتروني أو كلمة المرور غير صحيحة")
	}

	var authRes SupabaseAuthResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxResponseSize)).Decode(&authRes); err != nil {
		return nil, err
	}

	prof, err := s.fetchProfile(authRes.AccessToken, authRes.User.ID)
	if err != nil {
		return nil, errors.New("فشل جلب بيانات الحساب الشخصي")
	}

	name := email
	if n, ok := authRes.User.UserMeta["name"].(string); ok && n != "" {
		name = n
	}

	user := &domain.UserProfile{
		ID:           authRes.User.ID,
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

func (s *LicenseService) LoginWithGoogle() (*domain.UserProfile, error) {
	if SupabaseURL == "" {
		return nil, errors.New("بيئة التطوير تفتقد لروابط قاعدة البيانات (SUPABASE_URL). يرجى إعداد ملف .env للمصادقة")
	}

	tokenChan := make(chan string, 1)
	errChan := make(chan error, 1)

	// Start listener on a fixed port 34567
	listener, err := net.Listen("tcp", "127.0.0.1:34567")
	if err != nil {
		return nil, fmt.Errorf("المنفذ 34567 مشغول، يرجى التأكد من عدم تشغيل محاولة تسجيل دخول أخرى: %w", err)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, `
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
`)
	})

	mux.HandleFunc("/exchange", func(w http.ResponseWriter, r *http.Request) {
		// Verify Origin
		origin := r.Header.Get("Origin")
		if origin != "https://grido.cloud-ip.cc" && origin != "http://127.0.0.1:34567" && origin != "http://localhost:34567" && origin != "" {
			slog.Warn("Blocked OAuth exchange from untrusted origin", "origin", origin)
			http.Error(w, "Forbidden Origin", http.StatusForbidden)
			return
		}

		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "https://grido.cloud-ip.cc")
		}
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

	srv := &http.Server{
		Handler: mux,
	}

	go func() {
		if err := srv.Serve(listener); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	authURL := fmt.Sprintf("%s/auth/v1/authorize?provider=google&redirect_to=https://grido.cloud-ip.cc/callback", SupabaseURL)
	_ = utils.OpenBrowser(authURL)

	var oauthBody string
	select {
	case oauthBody = <-tokenChan:
		// Success
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

	userReq, err := http.NewRequest("GET", SupabaseURL+"/auth/v1/user", nil)
	if err != nil {
		return nil, err
	}
	userReq.Header.Set("apikey", SupabaseAnonKey)
	userReq.Header.Set("Authorization", "Bearer "+accessToken)

	userResp, err := sharedClient.Do(userReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user details: %w", err)
	}
	defer userResp.Body.Close()

	if userResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user, status: %d", userResp.StatusCode)
	}

	var supabaseUser struct {
		ID       string `json:"id"`
		Email    string `json:"email"`
		UserMeta struct {
			Name string `json:"full_name"`
		} `json:"user_metadata"`
	}
	if err := json.NewDecoder(io.LimitReader(userResp.Body, maxResponseSize)).Decode(&supabaseUser); err != nil {
		return nil, err
	}

	var prof *SupabaseProfile
	for i := 0; i < 3; i++ {
		time.Sleep(time.Duration(200*(i+1)) * time.Millisecond)
		prof, err = s.fetchProfile(accessToken, supabaseUser.ID)
		if err == nil {
			break
		}
	}
	if prof == nil {
		return nil, errors.New("فشل جلب بيانات الحساب الشخصي من السيرفر")
	}

	name := supabaseUser.UserMeta.Name
	if name == "" {
		name = supabaseUser.Email
	}

	userProfile := &domain.UserProfile{
		ID:           supabaseUser.ID,
		Name:         name,
		Email:        supabaseUser.Email,
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
		return nil, errors.New("خطأ في الاتصال بالخادم. يرجى التحقق من الإنترنت")
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
	if err != nil && strings.Contains(err.Error(), "401") {
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
	} else if strings.Contains(err.Error(), "401") {
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
	return s.repo.Clear()
}


func parseSupabaseError(body []byte) string {
	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return ""
	}
	if msg, ok := data["msg"].(string); ok && msg != "" {
		return msg
	}
	if msg, ok := data["message"].(string); ok && msg != "" {
		return msg
	}
	if desc, ok := data["error_description"].(string); ok && desc != "" {
		return desc
	}
	if err, ok := data["error"].(string); ok && err != "" {
		return err
	}
	return ""
}
