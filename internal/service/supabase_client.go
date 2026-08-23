package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ─────────────────────────────────────────────────────────────────────────────
// supabase_client.go — عميل HTTP منخفض المستوى للتعامل مع Supabase
//
// يحتوي: العميل المشترك، حدود الاستجابة، الأخطاء الحارسة، أنواع الحمولات (DTOs)،
// ودوال الجلب الأساسية + ترجمة أخطاء Supabase إلى رسائل عربية.
// ─────────────────────────────────────────────────────────────────────────────

var sharedClient = &http.Client{Timeout: 10 * time.Second}

const maxResponseSize = 64 * 1024 // 64 KB limit for HTTP responses

var ErrUnauthorized = errors.New("unauthorized")
var ErrInvalidRefreshToken = errors.New("invalid refresh token")

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
