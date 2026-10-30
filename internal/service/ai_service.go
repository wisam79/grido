package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/disintegration/imaging"

	"grido/internal/utils"
)

// عملاء HTTP مشتركة على مستوى الحزمة — كانت تُنشأ داخل كل نداء (اختراع عجلة
// بلا داعٍ: يؤدي إلى تسريب اتصالات keep-alive عند إغلاق العميل بعد كل طلب).
// مهلة كل عميل تبقى مطابقة للموضع الأصلي الذي كان ينشئه.
var (
	// aiSupabaseClient لفحوصات المستخدم/الخطة من Supabase (كان 10s)
	aiSupabaseClient = &http.Client{Timeout: 10 * time.Second}
	// aiUsageClient لفحص حصة الاستخدام اليومية (كان 15s)
	aiUsageClient = &http.Client{Timeout: 15 * time.Second}
	// aiEnhanceClient لتحسين الصور عبر خادم Modal — عملية ثقيلة (كان 3m)
	aiEnhanceClient = &http.Client{Timeout: 3 * time.Minute}
)

type AIRateEntry struct {
	Count    int    `json:"count"`
	ResetDay string `json:"resetDay"`
	// Baseline: آخر عدّاد خادمي موثوق (من Sync) — يمنع Rollback من النزول تحت
	// قيمة الخادم بعد فشل عملية، فيبقى المُقيِّد المحلي صورة صادقة عن الخادم.
	Baseline int `json:"baseline,omitempty"`
}

// aiLimiterClock قابل للاستبدال في الاختبارات لاختبار حدود اليوم (UTC).
var aiLimiterClock = time.Now

// aiUsageDayKey مفتاح اليوم الموحّد — **UTC** ليطابق تمامًا عدّاد المرجع الخادمي
// (`date_trunc('day', timezone('utc', now()))` في RPC الحصة). كان محلياً، فكان
// اليوم ينقلب محلياً في منتصف الليل وينقلب خادمياً في 03:00 بتوقيت UTC+3 ⇒ تعرض
// الواجهة رصيدًا متبقيًا والخدمة ترفض الطلب.
func aiUsageDayKey(t time.Time) string {
	return t.UTC().Format("2006-01-02")
}

type AIRateLimiter struct {
	mu       sync.Mutex
	usage    map[string]*AIRateEntry
	filePath string
	loaded   bool
}

var GlobalAIRateLimiter = &AIRateLimiter{
	usage: make(map[string]*AIRateEntry),
}

func (l *AIRateLimiter) getFilePathLocked() string {
	if l.filePath != "" {
		return l.filePath
	}
	return filepath.Join(utils.GetAppDir(), "ai_rate_limits.json")
}

func (l *AIRateLimiter) loadLocked() {
	if l.loaded {
		return
	}
	l.loaded = true
	p := l.getFilePathLocked()
	if p == ":memory:" {
		return
	}
	data, err := os.ReadFile(p)
	if err != nil {
		return
	}
	var stored map[string]*AIRateEntry
	if err := json.Unmarshal(data, &stored); err == nil && stored != nil {
		l.usage = stored
	}
}

func (l *AIRateLimiter) saveLocked() {
	p := l.getFilePathLocked()
	if p == ":memory:" {
		return
	}
	data, err := json.MarshalIndent(l.usage, "", "  ")
	if err != nil {
		return
	}
	// كتابة ذرية موحّدة — الخطأ تحذير فقط (لا يُفشل حجز الحصة)
	if err := utils.AtomicWriteFile(p, data, 0o644); err != nil {
		slog.Warn("Failed to persist ai rate limits", "error", err)
	}
}

func (l *AIRateLimiter) Reserve(key string, limit int) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.loadLocked()

	today := aiUsageDayKey(aiLimiterClock())
	entry, exists := l.usage[key]
	if !exists || entry.ResetDay != today {
		entry = &AIRateEntry{Count: 0, ResetDay: today}
		l.usage[key] = entry
	}

	if entry.Count >= limit {
		return fmt.Errorf("تم تجاوز الحد اليومي لاستخدام الذكاء الاصطناعي (%d صورة/يومياً). يتجدد الرصيد غداً", limit)
	}

	entry.Count++
	l.saveLocked()
	return nil
}

