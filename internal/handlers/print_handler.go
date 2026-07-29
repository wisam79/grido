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
