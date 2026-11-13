package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"image"
	"image/color"
	"io"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/disintegration/imaging"
	"golang.org/x/sync/singleflight"

	"grido/internal/core/domain"
	"grido/internal/utils"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_image_pipeline.go — خط أنابيب معالجة صور الطباعة
//
// كاشان LRU (خام/معالج) بمنع تكرار التحميل الجاري عبر sync.Cond،
// حل المسارات الآمن، الاقتصاص والتدوير والفلاتر المطابقة للمحرر (WYSIWYG).
// ─────────────────────────────────────────────────────────────────────────────

// maxDecodedInputPixels سقف البكسلات المفكوكة لصورة إدخال واحدة (100MP ≈
// 400MB RGBA كحد أقصى نظري). السقوف السابقة كانت على الحجم المضغوط فقط
// (60MB ملف / 50MB base64) بينما المفكوك width×height×4 من ترويسة الصورة بلا
// حد — قنبلة فك ضغط كلاسيكية (CVE-2026-55497 في Cloudreve: نفس النمط).
// الحل المعتمد صناعياً: image.DecodeConfig يقرأ الترويسة فقط (صفر تخصيص
// بكسلات) ويُرفض المعلن قبل أي فك — التخصيص لا يحدث أبداً.
const maxDecodedInputPixels = 100_000_000

// checkDecodedPixelCap يفرض سقف البكسلات من إعدادات الترويسة قبل الفك.
// int64 صريح: حاصل w*h بصيغة int قد يفيض على 32بت لأبعاد خبيثة.
func checkDecodedPixelCap(cfg image.Config, source string) error {
	w, h := int64(cfg.Width), int64(cfg.Height)
	if w <= 0 || h <= 0 {
		return fmt.Errorf("invalid image dimensions for %s: %dx%d", source, w, h)
	}
	if w*h > maxDecodedInputPixels {
		return fmt.Errorf("image dimensions too large for %s: %dx%d (%d MP > %d MP max)", source, w, h, w*h/1_000_000, maxDecodedInputPixels/1_000_000)
	}
	return nil
}

func resolveLocalPath(src string) string {
	normalized := strings.ReplaceAll(src, "\\", "/")
	if strings.HasPrefix(normalized, "/local-image/") {
		filename := filepath.Base(filepath.Clean(strings.TrimPrefix(normalized, "/local-image/")))
		appDir := utils.GetAppDir()

		// 🔒 الملفات المؤقتة للطباعة (print_upload_* و print_*) تُخزن في Exports
		// أما ملفات الوسائط العادية فتُخزن في Media
		var baseDir string
		if strings.HasPrefix(filename, "print_") {
			baseDir = filepath.Join(appDir, "Exports")
		} else {
			baseDir = filepath.Join(appDir, "Media")
		}
		fullPath := filepath.Join(baseDir, filename)

		// احتياط: إذا لم يوجد الملف في baseDir، نتحقق من المجلد البديل (Media <-> Exports)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			altBase := filepath.Join(appDir, "Media")
			if baseDir == altBase {
				altBase = filepath.Join(appDir, "Exports")
			}
			altFull := filepath.Join(altBase, filename)
			if _, altErr := os.Stat(altFull); altErr == nil {
				baseDir = altBase
				fullPath = altFull
			}
		}

		resolved, err := filepath.EvalSymlinks(fullPath)
		if err != nil {
			if !utils.PathWithinDirInclusive(fullPath, baseDir) {
				slog.Warn("Blocked path traversal attempt in resolveLocalPath", "path", src)
				return ""
			}
			return fullPath
		}
		if resolvedBaseDir, err := filepath.EvalSymlinks(baseDir); err == nil {
			baseDir = resolvedBaseDir
		}
		if !utils.PathWithinDirInclusive(resolved, baseDir) {
			slog.Warn("Blocked path traversal attempt in resolveLocalPath", "path", src)
			return ""
		}
		return resolved
	}
	// 🖨️ تقييد صارم (RV-Print-07): أي ImageSrc خارج /local-image/ كان يُمرَّر
	// كما هو إلى imaging.Open — أي مسار نظامي مطلق يُضمَّن في المخرجات.
	// المسموح الآن: data: URLs، ومسارات (مطلقة أو نسبية) تنحلّ داخل شجرة
	// مجلد التطبيق (Media/Exports) بعد EvalSymlinks. غير ذلك يُرفض بسجل.
	if strings.HasPrefix(normalized, "data:image/") {
		return src
	}
	abs, absErr := filepath.Abs(src)
	if absErr != nil {
		slog.Warn("Blocked unresolvable image path in resolveLocalPath", "path", src)
		return ""
	}
	candidate := abs
	if resolved, err := filepath.EvalSymlinks(abs); err == nil {
		candidate = resolved
	}
	appDir := utils.GetAppDir()
	appBase, err := filepath.EvalSymlinks(appDir)
	if err != nil {
		appBase = appDir
	}
	if !utils.PathWithinDirInclusive(candidate, appBase) {
		slog.Warn("Blocked out-of-scope image path in resolveLocalPath", "path", src)
		return ""
	}
	return candidate
}

const (
	printAdjustmentMin = 0.0
	printAdjustmentMax = 200.0
)

type printFilterOperationKind uint8

const (
	printFilterBrightness printFilterOperationKind = iota
	printFilterContrast
	printFilterSaturation
	printFilterSepia
	printFilterGrayscale
	printFilterInvert
	printFilterThreshold
	printFilterPixelate
	printFilterBlur
)

type printFilterOperation struct {
	kind   printFilterOperationKind
	amount float64
}

