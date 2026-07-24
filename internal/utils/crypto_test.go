package utils

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"grido/internal/core/domain"
)

func init() {
	tempDir, _ := os.MkdirTemp("", "grido-test-utils-global-*")
	appDir := filepath.Join(tempDir, "GridoStudio")
	os.Setenv("GRIDO_APP_DIR", appDir)
	os.Setenv("APPDATA", tempDir)
	os.Setenv("HOME", tempDir)
	os.Setenv("XDG_CONFIG_HOME", tempDir)
}

func TestLoadOrCreateMasterKey(t *testing.T) {
	// Cleanup any existing master key to ensure clean test
	keyPath := filepath.Join(GetAppDir(), ".license_masterkey")
	_ = os.Remove(keyPath)
	defer os.Remove(keyPath)

	key1, err := LoadOrCreateMasterKey()
	if err != nil {
		t.Fatalf("LoadOrCreateMasterKey failed: %v", err)
	}

	if len(key1) != 32 {
		t.Errorf("Expected 32-byte key, got %d bytes", len(key1))
	}

	// Loading again should yield the exact same key
	key2, err := LoadOrCreateMasterKey()
	if err != nil {
		t.Fatalf("LoadOrCreateMasterKey second call failed: %v", err)
	}

	for i := range key1 {
		if key1[i] != key2[i] {
			t.Fatalf("Keys differ at index %d", i)
		}
	}
}

func TestComputeProfileSignature(t *testing.T) {
	profile := &domain.UserProfile{
		ID:        "test-user",
		Plan:      "pro",
		Status:    "active",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	sig1, err := ComputeProfileSignature(profile)
	if err != nil {
		t.Fatalf("ComputeProfileSignature failed: %v", err)
	}

	// Should be deterministic for the same input
	sig2, _ := ComputeProfileSignature(profile)
	if sig1 != sig2 {
		t.Errorf("Expected deterministic signatures, got %s and %s", sig1, sig2)
	}

	// Modifying fields should yield a different signature
	profile.Plan = "enterprise"
	sig3, _ := ComputeProfileSignature(profile)
	if sig1 == sig3 {
		t.Errorf("Expected signature to change when profile plan changes")
	}
}

func TestSaveAndVerifyLicenseSignature(t *testing.T) {
	profile := &domain.UserProfile{
		ID:        "test-user-verify",
		Plan:      "pro",
		Status:    "active",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	// Clear signature before testing
	_ = ClearLicenseSignature()
	defer ClearLicenseSignature()

	// Verify before saving should fail (signature file not exists)
	if VerifyLicenseSignature(profile) {
		t.Error("Expected verification to fail when no signature is saved")
	}

	// Save signature
	err := SaveLicenseSignature(profile)
	if err != nil {
		t.Fatalf("SaveLicenseSignature failed: %v", err)
	}

	// Verify should succeed now
	if !VerifyLicenseSignature(profile) {
		t.Error("Expected verification to succeed")
	}

	// Tampered profile should fail verification
	profile.Plan = "trial"
	if VerifyLicenseSignature(profile) {
		t.Error("Expected verification to fail for tampered profile plan")
	}
}

func TestTimeVerification(t *testing.T) {
	_ = ClearLicenseSignature()
	defer ClearLicenseSignature()

	now := time.Now()

	// VerifyTime should return true if no previous time exists
	if !VerifyTime(now) {
		t.Error("Expected true when no previous time stored")
	}

	// Update last time
	err := UpdateLastTime(now)
	if err != nil {
		t.Fatalf("UpdateLastTime failed: %v", err)
	}

	// Current time should be verified successfully
	if !VerifyTime(now) {
		t.Error("Expected current time to be verified successfully")
	}

	// Rolled back time (1 hour back) should fail verification
	rolledBack := now.Add(-1 * time.Hour)
	if VerifyTime(rolledBack) {
		t.Error("Expected verification to fail for rolled back time")
	}

	// Future time should succeed verification
	future := now.Add(1 * time.Hour)
	if !VerifyTime(future) {
		t.Error("Expected future time to be verified successfully")
	}
}

func TestSaveAndLoadEncryptedToken(t *testing.T) {
	_ = ClearEncryptedToken()
	defer ClearEncryptedToken()

	token := "mock_access_token_123"
	refreshToken := "mock_refresh_token_456"

	err := SaveEncryptedToken(token, refreshToken)
	if err != nil {
		t.Fatalf("SaveEncryptedToken failed: %v", err)
	}

	loadedToken, loadedRefresh, err := LoadEncryptedToken()
	if err != nil {
		t.Fatalf("LoadEncryptedToken failed: %v", err)
	}

	if loadedToken != token {
		t.Errorf("Expected token %q, got %q", token, loadedToken)
	}
	if loadedRefresh != refreshToken {
		t.Errorf("Expected refresh token %q, got %q", refreshToken, loadedRefresh)
	}

	// Test clearing
	_ = ClearEncryptedToken()
	_, _, err = LoadEncryptedToken()
	if err == nil {
		t.Error("Expected error loading cleared token, got nil")
	}
}