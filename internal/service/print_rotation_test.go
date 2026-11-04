package service

import (
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"

	"grido/internal/core/domain"
)

// TestIsQuarterRotation يتحقق من تصنيف زوايا التدوير 90/270 (mod 360)
func TestIsQuarterRotation(t *testing.T) {
	cases := []struct {
		rotation float64
		want     bool
	}{
		{0, false},
		{90, true},
		{180, false},
		{270, true},
		{360, false},
		{-90, true},
		{-270, true},
		{450, true},
		{45, false},
	}
	for _, c := range cases {
		if got := isQuarterRotation(c.rotation); got != c.want {
			t.Errorf("isQuarterRotation(%v) = %v, want %v", c.rotation, got, c.want)
		}
	}
}

// TestComputeCropFromSlotQuarterSwap يتحقق من تبديل نسبة الخلية عند التدوير 90/270
// ليطابق تبديل Konva (isRotated90or270 ? height/width : width/height)
func TestComputeCropFromSlotQuarterSwap(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 1000, 600)) // نسبة 1.667

	// الخلية نسبة 1.5، بلا تدوير: القصّ أفقي بعرض 900 متمركز عند 50
	itemNoRot := domain.PrintItem{
		SlotAspect: 1.5,
		Rotation:   0,
		Zoom:       1,
	}
	cx, cy, cw, ch := computeCropFromSlot(itemNoRot, img)
	if cw != 900 || ch != 600 || cx != 50 || cy != 0 {
		t.Errorf("no-rotation crop = (%v,%v %v×%v), want (50,0 900×600)", cx, cy, cw, ch)
	}

	// نفس الخلية مع تدوير 90: النسبة المبدّلة 1/1.5=0.667 → قصّ بعرض 400 متمركز عند 300
	itemRot := domain.PrintItem{
		SlotAspect: 1.5,
		Rotation:   90,
		Zoom:       1,
	}
	cx, cy, cw, ch = computeCropFromSlot(itemRot, img)
	if cw != 400 || ch != 600 || cx != 300 || cy != 0 {
		t.Errorf("quarter-rotation crop = (%v,%v %v×%v), want (300,0 400×600)", cx, cy, cw, ch)
	}

	// تدوير 270 يعطي نفس القصّ
	itemRot270 := itemRot
	itemRot270.Rotation = 270
	cx2, cy2, cw2, ch2 := computeCropFromSlot(itemRot270, img)
	if cw2 != cw || ch2 != ch || cx2 != cx || cy2 != cy {
		t.Errorf("270° crop = (%v,%v %v×%v), want identical to 90° crop", cx2, cy2, cw2, ch2)
	}

	// تدوير 180 لا يبدّل النسبة
	itemRot180 := itemRot
	itemRot180.Rotation = 180
	cx3, cy3, cw3, ch3 := computeCropFromSlot(itemRot180, img)
	if cw3 != 900 || ch3 != 600 || cx3 != 50 || cy3 != 0 {
		t.Errorf("180° crop = (%v,%v %v×%v), want identical to no-rotation crop", cx3, cy3, cw3, ch3)
	}
}

func neutralItem() domain.PrintItem {
	return domain.PrintItem{
		Brightness: 100,
		Contrast:   100,
		Saturation: 100,
		Zoom:       1,
		FlipX:      false,
		FlipY:      false,
		Filter:     "none",
	}
}

// TestApplyImageProcessingRotationDirection يتحقق من أن التدوير في الطباعة يتم
// مع عقارب الساعة (مطابقاً لـ Konva/CSS) — imaging.Rotate يدور عكسها للزوايا الموجبة
func TestApplyImageProcessingRotationDirection(t *testing.T) {
	red := color.RGBA{R: 255, G: 0, B: 0, A: 255}
	blue := color.RGBA{R: 0, G: 0, B: 255, A: 255}
	src := image.NewRGBA(image.Rect(0, 0, 2, 1))
	src.Set(0, 0, red)  // يسار
	src.Set(1, 0, blue) // يمين

	item := neutralItem()
	item.Rotation = 90
	// targetW=2, targetH=1 → بعد التدوير 90/270 يجب أن يتبدل الهدف إلى 1×2
	out := applyImageProcessing(src, item, 2, 1)

	b := out.Bounds()
	if b.Dx() != 1 || b.Dy() != 2 {
		t.Fatalf("rotated size = %dx%d, want 1x2 (target swap for 90°)", b.Dx(), b.Dy())
	}

	// تدوير مع عقارب الساعة: الأحمر (يسار الصورة) يجب أن يصبح الأعلى
	gotTop := out.At(0, 0)
	if !sameColor(gotTop, red) {
		t.Errorf("top pixel after 90° = %v, want red (clockwise rotation)", gotTop)
	}
	gotBottom := out.At(0, 1)
	if !sameColor(gotBottom, blue) {
		t.Errorf("bottom pixel after 90° = %v, want blue (clockwise rotation)", gotBottom)
	}
}

