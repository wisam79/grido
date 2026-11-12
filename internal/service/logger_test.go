package service

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"testing"
)

func TestRedactLogAttr(t *testing.T) {
	for _, key := range []string{"email", "token", "access_token", "refreshToken", "Authorization", "body", "password"} {
		attr := redactLogAttr(nil, slog.String(key, "secret-value"))
		if got := attr.Value.String(); got != "[REDACTED]" {
			t.Fatalf("key %q was not redacted: %q", key, got)
		}
	}
}

func TestJSONLoggerRedactsSensitiveAttributes(t *testing.T) {
	var out bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&out, &slog.HandlerOptions{ReplaceAttr: redactLogAttr}))
	logger.InfoContext(context.Background(), "auth", "email", "person@example.com", "token", "abc", "status", 401)

	var record map[string]any
	if err := json.Unmarshal(out.Bytes(), &record); err != nil {
		t.Fatalf("decode log: %v", err)
	}
	if record["email"] != "[REDACTED]" || record["token"] != "[REDACTED]" {
		t.Fatalf("sensitive values leaked: %s", strings.TrimSpace(out.String()))
	}
	if record["status"] != float64(401) {
		t.Fatalf("non-sensitive status changed: %v", record["status"])
	}
}
