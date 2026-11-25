package service

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
	"unicode"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// auth_flows.go — تدفقات المصادقة عالية المستوى
//
// تسجيل حساب، إعادة إرسال OTP، التحقق من OTP، تسجيل الدخول بالبريد،
// وإعادة تعيين كلمة المرور مع رمز الاستعادة.
// ─────────────────────────────────────────────────────────────────────────────

const networkErrMessage = "تعذر الاتصال بخوادم Grido. يرجى التحقق من اتصال الإنترنت"

// validatePasswordStrength يتحقق من سياسة كلمات المرور المتطابقة مع Supabase:
// 8 أحرف على الأقل، بحد أقصى 128 حرفاً، وتتضمن حروفاً وأرقاماً معاً (letters_digits).
func validatePasswordStrength(password string) error {
	if len(password) < 8 {
		return errors.New("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
	}
	if len(password) > 128 {
		return errors.New("كلمة المرور يجب أن لا تتجاوز 128 حرفاً")
	}
	var hasLetter, hasDigit bool
	for _, ch := range password {
		if unicode.IsLetter(ch) {
			hasLetter = true
		} else if unicode.IsDigit(ch) {
			hasDigit = true
		}
	}
	if !hasLetter || !hasDigit {
		return errors.New("كلمة المرور يجب أن تتضمن حروفاً وأرقاماً معاً")
	}
	return nil
}

// doSupabaseAuthJSON يرسل طلب JSON موحد إلى Supabase Auth ويقرأ الاستجابة بحد أقصى آمن.
func doSupabaseAuthJSON(method, path string, bodyPayload any, bearerToken string) (int, []byte, error) {
	raw, err := json.Marshal(bodyPayload)
	if err != nil {
		return 0, nil, err
	}
	req, err := http.NewRequest(method, SupabaseURL+path, bytes.NewBuffer(raw))
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")
	if bearerToken != "" {
		req.Header.Set("Authorization", "Bearer "+bearerToken)
	}

	resp, err := sharedClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
	return resp.StatusCode, respBody, nil
}

func resolveDisplayName(email string, authRes *SupabaseAuthResponse, fallback string) string {
	if n, ok := authRes.User.UserMeta["name"].(string); ok && n != "" {
		return n
	}
	if fallback != "" {
		return fallback
	}
	return email
}

func buildAuthenticatedProfile(
	userID, email, displayName string,
	authRes *SupabaseAuthResponse,
	prof *SupabaseProfile,
	includeTimestamps bool,
) *domain.UserProfile {
	profile := &domain.UserProfile{
		ID:           userID,
		Name:         displayName,
		Email:        email,
		Plan:         prof.Plan,
		Token:        authRes.AccessToken,
		RefreshToken: authRes.RefreshToken,
		ExpiresAt:    prof.ExpiresAt,
		LicenseKey:   prof.LicenseKey,
		Status:       prof.Status,
	}
	if includeTimestamps {
		now := time.Now()
		profile.CreatedAt = now
		profile.UpdatedAt = now
	}
	return profile
}

func (s *LicenseService) verifyOTPAcrossTypes(
	email, token string,
	verifyTypes []string,
	requireAccessToken bool,
	fallbackErrMsg string,
) (*SupabaseAuthResponse, error) {
	var lastErr error
	var authRes SupabaseAuthResponse

	for _, vType := range verifyTypes {
		status, body, err := doSupabaseAuthJSON("POST", "/auth/v1/verify", SupabaseVerifyRequest{
			Type:  vType,
			Email: email,
			Token: token,
		}, "")
		if err != nil {
			slog.Error("Network error verifying OTP", "error", err, "type", vType)
			return nil, errors.New(networkErrMessage)
		}

		if status == http.StatusOK {
			var parsed SupabaseAuthResponse
			if err := json.Unmarshal(body, &parsed); err == nil {
				valid := parsed.GetUserID() != ""
				if requireAccessToken {
					valid = parsed.AccessToken != ""
				}
				if valid {
					authRes = parsed
					return &authRes, nil
				}
			} else if requireAccessToken {
				slog.Error("Failed to decode auth response or missing access token", "error", err, "bytes", len(body))
			}
		}

		slog.Warn("Supabase verify attempt failed", "type", vType, "status", status, "bytes", len(body))
		if errMsg := parseSupabaseError(body); errMsg != "" {
			lastErr = errors.New(errMsg)
		} else {
			lastErr = errors.New(fallbackErrMsg)
		}
	}

	if lastErr == nil {
		lastErr = errors.New(fallbackErrMsg)
	}
	return nil, lastErr
}

func (s *LicenseService) Register(name, email, password string) (*domain.UserProfile, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	name = strings.TrimSpace(name)
	if email == "" || password == "" {
		return nil, errors.New("البريد الإلكتروني وكلمة المرور مطلوبة")
	}
	if err := validatePasswordStrength(password); err != nil {
		return nil, err
	}
	generation := s.beginSessionTransition()

	status, body, err := doSupabaseAuthJSON("POST", "/auth/v1/signup", SupabaseAuthRequest{
		Email:    email,
		Password: password,
		Data:     map[string]interface{}{"name": name},
	}, "")
	if err != nil {
		slog.Error("Network error during registration", "error", err)
		return nil, errors.New(networkErrMessage)
	}

	if status != http.StatusOK && status != http.StatusCreated {
		slog.Error("Supabase signup error", "status", status, "bytes", len(body))
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, fmt.Errorf("فشل التسجيل (رمز الخطأ: %d)", status)
	}

	var authRes SupabaseAuthResponse
	if err := json.Unmarshal(body, &authRes); err != nil {
		return nil, err
	}

	userID := authRes.GetUserID()
	if userID == "" || authRes.AccessToken == "" {
		return &domain.UserProfile{Email: email, Status: "pending_otp"}, nil
	}

	prof, err := s.fetchProfileWithRetry(authRes.AccessToken, userID, 3)
	if err != nil {
		// جلسة صالحة لكن فشل جلب الملف الشخصي (شبكة) — نُبقي الجلسة بوضع معلّق.
		slog.Warn("Registration succeeded but profile fetch failed — keeping session", "error", err)
		pending := buildAuthenticatedProfile(userID, email, "", &authRes, &SupabaseProfile{
			Plan:   "free",
			Status: "pending",
		}, true)
		if err := s.commitAuthenticatedSession(generation, pending); err != nil {
			return nil, err
		}
		return pending, nil
	}

	user := buildAuthenticatedProfile(
		userID,
		email,
		resolveDisplayName(email, &authRes, name),
		&authRes,
		prof,
		true,
	)
	if err := s.commitAuthenticatedSession(generation, user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *LicenseService) ResendOTP(email string) (*domain.UserProfile, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return nil, errors.New("البريد الإلكتروني مطلوب لإعادة الإرسال")
	}

	status, body, err := doSupabaseAuthJSON("POST", "/auth/v1/resend", map[string]string{
		"type":  "signup",
		"email": email,
	}, "")
	if err != nil {
		slog.Error("Network error during OTP resend", "error", err)
		return nil, errors.New(networkErrMessage)
	}
	if status != http.StatusOK {
		slog.Error("Supabase resend OTP error", "status", status, "bytes", len(body))
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, errors.New("فشل إعادة إرسال كود التحقق. يرجى المحاولة لاحقاً")
	}

	return &domain.UserProfile{Email: email, Status: "pending_otp"}, nil
}

func extractTokenFromURL(token string) string {
	for _, param := range []string{"token=", "token_hash="} {
		if !strings.Contains(token, param) {
			continue
		}
		parts := strings.SplitN(token, param, 2)
		if len(parts) == 2 {
			val := parts[1]
			if idx := strings.IndexAny(val, "&/#?"); idx != -1 {
				val = val[:idx]
			}
			return strings.TrimSpace(val)
		}
	}
	return token
}

func (s *LicenseService) VerifyOTP(email, token string) (*domain.UserProfile, error) {
	email = strings.TrimSpace(strings.ToLower(email))
	token = strings.TrimSpace(token)
	if email == "" || token == "" {
		return nil, errors.New("البريد الإلكتروني ورمز التحقق مطلوبان")
	}
	generation := s.beginSessionTransition()
	token = extractTokenFromURL(token)

	authRes, err := s.verifyOTPAcrossTypes(
		email,
		token,
		[]string{"signup", "email", "magiclink"},
		false,
		"رمز التحقق غير صحيح أو منتهي الصلاحية",
	)
	if err != nil {
		return nil, err
	}

	userID := authRes.GetUserID()
	if userID == "" {
		return nil, errors.New("رمز التحقق غير مكتمل")
	}

	prof, err := s.fetchProfileWithRetry(authRes.AccessToken, userID, 3)
	if err != nil {
		return nil, errors.New("فشل جلب بيانات الحساب الشخصي")
	}

	user := buildAuthenticatedProfile(
		userID,
		email,
		resolveDisplayName(email, authRes, ""),
		authRes,
		prof,
		true,
	)
	if err := s.commitAuthenticatedSession(generation, user); err != nil {
		return nil, err
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
	generation := s.beginSessionTransition()

	status, body, err := doSupabaseAuthJSON("POST", "/auth/v1/token?grant_type=password", SupabaseAuthRequest{
		Email:    email,
		Password: password,
	}, "")
	if err != nil {
		slog.Error("Network error during login", "error", err)
		return nil, errors.New(networkErrMessage)
	}

	if status != http.StatusOK {
		slog.Error("Supabase login error", "status", status, "bytes", len(body))
		if errMsg := parseSupabaseError(body); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, errors.New("البريد الإلكتروني أو كلمة المرور غير صحيحة")
	}

	var authRes SupabaseAuthResponse
	if err := json.Unmarshal(body, &authRes); err != nil {
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

	user := buildAuthenticatedProfile(
		userID,
		email,
		resolveDisplayName(email, &authRes, ""),
		&authRes,
		prof,
		true,
	)
	if err := s.commitAuthenticatedSession(generation, user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *LicenseService) ResetPassword(email string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return errors.New("البريد الإلكتروني مطلوب")
	}

	status, body, err := doSupabaseAuthJSON("POST", "/auth/v1/recover", map[string]string{"email": email}, "")
	if err != nil {
		return errors.New(networkErrMessage)
	}
	if status != http.StatusOK {
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
	if err := validatePasswordStrength(newPassword); err != nil {
		return nil, err
	}
	generation := s.beginSessionTransition()

	authRes, err := s.verifyOTPAcrossTypes(
		email,
		token,
		[]string{"recovery", "magiclink", "signup", "email"},
		true,
		"كود الاستعادة غير صحيح أو منتهي الصلاحية",
	)
	if err != nil {
		slog.Error("All OTP verify types failed", "lastErr", err)
		return nil, err
	}

	updateStatus, updateBody, err := doSupabaseAuthJSON(
		"PUT",
		"/auth/v1/user",
		map[string]string{"password": newPassword},
		authRes.AccessToken,
	)
	if err != nil {
		slog.Error("Network error updating password", "error", err)
		return nil, errors.New("فشل تحديث كلمة المرور الجديدة")
	}
	if updateStatus != http.StatusOK {
		slog.Error("Supabase update password failed", "status", updateStatus, "bytes", len(updateBody))
		if errMsg := parseSupabaseError(updateBody); errMsg != "" {
			return nil, errors.New(errMsg)
		}
		return nil, errors.New("تعذر تغيير كلمة المرور")
	}

	userID := authRes.GetUserID()
	prof, err := s.fetchProfileWithRetry(authRes.AccessToken, userID, 3)
	if err != nil {
		// 🛡️ لا نمنح خطة trial افتراضية بدون تأكيد خادمي — جلسة معلّقة حتى اكتمال جلب الملف الشخصي
		slog.Warn("Profile fetch failed after password reset — keeping session pending", "error", err)
		prof = &SupabaseProfile{Plan: "free", Status: "pending"}
	}

	profile := buildAuthenticatedProfile(
		userID,
		email,
		resolveDisplayName(email, authRes, ""),
		authRes,
		prof,
		false,
	)
	if err := s.commitAuthenticatedSession(generation, profile); err != nil {
		return nil, err
	}
	return profile, nil
}
