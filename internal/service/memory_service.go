package service

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

// MemoryService manages native memory compaction and OS working set trimming.
type MemoryService struct {
	mu     sync.Mutex
	stopCh chan struct{}
}

func NewMemoryService() *MemoryService {
	return &MemoryService{
		stopCh: make(chan struct{}),
	}
}

// StartAutoTrim starts periodic background memory trimming every 30 seconds,
// with an initial trim 4 seconds after launch to clear startup bloat.
func (s *MemoryService) StartAutoTrim(ctx context.Context) {
	go func() {
		// First cleanup cycle shortly after startup
		select {
		case <-time.After(4 * time.Second):
			s.TrimNow()
		case <-ctx.Done():
			return
		case <-s.stopCh:
			return
		}

		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-s.stopCh:
				return
			case <-ticker.C:
				s.TrimNow()
			}
		}
	}()
}

// Stop halts the background auto-trim routine.
func (s *MemoryService) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	select {
	case <-s.stopCh:
	default:
		close(s.stopCh)
	}
}

// TrimNow triggers immediate memory compaction across Go runtime and WebView2 processes.
func (s *MemoryService) TrimNow() {
	slog.Debug("Executing native memory trim cycle")
	trimPlatformMemory()
}
