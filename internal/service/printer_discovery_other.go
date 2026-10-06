//go:build !windows

package service

import (
	"grido/internal/core/domain"
)

// GetSystemPrinters — stub لأنظمة غير ويندوز: يعيد قائمة فارغة بلا خطأ.
// الدعم الكامل (CUPS) مؤجل لمرحلة لاحقة.
func GetSystemPrinters() ([]domain.PrinterInfo, error) {
	return []domain.PrinterInfo{}, nil
}

// GetDefaultPrinter — stub لأنظمة غير ويندوز.
func GetDefaultPrinter() (string, error) {
	return "", nil
}

// OpenPrinterPreferences — stub لأنظمة غير ويندوز.
func OpenPrinterPreferences(_ string) error {
	return nil
}
