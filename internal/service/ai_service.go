package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

var supabaseAiDisabled = false

type AIRateEntry struct {
	count    int
	resetDay string
}

type AIRateLimiter struct {
	mu    sync.Mutex
	usage map[string]*AIRateEntry
}

var GlobalAIRateLimiter = &AIRateLimiter{
	usage: make(map[string]*AIRateEntry),
}

func (l *AIRateLimiter) Reserve(key string, limit int) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	entry, exists := l.usage[key]
	if !exists || entry.resetDay != today {
		entry = &AIRateEntry{count: 0, resetDay: today}
		l.usage[key] = entry
	}

	if entry.count >= limit {
		return fmt.Errorf("تم تجاوز الحد اليومي لاستخدام الذكاء الاصطناعي (%d صورة/يومياً). يتجدد الرصيد غداً", limit)
	}
	
	entry.count++
	return nil
}

func (l *AIRateLimiter) Rollback(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	today := time.Now().Format("2006-01-02")
	entry, exists := l.usage[key]
	if exists && entry.resetDay == today && entry.count > 0 {
		entry.count--
	}
}
type AIService struct{}

func NewAIService() *AIService {
	return &AIService{}
}

const (
	maxAIResponseSize = 50 * 1024 * 1024 // 50MB max AI response
	defaultModalAIURL = "https://wisamsamir78--grido-ai-upscaler-imageenhancer-enhance.modal.run"
)

func (s *AIService) EnhanceImageWithAI(base64Image string, token string, limit int) (string, error) {
	rateKey := "anonymous"
	if token != "" {
		tokenHash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))[:16]
		rateKey = tokenHash
	}
	if err := GlobalAIRateLimiter.Reserve(rateKey, limit); err != nil {
		return "", err
	}
	
	// Flag to track if the request succeeded. If not, we rollback the usage.
	success := false
	defer func() {
		if !success {
			GlobalAIRateLimiter.Rollback(rateKey)
		}
	}()

	modalURL := ModalAIURL
	if modalURL == "" {
		modalURL = defaultModalAIURL
	}

	payload, err := json.Marshal(map[string]interface{}{
		"image":      base64Image,
		"dailyLimit": limit,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", modalURL, bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	} else if aiKey, err := GetModalAIKey(); err == nil && aiKey != "" {
		// Fallback to static key if no user token (for backward compatibility/testing)
		req.Header.Set("X-Grido-Api-Key", aiKey)
	}

	client := &http.Client{Timeout: 3 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("خطأ في الاتصال بخادم الذكاء الاصطناعي: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxAIResponseSize))
	if err != nil {
		return "", fmt.Errorf("فشل قراءة الرد من الخادم: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errRes struct {
			Error string `json:"error"`
		}
		if err := json.Unmarshal(body, &errRes); err == nil && errRes.Error != "" {
			return "", errors.New(errRes.Error)
		}
		return "", fmt.Errorf("فشل خادم الذكاء الاصطناعي: %d", resp.StatusCode)
	}

	success = true
	return string(body), nil
}
