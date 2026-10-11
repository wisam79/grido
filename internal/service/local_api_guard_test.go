package service

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// 🛡️ عقد حارس مسارات /api المحلية: الأصل المطابق وحده لا يكفي، وتوكن الجلسة
// إلزامي — وغياب التوكن (فشل تهيئة) يعني رفضاً دائماً لا انفتاحاً.
func TestLocalApiGuardAuthorize(t *testing.T) {
	const token = "3f1c0d9b7a2e4f5681920ab3cd4e5f60718293a4b5c6d7e8f90123456789abcd"

	tests := []struct {
		name       string
		guardToken string
		origin     string
		headerTok  string
		wantAllow  bool
	}{
		{
			name:       "valid token without origin (local process with token)",
			guardToken: token,
			headerTok:  token,
			wantAllow:  true,
		},
		{
			name:       "valid token with same-host origin",
			guardToken: token,
			origin:     "http://localhost:9245",
			headerTok:  token,
			wantAllow:  true,
		},
		{
			name:       "missing token is rejected even without origin",
			guardToken: token,
			wantAllow:  false,
		},
		{
			name:       "wrong token is rejected",
			guardToken: token,
			headerTok:  "0000000000000000000000000000000000000000000000000000000000000000",
			wantAllow:  false,
		},
		{
			name:       "token prefix is not accepted",
			guardToken: token,
			headerTok:  token[:32],
			wantAllow:  false,
		},
		{
			name:       "cross-origin with a valid token is still rejected",
			guardToken: token,
			origin:     "https://evil.example.com",
			headerTok:  token,
			wantAllow:  false,
		},
		{
			name:       "cross-origin without a token is rejected",
			guardToken: token,
			origin:     "https://evil.example.com",
			wantAllow:  false,
		},
		{
			name:       "unparsable origin is rejected",
			guardToken: token,
			origin:     "://bad origin",
			headerTok:  token,
			wantAllow:  false,
		},
		{
			name:       "guard without a token fails closed",
			guardToken: "",
			headerTok:  token,
			wantAllow:  false,
		},
		{
			name:       "guard without a token fails closed even without a header",
			guardToken: "",
			wantAllow:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			guard := NewLocalApiGuard(tt.guardToken)

			req := httptest.NewRequest(http.MethodPost, "/api/upload-media", strings.NewReader("body"))
			req.Host = "localhost:9245"
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			if tt.headerTok != "" {
				req.Header.Set(LocalApiSessionHeader, tt.headerTok)
			}

			recorder := httptest.NewRecorder()
			allowed := guard.Authorize(recorder, req)

			if allowed != tt.wantAllow {
				t.Fatalf("Authorize() = %v, want %v (status=%d body=%q)",
					allowed, tt.wantAllow, recorder.Code, recorder.Body.String())
			}
			if !tt.wantAllow && recorder.Code != http.StatusForbidden {
				t.Fatalf("rejection status = %d, want %d", recorder.Code, http.StatusForbidden)
			}
			if tt.wantAllow && recorder.Code != http.StatusOK {
				t.Fatalf("allowed request must not write a status; got %d", recorder.Code)
			}
		})
	}
}
