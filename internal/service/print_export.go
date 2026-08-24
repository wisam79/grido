package service

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"hash/crc32"
	"image/jpeg"
	"image/png"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/image/tiff"

	"github.com/fogleman/gg"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_export.go — حفظ مخرجات الطباعة وحقن بيانات DPI
//
// يدعم: PNG/JPEG (sRGB) و TIFF/JPEG (CMYK) + معاينة HTML مضمّنة Base64،
// حقن pHYs في PNG و JFIF APP0 في JPEG ليُحترم المقاس الفيزيائي عند الطباعة.
// ─────────────────────────────────────────────────────────────────────────────

func (s *PrintService) saveOutput(dc *gg.Context, req domain.PrintRequest) (string, string, error) {
	appDir := utils.GetAppDir()
	outDir := filepath.Join(appDir, "Exports")
	_ = os.MkdirAll(outDir, 0755)

	// 🧹 تنظيف المخرجات القديمة (أقدم من 24 ساعة) في الخلفية لتفادي امتلاء القرص
	// دون تأخير الطلب الحالي أو حذف ملف حوار طباعة ما زال مفتوحاً في المقدمة.
	// نحذف ملفات الطباعة print_* فقط — لا نلمس ملفات المستخدم الخاصة
	go func() {
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

	baseName := fmt.Sprintf("print_%d", time.Now().UnixNano())
	isCMYK := strings.EqualFold(req.ColorSpace, "cmyk")

	var imageName string
	var imagePath string
	var htmlImageName string

	if isCMYK {
		cmykImg := ConvertRGBAtoCMYK(dc.Image())
		ApplyPureBlackCutLines(cmykImg, req)

		if strings.EqualFold(req.ExportFormat, "jpeg") || strings.EqualFold(req.ExportFormat, "jpg") {
			imageName = baseName + ".jpg"
			imagePath = filepath.Join(outDir, imageName)
			f, err := os.Create(imagePath)
			if err != nil {
				return "", "", fmt.Errorf("create cmyk jpeg: %w", err)
			}
			err = jpeg.Encode(f, cmykImg, &jpeg.Options{Quality: 95})
			f.Close()
			if err != nil {
				return "", "", fmt.Errorf("encode cmyk jpeg: %w", err)
			}
		} else {
			// Default format for CMYK is TIFF
			imageName = baseName + ".tif"
			imagePath = filepath.Join(outDir, imageName)
			f, err := os.Create(imagePath)
			if err != nil {
				return "", "", fmt.Errorf("create cmyk tiff: %w", err)
			}
			err = tiff.Encode(f, cmykImg, &tiff.Options{Compression: tiff.Uncompressed})
			f.Close()
			if err != nil {
				return "", "", fmt.Errorf("encode cmyk tiff: %w", err)
			}
		}

		// 🌟 Save a browser-compatible PNG for HTML print window preview (browsers cannot decode TIFF in <img> tags)
		htmlImageName = baseName + "_preview.png"
		htmlImagePath := filepath.Join(outDir, htmlImageName)
		var buf bytes.Buffer
		enc := &png.Encoder{CompressionLevel: png.BestSpeed}
		if err := enc.Encode(&buf, dc.Image()); err == nil {
			pngData := buf.Bytes()
			if updatedData, err := setPngDPI(pngData, req.DPI); err == nil {
				pngData = updatedData
			}
			_ = os.WriteFile(htmlImagePath, pngData, 0644)
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
			f, err := os.Create(imagePath)
			if err != nil {
				return "", "", fmt.Errorf("create jpeg: %w", err)
			}
			var buf bytes.Buffer
			err = jpeg.Encode(&buf, dc.Image(), &jpeg.Options{Quality: 95})
			if err != nil {
				f.Close()
				return "", "", err
			}
			jpegData := buf.Bytes()
			if updatedData, err := setJpegDPI(jpegData, req.DPI); err == nil {
				jpegData = updatedData
			} else {
				slog.Warn("Failed to set JPEG DPI", "error", err)
			}
			if _, err = f.Write(jpegData); err != nil {
				f.Close()
				return "", "", err
			}
			f.Close()
		} else {
			// sRGB PNG (السلوك الافتراضي)
			imageName = baseName + ".png"
			htmlImageName = imageName
			imagePath = filepath.Join(outDir, imageName)
			var buf bytes.Buffer
			enc := &png.Encoder{CompressionLevel: png.BestSpeed}
			err := enc.Encode(&buf, dc.Image())
			if err != nil {
				return "", "", err
			}

			pngData := buf.Bytes()
			if updatedData, err := setPngDPI(pngData, req.DPI); err == nil {
				pngData = updatedData
			} else {
				slog.Warn("Failed to set PNG DPI", "error", err)
			}

			err = os.WriteFile(imagePath, pngData, 0644)
			if err != nil {
				return "", "", err
			}
		}
	}

	htmlPath := filepath.Join(outDir, baseName+".html")

	// إنتاج ملف HTML لضمان طباعة دقيقة للمليمترات عبر متصفح الويب (يتجاهل عارض الصور الافتراضي للويندوز)
	// HTML file for native OS printing (uses file:// absolute path so external apps like mshtml.dll can load the image)
	absImagePath := filepath.Join(outDir, htmlImageName)
	fileURI := "file:///" + strings.ReplaceAll(filepath.ToSlash(absImagePath), " ", "%20")

	// 🛡️ تضمين الصورة كـ Inline Base64 يضمن عدم طباعة صفحة فارغة مطلقاً بسبب تأخر التحميل عبر الشبكة/القرص
	imageSrcForHTML := fileURI
	if imgData, err := os.ReadFile(absImagePath); err == nil && len(imgData) > 0 {
		mimeType := "image/png"
		if strings.HasSuffix(strings.ToLower(htmlImageName), ".jpg") || strings.HasSuffix(strings.ToLower(htmlImageName), ".jpeg") {
			mimeType = "image/jpeg"
		}
		imageSrcForHTML = fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(imgData))
	}

	htmlContent := buildNativePrintHTML(req.PaperWidthMM, req.PaperHeightMM, imageSrcForHTML)
	_ = os.WriteFile(htmlPath, []byte(htmlContent), 0644)

	// HTML مع مسار Inline Base64 للعرض والطباعة الفورية داخل WebView2 عبر iframe
	selfContainedHTML := buildSelfContainedHTML(req.PaperWidthMM, req.PaperHeightMM, imageSrcForHTML)

	return imagePath, selfContainedHTML, nil
}

