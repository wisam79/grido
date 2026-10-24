package service

import (
	"bytes"
	"encoding/binary"
	"image"
)

// قارئ توسيم EXIF Orientation (D-3): تنفيذ APP1 داخلي أصغر بلا اعتماد خارجي —
// go.sum يبقى بلا goexif لحاجة عمود واحد. التوازي التعاقدي: ناتج التطبيع يطابق
// سلوك createImageBitmap({imageOrientation:'from-image'}) في الواجهة
// (frontend/src/workers/scanner-warp.worker.ts:62).

// ReadJPEGExifOrientation يقرأ وسم Orientation (0x0112) من APP1 في JPEG.
// يعيد 1 (طبيعي) إذا لم يوجد EXIF أو كان التوسيم خارج [1..8].
func ReadJPEGExifOrientation(data []byte) int {
	if len(data) < 4 || data[0] != 0xFF || data[1] != 0xD8 {
		return 1
	}
	offset := 2
	for offset+4 <= len(data) {
		if data[offset] != 0xFF {
			return 1
		}
		marker := data[offset+1]
		if marker == 0xDA || marker == 0xD9 { // بداية بيانات الصورة / النهاية — لا EXIF بعدها
			return 1
		}
		segmentSize := int(binary.BigEndian.Uint16(data[offset+2 : offset+4]))
		if segmentSize < 2 || offset+2+segmentSize > len(data) {
			return 1
		}
		if marker == 0xE1 && bytes.Equal(data[offset+4:offset+10], []byte("Exif\x00\x00")) {
			return parseTiffIFD0Orientation(data[offset+10 : offset+2+segmentSize])
		}
		offset += 2 + segmentSize
	}
	return 1
}

// parseTiffIFD0Orientation يفك رأس TIFF ثم يمر على مدخلات IFD0 باحثاً عن 0x0112.
func parseTiffIFD0Orientation(tiff []byte) int {
	if len(tiff) < 8 {
		return 1
	}
	var bo binary.ByteOrder
	switch {
	case bytes.Equal(tiff[0:2], []byte("II")):
		bo = binary.LittleEndian
	case bytes.Equal(tiff[0:2], []byte("MM")):
		bo = binary.BigEndian
	default:
		return 1
	}
	if bo.Uint16(tiff[2:4]) != 42 {
		return 1
	}
	ifdOffset := int(bo.Uint32(tiff[4:8]))
	if ifdOffset+2 > len(tiff) {
		return 1
	}
	count := int(bo.Uint16(tiff[ifdOffset : ifdOffset+2]))
	for i := 0; i < count; i++ {
		entry := ifdOffset + 2 + i*12
		if entry+12 > len(tiff) {
			return 1
		}
		if bo.Uint16(tiff[entry:entry+2]) == 0x0112 {
			orientation := int(bo.Uint16(tiff[entry+8 : entry+10]))
			if orientation >= 1 && orientation <= 8 {
				return orientation
			}
			return 1
		}
	}
	return 1
}

// ApplyExifOrientation يطبّق تحويل العرض الصحيح على البكسلات الخام وفق التوسيم 1-8
// (نفس دلالات مواصفة EXIF التي يطبّقها المتصفح عند from-image). التوسيمات 5-8
// تُبدّل الأبعاد.
func ApplyExifOrientation(src *image.NRGBA, orientation int) *image.NRGBA {
	if orientation < 1 || orientation > 8 || orientation == 1 {
		return src
	}
	w, h := src.Bounds().Dx(), src.Bounds().Dy()
	swapDims := orientation >= 5
	dw, dh := w, h
	if swapDims {
		dw, dh = h, w
	}
	dst := image.NewNRGBA(image.Rect(0, 0, dw, dh))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			sx, sy := exifMapPixel(x, y, w, h, orientation)
			di := (sy*dw + sx) * 4
			si := (y*w + x) * 4
			dst.Pix[di] = src.Pix[si]
			dst.Pix[di+1] = src.Pix[si+1]
			dst.Pix[di+2] = src.Pix[si+2]
			dst.Pix[di+3] = src.Pix[si+3]
		}
	}
	return dst
}

// exifMapPixel يحوّل بكسل المصدر (x,y) إلى موقع الوجهة وفق التوسيع:
// 2 انعكاس أفقي · 3 تدوير 180° · 4 انعكاس رأسي · 5 تبديل قطري (transpose)
// 6 تدوير 90° مع عقارب الساعة · 7 انعكاس القطري المعاكس (transverse) · 8 تدوير 270°.
func exifMapPixel(x, y, w, h, orientation int) (int, int) {
	switch orientation {
	case 2:
		return w - 1 - x, y
	case 3:
		return w - 1 - x, h - 1 - y
	case 4:
		return x, h - 1 - y
	case 5:
		return y, x
	case 6:
		return h - 1 - y, x
	case 7:
		return h - 1 - y, w - 1 - x
	case 8:
		return y, w - 1 - x
	default:
		return x, y
	}
}
