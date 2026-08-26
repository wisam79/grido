import exifr from "exifr";

export interface ImageExifOrientation {
  orientation: number; // 1..8
  rotationDeg: number; // 0, 90, 180, 270
  flipHorizontal: boolean;
  isQuarterRotated: boolean; // true if 90 or 270 deg (swaps width and height)
}

/**
 * قراءة وسم EXIF Orientation بسرعة فائقة (~1ms) من ملف أو كائن ثنائي أو مسار Base64
 * وتحديد زاوية التدوير اللازمة ومطابقتها.
 */
export async function getExifOrientation(
  input: File | Blob | string | ArrayBuffer
): Promise<ImageExifOrientation> {
  try {
    const orientation = await exifr.orientation(input as any);
    const tag = typeof orientation === "number" ? orientation : 1;

    let rotationDeg = 0;
    let flipHorizontal = false;
    let isQuarterRotated = false;

    switch (tag) {
      case 1: // Normal
        rotationDeg = 0;
        break;
      case 2: // Flip horizontal
        rotationDeg = 0;
        flipHorizontal = true;
        break;
      case 3: // Rotate 180
        rotationDeg = 180;
        break;
      case 4: // Flip vertical (or 180 + flip H)
        rotationDeg = 180;
        flipHorizontal = true;
        break;
      case 5: // Rotate 90 CW + flip
        rotationDeg = 90;
        flipHorizontal = true;
        isQuarterRotated = true;
        break;
      case 6: // Rotate 90 CW (Standard for vertical smartphone/camera shots)
        rotationDeg = 90;
        isQuarterRotated = true;
        break;
      case 7: // Rotate 270 CW + flip
        rotationDeg = 270;
        flipHorizontal = true;
        isQuarterRotated = true;
        break;
      case 8: // Rotate 270 CW (90 CCW)
        rotationDeg = 270;
        isQuarterRotated = true;
        break;
      default:
        rotationDeg = 0;
    }

    return {
      orientation: tag,
      rotationDeg,
      flipHorizontal,
      isQuarterRotated,
    };
  } catch (err) {
    // في حال عدم وجود بيانات EXIF أو فشل القراءة، نعتبرها صورة عادية
    return {
      orientation: 1,
      rotationDeg: 0,
      flipHorizontal: false,
      isQuarterRotated: false,
    };
  }
}

/**
 * تطبيع أبعاد الصورة المحسوبة مع مراعاة وسم EXIF:
 * إذا كانت الصورة مدورة 90 أو 270 درجة (مثل صور الكاميرات الرأسية)،
 * يتم عكس نسبة الأبعاد (aspect ratio) لضمان مطابقة الكانفاس والـ Store للواقع.
 */
export async function getTrueImageAspect(
  src: File | Blob | string,
  rawWidth: number,
  rawHeight: number
): Promise<{ width: number; height: number; aspectRatio: number; rotationDeg: number }> {
  if (rawWidth <= 0 || rawHeight <= 0) {
    return { width: 1, height: 1, aspectRatio: 1, rotationDeg: 0 };
  }

  const { rotationDeg, isQuarterRotated } = await getExifOrientation(src);

  if (isQuarterRotated) {
    return {
      width: rawHeight,
      height: rawWidth,
      aspectRatio: rawHeight / rawWidth,
      rotationDeg,
    };
  }

  return {
    width: rawWidth,
    height: rawHeight,
    aspectRatio: rawWidth / rawHeight,
    rotationDeg,
  };
}
