package service

import (
	"bytes"
	"fmt"
	"image"
	"image/png"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/disintegration/imaging"

	"grido/internal/utils"
)

// 🧭 خدمة استعدال ماسح المستندات في Go — المرحلة 1 من خطة الترحيل
// (docs/plans/neural-scanner-warp-migration-spec.md §7).
//
// عقد التوازي (§5.2): كل معادلة هنا منقولة حرفياً من مسار TS الحالي
// (warp-pipeline.ts + perspective-warper.ts + filters.ts + quad-geometry.ts)
// وتُثبَّت بـGolden vectors في testdata/scanner_warp (RMSE < 1.5/255).
// ترتيب العمليات ملزم تعاقدياً: EXIF → فك → تحقق → استعدال → فلتر → تدوير.

// MaxScannerWarpPixels سقف بكسل المخرج الموحّد (B5) — توازٍ إجباري مع
// MAX_EXPORT_PIXELS في frontend/src/lib/export/export-limits.ts (بوابة توازٍ في م4).
const MaxScannerWarpPixels = 50_000_000

const (
	scannerWarpStripRows   = 256 // مثل WARP_STRIP_ROWS في warp-pipeline.ts:22
	scannerWarpCropPadding = 2   // مثل CROP_PADDING في warp-pipeline.ts:25
)

// أكواد الأخطاء القابلة للحل (تُعرض عربية صريحة — لا فشل صامت).
const (
	ErrScannerWarpCorners = "SCN-WARP-01"
	ErrScannerWarpPixels  = "SCN-WARP-02"
	ErrScannerWarpSource  = "SCN-WARP-03"
	ErrScannerWarpPayload = "SCN-WARP-04"
)

// ScannerWarpError خطأ قابل للعرض بواجهة المستخدم بكود عربي مفهوم.
type ScannerWarpError struct {
	Code    string
	Message string
}

func (e *ScannerWarpError) Error() string { return e.Code + ": " + e.Message }

func newWarpError(code, message string) *ScannerWarpError {
	return &ScannerWarpError{Code: code, Message: message}
}

type ScannerWarpPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type ScannerFilterMode string

const (
	FilterOriginal  ScannerFilterMode = "original"
	FilterMagic     ScannerFilterMode = "magic"
	FilterBW        ScannerFilterMode = "bw"
	FilterGrayscale ScannerFilterMode = "grayscale"
	FilterSharpen   ScannerFilterMode = "sharpen"
	FilterDeyellow  ScannerFilterMode = "deyellow"
)

// ParseScannerFilterMode يتحقق من قيمة الفلتر القادمة من الشبكة (fail-closed).
func ParseScannerFilterMode(value string) (ScannerFilterMode, bool) {
	switch ScannerFilterMode(value) {
	case FilterOriginal, FilterMagic, FilterBW, FilterGrayscale, FilterSharpen, FilterDeyellow:
		return ScannerFilterMode(value), true
	default:
		return "", false
	}
}

type ScannerWarpRequest struct {
	SourceURL string             `json:"sourceUrl"`
	Corners   []ScannerWarpPoint `json:"corners"`
	TargetW   int                `json:"targetW"`
	TargetH   int                `json:"targetH"`
	Filter    ScannerFilterMode  `json:"filter"`
	Rotation  int                `json:"rotation"`
}

type ScannerWarpResult struct {
	URL    string
	Width  int
	Height int
}

// ScannerWarpService يستعدل صور المستندات بدقة الطباعة الكاملة خارج V8 نهائياً.
type ScannerWarpService struct {
	mediaService *MediaService
}

func NewScannerWarpService(mediaService *MediaService) *ScannerWarpService {
	return &ScannerWarpService{mediaService: mediaService}
}

