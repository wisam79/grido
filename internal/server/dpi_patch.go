package server

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
	"io"
	"strconv"
	"strings"

	"grido/internal/service"
)

// 🖨️ حقن كثافة الطباعة (DPI) في ملفات PNG/JPEG على مستوى البايتات.
//
// الدافع (تدقيق 2026-10-19): مسار تصدير RGB في الواجهة كان يكتب الملف كما
// وردته من canvas.toBlob تماماً — بلا بيانات كثافة — بينما حوار التصدير
// يعرض «300 DPI»، فتفترض أدوات الطباعة الخارجية 72/96 DPI وقد تُخرج
// مقاساً فيزيائياً خاطئاً (نفس الملف يُقرأ على ورق أكبر/أصغر). مسارُا
// CMYK/الطباعة يحقنان الكثافة في Go أساساً؛ هذا الملف يوحّد السلوك
// للـ PNG/JPEG بلا إعادة ترميز أو تغيير أي بكسل.

// PNGSignature توقيع PNG الثابت (8 بايت).
var PNGSignature = []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}

// JPEGSignature توقيع JPEG (SOI).
var JPEGSignature = []byte{0xFF, 0xD8}

// parseDPI يقرأ كثافة الطباعة من معامل الاستعلام. المدى المعقول للطباعة
// 36–2400؛ أي قيمة خارج المدى أو غير رقمية تُتجاهل (0 = لا حقن).
func parseDPI(raw string) int {
	n, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || n < 36 || n > 2400 {
		return 0
	}
	return n
}

// pixelsPerMeter يحوّل DPI إلى بكسل لكل متر (كما تتوقعه كتلة pHYs).
func pixelsPerMeter(dpi int) uint32 {
	return uint32(float64(dpi)/0.0254 + 0.5)
}

// patchImageDPI يحقن بيانات الكثافة في بايتات PNG/JPEG بحسب الامتداد.
// يعيد البيانات كما هي عند: امتداد غير مدعوم، توقيع غير مطابق، أو وجود
// pHYs مسبق. الفشل الصامت مقصود — التصدير لا يُكسر بسبب فشل الحقن.
func patchImageDPI(data []byte, ext string, dpi int) []byte {
	switch ext {
	case ".png":
		return setPNGDPI(data, dpi)
	case ".jpg", ".jpeg":
		return setJPEGDPI(data, dpi)
	default:
		return data
	}
}

// setPNGDPI يزرع كتلة pHYs (pixels per meter, unit=meter) قبل أول IDAT،
// فقط إن لم تكن موجودة — لا يستبدل كثافة سجّلها المستخدم سابقاً.
func setPNGDPI(data []byte, dpi int) []byte {
	if len(data) < len(PNGSignature) || !bytes.Equal(data[:len(PNGSignature)], PNGSignature) {
		return data
	}

	pos := len(PNGSignature) // بداية أول كتلة بعد التوقيع
	for pos+8 <= len(data) {
		length := binary.BigEndian.Uint32(data[pos : pos+4])
		chunkType := data[pos+4 : pos+8]
		if string(chunkType) == "pHYs" {
			return data // موجودة مسبقاً — لا تُمسّ
		}
		if string(chunkType) == "IDAT" {
			break // نقطة الإدراج
		}
		if length > uint32(len(data)-pos) {
			return data // كتلة تالفة/مبتورة — لا مخاطرة
		}
		pos += 8 + int(length) + 4 // طول + نوع + بيانات + CRC
	}
	if pos+8 > len(data) || string(data[pos+4:pos+8]) != "IDAT" {
		return data
	}

	ppm := pixelsPerMeter(dpi)
	ppmBuf := make([]byte, 4)
	binary.BigEndian.PutUint32(ppmBuf, ppm)

	// الكتلة: الطول(4) + النوع(4) + البيانات(9) + CRC(4)
	chunk := make([]byte, 0, 21)
	chunk = append(chunk, 0, 0, 0, 9) // length = 9
	chunk = append(chunk, "pHYs"...)
	chunk = append(chunk, ppmBuf...) // X
	chunk = append(chunk, ppmBuf...) // Y
	chunk = append(chunk, 1)         // unit = meter
	crcBuf := make([]byte, 4)
	binary.BigEndian.PutUint32(crcBuf, crc32.ChecksumIEEE(chunk[4:]))
	chunk = append(chunk, crcBuf...)

	out := make([]byte, 0, len(data)+len(chunk))
	out = append(out, data[:pos]...)
	out = append(out, chunk...)
	out = append(out, data[pos:]...)
	return out
}