// buildNativePrintHTML يبني صفحة الطباعة لنافذة المتصفح الأصلية بمقاس ورقة دقيق بالمليمتر
func buildNativePrintHTML(paperWMM, paperHMM float64, imageSrc string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title></title>
<style>
  @page { margin: 0 !important; size: %.2fmm %.2fmm; }
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
    @page { margin: 0 !important; size: %.2fmm %.2fmm; }
    html, body { background: white !important; margin: 0 !important; padding: 0 !important; width: %.2fmm !important; height: %.2fmm !important; }
    img { position: absolute !important; top: 0 !important; left: 0 !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: %.2fmm !important; height: %.2fmm !important; object-fit: contain !important; }
  }
</style>
</head>
<body onload="setTimeout(function(){ window.print(); window.close(); }, 500)">
  <img src="%s" />
</body>
</html>`, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, imageSrc)
}

// buildSelfContainedHTML يبني صفحة معاينة/طباعة ذاتية الاحتواء لـ WebView2 (iframe)
func buildSelfContainedHTML(paperWMM, paperHMM float64, imageSrc string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title></title>
<style>
  @page { margin: 0 !important; size: %.2fmm %.2fmm; }
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
    @page { margin: 0 !important; size: %.2fmm %.2fmm; }
    html, body { width: %.2fmm !important; height: %.2fmm !important; margin: 0 !important; padding: 0 !important; }
    img { position: absolute !important; top: 0 !important; left: 0 !important; width: %.2fmm !important; height: %.2fmm !important; object-fit: contain !important; }
  }
</style>
</head>
<body>
  <img src="%s" />
</body>
</html>`, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, paperWMM, paperHMM, imageSrc)
}

// setPngDPI modifies a PNG byte slice to include a pHYs chunk with the specified DPI.
func setPngDPI(pngData []byte, dpi int) ([]byte, error) {
	if len(pngData) < 33 {
		return nil, fmt.Errorf("invalid PNG data")
	}

	sig := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	if !bytes.Equal(pngData[:8], sig) {
		return nil, fmt.Errorf("not a valid PNG")
	}

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

	chunkLen := binary.BigEndian.Uint32(pngData[8:12])
	if string(pngData[12:16]) != "IHDR" {
		return nil, fmt.Errorf("first chunk is not IHDR")
	}
	insertPos := 8 + 4 + 4 + int(chunkLen) + 4 // sig + length + type + data + CRC
	if insertPos > len(pngData) {
		return nil, fmt.Errorf("corrupt PNG data: insert position out of bounds")
	}

	// Check if pHYs already exists right after IHDR
	if insertPos+8 <= len(pngData) && string(pngData[insertPos+4:insertPos+8]) == "pHYs" {
		// Replace existing pHYs chunk
		existingChunkLen := int(binary.BigEndian.Uint32(pngData[insertPos : insertPos+4]))
		nextChunkPos := insertPos + 4 + 4 + existingChunkLen + 4

		result := make([]byte, 0, len(pngData)-existingChunkLen+len(physChunk))
		result = append(result, pngData[:insertPos]...)
		result = append(result, physChunk...)
		result = append(result, pngData[nextChunkPos:]...)
		return result, nil
	}

	result := make([]byte, 0, len(pngData)+len(physChunk))
	result = append(result, pngData[:insertPos]...)
	result = append(result, physChunk...)
	result = append(result, pngData[insertPos:]...)

	return result, nil
}

// setJpegDPI injects a JFIF APP0 segment with the given DPI right after the SOI marker.
// ترميز JPEG في مكتبة Go القياسية لا يكتب قطعة JFIF — نضيفها يدوياً
// حتى تحترم برامج التخطيط والطابعات مقاس الصورة الفيزيائي
func setJpegDPI(jpegData []byte, dpi int) ([]byte, error) {
	if len(jpegData) < 2 || jpegData[0] != 0xFF || jpegData[1] != 0xD8 {
		return nil, fmt.Errorf("not a valid JPEG")
	}
	// APP0: marker(2) + len=16(2) + "JFIF\0"(5) + version 1.01(2) + units=1(1) + Xdensity(2) + Ydensity(2) + thumbnail 0×0(2)
	seg := []byte{
		0xFF, 0xE0,
		0x00, 0x10,
		'J', 'F', 'I', 'F', 0x00,
		0x01, 0x01,
		0x01,
		byte(dpi >> 8), byte(dpi & 0xFF),
		byte(dpi >> 8), byte(dpi & 0xFF),
		0x00, 0x00,
	}
	result := make([]byte, 0, len(jpegData)+len(seg))
	result = append(result, jpegData[:2]...)
	result = append(result, seg...)
	result = append(result, jpegData[2:]...)
	return result, nil
}
