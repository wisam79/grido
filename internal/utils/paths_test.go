package utils

import (
	"path/filepath"
	"testing"
)

func TestPathWithinDir(t *testing.T) {
	base := filepath.Join("root", "media")
	tests := []struct {
		name string
		path string
		want bool
	}{
		{"inside", filepath.Join(base, "img.png"), true},
		{"nested inside", filepath.Join(base, "a", "b.png"), true},
		{"equal is excluded", base, false},
		{"sibling with same prefix", filepath.Join("root", "mediaEvil", "img.png"), false},
		{"parent", "root", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PathWithinDir(tt.path, base); got != tt.want {
				t.Errorf("PathWithinDir(%q, %q) = %v, want %v", tt.path, base, got, tt.want)
			}
		})
	}
}

func TestPathWithinDirInclusive(t *testing.T) {
	base := filepath.Join("root", "exports")
	tests := []struct {
		name string
		path string
		want bool
	}{
		{"equal", base, true},
		{"inside", filepath.Join(base, "x.png"), true},
		{"nested inside", filepath.Join(base, "a", "b.png"), true},
		{"sibling with same prefix", filepath.Join("root", "exportsEvil", "x.png"), false},
		{"parent", "root", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := PathWithinDirInclusive(tt.path, base); got != tt.want {
				t.Errorf("PathWithinDirInclusive(%q, %q) = %v, want %v", tt.path, base, got, tt.want)
			}
		})
	}
}
