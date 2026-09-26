package main

import (
	"runtime"
	"testing"
)

func TestResolveDefaultWindowSize(t *testing.T) {
	tests := []struct {
		name         string
		workW, workH int
		wantW, wantH int
	}{
		{"شاشة كبيرة تحتفظ بالمفضل", 1920, 1040, 1280, 800},
		{"شاشة غير معروفة ترجع المفضل", 0, 0, 1280, 800},
		{"شاشة أصغر من المفضل تتقلص مع هامش", 1024, 640, 976, 592},
		{"شاشة صغيرة تتقلص مع هامش", 800, 600, 752, 552},
		{"شاشة ضيقة جداً تنزل للحد المطلق", 400, 300, 352, 252},
		{"مساحة أصغر من الهامش مرتين تلتصق بالحد المطلق", 40, 40, 320, 240},
		{"عرض كاف وطول ضيق", 1920, 500, 1280, 452},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if w, h := resolveDefaultWindowSize(tt.workW, tt.workH); w != tt.wantW || h != tt.wantH {
				t.Fatalf("resolveDefaultWindowSize(%d,%d) = %dx%d, want %dx%d",
					tt.workW, tt.workH, w, h, tt.wantW, tt.wantH)
			}
		})
	}
}

func TestSanitizeRestoredSize(t *testing.T) {
	if w, h := sanitizeRestoredSize(1200, 800); w != 1200 || h != 800 {
		t.Fatalf("valid size changed: %dx%d", w, h)
	}
	if w, h := sanitizeRestoredSize(0, -5); w != defaultWindowWidth || h != defaultWindowHeight {
		t.Fatalf("corrupt size not reset: %dx%d", w, h)
	}
	if w, h := sanitizeRestoredSize(9000, 5000); w != defaultWindowWidth || h != defaultWindowHeight {
		t.Fatalf("huge size not reset: %dx%d", w, h)
	}
}

func TestClampWindowToWorkArea(t *testing.T) {
	area := screenWorkArea{X: 0, Y: 0, W: 1920, H: 1040}

	// داخل الحدود: لا تعديل
	if w, h, x, y := clampWindowToWorkArea(960, 640, 100, 100, []screenWorkArea{area}); w != 960 || h != 640 || x != 100 || y != 100 {
		t.Fatalf("inside bounds modified: %dx%d @%d,%d", w, h, x, y)
	}

	// أكبر من المساحة: يتقلص ويثبت عند الأصل
	if w, h, x, y := clampWindowToWorkArea(2500, 1400, -200, -100, []screenWorkArea{area}); w != 1920 || h != 1040 || x != 0 || y != 0 {
		t.Fatalf("oversize not clamped: %dx%d @%d,%d", w, h, x, y)
	}

	// متجاوز من اليمين والأسفل (خلف شريط المهام): يُسحب للداخل
	if w, h, x, y := clampWindowToWorkArea(960, 640, 1100, 500, []screenWorkArea{area}); x+w != 1920 || y+h != 1040 {
		t.Fatalf("overflow not pulled inside: %dx%d @%d,%d", w, h, x, y)
	}

	// بلا مساحات: يُرجع كما هو
	if w, h, x, y := clampWindowToWorkArea(960, 640, 100, 100, nil); w != 960 || h != 640 || x != 100 || y != 100 {
		t.Fatalf("empty areas modified: %dx%d @%d,%d", w, h, x, y)
	}

	// شاشة ثانية: تُختار مساحتها لا الأولى
	areas := []screenWorkArea{area, {X: 1920, Y: 0, W: 1366, H: 728}}
	if w, h, x, y := clampWindowToWorkArea(2000, 900, 2000, 100, areas); w != 1366 || x != 1920 {
		t.Fatalf("second monitor not picked: %dx%d @%d,%d", w, h, x, y)
	}
}

func TestWorkAreasAround(t *testing.T) {
	// على المنصات بلا استعلام شاشات (أو إن فشل الاستعلام) تُرجع لا شيء،
	// فيبقى المقاس والموضع بلا تعديل — وهذا سلوك مقصود لا خطأ.
	areas := workAreasAround(0, 0)
	if len(areas) > 1 {
		t.Fatalf("workAreasAround أعادت %d مساحات، المتوقع واحدة على الأكثر", len(areas))
	}
	if len(areas) == 0 {
		return
	}
	area := areas[0]
	if area.W <= 0 || area.H <= 0 {
		t.Fatalf("مساحة عمل بأبعاد غير موجبة: %+v", area)
	}
	w, h, _, _ := clampWindowToWorkArea(defaultWindowWidth, defaultWindowHeight, area.X, area.Y, areas)
	if w > area.W || h > area.H {
		t.Fatalf("الحجم %dx%d يتجاوز مساحة العمل %+v", w, h, area)
	}
}

func TestWorkAreaForPointOrPrimaryOnWindows(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("استعلام مساحة العمل الأصلي مُنفَّذ على ويندوز فقط")
	}
	area, ok := workAreaForPointOrPrimary(0, 0)
	if !ok {
		t.Fatal("ويندوز لم يُرجع مساحة عمل للشاشة الأساسية")
	}
	if area.W <= 0 || area.H <= 0 || area.W > maxSaneWidth*2 || area.H > maxSaneHeight*2 {
		t.Fatalf("مساحة عمل غير معقولة: %+v", area)
	}
	// التقاطع مع الشاشة الأساسية: نقطة (0,0) أو أصل مساحة العمل نفسها
	// يجب أن تُرجع نفس المساحة (الثبات يمنع انزلاق الموضع عند كل تشغيل)
	if again, ok := workAreaForPointOrPrimary(area.X+1, area.Y+1); ok && again != area {
		t.Fatalf("استعلامان متتاليان أعادا مساحتين مختلفتين: %+v و %+v", area, again)
	}
}
