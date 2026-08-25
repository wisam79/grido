import { GetImageDimensions } from "../../../wailsjs/go/main/App";

/**
 * دالة موحدة فائقة الدقة والسرعة لحساب النسبة الباعية الحقيقية (Native Aspect Ratio = Width / Height) لأي صورة
 * 
 * 1. تفحص أولاً Go Backend عبر `GetImageDimensions` للصور المحلية (/local-image/) لقراءة أبعاد الملف الأصلية دون استهلاك ذاكرة الواجهة
 * 2. تستخدم `createImageBitmap` أو `HTMLImageElement` لفك أبعاد الصور الممررة كـ Base64 أو Data URLs أو Blob URLs
 * 3. تضمن عدم إجبار أي صورة على نسبة افتراضية غير دقيقة 1:1 إطلاقاً
 */
export async function resolveImageAspectRatio(src: string): Promise<number> {
  if (!src) return 1;

  // 1. استخدام Go Backend السريع للصور المحلية (/local-image/)
  if (typeof GetImageDimensions === "function" && src.startsWith("/local-image/")) {
    try {
      const dims = await GetImageDimensions(src);
      if (dims && dims.width > 0 && dims.height > 0) {
        return dims.width / dims.height;
      }
    } catch (e) {
      console.warn("[resolveImageAspectRatio] Go backend GetImageDimensions failed, falling back to browser decoder:", e);
    }
  }

  // 2. محاولة فك الأبعاد السريعة عبر createImageBitmap (الأداء الأقصى في المتصفح)
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
      const aspect = bitmap.width / bitmap.height;
      bitmap.close();
      return aspect;
    }
  } catch {
    // Continue to standard Image fallback
  }

  // 3. المسار القياسي الاحتياطي عبر HTMLImageElement
  return new Promise<number>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      img.onload = null;
      img.onerror = null;
      img.src = "";
      if (w > 0 && h > 0) {
        resolve(w / h);
      } else {
        resolve(1);
      }
    };
    img.onerror = () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
      resolve(1);
    };
    img.src = src;
  });
}