// printFilterRecipes mirrors IMAGE_FILTERS in frontend/src/lib/templates/constants.ts.
// Operation order is part of the rendering contract: CSS filter functions are not
// commutative, so each catalog recipe must run exactly as authored before the user's
// brightness → contrast → saturation adjustments.
var printFilterRecipes = map[string][]printFilterOperation{
	"none":      nil,
	"grayscale": {{kind: printFilterGrayscale, amount: 1}},
	"invert":    {{kind: printFilterInvert, amount: 1}},
	"blur":      {{kind: printFilterBlur, amount: 4}},
	"sepia":     {{kind: printFilterSepia, amount: 1}},
	"enhance": {
		{kind: printFilterContrast, amount: 1.08},
		{kind: printFilterSaturation, amount: 1.12},
		{kind: printFilterBrightness, amount: 1.02},
	},
	"skinGlow": {
		{kind: printFilterBrightness, amount: 1.06},
		{kind: printFilterContrast, amount: 0.94},
		{kind: printFilterSaturation, amount: 1.08},
		{kind: printFilterSepia, amount: 0.10},
	},
	"clarity": {
		{kind: printFilterContrast, amount: 1.22},
		{kind: printFilterSaturation, amount: 1.20},
		{kind: printFilterBrightness, amount: 0.98},
	},
	"lowlight": {
		{kind: printFilterBrightness, amount: 1.16},
		{kind: printFilterContrast, amount: 0.90},
		{kind: printFilterSaturation, amount: 1.05},
	},
	"cinematic": {
		{kind: printFilterContrast, amount: 1.10},
		{kind: printFilterSaturation, amount: 1.15},
		{kind: printFilterSepia, amount: 0.05},
		{kind: printFilterBrightness, amount: 1.02},
	},
	"monoPro": {
		{kind: printFilterGrayscale, amount: 1},
		{kind: printFilterContrast, amount: 1.25},
		{kind: printFilterBrightness, amount: 1.02},
	},
	"pixelate":  {{kind: printFilterPixelate, amount: 10}},
	"threshold": {{kind: printFilterThreshold, amount: 0.5}},
}

// IsSupportedPrintImageFilter exposes the backend allowlist without exporting a
// mutable map. The empty value is accepted as the legacy spelling of "none".
func IsSupportedPrintImageFilter(filter string) bool {
	if filter == "" {
		return true
	}
	_, ok := printFilterRecipes[filter]
	return ok
}

// ValidatePrintImageFilter is reusable from request validation without coupling
// the pipeline to PrintService's validation flow.
func ValidatePrintImageFilter(filter string) error {
	if !IsSupportedPrintImageFilter(filter) {
		return fmt.Errorf("unsupported print image filter %q", filter)
	}
	return nil
}

// ValidatePrintImageAdjustments enforces the UI contract shared by brightness,
// contrast, and saturation sliders. The processing functions still clamp finite
// out-of-range values defensively; request validation should use this helper to
// reject malformed payloads rather than silently accepting them.
func ValidatePrintImageAdjustments(brightness, contrast, saturation float64) error {
	for _, adjustment := range []struct {
		name  string
		value float64
	}{
		{name: "brightness", value: brightness},
		{name: "contrast", value: contrast},
		{name: "saturation", value: saturation},
	} {
		if math.IsNaN(adjustment.value) || math.IsInf(adjustment.value, 0) {
			return fmt.Errorf("print image %s must be finite", adjustment.name)
		}
		if adjustment.value < printAdjustmentMin || adjustment.value > printAdjustmentMax {
			return fmt.Errorf("print image %s %.4g outside range %.0f..%.0f", adjustment.name, adjustment.value, printAdjustmentMin, printAdjustmentMax)
		}
	}
	return nil
}

func normalizedPrintAdjustment(value float64) float64 {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 100
	}
	return math.Min(math.Max(value, printAdjustmentMin), printAdjustmentMax)
}

func printUserAdjustmentOperations(brightness, contrast, saturation float64) []printFilterOperation {
	brightness = normalizedPrintAdjustment(brightness)
	contrast = normalizedPrintAdjustment(contrast)
	saturation = normalizedPrintAdjustment(saturation)

	operations := make([]printFilterOperation, 0, 3)
	if brightness != 100 {
		operations = append(operations, printFilterOperation{kind: printFilterBrightness, amount: brightness / 100})
	}
	if contrast != 100 {
		operations = append(operations, printFilterOperation{kind: printFilterContrast, amount: contrast / 100})
	}
	if saturation != 100 {
		operations = append(operations, printFilterOperation{kind: printFilterSaturation, amount: saturation / 100})
	}
	return operations
}

// applyColorAdjustments applies the canonical CSS sequence authored by the UI:
// multiplicative brightness, linear contrast around 0.5, then Rec.709 saturation.
func applyColorAdjustments(img image.Image, brightness, contrast, saturation float64) image.Image {
	return applyPrintFilterOperations(img, printUserAdjustmentOperations(brightness, contrast, saturation))
}

// applyPrintImageFilterPipeline applies the selected base recipe first and user
// adjustments second, matching buildCSSFilter's catalog → adjustments contract.
func applyPrintImageFilterPipeline(img image.Image, filter string, brightness, contrast, saturation float64) image.Image {
	recipe := printFilterRecipes[filter]
	user := printUserAdjustmentOperations(brightness, contrast, saturation)
	if len(recipe) == 0 {
		return applyPrintFilterOperations(img, user)
	}
	operations := make([]printFilterOperation, 0, len(recipe)+len(user))
	operations = append(operations, recipe...)
	operations = append(operations, user...)
	return applyPrintFilterOperations(img, operations)
}

func applyFilter(img image.Image, filter string) image.Image {
	return applyPrintFilterOperations(img, printFilterRecipes[filter])
}

func isPerPixelPrintFilter(kind printFilterOperationKind) bool {
	switch kind {
	case printFilterBrightness, printFilterContrast, printFilterSaturation,
		printFilterSepia, printFilterGrayscale, printFilterInvert, printFilterThreshold:
		return true
	default:
		return false
	}
}