// WarpFromMedia ينفّذ المسار الكامل من مسار وسيط محلي إلى PNG محفوظ ذرياً.
// الأركان بفضاء العرض (بعد EXIF) — ما يراه المستخدم على الشاشة.
func (s *ScannerWarpService) WarpFromMedia(req ScannerWarpRequest) (*ScannerWarpResult, error) {
	filter, ok := ParseScannerFilterMode(string(req.Filter))
	if !ok {
		return nil, newWarpError(ErrScannerWarpPayload, "نمط فلتر غير معروف")
	}
	if req.Rotation%90 != 0 || req.Rotation < 0 || req.Rotation > 270 {
		return nil, newWarpError(ErrScannerWarpPayload, "قيمة التدوير يجب أن تكون 0 أو 90 أو 180 أو 270")
	}
	if err := validateScannerWarpTarget(req.TargetW, req.TargetH); err != nil {
		return nil, err
	}
	if err := validateScannerWarpSourceURL(req.SourceURL); err != nil {
		return nil, err
	}

	resolvedPath, err := s.mediaService.ResolveLocalImagePath(req.SourceURL)
	if err != nil {
		return nil, newWarpError(ErrScannerWarpSource, "مصدر الصورة غير موجود أو غير مسموح")
	}
	raw, err := os.ReadFile(resolvedPath)
	if err != nil {
		return nil, newWarpError(ErrScannerWarpSource, "تعذّرت قراءة ملف المصدر")
	}

	decoded, err := imaging.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, newWarpError(ErrScannerWarpSource, "تعذّر فك ترميز الصورة")
	}
	srcNRGBA, ok := decoded.(*image.NRGBA)
	if !ok {
		srcNRGBA = imaging.Clone(decoded)
	}
	decoded = nil

	// سقف المصدر قبل أي نسخة (نفس سقف ApplyMaskRaw)
	srcW, srcH := srcNRGBA.Bounds().Dx(), srcNRGBA.Bounds().Dy()
	if int64(srcW)*int64(srcH) > MaxScannerWarpPixels {
		return nil, newWarpError(ErrScannerWarpPixels, fmt.Sprintf("الصورة المصدر أكبر من السقف المسموح (%d ميغابكسل)", MaxScannerWarpPixels/1_000_000))
	}

	srcNRGBA = ApplyExifOrientation(srcNRGBA, ReadJPEGExifOrientation(raw))
	raw = nil

	out, err := WarpScannerDocument(srcNRGBA, req.Corners, req.TargetW, req.TargetH, filter, req.Rotation)
	if err != nil {
		return nil, err
	}

	newName := fmt.Sprintf("scan_%d.png", time.Now().UnixNano())
	newPath := filepath.Join(s.mediaService.GetMediaDir(), newName)

	af, err := utils.CreateAtomic(newPath, 0o644)
	if err != nil {
		return nil, fmt.Errorf("create file for saving: %w", err)
	}
	defer af.Abort()

	encoder := png.Encoder{CompressionLevel: png.BestSpeed}
	if err := encoder.Encode(af, out); err != nil {
		return nil, fmt.Errorf("encode final image: %w", err)
	}
	if err := af.Commit(); err != nil {
		return nil, fmt.Errorf("save final image: %w", err)
	}

	return &ScannerWarpResult{
		URL:    "/local-image/" + newName,
		Width:  out.Bounds().Dx(),
		Height: out.Bounds().Dy(),
	}, nil
}

func validateScannerWarpTarget(w, h int) error {
	if w <= 0 || h <= 0 {
		return newWarpError(ErrScannerWarpPixels, "أبعاد المخرج يجب أن تكون أعداداً موجبة")
	}
	if int64(w)*int64(h) > MaxScannerWarpPixels {
		return newWarpError(ErrScannerWarpPixels, fmt.Sprintf("أبعاد المخرج تتجاوز السقف المسموح (%d ميغابكسل)", MaxScannerWarpPixels/1_000_000))
	}
	return nil
}

func validateScannerWarpSourceURL(sourceURL string) error {
	trimmed := strings.TrimSpace(sourceURL)
	if trimmed == "" || strings.HasPrefix(trimmed, "data:") ||
		strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return newWarpError(ErrScannerWarpSource, "مصدر الصورة يجب أن يكون مسار وسائط محلياً قائماً")
	}
	return nil
}

// WarpScannerDocument نواة الاستعدال النقية: قصّ → Homography عكسي بشرائح 256 صف
// → فلتر → تدوير. تعمل على بيانات جاهزة (تُستخدم مباشرة في اختبارات التوازي).
func WarpScannerDocument(
	src *image.NRGBA,
	corners []ScannerWarpPoint,
	targetW, targetH int,
	filter ScannerFilterMode,
	rotation int,
) (*image.NRGBA, error) {
	srcW, srcH := src.Bounds().Dx(), src.Bounds().Dy()
	outW := max(2, targetW)
	outH := max(2, targetH)

	if err := validateScannerWarpCorners(corners, srcW, srcH); err != nil {
		return nil, err
	}

	sorted := sortScannerCorners(corners)
	crop := computeScannerSourceCrop(sorted, srcW, srcH)
	localCorners := toScannerLocalCorners(sorted, crop)

	cropImg := cropNRGBA(src, crop)
	warped, err := warpPerspectiveBilinear(cropImg, localCorners, outW, outH)
	if err != nil {
		return nil, err
	}

	filtered := applyScannerFilterMode(warped, filter)

	return rotateScannerNRGBA(filtered, rotation), nil
}

