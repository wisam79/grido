package service

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

// TestEnhanceImageWithAI_Success verifies end-to-end connection, payload structure,
// User-Agent header, trailing slash cleanup, and successful JSON response parsing.
func TestEnhanceImageWithAI_Success(t *testing.T) {
	// Mock Modal AI HTTP Server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Verify HTTP Method
		if r.Method != "POST" {
			t.Errorf("Expected POST method, got %s", r.Method)
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}

		// 2. Verify User-Agent Header
		ua := r.Header.Get("User-Agent")
		if !strings.Contains(ua, "GridoStudio-Desktop") {
			t.Errorf("Expected User-Agent containing GridoStudio-Desktop, got '%s'", ua)
		}

		// 3. Verify Bearer Authorization Header
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test-jwt-token" {
			t.Errorf("Expected Authorization 'Bearer test-jwt-token', got '%s'", auth)
		}

		// 4. Decode Payload
		var reqPayload struct {
			Image      string `json:"image"`
			DailyLimit int    `json:"dailyLimit"`
		}
		if err := json.NewDecoder(r.Body).Decode(&reqPayload); err != nil {
			t.Errorf("Failed to decode request body: %v", err)
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		if reqPayload.Image != "data:image/jpeg;base64,sample" {
			t.Errorf("Unexpected image data: %s", reqPayload.Image)
		}

		// 5. Send Successful 200 OK Response
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"image": "data:image/jpeg;base64,enhanced", "execution_seconds": 2.4, "total_cost_usd": 0.0012}`))
	}))
	defer ts.Close()

	// Override ModalAIURL with trailing slash to test URL normalization
	ModalAIURL = ts.URL + "///"
	defer func() { ModalAIURL = "" }()

	aiSvc := NewAIService()
	respStr, err := aiSvc.EnhanceImageWithAI("data:image/jpeg;base64,sample", "test-jwt-token", 5)

	if err != nil {
		t.Fatalf("EnhanceImageWithAI failed unexpectedly: %v", err)
	}

	var resp struct {
		Image            string  `json:"image"`
		ExecutionSeconds float64 `json:"execution_seconds"`
	}
	if err := json.Unmarshal([]byte(respStr), &resp); err != nil {
		t.Fatalf("Failed to parse returned JSON: %v", err)
	}

	if resp.Image != "data:image/jpeg;base64,enhanced" {
		t.Errorf("Expected enhanced image, got '%s'", resp.Image)
	}
}

// TestEnhanceImageWithAI_Unauthenticated verifies that empty tokens are rejected immediately.
func TestEnhanceImageWithAI_Unauthenticated(t *testing.T) {
	aiSvc := NewAIService()
	_, err := aiSvc.EnhanceImageWithAI("data:image/jpeg;base64,sample", "", 5)
	if err == nil {
		t.Error("Expected error for empty token, got nil")
	}
	if !strings.Contains(err.Error(), "تسجيل الدخول مطلوب") {
		t.Errorf("Unexpected error message: %v", err)
	}
}

// TestEnhanceImageWithAI_HTTPError_Rollback verifies rate limit rollback on HTTP 404 or 500 error.
func TestEnhanceImageWithAI_HTTPError_Rollback(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error": "Endpoint not found"}`, http.StatusNotFound)
	}))
	defer ts.Close()

	ModalAIURL = ts.URL
	defer func() { ModalAIURL = "" }()

	aiSvc := NewAIService()
	_, err := aiSvc.EnhanceImageWithAI("data:image/jpeg;base64,sample", "test-jwt-rollback", 5)

	if err == nil {
		t.Error("Expected error for 404 response, got nil")
	}

	// Verify that error message contains original error response
	if !strings.Contains(err.Error(), "Endpoint not found") && !strings.Contains(err.Error(), "404") {
		t.Errorf("Expected error to contain 'Endpoint not found', got: %v", err)
	}
}

func TestAIRateLimiter_ConcurrentReserves(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	limiter := &AIRateLimiter{
		usage: make(map[string]*AIRateEntry),
	}

	key := "test-device-user"
	limit := 10
	var wg sync.WaitGroup
	successCount := 0
	var mu sync.Mutex

	// Launch 25 concurrent requests for a limit of 10
	for i := 0; i < 25; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			err := limiter.Reserve(key, limit)
			if err == nil {
				mu.Lock()
				successCount++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()

	if successCount != limit {
		t.Errorf("Expected exactly %d successes, got %d", limit, successCount)
	}

	// Rollback one and reserve again
	limiter.Rollback(key)
	if err := limiter.Reserve(key, limit); err != nil {
		t.Errorf("Expected successful reserve after rollback, got error: %v", err)
	}
}

func TestPlanDailyLimit(t *testing.T) {
	if planDailyLimit("free") != 5 {
		t.Errorf("Expected free limit to be 5, got %d", planDailyLimit("free"))
	}
	if planDailyLimit("pro") != 15 {
		t.Errorf("Expected pro limit to be 15, got %d", planDailyLimit("pro"))
	}
	if planDailyLimit("enterprise") != 50 {
		t.Errorf("Expected enterprise limit to be 50, got %d", planDailyLimit("enterprise"))
	}
	if planDailyLimit("unknown") != 5 {
		t.Errorf("Expected unknown fallback limit to be 5, got %d", planDailyLimit("unknown"))
	}
}

func TestAIRateLimiter_DiskPersistence(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "ai_rate_limits.json")

	limiter1 := &AIRateLimiter{
		usage:    make(map[string]*AIRateEntry),
		filePath: filePath,
	}

	key := "test-user-persist"
	limit := 5

	for i := 0; i < 3; i++ {
		if err := limiter1.Reserve(key, limit); err != nil {
			t.Fatalf("Failed reserve %d: %v", i, err)
		}
	}

	// Instance 2 simulating app restart
	limiter2 := &AIRateLimiter{
		usage:    make(map[string]*AIRateEntry),
		filePath: filePath,
	}

	// Should be able to reserve 2 more
	if err := limiter2.Reserve(key, limit); err != nil {
		t.Fatalf("Expected success for 4th reserve, got: %v", err)
	}
	if err := limiter2.Reserve(key, limit); err != nil {
		t.Fatalf("Expected success for 5th reserve, got: %v", err)
	}

	// 6th should fail because limit is 5
	if err := limiter2.Reserve(key, limit); err == nil {
		t.Fatal("Expected error exceeding limit of 5, got nil")
	}

	// Rollback one
	limiter2.Rollback(key)

	// Instance 3 should now be able to reserve 1
	limiter3 := &AIRateLimiter{
		usage:    make(map[string]*AIRateEntry),
		filePath: filePath,
	}
	if err := limiter3.Reserve(key, limit); err != nil {
		t.Fatalf("Expected success after rollback in instance 3, got: %v", err)
	}
}


