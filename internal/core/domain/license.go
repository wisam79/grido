package domain

import (
	"time"
)

type UserProfile struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	Name       string    `json:"name"`
	Email      string    `json:"email" gorm:"uniqueIndex"`
	Plan       string    `json:"plan"` // "free", "trial", "pro", "enterprise"
	Token      string    `json:"token" gorm:"-"`
	CreatedAt  time.Time `json:"createdAt"`
	ExpiresAt  time.Time `json:"expiresAt"` // Expiry of subscription or trial
	LicenseKey string    `json:"licenseKey"`
	Status     string    `json:"status"` // "active", "expired", "none"
	UpdatedAt  time.Time `json:"updatedAt"`
}

type LicenseRepository interface {
	Save(profile *UserProfile) error
	Get() (*UserProfile, error)
	Clear() error
	GetAll() ([]UserProfile, error)
	SaveUser(profile *UserProfile) error
	DeleteUser(id string) error
}
