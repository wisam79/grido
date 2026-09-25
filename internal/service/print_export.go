package service

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"html"
	"image/jpeg"
	"image/png"
	"io"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"time"

	"golang.org/x/image/tiff"

	"github.com/fogleman/gg"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

var exportsCleanup atomic.Bool

// ─────────────────────────────────────────────────────────────────────────────
// print_export.go — حفظ مخرجات الطباعة وحقن بيانات DPI
//
// يدعم: PNG/JPEG (sRGB) و TIFF/JPEG (CMYK) + معاينة HTML مضمّنة Base64،
// حقن pHYs في PNG و JFIF APP0 في JPEG ليُحترم المقاس الفيزيائي عند الطباعة.
//
// الأداء والسلامة: الترميز يتدفق للقرص مباشرة (DPI يُحقن أثناء الكتابة بلا
// نسخة بايت ثانية)، TIFF مضغوط Deflate، والكتابة ذرية (.tmp + Sync + Rename).
// ─────────────────────────────────────────────────────────────────────────────

// maxTIFFPixels سقف TIFF (CMYK غير مضغوط سابقاً): فوقه يُرفض بطلب JPEG/DPI أقل
// بدل OOM (50MP ≈ 200MB RGBA + نسخ الترميز).
const maxTIFFPixels = 50_000_000

// maxFallbackEmbedBytes سقف تضمين Base64 الاحتياطي في HTML (M6).
const maxFallbackEmbedBytes = 60 * 1024 * 1024

