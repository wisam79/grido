package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"
	"unsafe"

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
}

type UpdaterService struct{}

// CleanupTempUpdates يقوم بتنظيف مجلد التحديثات المؤقتة فورياً لتفادي تراكم ملفات المثبتات
func CleanupTempUpdates() {
	tempDir := filepath.Join(os.TempDir(), "grido-updates")
	_ = os.RemoveAll(tempDir)
}

func NewUpdaterService() *UpdaterService {
	// تنظيف ملفات التحديث المهجورة في الخلفية فور بدء التشغيل
	go CleanupTempUpdates()
	return &UpdaterService{}
}

func (u *UpdaterService) CheckForUpdate() (*UpdateInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	// 1. محاولة الاستعلام أولاً من خادم الوكيل الخاص بـ Grido (الذي يمتلك صلاحية الوصول للمستودع الخاص)
	versionURL := "https://grido.cloud-ip.cc/api/version"
	req, err := http.NewRequest("GET", versionURL, nil)
	if err != nil {
		req, _ = http.NewRequest("GET", "https://api.github.com/repos/wisam79/grido/releases/latest", nil)
	}
	req.Header.Set("User-Agent", "GridoStudio-Desktop")

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		// احتياطي ثانٍ للاتصال بمستودع GitHub المباشر
		reqDirect, _ := http.NewRequest("GET", "https://api.github.com/repos/wisam79/grido/releases/latest", nil)
		reqDirect.Header.Set("User-Agent", "GridoStudio-Desktop")
		respDirect, errDirect := client.Do(reqDirect)
		if errDirect == nil && respDirect.StatusCode == http.StatusOK {
			resp = respDirect
		} else {
			if respDirect != nil {
				respDirect.Body.Close()
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
	}

	if err := json.Unmarshal(body, &ghRelease); err != nil {
		return nil, err
	}

	latestTag := strings.TrimPrefix(ghRelease.TagName, "v")
	currentTag := strings.TrimPrefix(AppVersion, "v")
	if currentTag == "dev" || currentTag == "" {
		currentTag = "0.0.0"
	}

	hasUpdate := isVersionGreater(latestTag, currentTag)

	return &UpdateInfo{
		HasUpdate:      hasUpdate,
		CurrentVersion: AppVersion,
		LatestVersion:  ghRelease.TagName,
		ReleaseNotes:   ghRelease.Body,
		DownloadURL:    "https://grido.cloud-ip.cc/api/download",
	}, nil
}

func isVersionGreater(v1, v2 string) bool {
	if v1 == v2 || v1 == "" {
		return false
	}
	var n1, n2, n3 int
	var m1, m2, m3 int
	_, _ = fmt.Sscanf(v1, "%d.%d.%d", &n1, &n2, &n3)
	_, _ = fmt.Sscanf(v2, "%d.%d.%d", &m1, &m2, &m3)

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

func (u *UpdaterService) DownloadAndInstall(ctx context.Context, downloadURL string) error {
	if downloadURL == "" {
		downloadURL = "https://grido.cloud-ip.cc/api/download"
	}

	req, err := http.NewRequestWithContext(ctx, "GET", downloadURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "GridoStudio-Desktop")

	resp, err := http.DefaultClient.Do(req)
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

	pw := &progressWriter{
		total: resp.ContentLength,
		ctx:   ctx,
	}

	mw := io.MultiWriter(out, pw)
	if _, err := io.Copy(mw, resp.Body); err != nil {
		out.Close()
		return fmt.Errorf("failed to save update file: %w", err)
	}
	out.Close()

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

func runAsAdmin(exePath string, args string) error {
	shell32 := syscall.NewLazyDLL("shell32.dll")
	shellExecute := shell32.NewProc("ShellExecuteW")

	verb, _ := syscall.UTF16PtrFromString("runas")
	exe, _ := syscall.UTF16PtrFromString(exePath)
	params, _ := syscall.UTF16PtrFromString(args)
	dir, _ := syscall.UTF16PtrFromString(filepath.Dir(exePath))

	ret, _, _ := shellExecute.Call(
		0,
		uintptr(unsafe.Pointer(verb)),
		uintptr(unsafe.Pointer(exe)),
		uintptr(unsafe.Pointer(params)),
		uintptr(unsafe.Pointer(dir)),
		1,
	)

	if ret <= 32 {
		return fmt.Errorf("ShellExecute failed with code %d", ret)
	}

	return nil
}

