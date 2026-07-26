package service

import (
	"errors"
	"testing"
	"time"

	"grido/internal/core/domain"
)

// Mock Repository للاختبارات
type MockLicenseRepository struct {
	user    *domain.UserProfile
	saveErr error
	getErr  error
}

func (m *MockLicenseRepository) Save(user *domain.UserProfile) error {
	if m.saveErr != nil {
		return m.saveErr
	}
	m.user = user
	return nil
}

func (m *MockLicenseRepository) Get() (*domain.UserProfile, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	return m.user, nil
}

func (m *MockLicenseRepository) Clear() error {
	m.user = nil
	return nil
}

func (m *MockLicenseRepository) GetAll() ([]domain.UserProfile, error) {
	if m.user != nil {
		return []domain.UserProfile{*m.user}, nil
	}
	return []domain.UserProfile{}, nil
}

func (m *MockLicenseRepository) SaveUser(user *domain.UserProfile) error {
	return m.Save(user)
}

func (m *MockLicenseRepository) DeleteUser(id string) error {
	if m.user != nil && m.user.ID == id {
		m.user = nil
	}
	return nil
}

// TestLicenseService_CheckStatus tests the license status checking logic
func TestLicenseService_CheckStatus(t *testing.T) {
	tests := []struct {
		name           string
		mockUser       *domain.UserProfile
		mockGetErr     error
		expectedPlan   string
		expectedStatus string
		expectError    bool
	}{
		{
			name:           "No user - returns free plan",
			mockUser:       nil,
			mockGetErr:     errors.New("no user"),
			expectedPlan:   "free",
			expectedStatus: "none",
			expectError:    false,
		},
		{
			name: "Valid pro user",
			mockUser: &domain.UserProfile{
				ID:        "user123",
				Email:     "test@example.com",
				Plan:      "pro",
				Status:    "active",
				ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
			},
			mockGetErr:     nil,
			expectedPlan:   "pro",
			expectedStatus: "active",
			expectError:    false,
		},
		{
			name: "Expired pro user - should downgrade to free",
			mockUser: &domain.UserProfile{
				ID:        "user123",
				Email:     "test@example.com",
				Plan:      "pro",
				Status:    "active",
				ExpiresAt: time.Now().Add(-24 * time.Hour), // منتهي منذ يوم
			},
			mockGetErr:     nil,
			expectedPlan:   "free",
			expectedStatus: "expired",
			expectError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			mockRepo := &MockLicenseRepository{
				user:   tt.mockUser,
				getErr: tt.mockGetErr,
			}
			service := NewLicenseService(mockRepo)

			// Execute
			result, err := service.CheckStatus()

			// Verify
			if tt.expectError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
			if result == nil {
				t.Fatal("Expected result but got nil")
			}
			if result.Plan != tt.expectedPlan {
				t.Errorf("Expected plan %s, got %s", tt.expectedPlan, result.Plan)
			}
			if result.Status != tt.expectedStatus {
				t.Errorf("Expected status %s, got %s", tt.expectedStatus, result.Status)
			}
		})
	}
}

// TestGetModalAIKey tests the Modal AI key retrieval
func TestGetModalAIKey(t *testing.T) {
	tests := []struct {
		name        string
		setupKey    string
		expectError bool
	}{
		{
			name:        "Key is set",
			setupKey:    "test-key-123",
			expectError: false,
		},
		{
			name:        "Key is empty",
			setupKey:    "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			originalKey := ModalAIKey
			defer func() { ModalAIKey = originalKey }()
			ModalAIKey = tt.setupKey

			t.Setenv("MODAL_AI_KEY", tt.setupKey)
			t.Setenv("GRIDO_AI_SECRET_KEY", tt.setupKey)

			// Execute
			key, err := GetModalAIKey()

			// Verify
			if tt.expectError {
				if err == nil {
					t.Error("Expected error but got none")
				}
				if key != "" {
					t.Error("Expected empty key on error")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if key != tt.setupKey {
					t.Errorf("Expected key %s, got %s", tt.setupKey, key)
				}
			}
		})
	}
}
