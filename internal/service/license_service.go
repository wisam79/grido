package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"net/url"
	"os/exec"
	"strings"
	"time"

	"grido/internal/core/domain"
)

type LicenseService struct {
	repo domain.LicenseRepository
}

func NewLicenseService(repo domain.LicenseRepository) *LicenseService {
	return &LicenseService{repo: repo}
}

const (
	supabaseURL     = "https://mvovehnyvoiawvwaurav.supabase.co"
	supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12b3ZlaG55dm9pYXd2d2F1cmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Nzg2MjQsImV4cCI6MjA5OTM1NDYyNH0.DrZxhJkwjHrk1qP1kJ6JtwAo5AJZegOvFol2L-pGuUg"
)

// Supabase Auth Payloads
type SupabaseAuthRequest struct {
	Email    string                 `json:"email"`
	Password string                 `json:"password"`
	Data     map[string]interface{} `json:"data,omitempty"`
}

type SupabaseAuthResponse struct {
	AccessToken string `json:"access_token"`
	User        struct {
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
	req, _ := http.NewRequest("GET", supabaseURL+"/rest/v1/profiles?select=*&id=eq."+userID, nil)
	req.Header.Set("apikey", supabaseAnonKey)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch profile, status: %d", resp.StatusCode)
	}

	var profiles []SupabaseProfile
	if err := json.NewDecoder(resp.Body).Decode(&profiles); err != nil {
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

	payload, _ := json.Marshal(SupabaseAuthRequest{
		Email:    email,
		Password: password,
		Data:     map[string]interface{}{"name": name},
	})
	req, _ := http.NewRequest("POST", supabaseURL+"/auth/v1/signup", bytes.NewBuffer(payload))
	req.Header.Set("apikey", supabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.New("خطأ في الاتصال بالخادم. يرجى التحقق من الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, fmt.Errorf("server returned status: %d", resp.StatusCode)
	}

	var authRes SupabaseAuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authRes); err != nil {
		return nil, err
	}

	if authRes.User.ID == "" {
		if authRes.ID != "" {
			return nil, errors.New("تم إنشاء الحساب بنجاح. يرجى تفعيل الحساب من الرابط المرسل لبريدك الإلكتروني، ثم تسجيل الدخول.")
		}
		return nil, errors.New("حدث خطأ غير متوقع أثناء التسجيل")
	}

	// Retry fetching profile with backoff (wait for DB trigger)
	var prof *SupabaseProfile
	for i := 0; i < 3; i++ {
		time.Sleep(time.Duration(200*(i+1)) * time.Millisecond)
		prof, err = s.fetchProfile(authRes.AccessToken, authRes.User.ID)
		if err == nil {
			break
		}
	}
	if prof == nil {
		return nil, errors.New("فشل جلب بيانات الحساب الشخصي")
	}

	user := &domain.UserProfile{
		ID:         authRes.User.ID,
		Name:       name,
		Email:      email,
		Plan:       prof.Plan,
		Token:      authRes.AccessToken,
		CreatedAt:  time.Now(),
		ExpiresAt:  prof.ExpiresAt,
		LicenseKey: prof.LicenseKey,
		Status:     prof.Status,
		UpdatedAt:  time.Now(),
	}

	_ = s.repo.Clear()
	_ = s.repo.Save(user)
	return user, nil
}

func (s *LicenseService) Login(email, password string) (*domain.UserProfile, error) {
	if email == "" || password == "" {
		return nil, errors.New("البريد الإلكتروني وكلمة المرور مطلوبة")
	}
	if len(password) < 6 {
		return nil, errors.New("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
	}

	payload, _ := json.Marshal(SupabaseAuthRequest{
		Email:    email,
		Password: password,
	})
	req, _ := http.NewRequest("POST", supabaseURL+"/auth/v1/token?grant_type=password", bytes.NewBuffer(payload))
	req.Header.Set("apikey", supabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.New("خطأ في الاتصال بالخادم. يرجى التحقق من الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, errors.New("البريد الإلكتروني أو كلمة المرور غير صحيحة")
	}

	var authRes SupabaseAuthResponse
	if err := json.NewDecoder(resp.Body).Decode(&authRes); err != nil {
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
		ID:         authRes.User.ID,
		Name:       name,
		Email:      email,
		Plan:       prof.Plan,
		Token:      authRes.AccessToken,
		CreatedAt:  time.Now(),
		ExpiresAt:  prof.ExpiresAt,
		LicenseKey: prof.LicenseKey,
		Status:     prof.Status,
		UpdatedAt:  time.Now(),
	}

	_ = s.repo.Clear()
	_ = s.repo.Save(user)
	return user, nil
}

func (s *LicenseService) LoginWithGoogle() (*domain.UserProfile, error) {
	tokenChan := make(chan string, 1)
	errChan := make(chan error, 1)

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
            fetch('http://localhost:34567/exchange', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: hash.substring(1)
            }).then(r => {
                document.getElementById("msg").innerHTML = 'تم تسجيل الدخول بنجاح! 🎉<br>يمكنك إغلاق هذه النافذة والعودة إلى التطبيق.';
                setTimeout(() => window.close(), 3000);
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
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			errChan <- err
			http.Error(w, "Read error", http.StatusBadRequest)
			return
		}
		tokenChan <- string(bodyBytes)
		w.WriteHeader(http.StatusOK)
	})

	// Start listener on localhost:34567
	listener, err := net.Listen("tcp", "127.0.0.1:34567")
	if err != nil {
		return nil, fmt.Errorf("المنفذ 34567 مشغول، يرجى التأكد من عدم تشغيل محاولة تسجيل دخول أخرى: %w", err)
	}

	srv := &http.Server{
		Handler: mux,
	}

	go func() {
		if err := srv.Serve(listener); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	authURL := fmt.Sprintf("%s/auth/v1/authorize?provider=google&redirect_to=http://localhost:34567/callback", supabaseURL)
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", authURL).Start()

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

	client := &http.Client{Timeout: 5 * time.Second}
	userReq, _ := http.NewRequest("GET", supabaseURL+"/auth/v1/user", nil)
	userReq.Header.Set("apikey", supabaseAnonKey)
	userReq.Header.Set("Authorization", "Bearer "+accessToken)

	userResp, err := client.Do(userReq)
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
	if err := json.NewDecoder(userResp.Body).Decode(&supabaseUser); err != nil {
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
		ID:         supabaseUser.ID,
		Name:       name,
		Email:      supabaseUser.Email,
		Plan:       prof.Plan,
		Token:      accessToken,
		CreatedAt:  time.Now(),
		ExpiresAt:  prof.ExpiresAt,
		LicenseKey: prof.LicenseKey,
		Status:     prof.Status,
		UpdatedAt:  time.Now(),
	}

	_ = s.repo.Clear()
	_ = s.repo.Save(userProfile)
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

	deviceID := "desktop-win"

	payload, _ := json.Marshal(LicenseKeyRequest{PKey: key, PDeviceID: deviceID})
	req, _ := http.NewRequest("POST", supabaseURL+"/rest/v1/rpc/activate_license", bytes.NewBuffer(payload))
	req.Header.Set("apikey", supabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+local.Token)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.New("خطأ في الاتصال بالخادم. يرجى التحقق من الإنترنت")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errRes struct{ Message string `json:"message"` }
		_ = json.NewDecoder(resp.Body).Decode(&errRes)
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
		_ = s.repo.Save(local)
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
		_ = s.repo.Save(local)
		return local, nil
	}

	prof, err := s.fetchProfile(local.Token, local.ID)
	if err == nil {
		local.Plan = prof.Plan
		local.ExpiresAt = prof.ExpiresAt
		local.Status = prof.Status
		local.LicenseKey = prof.LicenseKey
		local.UpdatedAt = time.Now()
		_ = s.repo.Save(local)
	} else if strings.Contains(err.Error(), "401") {
		_ = s.repo.Clear()
		return &domain.UserProfile{Plan: "free", Status: "none"}, nil
	}

	return local, nil
}

func (s *LicenseService) Logout() error {
	return s.repo.Clear()
}

func generateRandomBlock(length int) string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return string(b)
}