func (l *AIRateLimiter) Rollback(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.loadLocked()

	today := aiUsageDayKey(aiLimiterClock())
	entry, exists := l.usage[key]
	if exists && entry.ResetDay == today && entry.Count > entry.Baseline {
		entry.Count--
		l.saveLocked()
	}
}

// Sync يضبط المُقيِّد المحلي على العدّاد الخادمي الموثوق (يُستدعى بعد كل فحص
// ناجح من RPC الحصة) — فيصبح الخادم مصدر الحقيقة الوحيد، ولا ينحرف العرض المحلي
// عن العدّ الفعلي (ولا يبقى Rollback قادراً على النزول تحت قيمة الخادم).
func (l *AIRateLimiter) Sync(key string, usedToday int) {
	if usedToday < 0 {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	l.loadLocked()

	today := aiUsageDayKey(aiLimiterClock())
	entry, exists := l.usage[key]
	if !exists || entry.ResetDay != today {
		entry = &AIRateEntry{ResetDay: today}
		l.usage[key] = entry
	}

	entry.Count = usedToday
	entry.Baseline = usedToday
	l.saveLocked()
}

type AIService struct{}

func NewAIService() *AIService {
	return &AIService{}
}

const (
	aiEnhancementBudget = 180 * time.Second
	maxAIBase64Size     = 20 * 1024 * 1024
	maxAIInputSize      = 15 * 1024 * 1024
	maxAIRequestSize    = 30 * 1024 * 1024
	maxAIResponseSize   = 50 * 1024 * 1024
	maxAIInputSide      = 2048
	defaultModalAIURL   = "https://wisamsamir78--grido-ai-upscaler-imageenhancer-enhance.modal.run"

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

type userPlanCacheEntry struct {
	userID  string
	plan    string
	limit   int
	expires time.Time
}

var (
	userPlanCacheMu  sync.Mutex
	userPlanCache    = make(map[string]userPlanCacheEntry)
	userPlanCacheTTL = 5 * time.Minute
)

// resolveUserInfoForToken يشتق معرّف المستخدم والحد اليومي من خطة المستخدم في Supabase باستخدام JWT نفسه.
// يخزن معرّف المستخدم والخطة والحد معاً لمنع تكرار طلبات HTTP المزدوجة إلى Supabase Auth.
func resolveUserInfoForToken(ctx context.Context, tokenHash string, token string) (string, int, error) {
	if err := ctx.Err(); err != nil {
		return "", 0, err
	}
	userPlanCacheMu.Lock()
	if entry, ok := userPlanCache[tokenHash]; ok && time.Now().Before(entry.expires) {
		uid := entry.userID
		lim := entry.limit
		userPlanCacheMu.Unlock()
		return uid, lim, nil
	}
	userPlanCacheMu.Unlock()

	userID := ""
	plan := "free"
	limit := planLimitFree
	if SupabaseURL != "" && SupabaseAnonKey != "" && token != "" {
		if fetchedID, fetchedPlan, err := fetchSupabaseUserInfo(ctx, token); err == nil {
			userID = fetchedID
			plan = fetchedPlan
			limit = planDailyLimit(plan)
		} else if ctx.Err() != nil || os.IsTimeout(err) {
			return "", 0, err
		}
	}
	if err := ctx.Err(); err != nil {
		return "", 0, err
	}

	userPlanCacheMu.Lock()
	userPlanCache[tokenHash] = userPlanCacheEntry{
		userID:  userID,
		plan:    plan,
		limit:   limit,
		expires: time.Now().Add(userPlanCacheTTL),
	}
	userPlanCacheMu.Unlock()
	return userID, limit, nil
}

// fetchSupabaseUserInfo يجلب معرّف المستخدم وخطته من Supabase عبر JWT المستخدم
func fetchSupabaseUserInfo(ctx context.Context, token string) (userID string, plan string, err error) {
	client := aiSupabaseClient

	userReq, err := http.NewRequestWithContext(ctx, "GET", SupabaseURL+"/auth/v1/user", nil)
	if err != nil {
		return "", "", err
	}
	userReq.Header.Set("apikey", SupabaseAnonKey)
	userReq.Header.Set("Authorization", "Bearer "+token)

	userResp, err := client.Do(userReq)
	if err != nil {
		return "", "", err
	}
	defer userResp.Body.Close()
	if userResp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("user token rejected: %s", userResp.Status)
	}

	var userData struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(io.LimitReader(userResp.Body, 256*1024)).Decode(&userData); err != nil {
		return "", "", fmt.Errorf("invalid user payload: %w", err)
	}
	if userData.ID == "" {
		return "", "", fmt.Errorf("invalid user payload")
	}

	profileReq, err := http.NewRequestWithContext(ctx, "GET", SupabaseURL+"/rest/v1/profiles?select=plan&id=eq."+userData.ID, nil)
	if err != nil {
		return "", "", err
	}
	profileReq.Header.Set("apikey", SupabaseAnonKey)
	profileReq.Header.Set("Authorization", "Bearer "+token)

	profileResp, err := client.Do(profileReq)
	if err != nil {
		return "", "", err
	}
	defer profileResp.Body.Close()
	if profileResp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("profiles lookup failed: %s", profileResp.Status)
	}

	var profiles []struct {
		Plan string `json:"plan"`
	}
	if err := json.NewDecoder(io.LimitReader(profileResp.Body, 256*1024)).Decode(&profiles); err != nil {
		return "", "", err
	}
	plan = ""
	if len(profiles) > 0 {
		plan = profiles[0].Plan
	}
	return userData.ID, plan, nil
}