// applyPrintFilterOperations coalesces adjacent per-pixel operations into one
// image scan while preserving intermediate Uint8ClampedArray-style rounding.
// Spatial filters remain separate passes and therefore retain their dimensions
// and neighborhood behavior.
func applyPrintFilterOperations(img image.Image, operations []printFilterOperation) image.Image {
	if len(operations) == 0 {
		return img
	}

	pending := make([]printFilterOperation, 0, len(operations))
	flush := func() {
		if len(pending) == 0 {
			return
		}
		img = applyPerPixelPrintFilters(img, pending)
		pending = pending[:0]
	}

	for _, operation := range operations {
		if isPerPixelPrintFilter(operation.kind) {
			pending = append(pending, operation)
			continue
		}
		flush()
		switch operation.kind {
		case printFilterPixelate:
			img = applyPixelate(img, int(math.Round(operation.amount)))
		case printFilterBlur:
			// Keep the established imaging.Blur spatial kernel and radius intact.
			img = imaging.Blur(img, operation.amount)
		}
	}
	flush()
	return img
}

func applyPerPixelPrintFilters(img image.Image, operations []printFilterOperation) image.Image {
	return imaging.AdjustFunc(img, func(c color.NRGBA) color.NRGBA {
		for _, operation := range operations {
			switch operation.kind {
			case printFilterBrightness:
				c.R = cssClampUint8(float64(c.R) * operation.amount)
				c.G = cssClampUint8(float64(c.G) * operation.amount)
				c.B = cssClampUint8(float64(c.B) * operation.amount)
			case printFilterContrast:
				c.R = cssClampUint8((float64(c.R)-127.5)*operation.amount + 127.5)
				c.G = cssClampUint8((float64(c.G)-127.5)*operation.amount + 127.5)
				c.B = cssClampUint8((float64(c.B)-127.5)*operation.amount + 127.5)
			case printFilterSaturation:
				r := float64(c.R)
				g := float64(c.G)
				b := float64(c.B)
				gray := 0.2126*r + 0.7152*g + 0.0722*b
				c.R = cssClampUint8(gray + (r-gray)*operation.amount)
				c.G = cssClampUint8(gray + (g-gray)*operation.amount)
				c.B = cssClampUint8(gray + (b-gray)*operation.amount)
			case printFilterSepia:
				c = applySepiaToColor(c, operation.amount)
			case printFilterGrayscale:
				gray := cssClampUint8(0.2126*float64(c.R) + 0.7152*float64(c.G) + 0.0722*float64(c.B))
				c.R, c.G, c.B = gray, gray, gray
			case printFilterInvert:
				c.R = 255 - c.R
				c.G = 255 - c.G
				c.B = 255 - c.B
			case printFilterThreshold:
				level := math.Min(math.Max(operation.amount, 0), 1) * 255
				luminance := 0.299*float64(c.R) + 0.587*float64(c.G) + 0.114*float64(c.B)
				value := uint8(0)
				if luminance >= level {
					value = 255
				}
				c.R, c.G, c.B = value, value, value
			}
		}
		return c
	})
}

// cssClampUint8 mirrors assignment to Uint8ClampedArray, including ties-to-even
// rounding. Every operation clamps independently, as sequential frontend filters do.
func cssClampUint8(value float64) uint8 {
	if value <= 0 || math.IsNaN(value) {
		return 0
	}
	if value >= 255 {
		return 255
	}
	return uint8(math.RoundToEven(value))
}

func applySepiaToColor(c color.NRGBA, ratio float64) color.NRGBA {
	ratio = math.Min(math.Max(ratio, 0), 1)
	if ratio == 0 {
		return c
	}
	r := float64(c.R)
	g := float64(c.G)
	b := float64(c.B)
	sepiaR := 0.393*r + 0.769*g + 0.189*b
	sepiaG := 0.349*r + 0.686*g + 0.168*b
	sepiaB := 0.272*r + 0.534*g + 0.131*b
	c.R = cssClampUint8(r + (sepiaR-r)*ratio)
	c.G = cssClampUint8(g + (sepiaG-g)*ratio)
	c.B = cssClampUint8(b + (sepiaB-b)*ratio)
	return c
}

func applyPixelate(img image.Image, pixelSize int) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= pixelSize || h <= pixelSize || pixelSize <= 1 {
		return img
	}
	smallW := w / pixelSize
	smallH := h / pixelSize
	if smallW < 1 {
		smallW = 1
	}
	if smallH < 1 {
		smallH = 1
	}
	small := imaging.Resize(img, smallW, smallH, imaging.NearestNeighbor)
	return imaging.Resize(small, w, h, imaging.NearestNeighbor)
}

type processedKey struct {
	filePath   string
	brightness float64
	contrast   float64
	saturation float64
	filter     string
	targetW    int
	targetH    int
	cropX      float64
	cropY      float64
	cropW      float64
	cropH      float64
	flipX      bool
	flipY      bool
	rotation   float64
	slotAspect float64
	zoom       float64
	dragX      float64
	dragY      float64
}

type imageCache struct {
	mu         sync.RWMutex
	images     map[string]image.Image
	access     map[string]time.Time
	totalBytes int64
	group      singleflight.Group
}

const requestRawCacheMax = 8

// requestRawCacheMaxBytes ميزانية بايتات إجمالية لكاش الصور الخام داخل الطلب الواحد (256MB).
var requestRawCacheMaxBytes = int64(256 * 1024 * 1024)

func imageDecodedBytes(img image.Image) int64 {
	if img == nil {
		return 0
	}
	b := img.Bounds()
	return int64(b.Dx()) * int64(b.Dy()) * 4
}