func (s *LicenseService) GetAllUsers() ([]domain.UserProfile, error) {
	req, _ := http.NewRequest("GET", supabaseURL+"/admin/users", nil)
	if local, err := s.repo.Get(); err == nil && local != nil {
		req.Header.Set("Authorization", "Bearer "+local.Token)
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Info("Cloud API offline, listing users from local database...")
		return s.repo.GetAll()
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var users []domain.UserProfile
		if err := json.NewDecoder(resp.Body).Decode(&users); err == nil {
			return users, nil
		}
	}

	return s.repo.GetAll()
}

func (s *LicenseService) GenerateLicenseKey(plan string, durationMonths int) (string, error) {
	plan = strings.ToUpper(plan)
	if plan != "PRO" && plan != "ENTERPRISE" {
		plan = "PRO"
	}

	block1 := generateRandomBlock(4)
	block2 := generateRandomBlock(4)
	key := fmt.Sprintf("GRIDO-%s-%s-%s", plan, block1, block2)

	payload, _ := json.Marshal(map[string]interface{}{"key": key, "plan": plan, "months": durationMonths})
	req, _ := http.NewRequest("POST", supabaseURL+"/admin/keys", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	if local, err := s.repo.Get(); err == nil && local != nil {
		req.Header.Set("Authorization", "Bearer "+local.Token)
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Info("Cloud API offline, generated license key locally: " + key)
		return key, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var res struct{ Key string `json:"key"` }
		if err := json.NewDecoder(resp.Body).Decode(&res); err == nil {
			return res.Key, nil
		}
	}

	return key, nil
}

func (s *LicenseService) RevokeLicense(email string) error {
	req, _ := http.NewRequest("POST", supabaseURL+"/admin/users/revoke?email="+email, nil)
	if local, err := s.repo.Get(); err == nil && local != nil {
		req.Header.Set("Authorization", "Bearer "+local.Token)
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Info("Cloud API offline, revoking user license locally for email: " + email)
		users, _ := s.repo.GetAll()
		for _, u := range users {
			if u.Email == email {
				u.Plan = "free"
				u.Status = "none"
				u.ExpiresAt = time.Now()
				u.UpdatedAt = time.Now()
				_ = s.repo.SaveUser(&u)
				
				current, _ := s.repo.Get()
				if current != nil && current.Email == email {
					_ = s.repo.Save(&u)
				}
				break
			}
		}
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return errors.New("failed to revoke license on server")
	}

	return nil
}

func (s *LicenseService) ExtendLicense(email string, months int) error {
	req, _ := http.NewRequest("POST", fmt.Sprintf("%s/admin/users/extend?email=%s&months=%d", supabaseURL, email, months), nil)
	if local, err := s.repo.Get(); err == nil && local != nil {
		req.Header.Set("Authorization", "Bearer "+local.Token)
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Info(fmt.Sprintf("Cloud API offline, extending user license locally by %d months for email: %s", months, email))
		users, _ := s.repo.GetAll()
		for _, u := range users {
			if u.Email == email {
				if u.Plan == "free" || u.Plan == "trial" || u.Plan == "none" {
					u.Plan = "pro"
					u.Status = "active"
					u.ExpiresAt = time.Now().AddDate(0, months, 0)
				} else {
					u.ExpiresAt = u.ExpiresAt.AddDate(0, months, 0)
				}
				u.UpdatedAt = time.Now()
				_ = s.repo.SaveUser(&u)
				
				current, _ := s.repo.Get()
				if current != nil && current.Email == email {
					_ = s.repo.Save(&u)
				}
				break
			}
		}
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return errors.New("failed to extend license on server")
	}

	return nil
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