// TestApplyImageProcessingRotation180 يتحقق من بقاء الأبعاد ودقة الاتجاه عند 180
func TestApplyImageProcessingRotation180(t *testing.T) {
	red := color.RGBA{R: 255, G: 0, B: 0, A: 255}
	src := image.NewRGBA(image.Rect(0, 0, 2, 2))
	src.Set(0, 0, red)

	item := neutralItem()
	item.Rotation = 180
	out := applyImageProcessing(src, item, 2, 2)
	b := out.Bounds()
	if b.Dx() != 2 || b.Dy() != 2 {
		t.Fatalf("180° size = %dx%d, want 2x2", b.Dx(), b.Dy())
	}
	// بعد 180° يصبح الأحمر في أسفل اليمين
	if !sameColor(out.At(1, 1), red) {
		t.Errorf("after 180° red should be at bottom-right, got %v", out.At(1, 1))
	}
}

func TestDrawItemImageQuarterTurnFillsCollageAndCentersLegacy(t *testing.T) {
	red := color.NRGBA{R: 255, A: 255}
	src := imaging.New(60, 40, red)
	for _, tc := range []struct {
		name        string
		rotation    float64
		slotAspect  float64
		left, right int
	}{
		{name: "collage90", rotation: 90, slotAspect: 1.5, left: 10, right: 70},
		{name: "collage270", rotation: 270, slotAspect: 1.5, left: 10, right: 70},
		{name: "legacy90", rotation: 90, left: 20, right: 60},
		{name: "legacy270", rotation: 270, left: 20, right: 60},
	} {
		t.Run(tc.name, func(t *testing.T) {
			item := neutralItem()
			item.X, item.Y, item.W, item.H = 1, 1, 6, 4
			item.Rotation, item.SlotAspect = tc.rotation, tc.slotAspect
			processed := applyImageProcessing(src, item, 60, 40)
			dc := gg.NewContext(100, 70)
			dc.SetColor(color.White)
			dc.Clear()
			drawItemImage(dc, processed, item, 254) // 10 px/mm

			for y := 0; y < 70; y++ {
				for x := 0; x < 100; x++ {
					var want color.Color = color.White
					if x >= tc.left && x < tc.right && y >= 10 && y < 50 {
						want = red
					}
					if got := dc.Image().At(x, y); !sameColor(got, want) {
						t.Fatalf("pixel (%d,%d) = %v, want %v (fixed slot clip and centered image)", x, y, got, want)
					}
				}
			}
		})
	}
}

func sameColor(a, b color.Color) bool {
	ar, ag, ab, aa := a.RGBA()
	br, bg, bb, ba := b.RGBA()
	return ar == br && ag == bg && ab == bb && aa == ba
}

func TestLoadRawImageNormalizesExifBeforeCrop(t *testing.T) {
	for n := 1; n <= 8; n++ {
		t.Run(orientationName(n), func(t *testing.T) {
			src := "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(loadExifFixture(t, n))
			cache := &imageCache{images: make(map[string]image.Image), access: make(map[string]time.Time)}
			img, err := loadRawImage(src, "print-exif-"+orientationName(n), cache)
			if err != nil {
				t.Fatalf("فك صورة الطباعة: %v", err)
			}

			wantW, wantH := exifFixtureW, exifFixtureH
			if n >= 5 {
				wantW, wantH = wantH, wantW
			}
			if img.Bounds().Dx() != wantW || img.Bounds().Dy() != wantH {
				t.Fatalf("أبعاد الصورة المطبعة = %dx%d، المتوقع %dx%d", img.Bounds().Dx(), img.Bounds().Dy(), wantW, wantH)
			}

			normalized, ok := img.(*image.NRGBA)
			if !ok {
				normalized = imaging.Clone(img)
			}
			if quadrant := detectRedQuadrant(t, normalized); quadrant != redQuadrantAfterOrientation[n] {
				t.Fatalf("الربع الأحمر بعد التطبيع = %s، المتوقع %s", quadrant, redQuadrantAfterOrientation[n])
			}
		})
	}
}

