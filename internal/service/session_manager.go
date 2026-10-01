// ─────────────────────────────────────────────────────────────────────────────
// session_manager.go — إدارة الجلسة الواحدة النشطة (Single Active Session)
//
// القاعدة: آخر دخول ناجح يفوز (Last-Wins)، بلا أي ربط بالعتاد.
//   - claimSession: يولّد session_id عشوائياً (128-bit) ويحجزه خادمياً عبر
//     RPC `claim_session`، ثم يحفظه مشفّراً بجانب التوكنات.
//   - verifyActiveSession: يتحقق أن الجلسة المحلية هي النشطة عبر RPC
//     `check_session`. يُستدعى فقط بعد تحقق شبكي ناجح — الأوفلاين لا يطرد أبداً.
//   - رسالة الطرد الصريحة: ErrSessionSuperseded.
// ─────────────────────────────────────────────────────────────────────────────
package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"grido/internal/utils"
)

// ErrSessionSuperseded يُرجع عندما تثبت الشبكة أن جلسة أحدث حُجزت على الحساب
// من جهاز آخر — الواجهة تعرضه كرسالة طرد صريحة مع زر دخول من جديد.
var ErrSessionSuperseded = errors.New("تم تسجيل الدخول إلى حسابك من جهاز آخر — هذه الجلسة لم تعد نشطة")

// sessionCheckResult نتيجة فحص check_session.
type sessionCheckResult struct {
	Success    bool `json:"success"`
	Active     bool `json:"active"`
	Superseded bool `json:"superseded"`
}

// newSessionID يولّد معرّف جلسة عشوائي 128-bit (بلا أي بصمة عتاد).
func newSessionID() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return hex.EncodeToString(b[:]), nil
}

// callSessionRPC يستدعي claim_session/check_session بالـ JWT —
// GET/POST قابل لإعادة المحاولة على أخطاء النقل فقط (RetryOnStatus=false:
// الخادم قد يكون نفّذ الحجز فعلاً ثم فشل الرد، وإعادة POST آمنة هنا لأن
// claim idempotent على نفس session_id).
func (s *LicenseService) callSessionRPC(token, rpc string, payload any) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", SupabaseURL+"/rest/v1/rpc/"+rpc, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := httpDoWithRetry(context.Background(), sharedClient, req, RetryPolicy{
		MaxAttempts:   3,
		BaseDelay:     500 * time.Millisecond,
		RetryOnStatus: false,
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, maxResponseSize))
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("session rpc %s status: %d", rpc, resp.StatusCode)
	}
	return respBody, nil
}

// claimSession يحجز جلسة جديدة لهذا الجهاز — يُستدعى بعد كل دخول ناجح.
//
// 🛡️ لا يُحفظ المعرّف محلياً إلا بعد تأكيد الحجز خادمياً: حفظه بلا صف خادمي
// يخلق نافذة «طرد كاذب» (الفحص يقارن معرّفاً غير محجوز بصف جلسة أقدم فيظن
// المستخدم مطروحاً). عند فشل الشبكة/الهجرة غير المطبَّقة يعود "" ويُعاد
// الحجز في أول CheckStatus ناجح (ensureSessionClaimed)، والفحص بلا معرّف
// محلي لا يطرد أبداً.
func (s *LicenseService) claimSession(token string) string {
	sid, err := newSessionID()
	if err != nil {
		slog.Error("Failed to generate session id", "error", err)
		return ""
	}
	if _, err := s.callSessionRPC(token, "claim_session", map[string]string{"p_session_id": sid}); err != nil {
		slog.Warn("claim_session failed — session will be claimed on next successful check", "error", err)
		return ""
	}
	if err := utils.SaveSessionID(sid); err != nil {
		slog.Warn("Failed to persist session id", "error", err)
		return ""
	}
	return sid
}

// ensureSessionClaimed يحجز الجلسة المحلية إن لم تُحجز بعد (حسابات ما قبل الميزة
// أو دخول تم أثناء انقطاع) — يُستدعى من CheckStatus بعد تحقق شبكي ناجح.
func (s *LicenseService) ensureSessionClaimed(token string) string {
	if sid := utils.LoadSessionID(); sid != "" {
		return sid
	}
	return s.claimSession(token)
}

// verifyActiveSession يتحقق شبكياً أن الجلسة المحلية هي النشطة.
// ترجع (true, nil) للنشطة، (false, ErrSessionSuperseded) للمطرودة،
// (true, err شبكي) عند تعذر التحقق — والأخيرة تعني: لا طرد (offline grace).
func (s *LicenseService) verifyActiveSession(token string) (bool, error) {
	sid := utils.LoadSessionID()
	if sid == "" {
		return true, nil // بلا جلسة محلية — تُحجز في ensureSessionClaimed
	}
	respBody, err := s.callSessionRPC(token, "check_session", map[string]string{"p_session_id": sid})
	if err != nil {
		return true, err // شبكة — لا طرد
	}
	var res sessionCheckResult
	if err := json.Unmarshal(respBody, &res); err != nil {
		slog.Warn("check_session decode failed — not evicting", "error", err)
		return true, err
	}
	if res.Superseded || !res.Active {
		return false, ErrSessionSuperseded
	}
	return true, nil
}