func (s *PrintService) saveOutput(dc *gg.Context, req domain.PrintRequest) (string, string, error) {
	appDir := utils.GetAppDir()
	outDir := filepath.Join(appDir, "Exports")
	_ = os.MkdirAll(outDir, 0755)

	// 🧹 تنظيف المخرجات القديمة (أقدم من 24 ساعة) في الخلفية لتفادي امتلاء القرص
	// دون تأخير الطلب الحالي أو حذف ملف حوار طباعة ما زال مفتوحاً في المقدمة.
	// نحذف ملفات الطباعة print_* فقط — لا نلمس ملفات المستخدم الخاصة.
	// الحارس الذري يمنع طوفان Goroutines في عمليات الطباعة الدفعية المتتالية.
	if exportsCleanup.CompareAndSwap(false, true) {
		go func() {
			defer exportsCleanup.Store(false)
			if files, err := os.ReadDir(outDir); err == nil {
				for _, f := range files {
					if !strings.HasPrefix(f.Name(), "print_") {
						continue
					}
					filePath := filepath.Join(outDir, f.Name())
					if info, err := os.Stat(filePath); err == nil {
						if time.Since(info.ModTime()) > 24*time.Hour {
							_ = os.Remove(filePath)
						}
					}
				}
			}
		}()
	}

	baseName := fmt.Sprintf("print_%d", time.Now().UnixNano())
	isCMYK := strings.EqualFold(req.ColorSpace, "cmyk")

	// مسار PDF المتجهي: تُعاد الصورة المركبة نفسها (نقطية + خطوط قص)
	// إلى غلاف PDF بمقاس فيزيائي دقيق وخطوط قص متجهة. لا تغيير لبقية المسارات.
	if strings.EqualFold(req.ExportFormat, "pdf") {
		return s.saveOutputPDF(dc.Image(), req)
	}

	var imageName string
	var imagePath string
	var htmlImageName string

	if isCMYK {
		cmykImg := ConvertRGBAtoCMYK(dc.Image())
		ApplyPureBlackCutLines(cmykImg, req)

		if strings.EqualFold(req.ExportFormat, "jpeg") || strings.EqualFold(req.ExportFormat, "jpg") {
			imageName = baseName + ".jpg"
			imagePath = filepath.Join(outDir, imageName)
			af, err := utils.CreateAtomic(imagePath, 0o644)
			if err != nil {
				return "", "", fmt.Errorf("create cmyk jpeg: %w", err)
			}
			defer af.Abort()
			if err := jpeg.Encode(af, cmykImg, &jpeg.Options{Quality: 95}); err != nil {
				return "", "", fmt.Errorf("encode cmyk jpeg: %w", err)
			}
			if err := af.Commit(); err != nil {
				return "", "", fmt.Errorf("commit cmyk jpeg: %w", err)
			}
		} else {
			// Default format for CMYK is TIFF — مضغوط Deflate (غير المضغوط كان
			// يضاعف الذاكرة والقرص) مع سقف 50MP بدل OOM على اللوحات الكبيرة
			if pixels := int64(cmykImg.Bounds().Dx()) * int64(cmykImg.Bounds().Dy()); pixels > maxTIFFPixels {
				return "", "", fmt.Errorf("cmyk tiff too large (%d MP): use JPEG or lower DPI (max %d MP)", pixels/1000000, maxTIFFPixels/1000000)
			}
			imageName = baseName + ".tif"
			imagePath = filepath.Join(outDir, imageName)
			af, err := utils.CreateAtomic(imagePath, 0o644)
			if err != nil {
				return "", "", fmt.Errorf("create cmyk tiff: %w", err)
			}
			defer af.Abort()
			if err := tiff.Encode(af, cmykImg, &tiff.Options{Compression: tiff.Deflate, Predictor: true}); err != nil {
				return "", "", fmt.Errorf("encode cmyk tiff: %w", err)
			}
			if err := af.Commit(); err != nil {
				return "", "", fmt.Errorf("commit cmyk tiff: %w", err)
			}
		}

		// 🌟 Save a browser-compatible PNG for HTML print window preview (browsers cannot decode TIFF in <img> tags)
		htmlImageName = baseName + "_preview.png"
		htmlImagePath := filepath.Join(outDir, htmlImageName)
		var buf bytes.Buffer
		enc := &png.Encoder{CompressionLevel: png.BestSpeed}
		if err := enc.Encode(&buf, dc.Image()); err == nil {
			// DPI يُحقن أثناء التدفق للقرص — بلا نسخة بايت ثانية لصورة كاملة
			if af, err := utils.CreateAtomic(htmlImagePath, 0o644); err == nil {
				if werr := streamPNGWithDPI(af, buf.Bytes(), req.DPI); werr != nil {
					af.Abort()
					htmlImageName = imageName
				} else if cerr := af.Commit(); cerr != nil {
					htmlImageName = imageName
				}
			} else {
				htmlImageName = imageName
			}
		} else {
			htmlImageName = imageName
		}
	} else {
		if strings.EqualFold(req.ExportFormat, "jpeg") || strings.EqualFold(req.ExportFormat, "jpg") {
			// JPEG أسرع عدة مرات من PNG في الترميز وملفه أصغر 3-5× — يُرسل للطباعة
			// من الوضع المفرد حيث الصورة فوتوغرافية (جودة 95 لا تُفرق بصرياً عند 300 DPI)
			imageName = baseName + ".jpg"
			htmlImageName = imageName
			imagePath = filepath.Join(outDir, imageName)
			var buf bytes.Buffer
			if err := jpeg.Encode(&buf, dc.Image(), &jpeg.Options{Quality: 95}); err != nil {
				return "", "", err
			}
			// JFIF يُحقن أثناء التدفق للقرص ذرياً — بلا نسخة بايت ثانية
			af, err := utils.CreateAtomic(imagePath, 0o644)
			if err != nil {
				return "", "", fmt.Errorf("create jpeg: %w", err)
			}
			defer af.Abort()
			// streamJPEGWithDPI تكتب الخام عند تعذر الحقن — الخطأ هنا يعني عطل قرص فقط
			if werr := streamJPEGWithDPI(af, buf.Bytes(), req.DPI); werr != nil {
				return "", "", werr
			}
			if err := af.Commit(); err != nil {
				return "", "", err
			}
		} else {
			// sRGB PNG (السلوك الافتراضي)
			imageName = baseName + ".png"
			htmlImageName = imageName
			imagePath = filepath.Join(outDir, imageName)
			var buf bytes.Buffer
			enc := &png.Encoder{CompressionLevel: png.BestSpeed}
			if err := enc.Encode(&buf, dc.Image()); err != nil {
				return "", "", err
			}

			// pHYs تُحقن أثناء التدفق للقرص ذرياً — بلا نسخة بايت ثانية
			af, err := utils.CreateAtomic(imagePath, 0o644)
			if err != nil {
				return "", "", fmt.Errorf("create png: %w", err)
			}
			defer af.Abort()
			// streamPNGWithDPI تكتب الخام عند تعذر الحقن — الخطأ هنا يعني عطل قرص فقط
			if werr := streamPNGWithDPI(af, buf.Bytes(), req.DPI); werr != nil {
				return "", "", werr
			}
			if err := af.Commit(); err != nil {
				return "", "", err
			}
		}
	}

	htmlPath := filepath.Join(outDir, baseName+".html")

	// إنتاج ملف HTML لضمان طباعة دقيقة للمليمترات عبر متصفح الويب (يتجاهل عارض الصور الافتراضي للويندوز)
	// HTML file for native OS printing (uses file:// absolute path so external apps like mshtml.dll can load the image)
	absImagePath := filepath.Join(outDir, htmlImageName)
	fileURI := "file:///" + strings.ReplaceAll(filepath.ToSlash(absImagePath), " ", "%20")

	// 🚀 مسار الصورة لـ WebView2 iframe: يُخدم من سيرفر Wails عبر /local-image/ (main.go)
	// يتوافق مع 'self' في CSP ويمنع حجب file:// وظهور الصورة المكسورة
	imageSrcForWebView := "/local-image/" + htmlImageName
	imageSrcForNative := fileURI

	if _, statErr := os.Stat(absImagePath); statErr != nil {
		slog.Warn("print image missing on disk; checking fallback in Exports", "path", absImagePath, "error", statErr)
		// الملف غير موجود — نبحث في مجلد Exports البديل (print_upload_*)
		exportsDir := filepath.Join(utils.GetAppDir(), "Exports")
		altPath := filepath.Join(exportsDir, htmlImageName)
		// سقف التضمين: فوقه نُبقي مسار الملف بدل مضاعفة الصورة كاملة في HTML
		if info, statErr := os.Stat(altPath); statErr == nil && info.Size() > 0 && info.Size() <= maxFallbackEmbedBytes {
			if imgData, err := os.ReadFile(altPath); err == nil && len(imgData) > 0 {
				mimeType := "image/png"
				if strings.HasSuffix(strings.ToLower(htmlImageName), ".jpg") || strings.HasSuffix(strings.ToLower(htmlImageName), ".jpeg") {
					mimeType = "image/jpeg"
				}
				b64 := fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(imgData))
				imageSrcForNative = b64
				imageSrcForWebView = b64
				slog.Info("print image found in Exports fallback dir", "altPath", altPath)
			}
		}
	}

	htmlContent := buildNativePrintHTML(req.PaperWidthMM, req.PaperHeightMM, imageSrcForNative)
	if hf, herr := utils.CreateAtomic(htmlPath, 0o644); herr == nil {
		if _, werr := hf.WriteString(htmlContent); werr != nil {
			hf.Abort()
		} else if cerr := hf.Commit(); cerr != nil {
			slog.Warn("Failed to commit print HTML", "error", cerr)
		}
	} else {
		slog.Warn("Failed to create print HTML", "error", herr)
	}

	// HTML بمسار الصورة المحلي للعرض والطباعة الفورية داخل WebView2 عبر iframe
	// (صفر Base64 عبر IPC — المسار يُخدم من /local-image/ في سيرفر Wails المحلي)
	selfContainedHTML := buildSelfContainedHTML(req.PaperWidthMM, req.PaperHeightMM, imageSrcForWebView)

	return imagePath, selfContainedHTML, nil
}