// 🧮 الحاضنة الذهبية المشتركة TS/Go (الدفعة 6.3): test-fixtures/print-crop-golden.json
// وُلدت من computeSlotCrop الواجهي ولا تُعاد توليدها — أي انحراف بين هذا
// الاشتقاق في Go وبين القيم الذهبية = انحراف طباعة حقيقي يوقف الاختبار.
func TestComputeCropFromSlot_GoldenFixtures(t *testing.T) {
	data, err := os.ReadFile(filepath.Join("..", "..", "test-fixtures", "print-crop-golden.json"))
	if err != nil {
		t.Fatalf("قراءة الحاضنة الذهبية فشلت: %v", err)
	}

	var fixture struct {
		Tolerance float64 `json:"tolerance"`
		Cases     []struct {
			Name  string `json:"name"`
			Input struct {
				ImgW     float64 `json:"imgW"`
				ImgH     float64 `json:"imgH"`
				WMM      float64 `json:"wMM"`
				HMM      float64 `json:"hMM"`
				Zoom     float64 `json:"zoom"`
				DragX    float64 `json:"dragX"`
				DragY    float64 `json:"dragY"`
				Rotation float64 `json:"rotation"`
			} `json:"input"`
			Expected struct {
				CropX float64 `json:"cropX"`
				CropY float64 `json:"cropY"`
				CropW float64 `json:"cropW"`
				CropH float64 `json:"cropH"`
			} `json:"expected"`
		} `json:"cases"`
	}
	if err := json.Unmarshal(data, &fixture); err != nil {
		t.Fatalf("تفكيك الحاضنة الذهبية فشل: %v", err)
	}

	for _, tc := range fixture.Cases {
		tc := tc
		t.Run(tc.Name, func(t *testing.T) {
			img := image.NewRGBA(image.Rect(0, 0, int(tc.Input.ImgW), int(tc.Input.ImgH)))
			item := domain.PrintItem{
				// نفس ما ترسله الواجهة: نسبة المستطيل النهائي — Go يبدّلها
				// داخلياً في فرع ربع الدوران (مطابق لـ getSlotLocalSize)
				SlotAspect: tc.Input.WMM / tc.Input.HMM,
				Zoom:       tc.Input.Zoom,
				DragX:      tc.Input.DragX,
				DragY:      tc.Input.DragY,
				Rotation:   tc.Input.Rotation,
			}

			cx, cy, cw, ch := computeCropFromSlot(item, img)
			tol := fixture.Tolerance
			if math.Abs(cx-tc.Expected.CropX) > tol ||
				math.Abs(cy-tc.Expected.CropY) > tol ||
				math.Abs(cw-tc.Expected.CropW) > tol ||
				math.Abs(ch-tc.Expected.CropH) > tol {
				t.Errorf(
					"انحراف عن الذهبية [%s]: got (cropX=%v, cropY=%v, cropW=%v, cropH=%v) want (cropX=%v, cropY=%v, cropW=%v, cropH=%v)",
					tc.Name, cx, cy, cw, ch, tc.Expected.CropX, tc.Expected.CropY, tc.Expected.CropW, tc.Expected.CropH,
				)
			}
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧮 دفعة الأداء C1 — المسار السريع المستطيلي بلا قناع قص: مطابقة بكسل-بكسل
// ضد إعادة بناء المسار المعقد القديم (Push/Clip/DrawImage/ResetClip/Pop)
// كمرجع اختبار فقط، على حالات: خانة مستطيلة، صورة أكبر/أصغر من الخانة،
// ربع دوران، خلفية، حدود، تداخل جزئي/معدوم، وخلية دائرية سليمة.
// ─────────────────────────────────────────────────────────────────────────────

// drawItemImageLegacyClipReference يعيد بناء مسار القص القديم حرفياً (مرجع
// اختبار فقط — لا يُستدعى من الإنتاج): نفس ترتيب gg حرفياً قبل المسار السريع.
func drawItemImageLegacyClipReference(dc *gg.Context, img image.Image, item domain.PrintItem, dpi int) {
	bgColor := strings.TrimSpace(item.BgColor)
	borderColor := strings.TrimSpace(item.BorderColor)
	hasBackground := bgColor != "" && !strings.EqualFold(bgColor, "transparent")
	hasBorder := item.BorderWidthMM > 0 && borderColor != "" && !strings.EqualFold(borderColor, "transparent")
	if img == nil && !hasBackground && !hasBorder {
		return
	}
	xPx := float64(int(math.Round(mmToPx(item.X, dpi))))
	yPx := float64(int(math.Round(mmToPx(item.Y, dpi))))
	wPx := float64(int(math.Round(mmToPx(item.W, dpi))))
	hPx := float64(int(math.Round(mmToPx(item.H, dpi))))

	dc.Push()
	if item.CornerRadiusMM > 0 {
		rPx := mmToPx(item.CornerRadiusMM, dpi)
		dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
	} else {
		dc.DrawRectangle(xPx, yPx, wPx, hPx)
	}
	dc.Clip()

	if hasBackground {
		dc.SetColor(parseColor(bgColor))
		if item.CornerRadiusMM > 0 {
			rPx := mmToPx(item.CornerRadiusMM, dpi)
			dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
		} else {
			dc.DrawRectangle(xPx, yPx, wPx, hPx)
		}
		dc.Fill()
	}

	if img != nil {
		drawX, drawY := xPx, yPx
		if isQuarterRotation(item.Rotation) {
			drawX = xPx + (wPx-float64(img.Bounds().Dx()))/2
			drawY = yPx + (hPx-float64(img.Bounds().Dy()))/2
		}
		dc.DrawImage(img, int(drawX), int(drawY))
	}
	dc.ResetClip()
	dc.Pop()

	if hasBorder {
		bPx := mmToPx(item.BorderWidthMM, dpi)
		rPx := mmToPx(item.CornerRadiusMM, dpi)
		dc.SetColor(parseColor(borderColor))
		dc.SetLineWidth(bPx)
		dc.DrawRoundedRectangle(xPx, yPx, wPx, hPx, rPx)
		dc.Stroke()
	}
}

func TestDrawItemImage_RectFastPathMatchesClipPath(t *testing.T) {
	dpi := 100 // 10 بكسل/مم

	// صورة اختبار: ألوان حادة + بكسلات شبه شفافة لفحص مزج Over وحواف القص.
	blue := color.NRGBA{R: 30, G: 90, B: 220, A: 255}
	semi := color.NRGBA{R: 255, G: 140, B: 0, A: 128}
	img60x30 := imaging.New(60, 30, blue)
	for y := 0; y < 30; y++ {
		for x := 0; x < 60; x++ {
			if (x+y)%3 == 0 {
				img60x30.Set(x, y, semi)
			}
		}
	}
	img80x60 := imaging.New(80, 60, color.NRGBA{R: 20, G: 160, B: 60, A: 255})
	img20x20 := imaging.New(20, 20, color.NRGBA{R: 200, G: 30, B: 30, A: 255})
	img40x20 := imaging.New(40, 20, color.NRGBA{R: 90, G: 40, B: 200, A: 255})
	empty := image.NewRGBA(image.Rect(5, 5, 5, 5)) // حدود فارغة — لا تقاطع

	cases := []struct {
		name string
		item domain.PrintItem
		img  image.Image
	}{
		{name: "rect-basic", item: domain.PrintItem{X: 1, Y: 1, W: 6, H: 4}, img: img60x30},
		{name: "img-larger-than-slot", item: domain.PrintItem{X: 2, Y: 1, W: 3, H: 3}, img: img80x60},
		{name: "img-smaller-than-slot", item: domain.PrintItem{X: 1, Y: 1, W: 8, H: 8}, img: img20x20},
		{name: "quarter-90-legacy-centering", item: domain.PrintItem{X: 1, Y: 1, W: 4, H: 6, Rotation: 90}, img: img40x20},
		{name: "quarter-270-legacy-centering", item: domain.PrintItem{X: 1, Y: 1, W: 4, H: 6, Rotation: 270}, img: img40x20},
		{name: "background-under-image", item: domain.PrintItem{X: 1, Y: 1, W: 5, H: 5, BgColor: "#3366cc"}, img: img20x20},
		{name: "border-only", item: domain.PrintItem{X: 2, Y: 2, W: 5, H: 4, BorderWidthMM: 0.5, BorderColor: "#cc3366"}},
		{name: "bg-border-partial-outside", item: domain.PrintItem{X: 6, Y: 2, W: 5, H: 4, BgColor: "#eeeeee", BorderWidthMM: 0.3, BorderColor: "#112233"}, img: img60x30},
		{name: "empty-bounds-no-draw", item: domain.PrintItem{X: 1, Y: 1, W: 4, H: 4, BgColor: "#ffffff"}, img: empty},
		{name: "rounded-corner-complex-path", item: domain.PrintItem{X: 1, Y: 1, W: 5, H: 5, CornerRadiusMM: 2, BgColor: "#dddddd"}, img: img20x20},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fast := gg.NewContext(120, 90)
			fast.SetColor(color.White)
			fast.Clear()
			drawItemImage(fast, tc.img, tc.item, dpi)

			ref := gg.NewContext(120, 90)
			ref.SetColor(color.White)
			ref.Clear()
			drawItemImageLegacyClipReference(ref, tc.img, tc.item, dpi)

			fi, ri := fast.Image(), ref.Image()
			for y := 0; y < 90; y++ {
				for x := 0; x < 120; x++ {
					if !sameColor(fi.At(x, y), ri.At(x, y)) {
						t.Fatalf("pixel (%d,%d): fast=%v clip=%v — المسار السريع انحرف عن مسار القص", x, y, fi.At(x, y), ri.At(x, y))
					}
				}
			}
		})
	}
}
