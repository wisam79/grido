//go:build windows

package service

import (
	"fmt"
	"log/slog"
	"os/exec"
	"strings"

	"github.com/alexbrainman/printer"

	"grido/internal/core/domain"
)

// ── استعلام الطابعات المثبتة ──────────────────────────────────────────

// GetSystemPrinters يجلب قائمة الطابعات المثبتة في نظام ويندوز مع تحديد
// الطابعة الافتراضية تلقائياً. يعتمد على مكتبة alexbrainman/printer
// (Pure Go، صفر CGO) — آمن للبناء المتقاطع.
func GetSystemPrinters() ([]domain.PrinterInfo, error) {
	names, err := printer.ReadNames()
	if err != nil {
		return nil, fmt.Errorf("تعذر قراءة قائمة الطابعات: %w", err)
	}

	defaultName, _ := printer.Default()
	defaultName = strings.TrimSpace(defaultName)

	result := make([]domain.PrinterInfo, 0, len(names))
	for _, name := range names {
		trimmed := strings.TrimSpace(name)
		if trimmed == "" {
			continue
		}
		result = append(result, domain.PrinterInfo{
			Name:      trimmed,
			IsDefault: strings.EqualFold(trimmed, defaultName),
		})
	}

	slog.Info("Discovered system printers",
		"count", len(result),
		"default", defaultName,
	)

	return result, nil
}

// GetDefaultPrinter يعيد اسم الطابعة الافتراضية في نظام ويندوز.
func GetDefaultPrinter() (string, error) {
	name, err := printer.Default()
	if err != nil {
		return "", fmt.Errorf("تعذر قراءة الطابعة الافتراضية: %w", err)
	}
	return strings.TrimSpace(name), nil
}

// ── فتح تفضيلات الطابعة (نافذة درايفر المُصنِّع) ────────────────────

// OpenPrinterPreferences يفتح نافذة تفضيلات الطباعة الرسمية للشركة المصنّعة
// (Canon/Epson/Brother) عبر أداة نظام ويندوز القياسية printui.dll (/e = printing preferences).
// لا تحجب IPC — العملية تنطلق بشكل مستقل تماماً.
func OpenPrinterPreferences(printerName string) error {
	printerName = strings.TrimSpace(printerName)
	if printerName == "" {
		return fmt.Errorf("اسم الطابعة فارغ")
	}

	// 🔒 فحص السلامة: حظر محارف التحكم وعلامات التنصيص لتفادي حقن الوسائط
	if strings.ContainsAny(printerName, "\x00\r\n\t\"") {
		return fmt.Errorf("اسم الطابعة يحتوي على محارف غير صالحة")
	}

	cmd := exec.Command("rundll32.exe", "printui.dll,PrintUIEntry", "/e", "/n", printerName)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("تعذر فتح تفضيلات الطابعة '%s': %w", printerName, err)
	}

	slog.Info("Opened printer preferences", "printer", printerName)
	return nil
}
