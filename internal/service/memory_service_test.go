package service_test

import (
	"context"
	"testing"
	"time"

	"grido/internal/service"
)

func TestMemoryService_TrimNow(t *testing.T) {
	memSvc := service.NewMemoryService()
	memSvc.TrimNow() // Should execute without crashing or hanging
}

func TestMemoryService_Lifecycle(t *testing.T) {
	memSvc := service.NewMemoryService()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	memSvc.StartAutoTrim(ctx)
	time.Sleep(50 * time.Millisecond)
	memSvc.Stop()
}
