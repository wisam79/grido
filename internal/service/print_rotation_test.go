package service

import (
	"image"
	"image/color"
	"testing"

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
		Brightness:  100,
		Contrast:    100,
		Saturation:  100,
		Zoom:        1,
		FlipX:       false,
		FlipY:       false,
		Filter:      "none",
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

func sameColor(a, b color.Color) bool {
	ar, ag, ab, aa := a.RGBA()
	br, bg, bb, ba := b.RGBA()
	return ar == br && ag == bg && ab == bb && aa == ba
}
