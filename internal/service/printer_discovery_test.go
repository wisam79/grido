package service

import (
	"runtime"
	"strings"
	"testing"
)

func TestGetSystemPrinters(t *testing.T) {
	printers, err := GetSystemPrinters()
	if err != nil {
		if runtime.GOOS == "windows" {
			t.Logf("GetSystemPrinters returned error on Windows (spooler may be stopped in test environment): %v", err)
		} else {
			t.Fatalf("Unexpected error on non-Windows: %v", err)
		}
		return
	}

	t.Logf("Discovered %d system printers", len(printers))
	hasDefault := false
	for _, p := range printers {
		if p.Name == "" {
			t.Errorf("Discovered printer has empty name")
		}
		if p.IsDefault {
			hasDefault = true
			t.Logf("Default printer: %s", p.Name)
		}
	}

	if len(printers) > 0 && !hasDefault {
		t.Logf("Note: None of the %d printers was marked as default", len(printers))
	}
}

func TestGetDefaultPrinter(t *testing.T) {
	name, err := GetDefaultPrinter()
	if err != nil {
		t.Logf("GetDefaultPrinter returned: %v", err)
		return
	}
	t.Logf("Default printer name: %s", name)
}

func TestOpenPrinterPreferences_Validation(t *testing.T) {
	// تحقق الإدخال مطبَّق في تنفيذ ويندوز حصراً؛ على الأنظمة الأخرى يُعيد
	// الـstub نجاحاً صامتاً (لا توجد واجهة تفضيلات أصلية)، لذا نُقيّد
	// الفحوص بنفس نمط بقية الملف بدل إسقاط CI على لينكس.
	if runtime.GOOS == "windows" {
		if err := OpenPrinterPreferences(""); err == nil {
			t.Fatal("expected error for empty printer name")
		}
		if err := OpenPrinterPreferences("   "); err == nil {
			t.Fatal("expected error for whitespace printer name")
		}
	}

	dangerousInputs := []string{
		"Printer\x00Name",
		"Printer\nName",
		"Printer\rName",
		"Printer\tName",
		"Printer\"Name",
	}
	for _, badName := range dangerousInputs {
		err := OpenPrinterPreferences(badName)
		if runtime.GOOS == "windows" {
			if err == nil || !strings.Contains(err.Error(), "محارف غير صالحة") {
				t.Errorf("expected rejection for malicious printer name %q, got: %v", badName, err)
			}
		}
	}
}
