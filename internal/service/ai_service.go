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

func (l *AIRateLimiter) CheckAndIncrement(key string, limit int) error {
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

type AIService struct{}

func NewAIService() *AIService {
	return &AIService{}
}

func (s *AIService) EnhanceImageWithAI(base64Image string, token string, limit int) (string, error) {
	rateKey := "anonymous"
	if token != "" {
		tokenHash := fmt.Sprintf("%x", sha256.Sum256([]byte(token)))[:16]
		rateKey = tokenHash
	}
	if err := GlobalAIRateLimiter.CheckAndIncrement(rateKey, limit); err != nil {
		return "", err
	}

	if token != "" && SupabaseURL != "" {
		url := SupabaseURL + "/functions/v1/ai-enhance"
		payload, err := json.Marshal(map[string]string{
			"image": base64Image,
		})
		if err == nil {
			req, err := http.NewRequest("POST", url, bytes.NewBuffer(payload))
			if err == nil {
				req.Header.Set("Authorization", "Bearer "+token)
				req.Header.Set("Content-Type", "application/json")
				if SupabaseAnonKey != "" {
					req.Header.Set("apikey", SupabaseAnonKey)
				}

				client := &http.Client{Timeout: 3 * time.Minute}
				resp, err := client.Do(req)
				if err == nil {
					defer resp.Body.Close()
					if resp.StatusCode == http.StatusOK {
						body, readErr := io.ReadAll(resp.Body)
						if readErr == nil {
							return string(body), nil
						}
					}
				} else if resp != nil {
					resp.Body.Close()
				}
			}
		}
	}

	modalURL := ModalAIURL
	if modalURL == "" {
		modalURL = "https://wisamsamir78--grido-ai-upscaler-imageenhancer-enhance.modal.run"
	}
	payload, err := json.Marshal(map[string]string{
		"image": base64Image,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", modalURL, bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	if aiKey, err := GetModalAIKey(); err == nil && aiKey != "" {
		req.Header.Set("X-Grido-Api-Key", aiKey)
	}

	client := &http.Client{Timeout: 3 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("خطأ في الاتصال بخادم الذكاء الاصطناعي: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
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

	return string(body), nil
}
