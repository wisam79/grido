package utils

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"grido/internal/core/domain"
)

// LoadOrCreateMasterKey returns the 32-byte master key, generating and persisting it if necessary.
func LoadOrCreateMasterKey() ([]byte, error) {
	appDir := GetAppDir()
	path := filepath.Join(appDir, ".license_masterkey")

	if data, err := os.ReadFile(path); err == nil && len(data) >= 32 {
		return data[:32], nil
	}

	key := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, err
	}

	if err := os.WriteFile(path, key, 0600); err != nil {
		return nil, err
	}

	return key, nil
}

// ComputeProfileSignature computes a HMAC-SHA256 signature for the user profile.
func ComputeProfileSignature(profile *domain.UserProfile) (string, error) {
	key, err := LoadOrCreateMasterKey()
	if err != nil {
		return "", err
	}

	// Message is constructed from vital licensing fields.
	msg := fmt.Sprintf("%s|%s|%s|%d", profile.ID, profile.Plan, profile.Status, profile.ExpiresAt.Unix())

	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(msg))
	return hex.EncodeToString(mac.Sum(nil)), nil
}

// SaveLicenseSignature saves the profile's signature to a secure local file.
func SaveLicenseSignature(profile *domain.UserProfile) error {
	if profile == nil || profile.ID == "" || profile.Plan == "free" {
		return nil
	}
	sig, err := ComputeProfileSignature(profile)
	if err != nil {
		return err
	}

	path := filepath.Join(GetAppDir(), ".license_signature")
	return os.WriteFile(path, []byte(sig), 0600)
}

// VerifyLicenseSignature checks if the local signature matches the profile.
func VerifyLicenseSignature(profile *domain.UserProfile) bool {
	if profile == nil || profile.ID == "" || profile.Plan == "free" {
		return true // Free/null profiles don't need verification
	}

	path := filepath.Join(GetAppDir(), ".license_signature")
	storedSigBytes, err := os.ReadFile(path)
	if err != nil {
		slog.Warn("Stored license signature file not found", "error", err)
		return false
	}

	computedSig, err := ComputeProfileSignature(profile)
	if err != nil {
		slog.Warn("Failed to compute profile signature", "error", err)
		return false
	}

	return computedSig == string(storedSigBytes)
}

// ClearLicenseSignature deletes local key and signature files.
func ClearLicenseSignature() error {
	appDir := GetAppDir()
	_ = os.Remove(filepath.Join(appDir, ".license_signature"))
	_ = os.Remove(filepath.Join(appDir, ".license_time"))
	return nil
}

// UpdateLastTime records the last known time to prevent system clock rollback.
func UpdateLastTime(t time.Time) error {
	path := filepath.Join(GetAppDir(), ".license_time")
	val := strconv.FormatInt(t.Unix(), 10)
	return os.WriteFile(path, []byte(val), 0600)
}

// VerifyTime returns false if system clock rollback is detected.
func VerifyTime(t time.Time) bool {
	path := filepath.Join(GetAppDir(), ".license_time")
	data, err := os.ReadFile(path)
	if err != nil {
		return true // No previous run time stored yet
	}

	lastUnix, err := strconv.ParseInt(string(data), 10, 64)
	if err != nil {
		return true
	}

	// Allow 5 minutes maximum drift (in case of small sync adjustments)
	return t.Unix() >= lastUnix-300
}
