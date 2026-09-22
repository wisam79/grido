import { getExifOrientation } from "../io/exif-utils";

/**
 * قياس نسبة أبعاد الصورة مع عقد NaN عند الفشل.
 * وحدة ورقية (leaf): لا تستورد الـ store إطلاقاً — تُستخدم داخل
 * collage-slice حيث أي استيراد لسلسلة الـ store يسبب دورة استيراد
 * (createCollageSlice is not a function في الاختبارات).
 *
 * تُستخدم لمقارنة نسب الاستبدال قبل تصفير إزاحات القص — الفشل يُتجاهل
 * بصمت عبر Number.isFinite بدل التصفير الخاطئ. تتضمن تصحيح EXIF للصور
 * الرأسية (كانت تُحسب مقلوبة فتُصفّر القص خطأً).
 */
export function measureImageAspect(src: string): Promise<number> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(NaN);
      return;
    }
    const img = new Image();
    // ⏱️ مهلة: صورة تتعطّل كانت تُبقي الوعيد معلّقاً للأبد
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(NaN);
    }, 10_000);
    const settle = (value: number) => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(value);
    };
    img.onload = async () => {
      const w = img.width;
      const h = img.height;
      if (!(w > 0 && h > 0)) {
        settle(NaN);
        return;
      }
      try {
        const exif = await getExifOrientation(src);
        settle(exif.isQuarterRotated ? h / w : w / h);
      } catch {
        settle(w / h);
      }
    };
    img.onerror = () => settle(NaN);
    img.src = src;
  });
}
