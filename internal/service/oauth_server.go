package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync/atomic"
	"time"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

// ─────────────────────────────────────────────────────────────────────────────
// oauth_server.go — خادم المصادقة المحلي (loopback) لدخول Google OAuth
//
// يفتح مستمعاً على منفذ عشوائي لكل محاولة دخول، يقدّم صفحة رد مضمّنة
// تتبادل الرمز عبر /exchange مع تحقق صارم من state و Origin.
// ─────────────────────────────────────────────────────────────────────────────

const oauthCallbackHTMLTemplate = `
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
        const searchParams = new URLSearchParams(window.location.search);
        const errorDesc = searchParams.get('error_description') || searchParams.get('error');

        const setMsg = (text) => {
            document.getElementById("msg").innerText = text;
        };

        if (hash) {
            // نزيل أي state قادم من GoTrue في الـ fragment (الإصدارات القديمة ترفقه)
            // قبل إلحاق state جلستنا — يمنع مفتاحين متكررين يفسد تحقق /exchange
            const body = hash.substring(1).replace(/(^|&)state=[^&]*/i, '$1') + '&state=' + encodeURIComponent('EXPECTED_STATE');

            // مهلة + إعادة محاولة: لا نترك المستخدم ينتظر صامتاً إن تعطل /exchange
            let attempt = 0;
            const tryExchange = () => {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 10000);
                fetch('/exchange', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: body,
                    signal: controller.signal
                }).then(r => {
                    clearTimeout(timer);
                    if (r.ok) {
                        setMsg('تم تسجيل الدخول بنجاح! يمكنك العودة إلى تطبيق Grido Studio.');
                        setTimeout(() => window.close(), 3000);
                    } else {
                        r.text().then(t => setMsg('فشلت عملية المصادقة: ' + (t || r.status)));
                    }
                }).catch(e => {
                    clearTimeout(timer);
                    if (attempt < 2) {
                        attempt++;
                        setTimeout(tryExchange, 1000);
                    } else {
                        setMsg('تعذر الاتصال بالتطبيق المحلي (' + e.name + '). أعد المحاولة من التطبيق.');
                    }
                });
            };
            tryExchange();
        } else if (errorDesc) {
            setMsg('فشلت عملية المصادقة: ' + decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        } else {
            setMsg('الرابط غير صحيح أو منتهي الصلاحية.');
        }
    </script>
</body>
</html>
`

// oauthCallbackHTML يبني صفحة رد المصادقة مع تضمين state الفريد لهذه الجلسة
func oauthCallbackHTML(state string) string {
	return strings.ReplaceAll(oauthCallbackHTMLTemplate, "EXPECTED_STATE", state)
}