// aiUsageSnapshot القيم التي يعيدها RPC الحصة خادميًا — مصدر الحقيقة الوحيد
// للحد اليومي والعدّاد المستهلك اليوم (يُعرضان كما هما في الواجهة بدل اشتقاق موازٍ).
type aiUsageSnapshot struct {
	UsedToday  int `json:"used_today"`
	DailyLimit int `json:"daily_limit"`
}

// callAIUsageRPC يستدعي RPC check_and_record_ai_usage في Supabase — الحجة الرسمية
// الوحيدة للحد اليومي. تعمل بوضع الفحص المسبق (check_only) أو التسجيل (record)
// وتعيد لقطة القيم الخادمية عند توفرها (nil عند تعذّر قراءة الحمولة).
//
// ثابت عقدي (إصلاح TOCTOU — 2026-10-19): هذا المسار يبقى **فحصاً محضاً**.
// لا يُرسل p_reserve ولا p_request_id؛ الحجز الذرّي للحصة (الصف المعلّق) هو
// مسؤولية خادم Modal AI وحده، لأن المستخدم لا يدفع ثمن GPU إلا عنده. إضافة
// حجز هنا تعني خصماً لحظة قبل أن يقرر المستخدم المتابعة، ولو غيّر رأيه.
func callAIUsageRPC(ctx context.Context, token string, userID string, imageBytes int64, checkOnly bool) (*aiUsageSnapshot, error) {
	payload, err := json.Marshal(map[string]interface{}{
		"p_user_id":      userID,
		"p_daily_limit":  0, // مهمل خادمياً — يُشتق من الاستحقاق (status/expires_at)
		"p_image_bytes":  imageBytes,
		"p_exec_seconds": 0,
		"p_cost_usd":     0,
		"p_check_only":   checkOnly,
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", SupabaseURL+"/rest/v1/rpc/check_and_record_ai_usage", bytes.NewBuffer(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", SupabaseAnonKey)
	req.Header.Set("Authorization", "Bearer "+token)

	client := aiUsageClient
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errRes struct {
			Message string `json:"message"`
			Details string `json:"details"`
		}
		if jsonErr := json.NewDecoder(io.LimitReader(resp.Body, 64*1024)).Decode(&errRes); jsonErr == nil && errRes.Message != "" {
			if errRes.Details != "" {
				return nil, fmt.Errorf("%s (%s)", errRes.Message, errRes.Details)
			}
			return nil, errors.New(errRes.Message)
		}
		return nil, fmt.Errorf("AI usage check failed: %s", resp.Status)
	}

	// عقد غير متوقع (حمولة غير قابلة للقراءة) لا يُفشل عملية المستخدم —
	// نكتفي بعدم تحديث المرآة المحلية ونُسجّل تحذيرًا.
	var snapshot aiUsageSnapshot
	if decodeErr := json.NewDecoder(io.LimitReader(resp.Body, 64*1024)).Decode(&snapshot); decodeErr != nil {
		if ctx.Err() != nil || os.IsTimeout(decodeErr) {
			return nil, decodeErr
		}
		slog.Warn("Unexpected AI usage RPC payload", "error", decodeErr)
		return nil, nil
	}
	return &snapshot, ctx.Err()
}

