package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"grido/internal/core/domain"
)

// writeSecureFile writes data to a temporary file first and renames it atomically
// to prevent file corruption in case of unexpected crashes.
func writeSecureFile(path string, data []byte) error {
	tmpPath := path + ".tmp"
	defer func() {
		_ = os.Remove(tmpPath)
	}()

	if err := os.WriteFile(tmpPath, data, 0600); err != nil {
		return err
	}

	return os.Rename(tmpPath, path)
}

// LoadOrCreateMasterKey derives a deterministic 32-byte master key from the
// device ID plus a fixed salt. The previous implementation stored the key in a
// plaintext file (.license_masterkey) which allowed anyone with filesystem
// access to forge license signatures. Deriving from the device ID removes the
// plaintext file while keeping the key stable across restarts.
func LoadOrCreateMasterKey() ([]byte, error) {
	deviceID := GetDeviceID()
	if deviceID == "" {
		deviceID = getFallbackDeviceID()
	}

	salt := "grido-studio-license-key-salt-v1"
	h := hmac.New(sha256.New, []byte(salt))
	h.Write([]byte(deviceID))
	key := h.Sum(nil)

	return key, nil
}

// ComputeProfileSignature computes a HMAC-SHA256 signature for the user profile.
func ComputeProfileSignature(profile *domain.UserProfile) (string, error) {
	if profile == nil || profile.ID == "" {
		return "", errors.New("invalid profile for signature computation")
	}

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
	return writeSecureFile(path, []byte(sig))
}

// VerifyLicenseSignature checks if the local signature matches the profile.
func VerifyLicenseSignature(profile *domain.UserProfile) bool {
	if profile == nil || profile.ID == "" {
		return false
	}
	if profile.Plan == "free" {
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

	return hmac.Equal([]byte(computedSig), storedSigBytes)
}

// ClearLicenseSignature deletes local key and signature files.
func ClearLicenseSignature() error {
	appDir := GetAppDir()
	_ = os.Remove(filepath.Join(appDir, ".license_signature"))
	_ = os.Remove(filepath.Join(appDir, ".license_time"))
	_ = os.Remove(filepath.Join(appDir, ".license_masterkey"))
	return nil
}

// UpdateLastTime records the last known time signed with HMAC to prevent clock rollback tampering.
func UpdateLastTime(t time.Time) error {
	key, err := LoadOrCreateMasterKey()
	if err != nil {
		return err
	}

	unixStr := strconv.FormatInt(t.Unix(), 10)
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(unixStr))
	sigHex := hex.EncodeToString(mac.Sum(nil))

	payload := fmt.Sprintf("%s|%s", unixStr, sigHex)
	path := filepath.Join(GetAppDir(), ".license_time")
	return writeSecureFile(path, []byte(payload))
}

// VerifyTime returns false if system clock rollback is detected or time file is tampered with.
func VerifyTime(t time.Time) bool {
	path := filepath.Join(GetAppDir(), ".license_time")
	data, err := os.ReadFile(path)
	if err != nil {
		return true // No previous run time stored yet
	}

	parts := strings.Split(string(data), "|")
	if len(parts) != 2 {
		// Fallback for legacy plaintext time format if present
		lastUnix, err := strconv.ParseInt(strings.TrimSpace(string(data)), 10, 64)
		if err != nil {
			return false
		}
		return t.Unix() >= lastUnix-300
	}

	unixStr := parts[0]
	storedSigHex := parts[1]

	key, err := LoadOrCreateMasterKey()
	if err != nil {
		return false
	}

	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(unixStr))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(expectedSig), []byte(storedSigHex)) {
		slog.Warn("License time integrity check failed")
		return false
	}

	lastUnix, err := strconv.ParseInt(unixStr, 10, 64)
	if err != nil {
		return false
	}

	// Allow 5 minutes maximum drift (in case of small sync adjustments)
	return t.Unix() >= lastUnix-300
}

type encryptedTokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// SaveEncryptedToken encrypts the access and refresh tokens using AES-GCM and saves it to .license_token
func SaveEncryptedToken(accessToken, refreshToken string) error {
	if accessToken == "" && refreshToken == "" {
		return ClearEncryptedToken()
	}

	pair := encryptedTokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	payload, err := json.Marshal(pair)
	if err != nil {
		return err
	}

	key, err := LoadOrCreateMasterKey()
	if err != nil {
		return err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return err
	}

	ciphertext := gcm.Seal(nonce, nonce, payload, nil)
	path := filepath.Join(GetAppDir(), ".license_token")
	return writeSecureFile(path, ciphertext)
}

// LoadEncryptedToken reads and decrypts the tokens from .license_token
func LoadEncryptedToken() (string, string, error) {
	path := filepath.Join(GetAppDir(), ".license_token")
	ciphertext, err := os.ReadFile(path)
	if err != nil {
		return "", "", err
	}

	key, err := LoadOrCreateMasterKey()
	if err != nil {
		return "", "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", "", err
	}

	if len(ciphertext) < gcm.NonceSize() {
		return "", "", errors.New("malformed ciphertext")
	}

	nonce, ciphertext := ciphertext[:gcm.NonceSize()], ciphertext[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", "", err
	}

	var pair encryptedTokenPair
	if err := json.Unmarshal(plaintext, &pair); err != nil {
		// Fallback for backward compatibility if the stored token is raw token string
		return string(plaintext), "", nil
	}

	return pair.AccessToken, pair.RefreshToken, nil
}

// ClearEncryptedToken removes the saved token
func ClearEncryptedToken() error {
	path := filepath.Join(GetAppDir(), ".license_token")
	return os.Remove(path)
}