// oauthState يولد قيمة state عشوائية لكل محاولة دخول (32 بايت hex)
func oauthState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// startOAuthLocalServer يفتح مستمعاً على منفذ عشوائي ويعرّف مسارَي /callback و /exchange
// ويعيد عنوان الرد، وقناتَي الرمز/الخطأ، ودالة إغلاق، وقيمة state للجلسة
func startOAuthLocalServer() (string, chan string, chan error, func(), string, error) {
	state, err := oauthState()
	if err != nil {
		return "", nil, nil, nil, "", fmt.Errorf("failed to generate OAuth state: %w", err)
	}

	tokenChan := make(chan string, 1)
	errChan := make(chan error, 1)
	var exchanged atomic.Bool

	// 🛡️ منفذ عشوائي ديناميكي — يمنع أي عملية محلية من احتلال المنفذ المتوقع مسبقاً
	// وحصد الرموز أثناء محاولة تسجيل الدخول
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", nil, nil, nil, "", fmt.Errorf("تعذر فتح خادم الاستقبال المحلي: %w", err)
	}
	localPort := listener.Addr().(*net.TCPAddr).Port
	callbackURL := fmt.Sprintf("http://127.0.0.1:%d/callback", localPort)

	mux := http.NewServeMux()

	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		slog.Info("OAuth callback page served", "port", localPort)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, oauthCallbackHTML(state))
	})

	mux.HandleFunc("/exchange", func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// 🔒 السماح بنطاقات المصادقة المعتمدة فقط — رفض الطلبات بدون Origin
		// (curl/عمليات محلية خبيثة) والطلبات من نطاقات غير معتمدة.
		// صفحة الرد تُقدَّم من نفس الخادم: Origin الفعلي هو منفذ المستمع العشوائي
		allowedOrigins := map[string]bool{
			fmt.Sprintf("http://127.0.0.1:%d", localPort): true,
			fmt.Sprintf("http://localhost:%d", localPort): true,
			"http://127.0.0.1:34567":                      true,
			"http://localhost:34567":                      true,
			"https://grido.cloud-ip.cc":                   true,
			"null":                                        true,
		}

		if origin == "" || !allowedOrigins[origin] {
			slog.Warn("Blocked OAuth exchange from missing/untrusted origin", "origin", origin)
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
			slog.Warn("OAuth exchange rejected: wrong method", "method", r.Method)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		bodyBytes, err := io.ReadAll(io.LimitReader(r.Body, maxResponseSize))
		if err != nil {
			slog.Warn("OAuth exchange rejected: body read error", "err", err)
			http.Error(w, "Read error", http.StatusBadRequest)
			return
		}

		// 🛡️ تحقق صارم من state الخاص بهذه الجلسة — يمنع حقن رموز من عمليات خارجية
		values, parseErr := url.ParseQuery(string(bodyBytes))
		if parseErr != nil || values.Get("state") != state {
			slog.Warn("Blocked OAuth exchange with invalid state", "origin", origin)
			http.Error(w, "Invalid state", http.StatusForbidden)
			return
		}

		// 🛡️ تتبع القبول لمرة واحدة فقط — يمنع طلبات التبادل المكررة حتى لو استُهلكت القناة
		if !exchanged.CompareAndSwap(false, true) {
			slog.Warn("OAuth exchange attempted twice", "port", localPort)
			http.Error(w, "Already exchanged", http.StatusConflict)
			return
		}

		select {
		case tokenChan <- string(bodyBytes):
			slog.Info("OAuth token exchanged successfully", "port", localPort)
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusOK)
		}
	})

	// 🛡️ مهلات الخادم المحلي لمنع بطء/تعليق الاتصالات
	srv := &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
	}

	go func() {
		if err := srv.Serve(listener); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	return callbackURL, tokenChan, errChan, func() {
		_ = srv.Shutdown(context.Background())
		_ = listener.Close()
	}, state, nil
}

func (s *LicenseService) LoginWithGoogle() (*domain.UserProfile, error) {
	if SupabaseURL == "" {
		return nil, errors.New("بيئة التطوير تفتقد لروابط قاعدة البيانات (SUPABASE_URL). يرجى إعداد ملف .env للمصادقة")
	}

	callbackURL, tokenChan, errChan, shutdown, _, err := startOAuthLocalServer()
	if err != nil {
		return nil, err
	}
	defer shutdown()

	// ⚠️ لا نمرر state إلى Supabase إطلاقاً: GoTrue يمرر كل المعاملات الإضافية
	// إلى موفّر OAuth (Google) كمعامل state، فيعيدها Google إلى /callback،
	// ويحاول GoTrue قراءتها كـ flow_state UUID من قاعدة البيانات → يفشل بـ
	// "OAuth state not found or expired". الحماية تبقى محلية بالكامل:
	// منفذ عشوائي لكل محاولة + state مضمّن في صفحة الرد ويتحقق منه /exchange.
	authURL := fmt.Sprintf("%s/auth/v1/authorize?provider=google&redirect_to=%s", SupabaseURL, url.QueryEscape(callbackURL))
	_ = utils.OpenBrowser(authURL)

	// 🔒 تحسين timeout handling مع إغلاق صحيح للـ server
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	var oauthBody string
	select {
	case oauthBody = <-tokenChan:
		// نجح
	case err := <-errChan:
		return nil, fmt.Errorf("خطأ في الخادم المحلي: %w", err)
	case <-ctx.Done():
		return nil, errors.New("انتهى وقت تسجيل الدخول (2 دقيقة). يرجى المحاولة مرة أخرى")
	}

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