func putRequestRaw(imgCache *imageCache, cacheKey string, img image.Image) {
	entryBytes := imageDecodedBytes(img)
	imgCache.mu.Lock()
	defer imgCache.mu.Unlock()

	if prev, ok := imgCache.images[cacheKey]; ok {
		imgCache.totalBytes -= imageDecodedBytes(prev)
		delete(imgCache.images, cacheKey)
		delete(imgCache.access, cacheKey)
	}

	for len(imgCache.images) >= requestRawCacheMax ||
		(imgCache.totalBytes+entryBytes > requestRawCacheMaxBytes && len(imgCache.images) > 0) {
		var oldestKey string
		var oldestTime time.Time
		first := true
		for k := range imgCache.images {
			t := imgCache.access[k]
			if first || t.Before(oldestTime) {
				oldestTime = t
				oldestKey = k
				first = false
			}
		}
		if first {
			break
		}
		imgCache.totalBytes -= imageDecodedBytes(imgCache.images[oldestKey])
		delete(imgCache.images, oldestKey)
		delete(imgCache.access, oldestKey)
	}

	imgCache.images[cacheKey] = img
	imgCache.access[cacheKey] = time.Now()
	imgCache.totalBytes += entryBytes
}

type processedCache struct {
	mu     sync.RWMutex
	images map[processedKey]image.Image
	access map[processedKey]time.Time
	// refs يعدّ مرات تخزين نفس مثال الصورة (نفس المؤشر) تحت مفاتيح معالجة
	// مختلفة — بايتاته تُحسب في الميزانية مرة واحدة ولا تُخصم إلا عند إزاحة
	// آخر مرجع (دفعة الأداء C2: بعدّ مرتين كانت ميزانية 512MiB تُستنفد وهمياً).
	refs       map[image.Image]int
	totalBytes int64
	group      singleflight.Group
}

// processedCacheMaxEntries سقف عدد الإدخالات (كما كان 16 سابقاً).
const processedCacheMaxEntries = 16

// processedCacheMaxBytes ميزانية بايتات كاش المعالجة (512MiB تقديراً
// W×H×4 بايت/بكسل) — الكاش كان يحتفظ بـ16 صورة بلا حد بايتات:
// 16 × 100MP RGBA ≈ 6.4GB أسوأ حالة محتفظ بها في طلب واحد.
// متغير (لا ثابتاً) كي يمكن خفضه في اختبارات الإزاحة.
var processedCacheMaxBytes = int64(512 << 20)

// put يخزن صورة معالجة تحت مفتاحها مع طرد أقدم الوصول عند تجاوز أيٍّ من
// سقفَي العدد أو البايتات. الصور المشتركة (نفس المؤشر تحت مفتاحين) تُحسب
// في الميزانية مرة واحدة.
func (c *processedCache) put(pKey processedKey, img image.Image) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.refs == nil {
		c.refs = make(map[image.Image]int)
	}

	entryBytes := imageDecodedBytes(img)
	// مفتاح قائم (لا يتكرر عبر singleflight — دفاعية): حدّث الوصول فقط.
	if _, ok := c.images[pKey]; ok {
		c.access[pKey] = time.Now()
		return
	}
	additional := entryBytes
	if c.refs[img] > 0 {
		additional = 0 // مثال مشترك — بايتاته محسوبة أصلاً
	}
	for len(c.images) >= processedCacheMaxEntries ||
		(c.totalBytes+additional > processedCacheMaxBytes && len(c.images) > 0) {
		var oldestKey processedKey
		var oldestTime time.Time
		first := true
		for k := range c.images {
			t := c.access[k]
			if first || t.Before(oldestTime) {
				oldestTime = t
				oldestKey = k
				first = false
			}
		}
		if first {
			break
		}
		c.releaseLocked(c.images[oldestKey])
		delete(c.images, oldestKey)
		delete(c.access, oldestKey)
	}
	c.images[pKey] = img
	c.access[pKey] = time.Now()
	c.refs[img]++
	if c.refs[img] == 1 {
		c.totalBytes += entryBytes
	}
}

// releaseLocked يخصم مرجعاً لمثال صورة من الكاش: بايتاته تُخصم من الميزانية
// فقط عند إزاحة آخر مرجع له. يجب استدعاؤه والحاجز مأخوذاً.
func (c *processedCache) releaseLocked(img image.Image) {
	if c.refs[img] <= 0 {
		return
	}
	c.refs[img]--
	if c.refs[img] == 0 {
		delete(c.refs, img)
		c.totalBytes -= imageDecodedBytes(img)
		if c.totalBytes < 0 {
			c.totalBytes = 0
		}
	}
}

// كاش خام مشترك عبر طلبات الطباعة — طباعتان متتاليتان لنفس الصور كانتا
// تعيدان فك الترميز كاملاً (الكاش السابق يُبنى ويُرمى لكل طلب).
// مفاتيح base64 مُعنونة بالمحتوى فآمنة، ومسارات الملفات تُتحقق بالحجم+الزمن.
type sharedRawEntry struct {
	img     image.Image
	size    int64
	modTime time.Time
	access  time.Time
	// bytes تقدير RGBA (w×h×4) — لدفع ميزانية البايتات الإجمالية (RV-16-M5)
	bytes int64
}

var sharedRawCache = struct {
	sync.RWMutex
	images     map[string]sharedRawEntry
	totalBytes int64
}{images: make(map[string]sharedRawEntry)}

const sharedRawCacheMax = 16
const sharedRawCacheTTL = 5 * time.Minute
const sharedRawCacheMaxPixels = int64(25_000_000) // لا نخزن خاماً فوق ~100MB

// sharedRawCacheMaxBytes ميزانية بايتات إجمالية للكاش المشترك (RV-16-M5):
// السقوف السابقة كانت لكل صورة فقط (16 × 100MB ≈ 1.6GB أسوأ حالة محتفظاً بها
// لمدة TTL كاملة). متغير (لا ثابتاً) كي يمكن خفضه في اختبارات الإزاحة.
var sharedRawCacheMaxBytes = int64(400 * 1024 * 1024)