func validateScannerWarpCorners(corners []ScannerWarpPoint, w, h int) error {
	if len(corners) != 4 {
		return newWarpError(ErrScannerWarpCorners, "يجب تحديد أربع أركان للمستند بالضبط")
	}
	for i, c := range corners {
		if math.IsNaN(c.X) || math.IsInf(c.X, 0) || math.IsNaN(c.Y) || math.IsInf(c.Y, 0) {
			return newWarpError(ErrScannerWarpCorners, fmt.Sprintf("الركن %d يحمل قيمة غير منتهية", i+1))
		}
		if c.X < 0 || c.X > float64(w-1) || c.Y < 0 || c.Y > float64(h-1) {
			return newWarpError(ErrScannerWarpCorners, fmt.Sprintf("الركن %d يقع خارج حدود الصورة", i+1))
		}
	}
	return nil
}

// sortScannerCorners منقولة من sortCornerPoints (quad-geometry.ts) —
// فرز قطبي حول المركز ثم تدوير لتبدأ بالركن العلوي الأيسر.
func sortScannerCorners(pts []ScannerWarpPoint) []ScannerWarpPoint {
	cx := (pts[0].X + pts[1].X + pts[2].X + pts[3].X) / 4
	cy := (pts[0].Y + pts[1].Y + pts[2].Y + pts[3].Y) / 4

	sorted := make([]ScannerWarpPoint, len(pts))
	copy(sorted, pts)
	sort.SliceStable(sorted, func(a, b int) bool {
		return math.Atan2(sorted[a].Y-cy, sorted[a].X-cx) < math.Atan2(sorted[b].Y-cy, sorted[b].X-cx)
	})

	tlIdx := 0
	minScore := math.Inf(1)
	for i := 0; i < 4; i++ {
		angle := math.Atan2(sorted[i].Y-cy, sorted[i].X-cx)
		diff := math.Abs(angle - -0.75*math.Pi)
		if diff > math.Pi {
			diff = 2*math.Pi - diff
		}
		score := diff*0.7 + ((sorted[i].X+sorted[i].Y)/math.Max(1, cx+cy))*0.3
		if score < minScore {
			minScore = score
			tlIdx = i
		}
	}

	return []ScannerWarpPoint{
		sorted[tlIdx],
		sorted[(tlIdx+1)%4],
		sorted[(tlIdx+2)%4],
		sorted[(tlIdx+3)%4],
	}
}

type scannerSourceCrop struct {
	x, y, width, height int
}

// computeScannerSourceCrop منقولة من computeSourceCrop (warp-pipeline.ts).
func computeScannerSourceCrop(corners []ScannerWarpPoint, srcW, srcH int) scannerSourceCrop {
	minX, minY := math.Inf(1), math.Inf(1)
	maxX, maxY := math.Inf(-1), math.Inf(-1)
	for _, c := range corners {
		if math.IsNaN(c.X) || math.IsInf(c.X, 0) || math.IsNaN(c.Y) || math.IsInf(c.Y, 0) {
			continue
		}
		minX = math.Min(minX, c.X)
		minY = math.Min(minY, c.Y)
		maxX = math.Max(maxX, c.X)
		maxY = math.Max(maxY, c.Y)
	}

	x := max(0, int(math.Floor(minX))-scannerWarpCropPadding)
	y := max(0, int(math.Floor(minY))-scannerWarpCropPadding)
	maxCropX := min(srcW-1, int(math.Ceil(maxX))+scannerWarpCropPadding)
	maxCropY := min(srcH-1, int(math.Ceil(maxY))+scannerWarpCropPadding)

	return scannerSourceCrop{
		x:      x,
		y:      y,
		width:  max(1, maxCropX-x+1),
		height: max(1, maxCropY-y+1),
	}
}

