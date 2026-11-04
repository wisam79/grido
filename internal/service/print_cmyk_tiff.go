package service

import (
	"compress/zlib"
	"encoding/binary"
	"fmt"
	"image"
	"io"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_cmyk_tiff.go — مشفّر TIFF لفصل أحبار CMYK (PhotometricInterpretation=5)
//
// المشكلة التي يحلّها هذا الملف: لا `encoding/*` ولا `golang.org/x/image/tiff`
// يدعمان كتابة CMYK. تمرير *image.CMYK إلى tiff.Encode يقع في الفرع العام
// (encode → m.At().RGBA()) فيكتب قنوات RGB محوّلة من CMYK ويوسم الملف
// photometric=2 (RGB) مع قناة ألفا — أي ملف يفقد فصل الأحبار تماماً بينما
// يُسمّى «CMYK TIFF». أثبت ذلك اختبار print_cmyk_tiff_test.go.
//
// الحل: كتابة TIFF 6.0 مطابق يدوياً — كل الوسوم المطلوبة لفصل الألوان:
//   258 BitsPerSample [8,8,8,8] · 262 Photometric=5 (Separated) · 277 Samples=4
//   284 PlanarConfig=1 · 332 InkSet=1 (CMYK) · 259 Compression=8 (Deflate)
// ولا وسم ExtraSamples (يُمنع مع photometric=5) ولا قناة ألفا.
//
// التخطيط: رأس ← شريط البكسل ← مصفوفة BitsPerSample ← IFD0 ← ذيل النسب.
// وضع الـIFD في الذيل يجعل كل إزاحات القيم قبل نهايته.
//
// 🖨️ البث المتدفق (دفعة الأداء): الترميز يكتب مباشرة على io.Writer (ملف مؤقت
// مفتوح) — الشريط المضغوط يتدفق صفاً-صفاً فلا يوجد أي buffer بحجم الملف كاملاً،
// ووسوم الدقة (282/283/296) تُبنى داخل IFD0 من أول مرة بتمرير واحد ثم تُرقَّع
// إزاحة IFD0 (4 بايتات) في الترويسة — فلا نسخة ثانية للملف كاملاً كما كان
// يفعل injectTIFFResolution. المخرج مطابق بايت-بايت للمسار القديم (الذهبي
// TestEncodeCMYKTIFF_GoldenBytes يقفل ذلك).
// ─────────────────────────────────────────────────────────────────────────────

const (
	tiffTypeLong = 4

	tiffTagImageWidth     = 256
	tiffTagImageLength    = 257
	tiffTagBitsPerSample  = 258
	tiffTagCompression    = 259
	tiffTagPhotometricInt = 262
	tiffTagStripOffsets   = 273
	tiffTagSamplesPerPix  = 277
	tiffTagRowsPerStrip   = 278
	tiffTagStripByteCount = 279
	tiffTagPlanarConfig   = 284
	tiffTagInkSet         = 332
	// 338 ExtraSamples: يُمنع وجوده مع photometric=5 — لا قناة ألفا في فصل الأحبار.
	tiffTagExtraSamplesTag = 338

	tiffPhotometricSeparated = 5 // CMYK (TIFF 6.0 § 8: Separated)
	tiffInkSetCMYK           = 1
	tiffCompressionDeflate   = 8 // Adobe Deflate (zlib)
	tiffPlanarChunky         = 1
)

// encodeCMYKTIFF يرمّز صورة CMYK إلى TIFF بفصل أحبار حقيقي + وسوم الدقة.
// يعيد خطأً صريحاً بدل ملف ناقص عند أي حالة غير صالحة (أبعاد صفرية أو DPI خارج الحد).
// التوقيع ([]byte, error) محفوظ لموقع الاستدعاء في print_export.go — الغلاف
// تمرير واحد فوق encodeCMYKTIFFToWriter: نسخة بايتات واحدة بلا تمرير حقن ثانٍ.
func encodeCMYKTIFF(img *image.CMYK, dpi int) ([]byte, error) {
	var buf writeSeekBuffer
	if err := encodeCMYKTIFFToWriter(img, dpi, &buf); err != nil {
		return nil, err
	}
	return buf.b, nil
}

// writeSeekBuffer مخزن قابل للبحث يجسّر io.WriteSeeker فوق شريحة بايتات —
// بمؤشر كتابة صريح: الكتابة فوق محتوى قائم عند البحث للخلف (ترقيع الترويسة)
// والإلحاق عند البحث للنهاية. يكفي حاجة المشفّر حصراً (لا يحذف نطاقات مفقودة).
type writeSeekBuffer struct {
	b   []byte
	pos int
}

func (s *writeSeekBuffer) Write(p []byte) (int, error) {
	end := s.pos + len(p)
	if end > len(s.b) {
		s.b = append(s.b, make([]byte, end-len(s.b))...)
	}
	copy(s.b[s.pos:end], p)
	s.pos = end
	return len(p), nil
}

func (s *writeSeekBuffer) Seek(offset int64, whence int) (int64, error) {
	switch whence {
	case io.SeekStart:
		s.pos = int(offset)
	case io.SeekCurrent:
		s.pos += int(offset)
	case io.SeekEnd:
		s.pos = len(s.b) + int(offset)
	default:
		return 0, fmt.Errorf("writeSeekBuffer: invalid whence %d", whence)
	}
	if s.pos < 0 || s.pos > len(s.b) {
		return 0, fmt.Errorf("writeSeekBuffer: seek offset %d out of range [0,%d]", s.pos, len(s.b))
	}
	return int64(s.pos), nil
}

// encodeCMYKTIFFToWriter يكتب TIFF مباشرة على io.Writer متدفق (ملف مؤقت مفتوح
// عبر utils.CreateAtomic مثلاً) — بلا أي buffer بحجم الملف كاملاً وبلا نسخة
// ثانية لحقن الوسوم. يتطلب io.WriteSeeker لترقيع إزاحة IFD0 في الترويسة
// (4 بايتات) — ملفات القرص os.File تدعمها أصلاً.
func encodeCMYKTIFFToWriter(img *image.CMYK, dpi int, dst io.Writer) error {
	if img == nil {
		return fmt.Errorf("cmyk tiff: nil image")
	}
	// نفس مدى التحقق الذي كان يفرضه injectTIFFResolution في المسار القديم.
	if dpi <= 0 || dpi > 9600 {
		return fmt.Errorf("invalid dpi for tiff resolution tags: %d", dpi)
	}
	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	if w <= 0 || h <= 0 {
		return fmt.Errorf("cmyk tiff: invalid dimensions %dx%d", w, h)
	}
	seeker, ok := dst.(io.WriteSeeker)
	if !ok {
		return fmt.Errorf("cmyk tiff: writer must support seeking (io.WriteSeeker) to patch the IFD0 header offset")
	}

	// البناء: رأس II/42 ← الشريط المضغوط ← BitsPerSample ← IFD0 ← ذيل النسب.
	// الضغط يتدفق صفاً-صفاً مباشرةً إلى الكاتب (بلا نسخة خام كاملة بحجم
	// 4×w×h بايت = حتى 200MB عند سقف 50MP): يُمرّر كل صف إلى zlib ويُترك،
	// مع نسخة صف واحد فقط لمراعاة Stride (قد يكون أكبر من 4×العرض).
	if _, err := seeker.Write([]byte{'I', 'I', 0x2A, 0x00, 0, 0, 0, 0}); err != nil { // ifdOffset يُرقَّع أدناه
		return fmt.Errorf("cmyk tiff: write header: %w", err)
	}
	stripOffset := uint32(8)
	zw := zlib.NewWriter(seeker)
	row := make([]byte, w*4)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		off := img.PixOffset(bounds.Min.X, y)
		copy(row, img.Pix[off:off+w*4])
		if _, err := zw.Write(row); err != nil {
			return fmt.Errorf("cmyk tiff: compress row %d: %w", y, err)
		}
	}
	if err := zw.Close(); err != nil {
		return fmt.Errorf("cmyk tiff: compress close: %w", err)
	}
	cur, err := seeker.Seek(0, io.SeekCurrent)
	if err != nil {
		return fmt.Errorf("cmyk tiff: strip length: %w", err)
	}
	stripLen := uint32(cur) - stripOffset

	bitsOffset := stripOffset + stripLen
	ifdOffset := bitsOffset + 8
	// ذيل النسب يلي نهاية IFD0 مباشرة: 2 (العدّ) + 14×12 (الإدخالات) + 4 (next).
	rationalBase := ifdOffset + 2 + 14*12 + 4
	xOff := rationalBase
	yOff := rationalBase + 8

	if _, err := seeker.Write([]byte{8, 0, 8, 0, 8, 0, 8, 0}); err != nil { // [8,8,8,8] كـ SHORT صغيرة-النهاية
		return fmt.Errorf("cmyk tiff: write bits per sample: %w", err)
	}

	// IFD0 كامل من أول مرة بوسوم الدقة النهائية (282/283/296) — إدخالات
	// تصاعدياً بالوسم كما يفرض موصوف TIFF، ومطابق تماماً لما كان ينتجه
	// المسار القديم (بناء ثم حقن) — الذهبي bit-identical يقفل التطابق.
	entries := []struct {
		tag   uint16
		typ   uint16
		count uint32
		value uint32
	}{
		{tiffTagImageWidth, tiffTypeLong, 1, uint32(w)},
		{tiffTagImageLength, tiffTypeLong, 1, uint32(h)},
		{tiffTagBitsPerSample, tiffTypeShort, 4, bitsOffset},
		{tiffTagCompression, tiffTypeShort, 1, tiffCompressionDeflate},
		{tiffTagPhotometricInt, tiffTypeShort, 1, tiffPhotometricSeparated},
		{tiffTagStripOffsets, tiffTypeLong, 1, stripOffset},
		{tiffTagSamplesPerPix, tiffTypeShort, 1, 4},
		{tiffTagRowsPerStrip, tiffTypeLong, 1, uint32(h)},
		{tiffTagStripByteCount, tiffTypeLong, 1, stripLen},
		{tiffTagXResolution, tiffTypeRational, 1, xOff},
		{tiffTagYResolution, tiffTypeRational, 1, yOff},
		{tiffTagPlanarConfig, tiffTypeShort, 1, tiffPlanarChunky},
		{tiffTagResolutionUnit, tiffTypeShort, 1, tiffResolutionUnitInch},
		{tiffTagInkSet, tiffTypeShort, 1, tiffInkSetCMYK},
	}

	var countBuf [2]byte
	binary.LittleEndian.PutUint16(countBuf[:], uint16(len(entries)))
	if _, err := seeker.Write(countBuf[:]); err != nil {
		return fmt.Errorf("cmyk tiff: write ifd count: %w", err)
	}

	var entryBuf [12]byte
	for _, e := range entries {
		binary.LittleEndian.PutUint16(entryBuf[0:2], e.tag)
		binary.LittleEndian.PutUint16(entryBuf[2:4], e.typ)
		binary.LittleEndian.PutUint32(entryBuf[4:8], e.count)
		binary.LittleEndian.PutUint32(entryBuf[8:12], e.value)
		if _, err := seeker.Write(entryBuf[:]); err != nil {
			return fmt.Errorf("cmyk tiff: write ifd entry %d: %w", e.tag, err)
		}
	}
	if _, err := seeker.Write([]byte{0, 0, 0, 0}); err != nil { // لا IFD تالٍ
		return fmt.Errorf("cmyk tiff: write ifd next: %w", err)
	}

	// ذيل النسب: (dpi/1) لكل من X وY — كما يكتبه injectTIFFResolution حرفياً.
	var ratBuf [16]byte
	binary.LittleEndian.PutUint32(ratBuf[0:4], uint32(dpi))
	binary.LittleEndian.PutUint32(ratBuf[4:8], 1)
	binary.LittleEndian.PutUint32(ratBuf[8:12], uint32(dpi))
	binary.LittleEndian.PutUint32(ratBuf[12:16], 1)
	if _, err := seeker.Write(ratBuf[:]); err != nil {
		return fmt.Errorf("cmyk tiff: write resolution tail: %w", err)
	}

	// 🩹 ترقيع إزاحة صغيرة في الترويسة: ifdOffset في البايتات 4:8.
	var ifdOffBuf [4]byte
	binary.LittleEndian.PutUint32(ifdOffBuf[:], ifdOffset)
	if _, err := seeker.Seek(4, io.SeekStart); err != nil {
		return fmt.Errorf("cmyk tiff: seek header patch: %w", err)
	}
	if _, err := seeker.Write(ifdOffBuf[:]); err != nil {
		return fmt.Errorf("cmyk tiff: patch header ifd offset: %w", err)
	}
	// العودة إلى نهاية الملف حتى تبقى أي كتابة لاحقة من المتصل تسلسلية صحيحة.
	if _, err := seeker.Seek(0, io.SeekEnd); err != nil {
		return fmt.Errorf("cmyk tiff: seek back to end: %w", err)
	}
	return nil
}