func getSharedRaw(cacheKey, filePath string) image.Image {
	if !strings.HasPrefix(filePath, "data:image/") {
		info, err := os.Stat(filePath)
		if err != nil {
			return nil
		}
		sharedRawCache.RLock()
		e, ok := sharedRawCache.images[cacheKey]
		sharedRawCache.RUnlock()
		if !ok || e.size != info.Size() || !e.modTime.Equal(info.ModTime()) || time.Since(e.access) > sharedRawCacheTTL {
			return nil
		}
	} else {
		sharedRawCache.RLock()
		e, ok := sharedRawCache.images[cacheKey]
		sharedRawCache.RUnlock()
		if !ok || time.Since(e.access) > sharedRawCacheTTL {
			return nil
		}
	}
	sharedRawCache.Lock()
	if cur, ok := sharedRawCache.images[cacheKey]; ok {
		cur.access = time.Now()
		sharedRawCache.images[cacheKey] = cur
		sharedRawCache.Unlock()
		return cur.img
	}
	sharedRawCache.Unlock()
	return nil
}

func putSharedRaw(cacheKey, filePath string, img image.Image) {
	var size int64 = -1
	var mod time.Time
	if !strings.HasPrefix(filePath, "data:image/") {
		info, err := os.Stat(filePath)
		if err != nil {
			return
		}
		size, mod = info.Size(), info.ModTime()
	}
	b := img.Bounds()
	if int64(b.Dx())*int64(b.Dy()) > sharedRawCacheMaxPixels {
		return
	}
	entryBytes := int64(b.Dx()) * int64(b.Dy()) * 4 // RGBA المفكوكة

	sharedRawCache.Lock()
	defer sharedRawCache.Unlock()
	// استبدال مفتاح قائم: تُخصم بايتات الإدخال القديم قبل التقييم
	if cur, ok := sharedRawCache.images[cacheKey]; ok {
		sharedRawCache.totalBytes -= cur.bytes
		delete(sharedRawCache.images, cacheKey)
	}
	// 🖨️ RV-16-M5: الإزاحة بأقدم وصول عند تجاوز أيٍّ من السقفين — عدد
	// الإدخالات (16) أو ميزانية البايتات الإجمالية (400MB)
	for len(sharedRawCache.images) >= sharedRawCacheMax ||
		(sharedRawCache.totalBytes+entryBytes > sharedRawCacheMaxBytes && len(sharedRawCache.images) > 0) {
		var oldest string
		var oldestT time.Time
		first := true
		for k, e := range sharedRawCache.images {
			if first || e.access.Before(oldestT) {
				oldest, oldestT, first = k, e.access, false
			}
		}
		if first {
			break
		}
		sharedRawCache.totalBytes -= sharedRawCache.images[oldest].bytes
		delete(sharedRawCache.images, oldest)
	}
	sharedRawCache.images[cacheKey] = sharedRawEntry{img: img, size: size, modTime: mod, access: time.Now(), bytes: entryBytes}
	sharedRawCache.totalBytes += entryBytes
}

// computeImageCacheKey يحسب مفتاح كاش للصورة (مع تجنب Hash كامل لـ Base64 الضخمة)
func computeImageCacheKey(filePath string) string {
	if !strings.HasPrefix(filePath, "data:image/") {
		return filePath
	}

	// 🔎 المفتاح كان يقتطع المدخل (أول 512 + آخر 512 بايت + الطول فقط)، فيمكن أن
	// يتصادم مفتاحان لصورتين مختلفتين بنفس الطول ونفس الطرفين → تُطبع الصورة
	// الخطأ من الكاش. الآن ثلاث عينات (بداية/منتصف/نهاية) + الطول.
	const sampleSize = 2048
	if len(filePath) <= sampleSize*3 {
		return fmt.Sprintf("b64_%x", sha256.Sum256([]byte(filePath)))
	}

	h := sha256.New()
	h.Write([]byte(filePath[:sampleSize]))
	middle := len(filePath)/2 - sampleSize/2
	h.Write([]byte(filePath[middle : middle+sampleSize]))
	h.Write([]byte(filePath[len(filePath)-sampleSize:]))
	return fmt.Sprintf("b64_%x_len%d", h.Sum(nil), len(filePath))
}

