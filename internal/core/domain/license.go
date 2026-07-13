package domain

import (
	"time"
)

type UserProfile struct {
	ID         string    `json:"id" gorm:"primaryKey"`
	Name       string    `json:"name"`
	Email      string    `json:"email" gorm:"uniqueIndex"`
	Plan       string    `json:"plan"` // "free", "trial", "pro", "enterprise"
	Token        string    `json:"token" gorm:"-"`
	RefreshToken string    `json:"refreshToken" gorm:"-"`
	CreatedAt    time.Time `json:"createdAt"`
	ExpiresAt    time.Time `json:"expiresAt"` // Expiry of subscription or trial
	LicenseKey   string    `json:"licenseKey"`
	Status       string    `json:"status"` // "active", "expired", "none"
	UpdatedAt    time.Time `json:"updatedAt"`
}

func (u *UserProfile) IsEntitled() bool {
	if u.Plan == "pro" || u.Plan == "enterprise" {
		if u.Status == "active" && time.Now().Before(u.ExpiresAt) {
			return true
		}
	} else if u.Plan == "trial" {
		if time.Now().Before(u.ExpiresAt) {
			return true
		}
	}
	return false
}

type LicenseRepository interface {
	Save(profile *UserProfile) error
	Get() (*UserProfile, error)
	Clear() error
	GetAll() ([]UserProfile, error)
	SaveUser(profile *UserProfile) error
	DeleteUser(id string) error
}
