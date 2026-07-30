package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// AppVersion يتم حقنها تلقائياً ديناميكياً عند البناء عبر ldflags (مثل -X grido/internal/service.AppVersion=v1.0.2)
var AppVersion = "dev"

type UpdateInfo struct {
	HasUpdate      bool   `json:"has_update"`
	CurrentVersion string `json:"current_version"`
	LatestVersion  string `json:"latest_version"`
	ReleaseNotes   string `json:"release_notes"`
	DownloadURL    string `json:"download_url"`
	// InstallerSHA256 هو بصمة المثبت المتوقعة (SHA-256 hex) كما أعلنها خادم الإصدارات.
	// تُفرض المطابقة عند توفرها، ويُسجل تحذير ويُسماح بالتثبيت عند غيابها (توافقية مع الإصدارات القديمة).
	InstallerSHA256 string `json:"sha256"`
}

type UpdaterService struct{}

const checksumsAssetName = "grido-checksums.txt"

// CleanupTempUpdates يقوم بتنظيف كافّة ملفات والمثبتات المؤقتة الخاصة بـ Grido في مجلد Temp
func CleanupTempUpdates() {
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
		name := entry.Name()
		lowerName := strings.ToLower(name)
		if strings.HasPrefix(lowerName, "gridostudio-") ||
			strings.HasPrefix(lowerName, "grido_") ||
			strings.HasPrefix(lowerName, "grido-") {
			fullPath := filepath.Join(tempDir, name)
			_ = os.RemoveAll(fullPath)
		}
	}
}

func NewUpdaterService() *UpdaterService {
	return &UpdaterService{}
}

func (u *UpdaterService) CheckForUpdate() (*UpdateInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	var resp *http.Response
	var err error

	req, errReq := http.NewRequest("GET", "https://grido.cloud-ip.cc/api/version", nil)
	if errReq == nil {
		req.Header.Set("User-Agent", "GridoStudio-Desktop")
		resp, err = client.Do(req)
	}

	if errReq != nil || err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		// Fallback to GitHub directly
		reqDirect, _ := http.NewRequest("GET", "https://api.github.com/repos/wisam79/grido/releases/latest", nil)
		reqDirect.Header.Set("User-Agent", "GridoStudio-Desktop")
		resp, err = client.Do(reqDirect)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			return &UpdateInfo{
				HasUpdate:      false,
				CurrentVersion: AppVersion,
				LatestVersion:  AppVersion,
				DownloadURL:    "https://grido.cloud-ip.cc/api/download",
			}, nil
		}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1*1024*1024))
	if err != nil {
		return nil, err
	}

	var ghRelease struct {
		TagName string `json:"tag_name"`
		Body    string `json:"body"`
		SHA256  string `json:"sha256"`
		Assets  []struct {
			Name               string `json:"name"`
			BrowserDownloadURL string `json:"browser_download_url"`
		} `json:"assets"`
	}

	if err := json.Unmarshal(body, &ghRelease); err != nil {
		return nil, err
	}

	// إن لم يوفر خادم الإصدارات البصمة مباشرة، نحاول قراءة ملف البصمات من أصول الإصدار (مسار GitHub الاحتياطي)
	expectedSHA := strings.ToLower(strings.TrimSpace(ghRelease.SHA256))
	if expectedSHA == "" {
		for _, asset := range ghRelease.Assets {
			if asset.Name == checksumsAssetName && asset.BrowserDownloadURL != "" {
				if text, fetchErr := fetchTextAsset(client, asset.BrowserDownloadURL); fetchErr == nil {
					expectedSHA = parseChecksumForInstaller(text)
				}
				break
			}
		}
	}

	latestTag := strings.TrimPrefix(ghRelease.TagName, "v")
	currentTag := strings.TrimPrefix(AppVersion, "v")
	if currentTag == "dev" || currentTag == "" {
		currentTag = "0.0.0"
	}

	hasUpdate := isVersionGreater(latestTag, currentTag)

	return &UpdateInfo{
		HasUpdate:       hasUpdate,
		CurrentVersion:  AppVersion,
		LatestVersion:   ghRelease.TagName,
		ReleaseNotes:    ghRelease.Body,
		DownloadURL:     "https://grido.cloud-ip.cc/api/download",
		InstallerSHA256: expectedSHA,
	}, nil
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
	}
	return ""
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
			wailsruntime.EventsEmit(pw.ctx, "update-progress", percentage)
		}
	}
	return n, nil
}

func (u *UpdaterService) DownloadAndInstall(ctx context.Context, downloadURL string, expectedSHA256 string) error {
	if downloadURL == "" {
		downloadURL = "https://grido.cloud-ip.cc/api/download"
	}

	req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "GridoStudio-Desktop")

	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to download update: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status: %s", resp.Status)
	}

	tempDir := filepath.Join(os.TempDir(), "grido-updates")
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return fmt.Errorf("failed to create temp dir: %w", err)
	}

	installerPath := filepath.Join(tempDir, "GridoStudio-Setup-Update.exe")
	_ = os.Remove(installerPath)

	out, err := os.Create(installerPath)
	if err != nil {
		return fmt.Errorf("failed to create installer file: %w", err)
	}

	// 🛡️ حساب بصمة SHA-256 أثناء التحميل (تيار واحد: ملف + تقدم + هاش)
	hasher := sha256.New()
	pw := &progressWriter{
		total: resp.ContentLength,
		ctx:   ctx,
	}

	mw := io.MultiWriter(out, pw, hasher)
	const maxInstallerSize = 200 * 1024 * 1024 // 200MB max
	limitedBody := io.LimitReader(resp.Body, maxInstallerSize)
	if _, err := io.Copy(mw, limitedBody); err != nil {
		out.Close()
		return fmt.Errorf("failed to save update file: %w", err)
	}
	out.Close()

	// 🛡️ فرض مطابقة البصمة قبل أي تشغيل — إغلاق كامل عند الاختلاف لمنع تنفيذ ملف معدل
	expected := strings.ToLower(strings.TrimSpace(expectedSHA256))
	if expected != "" {
		actual := hex.EncodeToString(hasher.Sum(nil))
		if actual != expected {
			_ = os.Remove(installerPath)
			slog.Error("Update installer checksum mismatch — refusing to run",
				"expected", expected, "actual", actual)
			return fmt.Errorf("فشل التحقق من سلامة ملف التحديث (بصمة SHA-256 غير مطابقة). تم حذف الملف وحظر التثبيت")
		}
		slog.Info("Update installer checksum verified", "sha256", actual)
	} else {
		// الإصدارات القديمة لا تعلن بصمة — نسمح مع توثيق تحذير واضح
		slog.Warn("Update installer has no published checksum — proceeding without integrity verification")
	}

	wailsruntime.EventsEmit(ctx, "update-progress", 100)

	// Execute NSIS installer with Administrator elevation and silent mode (/S)
	if err := runAsAdmin(installerPath, "/S"); err != nil {
		return fmt.Errorf("فشل تشغيل مثبت التحديث كمسؤول: %w", err)
	}

	// إغلاق التطبيق فورياً حتى يتم تحرير أقفال الملفات و Single-Instance Mutex قبل أن يستبدل المثبت الملفات
	time.Sleep(200 * time.Millisecond)
	os.Exit(0)
	return nil
}
