package repository

import (
	"crypto/hmac"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

// ComputeProfileSignature computes a HMAC-SHA256 signature for the user profile.
func ComputeProfileSignature(profile *domain.UserProfile) (string, error) {
	if profile == nil || profile.ID == "" {
		return "", errors.New("invalid profile for signature computation")
	}

	key := utils.DeriveSigningKey("")

	// Message is constructed from vital licensing fields.
	msg := fmt.Sprintf("%s|%s|%s|%d", profile.ID, profile.Plan, profile.Status, profile.ExpiresAt.Unix())
	return utils.ComputeHMACSHA256(key, msg), nil
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

	path := filepath.Join(utils.GetAppDir(), ".license_signature")
	return utils.WriteSecureFile(path, []byte(sig))
}

// VerifyLicenseSignature checks if the local signature matches the profile.
func VerifyLicenseSignature(profile *domain.UserProfile) bool {
	if profile == nil || profile.ID == "" {
		return false
	}
	if profile.Plan == "free" {
		return true // Free/null profiles don't need verification
	}

	path := filepath.Join(utils.GetAppDir(), ".license_signature")
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

	return hmac.Equal([]byte(computedSig), storedSigBytes)
}

// ClearLicenseSignature deletes local key and signature files.
func ClearLicenseSignature() error {
	appDir := utils.GetAppDir()
	_ = os.Remove(filepath.Join(appDir, ".license_signature"))
	_ = os.Remove(filepath.Join(appDir, ".license_time"))
	_ = os.Remove(filepath.Join(appDir, ".license_masterkey"))
	return nil
}
