package service

import (
	"encoding/binary"
	"fmt"
	"sort"
)

// ─────────────────────────────────────────────────────────────────────────────
// print_tiff_tags.go — حقن وسوم الدقة الفيزيائية في TIFF
//
// المشكلة: لا مكتبة Go (stdlib ولا golang.org/x/image) تدعم كتابة
// XResolution/YResolution/ResolutionUnit عند الترميز، فيخرج TIFF المطابع بلا
// تعريف دقة فتفترض البرمجيات 72dpi ويُطبع المقاس خطأً.
//
// الحل (المعتمد صناعياً — نفس ما تفعله tifffile/exiftool عند التصحيح):
// إعادة كتابة IFD0 فقط بعد الترميز: حذف أي وسوم دقة قديمة، إضافة
// XResolution=282 وYResolution=283 كنسبتين (dpi/1) وResolutionUnit=296 بقيمة
// 2 (بوصة)، مع إزاحة كل إزاحات البيانات اللاحقة بدلتا نمو الـ IFD.
// عام: يعمل مع II وMM، ومع أي عدد إدخالات، ويحافظ على كل الوسوم الأخرى.
//
// المرجع: TIFF 6.0 § tags 282/283/296 — RATIONAL = زوج uint32 (بسط/مقام).
// ─────────────────────────────────────────────────────────────────────────────

const (
	tiffTagXResolution    = 282
	tiffTagYResolution    = 283
	tiffTagResolutionUnit = 296

	tiffTypeShort    = 3
	tiffTypeRational = 5

	tiffResolutionUnitInch = 2
)

var tiffTypeSizes = map[uint16]uint32{
	1: 1, // BYTE
	2: 1, // ASCII
	3: 2, // SHORT
	4: 4, // LONG
	5: 8, // RATIONAL
}

type tiffEntry struct {
	tag   uint16
	typ   uint16
	count uint32
	value uint32 // القيمة المضمّنة أو إزاحة البيانات الخارجية
}