func toScannerLocalCorners(corners []ScannerWarpPoint, crop scannerSourceCrop) []ScannerWarpPoint {
	out := make([]ScannerWarpPoint, len(corners))
	for i, c := range corners {
		out[i] = ScannerWarpPoint{
			X: math.Max(0, math.Min(float64(crop.width-1), c.X-float64(crop.x))),
			Y: math.Max(0, math.Min(float64(crop.height-1), c.Y-float64(crop.y))),
		}
	}
	return out
}

func cropNRGBA(src *image.NRGBA, crop scannerSourceCrop) *image.NRGBA {
	dst := image.NewNRGBA(image.Rect(0, 0, crop.width, crop.height))
	for row := 0; row < crop.height; row++ {
		srcRow := (crop.y+row)*src.Stride + crop.x*4
		copy(dst.Pix[row*dst.Stride:row*dst.Stride+crop.width*4], src.Pix[srcRow:srcRow+crop.width*4])
	}
	return dst
}

// computeScannerPerspectiveTransform منقولة من computePerspectiveTransform
// (perspective-warper.ts): حل 8 معادلات بجاورس مع محور جزئي وكشف الانحلال.
// h تحوّل نقاط الوجهة إلى المصدر (dst→src) وh[8]=1.
func computeScannerPerspectiveTransform(src, dst []ScannerWarpPoint) ([9]float64, error) {
	var a [8][8]float64
	var b [8]float64

	for i := 0; i < 4; i++ {
		sx, sy := src[i].X, src[i].Y
		dx, dy := dst[i].X, dst[i].Y

		a[i*2] = [8]float64{sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy}
		b[i*2] = dx
		a[i*2+1] = [8]float64{0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy}
		b[i*2+1] = dy
	}

	const n = 8
	for i := 0; i < n; i++ {
		maxRow := i
		for k := i + 1; k < n; k++ {
			if math.Abs(a[k][i]) > math.Abs(a[maxRow][i]) {
				maxRow = k
			}
		}
		a[i], a[maxRow] = a[maxRow], a[i]
		b[i], b[maxRow] = b[maxRow], b[i]

		if math.Abs(a[i][i]) < 1e-12 {
			foundPivot := false
			for r := i + 1; r < n; r++ {
				if math.Abs(a[r][i]) >= 1e-12 {
					a[i], a[r] = a[r], a[i]
					b[i], b[r] = b[r], b[i]
					foundPivot = true
					break
				}
			}
			if !foundPivot {
				continue
			}
		}

		for k := i + 1; k < n; k++ {
			factor := a[k][i] / a[i][i]
			for j := i; j < n; j++ {
				a[k][j] -= factor * a[i][j]
			}
			b[k] -= factor * b[i]
		}
	}

	var h [9]float64
	h[8] = 1

	singular := false
	for i := n - 1; i >= 0; i-- {
		sum := 0.0
		for j := i + 1; j < n; j++ {
			sum += a[i][j] * h[j]
		}
		if math.Abs(a[i][i]) <= 1e-12 {
			singular = true
			break
		}
		h[i] = (b[i] - sum) / a[i][i]
	}
	if singular {
		return h, newWarpError(ErrScannerWarpCorners, "الأركان الأربعة منحلّة (على خط واحد أو متقاطعة)")
	}
	return h, nil
}

