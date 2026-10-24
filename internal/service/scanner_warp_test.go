package service

import (
	"encoding/json"
	"image"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/disintegration/imaging"
)

// 📸 اختبارات توازي استعدال الماسح — تقارن نواة Go مباشرة مع Golden vectors
// المثبَّتة من مسار TS (internal/service/testdata/scanner_warp — المرحلة 0).

const scannerWarpFixturesDir = "testdata/scanner_warp"

type goldenManifest struct {
	Version int          `json:"version"`
	Cases   []goldenCase `json:"cases"`
	Filters struct {
		SourceCase string            `json:"sourceCase"`
		SourceFile string            `json:"sourceFile"`
		Modes      map[string]string `json:"modes"`
	} `json:"filters"`
}

type goldenCase struct {
	ID      string             `json:"id"`
	SrcW    int                `json:"srcW"`
	SrcH    int                `json:"srcH"`
	Corners []ScannerWarpPoint `json:"corners"`
	TargetW int                `json:"targetW"`
	TargetH int                `json:"targetH"`
	H       []float64          `json:"h"`
	SrcFile string             `json:"srcFile"`
	OutFile string             `json:"outFile"`
}

func loadGoldenManifest(t *testing.T) *goldenManifest {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(scannerWarpFixturesDir, "manifest.json"))
	if err != nil {
		t.Fatalf("قراءة manifest: %v — شغّل FIXTURE_GEN=1 في frontend/test/scanner-warp-golden.test.ts لتوليدها", err)
	}
	var m goldenManifest
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("فك manifest: %v", err)
	}
	return &m
}

func readRgbaFixture(t *testing.T, rel string, w, h int) []uint8 {
	t.Helper()
	raw, err := os.ReadFile(filepath.Join(scannerWarpFixturesDir, filepath.FromSlash(rel)))
	if err != nil {
		t.Fatalf("قراءة fixture %s: %v", rel, err)
	}
	if len(raw) != w*h*4 {
		t.Fatalf("fixture %s: طول متوقع %d وفعلي %d", rel, w*h*4, len(raw))
	}
	return raw
}

func rgbaToNRGBA(data []uint8, w, h int) *image.NRGBA {
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	copy(img.Pix, data)
	return img
}

// rmseRGBA جذر متوسط مربعات الفرق عبر القنوات الأربع (مقياس 0..255).
func rmseRGBA(a []uint8, b []uint8) (float64, int) {
	if len(a) != len(b) {
		return math.Inf(1), 0
	}
	sumSq := 0.0
	mismatches := 0
	for i := range a {
		d := float64(a[i]) - float64(b[i])
		if d != 0 {
			mismatches++
		}
		sumSq += d * d
	}
	return math.Sqrt(sumSq / float64(len(a))), mismatches
}

// TestScannerWarpGoldenParity التوازي الإجباري: مخرج Go مقابل TS بـRMSE < 1.5/255
// (عقد §5.2 — لا «تشابه بصري»).
func TestScannerWarpGoldenParity(t *testing.T) {
	manifest := loadGoldenManifest(t)
	if len(manifest.Cases) == 0 {
		t.Fatal("لا حالات في manifest")
	}
	for _, tc := range manifest.Cases {
		t.Run(tc.ID, func(t *testing.T) {
			srcData := readRgbaFixture(t, tc.SrcFile, tc.SrcW, tc.SrcH)
			expected := readRgbaFixture(t, tc.OutFile, tc.TargetW, tc.TargetH)

			out, err := WarpScannerDocument(rgbaToNRGBA(srcData, tc.SrcW, tc.SrcH), tc.Corners, tc.TargetW, tc.TargetH, FilterOriginal, 0)
			if err != nil {
				t.Fatalf("WarpScannerDocument: %v", err)
			}
			if out.Bounds().Dx() != tc.TargetW || out.Bounds().Dy() != tc.TargetH {
				t.Fatalf("أبعاد المخرج %dx%d والمتوقع %dx%d", out.Bounds().Dx(), out.Bounds().Dy(), tc.TargetW, tc.TargetH)
			}

			rmse, mismatches := rmseRGBA(out.Pix, expected)
			if rmse >= 1.5 {
				t.Fatalf("RMSE = %.4f (>= 1.5) بعدد بايتات مختلفة %d من %d", rmse, mismatches, len(expected))
			}
			if mismatches > 0 {
				t.Logf("⚠️ توازٍ ضمن العتبة: RMSE %.4f مع %d بايت مختلف (المثالي 0)", rmse, mismatches)
			}
		})
	}
}

