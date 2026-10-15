package service

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// updateMutex يمنع تعارض تنظيف مجلد التحديثات مع تحميل نشط في نفس الوقت
var updateMutex sync.Mutex

// AppVersion يتم حقنها تلقائياً ديناميكياً عند البناء عبر ldflags (مثل -X grido/internal/service.AppVersion=v1.0.2)
var AppVersion = "dev"

// UpdaterPublicKey مفتاح Ed25519 العام (base64) الذي يُتحقق به من توقيع المثبت،
// ويُحقن عند البناء بـ ldflags مثل بقية متغيرات البناء (مفتاح عام لا سرّ فيه).
//
// لماذا يلزم توقيع أصلاً والبصمة موجودة؟ لأن بصمة SHA-256 تُجلب من **نفس المصدر**
// الذي يُجلب منه المثبت: سيرفر توزيع مخترق أو اعتراض DNS بشهادة صالحة يخدم ملفاً
// خبيثاً وبصمته المطابقة معاً، فتنهار فائدة البصمة كاملة. التوقيع بمفتاح خاص لا
// يوجد إلا عند الناشر يكسر هذا الاقتران.
//
// السياسة: مُهيَّأ ⇒ إلزامي (Fail-closed). غير مُهيَّأ ⇒ السلوك القديم (بصمة فقط)
// مع تسجيل تحذير صريح — كي لا يتعطّل مسار التحديث لبناءات لم تُهيّأ بعد.
var UpdaterPublicKey = ""

type UpdateInfo struct {
	HasUpdate      bool   `json:"has_update"`
	CurrentVersion string `json:"current_version"`
	LatestVersion  string `json:"latest_version"`
	ReleaseNotes   string `json:"release_notes"`
	DownloadURL    string `json:"download_url"`
	// InstallerSHA256 هو بصمة المثبت المتوقعة (SHA-256 hex) كما أعلنها خادم الإصدارات.
	// تُفرض المطابقة عند توفرها، ويُسجل تحذير ويُسماح بالتثبيت عند غيابها (توافقية مع الإصدارات القديمة).
	InstallerSHA256 string `json:"sha256"`
	// InstallerSignature توقيع Ed25519 (base64) على بصمة المثبت الخام، يُعلنه
	// خادم الإصدارات في حقل `signature` أو كأصل `.sig` مرفوع مع الإصدار.
	InstallerSignature string `json:"signature"`
}

type UpdaterService struct{}

const checksumsAssetName = "grido-checksums.txt"
const defaultInstallerFallbackURL = "https://grido.cloud-ip.cc/api/download"

// ReleaseAsset يمثل ملفاً مرفقاً في إصدار GitHub
type ReleaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

// extractInstallerDownloadURL يستخرج رابط تحميل ملف التثبيت من أصول الإصدار ديناميكياً
func extractInstallerDownloadURL(assets []ReleaseAsset) string {
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		if strings.HasSuffix(name, ".exe") && (strings.Contains(name, "installer") || strings.Contains(name, "setup")) && asset.BrowserDownloadURL != "" {
			if strings.Contains(asset.BrowserDownloadURL, "github.com/wisam79/grido/releases") {
				return defaultInstallerFallbackURL
			}
			return asset.BrowserDownloadURL
		}
	}
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		if strings.HasSuffix(name, ".exe") && asset.BrowserDownloadURL != "" {
			if strings.Contains(asset.BrowserDownloadURL, "github.com/wisam79/grido/releases") {
				return defaultInstallerFallbackURL
			}
			return asset.BrowserDownloadURL
		}
	}
	return defaultInstallerFallbackURL
}

