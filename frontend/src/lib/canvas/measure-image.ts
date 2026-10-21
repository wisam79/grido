import {
  getCachedImageAspectRatio,
  setCachedImageAspectRatio,
  resolveImageAspectRatio,
} from './image-dimensions';
import { getExifOrientation } from '../io/exif-utils';

/**
 * قياس نسبة أبعاد الصورة مع عقد NaN عند الفشل.
 * وحدة ورقية (leaf): لا تستورد الـ store إطلاقاً — تُستخدم داخل
 * collage-slice حيث أي استيراد لسلسلة الـ store يسبب دورة استيراد
 * (createCollageSlice is not a function في الاختبارات).
 *
 * تستفيد من كاش الذاكرة O(1) ومن مسار Go السريع للصور المحلية (/local-image/)
 * قبل اللجوء لإنشاء Image في DOM وقراءة EXIF.
 */
export async function measureImageAspect(src: string): Promise<number> {
  if (!src) {
    return NaN;
  }

  // 1. فحص كاش الذاكرة الفوري
  const cached = getCachedImageAspectRatio(src);
  if (cached !== undefined) {
    return cached;
  }

  // 2. مسار Go السريع للصور المحلية (قراءة الترويسة الثنائية بلا DOM وبلا exifr)
  if (src.startsWith('/local-image/')) {
    try {
      const aspect = await resolveImageAspectRatio(src);
      if (Number.isFinite(aspect) && aspect > 0) {
        setCachedImageAspectRatio(src, aspect);
        return aspect;
      }
    } catch {
      // السقوط للمسار القياسي أدناه
    }
  }

  // 3. المسار الاحتياطي للصور الخارجية والمشتقة
  return new Promise((resolve) => {
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
      if (Number.isFinite(value) && value > 0) {
        setCachedImageAspectRatio(src, value);
      }
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