// warpPerspectiveBilinear الاستعدال بشرائح صفوف متوازية — نفس حلقة
// warp-pipeline.ts (Homography عكسي + Bilinear بأوزان w00/w10/w01/w11).
// البكسلات خارج المضلع تبقى شفافة (أصفار) كما في createImageData.
func warpPerspectiveBilinear(src *image.NRGBA, localCorners []ScannerWarpPoint, outW, outH int) (*image.NRGBA, error) {
	srcW := src.Bounds().Dx()
	srcH := src.Bounds().Dy()
	srcPix := src.Pix

	dstCorners := []ScannerWarpPoint{
		{X: 0, Y: 0},
		{X: float64(outW - 1), Y: 0},
		{X: float64(outW - 1), Y: float64(outH - 1)},
		{X: 0, Y: float64(outH - 1)},
	}
	h, err := computeScannerPerspectiveTransform(dstCorners, localCorners)
	if err != nil {
		return nil, err
	}
	h0, h1, h2, h3, h4, h5, h6, h7, h8 := h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], h[8]

	dst := image.NewNRGBA(image.Rect(0, 0, outW, outH))

	warpRows := func(startY, endY int) {
		for y := startY; y < endY; y++ {
			rowOff := y * dst.Stride
			for x := 0; x < outW; x++ {
				denom := h6*float64(x) + h7*float64(y) + h8
				if math.Abs(denom) >= 1e-9 {
					srcX := (h0*float64(x) + h1*float64(y) + h2) / denom
					srcY := (h3*float64(x) + h4*float64(y) + h5) / denom

					if srcX >= 0 && srcX <= float64(srcW-1) && srcY >= 0 && srcY <= float64(srcH-1) {
						x0 := int(math.Floor(srcX))
						y0 := int(math.Floor(srcY))
						x1 := min(srcW-1, x0+1)
						y1 := min(srcH-1, y0+1)

						dx := srcX - float64(x0)
						dy := srcY - float64(y0)

						w00 := (1 - dx) * (1 - dy)
						w10 := dx * (1 - dy)
						w01 := (1 - dx) * dy
						w11 := dx * dy

						idx00 := (y0*srcW + x0) * 4
						idx10 := (y0*srcW + x1) * 4
						idx01 := (y1*srcW + x0) * 4
						idx11 := (y1*srcW + x1) * 4

						outIdx := rowOff + x*4
						for c := 0; c < 4; c++ {
							dst.Pix[outIdx+c] = jsRound(
								w00*float64(srcPix[idx00+c]) +
									w10*float64(srcPix[idx10+c]) +
									w01*float64(srcPix[idx01+c]) +
									w11*float64(srcPix[idx11+c]),
							)
						}
					}
				}
			}
		}
	}

	// توازٍ على شرائح 256 صف — كل بكسل مخرج مستقل فلا حاجة لمزامنة داخلية
	workers := runtime.NumCPU()
	totalStrips := (outH + scannerWarpStripRows - 1) / scannerWarpStripRows
	if workers > totalStrips {
		workers = totalStrips
	}
	if workers < 2 || outH < scannerWarpStripRows {
		warpRows(0, outH)
		return dst, nil
	}

	var wg sync.WaitGroup
	stripsPerWorker := (totalStrips + workers - 1) / workers
	for worker := 0; worker < workers; worker++ {
		startStrip := worker * stripsPerWorker
		endStrip := min(totalStrips, startStrip+stripsPerWorker)
		if startStrip >= endStrip {
			continue
		}
		wg.Add(1)
		utils.SafeGo("scanner-warp.rows", func() {
			defer wg.Done()
			for strip := startStrip; strip < endStrip; strip++ {
				startY := strip * scannerWarpStripRows
				endY := min(outH, startY+scannerWarpStripRows)
				warpRows(startY, endY)
			}
		})
	}
	wg.Wait()
	return dst, nil
}

// jsRound يطابق Math.round في JS (نصف الدرجة نحو +∞) — قيمنا غير سالبة هنا.
func jsRound(x float64) uint8 {
	v := math.Floor(x + 0.5)
	if v < 0 {
		return 0
	}
	if v > 255 {
		return 255
	}
	return uint8(v)
}

// rotateScannerNRGBA منقولة دلالاتها من rotateScannerCanvas: 90/180/270 فقط
// (قيم أخرى تُعاد كما هي) — نسخ بكسلي حرفي بلا إعادة أخذ عينات.
func rotateScannerNRGBA(src *image.NRGBA, rotation int) *image.NRGBA {
	angle := ((rotation % 360) + 360) % 360
	if angle == 0 || (angle != 90 && angle != 180 && angle != 270) {
		return src
	}
	w, h := src.Bounds().Dx(), src.Bounds().Dy()
	swap := angle == 90 || angle == 270
	dw, dh := w, h
	if swap {
		dw, dh = h, w
	}
	dst := image.NewNRGBA(image.Rect(0, 0, dw, dh))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			var sx, sy int
			switch angle {
			case 90: // src(x,y) → dst(h-1-y, x)
				sx, sy = h-1-y, x
			case 180:
				sx, sy = w-1-x, h-1-y
			case 270: // src(x,y) → dst(y, w-1-x)
				sx, sy = y, w-1-x
			}
			di := (sy*dw + sx) * 4
			si := (y*w + x) * 4
			copy(dst.Pix[di:di+4], src.Pix[si:si+4])
		}
	}
	return dst
}