// loadRawImage يفتح الصورة من ملف أو Base64 مع كاش LRU ومنع تكرار التحميل الجاري (In-Flight Deduplication) عبر singleflight
func loadRawImage(filePath string, cacheKey string, imgCache *imageCache) (image.Image, error) {
	imgCache.mu.RLock()
	if cachedRaw, ok := imgCache.images[cacheKey]; ok {
		imgCache.mu.RUnlock()
		imgCache.mu.Lock()
		imgCache.access[cacheKey] = time.Now()
		imgCache.mu.Unlock()
		return cachedRaw, nil
	}
	imgCache.mu.RUnlock()

	// إصابة عبر الطلبات قبل فك الترميز — تُزرع أيضاً في كاش الطلب الحالي ضمن ميزانية البايتات
	if shared := getSharedRaw(cacheKey, filePath); shared != nil {
		putRequestRaw(imgCache, cacheKey, shared)
		return shared, nil
	}

	// 🖨️ مسار فارغ = مرفوض من سياسة النطاق — خطأ صريح بدل رسالة open مضللة.
	if filePath == "" {
		return nil, fmt.Errorf("empty image path (rejected by resolveLocalPath scope policy)")
	}

	res, err, _ := imgCache.group.Do(cacheKey, func() (interface{}, error) {
		imgCache.mu.RLock()
		if cachedRaw, ok := imgCache.images[cacheKey]; ok {
			imgCache.mu.RUnlock()
			return cachedRaw, nil
		}
		imgCache.mu.RUnlock()

		var img image.Image
		var err error

		if strings.HasPrefix(filePath, "data:image/") {
			commaIdx := strings.Index(filePath, ",")
			if commaIdx == -1 {
				return nil, fmt.Errorf("invalid base64 image format")
			}
			b64Data := filePath[commaIdx+1:]
			if len(b64Data) > 50*1024*1024 {
				return nil, fmt.Errorf("base64 image data too large: %d bytes (max %d)", len(b64Data), 50*1024*1024)
			}
			data, err := base64.StdEncoding.DecodeString(b64Data)
			if err != nil {
				return nil, fmt.Errorf("failed to decode base64 image: %w", err)
			}
			// 🖨️ فحص الترويسة قبل الفك (RV-Print-08): القنبلة تُكتشف هنا بلا تخصيص.
			if cfg, _, cfgErr := image.DecodeConfig(bytes.NewReader(data)); cfgErr != nil {
				return nil, fmt.Errorf("unsupported image format in base64 data: %w", cfgErr)
			} else if capErr := checkDecodedPixelCap(cfg, "base64 image"); capErr != nil {
				return nil, capErr
			}
			img, err = imaging.Decode(
				io.LimitReader(bytes.NewReader(data), 100*1024*1024),
				imaging.AutoOrientation(true),
			)
			if err != nil {
				return nil, fmt.Errorf("failed to decode image from base64 data: %w", err)
			}
		} else {
			// 🖨️ فحص الترويسة من القرص قبل الفك (RV-Print-08) — نفس السقف.
			f, openErr := os.Open(filePath)
			if openErr != nil {
				return nil, fmt.Errorf("failed to open image %s: %w", filepath.Base(filePath), openErr)
			}
			cfg, _, cfgErr := image.DecodeConfig(f)
			if cfgErr != nil {
				_ = f.Close()
				return nil, fmt.Errorf("unsupported image format %s: %w", filepath.Base(filePath), cfgErr)
			}
			if capErr := checkDecodedPixelCap(cfg, filepath.Base(filePath)); capErr != nil {
				_ = f.Close()
				return nil, capErr
			}
			if _, seekErr := f.Seek(0, io.SeekStart); seekErr != nil {
				_ = f.Close()
				return nil, fmt.Errorf("failed to rewind image %s: %w", filepath.Base(filePath), seekErr)
			}
			// التطبيع مع EXIF هنا يطابق أبعاد createImageBitmap(from-image) التي
			// بنت الواجهة عليها إحداثيات القص، بما في ذلك تبديل الأبعاد 5-8.
			img, err = imaging.Decode(f, imaging.AutoOrientation(true))
			closeErr := f.Close()
			if err != nil {
				return nil, fmt.Errorf("failed to open image %s: %w", filepath.Base(filePath), err)
			}
			if closeErr != nil {
				return nil, fmt.Errorf("failed to close image %s: %w", filepath.Base(filePath), closeErr)
			}
		}

		putRequestRaw(imgCache, cacheKey, img)

		return img, nil
	})

	if err != nil {
		return nil, err
	}
	img := res.(image.Image)
	putSharedRaw(cacheKey, filePath, img)
	return img, nil
}

// isQuarterRotation يعيد true عندما يكون التدوير 90° أو 270° (mod 360).
// تُعكس نسبة القص للخانة؛ تبديل أبعاد المخرج يخص الصور الحرة القديمة فقط.
func isQuarterRotation(rotation float64) bool {
	rotDeg := int(math.Round(rotation)) % 360
	if rotDeg < 0 {
		rotDeg += 360
	}
	return rotDeg == 90 || rotDeg == 270
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧮 أبعاد المصدر المفكوك لتقدير الدفعات (C3): ترويسة فقط بلا فك بكسلات، مع
// تطبيع اتجاه EXIF (5-8 تبدّل الأبعاد كما يفعل imaging.AutoOrientation عند
// الفك الفعلي) — دفعة صغيرة من الأهداف المصغّرة كانت تحتشد صوراً عملاقة المصدر.
// ─────────────────────────────────────────────────────────────────────────────

// sourceExifHeadLen كافٍ لترويسة الصورة ووسم EXIF الاتجاه في الحالات الواقعية.
const sourceExifHeadLen = 64 * 1024

// sourceDecodedDims يعيد أبعاد صورة المصدر بعد تطبيع EXIF دون فك البكسلات:
// image.DecodeConfig يقرأ الترويسة فقط (صفر تخصيص بكسلات). للبيانات Base64
// يُفك أول جزء من الترويسة تجنباً لفك 50MB كاملة. الفشل يعني (0,0,false)
// فيُترك وزن المصدر خارج التقدير — سلوك التقدير السابق.
func sourceDecodedDims(filePath string) (w, h int64, ok bool) {
	if strings.HasPrefix(filePath, "data:image/") {
		commaIdx := strings.Index(filePath, ",")
		if commaIdx == -1 {
			return 0, 0, false
		}
		enc := filePath[commaIdx+1:]
		if len(enc) > sourceExifHeadLen {
			enc = enc[:sourceExifHeadLen-sourceExifHeadLen%4] // مضاعف 4 لفك base64 سليم
		}
		head, err := base64.StdEncoding.DecodeString(enc)
		if err != nil {
			return 0, 0, false
		}
		return decodeConfigDimsWithEXIF(head)
	}
	f, err := os.Open(filePath)
	if err != nil {
		return 0, 0, false
	}
	defer f.Close()
	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return 0, 0, false
	}
	w, h = int64(cfg.Width), int64(cfg.Height)
	// اتجاه EXIF: نعيد القراءة من البداية لفحص ترويسة JPEG فقط.
	if _, serr := f.Seek(0, io.SeekStart); serr == nil {
		head := make([]byte, sourceExifHeadLen)
		n, _ := io.ReadFull(f, head)
		if n > 0 {
			if o := jpegEXIFOrientation(head[:n]); o >= 5 && o <= 8 {
				w, h = h, w
			}
		}
	}
	return w, h, true
}

