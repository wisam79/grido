package service

import (
	"testing"
)

func TestIsVersionGreater(t *testing.T) {
	tests := []struct {
		v1       string
		v2       string
		expected bool
	}{
		{"1.0.1", "1.0.0", true},
		{"1.0.0", "1.0.1", false},
		{"1.1.0", "1.0.9", true},
		{"2.0.0", "1.9.9", true},
		{"1.0.1", "1.0.1", false},
		// صيغ غير عادية
		{"1.0", "1.0.0", false},
		{"1.0.0", "1.0", false}, // it parses 1.0 as 1.0.0
		// لاحقات
		{"1.0.2-beta", "1.0.1", true},
		{"1.0.2", "1.0.2-alpha", false},
		// قيم فارغة
		{"", "1.0.0", false},
		{"1.0.0", "", true},
		{"", "", false},
	}

	for _, tt := range tests {
		result := isVersionGreater(tt.v1, tt.v2)
		if result != tt.expected {
			t.Errorf("isVersionGreater(%q, %q) = %v; expected %v", tt.v1, tt.v2, result, tt.expected)
		}
	}
}

func TestExtractInstallerDownloadURL(t *testing.T) {
	tests := []struct {
		name     string
		assets   []ReleaseAsset
		expected string
	}{
		{
			name: "installer exe asset",
			assets: []ReleaseAsset{
				{Name: "grido-checksums.txt", BrowserDownloadURL: "https://example.com/checksums.txt"},
				{Name: "GridoStudio.exe", BrowserDownloadURL: "https://example.com/portable.exe"},
				{Name: "GridoStudio-installer.exe", BrowserDownloadURL: "https://example.com/installer.exe"},
			},
			expected: "https://example.com/installer.exe",
		},
		{
			name: "setup exe asset",
			assets: []ReleaseAsset{
				{Name: "Grido.Studio.Setup.exe", BrowserDownloadURL: "https://example.com/setup.exe"},
			},
			expected: "https://example.com/setup.exe",
		},
		{
			name: "generic exe asset fallback",
			assets: []ReleaseAsset{
				{Name: "GridoStudio.exe", BrowserDownloadURL: "https://example.com/GridoStudio.exe"},
			},
			expected: "https://example.com/GridoStudio.exe",
		},
		{
			name: "private github release asset normalized to domain",
			assets: []ReleaseAsset{
				{Name: "GridoStudio-installer.exe", BrowserDownloadURL: "https://github.com/wisam79/grido/releases/download/v1.14.2/GridoStudio-installer.exe"},
			},
			expected: defaultInstallerFallbackURL,
		},
		{
			name:     "empty assets default fallback",
			assets:   []ReleaseAsset{},
			expected: defaultInstallerFallbackURL,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractInstallerDownloadURL(tt.assets)
			if got != tt.expected {
				t.Errorf("extractInstallerDownloadURL() = %v, want %v", got, tt.expected)
			}
		})
	}
}

