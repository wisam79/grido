package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"grido/internal/utils"
)

// TestClaimAndCheckSession_LastWins يثبت عقد الجلسة الواحدة:
// دخول ثانٍ بنفس الحساب يجعل جلسة الأول مطرودة، والجديدة نشطة.
func TestClaimAndCheckSession_LastWins(t *testing.T) {
	var active string
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]string
		_ = json.NewDecoder(r.Body).Decode(&payload)
		switch {
		case strings.HasSuffix(r.URL.Path, "claim_session"):
			active = payload["p_session_id"]
			_, _ = w.Write([]byte(`{"success":true}`))
		case strings.HasSuffix(r.URL.Path, "check_session"):
			superseded := payload["p_session_id"] != active
			_ = json.NewEncoder(w).Encode(map[string]any{
				"success": true, "active": !superseded, "superseded": superseded,
			})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()

	oldBase, oldKey := SupabaseURL, SupabaseAnonKey
	SupabaseURL, SupabaseAnonKey = ts.URL, "test-anon"
	defer func() { SupabaseURL, SupabaseAnonKey = oldBase, oldKey }()

	svc := &LicenseService{}
	tok := "jwt-test"

	// الجهاز الأول يحجز
	first := svc.claimSession(tok)
	if first == "" {
		t.Fatal("claimSession returned empty session id")
	}
	if ok, err := svc.verifyActiveSession(tok); !ok || err != nil {
		t.Fatalf("first session should be active: ok=%v err=%v", ok, err)
	}

	// جهاز ثانٍ بنفس الحساب يحجز — الأول يُطرد والثاني ينشط
	// (نحاكي جهازاً آخر بتجاوز المخزن المحلي المشترك مؤقتاً عبر claim مباشر)
	second, err := newSessionID()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.callSessionRPC(tok, "claim_session", map[string]string{"p_session_id": second}); err != nil {
		t.Fatalf("second claim failed: %v", err)
	}

	// المخزن المحلي ما زال يحمل الأول ⇒ مطرود برسالة الطرد الصريحة
	// (رمز ERR_SESSION_SUPERSEDED عقد ثابت يكشفه الواجه — license-slice.ts)
	if ok, err := svc.verifyActiveSession(tok); ok || err == nil || !strings.Contains(err.Error(), "ERR_SESSION_SUPERSEDED") {
		t.Fatalf("first session should be superseded: ok=%v err=%v", ok, err)
	}
}

// TestClaimSession_FailedClaimLeavesNoLocalID يثبت منع «الطرد الكاذب»:
// حجز فاشل (شبكة/هجرة غير مطبَّقة) لا يترك معرّفاً محلياً، والفحص بلا معرّف
// لا يطرد أبداً — فيبقى المستخدم داخل التطبيق بانتظار أول حجز ناجح.
func TestClaimSession_FailedClaimLeavesNoLocalID(t *testing.T) {
	oldBase, oldKey := SupabaseURL, SupabaseAnonKey
	SupabaseURL, SupabaseAnonKey = "http://127.0.0.1:1", "test-anon" // منفذ مغلق
	defer func() { SupabaseURL, SupabaseAnonKey = oldBase, oldKey }()

	// حالة نظيفة: معرّف الجلسة المحلي مشترك على القرص بين الاختبارات
	previous := utils.LoadSessionID()
	if err := utils.ClearSessionID(); err != nil {
		t.Fatalf("failed to clear local session: %v", err)
	}
	defer func() { _ = utils.SaveSessionID(previous) }()

	svc := &LicenseService{}
	if sid := svc.claimSession("jwt-test"); sid != "" {
		t.Fatalf("failed claim must not return a session id, got %q", sid)
	}
	if got := utils.LoadSessionID(); got != "" {
		t.Fatalf("failed claim must not persist a local session id, got %q", got)
	}
	// بلا معرّف محلي: لا طرد إطلاقاً (السماح الأوفلايني محفوظ)
	if ok, _ := svc.verifyActiveSession("jwt-test"); !ok {
		t.Fatal("session without local id must never be evicted")
	}
}

// TestVerifyActiveSession_OfflineGrace يثبت أن تعذر الشبكة لا يطرد أبداً.
func TestVerifyActiveSession_OfflineGrace(t *testing.T) {
	oldBase := SupabaseURL
	SupabaseURL = "http://127.0.0.1:1" // منفذ مغلق حتماً — فشل شبكي فوري
	defer func() { SupabaseURL = oldBase }()

	svc := &LicenseService{}
	if ok, err := svc.verifyActiveSession("jwt-test"); !ok || err == nil {
		t.Fatalf("network failure must keep session (grace): ok=%v err=%v", ok, err)
	}
}
