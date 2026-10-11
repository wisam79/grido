package utils

import (
	"encoding/hex"
	"strings"
	"testing"
)

func TestGenerateSecureToken(t *testing.T) {
	t.Run("returns requested hex length", func(t *testing.T) {
		token, err := GenerateSecureToken(32)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(token) != 64 {
			t.Fatalf("token length = %d, want 64", len(token))
		}
		if _, err := hex.DecodeString(token); err != nil {
			t.Fatalf("token is not valid hex: %v", err)
		}
	})

	t.Run("tokens are unique across calls", func(t *testing.T) {
		seen := make(map[string]bool, 64)
		for i := 0; i < 64; i++ {
			token, err := GenerateSecureToken(16)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if seen[token] {
				t.Fatalf("duplicate token generated: %s", token)
			}
			seen[token] = true
		}
	})

	t.Run("rejects non-positive length", func(t *testing.T) {
		for _, n := range []int{0, -1} {
			if _, err := GenerateSecureToken(n); err == nil {
				t.Fatalf("expected error for length %d, got nil", n)
			}
		}
	})
}

func TestSecureTokenEqual(t *testing.T) {
	tests := []struct {
		name     string
		provided string
		expected string
		want     bool
	}{
		{name: "exact match", provided: "abcdef", expected: "abcdef", want: true},
		{name: "surrounding whitespace is tolerated", provided: "  abcdef\t", expected: "abcdef", want: true},
		{name: "different value", provided: "abcdef", expected: "abcdeg", want: false},
		{name: "prefix is not enough", provided: "abcde", expected: "abcdef", want: false},
		{name: "empty provided", provided: "", expected: "abcdef", want: false},
		{name: "whitespace-only provided", provided: "   ", expected: "abcdef", want: false},
		{name: "empty expected always fails closed", provided: "abcdef", expected: "", want: false},
		{name: "both empty fails closed", provided: "", expected: "", want: false},
		{name: "case sensitive", provided: "ABCDEF", expected: "abcdef", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := SecureTokenEqual(tt.provided, tt.expected); got != tt.want {
				t.Errorf("SecureTokenEqual(%q, %q) = %v, want %v", tt.provided, tt.expected, got, tt.want)
			}
		})
	}

	t.Run("constant-time compare handles multi-byte input", func(t *testing.T) {
		long := strings.Repeat("a", 64)
		if !SecureTokenEqual(long, long) {
			t.Fatal("expected identical long tokens to compare equal")
		}
		if SecureTokenEqual(long, strings.Repeat("a", 63)+"b") {
			t.Fatal("expected differing long tokens to compare unequal")
		}
	})
}
