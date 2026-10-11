package service

import (
	"bytes"
	"compress/zlib"
	"encoding/binary"
	"fmt"
	"image"
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
// التخطيط: رأس ← شريط البكسل ← مصفوفة BitsPerSample ← IFD0 في الذيل. وضع
// الـIFD في الذيل يجعل كل إزاحات القيم قبل نهايته، فيبقى حقن وسوم الدقة
// (injectTIFFResolution) صالحاً بلا إعادة حساب أي إزاحة.
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
func encodeCMYKTIFF(img *image.CMYK, dpi int) ([]byte, error) {
	if img == nil {
		return nil, fmt.Errorf("cmyk tiff: nil image")
	}
	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()
	if w <= 0 || h <= 0 {
		return nil, fmt.Errorf("cmyk tiff: invalid dimensions %dx%d", w, h)
	}

	// البناء: رأس II/42 ← الشريط المضغوط ← BitsPerSample ← IFD0.
	// الضغط يتدفق صفاً-صفاً مباشرةً إلى مخزن الملف (بلا نسخة خام كاملة بحجم
	// 4×w×h بايت = حتى 200MB عند سقف 50MP): يُمرّر كل صف إلى zlib ويُترك،
	// مع نسخة صف واحد فقط لمراعاة Stride (قد يكون أكبر من 4×العرض).
	var out bytes.Buffer
	out.Grow(8 + w*h*4/2)
	out.Write([]byte{'I', 'I', 0x2A, 0x00, 0, 0, 0, 0}) // ifdOffset يُرقَّع أدناه

	stripOffset := uint32(out.Len())
	zw := zlib.NewWriter(&out)
	row := make([]byte, w*4)
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		off := img.PixOffset(bounds.Min.X, y)
		copy(row, img.Pix[off:off+w*4])
		if _, err := zw.Write(row); err != nil {
			return nil, fmt.Errorf("cmyk tiff: compress row %d: %w", y, err)
		}
	}
	if err := zw.Close(); err != nil {
		return nil, fmt.Errorf("cmyk tiff: compress close: %w", err)
	}
	stripLen := out.Len() - int(stripOffset)

	bitsOffset := uint32(out.Len())
	out.Write([]byte{8, 0, 8, 0, 8, 0, 8, 0}) // [8,8,8,8] كـ SHORT صغيرة-النهاية

	ifdOffset := uint32(out.Len())
	binary.LittleEndian.PutUint32(out.Bytes()[4:8], ifdOffset)

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
		{tiffTagStripByteCount, tiffTypeLong, 1, uint32(stripLen)},
		{tiffTagPlanarConfig, tiffTypeShort, 1, tiffPlanarChunky},
		{tiffTagInkSet, tiffTypeShort, 1, tiffInkSetCMYK},
	}

	var countBuf [2]byte
	binary.LittleEndian.PutUint16(countBuf[:], uint16(len(entries)))
	out.Write(countBuf[:])

	var entryBuf [12]byte
	for _, e := range entries {
		binary.LittleEndian.PutUint16(entryBuf[0:2], e.tag)
		binary.LittleEndian.PutUint16(entryBuf[2:4], e.typ)
		binary.LittleEndian.PutUint32(entryBuf[4:8], e.count)
		binary.LittleEndian.PutUint32(entryBuf[8:12], e.value)
		out.Write(entryBuf[:])
	}
	out.Write([]byte{0, 0, 0, 0}) // لا IFD تالٍ

	// وسوم الدقة الفيزيائية (282/283/296) — منطق مُختبَر ومشترك مع بقية المسارات.
	tagged, err := injectTIFFResolution(out.Bytes(), dpi)
	if err != nil {
		return nil, fmt.Errorf("cmyk tiff: resolution tags: %w", err)
	}
	return tagged, nil
}
