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
