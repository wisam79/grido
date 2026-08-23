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

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// auth_flows.go — تدفقات المصادقة عالية المستوى
//
// تسجيل حساب، إعادة إرسال OTP، التحقق من OTP، تسجيل الدخول بالبريد،
// وإعادة تعيين كلمة المرور مع رمز الاستعادة.
// ─────────────────────────────────────────────────────────────────────────────

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
		if err != nil {
			// جلسة صالحة لكن فشل جلب الملف الشخصي (شبكة) — لا نُسقط الجلسة الصالحة.
			// نعيد المستخدم بوضع معلّق ليُحدَّث لاحقاً بدل إجباره على إعادة تسجيل الدخول.
			slog.Warn("Registration succeeded but profile fetch failed — keeping session", "error", err)
			pending := &domain.UserProfile{
				ID:           userID,
				Email:        email,
				Plan:         "free",
				Token:        authRes.AccessToken,
				RefreshToken: authRes.RefreshToken,
				CreatedAt:    time.Now(),
				Status:       "pending",
				UpdatedAt:    time.Now(),
			}
			if saveErr := s.repo.Save(pending); saveErr != nil {
				slog.Warn("Failed to save pending session", "error", saveErr)
			}
			return pending, nil
		}
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

		slog.Debug("Supabase Verify OTP response", "type", vType, "status", resp.StatusCode)

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
		// 🛡️ لا نمنح خطة trial افتراضية بدون تأكيد خادمي — جلسة معلّقة حتى اكتمال جلب الملف الشخصي
		slog.Warn("Profile fetch failed after password reset — keeping session pending", "error", err)
		prof = &SupabaseProfile{Plan: "free", Status: "pending"}
	}

	displayName := email
	if n, ok := authRes.User.UserMeta["name"].(string); ok && n != "" {
		displayName = n
	}

	profile := &domain.UserProfile{
		ID:           userID,
		Email:        email,
		Name:         displayName,
		Plan:         prof.Plan,
		Status:       prof.Status,
		ExpiresAt:    prof.ExpiresAt,
		LicenseKey:   prof.LicenseKey,
		Token:        authRes.AccessToken,
		RefreshToken: authRes.RefreshToken,
	}

	if err := s.repo.Clear(); err != nil {
		slog.Warn("Failed to clear repo in VerifyRecoveryOTP", "error", err)
	}
	if err := s.repo.Save(profile); err != nil {
		slog.Error("Failed to persist user profile after password reset", "error", err)
	}

	return profile, nil
}