// injectServerQuota يضيف العدّاد والحدّ الخادميين إلى ردّ JSON القادم من Modal،
// فتقرأ الواجهة القيم نفسها التي يفرضها الخادم بدل اشتقاق محلي موازٍ قد يخالفه
// (اختلاف حدّ اليوم: محلي مقابل UTC). القيمة +1 هي العملية الحالية نفسها، وهي
// مسجَّلة مرة واحدة فقط في Modal (لا خصم مزدوج — تأكيد البوابة على check_only).
func injectServerQuota(body []byte, usedToday int, dailyLimit int) []byte {
	if usedToday < 0 || dailyLimit <= 0 {
		return body
	}
	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		return body
	}
	if _, ok := payload["used_today"]; !ok {
		payload["used_today"] = usedToday + 1
	}
	if _, ok := payload["daily_limit"]; !ok {
		payload["daily_limit"] = dailyLimit
	}
	augmented, err := json.Marshal(payload)
	if err != nil {
		return body
	}
	return augmented
}

// aiContextReader stops decoding/reading between chunks when the total budget expires.
// imaging.Fit itself is synchronous; check the context immediately before and after it.
type aiContextReader struct {
	ctx context.Context
	r   io.Reader
}

func (r aiContextReader) Read(p []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	n, err := r.r.Read(p)
	if ctxErr := r.ctx.Err(); ctxErr != nil {
		return n, ctxErr
	}
	return n, err
}

func aiImageOpaque(img image.Image) bool {
	if opaque, ok := img.(interface{ Opaque() bool }); ok {
		return opaque.Opaque()
	}
	bounds := img.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			if _, _, _, a := img.At(x, y).RGBA(); a != 0xffff {
				return false
			}
		}
	}
	return true
}

// Limits apply to the base64 field (without the data URL prefix) and actual
// decoded bytes, not an estimate including the MIME prefix or padding.
func decodeAIImagePayload(payload string, maxEncoded, maxDecoded int) ([]byte, error) {
	encoded := payload
	if strings.HasPrefix(payload, "data:") {
		header, data, ok := strings.Cut(payload, ",")
		if !ok || !strings.HasPrefix(header, "data:image/") || !strings.HasSuffix(header, ";base64") {
			return nil, fmt.Errorf("invalid image data URL; expected data:image/...;base64,...")
		}
		mediaType := strings.TrimSuffix(strings.TrimPrefix(header, "data:image/"), ";base64")
		if mediaType == "" || strings.ContainsAny(mediaType, "; \t\r\n") {
			return nil, fmt.Errorf("invalid image data URL media type")
		}
		encoded = data
	}
	if len(encoded) == 0 {
		return nil, fmt.Errorf("image base64 is empty")
	}
	if len(encoded) > maxEncoded {
		return nil, fmt.Errorf("image base64 exceeds %d MiB", maxEncoded/(1024*1024))
	}
	// Go ignores CR/LF in base64; Modal's validate=True deliberately rejects them.
	if strings.ContainsAny(encoded, "\r\n") {
		return nil, fmt.Errorf("invalid image base64: line breaks are not allowed")
	}
	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("invalid image base64: %w", err)
	}
	if len(decoded) > maxDecoded {
		return nil, fmt.Errorf("image decoded bytes exceed %d MiB", maxDecoded/(1024*1024))
	}
	return decoded, nil
}

func validateAIImage(ctx context.Context, data []byte, maxSide int) error {
	config, _, err := image.DecodeConfig(aiContextReader{ctx, bytes.NewReader(data)})
	if err != nil {
		return fmt.Errorf("cannot decode image header: %w", err)
	}
	if config.Width <= 0 || config.Height <= 0 || config.Width > maxSide || config.Height > maxSide {
		return fmt.Errorf("image dimensions exceed %d×%d", maxSide, maxSide)
	}
	// DecodeConfig alone accepts truncated files whose pixel data is missing.
	if _, _, err := image.Decode(aiContextReader{ctx, bytes.NewReader(data)}); err != nil {
		return fmt.Errorf("cannot decode image pixels: %w", err)
	}
	return ctx.Err()
}

