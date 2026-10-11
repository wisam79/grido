package service

import (
	"image/color"
	"image/jpeg"
	"math"
	"os"
	"strings"
	"testing"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_fullpage_cmyk_test.go — عقد حوار التصدير ← المسار الخلفي (CMYK كامل الصفحة)
//
// حوار التصدير يبني طلباً بنمط واحد ثابت: عنصر واحد يملأ الورقة (0,0 → W,H)،
// margin/gap صفر، بلا خطوط قص، colorSpace='cmyk'، وexportFormat='tiff'|'jpeg'.
// هذا الاختبار يثبت أن هذا الطلب بالضبط يُنتج ملفاً كامل الصفحة حدّاً-لحدّ
// (لا قصّ ولا إطار أبيض)، وأن TIFF يخرج بفصل أحبار حقيقي.
//
// ⚠️ قيد معروف (لا يُخفيه الاختبار): مُرمِّز JPEG في مكتبة Go القياسية يكتب
// 3 مكوّنات (YCbCr) دائماً ولا يدعم CMYK، فمخرج JPEG يأتي بفضاء RGB رغم اختيار
// CMYK. TIFF هو الحامل الحقيقي لفصل الأحبار.
// ─────────────────────────────────────────────────────────────────────────────

// buildExportDialogCMYKRequest يطابق buildCmykPrintRequest في الواجهة.
func buildExportDialogCMYKRequest(imageSrc string, format string) domain.PrintRequest {
	return domain.PrintRequest{
		PaperWidthMM:    210,
		PaperHeightMM:   297,
		MarginMM:        0,
		GapMM:           0,
		DPI:             150,
		BackgroundColor: "#FFFFFF",
		ShowCutLines:    false,
		ColorSpace:      "cmyk",
		ExportFormat:    format,
		Orientation:     "portrait",
		CutLines:        []domain.CutLine{},
		Items:           []domain.PrintItem{neutralWorkshopItem(imageSrc, 0, 0, 210, 297)},
	}
}

func TestExportDialogCMYCFullPageOutput(t *testing.T) {
	cases := []struct {
		name      string
		format    string
		extension string
	}{
		{name: "TIFF", format: "tiff", extension: ".tif"},
		{name: "JPEG", format: "jpeg", extension: ".jpg"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dir := workshopTempDir(t)
			src := writeWorkshopPhoto(t, dir, "canvas.png", 400, 500,
				color.RGBA{R: 200, G: 40, B: 40, A: 255})

			svc := NewPrintService()
			outPath, htmlDoc, err := svc.GeneratePrintSheet(buildExportDialogCMYKRequest(src, tc.format))
			if err != nil {
				t.Fatalf("GeneratePrintSheet(%s): %v", tc.format, err)
			}
			if !strings.HasSuffix(strings.ToLower(outPath), tc.extension) {
				t.Fatalf("expected %s output, got %s", tc.extension, outPath)
			}
			t.Cleanup(func() {
				base := strings.TrimSuffix(outPath, filepathExt(outPath))
				os.Remove(outPath)
				os.Remove(base + ".html")
				os.Remove(base + "_preview.png")
				os.Remove(base + "_preview.jpg")
			})
			if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
				t.Errorf("expected HTML print document alongside the file")
			}

			var width, height int
			var barePaper func(x, y int) bool

			switch tc.format {
			case "tiff":
				img := cmykFromTIFFFile(t, outPath) // يتحقق أيضاً من photometric=5/Samples=4/InkSet
				width, height = img.Bounds().Dx(), img.Bounds().Dy()
				barePaper = func(x, y int) bool { return img.CMYKAt(x, y) == color.CMYK{} }
			default:
				file, ferr := os.Open(outPath)
				if ferr != nil {
					t.Fatalf("open %s: %v", tc.format, ferr)
				}
				defer file.Close()
				img, derr := jpeg.Decode(file)
				if derr != nil {
					t.Fatalf("decode %s: %v", tc.format, derr)
				}
				width, height = img.Bounds().Dx(), img.Bounds().Dy()
				barePaper = func(x, y int) bool {
					r, g, b, _ := img.At(x, y).RGBA()
					return r>>8 > 240 && g>>8 > 240 && b>>8 > 240
				}
			}

			expectedW := int(math.Round(mmToPx(210, 150)))
			expectedH := int(math.Round(mmToPx(297, 150)))
			if math.Abs(float64(width-expectedW)) > 2 || math.Abs(float64(height-expectedH)) > 2 {
				t.Errorf("expected %dx%d px, got %dx%d", expectedW, expectedH, width, height)
			}

			// كامل الصفحة: كل الزوايا الأربع تحمل لون الصورة لا بياض الورقة —
			// أي انزياح هامش أو قصّ صامت كان سيترك إطاراً أبيض.
			corners := [][2]int{
				{1, 1},
				{width - 2, 1},
				{1, height - 2},
				{width - 2, height - 2},
			}
			for _, c := range corners {
				if barePaper(c[0], c[1]) {
					t.Errorf("corner (%d,%d) is bare paper — item did not cover the full sheet", c[0], c[1])
				}
			}
		})
	}
}

// filepathExt يعيد امتداد المسار (بلا استيراد path/filepath في ملف الاختبار).
func filepathExt(p string) string {
	if i := strings.LastIndex(p, "."); i >= 0 && !strings.ContainsAny(p[i:], `/\`) {
		return p[i:]
	}
	return ""
}