// decodeConfigDimsWithEXIF يقرأ الأبعاد من ترويسة خام مع تطبيع اتجاه EXIF.
func decodeConfigDimsWithEXIF(head []byte) (w, h int64, ok bool) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(head))
	if err != nil {
		return 0, 0, false
	}
	w, h = int64(cfg.Width), int64(cfg.Height)
	if o := jpegEXIFOrientation(head); o >= 5 && o <= 8 {
		w, h = h, w
	}
	return w, h, true
}

// jpegEXIFOrientation يقرأ وسم الاتجاه (0x0112) من مقطع APP1/Exif في ترويسة
// JPEG — يكفي أول sourceExifHeadLen بايت. يعيد 0 إن لم يوجد.
func jpegEXIFOrientation(head []byte) int {
	if len(head) < 4 || head[0] != 0xFF || head[1] != 0xD8 {
		return 0
	}
	pos := 2
	for pos+4 <= len(head) {
		if head[pos] != 0xFF {
			return 0
		}
		marker := head[pos+1]
		// مقاطع بلا طول: SOI/EOI/RSTn/TEM
		if marker == 0xD8 || marker == 0xD9 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7) {
			pos += 2
			continue
		}
		if marker == 0xDA { // SOS — بدأت بيانات الصورة، لا EXIF بعد الآن
			return 0
		}
		segLen := int(head[pos+2])<<8 | int(head[pos+3])
		if segLen < 2 {
			return 0
		}
		segEnd := pos + 2 + segLen
		if marker == 0xE1 && pos+10 <= len(head) &&
			bytes.Equal(head[pos+4:pos+10], []byte("Exif\x00\x00")) {
			return tiffIFDOrientation(head[pos+10 : min(segEnd, len(head))])
		}
		if segEnd <= pos { // حماية من طول فاسد يعلّق الحلقة
			return 0
		}
		pos = segEnd
	}
	return 0
}

// tiffIFDOrientation يقرأ وسم الاتجاه 0x0112 من IFD0 في كتلة TIFF (II أو MM).
func tiffIFDOrientation(tiff []byte) int {
	if len(tiff) < 8 {
		return 0
	}
	var u16 func([]byte) int
	switch {
	case tiff[0] == 'I' && tiff[1] == 'I':
		u16 = func(b []byte) int { return int(b[0]) | int(b[1])<<8 }
	case tiff[0] == 'M' && tiff[1] == 'M':
		u16 = func(b []byte) int { return int(b[0])<<8 | int(b[1]) }
	default:
		return 0
	}
	if u16(tiff[2:4]) != 42 {
		return 0
	}
	ifdOff := int(binary.BigEndian.Uint32(tiff[4:8]))
	if tiff[0] == 'I' {
		ifdOff = int(binary.LittleEndian.Uint32(tiff[4:8]))
	}
	if ifdOff < 0 || ifdOff+2 > len(tiff) {
		return 0
	}
	count := u16(tiff[ifdOff : ifdOff+2])
	for i := 0; i < count; i++ {
		e := ifdOff + 2 + i*12
		if e+12 > len(tiff) {
			return 0
		}
		if u16(tiff[e:e+2]) == 0x0112 { // Orientation (SHORT)
			return u16(tiff[e+8 : e+10])
		}
	}
	return 0
}

// computeCropFromSlot يحسب منطقة الاقتصاص بناءً على نسبة الخانة والزوم والسحب
func computeCropFromSlot(item domain.PrintItem, img image.Image) (cropX, cropY, cropW, cropH float64) {
	cropX = item.CropX
	cropY = item.CropY
	cropW = item.CropW
	cropH = item.CropH

	if (cropW <= 0 || cropH <= 0) && item.SlotAspect > 0 {
		imgW := float64(img.Bounds().Dx())
		imgH := float64(img.Bounds().Dy())
		imgAspect := imgW / imgH
		slotAspect := item.SlotAspect
		// 🛡️ إصلاح: عند التدوير 90/270 تتبدل نسبة الخلية الفعالة — Konva يبدّلها
		// (isRotated90or270 ? height/width : width/height) قبل حساب نافذة القصّ،
		// فكانت الطباعة تقصّ الخلايا المدوّرة بنسبة خاطئة مقابل المحرر
		if isQuarterRotation(item.Rotation) {
			slotAspect = 1 / slotAspect
		}

		sw := imgW
		sh := imgH

		if imgAspect > slotAspect {
			sw = imgH * slotAspect
		} else {
			sh = imgW / slotAspect
		}

		zoomVal := item.Zoom
		if zoomVal <= 0 {
			zoomVal = 1
		}

		sw = sw / zoomVal
		sh = sh / zoomVal

		defaultSx := 0.0
		defaultSy := 0.0
		if imgAspect > slotAspect {
			defaultSx = (imgW - sw) / 2
		} else {
			defaultSy = (imgH - sh) / 2
		}

		// نافذة القصّة النهائية تُقيَّد بحدود الصورة نفسها لا بإزاحة متماثلة
		// حول نقطة البدء — بعد ربع دوران يتبدل موضع البدء (حافة بدل مركز)
		// فكانت القيود المتماثلة تسمح بمصدر سالب. مطابق لمسار الواجهة
		// (computeSlotCrop) الذي يقيّد الموضع النهائي ذاته فيبقى مقاس
		// النافذة كما هو بلا قلص ولا تمديد.
		maxCropX := math.Max(0, imgW-sw)
		maxCropY := math.Max(0, imgH-sh)
		cropX = math.Max(0, math.Min(maxCropX, defaultSx+item.DragX))
		cropY = math.Max(0, math.Min(maxCropY, defaultSy+item.DragY))
		cropW = sw
		cropH = sh
	}

	return cropX, cropY, cropW, cropH
}

