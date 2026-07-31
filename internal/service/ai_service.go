package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)


type AIRateEntry struct {
	count    int
	resetDay string
}

type AIRateLimiter struct {
	mu    sync.Mutex
	usage map[string]*AIRateEntry
}

var GlobalAIRateLimiter = &AIRateLimiter{
	usage: make(map[string]*AIRateEntry),
}

func (l *AIRateLimiter) Reserve(key string, limit int) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	entry, exists := l.usage[key]
	if !exists || entry.resetDay != today {
		entry = &AIRateEntry{count: 0, resetDay: today}
		l.usage[key] = entry
	}

	if entry.count >= limit {
		return fmt.Errorf("تم تجاوز الحد اليومي لاستخدام الذكاء الاصطناعي (%d صورة/يومياً). يتجدد الرصيد غداً", limit)
	}

	entry.count++
	return nil
}

func (l *AIRateLimiter) Rollback(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	entry, exists := l.usage[key]
	if exists && entry.resetDay == today && entry.count > 0 {
		entry.count--
	}
}
type AIService struct{}

func NewAIService() *AIService {
	return &AIService{}
}

const (
	maxAIResponseSize = 50 * 1024 * 1024 // 50MB max AI response
	defaultModalAIURL = "https://wisamsamir78--grido-ai-upscaler-imageenhancer-enhance.modal.run"

	// الحدود اليومية حسب الخطة — يجب أن تطابق CASE داخل RPC check_and_record_ai_usage في Supabase.
	// العميل لا يملك حق فرض الحد؛ هذه القيم تُشتق من قاعدة البيانات عبر JWT.
	planLimitFree       = 5
	planLimitPro        = 15
	planLimitEnterprise = 50
)

// planDailyLimit يحوّل اسم الخطة إلى حدها اليومي المعتمد خادمياً
func planDailyLimit(plan string) int {
	switch plan {
	case "enterprise":
		return planLimitEnterprise
	case "pro":
		return planLimitPro
	default:
		return planLimitFree
	}
}

type planCacheEntry struct {
	limit   int
	expires time.Time
}

var (
	planCacheMu sync.Mutex
	planCache   = make(map[string]planCacheEntry)
	planCacheTTL = 5 * time.Minute
)

// resolveDailyLimitForToken يشتق الحد اليومي من خطة المستخدم في Supabase باستخدام JWT نفسه.
// لا نثق إطلاقاً بأي حد يرسله العميل — أي فشل في الاشتقاق يعيد حد الخطة المجانية (الأكثر أمناً).
func resolveDailyLimitForToken(tokenHash string, token string) int {
	planCacheMu.Lock()
	if entry, ok := planCache[tokenHash]; ok && time.Now().Before(entry.expires) {
		limit := entry.limit
		planCacheMu.Unlock()
		return limit
	}
	planCacheMu.Unlock()

	limit := planLimitFree
	if SupabaseURL != "" && SupabaseAnonKey != "" && token != "" {
		if plan, err := fetchUserPlan(token); err == nil {
			limit = planDailyLimit(plan)
		}
	}

	planCacheMu.Lock()
	planCache[tokenHash] = planCacheEntry{limit: limit, expires: time.Now().Add(planCacheTTL)}
	planCacheMu.Unlock()
	return limit
}

// fetchUserPlan يجلب خطة المستخدم من جدول profiles عبر Supabase REST باستخدام JWT المستخدم
func fetchUserPlan(token string) (string, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	userReq, err := http.NewRequest("GET", SupabaseURL+"/auth/v1/user", nil)
	if err != nil {
		return "", err
	}
	userReq.Header.Set("apikey", SupabaseAnonKey)
	userReq.Header.Set("Authorization", "Bearer "+token)

	userResp, err := client.Do(userReq)
	if err != nil {
		return "", err
	}
	defer userResp.Body.Close()
	if userResp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("user token rejected: %s", userResp.Status)
	}

	var userData struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(io.LimitReader(userResp.Body, 256*1024)).Decode(&userData); err != nil || userData.ID == "" {
		return "", fmt.Errorf("invalid user payload")
	}

	profileReq, err := http.NewRequest("GET", SupabaseURL+"/rest/v1/profiles?select=plan&id=eq."+userData.ID, nil)
	if err != nil {
		return "", err
	}
	profileReq.Header.Set("apikey", SupabaseAnonKey)
	profileReq.Header.Set("Authorization", "Bearer "+token)

	profileResp, err := client.Do(profileReq)
	if err != nil {
		return "", err
	}
	defer profileResp.Body.Close()
	if profileResp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("profiles lookup failed: %s", profileResp.Status)
	}

	var profiles []struct {
		Plan string `json:"plan"`
	}
	if err := json.NewDecoder(io.LimitReader(profileResp.Body, 256*1024)).Decode(&profiles); err != nil {
		return "", err
	}
	if len(profiles) == 0 {
		return "", fmt.Errorf("profile not found")
	}
	return profiles[0].Plan, nil
}

func (s *AIService) EnhanceImageWithAI(base64Image string, token string, limit int) (string, error) {
	// 🛡️ تسجيل الدخول إلزامي — خادم Modal يرفق الطلبات بدون Bearer JWT صالح
	if token == "" {
		return "", fmt.Errorf("تسجيل الدخول مطلوب لاستخدام ميزة التحسين بالذكاء الاصطناعي")
	}

	tokenHash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))[:16]

	// 🛡️ الحد اليومي يُشتق من خطة المستخدم في قاعدة البيانات، وليس من القيمة المرسلة من العميل.
	// (المعامل limit المُستقبَل يُتجاهل عمداً — يبقى في التوقيع حفاظاً على توافقية الـ bindings).
	serverLimit := resolveDailyLimitForToken(tokenHash, token)

	if err := GlobalAIRateLimiter.Reserve(tokenHash, serverLimit); err != nil {
		return "", err
	}

	// Flag to track if the request succeeded. If not, we rollback the usage.
	success := false
	defer func() {
		if !success {
			GlobalAIRateLimiter.Rollback(tokenHash)
		}
	}()

	modalURL := strings.TrimRight(ModalAIURL, "/")
	if modalURL == "" {
		modalURL = defaultModalAIURL
	}

	payload, err := json.Marshal(map[string]interface{}{
		"image":      base64Image,
		"dailyLimit": serverLimit, // يُرسل للتوافقية فقط — RPC يشتق الحد من الخطة خادمياً أيضاً
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", modalURL, bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("User-Agent", "GridoStudio-Desktop/1.2.14")

	client := &http.Client{Timeout: 3 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("خطأ في الاتصال بخادم الذكاء الاصطناعي: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxAIResponseSize))
	if err != nil {
		return "", fmt.Errorf("فشل قراءة الرد من الخادم: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errRes struct {
			Error string `json:"error"`
		}
		if err := json.Unmarshal(body, &errRes); err == nil && errRes.Error != "" {
			return "", errors.New(errRes.Error)
		}
		return "", fmt.Errorf("فشل خادم الذكاء الاصطناعي: %d", resp.StatusCode)
	}

	success = true
	return string(body), nil
}