// CleanupTempUpdates يقوم بتنظيف كافّة ملفات والمثبتات المؤقتة الخاصة بـ Grido في مجلد Temp
func CleanupTempUpdates() {
	// 🛡️ TryLock: لا نحتجز القفل أبداً — إن كان هناك تحميل نشط فتجاوز التنظيف
	// هذه المرة (سيعاد لاحقاً عند الإقلاع) بدل تعليقه خلف عملية RemoveAll بطيئة.
	if !updateMutex.TryLock() {
		slog.Info("Skipping temp updates cleanup: download in progress")
		return
	}
	defer updateMutex.Unlock()

	tempDir := os.TempDir()

	// 1. تنظيف مجلد grido-updates المخصص
	subDir := filepath.Join(tempDir, "grido-updates")
	_ = os.RemoveAll(subDir)

	// 2. مسح كافّة ملفات المثبتات والسكريبتات المهجورة التي تبدأ بـ GridoStudio- أو grido_ أو grido-
	entries, err := os.ReadDir(tempDir)
	if err != nil {
		return
	}

	for _, entry := range entries {
		// 🔒 الحذف كان بأي بادئة grido- في مجلد %TEMP% المشترك: يطال ملفات لا
		// تخصنا، أو ملفات يُعِدّها مثبّت/عملية أخرى في هذه اللحظة. نقصره على
		// مثبّتاتنا وسكريبتاتنا وبصيغها المعروفة.
		if entry.IsDir() {
			continue
		}
		name := strings.ToLower(entry.Name())
		if !strings.HasPrefix(name, "gridostudio-") &&
			!strings.HasPrefix(name, "grido_") &&
			!strings.HasPrefix(name, "grido-") {
			continue
		}
		switch filepath.Ext(name) {
		case ".exe", ".msi", ".bat", ".cmd", ".ps1", ".tmp", ".log":
		default:
			continue
		}
		_ = os.RemoveAll(filepath.Join(tempDir, entry.Name()))
	}
}

func NewUpdaterService() *UpdaterService {
	return &UpdaterService{}
}

