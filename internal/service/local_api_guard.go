package service

import (
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"grido/internal/utils"
)

// ─────────────────────────────────────────────────────────────────────────────
// local_api_guard.go — حارس مسارات /api المحلية
//
// مسارات /api/* تُنفّذ كتابة ملفات داخل مجلدات التطبيق (Media/Exports) وقد
// تُظهر حوارات نظام، أي أنها تعمل بامتيازات التطبيق لا بامتيازات صفحة ويب.
// الحماية طبقتان:
//
//  1. فحص الأصل: يُرفض أي طلب يحمل Origin لا يطابق مضيف الخادم. هذا يحجب
//     المتصفحات عملياً — لا صفحة ويب تستطيع إرسال Origin مطابق لمضيفنا.
//  2. توكن الجلسة: ترويسة `X-Grido-Session` بقيمة عشوائية لكل تشغيل، تُسلَّم
//     للواجهة عبر ربط Wails وحده (IPC داخل العملية). هذا يحجب ما لا يحجبه فحص
//     الأصل: أي **عملية محلية** تستطيع إرسال طلب HTTP مباشراً بامتيازات التطبيق.
//
// السياسة فشل مغلق: توكن فارغ (فشل توليد/تهيئة) ⇒ رفض كل الطلبات.
// ─────────────────────────────────────────────────────────────────────────────

// LocalApiSessionHeader الترويسة التي تحمل توكن جلسة مسارات /api المحلية.
const LocalApiSessionHeader = "X-Grido-Session"

// LocalApiGuard حارس يُنشأ مرة واحدة عند إقلاع التطبيق بتوكن العملية.
type LocalApiGuard struct {
	token string
}

// NewLocalApiGuard ينشئ الحارس بالتوكن الساري لهذه العملية (فارغ ⇒ رفض دائم).
func NewLocalApiGuard(token string) *LocalApiGuard {
	return &LocalApiGuard{token: token}
}

// Authorize يتحقق من الطلب ويكتب الرد المناسب عند الرفض.
// @returns true إن كان الطلب مصرّحاً به (ويجب متابعة معالجته).
func (g *LocalApiGuard) Authorize(w http.ResponseWriter, r *http.Request) bool {
	if origin := strings.TrimSpace(r.Header.Get("Origin")); origin != "" {
		parsedOrigin, parseErr := url.Parse(origin)
		if parseErr != nil || !strings.EqualFold(parsedOrigin.Host, r.Host) {
			slog.Warn("Blocked cross-origin API request", "path", r.URL.Path, "origin", origin)
			http.Error(w, "Forbidden: cross-origin API access", http.StatusForbidden)
			return false
		}
	}

	if !utils.SecureTokenEqual(r.Header.Get(LocalApiSessionHeader), g.token) {
		slog.Warn("Blocked local API request without a valid session token", "path", r.URL.Path)
		http.Error(w, "Forbidden: missing or invalid local API session token", http.StatusForbidden)
		return false
	}

	return true
}
