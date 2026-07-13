package handlers_test

import (
	"grido/internal/core/domain"
	"grido/internal/handlers"
	"grido/internal/repository"
	"grido/internal/service"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory db: %v", err)
	}
	db.AutoMigrate(&domain.UserProfile{})
	return db
}

func TestLicenseHandler_VerifyOTP(t *testing.T) {
	// Skip the full service test since it requires live Supabase credentials.
	// In a real scenario, the Service should be an interface to allow mocking here.
	t.Skip("Skipping LicenseHandler tests as it depends on concrete LicenseService which requires live Supabase")
	
	db := setupTestDB(t)
	repo := repository.NewLicenseRepository(db)
	svc := service.NewLicenseService(repo)
	handler := handlers.NewLicenseHandler(svc)

	_ = handler
}
