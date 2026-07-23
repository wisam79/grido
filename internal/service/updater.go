package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// AppVersion يتم حقنها تلقائياً أثناء البناء أو تعيينها كإصدار افتراضي
var AppVersion = "1.0.2"

type UpdateInfo struct {
	HasUpdate      bool   `json:"has_update"`
	CurrentVersion string `json:"current_version"`
	LatestVersion  string `json:"latest_version"`
	ReleaseNotes   string `json:"release_notes"`
	DownloadURL    string `json:"download_url"`
}

type UpdaterService struct{}

func NewUpdaterService() *UpdaterService {
	return &UpdaterService{}
}

func (u *UpdaterService) CheckForUpdate() (*UpdateInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", "https://api.github.com/repos/wisam79/grido/releases/latest", nil)
	if err != nil {
		return &UpdateInfo{
			HasUpdate:      false,
			CurrentVersion: AppVersion,
			LatestVersion:  AppVersion,
			DownloadURL:    "https://grido.cloud-ip.cc/api/download",
		}, nil
	}
	req.Header.Set("User-Agent", "GridoStudio-Desktop")

	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return &UpdateInfo{
			HasUpdate:      false,
			CurrentVersion: AppVersion,
			LatestVersion:  AppVersion,
			DownloadURL:    "https://grido.cloud-ip.cc/api/download",
		}, nil
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