func (u *UpdaterService) CheckForUpdate() (*UpdateInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	fetchRelease := func(url string) (*http.Response, error) {
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request for %s: %w", url, err)
		}
		req.Header.Set("User-Agent", "GridoStudio-Desktop")
		return client.Do(req)
	}

	resp, primaryErr := fetchRelease("https://grido.cloud-ip.cc/api/version")
	if primaryErr != nil || resp.StatusCode != http.StatusOK {
		// لخّص سبب فشل المصدر الأساسي بدقة قبل محاولة المصدر الاحتياطي
		primarySummary := "unreachable"
		if primaryErr != nil {
			primarySummary = primaryErr.Error()
		} else {
			primarySummary = fmt.Sprintf("returned status %s", resp.Status)
			resp.Body.Close()
			resp = nil
		}
		// Fallback to GitHub directly
		var fallbackErr error
		resp, fallbackErr = fetchRelease("https://api.github.com/repos/wisam79/grido/releases/latest")
		if fallbackErr != nil || resp.StatusCode != http.StatusOK {
			fallbackSummary := "unreachable"
			if fallbackErr != nil {
				fallbackSummary = fallbackErr.Error()
				if resp != nil { // Do قد يعيد استجابة غير nil مع خطأ إعادة توجيه
					resp.Body.Close()
					resp = nil
				}
			} else {
				fallbackSummary = fmt.Sprintf("returned status %s", resp.Status)
				resp.Body.Close()
				resp = nil
			}
			// فشل كلا المصدرين — نُبلغ المستخدم بتفاصيل المصدرين بدل إخفاء وجود تحديثات
			return nil, fmt.Errorf("failed to check for updates (primary: %s; fallback: %s)", primarySummary, fallbackSummary)
		}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1*1024*1024))
	if err != nil {
		return nil, err
	}

	var ghRelease struct {
		TagName   string         `json:"tag_name"`
		Body      string         `json:"body"`
		SHA256    string         `json:"sha256"`
		Signature string         `json:"signature"`
		Assets    []ReleaseAsset `json:"assets"`
	}

	if err := json.Unmarshal(body, &ghRelease); err != nil {
		return nil, err
	}

	// إن لم يوفر خادم الإصدارات البصمة مباشرة، نحاول قراءة ملف البصمات من أصول الإصدار أو موقع التوزيع العام
	expectedSHA := strings.ToLower(strings.TrimSpace(ghRelease.SHA256))
	if expectedSHA == "" {
		for _, asset := range ghRelease.Assets {
			if asset.Name == checksumsAssetName && asset.BrowserDownloadURL != "" {
				url := asset.BrowserDownloadURL
				if strings.Contains(url, "github.com/wisam79/grido/releases") {
					url = "https://grido.cloud-ip.cc/api/checksums"
				}
				if text, fetchErr := fetchTextAsset(client, url); fetchErr == nil {
					expectedSHA = parseChecksumForInstaller(text)
				}
				break
			}
		}
		// محاولة احتياطية من مسار التوزيع العام
		if expectedSHA == "" {
			if text, fetchErr := fetchTextAsset(client, "https://grido.cloud-ip.cc/api/checksums"); fetchErr == nil {
				expectedSHA = parseChecksumForInstaller(text)
			}
		}
	}

	// 🔏 التوقيع: المسار المفضّل حقل `signature` في بيانات الإصدار (يخدمه وسيط
	// الإصدارات بجانب البصمة)، وإلا أصل `.sig` مرفوع مع الإصدار ويُجلب مباشرة
	// (نتخطّى روابط GitHub التي تحتاج توثيقاً وليس لها وسيط معرّف).
	signature := strings.TrimSpace(ghRelease.Signature)
	if signature == "" {
		if sigURL := findSignatureAssetURL(ghRelease.Assets); sigURL != "" {
			if text, fetchErr := fetchTextAsset(client, sigURL); fetchErr == nil {
				signature = firstSignatureLine(text)
			}
		}
	}

	latestTag := strings.TrimPrefix(ghRelease.TagName, "v")
	currentTag := strings.TrimPrefix(AppVersion, "v")
	if currentTag == "dev" || currentTag == "" {
		currentTag = "0.0.0"
	}

	hasUpdate := isVersionGreater(latestTag, currentTag)
	installerURL := extractInstallerDownloadURL(ghRelease.Assets)

	return &UpdateInfo{
		HasUpdate:          hasUpdate,
		CurrentVersion:     AppVersion,
		LatestVersion:      ghRelease.TagName,
		ReleaseNotes:       ghRelease.Body,
		DownloadURL:        installerURL,
		InstallerSHA256:    expectedSHA,
		InstallerSignature: signature,
	}, nil
}

// findSignatureAssetURL يعيد رابط أصل التوقيع (`.sig`) القابل للجلب مباشرةً،
// أو "" إن لم يوجد. تُتخطّى روابط أصول GitHub لأن المستودع خاص فيلزمها توثيق
// ولا يوجد وسيط معرّف لها (خلافاً لملف البصمات الذي يخدمه مسار الإصدارات).
func findSignatureAssetURL(assets []ReleaseAsset) string {
	for _, asset := range assets {
		name := strings.ToLower(asset.Name)
		if !strings.HasSuffix(name, ".sig") || asset.BrowserDownloadURL == "" {
			continue
		}
		if strings.Contains(asset.BrowserDownloadURL, "github.com/wisam79/grido/releases") {
			continue
		}
		return asset.BrowserDownloadURL
	}
	return ""
}

// firstSignatureLine يستخرج أول سطر غير فارغ من ملف توقيع خام (يتحمّل سطراً
// نهائياً فارغاً أو ملفاً مُلحقاً بتعليق يبدأ بـ #).
func firstSignatureLine(content string) string {
	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		return trimmed
	}
	return ""
}

// errNoUpdaterPublicKey يعني أن البناء بلا مفتاح عام مثبّت — البصمة وحدها هي
// كل ما يمكن فرضه، ولا يُعدّ هذا فشل تحقق بل حالة «غير مُهيَّأ».
var errNoUpdaterPublicKey = errors.New("no updater public key pinned in this build")

