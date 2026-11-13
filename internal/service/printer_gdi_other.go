//go:build !windows

package service

import (
	"fmt"

	"grido/internal/core/domain"
)

// PrintImageDirectGDI — stub لأنظمة غير ويندوز: الطباعة المباشرة عبر GDI مخصصة لنظام Windows.
func (s *PrintService) PrintImageDirectGDI(_ domain.DirectPrintRequest) (int32, error) {
	return 0, fmt.Errorf("الطباعة المباشرة عبر Win32 GDI غير مدعومة إلا على نظام Windows")
}

// GetSupportedPapers — stub لأنظمة غير ويندوز.
func (s *PrintService) GetSupportedPapers(_ string) ([]domain.SupportedPaperInfo, error) {
	return []domain.SupportedPaperInfo{}, nil
}

// ResolvePrinterPlan — stub لأنظمة غير ويندوز.
func (s *PrintService) ResolvePrinterPlan(req domain.PrinterPlanRequest) (domain.PrinterPlanResult, error) {
	return domain.PrinterPlanResult{
		Success:           false,
		Code:              "UNSUPPORTED_PLATFORM",
		Error:             "حل خطة الطباعة عبر Win32 GDI غير مدعوم إلا على نظام Windows",
		RequestedFormName: req.FormName,
		RequestedPaperID:  req.PaperID,
	}, nil
}

// CancelSpoolJob — stub لأنظمة غير ويندوز.
func (s *PrintService) CancelSpoolJob(_ string, _ int32) error {
	return fmt.Errorf("إلغاء مهمة طابور Win32 غير مدعوم إلا على نظام Windows")
}

// PollJobStatus — stub لأنظمة غير ويندوز.
func (s *PrintService) PollJobStatus(_ string, _ int32) (domain.DirectPrintResult, error) {
	return domain.DirectPrintResult{
		Success: false,
		Error:   "استعلام حالة طابور الطباعة غير مدعوم إلا على نظام Windows",
	}, nil
}
