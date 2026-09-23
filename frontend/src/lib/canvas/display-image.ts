/**
 * نسخة العرض المخفّضة للكانفاس (Display-Resolution Image Proxy).
 *
 * المشكلة: صور الاستيراد الكبيرة (5000px+) كانت تُرفع للـ GPU وتُعاد
 * تصفيتها ورسمها بأبعادها الكاملة في كل إطار سحب — عشرات الميجابكسلات
 * لكل عقدة. هذه الوحدة تولّد نسخة Canvas بسقف أبعاد للعرض فقط.
 *
 * الضمانات:
 * - التصدير والذكاء الاصطناعي والطباعة تبقى على المصدر الكامل دائماً —
 *   هذه النسخة تُمرَّر فقط لخاصية `image` في عقد Konva أثناء التحرير.
 * - التخزين غير قابل للتغيير (immutable store): تغيّر `imageSrc` يعني مفتاحاً
 *   جديداً، فلا توجد نسخة قديمة (stale) أبداً.
 * - كاش LRU بسقف 24 عنصراً لمنع نمو الذاكرة مع كثرة الصور.
 * - آمن لبيئة الاختبارات (jsdom بلا 2D context يعيد الصورة الأصلية).
 */

const MAX_DISPLAY_DIM = 2048;
const CACHE_LIMIT = 24;

const displayCache = new Map<HTMLImageElement, HTMLCanvasElement>();

function touchCacheOrder(image: HTMLImageElement, canvas: HTMLCanvasElement): void {
  displayCache.delete(image);
  displayCache.set(image, canvas);
  while (displayCache.size > CACHE_LIMIT) {
    const oldest = displayCache.keys().next();
    if (oldest.done) break;
    displayCache.delete(oldest.value);
  }
}

/**
 * يعيد نسخة عرض مخفّضة (HTMLCanvasElement) للصور التي تتجاوز السقف،
 * أو الصورة الأصلية نفسها إن كانت ضمن الحد — متزامن ومحمول على useMemo.
 */
export function getDisplayImage(
  image: HTMLImageElement | null | undefined
): HTMLImageElement | HTMLCanvasElement | null {
  if (!image) return null;
  const w = image.naturalWidth || image.width || 0;
  const h = image.naturalHeight || image.height || 0;
  if (w <= 0 || h <= 0 || Math.max(w, h) <= MAX_DISPLAY_DIM) return image;

  const hit = displayCache.get(image);
  if (hit) {
    touchCacheOrder(image, hit);
    return hit;
  }

  if (typeof document === "undefined") return image;
  const canvas = document.createElement("canvas");
  const scale = MAX_DISPLAY_DIM / Math.max(w, h);
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return image;
  try {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  } catch {
    return image;
  }
  touchCacheOrder(image, canvas);
  return canvas;
}
