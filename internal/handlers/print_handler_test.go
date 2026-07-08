package handlers

import (
	"grido/internal/core/domain"
	"grido/internal/service"
	"testing"
)

func TestPrintHandler_GeneratePrintSheet(t *testing.T) {
	svc := service.NewPrintService()
	handler := NewPrintHandler(svc)

	// 1. اختبار استدعاء الطباعة بطلب خاطئ (DPI منخفض)
	req := domain.PrintRequest{
		DPI:           10, // الحد الأدنى 50
		PaperWidthMM:  210,
		PaperHeightMM: 297,
	}
	res := handler.ExportPrintSheet(req)
	if res.Success {
		t.Error("expected print result Success to be false")
	}
}
