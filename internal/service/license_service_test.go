package service

import (
	"grido/internal/core/domain"
	"grido/internal/repository"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestLicenseService_CheckStatus(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}

	_ = db.AutoMigrate(&domain.UserProfile{})
	repo := repository.NewLicenseRepository(db)
	svc := NewLicenseService(repo)

	// 1. اختبار عندما تكون قاعدة البيانات فارغة (يجب أن يعود بخطة مجانية)
	profile, err := svc.CheckStatus()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if profile.Plan != "free" || profile.Status != "none" {
		t.Errorf("expected plan free and status none, got plan: %s, status: %s", profile.Plan, profile.Status)
	}

	// 2. اختبار انتهاء الصلاحية محلياً
	now := time.Now()
	expiredUser := &domain.UserProfile{
		ID:        "test-user-id",
		Email:     "user@example.com",
		Plan:      "pro",
		Status:    "active",
		ExpiresAt: now.Add(-1 * time.Hour), // منتهي الصلاحية قبل ساعة
		UpdatedAt: now,
	}
	_ = repo.Save(expiredUser)

	profile, err = svc.CheckStatus()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if profile.Plan != "free" || profile.Status != "expired" {
		t.Errorf("expected plan free and status expired, got plan: %s, status: %s", profile.Plan, profile.Status)
	}
}
