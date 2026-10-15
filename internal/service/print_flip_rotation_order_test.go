package service

import (
	"image"
	"image/color"
	"testing"

	"grido/internal/core/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_flip_rotation_order_test.go — ترتيب القلب قبل التدوير (WYSIWYG)
//
// المصدر المرجعي: محرر Konva يبني مصفوفة مجموعة التحويل T·R·S
// (frontend/node_modules/konva/lib/Node.js:1007-1029 — translate ← rotate ← scale)
// فالنقطة تُقلب أولاً (S) ثم تُدوَّر (R). خط الطباعة في Go كان يدوّر ثم يقلب
// (H·R) فينعكس الناتج 180° عند 90/270 مع أي قلب.
//
// الاختبار مستقل: يشتق الموضع المتوقع يدوياً من دلالة المحرر أعلاه (دالة
// expectedFlipThenRotate) ثم يقارنه بالبكسل الفعلي من applyImageProcessing —
// لا يعيد استخدام ترتيب دوال المعالجة نفسه.
// ─────────────────────────────────────────────────────────────────────────────

// expectedFlipThenRotate يحسب موضع بكسل (x,y) بعد قلب-ثم-تدوير وفق دلالة المحرر:
//
//	1) القلب في فضاء الصورة: FlipX يعكس المحور الأفقي (x → W-1-x)،
//	   FlipY يعكس العمودي (y → H-1-y).
//	2) ثم التدوير مع عقارب الساعة في إحداثيات y-للأسفل:
//	     90° : (x,y) → (H-1-y, x)      [W,H أبعاد ما قبل التدوير]
//	     180°: (x,y) → (W-1-x, H-1-y)
//	     270°: (x,y) → (y, W-1-x)
func expectedFlipThenRotate(x, y, w, h int, flipX, flipY bool, rotation int) (int, int) {
	fx, fy := x, y
	if flipX {
		fx = w - 1 - fx
	}
	if flipY {
		fy = h - 1 - fy
	}
	switch ((rotation % 360) + 360) % 360 {
	case 90:
		return h - 1 - fy, fx
	case 180:
		return w - 1 - fx, h - 1 - fy
	case 270:
		return fy, w - 1 - fx
	}
	return fx, fy
}

// TestFlipRotationOrderMatchesEditor يثبت ترتيب قلب-ثم-تدوير على صورة غير
// متناظرة (بكسل أحمر وحيد عند الزاوية (0,0) — أي تغيير اتجاه يظهر فوراً).
// الهدف مربع بأبعاد المصدر: لا مسار Lanczos ولا تبديل أبعاد → مقارنة دقيقة.
func TestFlipRotationOrderMatchesEditor(t *testing.T) {
	red := color.NRGBA{R: 255, A: 255}
	transparent := color.NRGBA{}
	const n = 4

	cases := []struct {
		name     string
		flipX    bool
		flipY    bool
		rotation int
		// ملاحظة: الموضع تحت الترتيب القديم (تدوير ثم قلب) مختلف كلياً هنا،
		// وليس مجرد فرق 180° في الفضاء — الجزء السفلي يوثّق موضع القديم.
	}{
		// جديد: قلب(0,0)→(3,0) ثم 90°→(3,3). القديم: 90°→(3,0) ثم FlipH→(0,0).
		{name: "FlipX + Rotation90", flipX: true, flipY: false, rotation: 90},
		// جديد: قلب(0,0)→(0,3) ثم 90°→(0,0). القديم: 90°→(3,0) ثم FlipV→(3,3).
		{name: "FlipY + Rotation90", flipX: false, flipY: true, rotation: 90},
		// جديد: قلب(0,0)→(3,0) ثم 270°→(0,0). القديم: 270°→(0,3) ثم FlipH→(3,3).
		{name: "FlipX + Rotation270", flipX: true, flipY: false, rotation: 270},
		// 180° = سالب الوحدة؛ يتبادل مع القلب (R180∘S = S∘R180) فالترتيبان
		// متكافئان هنا — يبقى حارساً أن الإصلاح لم يغيّر هذه الحالة الصحيحة.
		{name: "FlipX + Rotation180", flipX: true, flipY: false, rotation: 180},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			src := image.NewNRGBA(image.Rect(0, 0, n, n))
			src.Set(0, 0, red)

			item := domain.PrintItem{
				Filter:     "none",
				Brightness: 100,
				Contrast:   100,
				Saturation: 100,
				Zoom:       1,
				FlipX:      c.flipX,
				FlipY:      c.flipY,
				Rotation:   float64(c.rotation),
			}
			out := applyImageProcessing(src, item, n, n)

			b := out.Bounds()
			if b.Dx() != n || b.Dy() != n {
				t.Fatalf("output size = %dx%d, want %dx%d", b.Dx(), b.Dy(), n, n)
			}

			wantX, wantY := expectedFlipThenRotate(0, 0, n, n, c.flipX, c.flipY, c.rotation)
			if got := out.At(wantX, wantY); !sameColor(got, red) {
				t.Errorf("flip(%v,%v)+rot%d: red expected at (%d,%d) per editor semantics, got %v",
					c.flipX, c.flipY, c.rotation, wantX, wantY, got)
			}

			// كل بقية البكسلات شفافة تماماً — يثبت أن الناتج بكسل واحد لا انعكاس
			// ثانٍ ولا استيفاء، وأن الموضع المتوقع هو الموضع الفريد للبكسل.
			for y := 0; y < n; y++ {
				for x := 0; x < n; x++ {
					if x == wantX && y == wantY {
						continue
					}
					if got := out.At(x, y); !sameColor(got, transparent) {
						t.Errorf("flip(%v,%v)+rot%d: stray pixel at (%d,%d) = %v, want transparent",
							c.flipX, c.flipY, c.rotation, x, y, got)
					}
				}
			}
		})
	}
}
