// ─────────────────────────────────────────────────────────────────────────────
// print_pdf_export.go — تصدير ورقة الطباعة كملف PDF متجهي (Vector PDF)
//
// الصورة النقطية للورقة تُضمَّن كصورة JPEG عالية الجودة بالحجم الفيزيائي
// الدقيق، بينما تُرسم خطوط القص كمتجهات PDF (Line + Dash Pattern) لتبقى
// حادة عند أي تكبير وتُطبع بدقة المطبعة بدل دقة البكسل.
// القيود: فضاء sRGB فقط — يُرفض CMYK صراحةً (gofpdf لا يدعم تضمين CMYK).
// ─────────────────────────────────────────────────────────────────────────────

package service

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/jpeg"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

// maxPDFPixels سقف بكسلات الورقة لمسار PDF — JPEG الوسيط بجودة 95 لورقة
// 144MP قد يتجاوز مئات الميجابايت في الذاكرة؛ فوق السقف يُرفض مبكراً مع
// رسالة توجيهية بدل OOM صامت (مطابق لسياسة maxTIFFPixels).
const maxPDFPixels = 50_000_000

// saveOutputPDF يصدّر صورة الورقة المركبة إلى PDF بمقاس فيزيائي دقيق.
// يُستدعى من saveOutput بعد اكتمال الرسم — لا يغيّر سلوك PNG/JPEG/TIFF.
func (s *PrintService) saveOutputPDF(img image.Image, req domain.PrintRequest) (string, string, error) {
	if strings.EqualFold(req.ColorSpace, "cmyk") {
		return "", "", fmt.Errorf("cmyk to PDF is not supported yet: use sRGB color space for PDF export (CMYK stays on TIFF/JPEG)")
	}

	bounds := img.Bounds()
	wPx := bounds.Dx()
	hPx := bounds.Dy()
	if wPx <= 0 || hPx <= 0 {
		return "", "", fmt.Errorf("invalid sheet dimensions for PDF export: %dx%d", wPx, hPx)
	}
	if int64(wPx)*int64(hPx) > maxPDFPixels {
		return "", "", fmt.Errorf("sheet too large for PDF export (%d MP): lower DPI (max %d MP)", int64(wPx)*int64(hPx)/1_000_000, maxPDFPixels/1_000_000)
	}

	// ترميز JPEG وسيط بجودة الطباعة (95) — يُضمَّن في PDF بلا إعادة ترميز
	// إضافية (gofpdf يحتفظ ببايتات JPEG الأصلية في كائن الصورة).
	var jpegBuf bytes.Buffer
	if err := jpeg.Encode(&jpegBuf, img, &jpeg.Options{Quality: 95}); err != nil {
		return "", "", fmt.Errorf("encode sheet jpeg for pdf: %w", err)
	}

	appDir := utils.GetAppDir()
	outDir := filepath.Join(appDir, "Exports")
	_ = os.MkdirAll(outDir, 0755)

	baseName := fmt.Sprintf("print_%d", time.Now().UnixNano())
	pdfName := baseName + ".pdf"
	pdfPath := filepath.Join(outDir, pdfName)

	// صفحة مخصصة بالمقاس الفيزيائي الدقيق — gofpdf يدعم SizeType بأي أبعاد
	// بالمليمتر، فلا حاجة للتقريب إلى A4/Letter.
	pdf := gofpdf.NewCustom(&gofpdf.InitType{
		OrientationStr: "P",
		UnitStr:        "mm",
		Size: gofpdf.SizeType{
			Wd: req.PaperWidthMM,
			Ht: req.PaperHeightMM,
		},
	})
	pdf.SetTitle("Grido Studio — Print Sheet", false)
	pdf.SetAuthor("Grido Studio", false)
	pdf.SetCreator("Grido Studio PDF Export", false)
	pdf.SetMargins(0, 0, 0)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddPage()

	imgKey := "sheet"
	_ = pdf.RegisterImageReader(imgKey, "JPG", bytes.NewReader(jpegBuf.Bytes()))
	pdf.Image(imgKey, 0, 0, req.PaperWidthMM, req.PaperHeightMM, false, "JPG", 0, "")

	// خطوط القص كمتجهات — نفس الهندسة المرسومة نقطياً في drawCutLines لكن
	// بإحداثيات المليمتر الأصلية، بعرض 0.20مم وإيقاع الشرطات نفسه (1.5مم).
	drawPDFCutLines(pdf, req)

	af, err := utils.CreateAtomic(pdfPath, 0o644)
	if err != nil {
		return "", "", fmt.Errorf("create pdf: %w", err)
	}
	defer af.Abort()
	if err := pdf.Output(af); err != nil {
		return "", "", fmt.Errorf("write pdf: %w", err)
	}
	if err := af.Commit(); err != nil {
		return "", "", fmt.Errorf("commit pdf: %w", err)
	}

	// معاينة HTML مضمّنة (base64) — نفس عقد HTML في المسار النقطي حتى لا
	// ينكسر عقد الطباعة (showPrintResult يتوقع ملفاً + معاينة).
	previewB64 := base64.StdEncoding.EncodeToString(jpegBuf.Bytes())
	imageSrcForWebView := "data:image/jpeg;base64," + previewB64
	imageSrcForNative := "data:image/jpeg;base64," + previewB64
	htmlDoc := fmt.Sprintf(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>Grido Print Sheet</title>
<style>
  @page { size: %.2fmm %.2fmm; margin: 0; }
  html, body { margin: 0; padding: 0; width: %.2fmm; height: %.2fmm; }
  img { width: %.2fmm; height: %.2fmm; display: block; }
</style></head>
<body><img src="%s" alt="print sheet preview"></body>
</html>`,
		req.PaperWidthMM, req.PaperHeightMM,
		req.PaperWidthMM, req.PaperHeightMM,
		req.PaperWidthMM, req.PaperHeightMM,
		imageSrcForWebView)
	_ = imageSrcForNative

	return pdfPath, htmlDoc, nil
}

// drawPDFCutLines يرسم خطوط القص كمتجهات PDF بنفس إيقاع drawCutLines النقطي:
// عرض 0.20مم، شرطات 1.5مم/1.5مم، منقط 0.6مم/2.4مم (1.5×0.4 / 1.5×1.6)،
// وصلب بلا شرطات. اللون الرمادي 120 مطابق للمعاينة النقطية.
func drawPDFCutLines(pdf *gofpdf.Fpdf, req domain.PrintRequest) {
	if !req.ShowCutLines || len(req.CutLines) == 0 {
		return
	}

	pdf.SetDrawColor(120, 120, 120)
	pdf.SetLineWidth(0.20)

	style := strings.ToLower(strings.TrimSpace(req.CutLineStyle))
	switch style {
	case "solid", "cropmarks":
		pdf.SetDashPattern([]float64{}, 0)
	case "dotted":
		pdf.SetDashPattern([]float64{0.6, 2.4}, 0)
	default: // "dashed" والافتراضي
		pdf.SetDashPattern([]float64{1.5, 1.5}, 0)
	}

	for _, line := range req.CutLines {
		// حماية من NaN/Inf — قيمة تالفة واحدة كانت تُفسد مسار الرسم كاملاً
		// في المسار النقطي؛ هنا نتجاوز الخط التالف وحده.
		if !isFiniteMM(line.X1) || !isFiniteMM(line.Y1) || !isFiniteMM(line.X2) || !isFiniteMM(line.Y2) {
			continue
		}
		pdf.Line(line.X1, line.Y1, line.X2, line.Y2)
	}
	pdf.SetDashPattern([]float64{}, 0)
}

// isFiniteMM يتحقق أن إحداثي المليمتر عدد حقيقي صالح (ليس NaN ولا Inf).
func isFiniteMM(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0) && v < 1e12 && v > -1e12
}