// applyImageProcessing يطبق التحجيم والاقتصاص والمرشحات على الصورة
func applyImageProcessing(img image.Image, item domain.PrintItem, targetW, targetH int) image.Image {
	cropX, cropY, cropW, cropH := computeCropFromSlot(item, img)

	if cropW > 0 && cropH > 0 {
		bounds := img.Bounds()
		imgW := float64(bounds.Dx())
		imgH := float64(bounds.Dy())

		// 🛡️ ضغط منطقة الاقتصاص داخل حدود الصورة — يمنع انهيار imaging.Crop
		// خارج النطاق عند وصول بيانات اقتصاص من واجهة لا تتطابق مع الصورة الحالية
		if cropX < 0 {
			cropW += cropX
			cropX = 0
		}
		if cropY < 0 {
			cropH += cropY
			cropY = 0
		}
		if cropX+cropW > imgW {
			cropW = imgW - cropX
		}
		if cropY+cropH > imgH {
			cropH = imgH - cropY
		}

		if cropW <= 0 || cropH <= 0 {
			return imaging.Resize(img, targetW, targetH, imaging.Lanczos)
		}

		rect := image.Rect(
			int(math.Round(cropX)),
			int(math.Round(cropY)),
			int(math.Round(cropX+cropW)),
			int(math.Round(cropY+cropH)),
		)
		img = imaging.Crop(img, rect)
	}

	// 🛡️ إصلاح WYSIWYG: القلب قبل التدوير — المحرر (Konva) يبني مصفوفة المجموعة
	// T·R·S (Node.js: translate ← rotate ← scale) فالنقطة تُقلب أولاً ثم تُدوَّر.
	// كان القلب يُطبّق بعد التدوير (H·R) فينعكس الناتج 180° عند 90/270 مع أي قلب.
	// الاقتصاص يبقى أولاً: cropX/cropY في فضاء المصدر على عقدة الصورة نفسها،
	// وتحويل المجموعة (قلب/تدوير) يُطبَّق على المحتوى المقصوص بعده.
	if item.FlipX {
		img = imaging.FlipH(img)
	}
	if item.FlipY {
		img = imaging.FlipV(img)
	}

	// SlotAspect > 0 already crops against the inverse aspect for quarter turns,
	// so rotation restores the final slot aspect and its target W/H must stay put.
	// SlotAspect == 0 keeps the legacy/free-image rotated-size contract.
	if item.Rotation != 0 {
		// 🛡️ إصلاح: imaging.Rotate يدور عكس عقارب الساعة للزوايا الموجبة، بينما
		// Konva/CSS/Canvas تدور مع عقارب الساعة — النفي يجعل الطباعة تطابق المحرر
		img = imaging.Rotate(img, -item.Rotation, color.Transparent)
		if item.SlotAspect <= 0 && isQuarterRotation(item.Rotation) {
			targetW, targetH = targetH, targetW
		}
	}

	bounds := img.Bounds()
	var resizedImg image.Image
	if bounds.Dx() == targetW && bounds.Dy() == targetH {
		resizedImg = img
	} else {
		resizedImg = imaging.Resize(img, targetW, targetH, imaging.Lanczos)
	}

	return applyPrintImageFilterPipeline(resizedImg, item.Filter, item.Brightness, item.Contrast, item.Saturation)
}

// loadAndProcessImage يقوم بفتح الصورة ومعالجة ألوانها وأبعادها مع إدارة الذاكرة بنظام LRU وتفادي تكرار المعالجة الجارية
func (s *PrintService) loadAndProcessImage(
	item domain.PrintItem,
	dpi int,
	imgCache *imageCache,
	procCache *processedCache,
) (image.Image, error) {
	filePath := resolveLocalPath(item.ImageSrc)
	targetW := int(math.Round(mmToPx(item.W, dpi)))
	targetH := int(math.Round(mmToPx(item.H, dpi)))

	cacheKey := computeImageCacheKey(filePath)

	pKey := processedKey{
		filePath:   cacheKey,
		brightness: item.Brightness,
		contrast:   item.Contrast,
		saturation: item.Saturation,
		filter:     item.Filter,
		targetW:    targetW,
		targetH:    targetH,
		cropX:      item.CropX,
		cropY:      item.CropY,
		cropW:      item.CropW,
		cropH:      item.CropH,
		flipX:      item.FlipX,
		flipY:      item.FlipY,
		rotation:   item.Rotation,
		slotAspect: item.SlotAspect,
		zoom:       item.Zoom,
		dragX:      item.DragX,
		dragY:      item.DragY,
	}

	procCache.mu.RLock()
	if cached, ok := procCache.images[pKey]; ok {
		procCache.mu.RUnlock()
		procCache.mu.Lock()
		procCache.access[pKey] = time.Now()
		procCache.mu.Unlock()
		return cached, nil
	}
	procCache.mu.RUnlock()

	flightKey := fmt.Sprintf("%+v", pKey)
	res, err, _ := procCache.group.Do(flightKey, func() (interface{}, error) {
		procCache.mu.RLock()
		if cached, ok := procCache.images[pKey]; ok {
			procCache.mu.RUnlock()
			return cached, nil
		}
		procCache.mu.RUnlock()

		img, err := loadRawImage(filePath, cacheKey, imgCache)
		if err != nil {
			return nil, err
		}

		effW := targetW
		if effW <= 0 {
			effW = 1
		}
		effH := targetH
		if effH <= 0 {
			effH = 1
		}

		processedImg := applyImageProcessing(img, item, effW, effH)

		// 🧠 تخزين بميزانية بايتات (C2): السقف كان عددياً (16) فقط — الآن
		// سقف بايتات 512MiB يطرد أقدم الوصول، والصور المشتركة بعدّ مرة واحدة.
		procCache.put(pKey, processedImg)

		return processedImg, nil
	})

	if err != nil {
		return nil, err
	}
	return res.(image.Image), nil
}