// verifyInstallerSignature يتحقق من توقيع Ed25519 على بصمة المثبت.
//
// الرسالة الموقّعة هي **بايتات بصمة SHA-256 الخام** (32 بايتاً) لا الملف كاملاً:
// التوقيع على البصمة يغني عن تحميل ملف بحجم 200MB في الذاكرة للتحقق،
// ويربط التوقيع بالبصمة التي يفرضها التطبيق فعلاً — فلا يمكن توقيع ملف آخر
// وإقرانه بهذه البصمة.
//
// @param publicKeyBase64 مفتاح Ed25519 العام بترميز base64 (قياسي أو بلا حشو)
// @param sha256Hex بصمة SHA-256 للمثبت نصاً سادس عشرياً (64 حرفاً)
// @param signatureBase64 التوقيع بترميز base64 (قياسي أو بلا حشو)
func verifyInstallerSignature(publicKeyBase64, sha256Hex, signatureBase64 string) error {
	keyText := strings.TrimSpace(publicKeyBase64)
	if keyText == "" {
		return errNoUpdaterPublicKey
	}

	publicKey, err := decodeBase64Flexible(keyText)
	if err != nil {
		return fmt.Errorf("invalid updater public key encoding: %w", err)
	}
	if len(publicKey) != ed25519.PublicKeySize {
		return fmt.Errorf("invalid updater public key length: %d bytes (want %d)", len(publicKey), ed25519.PublicKeySize)
	}

	sigText := strings.TrimSpace(signatureBase64)
	if sigText == "" {
		return errors.New("no signature published for this release")
	}
	signature, err := decodeBase64Flexible(sigText)
	if err != nil {
		return fmt.Errorf("invalid signature encoding: %w", err)
	}
	if len(signature) != ed25519.SignatureSize {
		return fmt.Errorf("invalid signature length: %d bytes (want %d)", len(signature), ed25519.SignatureSize)
	}

	digest, err := hex.DecodeString(strings.TrimSpace(sha256Hex))
	if err != nil {
		return fmt.Errorf("invalid checksum encoding: %w", err)
	}
	if len(digest) != sha256.Size {
		return fmt.Errorf("invalid checksum length: %d bytes (want %d)", len(digest), sha256.Size)
	}

	if !ed25519.Verify(ed25519.PublicKey(publicKey), digest, signature) {
		return errors.New("installer signature does not match the pinned public key")
	}
	return nil
}

// decodeBase64Flexible يقبل الترميز القياسي بحشو أو بدونه (وكذلك ترميز URL) —
// التوقيعات تُولَّد بأدوات مختلفة تختلف في الحشو، والفشل هنا يظهر للمستخدم
// كرفض تحديث سليم.
func decodeBase64Flexible(value string) ([]byte, error) {
	encodings := []*base64.Encoding{
		base64.StdEncoding,
		base64.RawStdEncoding,
		base64.URLEncoding,
		base64.RawURLEncoding,
	}
	var lastErr error
	for _, encoding := range encodings {
		decoded, err := encoding.DecodeString(value)
		if err == nil {
			return decoded, nil
		}
		lastErr = err
	}
	return nil, lastErr
}

// fetchTextAsset يجلب محتوى أصل نصي صغير (مثل ملف البصمات) مع حد أقصى للحجم
func fetchTextAsset(client *http.Client, url string) (string, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "GridoStudio-Desktop")
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status %s", resp.Status)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// parseChecksumForInstaller يستخرج سطر بصمة المثبت من ملف بصمات بصيغة "sha256  filename"
func parseChecksumForInstaller(content string) string {
	var fallback string
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		nameLower := strings.ToLower(fields[len(fields)-1])
		if strings.Contains(nameLower, "installer") || strings.Contains(nameLower, "setup") {
			return strings.ToLower(fields[0])
		}
		if strings.HasSuffix(nameLower, ".exe") && fallback == "" {
			fallback = strings.ToLower(fields[0])
		}
	}
	return fallback
}