// buildNativePrintHTML يبني صفحة الطباعة لنافذة المتصفح الأصلية بمقاس ورقة دقيق بالمليمتر
func buildNativePrintHTML(paperWMM, paperHMM float64, imageSrc string) string {
	escapedSrc := html.EscapeString(imageSrc)
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title></title>
<style>
  @page { margin: 0; size: %.2fmm %.2fmm; }
  * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
  html, body {
    width: %.2fmm !important;
    height: %.2fmm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #525659;
    overflow: hidden !important;
    position: relative !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  img {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: %.2fmm !important;
    height: %.2fmm !important;
    max-width: none !important;
    max-height: none !important;
    object-fit: contain !important;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    display: block !important;
    background: white;
  }
  @media print {
    @page { margin: 0; size: %.2fmm %.2fmm; }
    html, body { background: white !important; margin: 0 !important; padding: 0 !important; width: %.2fmm !important; height: %.2fmm !important; }
    img { position: absolute !important; top: 0 !important; left: 0 !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: %.2fmm !important; height: %.2fmm !important; object-fit: contain !important; }
  }
</style>
</head>
<body onload="setTimeout(function(){ window.print(); window.close(); }, 500)">
  <img src="%s" />
</body>
</html>`, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, escapedSrc)
}

// buildSelfContainedHTML يبني صفحة معاينة/طباعة ذاتية الاحتواء لـ WebView2 (iframe)
func buildSelfContainedHTML(paperWMM, paperHMM float64, imageSrc string) string {
	escapedSrc := html.EscapeString(imageSrc)
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title></title>
<style>
  @page { margin: 0; size: %.2fmm %.2fmm; }
  * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
  html, body {
    width: %.2fmm !important;
    height: %.2fmm !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: white !important;
    position: relative !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  img {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: %.2fmm !important;
    height: %.2fmm !important;
    max-width: none !important;
    max-height: none !important;
    object-fit: contain !important;
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  @media print {
    @page { margin: 0; size: %.2fmm %.2fmm; }
    html, body { width: %.2fmm !important; height: %.2fmm !important; margin: 0 !important; padding: 0 !important; }
    img { position: absolute !important; top: 0 !important; left: 0 !important; width: %.2fmm !important; height: %.2fmm !important; object-fit: contain !important; }
  }
</style>
</head>
<body>
  <img src="%s" />
</body>
</html>`, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, escapedSrc)
}

