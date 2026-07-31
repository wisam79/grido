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
	"sync"
	"time"

	"golang.org/x/crypto/hkdf"
	"golang.org/x/crypto/pbkdf2"

	"grido/internal/core/domain"
)

// writeSecureFile writes data to a temporary file first and renames it atomically
// to prevent file corruption in case of unexpected crashes.
func writeSecureFile(path string, data []byte) error {
	tmpPath := path + ".tmp"
	defer func() {
		_ = os.Remove(tmpPath)
	}()

	f, err := os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	if _, err := f.Write(data); err != nil {
		f.Close()
		return err
	}
	if err := f.Sync(); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}

	return os.Rename(tmpPath, path)
}

// derivedKeyCache يخزن المفاتيح المشتقة لكل عملية لمنع إعادة اشتقاق PBKDF2
// (600K تكرار) مع كل استدعاء — المفاتيح حتمية لكل جهاز فلا خطر من التخزين المؤقت.
var derivedKeyCache sync.Map // salt → []byte

// deriveKey derives a 32-byte key using PBKDF2 with 600,000 iterations.
func deriveKey(deviceID, salt string) []byte {
	if cached, ok := derivedKeyCache.Load(salt); ok {
		return cached.([]byte)
	}
	key := pbkdf2.Key([]byte(deviceID), []byte(salt), 600_000, 32, sha256.New)
	derivedKeyCache.Store(salt, key)
	return key
}

// deriveEncryptionKey derives a 32-byte AES-GCM key from the device ID.
func deriveEncryptionKey(deviceID string) []byte {
	salt := "grido-encryption-key-salt-v2"
	master := deriveKey(deviceID, salt)
	// HKDF-expand to produce the final encryption key, separated from signing
	r := hkdf.Expand(sha256.New, master, []byte("encryption-key"))
	out := make([]byte, 32)
	_, _ = io.ReadFull(r, out)
	return out
}

// deriveSigningKey derives a 32-byte HMAC key from the device ID.
func deriveSigningKey(deviceID string) []byte {
	salt := "grido-signing-key-salt-v2"
	master := deriveKey(deviceID, salt)
	r := hkdf.Expand(sha256.New, master, []byte("signing-key"))
	out := make([]byte, 32)
	_, _ = io.ReadFull(r, out)
	return out
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

	return deriveKey(deviceID, "grido-license-master-key-v2"), nil
}

// ComputeProfileSignature computes a HMAC-SHA256 signature for the user profile.
func ComputeProfileSignature(profile *domain.UserProfile) (string, error) {
	if profile == nil || profile.ID == "" {
		return "", errors.New("invalid profile for signature computation")
	}

	deviceID := GetDeviceID()
	if deviceID == "" {
		deviceID = getFallbackDeviceID()
	}
	key := deriveSigningKey(deviceID)

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
// لا يكتب شيئاً إذا لم يتقدم الزمن الموقّع المخزّن — يمنع كتابة القرص مع كل فحص حالة.
func UpdateLastTime(t time.Time) error {
	path := filepath.Join(GetAppDir(), ".license_time")

	// Skip the write when the stored time is already ahead or equal (not newer)
	if existing, err := readLicenseTime(path); err == nil {
		if t.Unix() <= existing {
			return nil
		}
	}

	deviceID := GetDeviceID()
	if deviceID == "" {
		deviceID = getFallbackDeviceID()
	}
	key := deriveSigningKey(deviceID)

	unixStr := strconv.FormatInt(t.Unix(), 10)
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(unixStr))
	sigHex := hex.EncodeToString(mac.Sum(nil))

	payload := fmt.Sprintf("%s|%s", unixStr, sigHex)
	return writeSecureFile(path, []byte(payload))
}

// readLicenseTime يقرأ آخر طابع زمني موقّع من الملف (دون التحقق من التوقيع)
func readLicenseTime(path string) (int64, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0, err
	}
	parts := strings.Split(string(data), "|")
	if len(parts) != 2 {
		return 0, errors.New("invalid license time format")
	}
	return strconv.ParseInt(parts[0], 10, 64)
}

// VerifyTime returns false if system clock rollback is detected or time file is tampered with.
func VerifyTime(t time.Time) bool {
	path := filepath.Join(GetAppDir(), ".license_time")
	data, err := os.ReadFile(path)
	if err != nil {
		// لا ملف وقت: إذا وُجد ملف توقيع الترخيص فهذا يعني أن الجهاز مُفعّل سابقاً
		// وحذف ملف الوقت يُعدّ عبثاً (هجوم إعادة الساعة للخلف) → إغلاق حازم.
		if _, sigErr := os.Stat(filepath.Join(GetAppDir(), ".license_signature")); sigErr == nil {
			slog.Warn("License time file missing while signature exists — failing closed (tampering)")
			return false
		}
		return true // أول تشغيل ولم يُخزَّن وقت سابق بعد
	}

	parts := strings.Split(string(data), "|")
	if len(parts) != 2 {
		slog.Warn("License time file has invalid format — failing closed")
		return false
	}

	unixStr := parts[0]
	storedSigHex := parts[1]

	deviceID := GetDeviceID()
	if deviceID == "" {
		deviceID = getFallbackDeviceID()
	}
	key := deriveSigningKey(deviceID)

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

	deviceID := GetDeviceID()
	if deviceID == "" {
		deviceID = getFallbackDeviceID()
	}
	key := deriveEncryptionKey(deviceID)

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

	deviceID := GetDeviceID()
	if deviceID == "" {
		deviceID = getFallbackDeviceID()
	}
	key := deriveEncryptionKey(deviceID)

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