func isVersionGreater(v1, v2 string) bool {
	if v1 == v2 || v1 == "" {
		return false
	}

	// Remove suffixes like -beta, -alpha
	v1 = strings.Split(v1, "-")[0]
	v2 = strings.Split(v2, "-")[0]

	var n1, n2, n3 int
	var m1, m2, m3 int

	// Parse as much as possible, ignoring errors if some parts are missing (e.g. "1.0" instead of "1.0.0")
	fmt.Sscanf(v1, "%d.%d.%d", &n1, &n2, &n3)
	fmt.Sscanf(v2, "%d.%d.%d", &m1, &m2, &m3)

	if n1 != m1 {
		return n1 > m1
	}
	if n2 != m2 {
		return n2 > m2
	}
	return n3 > m3
}

type progressWriter struct {
	total      int64
	downloaded int64
	ctx        context.Context
	lastEmit   int
}

func (pw *progressWriter) Write(p []byte) (int, error) {
	n := len(p)
	pw.downloaded += int64(n)
	if pw.total > 0 {
		percentage := int(float64(pw.downloaded) / float64(pw.total) * 100)
		if percentage != pw.lastEmit {
			pw.lastEmit = percentage
			if application.Get() != nil {
				application.Get().Event.Emit("update-progress", percentage)
			}
		}
	}
	return n, nil
}

