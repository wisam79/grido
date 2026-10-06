package service

import (
	"runtime"
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
