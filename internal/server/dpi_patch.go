package server

import (
	"bytes"
	"encoding/binary"
	"hash/crc32"
	"strconv"
	"strings"
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