// buildPhysChunk يبني قطعة pHYs (21 بايت) بالـ DPI المطلوب.
func buildPhysChunk(dpi int) []byte {
	ppm := uint32(math.Round(float64(dpi) / 0.0254))

	physType := []byte("pHYs")
	physData := make([]byte, 9)
	binary.BigEndian.PutUint32(physData[0:4], ppm)
	binary.BigEndian.PutUint32(physData[4:8], ppm)
	physData[8] = 1

	physChunk := make([]byte, 21)
	binary.BigEndian.PutUint32(physChunk[0:4], 9)
	copy(physChunk[4:8], physType)
	copy(physChunk[8:17], physData)

	crc := crc32.ChecksumIEEE(append(physType, physData...))
	binary.BigEndian.PutUint32(physChunk[17:21], crc)
	return physChunk
}

// streamPNGWithDPI يكتب PNG مع pHYs مباشرة للكاتب — 3 كتابات جزئية بلا نسخة بايت ثانية.
func streamPNGWithDPI(w io.Writer, pngData []byte, dpi int) error {
	insertPos, skipEnd, err := pngDPIInsertPos(pngData)
	if err != nil {
		return err
	}
	physChunk := buildPhysChunk(dpi)
	for _, part := range [][]byte{pngData[:insertPos], physChunk, pngData[skipEnd:]} {
		if _, err := w.Write(part); err != nil {
			return err
		}
	}
	return nil
}

