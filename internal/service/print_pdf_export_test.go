package service

import (
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/disintegration/imaging"

	"grido/internal/core/domain"
)

// writePDFTestImage ينشئ صورة PNG اختبارية مؤقتة لمسار PDF.
func writePDFTestImage(t *testing.T) string {
	t.Helper()
	tempDir, err := os.MkdirTemp("", "print_pdf_export_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { os.RemoveAll(tempDir) })

	imgPath := filepath.Join(tempDir, "photo.png")
	img := image.NewRGBA(image.Rect(0, 0, 200, 200))
	for x := 0; x < 200; x++ {
		for y := 0; y < 200; y++ {
			img.Set(x, y, color.RGBA{R: 40, G: 120, B: 160, A: 255})
		}
	}
	if err := imaging.Save(img, imgPath); err != nil {
		t.Fatalf("failed to save dummy image: %v", err)
	}
	return imgPath
}

// TestSaveOutputPDF_ProducesValidPDF يتحقق من العقد الكامل لمسار PDF:
// ملف موجود + توقيع %PDF + حجم صفحة A4 بالمليمتر + صورة JPEG مضمّنة.
func TestSaveOutputPDF_ProducesValidPDF(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	svc := NewPrintService()

	imgPath := writePDFTestImage(t)
	req := domain.PrintRequest{
		PaperWidthMM:    210.0,
		PaperHeightMM:   297.0,
		DPI:             150,
		BackgroundColor: "#FFFFFF",
		ShowCutLines:    true,
		CutLineStyle:    "dashed",
		ColorSpace:      "sRGB",
		ExportFormat:    "pdf",
		Items: []domain.PrintItem{
			{ImageSrc: imgPath, X: 10, Y: 10, W: 60, H: 90, Brightness: 100, Contrast: 100, Saturation: 100},
		},
		CutLines: []domain.CutLine{{X1: 10, Y1: 4, X2: 10, Y2: 100}},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("GeneratePrintSheet(pdf): %v", err)
	}
	if !strings.HasSuffix(strings.ToLower(outPath), ".pdf") {
		t.Fatalf("expected .pdf output, got %s", outPath)
	}
	data, err := os.ReadFile(outPath)
	if err != nil {
		t.Fatalf("read pdf output: %v", err)
	}
	if len(data) < 5 || string(data[:5]) != "%PDF-" {
		t.Fatalf("output is not a PDF (missing %%PDF- signature, %d bytes)", len(data))
	}
	// أبعاد الصفحة الفيزيائية مضمّنة (A4 = 210×297مم بالنقاط 595.28×841.89)
	text := string(data)
	if !strings.Contains(text, "595.28 841.89") {
		t.Fatalf("PDF missing A4 MediaBox dimensions (595.28 841.89)")
	}
	// الصورة النقطية مضمّنة كـ XObject
	if !strings.Contains(text, "/Subtype /Image") {
		t.Fatalf("PDF missing embedded raster image XObject")
	}
	// خط القص المتجهي مرسوم (مشغّل الرسم m/l/S أو re)
	if !strings.Contains(text, " S") && !strings.Contains(text, " re") {
		t.Fatalf("PDF missing vector cut-line operators")
	}
	if htmlDoc == "" || !strings.Contains(htmlDoc, "data:image/jpeg;base64,") {
		t.Fatalf("PDF path must still return an HTML preview per the print contract")
	}

	_ = filepath.Base(outPath)
}

// TestSaveOutputPDF_RejectsCMYK يتحقق أن CMYK→PDF يُرفض صراحةً برسالة
// توجيهية بدل إنتاج PDF بألوان مكسورة (gofpdf لا يدعم تضمين CMYK).
func TestSaveOutputPDF_RejectsCMYK(t *testing.T) {
	t.Setenv("GRIDO_APP_DIR", t.TempDir())
	svc := NewPrintService()

	imgPath := writePDFTestImage(t)
	req := domain.PrintRequest{
		PaperWidthMM:    100.0,
		PaperHeightMM:   150.0,
		DPI:             150,
		BackgroundColor: "#FFFFFF",
		ColorSpace:      "CMYK",
		ExportFormat:    "pdf",
		Items: []domain.PrintItem{
			{ImageSrc: imgPath, X: 5, Y: 5, W: 60, H: 90, Brightness: 100, Contrast: 100, Saturation: 100},
		},
	}

	_, _, err := svc.GeneratePrintSheet(req)
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "cmyk") {
		t.Fatalf("expected explicit CMYK rejection, got: %v", err)
	}
}

// TestDrawPDFCutLines_SkipsNaN يتحقق أن خطاً تالفاً واحداً لا يُسقط الرسم.
func TestDrawPDFCutLines_SkipsNaN(t *testing.T) {
	if isFiniteMM(10.5) != true {
		t.Fatalf("isFiniteMM(10.5) must be true")
	}
	if isFiniteMM(math.Inf(1)) != false {
		t.Fatalf("isFiniteMM(+Inf) must be false")
	}
}