// DownloadAndInstall ينزّل المثبت ويتحقق من سلامته قبل أي تنفيذ.
//
// سلسلة الثقة ذات مراحل صريحة: (1) رفض بلا بصمة معلنة، (2) رفض إن لم تطابق
// البصمة الملفَ المنزّل، (3) إن كان مفتاح عام مثبّتاً في البناء فالتوقيع
// إلزامي — نقصه أو عدم مطابقته يرفض التثبيت (Fail-closed).
func (u *UpdaterService) DownloadAndInstall(ctx context.Context, downloadURL string, expectedSHA256 string, signatureBase64 string) error {
	// 🛡️ إغلاق حازم: بدون بصمة SHA-256 معلنة لا نثبّت أي ملف تحديث
	expected := strings.ToLower(strings.TrimSpace(expectedSHA256))
	if expected == "" {
		return fmt.Errorf("refusing to install update: no SHA-256 checksum published for this release")
	}
	if len(expected) != sha256.Size*2 {
		return fmt.Errorf("refusing to install update: invalid SHA-256 checksum format")
	}
	if _, err := hex.DecodeString(expected); err != nil {
		return fmt.Errorf("refusing to install update: invalid SHA-256 checksum format: %w", err)
	}

	downloadURL = strings.TrimSpace(downloadURL)
	if downloadURL == "" {
		downloadURL = defaultInstallerFallbackURL
	}

	// 🛡️ fail-closed على الرابط الأولي نفسه لا على إعادات التوجيه فقط: الرابط
	// يصل من استجابة فحص التحديث أو من واجهة الاستدعاء، وقبوله بـ http:// يفتح
	// قناة التنزيل كلها للاعتراض قبل أي فحص للبصمة أو التوقيع.
	if !strings.HasPrefix(strings.ToLower(downloadURL), "https://") {
		return fmt.Errorf("رفض تثبيت التحديث: رابط التنزيل غير مشفّر (يجب أن يبدأ بـ https://): %s", downloadURL)
	}

	req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "GridoStudio-Desktop")

	// 🛡️ رفض أي إعادة توجيه تنزل إلى HTTP غير مشفّر (منع هبوط TLS→HTTP)
	client := &http.Client{
		Timeout: 5 * time.Minute,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			if req.URL.Scheme != "https" {
				return fmt.Errorf("refusing insecure redirect to non-HTTPS URL: %s", req.URL)
			}
			return nil
		},
	}
	resp, err := client.Do(req)
	// إذا فشل الاتصال بالرابط المحدد أو أعاد كود خطأ وكان مختلفاً عن رابط GitHub الدائم، نحاول رابط GitHub الاحتياطي
	if (err != nil || (resp != nil && resp.StatusCode != http.StatusOK)) && downloadURL != defaultInstallerFallbackURL {
		if resp != nil {
			resp.Body.Close()
		}
		slog.Warn("Primary download URL failed, falling back to direct GitHub releases URL", "failed_url", downloadURL)
		fallbackReq, fErr := http.NewRequestWithContext(ctx, "GET", defaultInstallerFallbackURL, nil)
		if fErr == nil {
			fallbackReq.Header.Set("User-Agent", "GridoStudio-Desktop")
			resp, err = client.Do(fallbackReq)
		}
	}
	if err != nil {
		return fmt.Errorf("failed to download update: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status: %s", resp.Status)
	}

	// 🛡️ رفض أي نوع محتوى غير ملف تنفيذي
	contentType := strings.ToLower(strings.TrimSpace(resp.Header.Get("Content-Type")))
	if contentType != "" && !isInstallerContentType(contentType) {
		return fmt.Errorf("refusing to install update: unexpected content type %q", contentType)
	}

	// 🛡️ رفض التحميل مسبقاً إذا أعلن الخادم حجماً يتجاوز السقف
	const maxInstallerSize = 200 * 1024 * 1024 // 200MB max
	if resp.ContentLength > maxInstallerSize {
		return fmt.Errorf("refusing to install update: declared size %d exceeds limit of %d bytes", resp.ContentLength, maxInstallerSize)
	}

	// منع تنظيف مجلد التحديثات أثناء التحميل (متزامن مع CleanupTempUpdates)
	updateMutex.Lock()
	defer updateMutex.Unlock()

	tempDir := filepath.Join(os.TempDir(), "grido-updates")
	if err := os.MkdirAll(tempDir, 0700); err != nil {
		return fmt.Errorf("failed to create temp dir: %w", err)
	}

	// 🛡️ TOCTOU: اسم عشوائي غير قابل للتوقع لكل جلسة تحميل، مع إنشاء حصري (O_EXCL)
	// وأذونات 0700 — يمنع أي عملية محلية من الاستباق على المسار أو استبدال الملف
	// بين التحقق من البصمة والتنفيذ.
	randBytes := make([]byte, 16)
	if _, err := rand.Read(randBytes); err != nil {
		return fmt.Errorf("failed to generate random installer name: %w", err)
	}
	installerPath := filepath.Join(tempDir, fmt.Sprintf("GridoStudio-Setup-%s.exe", hex.EncodeToString(randBytes)))

	out, err := os.OpenFile(installerPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0700)
	if err != nil {
		return fmt.Errorf("failed to create installer file exclusively: %w", err)
	}

	// 🛡️ حساب بصمة SHA-256 أثناء التحميل (تيار واحد: ملف + تقدم + هاش)
	hasher := sha256.New()
	pw := &progressWriter{
		total: resp.ContentLength,
		ctx:   ctx,
	}

	mw := io.MultiWriter(out, pw, hasher)
	// 🛡️ كاتب محدود يفشل فوراً عند تجاوز السقف بدل الاقتطاع الصامت
	limitedWriter := &limitedWriter{w: mw, limit: maxInstallerSize}
	if _, err := io.Copy(limitedWriter, resp.Body); err != nil {
		_ = out.Close()
		_ = os.Remove(installerPath)
		return fmt.Errorf("failed to save update file: %w", err)
	}
	if err := out.Sync(); err != nil {
		_ = out.Close()
		_ = os.Remove(installerPath)
		return fmt.Errorf("failed to sync update file: %w", err)
	}
	if err := out.Close(); err != nil {
		_ = os.Remove(installerPath)
		return fmt.Errorf("failed to close update file: %w", err)
	}

	// 🛡️ فرض مطابقة البصمة قبل أي تشغيل — إغلاق كامل عند الاختلاف لمنع تنفيذ ملف معدل
	actual := hex.EncodeToString(hasher.Sum(nil))
	if actual != expected {
		_ = os.Remove(installerPath)
		slog.Error("Update installer checksum mismatch — refusing to run",
			"expected", expected, "actual", actual)
		return fmt.Errorf("فشل التحقق من سلامة ملف التحديث (بصمة SHA-256 غير مطابقة). تم حذف الملف وحظر التثبيت")
	}
	slog.Info("Update installer checksum verified", "sha256", actual)

	// 🔏 المرحلة الثانية: التوقيع بمفتاح عام مثبّت في الثنائي.
	// البصمة وحدها ثقة بالمصدر نفسه (من يزوّر الملف يزوّر بصمته)، والتوقيع
	// يكسر هذا الاقتران لأنه يلزمه مفتاح خاص لا يوجد إلّا عند الناشر.
	if strings.TrimSpace(UpdaterPublicKey) == "" {
		// بناء لم يُهيَّأ بمفتاح عام: نُبقي السلوك القديم (بصمة فقط) لكن بتسجيل
		// صريح حتى لا يبدو الوضع “مُتحقَّقاً منه” وهو ليس كذلك.
		slog.Warn("Update signature verification disabled: no pinned updater public key in this build",
			"hint", "inject one at build time (-X grido/internal/service.UpdaterPublicKey=...)")
	} else if err := verifyInstallerSignature(UpdaterPublicKey, actual, signatureBase64); err != nil {
		_ = os.Remove(installerPath)
		slog.Error("Update installer signature verification failed — refusing to run",
			"error", err.Error(), "sha256", actual)
		return fmt.Errorf("رفض تثبيت التحديث: التوقيع غير صالح أو مفقود (%v). حُذف الملف ولم يُنفَّذ", err)
	} else {
		slog.Info("Update installer signature verified against pinned public key")
	}

	if application.Get() != nil {
		application.Get().Event.Emit("update-progress", 100)
	}

	// Execute user-scope NSIS installer in silent mode (/S)
	if err := runInstaller(installerPath, "/S"); err != nil {
		return fmt.Errorf("فشل تشغيل مثبت التحديث: %w", err)
	}

	// ⏱️ بدل نوم أعمى 200ms: ننتظر رصد عملية المثبت نفسها (بحد أقصى 3s) ثم نُغلق.
	// النوم الثابت كان سابقاً زمنياً حقيقياً: إن لم يكن المثبت قد بدأ بعدُ فقد
	// نُغلق التطبيق وملفّاته مقفلة أمامه، وإن بدأ بسرعة فقد تأخّرنا بلا سبب.
	if !waitForInstallerStart(installerPath, 3*time.Second) {
		slog.Warn("Installer process not observed before shutdown window — quitting anyway", "installer", installerPath)
	}

	// إغلاق نظيف عبر Wails Runtime بدل os.Exit — يضمن تنفيذ OnShutdown
	// (حفظ حالة النافذة، إيقاف مهام الخلفية، وإغلاق قاعدة البيانات) قبل خروج العملية،
	// ويحرر أقفال الملفات و Single-Instance Mutex بشكل طبيعي ليستبدلها المثبت.
	if application.Get() != nil {
		application.Get().Quit()
	}
	return nil
}

// isInstallerContentType يتحقق أن نوع المحتوى ملف تنفيذي Windows مقبول
func isInstallerContentType(contentType string) bool {
	for _, allowed := range []string{
		"application/octet-stream",
		"application/x-msdownload",
		"application/x-msdos-program",
		"application/exe",
		"application/vnd.microsoft.portable-executable",
	} {
		if strings.HasPrefix(contentType, allowed) {
			return true
		}
	}
	return false
}

// limitedWriter يفشل عند تجاوز حد الحجم بدل السماح بالاقتطاع الصامت
type limitedWriter struct {
	w       io.Writer
	limit   int64
	written int64
}

func (lw *limitedWriter) Write(p []byte) (int, error) {
	if lw.written+int64(len(p)) > lw.limit {
		return 0, fmt.Errorf("update file exceeds size limit of %d bytes", lw.limit)
	}
	n, err := lw.w.Write(p)
	lw.written += int64(n)
	return n, err
}