// injectTIFFResolution يعيد نسخة من tiffData مع وسوم الدقة المحقونة.
// dpi غير موجب يُرفض؛ أي بنية غير صالحة تُرجع خطأً (لا يُكتب ملف ناقص أبداً).
func injectTIFFResolution(tiffData []byte, dpi int) ([]byte, error) {
	if dpi <= 0 || dpi > 9600 {
		return nil, fmt.Errorf("invalid dpi for tiff resolution tags: %d", dpi)
	}
	if len(tiffData) < 8 {
		return nil, fmt.Errorf("tiff data too short: %d bytes", len(tiffData))
	}

	var order binary.ByteOrder
	switch string(tiffData[:2]) {
	case "II":
		order = binary.LittleEndian
	case "MM":
		order = binary.BigEndian
	default:
		return nil, fmt.Errorf("not a tiff file: bad byte order %.2q", tiffData[:2])
	}
	if magic := order.Uint16(tiffData[2:4]); magic != 42 {
		return nil, fmt.Errorf("not a tiff file: bad magic %d", magic)
	}

	ifdOff := order.Uint32(tiffData[4:8])
	if err := checkRange(len(tiffData), ifdOff, 2); err != nil {
		return nil, fmt.Errorf("tiff ifd offset out of range: %w", err)
	}
	oldCount := int(order.Uint16(tiffData[ifdOff : ifdOff+2]))
	oldIFDEnd := uint64(ifdOff) + 2 + uint64(oldCount)*12 + 4
	if err := checkRange(len(tiffData), uint32(oldIFDEnd-4), 4); err != nil {
		return nil, fmt.Errorf("tiff ifd entries out of range: %w", err)
	}

	entries := make([]tiffEntry, 0, oldCount)
	for i := 0; i < oldCount; i++ {
		off := ifdOff + 2 + uint32(i)*12
		entries = append(entries, tiffEntry{
			tag:   order.Uint16(tiffData[off : off+2]),
			typ:   order.Uint16(tiffData[off+2 : off+4]),
			count: order.Uint32(tiffData[off+4 : off+8]),
			value: order.Uint32(tiffData[off+8 : off+12]),
		})
	}
	oldNext := order.Uint32(tiffData[oldIFDEnd-4 : oldIFDEnd])

	// حذف أي وسوم دقة سابقة (قد تكون 72dpi افتراضية من أدوات أخرى).
	kept := entries[:0]
	for _, e := range entries {
		if e.tag == tiffTagXResolution || e.tag == tiffTagYResolution || e.tag == tiffTagResolutionUnit {
			continue
		}
		if _, ok := tiffTypeSizes[e.typ]; !ok {
			return nil, fmt.Errorf("tiff: unsupported field type %d on tag %d", e.typ, e.tag)
		}
		kept = append(kept, e)
	}
	entries = kept

	// النسبتان تُخزنان خارجياً (8 بايت > 4) في ذيل الملف؛ الوحدة SHORT مضمّنة.
	// إزاحات الذيول تُحسب على الطول النهائي قبل الإلحاق.
	newEntries := append([]tiffEntry(nil), entries...)
	// SHORT المضمّنة: القيمة في أول بايتين من حقل القيمة حسب ترتيب البايتات
	// (في BE تُزاح 16بت وإلا قُرئت صفراً).
	unitVal := uint32(tiffResolutionUnitInch)
	if order == binary.BigEndian {
		unitVal <<= 16
	}
	newEntries = append(newEntries,
		tiffEntry{tag: tiffTagXResolution, typ: tiffTypeRational, count: 1},
		tiffEntry{tag: tiffTagYResolution, typ: tiffTypeRational, count: 1},
		tiffEntry{tag: tiffTagResolutionUnit, typ: tiffTypeShort, count: 1, value: unitVal},
	)
	sort.Slice(newEntries, func(i, j int) bool { return newEntries[i].tag < newEntries[j].tag })

	growth := int64(len(newEntries)-oldCount) * 12
	newIFDEnd := int64(oldIFDEnd) + growth

	// إزاحات القيم النسبية في الذيل (بعد كل البيانات الأصلية المزاحة).
	rationalBase := uint64(int64(len(tiffData)) + growth)
	xOff := uint32(rationalBase)
	yOff := uint32(rationalBase + 8)
	if uint64(xOff) != rationalBase || uint64(yOff) != rationalBase+8 {
		return nil, fmt.Errorf("tiff too large for 32-bit offsets")
	}

	out := make([]byte, 0, int64(len(tiffData))+growth+16)
	out = append(out, tiffData[:ifdOff]...)

	var cntBuf [2]byte
	order.PutUint16(cntBuf[:], uint16(len(newEntries)))
	out = append(out, cntBuf[:]...)

	var entBuf [12]byte
	for _, e := range newEntries {
		val := e.value
		if e.typ == tiffTypeRational && e.count == 1 {
			if e.tag == tiffTagXResolution {
				val = xOff
			} else {
				val = yOff
			}
		} else if sz, ok := tiffTypeSizes[e.typ]; ok && uint64(sz)*uint64(e.count) > 4 {
			// قيمة خارجية منقولة: أي إزاحة تشير لما بعد IFD القديم تُزاح بالنمو.
			// (القيم داخل الـ 8 بايت الأولى للرأس قبل IFD لا توجد في مخرجات
			// مشفّرنا، والقاعدة العامة تحميها: تُترك كما هي.)
			if uint64(val) >= oldIFDEnd {
				val += uint32(growth)
			}
		}
		order.PutUint16(entBuf[0:2], e.tag)
		order.PutUint16(entBuf[2:4], e.typ)
		order.PutUint32(entBuf[4:8], e.count)
		order.PutUint32(entBuf[8:12], val)
		out = append(out, entBuf[:]...)
	}

	var nextBuf [4]byte
	next := oldNext
	if next != 0 {
		next += uint32(growth)
	}
	order.PutUint32(nextBuf[:], next)
	out = append(out, nextBuf[:]...)

	// sanity: طول ما كُتب حتى الآن يجب أن يساوي نهاية IFD الجديدة.
	if int64(len(out)) != newIFDEnd {
		return nil, fmt.Errorf("tiff ifd rebuild length mismatch: %d != %d", len(out), newIFDEnd)
	}
	out = append(out, tiffData[oldIFDEnd:]...)

	// ذيل النسب: (dpi/1) لكل من X وY.
	var ratBuf [16]byte
	order.PutUint32(ratBuf[0:4], uint32(dpi))
	order.PutUint32(ratBuf[4:8], 1)
	order.PutUint32(ratBuf[8:12], uint32(dpi))
	order.PutUint32(ratBuf[12:16], 1)
	out = append(out, ratBuf[:]...)

	return out, nil
}

func checkRange(total int, off uint32, need uint32) error {
	if uint64(off)+uint64(need) > uint64(total) {
		return fmt.Errorf("range [%d,%d) exceeds %d", off, uint64(off)+uint64(need), total)
	}
	return nil
}