// generateUUID generates a standard version 4 UUID using crypto/rand for client idempotency.
func generateUUID() string {
	var b [16]byte
	if _, err := io.ReadFull(rand.Reader, b[:]); err != nil {
		return fmt.Sprintf("%08x-%04x-4000-8000-%012x", time.Now().Unix(), time.Now().Nanosecond()&0xffff, time.Now().UnixNano())
	}
	b[6] = (b[6] & 0x0f) | 0x40 // Version 4
	b[8] = (b[8] & 0x3f) | 0x80 // Variant 10
	return fmt.Sprintf("%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
		b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15])
}

func marshalAIRequest(imagePayload string, serverLimit int, requestID ...string) ([]byte, error) {
	if len(imagePayload) > maxAIRequestSize {
		return nil, fmt.Errorf("AI request JSON exceeds 30 MiB")
	}
	bodyMap := map[string]interface{}{
		"image":      imagePayload,
		"dailyLimit": serverLimit, // Compatibility only; server RPC owns the limit.
	}
	if len(requestID) > 0 && requestID[0] != "" {
		bodyMap["requestId"] = requestID[0]
	}
	payload, err := json.Marshal(bodyMap)
	if err != nil {
		return nil, err
	}
	if len(payload) > maxAIRequestSize {
		return nil, fmt.Errorf("AI request JSON exceeds 30 MiB")
	}
	return payload, nil
}

func readAIResponse(ctx context.Context, resp *http.Response) ([]byte, error) {
	if resp.ContentLength > maxAIResponseSize {
		return nil, fmt.Errorf("AI response exceeds 50 MiB")
	}
	body, err := io.ReadAll(io.LimitReader(aiContextReader{ctx, resp.Body}, maxAIResponseSize+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxAIResponseSize {
		return nil, fmt.Errorf("AI response exceeds 50 MiB")
	}
	if resp.ContentLength >= 0 && int64(len(body)) != resp.ContentLength {
		return nil, fmt.Errorf("truncated AI response: %w", io.ErrUnexpectedEOF)
	}
	return body, ctx.Err()
}

func (s *AIService) EnhanceImageWithAI(base64Image string, token string, limit int) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), aiEnhancementBudget)
	defer cancel()
	return s.enhanceImageWithAI(ctx, base64Image, token, limit)
}