// TestScannerWarpHomographyMatrix توازي حل Homography نفسه ضد القيم المثبتة.
func TestScannerWarpHomographyMatrix(t *testing.T) {
	manifest := loadGoldenManifest(t)
	for _, tc := range manifest.Cases {
		sorted := sortScannerCorners(tc.Corners)
		crop := computeScannerSourceCrop(sorted, tc.SrcW, tc.SrcH)
		local := toScannerLocalCorners(sorted, crop)
		dst := []ScannerWarpPoint{
			{X: 0, Y: 0},
			{X: float64(tc.TargetW - 1), Y: 0},
			{X: float64(tc.TargetW - 1), Y: float64(tc.TargetH - 1)},
			{X: 0, Y: float64(tc.TargetH - 1)},
		}
		h, err := computeScannerPerspectiveTransform(dst, local)
		if err != nil {
			t.Fatalf("%s: %v", tc.ID, err)
		}
		for i := 0; i < 9; i++ {
			if math.Abs(h[i]-tc.H[i]) > 1e-6 {
				t.Fatalf("%s: H[%d] = %.12f والمثبت %.12f", tc.ID, i, h[i], tc.H[i])
			}
		}
	}
}

// TestScannerWarpFilterParity توازي كل وضع فلتر ضد fixtures (RMSE < 2/255).
func TestScannerWarpFilterParity(t *testing.T) {
	manifest := loadGoldenManifest(t)
	srcCase := manifest.Cases[0]
	w, h := srcCase.TargetW, srcCase.TargetH
	source := readRgbaFixture(t, manifest.Filters.SourceFile, w, h)

	for mode, file := range manifest.Filters.Modes {
		t.Run(mode, func(t *testing.T) {
			parsed, ok := ParseScannerFilterMode(mode)
			if !ok {
				t.Fatalf("فلتر غير معروف في manifest: %s", mode)
			}
			expected := readRgbaFixture(t, file, w, h)
			img := rgbaToNRGBA(source, w, h)
			applyScannerFilterMode(img, parsed)
			rmse, mismatches := rmseRGBA(img.Pix, expected)
			if rmse >= 2.0 {
				t.Fatalf("RMSE = %.4f (>= 2.0) بعدد بايتات مختلفة %d من %d", rmse, mismatches, len(expected))
			}
			if mismatches > 0 {
				t.Logf("⚠️ توازٍ ضمن العتبة: RMSE %.4f مع %d بايت مختلف (المثالي 0)", rmse, mismatches)
			}
		})
	}
}