// pngDPIInsertPos يعيد موضع الإدراج بعد IHDR ونهاية التخطي (يتجاوز pHYs موجودة).
func pngDPIInsertPos(pngData []byte) (insertPos, skipEnd int, err error) {
	if len(pngData) < 33 {
		return 0, 0, fmt.Errorf("invalid PNG data")
	}

	sig := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	if !bytes.Equal(pngData[:8], sig) {
		return 0, 0, fmt.Errorf("not a valid PNG")
	}

	chunkLen := binary.BigEndian.Uint32(pngData[8:12])
	if string(pngData[12:16]) != "IHDR" {
		return 0, 0, fmt.Errorf("first chunk is not IHDR")
	}
	insertPos = 8 + 4 + 4 + int(chunkLen) + 4
	if insertPos > len(pngData) {
		return 0, 0, fmt.Errorf("corrupt PNG data: insert position out of bounds")
	}

	skipEnd = insertPos
	if insertPos+8 <= len(pngData) && string(pngData[insertPos+4:insertPos+8]) == "pHYs" {
		existingChunkLen := int(binary.BigEndian.Uint32(pngData[insertPos : insertPos+4]))
		nextChunkPos := insertPos + 4 + 4 + existingChunkLen + 4
		if nextChunkPos < insertPos || nextChunkPos > len(pngData) {
			return 0, 0, fmt.Errorf("corrupt PNG data: bad pHYs length")
		}
		skipEnd = nextChunkPos
	}
	return insertPos, skipEnd, nil
}

// setJpegDPI injects a JFIF APP0 segment with the given DPI right after the SOI marker.
// ترميز JPEG في مكتبة Go القياسية لا يكتب قطعة JFIF — نضيفها يدوياً
// حتى تحترم برامج التخطيط والطابعات مقاس الصورة الفيزيائي
func setJpegDPI(jpegData []byte, dpi int) ([]byte, error) {
	restStart, err := jpegDPIRestStart(jpegData)
	if err != nil {
		return nil, err
	}
	seg := buildJFIFSegment(dpi)

	result := make([]byte, 0, len(jpegData)-(restStart-2)+len(seg))
	result = append(result, jpegData[:2]...)
	result = append(result, seg...)
	result = append(result, jpegData[restStart:]...)
	return result, nil
}

// buildJFIFSegment يبني قطعة APP0 (18 بايت) بالـ DPI المطلوب.
// APP0: marker(2) + len=16(2) + "JFIF\0"(5) + version 1.01(2) + units=1(1) + Xdensity(2) + Ydensity(2) + thumbnail 0×0(2)
func buildJFIFSegment(dpi int) []byte {
	return []byte{
		0xFF, 0xE0,
		0x00, 0x10,
		'J', 'F', 'I', 'F', 0x00,
		0x01, 0x01,
		0x01,
		byte(dpi >> 8), byte(dpi & 0xFF),
		byte(dpi >> 8), byte(dpi & 0xFF),
		0x00, 0x00,
	}
}

// jpegDPIRestStart يعيد بداية البقية بعد SOI (يتجاوز APP0 موجودة لاستبدالها).
func jpegDPIRestStart(jpegData []byte) (int, error) {
	if len(jpegData) < 2 || jpegData[0] != 0xFF || jpegData[1] != 0xD8 {
		return 0, fmt.Errorf("not a valid JPEG")
	}
	if len(jpegData) >= 6 && jpegData[2] == 0xFF && jpegData[3] == 0xE0 {
		existingLen := int(binary.BigEndian.Uint16(jpegData[4:6]))
		endPos := 2 + existingLen
		if endPos <= len(jpegData) {
			return endPos, nil
		}
	}
	return 2, nil
}

// streamJPEGWithDPI يكتب JPEG مع JFIF مباشرة للكاتب — 3 كتابات جزئية بلا نسخة بايت ثانية.
func streamJPEGWithDPI(w io.Writer, jpegData []byte, dpi int) error {
	restStart, err := jpegDPIRestStart(jpegData)
	if err != nil {
		return err
	}
	seg := buildJFIFSegment(dpi)
	for _, part := range [][]byte{jpegData[:2], seg, jpegData[restStart:]} {
		if _, err := w.Write(part); err != nil {
			return err
		}
	}
	return nil
}
