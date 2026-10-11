package repository

import (
	"testing"
	"time"

	"grido/internal/core/domain"
)

func TestComputeProfileSignature(t *testing.T) {
	profile := &domain.UserProfile{
		ID:        "test-user",
		Plan:      "pro",
		Status:    "active",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	sig1, err := ComputeProfileSignature(profile)
	if err != nil {
		t.Fatalf("ComputeProfileSignature failed: %v", err)
	}

	// Should be deterministic for the same input
	sig2, _ := ComputeProfileSignature(profile)
	if sig1 != sig2 {
		t.Errorf("Expected deterministic signatures, got %s and %s", sig1, sig2)
	}

	// Modifying fields should yield a different signature
	profile.Plan = "enterprise"
	sig3, _ := ComputeProfileSignature(profile)
	if sig1 == sig3 {
		t.Errorf("Expected signature to change when profile plan changes")
	}
}

func TestSaveAndVerifyLicenseSignature(t *testing.T) {
	profile := &domain.UserProfile{
		ID:        "test-user-verify",
		Plan:      "pro",
		Status:    "active",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	// Clear signature before testing
	_ = ClearLicenseSignature()
	defer ClearLicenseSignature()

	// Verify before saving should fail (signature file not exists)
	if VerifyLicenseSignature(profile) {
		t.Error("Expected verification to fail when no signature is saved")
	}

	// Save signature
	err := SaveLicenseSignature(profile)
	if err != nil {
		t.Fatalf("SaveLicenseSignature failed: %v", err)
	}

	// Verification should now succeed
	if !VerifyLicenseSignature(profile) {
		t.Error("Expected verification to succeed for valid signature")
	}

	// Free plans should always verify
	freeProfile := &domain.UserProfile{
		ID:   "free-user",
		Plan: "free",
	}
	if !VerifyLicenseSignature(freeProfile) {
		t.Error("Expected verification to succeed for free plan")
	}

	// Modifying profile should cause verification to fail
	tamperedProfile := &domain.UserProfile{
		ID:        "test-user-verify",
		Plan:      "enterprise", // modified from "pro"
		Status:    "active",
		ExpiresAt: profile.ExpiresAt,
	}
	if VerifyLicenseSignature(tamperedProfile) {
		t.Error("Expected verification to fail for tampered profile")
	}
}