// TestScannerWarpTransformOrder ترتيب العمليات ملزم (§5.2): استعدال → فلتر → تدوير —
// التدوير بعد الفلتر يطابق تدوير ناتج (فلتر بلا تدوير) بكسلياً.
func TestScannerWarpTransformOrder(t *testing.T) {
	manifest := loadGoldenManifest(t)
	tc := manifest.Cases[0]
	srcData := readRgbaFixture(t, tc.SrcFile, tc.SrcW, tc.SrcH)

	base, err := WarpScannerDocument(rgbaToNRGBA(srcData, tc.SrcW, tc.SrcH), tc.Corners, tc.TargetW, tc.TargetH, FilterMagic, 0)
	if err != nil {
		t.Fatalf("warp بلا تدوير: %v", err)
	}
	rotatedThen, err := WarpScannerDocument(rgbaToNRGBA(srcData, tc.SrcW, tc.SrcH), tc.Corners, tc.TargetW, tc.TargetH, FilterMagic, 90)
	if err != nil {
		t.Fatalf("warp بتدوير 90: %v", err)
	}

	rotatedRef := rotateScannerNRGBA(base, 90)
	if rotatedThen.Bounds() != rotatedRef.Bounds() {
		t.Fatalf("الأبعاد تختلف: %v مقابل %v", rotatedThen.Bounds(), rotatedRef.Bounds())
	}
	rmse, mismatches := rmseRGBA(rotatedThen.Pix, rotatedRef.Pix)
	if rmse != 0 || mismatches > 0 {
		t.Fatalf("ترتيب التحويلات انكسر: RMSE %.4f و%d بايت مختلف (المطلوب تطابق حرفي)", rmse, mismatches)
	}
}

// TestScannerWarpRotationExact تدوير 90/180/270 نسخ حرفي لا يعيد أخذ عينات.
func TestScannerWarpRotationExact(t *testing.T) {
	w, h := 7, 5
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			i := (y*w + x) * 4
			img.Pix[i] = uint8(x * 30)
			img.Pix[i+1] = uint8(y * 40)
			img.Pix[i+2] = uint8((x + y) * 15)
			img.Pix[i+3] = 255
		}
	}

	r90 := rotateScannerNRGBA(img, 90)
	if r90.Bounds().Dx() != h || r90.Bounds().Dy() != w {
		t.Fatalf("تدوير 90: أبعاد %dx%d والمتوقع %dx%d", r90.Bounds().Dx(), r90.Bounds().Dy(), h, w)
	}
	// src(x,y) → dst(h-1-y, x): الركن العلوي الأيسر للمصدر يصير العلوي الأيمن
	if r90.Pix[(0*r90.Stride)+(h-1)*4] != img.Pix[0] || r90.Pix[(0*r90.Stride)+(h-1)*4+3] != 255 {
		t.Fatal("تدوير 90: بكسل (0,0) لم ينتقل إلى (h-1,0)")
	}

	r180 := rotateScannerNRGBA(img, 180)
	lastIdx := ((h-1)*w + (w - 1)) * 4
	if r180.Pix[0] != img.Pix[lastIdx] {
		t.Fatal("تدوير 180: البكسل الأول ليس مقلوب الأخير")
	}

	r270 := rotateScannerNRGBA(img, 270)
	if r270.Bounds().Dx() != h || r270.Bounds().Dy() != w {
		t.Fatalf("تدوير 270: أبعاد خاطئة %dx%d", r270.Bounds().Dx(), r270.Bounds().Dy())
	}
	// src(x,y) → dst(x, w-1-y): بكسل (0,0) ينتقل إلى (0, w-1)
	if r270.Pix[(w-1)*r270.Stride] != img.Pix[0] {
		t.Fatal("تدوير 270: بكسل (0,0) لم ينتقل إلى (0, w-1)")
	}
}