func (s *AIService) enhanceImageWithAI(ctx context.Context, base64Image string, token string, limit int) (result string, err error) {
	// One budget covers preparation, quota preflight, inference and response validation.
	defer func() {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) || errors.Is(err, context.DeadlineExceeded) || os.IsTimeout(err) {
			result = ""
			err = fmt.Errorf("انتهت مهلة تحسين الصورة؛ قد تكون الحصة قد حُجزت على الخادم. تحقق من الرصيد قبل إعادة المحاولة: %w", context.DeadlineExceeded)
		}
	}()
	if err := ctx.Err(); err != nil {
		return "", err
	}
	if token == "" {
		return "", fmt.Errorf("تسجيل الدخول مطلوب لاستخدام ميزة التحسين بالذكاء الاصطناعي")
	}

	var modalImagePayload string
	var inputImageBytes int64

	// 🚀 دعم مسار الصور المحلية المباشر (/local-image/...) لتفادي تشفير الـ DOM Canvas في الواجهة
	if strings.HasPrefix(base64Image, "/local-image/") {
		mediaSvc := NewMediaService()
		realPath, err := mediaSvc.ResolveLocalImagePath(base64Image)
		if err != nil {
			return "", fmt.Errorf("resolve local image: %w", err)
		}
		stat, err := os.Stat(realPath)
		if err != nil {
			return "", fmt.Errorf("read local image stat: %w", err)
		}
		if stat.Size() > MaxFileSize {
			return "", fmt.Errorf("حجم الصورة يتجاوز الحد الأقصى المسموح (%d ميجابايت)", MaxFileSize/(1024*1024))
		}

		f, err := os.Open(realPath)
		if err != nil {
			return "", fmt.Errorf("open local image: %w", err)
		}
		img, decodeErr := imaging.Decode(aiContextReader{ctx, io.LimitReader(f, MaxFileSize+1)}, imaging.AutoOrientation(true))
		closeErr := f.Close()
		if decodeErr != nil {
			return "", fmt.Errorf("decode local image: %w", decodeErr)
		}
		if closeErr != nil {
			return "", fmt.Errorf("close local image: %w", closeErr)
		}
		if err := ctx.Err(); err != nil {
			return "", err
		}

		// Preserve the existing aspect fit. imaging.Fit returns 8-bit NRGBA;
		// this preparation path does not guarantee end-to-end 16-bit precision.
		bounds := img.Bounds()
		if bounds.Dx() > maxAIInputSide || bounds.Dy() > maxAIInputSide {
			img = imaging.Fit(img, maxAIInputSide, maxAIInputSide, imaging.Lanczos)
		}
		if err := ctx.Err(); err != nil {
			return "", err
		}

		// Opaque checks every pixel, including alpha 254 and isolated cutouts,
		// regardless of the filename extension.
		var buf bytes.Buffer
		if !aiImageOpaque(img) {
			if err := png.Encode(&buf, img); err != nil {
				return "", fmt.Errorf("encode png for AI: %w", err)
			}
			inputImageBytes = int64(buf.Len())
			modalImagePayload = "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
		} else {
			if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 92}); err != nil {
				return "", fmt.Errorf("encode jpeg for AI: %w", err)
			}
			inputImageBytes = int64(buf.Len())
			modalImagePayload = "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
		}
	} else {
		decoded, err := decodeAIImagePayload(base64Image, maxAIBase64Size, maxAIInputSize)
		if err != nil {
			return "", fmt.Errorf("invalid AI input: %w", err)
		}
		if err := validateAIImage(ctx, decoded, maxAIInputSide); err != nil {
			return "", fmt.Errorf("invalid AI input: %w", err)
		}
		inputImageBytes = int64(len(decoded))
		modalImagePayload = base64Image
	}

	if inputImageBytes > maxAIInputSize {
		return "", fmt.Errorf("AI input decoded bytes exceed 15 MiB")
	}
	if err := ctx.Err(); err != nil {
		return "", err
	}

	tokenHash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))[:16]

	// 🛡️ الحد اليومي ومعرّف المستخدم يُشتقان من خطة المستخدم في قاعدة البيانات عبر كاش موحد.
	// (المعامل limit المُستقبَل يُتجاهل عمداً — يبقى في التوقيع حفاظاً على توافقية الـ bindings).
	cachedUserID, serverLimit, err := resolveUserInfoForToken(ctx, tokenHash, token)
	if err != nil {
		return "", err
	}

	// العدّاد الخادمي الفعلي لليوم (يشمله رد الفحص المسبق) — يُحقن في الرد النهائي.
	serverUsedToday := -1

	// فحص سريع محلي (تخفيف مؤقت) — الحجة النهائية خادمية عبر RPC
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

	// 🛡️ الفحص الخادمي الرسمي — لا يستهلك الرصيد (check_only) ويستمر عبر إعادة التشغيل.
	// RPC check_and_record_ai_usage يشتق الحد من الخطة ويحصي استهلاك اليوم في قاعدة البيانات.
	// Modal alone reserves server quota and finalizes usage; no reservation or refund here.
	if SupabaseURL != "" && SupabaseAnonKey != "" {
		userID := cachedUserID
		if userID == "" {
			if fetchedID, _, userErr := fetchSupabaseUserInfo(ctx, token); userErr == nil {
				userID = fetchedID
			} else if ctx.Err() != nil || os.IsTimeout(userErr) {
				return "", userErr
			}
		}
		if userID != "" {
			snapshot, rpcErr := callAIUsageRPC(ctx, token, userID, inputImageBytes, true)
			if rpcErr != nil {
				return "", fmt.Errorf("تجاوزت الحد اليومي أو تعذر التحقق من الحصة: %w", rpcErr)
			}
			if snapshot != nil {
				// الحد والعدّاد خادميان — هما المصدر الوحيد للحقيقة (لا اشتقاق محلي موازٍ)
				if snapshot.DailyLimit > 0 {
					serverLimit = snapshot.DailyLimit
				}
				serverUsedToday = snapshot.UsedToday
				GlobalAIRateLimiter.Sync(tokenHash, snapshot.UsedToday)
			}
		}
	}

	modalURL := strings.TrimRight(ModalAIURL, "/")
	if modalURL == "" {
		modalURL = defaultModalAIURL
	}

	clientRequestID := generateUUID()
	payload, err := marshalAIRequest(modalImagePayload, serverLimit, clientRequestID)
	if err != nil {
		return "", err
	}
	if err := ctx.Err(); err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", modalURL, bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("User-Agent", "GridoStudio-Desktop/"+AppVersion)
	req.Header.Set("Idempotency-Key", clientRequestID)
	req.Header.Set("X-Request-Id", clientRequestID)

	client := aiEnhanceClient
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("خطأ في الاتصال بخادم الذكاء الاصطناعي: %w", err)
	}
	defer resp.Body.Close()

	body, err := readAIResponse(ctx, resp)
	if err != nil {
		return "", fmt.Errorf("فشل قراءة الرد من الخادم: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		bodyStr := strings.TrimSpace(string(body))
		// 🛡️ سلامة السجلات: لا تُمرَّر استجابة الخادم الخام إلى slog (قد تحوي بيانات
		// المستخدم أو محتوى الطلب) — يسجَّل طولها بالبايتات فقط.
		slog.Error("Modal AI HTTP error", "status", resp.StatusCode, "bytes", len(body))

		var errRes struct {
			Error string `json:"error"`
		}
		if err := json.Unmarshal(body, &errRes); err == nil && errRes.Error != "" {
			return "", fmt.Errorf("فشل خادم الذكاء الاصطناعي: %s", errRes.Error)
		}
		if strings.Contains(bodyStr, "disabled") || strings.Contains(bodyStr, "workspace") {
			return "", fmt.Errorf("خادم الذكاء الاصطناعي غير نشط حالياً على Modal (Workspace disabled). يرجى إعادة تفعيل الحساب أو إعادة النشر بـ modal deploy")
		}
		if resp.StatusCode == http.StatusNotFound {
			return "", fmt.Errorf("تعذر العثور على نقطة النهاية لمعالجة الذكاء الاصطناعي (404 Not Found). يرجى التأكد من تشغيل خادم Modal")
		}
		return "", fmt.Errorf("فشل خادم الذكاء الاصطناعي (%d)", resp.StatusCode)
	}

	var modalResp struct {
		Success       *bool  `json:"success"`
		UsageRecorded *bool  `json:"usage_recorded"`
		Image         string `json:"image"`
		Error         string `json:"error"`
	}
	if err := json.Unmarshal(body, &modalResp); err != nil {
		return "", fmt.Errorf("invalid AI response JSON")
	}
	if modalResp.UsageRecorded != nil && !*modalResp.UsageRecorded {
		slog.Error("Modal AI returned image with unrecorded usage", "bytes", len(body))
		return "", fmt.Errorf("تعذر تسجيل استهلاك حصة الذكاء الاصطناعي في قاعدة البيانات. يرجى إعادة المحاولة")
	}
	if (modalResp.Success != nil && !*modalResp.Success) || modalResp.Error != "" {
		return "", fmt.Errorf("AI server reported an unsuccessful enhancement")
	}
	decoded, err := decodeAIImagePayload(modalResp.Image, maxAIResponseSize, base64.StdEncoding.DecodedLen(maxAIResponseSize))
	if err != nil {
		return "", fmt.Errorf("invalid AI response image: %w", err)
	}
	// Modal returns at most 2x the 2048-fit input. Check before allocating pixels.
	if err := validateAIImage(ctx, decoded, 2*maxAIInputSide); err != nil {
		return "", fmt.Errorf("invalid AI response image: %w", err)
	}
	result = string(injectServerQuota(body, serverUsedToday, serverLimit))
	if err := ctx.Err(); err != nil {
		return "", err
	}
	success = true
	return result, nil
}
