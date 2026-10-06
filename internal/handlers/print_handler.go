package handlers

import (
	"grido/internal/core/domain"
	"grido/internal/service"
)

type PrintHandler struct {
	printService *service.PrintService
}

func NewPrintHandler(printService *service.PrintService) *PrintHandler {
	return &PrintHandler{
		printService: printService,
	}
}

func (h *PrintHandler) ExportPrintSheet(req domain.PrintRequest) domain.PrintResult {
	outPath, htmlDoc, err := h.printService.GeneratePrintSheet(req)
	if err != nil {
		return domain.PrintResult{
			Success: false,
			Error:   err.Error(),
		}
	}

	return domain.PrintResult{
		Success:  true,
		FilePath: outPath,
		HtmlDoc:  htmlDoc,
	}
}

func (h *PrintHandler) PrintNative(filePath string) domain.PrintResult {
	err := h.printService.PrintNative(filePath)
	if err != nil {
		return domain.PrintResult{
			Success: false,
			Error:   err.Error(),
		}
	}
	return domain.PrintResult{
		Success:  true,
		FilePath: filePath,
	}
}

// GetPrinters يعيد قائمة الطابعات المثبتة في نظام التشغيل مع تحديد
// الطابعة الافتراضية — يُستخدم في شاشة Backstage View للطباعة.
func (h *PrintHandler) GetPrinters() domain.PrintersResult {
	printers, err := service.GetSystemPrinters()
	if err != nil {
		return domain.PrintersResult{
			Success: false,
			Error:   err.Error(),
		}
	}
	return domain.PrintersResult{
		Success:  true,
		Printers: printers,
	}
}

// GetDefaultPrinterName يعيد اسم الطابعة الافتراضية في النظام.
func (h *PrintHandler) GetDefaultPrinterName() string {
	name, _ := service.GetDefaultPrinter()
	return name
}

// OpenPrinterPreferences يفتح نافذة تفضيلات الطابعة الأصلية (Driver UI)
// لتمكين المستخدم من ضبط نوع الورق والجودة عبر واجهة المُصنِّع.
func (h *PrintHandler) OpenPrinterPreferences(printerName string) domain.PrintResult {
	err := service.OpenPrinterPreferences(printerName)
	if err != nil {
		return domain.PrintResult{
			Success: false,
			Error:   err.Error(),
		}
	}
	return domain.PrintResult{
		Success: true,
	}
}