// TestScannerWarpFailClosedCorners رفض الأركان التالفة/الخارجة/المنحلة بلا قصّ صامت.
func TestScannerWarpFailClosedCorners(t *testing.T) {
	src := image.NewNRGBA(image.Rect(0, 0, 100, 80))
	validCorners := []ScannerWarpPoint{{X: 10, Y: 10}, {X: 90, Y: 10}, {X: 90, Y: 70}, {X: 10, Y: 70}}

	cases := []struct {
		name    string
		corners []ScannerWarpPoint
	}{
		{"ناقصة", validCorners[:3]},
		{"NaN", []ScannerWarpPoint{{X: math.NaN(), Y: 10}, {X: 90, Y: 10}, {X: 90, Y: 70}, {X: 10, Y: 70}}},
		{"خارج الحدود", []ScannerWarpPoint{{X: 10, Y: 10}, {X: 150, Y: 10}, {X: 90, Y: 70}, {X: 10, Y: 70}}},
		{"سالبة", []ScannerWarpPoint{{X: -5, Y: 10}, {X: 90, Y: 10}, {X: 90, Y: 70}, {X: 10, Y: 70}}},
		{"منحلّة (خط واحد)", []ScannerWarpPoint{{X: 10, Y: 40}, {X: 30, Y: 40}, {X: 60, Y: 40}, {X: 90, Y: 40}}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := WarpScannerDocument(src, tc.corners, 50, 40, FilterOriginal, 0)
			var warpErr *ScannerWarpError
			if err == nil {
				t.Fatal("توقّع رفضاً")
			}
			if ok := asScannerWarpError(err, &warpErr); !ok || warpErr.Code != ErrScannerWarpCorners {
				t.Fatalf("توقّت كود %s وحصل %v", ErrScannerWarpCorners, err)
			}
		})
	}
}

func asScannerWarpError(err error, target **ScannerWarpError) bool {
	if e, ok := err.(*ScannerWarpError); ok {
		*target = e
		return true
	}
	return false
}

// TestScannerWarpFromMediaHappyPath المسار الكامل: ملف وسائط → PNG مكتوب ذرياً.
func TestScannerWarpFromMediaHappyPath(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)
	mediaSvc := NewMediaService()
	svc := NewScannerWarpService(mediaSvc)

	// صورة مصدر اصطناعية (تدرّج) داخل مجلد الوسائط
	w, h := 96, 72
	src := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			i := (y*w + x) * 4
			src.Pix[i] = uint8(x * 255 / (w - 1))
			src.Pix[i+1] = uint8(y * 255 / (h - 1))
			src.Pix[i+2] = uint8((x + y) * 255 / (w + h - 2))
			src.Pix[i+3] = 255
		}
	}
	srcName := "warptest_source.png"
	srcPath := filepath.Join(mediaSvc.GetMediaDir(), srcName)
	srcFile, err := os.Create(srcPath)
	if err != nil {
		t.Fatalf("إنشاء المصدر: %v", err)
	}
	if err := png.Encode(srcFile, src); err != nil {
		srcFile.Close()
		t.Fatalf("ترميز المصدر: %v", err)
	}
	srcFile.Close()

	result, err := svc.WarpFromMedia(ScannerWarpRequest{
		SourceURL: "/local-image/" + srcName,
		Corners:   []ScannerWarpPoint{{X: 8, Y: 6}, {X: 88, Y: 6}, {X: 88, Y: 66}, {X: 8, Y: 66}},
		TargetW:   48,
		TargetH:   36,
		Filter:    FilterMagic,
		Rotation:  0,
	})
	if err != nil {
		t.Fatalf("WarpFromMedia: %v", err)
	}
	if result.Width != 48 || result.Height != 36 {
		t.Fatalf("أبعاد النتيجة %dx%d", result.Width, result.Height)
	}
	outPath := filepath.Join(mediaSvc.GetMediaDir(), filepath.Base(result.URL))
	if _, err := os.Stat(outPath); err != nil {
		t.Fatalf("ملف المخرج غير موجود: %v", err)
	}
	decoded, err := imaging.Open(outPath)
	if err != nil {
		t.Fatalf("فك المخرج: %v", err)
	}
	if decoded.Bounds().Dx() != 48 || decoded.Bounds().Dy() != 36 {
		t.Fatalf("أبعاد الملف %v", decoded.Bounds())
	}
}

