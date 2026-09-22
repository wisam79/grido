package service

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/disintegration/imaging"
	"golang.org/x/image/tiff"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_workshop_scenarios_test.go — 10 سيناريوهات طباعة واقعية من بيئة العمل
// (استوديو صور هوية/مطبعة): تغطي المقاسات الشائعة، الأوضاع، مساحات الألوان،
// الدقات، القوالب الفيزيائية، التركيب الحر، والصور المعدّلة — كل سيناريو يشغّل
// خط GeneratePrintSheet الكامل ويتحقق من الملف والأبعاد والبيانات الوصفية.
// ─────────────────────────────────────────────────────────────────────────────

// writeWorkshopPhoto ينشئ صورة اختبارية بلون صلب بأبعاد واقعية
func writeWorkshopPhoto(t *testing.T, dir, name string, w, h int, c color.RGBA) string {
	t.Helper()
	imgPath := filepath.Join(dir, name)
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for x := 0; x < w; x++ {
		for y := 0; y < h; y++ {
			img.Set(x, y, c)
		}
	}
	if err := imaging.Save(img, imgPath); err != nil {
		t.Fatalf("failed to save workshop photo: %v", err)
	}
	return imgPath
}

// workshopTempDir ينشئ مجلد عمل مؤقت لسيناريو واحد
func workshopTempDir(t *testing.T) string {
	t.Helper()
	tempDir, err := os.MkdirTemp("", "print_workshop_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	t.Cleanup(func() { os.RemoveAll(tempDir) })
	return tempDir
}

// assertWorkshopSheet يتحقق من نجاح الورقة: ملف موجود + أبعاد بكسل الورقة + وثيقة HTML
func assertWorkshopSheet(t *testing.T, outPath, htmlDoc string, paperWMM, paperHMM float64, dpi int) {
	t.Helper()
	if _, err := os.Stat(outPath); os.IsNotExist(err) {
		t.Fatalf("output file does not exist: %s", outPath)
	}
	t.Cleanup(func() {
		os.Remove(outPath)
		if strings.HasSuffix(outPath, ".html") {
			os.Remove(strings.TrimSuffix(outPath, ".html") + ".png")
			os.Remove(strings.TrimSuffix(outPath, ".html") + ".jpg")
		}
	})

	outImg, err := imaging.Open(outPath)
	if err != nil {
		t.Fatalf("failed to open output image: %v", err)
	}
	bounds := outImg.Bounds()
	expectedW := int(math.Round(mmToPx(paperWMM, dpi)))
	expectedH := int(math.Round(mmToPx(paperHMM, dpi)))
	if diff := mathAbs(bounds.Dx() - expectedW); diff > 2 {
		t.Errorf("expected width close to %d, got %d", expectedW, bounds.Dx())
	}
	if diff := mathAbs(bounds.Dy() - expectedH); diff > 2 {
		t.Errorf("expected height close to %d, got %d", expectedH, bounds.Dy())
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Errorf("expected HTML document for iframe print")
	}
}

// assertJFIFDPI يتحقق من علامة كثافة DPI في JPEG (احترام المقاس الفيزيائي)
func assertJFIFDPI(t *testing.T, jpgPath string, dpi int) {
	t.Helper()
	data, err := os.ReadFile(jpgPath)
	if err != nil {
		t.Fatalf("failed to read JPEG output: %v", err)
	}
	if len(data) < 18 || !bytes.Contains(data[:16], []byte("JFIF")) {
		t.Fatalf("expected JFIF segment in JPEG output")
	}
	if data[13] != 1 {
		t.Errorf("expected JFIF density units = 1 (DPI), got %v", data[13])
	}
	if density := binary.BigEndian.Uint16(data[14:16]); int(density) != dpi {
		t.Errorf("expected X density %d DPI, got %d", dpi, density)
	}
}

func neutralWorkshopItem(imageSrc string, x, y, w, h float64) domain.PrintItem {
	return domain.PrintItem{
		ImageSrc: imageSrc, X: x, Y: y, W: w, H: h,
		Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100, Zoom: 1,
	}
}

// 1. صورة هوية 4×6سم على ورق 10×15سم — JPEG مع خط قص وعلامة DPI
func TestPrintWorkshop_IDPhoto_4x6_on_10x15(t *testing.T) {
	tempDir := workshopTempDir(t)
	photo := writeWorkshopPhoto(t, tempDir, "id.png", 400, 600, color.RGBA{R: 232, G: 196, B: 160, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 100.0, PaperHeightMM: 150.0, DPI: 300,
		BackgroundColor: "#FFFFFF", ExportFormat: "jpeg",
		ShowCutLines: true,
		CutLines: []domain.CutLine{
			{X1: 30, Y1: 45, X2: 70, Y2: 45},
			{X1: 30, Y1: 105, X2: 70, Y2: 105},
		},
		Items: []domain.PrintItem{
			neutralWorkshopItem(photo, 30, 45, 40, 60),
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("ID photo sheet failed: %v", err)
	}
	assertWorkshopSheet(t, outPath, htmlDoc, 100, 150, 300)
	assertJFIFDPI(t, outPath, 300)
}

// 2. طقم جواز سفر: صورتان 3.5×4.5 + أربع 2.5×3.5 على A4
func TestPrintWorkshop_PassportSet_MixedSizes_A4(t *testing.T) {
	tempDir := workshopTempDir(t)
	photo := writeWorkshopPhoto(t, tempDir, "passport.png", 350, 450, color.RGBA{R: 210, G: 180, B: 150, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 210.0, PaperHeightMM: 297.0, DPI: 300,
		BackgroundColor: "#FFFFFF", ExportFormat: "png",
		ShowCutLines: true,
		CutLines: []domain.CutLine{
			{X1: 15, Y1: 15, X2: 120, Y2: 15},
			{X1: 15, Y1: 115, X2: 120, Y2: 115},
		},
		Items: []domain.PrintItem{
			neutralWorkshopItem(photo, 15, 15, 35, 45),
			neutralWorkshopItem(photo, 60, 15, 35, 45),
			neutralWorkshopItem(photo, 15, 70, 25, 35),
			neutralWorkshopItem(photo, 45, 70, 25, 35),
			neutralWorkshopItem(photo, 75, 70, 25, 35),
			neutralWorkshopItem(photo, 105, 70, 25, 35),
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("passport set sheet failed: %v", err)
	}
	assertWorkshopSheet(t, outPath, htmlDoc, 210, 297, 300)
}

// 3. تغطية كاملة بلا هوامش على A4 (مسار تسامح التقريب العائم 209.97×297.01)
func TestPrintWorkshop_FullBleed_A4_Borderless(t *testing.T) {
	tempDir := workshopTempDir(t)
	photo := writeWorkshopPhoto(t, tempDir, "bleed.jpg", 1240, 1754, color.RGBA{R: 90, G: 140, B: 200, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 210.0, PaperHeightMM: 297.0, DPI: 300,
		BackgroundColor: "#FFFFFF", ExportFormat: "jpeg",
		Items: []domain.PrintItem{
			neutralWorkshopItem(photo, 0, 0, 209.97, 297.01),
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("full-bleed sheet failed: %v", err)
	}
	assertWorkshopSheet(t, outPath, htmlDoc, 210, 297, 300)
	assertJFIFDPI(t, outPath, 300)
}

// 4. تصدير CMYK TIFF للمطبعة الاحترافية مع خطوط قص
func TestPrintWorkshop_CMYK_TIFF_Press_A4(t *testing.T) {
	tempDir := workshopTempDir(t)
	photo := writeWorkshopPhoto(t, tempDir, "press.png", 800, 600, color.RGBA{R: 180, G: 60, B: 60, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 210.0, PaperHeightMM: 297.0, DPI: 150,
		BackgroundColor: "#FFFFFF", ExportFormat: "tiff", ColorSpace: "cmyk",
		ShowCutLines: true,
		CutLines: []domain.CutLine{
			{X1: 20, Y1: 20, X2: 190, Y2: 20},
		},
		Items: []domain.PrintItem{
			neutralWorkshopItem(photo, 20, 20, 80, 120),
			neutralWorkshopItem(photo, 110, 20, 80, 120),
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("CMYK press sheet failed: %v", err)
	}
	if !strings.HasSuffix(outPath, ".tif") {
		t.Fatalf("expected TIFF output, got: %s", outPath)
	}
	defer os.Remove(outPath)

	info, err := os.Stat(outPath)
	if err != nil || info.Size() < 10*1024 {
		t.Fatalf("expected non-trivial TIFF file, size=%d err=%v", info.Size(), err)
	}
	f, err := os.Open(outPath)
	if err != nil {
		t.Fatalf("failed to open TIFF output: %v", err)
	}
	defer f.Close()
	decoded, err := tiff.Decode(f)
	if err != nil {
		t.Fatalf("failed to decode TIFF output: %v", err)
	}
	expectedW := int(math.Round(mmToPx(210.0, 150)))
	expectedH := int(math.Round(mmToPx(297.0, 150)))
	bounds := decoded.Bounds()
	if diff := mathAbs(bounds.Dx() - expectedW); diff > 2 {
		t.Errorf("expected TIFF width close to %d, got %d", expectedW, bounds.Dx())
	}
	if diff := mathAbs(bounds.Dy() - expectedH); diff > 2 {
		t.Errorf("expected TIFF height close to %d, got %d", expectedH, bounds.Dy())
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Errorf("expected HTML document for iframe print")
	}
}

// 5. شبكة تكرار: 4 نسخ 6×9سم على ورقة A5
func TestPrintWorkshop_RepeatGrid_A5_4Copies(t *testing.T) {
	tempDir := workshopTempDir(t)
	photo := writeWorkshopPhoto(t, tempDir, "repeat.png", 600, 900, color.RGBA{R: 120, G: 170, B: 110, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 148.0, PaperHeightMM: 210.0, DPI: 200,
		BackgroundColor: "#FFFFFF", ExportFormat: "png",
		ShowCutLines: true,
		CutLines: []domain.CutLine{
			{X1: 10, Y1: 10, X2: 138, Y2: 10},
			{X1: 10, Y1: 200, X2: 138, Y2: 200},
		},
		Items: []domain.PrintItem{
			neutralWorkshopItem(photo, 10, 10, 60, 90),
			neutralWorkshopItem(photo, 78, 10, 60, 90),
			neutralWorkshopItem(photo, 10, 110, 60, 90),
			neutralWorkshopItem(photo, 78, 110, 60, 90),
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("repeat grid sheet failed: %v", err)
	}
	assertWorkshopSheet(t, outPath, htmlDoc, 148, 210, 200)
}

// 6. بانوراما أفقية على A4 بالاتجاه الأفقي (تبديل الأبعاد تلقائياً)
func TestPrintWorkshop_Landscape_Panorama_A4(t *testing.T) {
	tempDir := workshopTempDir(t)
	photo := writeWorkshopPhoto(t, tempDir, "panorama.png", 1200, 800, color.RGBA{R: 70, G: 110, B: 160, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 210.0, PaperHeightMM: 297.0, DPI: 300,
		BackgroundColor: "#FFFFFF", ExportFormat: "jpeg", Orientation: "landscape",
		Items: []domain.PrintItem{
			neutralWorkshopItem(photo, 8, 10, 280, 190),
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("landscape panorama sheet failed: %v", err)
	}
	// الاتجاه الأفقي يبدّل الورقة إلى 297×210مم
	assertWorkshopSheet(t, outPath, htmlDoc, 297, 210, 300)
	assertJFIFDPI(t, outPath, 300)
}

// 7. طوابع صغيرة بدقة 600 DPI على ورق 10×15سم
func TestPrintWorkshop_Stamps_600DPI_10x15(t *testing.T) {
	tempDir := workshopTempDir(t)
	photo := writeWorkshopPhoto(t, tempDir, "stamp.png", 250, 300, color.RGBA{R: 200, G: 170, B: 90, A: 255})

	svc := NewPrintService()
	items := []domain.PrintItem{}
	xs := []float64{8, 37, 66}
	ys := []float64{10, 45, 80}
	count := 0
	for _, y := range ys {
		for _, x := range xs {
			if count >= 8 {
				break
			}
			items = append(items, neutralWorkshopItem(photo, x, y, 25, 30))
			count++
		}
	}

	req := domain.PrintRequest{
		PaperWidthMM: 100.0, PaperHeightMM: 150.0, DPI: 600,
		BackgroundColor: "#FFFFFF", ExportFormat: "png",
		ShowCutLines:    true,
		Items:           items,
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("stamps sheet failed: %v", err)
	}
	assertWorkshopSheet(t, outPath, htmlDoc, 100, 150, 600)
}

// 8. كولاج 4 خانات بصور مختلفة: حدود، استدارة، خلفيات، خطوط قص
func TestPrintWorkshop_Collage_4Slots_A4(t *testing.T) {
	tempDir := workshopTempDir(t)
	photoA := writeWorkshopPhoto(t, tempDir, "a.png", 450, 600, color.RGBA{R: 200, G: 120, B: 120, A: 255})
	photoB := writeWorkshopPhoto(t, tempDir, "b.png", 450, 600, color.RGBA{R: 120, G: 200, B: 120, A: 255})
	photoC := writeWorkshopPhoto(t, tempDir, "c.png", 450, 600, color.RGBA{R: 120, G: 120, B: 200, A: 255})
	photoD := writeWorkshopPhoto(t, tempDir, "d.png", 450, 600, color.RGBA{R: 200, G: 200, B: 120, A: 255})

	slot := func(src string, x, y float64) domain.PrintItem {
		return domain.PrintItem{
			ImageSrc: src, X: x, Y: y, W: 90, H: 120,
			Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100,
			SlotAspect: 90.0 / 120.0, Zoom: 1,
			CornerRadiusMM: 2, BorderWidthMM: 0.5, BorderColor: "#333333",
			BgColor: "#F2F2F2",
		}
	}

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 210.0, PaperHeightMM: 297.0, DPI: 200,
		BackgroundColor: "#FFFFFF", ExportFormat: "png",
		ShowCutLines: true,
		CutLines: []domain.CutLine{
			{X1: 10, Y1: 10, X2: 200, Y2: 10},
			{X1: 10, Y1: 260, X2: 200, Y2: 260},
		},
		Items: []domain.PrintItem{
			slot(photoA, 10, 10),
			slot(photoB, 110, 10),
			slot(photoC, 10, 140),
			slot(photoD, 110, 140),
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("collage sheet failed: %v", err)
	}
	assertWorkshopSheet(t, outPath, htmlDoc, 210, 297, 200)
}

// 9. وضع حر: تركيب صالح يُرسم داخل خلية على A5 مع تحقق بكسل
func TestPrintWorkshop_FreeCanvas_ValidComposition_A5(t *testing.T) {
	tempDir := workshopTempDir(t)
	photo := writeWorkshopPhoto(t, tempDir, "free.png", 100, 100, color.RGBA{R: 0, G: 0, B: 255, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 148.0, PaperHeightMM: 210.0, DPI: 200,
		BackgroundColor: "#FFFFFF", ExportFormat: "png",
		Items: []domain.PrintItem{
			{X: 24, Y: 30, W: 100, H: 140},
		},
		Composition: &domain.CanvasComposition{
			CanvasWidthPx: 1000, CanvasHeightPx: 1400,
			CanvasWidthMM: 100, CanvasHeightMM: 140,
			BackgroundColor: "#00FF00",
			Items: []domain.PrintItem{
				{
					ImageSrc: photo, X: 0, Y: 0, W: 500, H: 1400,
					Filter: "none", Brightness: 100, Contrast: 100, Saturation: 100,
				},
			},
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("free canvas sheet failed: %v", err)
	}
	defer os.Remove(outPath)

	outImg, err := imaging.Open(outPath)
	if err != nil {
		t.Fatalf("failed to open output image: %v", err)
	}
	pixelAt := func(xMM, yMM float64) color.RGBA {
		px := int(math.Round(mmToPx(xMM, 200)))
		py := int(math.Round(mmToPx(yMM, 200)))
		return outImg.At(px, py).(color.RGBA)
	}

	// (40,50)مم داخل منطقة الصورة الزرقاء من التركيب
	blue := pixelAt(40, 50)
	if blue.R != 0 || blue.G != 0 || blue.B < 240 {
		t.Errorf("expected blue composition image, got %+v", blue)
	}
	// (90,50)مم داخل الكانفاس خارج الصورة → خلفية خضراء
	green := pixelAt(90, 50)
	if green.G < 240 || green.B > 20 {
		t.Errorf("expected green composition background, got %+v", green)
	}
	// (5,5)مم خارج الخلية → ورق أبيض
	white := pixelAt(5, 5)
	if white.R < 240 || white.G < 240 || white.B < 240 {
		t.Errorf("expected white paper outside cell, got %+v", white)
	}
	if !strings.HasPrefix(htmlDoc, "<!DOCTYPE html>") {
		t.Errorf("expected HTML document for iframe print")
	}
}

// 10. صورة معدّلة: تدوير 90 + قلب أفقي + رمادي + زوم وسحب
func TestPrintWorkshop_EditedPhoto_RotatedFlippedFiltered(t *testing.T) {
	tempDir := workshopTempDir(t)
	photo := writeWorkshopPhoto(t, tempDir, "edited.png", 400, 600, color.RGBA{R: 190, G: 150, B: 120, A: 255})

	svc := NewPrintService()
	req := domain.PrintRequest{
		PaperWidthMM: 100.0, PaperHeightMM: 150.0, DPI: 200,
		BackgroundColor: "#FFFFFF", ExportFormat: "jpeg",
		ShowCutLines: true,
		CutLines: []domain.CutLine{
			{X1: 15, Y1: 20, X2: 85, Y2: 20},
		},
		Items: []domain.PrintItem{
			{
				ImageSrc: photo, X: 15, Y: 20, W: 70, H: 100,
				Filter: "grayscale", Brightness: 110, Contrast: 105, Saturation: 100,
				SlotAspect: 70.0 / 100.0, Zoom: 1.3, DragX: 20, DragY: -10,
				FlipX: true, Rotation: 90,
			},
		},
	}

	outPath, htmlDoc, err := svc.GeneratePrintSheet(req)
	if err != nil {
		t.Fatalf("edited photo sheet failed: %v", err)
	}
	assertWorkshopSheet(t, outPath, htmlDoc, 100, 150, 200)
	assertJFIFDPI(t, outPath, 200)
}
