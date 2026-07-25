package handlers

import (
	"grido/internal/core/domain"
	"grido/internal/service"
)

type LicenseHandler struct {
	service *service.LicenseService
}

func NewLicenseHandler(s *service.LicenseService) *LicenseHandler {
	return &LicenseHandler{service: s}
}

func (h *LicenseHandler) RegisterAccount(name, email, password string) (*domain.UserProfile, error) {
	return h.service.Register(name, email, password)
}

func (h *LicenseHandler) VerifyOTP(email, token string) (*domain.UserProfile, error) {
	return h.service.VerifyOTP(email, token)
}

func (h *LicenseHandler) ResendOTP(email string) (*domain.UserProfile, error) {
	return h.service.ResendOTP(email)
}

func (h *LicenseHandler) LoginAccount(email, password string) (*domain.UserProfile, error) {
	return h.service.Login(email, password)
}

func (h *LicenseHandler) LoginWithGoogle() (*domain.UserProfile, error) {
	return h.service.LoginWithGoogle()
}

func (h *LicenseHandler) ActivateLicenseKey(key string) (*domain.UserProfile, error) {
	return h.service.ActivateKey(key)
}

func (h *LicenseHandler) GetLicenseStatus() (*domain.UserProfile, error) {
	return h.service.CheckStatus()
}

func (h *LicenseHandler) Logout() (string, error) {
	err := h.service.Logout()
	if err != nil {
		return "", err
	}
	return "success", nil
}

func (h *LicenseHandler) ResetPassword(email string) (string, error) {
	err := h.service.ResetPassword(email)
	if err != nil {
		return "", err
	}
	return "success", nil
}

func (h *LicenseHandler) VerifyRecoveryOTP(email, token, newPassword string) (*domain.UserProfile, error) {
	return h.service.VerifyRecoveryOTP(email, token, newPassword)
}
