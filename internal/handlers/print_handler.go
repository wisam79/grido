package handlers

import (
	"strings"

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
	printerName = strings.TrimSpace(printerName)
	if printerName == "" {
		if def, err := service.GetDefaultPrinter(); err == nil && def != "" {
			printerName = def
		}
	}
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

// PrintDirect يرسل صورة المستند/الورقة المصدرة مباشرة إلى الطابعة عبر Win32 GDI
func (h *PrintHandler) PrintDirect(req domain.DirectPrintRequest) domain.DirectPrintResult {
	jobID, err := h.printService.PrintImageDirectGDI(req)
	if err != nil {
		return domain.DirectPrintResult{
			Success: false,
			Error:   err.Error(),
		}
	}
	return domain.DirectPrintResult{
		Success: true,
		JobID:   jobID,
		Status:  "Spooling",
	}
}

// GetSupportedPapers يستعلم قوالب الورق وأحجامها وإمكانية الطباعة بدون حواف
func (h *PrintHandler) GetSupportedPapers(printerName string) domain.SupportedPapersResult {
	papers, err := h.printService.GetSupportedPapers(printerName)
	if err != nil {
		return domain.SupportedPapersResult{
			Success: false,
			Error:   err.Error(),
		}
	}
	return domain.SupportedPapersResult{
		Success: true,
		Papers:  papers,
	}
}

// PollJobStatus يستعلم عن حالة المهمة الحالية في طابور الويندوز
func (h *PrintHandler) PollJobStatus(printerName string, jobID int32) domain.DirectPrintResult {
	result, err := h.printService.PollJobStatus(printerName, jobID)
	if err != nil {
		return domain.DirectPrintResult{
			Success: false,
			JobID:   jobID,
			Error:   err.Error(),
		}
	}
	return result
}
