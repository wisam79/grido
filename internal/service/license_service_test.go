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

func TestLicenseService_CheckStatus_Offline(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to connect database: %v", err)
	}

	_ = db.AutoMigrate(&domain.UserProfile{})
	repo := repository.NewLicenseRepository(db)
	svc := NewLicenseService(repo)

	// إعداد حساب مفعل محلياً وصالح لمدة 24 ساعة قادمة
	now := time.Now()
	activeUser := &domain.UserProfile{
		ID:        "test-active-user-id",
		Email:     "pro-user@example.com",
		Plan:      "pro",
		Status:    "active",
		ExpiresAt: now.Add(24 * time.Hour),
		UpdatedAt: now,
		Token:     "mock-valid-token",
	}
	_ = repo.Save(activeUser)

	// محاكاة وضع الأوفلاين عبر تحويل عنوان السيرفر إلى منفذ مغلق محلياً
	originalURL := SupabaseURL
	defer func() { SupabaseURL = originalURL }()
	SupabaseURL = "http://127.0.0.1:9999" // عنوان وهمي يسبب فشل اتصال فوري

	// استدعاء فحص الحالة أثناء الأوفلاين
	profile, err := svc.CheckStatus()
	if err != nil {
		t.Fatalf("unexpected error during offline check: %v", err)
	}

	// التأكد من أن الحساب لم يتأثر وظل محتفظاً بالخطة النشطة (Pro)
	if profile.Plan != "pro" || profile.Status != "active" {
		t.Errorf("expected plan pro and status active to be preserved offline, got plan: %s, status: %s", profile.Plan, profile.Status)
	}
}

