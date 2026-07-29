package service

import (
	"sync"
	"testing"
	"time"
)

func TestAIRateLimiter_ConcurrentRequests(t *testing.T) {
	var wg sync.WaitGroup
	successCount := 0
	var mu sync.Mutex

	// Send 50 concurrent requests, the limit is maxQuota (e.g. 20)
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := GlobalAIRateLimiter.Reserve("test-key", 20); err == nil {
				mu.Lock()
				successCount++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()

	// Should not exceed 20
	if successCount > 20 {
		t.Errorf("expected at most 20 successful reservations, got %d", successCount)
	}
}

func TestAIRateLimiter_DailyReset(t *testing.T) {
	// Consume all quota
	for i := 0; i < 20; i++ {
		err := GlobalAIRateLimiter.Reserve("test-key-2", 20)
		if err != nil {
			t.Fatalf("unexpected error on reservation %d: %v", i+1, err)
		}
	}

	// Next one should fail
	err := GlobalAIRateLimiter.Reserve("test-key-2", 20)
	if err == nil {
		t.Fatal("expected error when exceeding quota, got nil")
	}

	// Mock daily reset by manually modifying the struct fields (if possible) or just testing the public behavior.
	// Since we don't have a way to mock time.Now() globally in this simple limiter, we will simulate it by manipulating the internal state if accessible.
	GlobalAIRateLimiter.mu.Lock()
	if entry, ok := GlobalAIRateLimiter.usage["test-key-2"]; ok {
		entry.resetDay = time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	}
	GlobalAIRateLimiter.mu.Unlock()

	// Now it should succeed because of the simulated daily reset
	err = GlobalAIRateLimiter.Reserve("test-key-2", 20)
	if err != nil {
		t.Fatalf("expected success after daily reset, got: %v", err)
	}
}
