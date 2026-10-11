package utils

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"fmt"
	"strings"
)

// ─────────────────────────────────────────────────────────────────────────────
// securetoken.go — أوليات آمنة لتوكنات الجلسات (توليد ومقارنة)
//
// تُستخدم لحماية أطراف داخلية تُسلَّم لعملية واحدة فقط (مثل توكن جلسة مسارات
// /api المحلية الذي يُسلَّم للواجهة عبر ربط Wails). تُركت هنا كأوليات نقية بلا
// أي اعتماد على النطاق أو الخدمات، فيمكن اختبارها وتغطيتها في اختبارات utils
// (المشمولة ببوابة CI: go test ./internal/...).
// ─────────────────────────────────────────────────────────────────────────────

// GenerateSecureToken يولّد توكن عشوائياً بطول nBytes بايت من مولّد أرقام
// عشوائية تشفيري، ويعيده كسلسلة سادس عشرية (2nBytes حرفاً).
// يُرفض الطلب غير الإيجابي صراحةً بدل إنتاج توكن ضعيف صامت.
func GenerateSecureToken(nBytes int) (string, error) {
	if nBytes <= 0 {
		return "", fmt.Errorf("secure token length must be positive, got %d", nBytes)
	}
	buf := make([]byte, nBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}
	return hex.EncodeToString(buf), nil
}

// SecureTokenEqual يقارن توكن مُقدَّم (من الطلب) بتوكن متوقع بمقارنة زمن ثابت،
// فلا يسمح بتخمين التوكن بايتاً بايتاً بقياس زمن الرد.
//
// السياسة: توكن متوقع فارغ يعني **رفض دائماً** ولا يعني «لا حماية مطلوبة» —
// فشل مغلق متعمد كي لا يتحوّل خطأ تهيئة إلى باب مفتوح. المسافات الزائدة في
// الطلب تُشذَّب (تفاوت شائع في الترويسات)، والقيمة الفارغة تُرفض قبل المقارنة.
func SecureTokenEqual(provided, expected string) bool {
	if expected == "" {
		return false
	}
	provided = strings.TrimSpace(provided)
	if provided == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) == 1
}