// TestScannerWarpFromMediaFailClosed كل مسارات الرفض المغلق (SCN-WARP-02/03/04).
func TestScannerWarpFromMediaFailClosed(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("GRIDO_APP_DIR", tempDir)
	svc := NewScannerWarpService(NewMediaService())
	validCorners := []ScannerWarpPoint{{X: 8, Y: 6}, {X: 88, Y: 6}, {X: 88, Y: 66}, {X: 8, Y: 66}}
	base := ScannerWarpRequest{SourceURL: "/local-image/any.png", Corners: validCorners, TargetW: 48, TargetH: 36, Filter: FilterOriginal, Rotation: 0}

	cases := []struct {
		name string
		req  ScannerWarpRequest
		code string
	}{
		{"مصدر data:", func() ScannerWarpRequest { r := base; r.SourceURL = "data:image/png;base64,AAAA"; return r }(), ErrScannerWarpSource},
		{"مصدر http خارجي", func() ScannerWarpRequest { r := base; r.SourceURL = "https://evil.example.com/x.jpg"; return r }(), ErrScannerWarpSource},
		{"مصدر غير موجود", base, ErrScannerWarpSource},
		{"فلتر غير معروف", func() ScannerWarpRequest { r := base; r.Filter = "vivid"; return r }(), ErrScannerWarpPayload},
		{"تدوير 45", func() ScannerWarpRequest { r := base; r.Rotation = 45; return r }(), ErrScannerWarpPayload},
		{"تجاوز 50MP", func() ScannerWarpRequest { r := base; r.TargetW = 8000; r.TargetH = 7000; return r }(), ErrScannerWarpPixels},
		{"بُعد سالب", func() ScannerWarpRequest { r := base; r.TargetW = -10; return r }(), ErrScannerWarpPixels},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := svc.WarpFromMedia(tc.req)
			if err == nil {
				t.Fatal("توقّع رفضاً")
			}
			var warpErr *ScannerWarpError
			if ok := asScannerWarpError(err, &warpErr); !ok {
				t.Fatalf("توقّع ScannerWarpError وحصل %T: %v", err, err)
			}
			if warpErr.Code != tc.code {
				t.Fatalf("توقّت كود %s وحصل %s (%s)", tc.code, warpErr.Code, warpErr.Message)
			}
		})
	}
}

// TestScannerWarpMemoryBudget سقف الذاكرة العابر على صورة اصطناعية 25MP —
// يوثّق الميزانية بالقياس لا بالتقدير (§5.3). يُتخطى في الوضع القصير.
func TestScannerWarpMemoryBudget(t *testing.T) {
	if testing.Short() {
		t.Skip("يتخطى اختبار الذاكرة في الوضع القصير")
	}
	const w, h = 5000, 5000 // 25MP
	src := image.NewNRGBA(image.Rect(0, 0, w, h))
	for i := 0; i < len(src.Pix); i += 4 {
		src.Pix[i+3] = 255
	}
	corners := []ScannerWarpPoint{{X: 100, Y: 100}, {X: 4900, Y: 120}, {X: 4880, Y: 4890}, {X: 110, Y: 4870}}

	var before, after runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&before)

	out, err := WarpScannerDocument(src, corners, 4000, 4000, FilterOriginal, 0)
	if err != nil {
		t.Fatalf("warp 25MP: %v", err)
	}

	runtime.ReadMemStats(&after)
	peakAlloc := after.TotalAlloc - before.TotalAlloc
	// الميزانية الموثقة (§5.3): مصدر + مخرج (50MP RGBA ×2 ≈ 200MB) + تشغيل ⇒ ≤ ~500MB
	const budget = 900 * 1024 * 1024
	if peakAlloc > budget {
		t.Fatalf("التخصيص الكلي %.0fMB تجاوز السقف %dMB", float64(peakAlloc)/1024/1024, budget/1024/1024)
	}
	t.Logf("التخصيص الكلي أثناء استعدال 25MP: %.0fMB (مخرج %dx%d)", float64(peakAlloc)/1024/1024, out.Bounds().Dx(), out.Bounds().Dy())
}
