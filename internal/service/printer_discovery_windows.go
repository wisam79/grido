//go:build windows

package service

import (
	"fmt"
	"log/slog"
	"strings"
	"syscall"
	"unsafe"

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

var (
	winspool              = syscall.NewLazyDLL("winspool.drv")
	procOpenPrinterW      = winspool.NewProc("OpenPrinterW")
	procClosePrinter      = winspool.NewProc("ClosePrinter")
	procDocumentProperties = winspool.NewProc("DocumentPropertiesW")
)

// OpenPrinterPreferences يفتح نافذة تفضيلات الطابعة الأصلية (Driver UI)
// الخاصة بالشركة المصنّعة (Canon/Epson/Brother) لاختيار نوع الورق
// والجودة يدوياً. لا تحجب IPC — النافذة مستقلة عن حلقة Wails.
func OpenPrinterPreferences(printerName string) error {
	printerName = strings.TrimSpace(printerName)
	if printerName == "" {
		return fmt.Errorf("اسم الطابعة فارغ")
	}

	namePtr, err := syscall.UTF16PtrFromString(printerName)
	if err != nil {
		return fmt.Errorf("اسم طابعة غير صالح: %w", err)
	}

	var hPrinter uintptr
	ret, _, callErr := procOpenPrinterW.Call(
		uintptr(unsafe.Pointer(namePtr)),
		uintptr(unsafe.Pointer(&hPrinter)),
		0,
	)
	if ret == 0 {
		return fmt.Errorf("تعذر فتح مقبض الطابعة '%s': %w", printerName, callErr)
	}
	defer procClosePrinter.Call(hPrinter)

	// DocumentPropertiesW مع fMode=0 ⇒ عرض واجهة المستخدم التفاعلية للطابعة
	// (يعادل الضغط على "Preferences" في حوار الطباعة).
	// hwnd=0 يعني أن النافذة ليست مملوكة — تظهر مستقلة.
	ret2, _, callErr2 := procDocumentProperties.Call(
		0, // hwnd — لا نافذة أب
		hPrinter,
		uintptr(unsafe.Pointer(namePtr)),
		0, // pDevModeOutput — لا نحتاج الناتج
		0, // pDevModeInput — لا مدخلات مسبقة
		0, // fMode = 0 → عرض الواجهة فقط
	)
	// IDCANCEL (2) يعني أن المستخدم أغلق النافذة — ليس خطأ
	if int32(ret2) < 0 {
		return fmt.Errorf("تعذر فتح تفضيلات الطابعة '%s': %w", printerName, callErr2)
	}

	slog.Info("Opened printer preferences", "printer", printerName)
	return nil
}