// setJPEGDPI يعدّل حقلَي الكثافة في مقطع JFIF APP0 إن وُجد بعد SOI مباشرةً.
// JPEG بلا APP0/JFIF (مثل EXIF أولاً) يعود كما هو — لا إدراج مقطع.
func setJPEGDPI(data []byte, dpi int) []byte {
	if len(data) < 4 || !bytes.Equal(data[:2], JPEGSignature) {
		return data
	}
	if data[2] != 0xFF || data[3] != 0xE0 {
		return data // لا مقطع APP0 بعد SOI
	}

	// بنية APP0 كاملة حتى Ydensity: SOI(2) + marker(2) + طول المقطع(2)
	// + 'JFIF\0'(5) + major(1) + minor(1) + units(1) + Xdensity(2) + Ydensity(2)
	// = 18 بايتاً. حقل الطول يسبق المعرّف **حتماً** — إغفاله كان يزيح كل
	// الفحوصات والحقن بايتَين، فتمرّر كل صورة JFIF الحقيقية بلا حقن أبداً
	// (طول APP0 الجشِع = 0x0010 لا يطابق 'J','F') وتبقى الكثافة 72/96.
	if len(data) < 18 {
		return data
	}
	if !bytes.Equal(data[6:11], []byte{'J', 'F', 'I', 'F', 0}) {
		return data
	}
	// طول المقطع (بما فيه) لا يكفي لحقول الكثافة، أو يتجاوز الملف ⇒ مقطع مبتور
	if segLen := int(binary.BigEndian.Uint16(data[4:6])); segLen < 16 || 4+segLen > len(data) {
		return data
	}

	out := make([]byte, len(data))
	copy(out, data)
	density := make([]byte, 2)
	binary.BigEndian.PutUint16(density, uint16(dpi))
	const unitsPos = 13 // بعد SOI(2) + marker(2) + طول(2) + JFIF(5) + major/minor(2)
	out[unitsPos] = 1   // units = pixels per inch
	copy(out[unitsPos+1:unitsPos+3], density)
	copy(out[unitsPos+3:unitsPos+5], density)
	return out
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 النسخ المتدفق (دفعة الأداء): المساران أدناه يحقنان الكثافة أثناء النسخ
// من جسم الطلب إلى الملف المؤقت — بلا قراءة المخرج كاملاً في الذاكرة. البايتات
// الناتجة مطابقة تماماً لمسار patchImageDPI المخزّني (اختبار المراجعة يقارن
// المسارين بيت-بيت على مدخلات سليمة ومبتورة وغير مدعومة).
// ─────────────────────────────────────────────────────────────────────────────

// newDPIStreamWriter يلف كاتب الملف المؤقت بكاتب يحقن بيانات الكثافة أثناء
// النسخ حسب الامتداد (pHYs لـ PNG / JFIF APP0 لـ JPEG). الامتداد غير المدعوم
// أو dpi ≤ 0 يعيد تمريراً مباشراً بلا حقن (نفس عقد patchImageDPI).
// ⚠️ يجب استدعاء Close بعد اكتمال النسخ لسحب أي بايتات معلقة عند نهاية الدفق
// (ملف مبتور) — القرارات التي تحتاج نهاية الدفق تُتخذ هناك.
func newDPIStreamWriter(w io.Writer, ext string, dpi int) io.WriteCloser {
	if dpi <= 0 {
		return nopDPIStreamWriter{w}
	}
	switch ext {
	case ".png":
		return &pngDPIStreamWriter{w: w, dpi: dpi}
	case ".jpg", ".jpeg":
		return &jpegDPIStreamWriter{w: w, dpi: dpi}
	default:
		return nopDPIStreamWriter{w}
	}
}

// nopDPIStreamWriter تمرير مباشر — نفس بايتات الدخل بلا أي حقن.
type nopDPIStreamWriter struct{ w io.Writer }

func (s nopDPIStreamWriter) Write(p []byte) (int, error) { return s.w.Write(p) }
func (s nopDPIStreamWriter) Close() error                { return nil }

// pngPhysChunk يبني قطعة pHYs (21 بايتاً) بالـ DPI المطلوب — نفس بايتات
// الكتلة التي يبنيها setPNGDPI المخزّني حرفياً.
func pngPhysChunk(dpi int) []byte {
	ppm := pixelsPerMeter(dpi)
	ppmBuf := make([]byte, 4)
	binary.BigEndian.PutUint32(ppmBuf, ppm)

	// الكتلة: الطول(4) + النوع(4) + البيانات(9) + CRC(4)
	chunk := make([]byte, 0, 21)
	chunk = append(chunk, 0, 0, 0, 9) // length = 9
	chunk = append(chunk, "pHYs"...)
	chunk = append(chunk, ppmBuf...) // X
	chunk = append(chunk, ppmBuf...) // Y
	chunk = append(chunk, 1)         // unit = meter
	crcBuf := make([]byte, 4)
	binary.BigEndian.PutUint32(crcBuf, crc32.ChecksumIEEE(chunk[4:]))
	chunk = append(chunk, crcBuf...)
	return chunk
}

// pngDPIStreamWriter كاتب متدفق يمسح رأس PNG قطعة-قطعة أثناء مرورها ويزرع pHYs
// قبل أول IDAT إن لم توجد pHYs سابقة. الذاكرة محدودة بسقف فحص الرأس (MaxFileSize
// — نفس سقف جسم الطلب) بدل حجم الملف كامل.
//
// مطابقة setPNGDPI بيت-بيت لكل الدخل المقبول (≤ MaxFileSize):
//   - توقيع غير مطابق، أو pHYs موجودة قبل IDAT، أو قطعة مبتورة/طولها فاسد قبل
//     IDAT، أو لا يوجد IDAT إطلاقاً ⇒ مخرج = الدخل حرفياً (الحقن لا يحدث).
//   - أول IDAT (قبل فحص سلامة طولها كما في الأصل) ⇒ إدراج pHYs عندها ثم تمرير.
type pngDPIStreamWriter struct {
	w    io.Writer
	dpi  int
	buf  []byte // بايتات معلقة أثناء فحص الرأس (سقفها MaxFileSize)
	done bool   // اتُّخذ القرار — تمرير مباشر لما بعده
}

func (s *pngDPIStreamWriter) Write(p []byte) (int, error) {
	if s.done {
		return s.w.Write(p)
	}
	s.buf = append(s.buf, p...)
	if err := s.scan(); err != nil {
		return 0, err
	}
	return len(p), nil
}

// scan يعالج buf: إما يُقرر (إدراج/تمرير) فيفرغه ويحوّل done، أو ينتظر المزيد.
func (s *pngDPIStreamWriter) scan() error {
	pos := 0
	if len(s.buf) >= len(PNGSignature) {
		if !bytes.Equal(s.buf[:len(PNGSignature)], PNGSignature) {
			return s.flushAll()
		}
	} else {
		return nil // انتظر التوقيع كاملاً
	}
	pos = len(PNGSignature)
	for len(s.buf)-pos >= 8 {
		length := binary.BigEndian.Uint32(s.buf[pos : pos+4])
		chunkType := s.buf[pos+4 : pos+8]
		if string(chunkType) == "pHYs" {
			return s.flushAll() // موجودة مسبقاً — لا تُمسّ (نفس الأصل)
		}
		if string(chunkType) == "IDAT" {
			// نقطة الإدراج: قبل ترويسة IDAT — قبل فحص سلامة طولها كما يفعل الأصل.
			if _, err := s.w.Write(s.buf[:pos]); err != nil {
				return err
			}
			if _, err := s.w.Write(pngPhysChunk(s.dpi)); err != nil {
				return err
			}
			rest := s.buf[pos:]
			s.done = true
			s.buf = nil
			_, err := s.w.Write(rest)
			return err
		}
		// قطعة طويلة بلا معنى قبل IDAT: الجسم محدود بـ MaxFileSize عند المتصل،
		// فأي طول أكبر = تالف ⇒ تمرير بلا حقن (الأصل يعيد الدخل كما هو).
		if length > uint32(service.MaxFileSize) {
			return s.flushAll()
		}
		need := 8 + int(length) + 4 // ترويسة + بيانات + CRC
		if len(s.buf)-pos < need {
			break // انتظر اكتمال القطعة (البتر يعالجه Close)
		}
		pos += need
	}
	return nil
}

func (s *pngDPIStreamWriter) flushAll() error {
	s.done = true
	if len(s.buf) == 0 {
		return nil
	}
	rest := s.buf
	s.buf = nil
	_, err := s.w.Write(rest)
	return err
}

// Close يسحب البايتات المعلقة عند نهاية الدفق: ملف مبتور أو بلا IDAT يعود
// كما هو بلا حقن — مطابق للأصل.
func (s *pngDPIStreamWriter) Close() error {
	if s.done {
		return nil
	}
	return s.flushAll()
}

// jpegDPIStreamWriter كاتب متدفق يعيد كتابة حقلَي الكثافة في مقطع JFIF APP0
// أثناء النسخ. القرار يحتاج المقطع كاملاً (4+segLen بايتات) لأن الأصل يرفض
// المقطع المبتور — التخزين المؤقت محدود بطول المقطع (≤ 65539 بايت).
//
// مطابقة setJPEGDPI بيت-بيت: بلا SOI/APP0، أو بلا توقيع JFIF، أو مقطع مبتور
// عند نهاية الدفق ⇒ الدخل كما هو بلا تعديل.
type jpegDPIStreamWriter struct {
	w    io.Writer
	dpi  int
	buf  []byte
	done bool
}

func (s *jpegDPIStreamWriter) Write(p []byte) (int, error) {
	if s.done {
		return s.w.Write(p)
	}
	s.buf = append(s.buf, p...)
	if err := s.scan(); err != nil {
		return 0, err
	}
	return len(p), nil
}

func (s *jpegDPIStreamWriter) scan() error {
	// SOI + APP0 marker
	if len(s.buf) >= 4 {
		if s.buf[0] != 0xFF || s.buf[1] != 0xD8 || s.buf[2] != 0xFF || s.buf[3] != 0xE0 {
			return s.flushAll() // لا مقطع APP0 بعد SOI — لا إدراج مقطع (نفس الأصل)
		}
	} else {
		return nil
	}
	if len(s.buf) >= 6 {
		segLen := int(binary.BigEndian.Uint16(s.buf[4:6]))
		if segLen < 16 {
			return s.flushAll() // طول مقطع لا يكفي لحقول الكثافة (نفس الأصل)
		}
		if len(s.buf) >= 11 && !bytes.Equal(s.buf[6:11], []byte{'J', 'F', 'I', 'F', 0}) {
			return s.flushAll()
		}
		if len(s.buf) >= 4+segLen {
			// المقطع موجود كاملاً في الملف — أعد كتابة units+densities فقط.
			out := make([]byte, len(s.buf))
			copy(out, s.buf)
			density := []byte{uint8(s.dpi >> 8), uint8(s.dpi)}
			const unitsPos = 13
			out[unitsPos] = 1 // units = pixels per inch
			copy(out[unitsPos+1:unitsPos+3], density)
			copy(out[unitsPos+3:unitsPos+5], density)
			return s.emitRewritten(out)
		}
	}
	return nil
}

func (s *jpegDPIStreamWriter) emitRewritten(head []byte) error {
	s.done = true
	s.buf = nil
	if _, err := s.w.Write(head); err != nil {
		return err
	}
	return nil
}

func (s *jpegDPIStreamWriter) flushAll() error {
	s.done = true
	if len(s.buf) == 0 {
		return nil
	}
	rest := s.buf
	s.buf = nil
	_, err := s.w.Write(rest)
	return err
}

// Close يسحب المقطع المبتور كما هو عند نهاية الدفق — الأصل يرفض الحقن حينها.
func (s *jpegDPIStreamWriter) Close() error {
	if s.done {
		return nil
	}
	return s.flushAll()
}
