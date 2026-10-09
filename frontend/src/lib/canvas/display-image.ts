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
 *
 * الأداء (M16): بناء نسخة العرض كان يجري تزامنياً داخل `useMemo` أثناء طور
 * الرسم (ctx.drawImage على مصدر 5000px = فكّ ترميز كامل + تصغير) فيحجب الرسم
 * عند أوّل تركيب لكل صورة كبيرة. هنا يُفصل العمل الثقال:
 * - `getDisplayImage` يبقى المسار التزامني السريع (إصابة الكاش فورية، وفي حالة
 *   الغياب يبني تزامنياً كاحتياطي — يحفظ رياضيات القصّ في الكولاج وWYSIWYG).
 * - `ensureDisplayProxy` يبني النسخة خارج مسار الرسم (عبر `createImageBitmap`
 *   الذي يفكّ الترميز ويصغّر على خيط منفصل) ويسخّن الكاش مسبقاً، فيصبح أوّل
 *   وصول لاحق لعقد الصورة إصابةً فورية بلا حجب. يُستدعى من دورة تحميل الصورة.
 *
 * ملاحظة توافق: لا نستخدم عنوان كائن (blob URL) ولا HTMLImageElement ثانٍ،
 * لأن مُستهلكي العقدة (image-node/collage-image) واختبار القصّ يعتمدون على كائن
 * Canvas تزامني بأبعاد مخفّضة صحيحة؛ صياغة ثانية كانت ستكسر القصّ وتُدخل تعارضاً.
 */

const MAX_DISPLAY_DIM = 2048;
const CACHE_LIMIT = 24;

const displayCache = new Map<HTMLImageElement, HTMLCanvasElement>();
// بناء غير متزامن جارٍ لكل مصدر — منع تكرار العمل المزدوج لو طُلبت النسخة
// من عدة عقد تشترك في نفس الصورة في اللحظة ذاتها.
const pendingProxy = new Map<HTMLImageElement, Promise<HTMLCanvasElement | null>>();

function touchCacheOrder(image: HTMLImageElement, canvas: HTMLCanvasElement): void {
  displayCache.delete(image);
  displayCache.set(image, canvas);
  while (displayCache.size > CACHE_LIMIT) {
    const oldest = displayCache.keys().next();
    if (oldest.done) break;
    // إسقاط الإدخال فقط: جامع القمامة يحرر البيت ماب عند زوال آخر مرجع حي
    // (نفس فلسفة image-cache.ts) — لا مصدر مشترك يمكن تصفيره هنا.
    displayCache.delete(oldest.value);
    pendingProxy.delete(oldest.value);
  }
}

function naturalSizeOf(image: HTMLImageElement): { w: number; h: number } {
  const w = image.naturalWidth || image.width || 0;
  const h = image.naturalHeight || image.height || 0;
  return { w, h };
}

function exceedsCap(image: HTMLImageElement): boolean {
  const { w, h } = naturalSizeOf(image);
  return w > 0 && h > 0 && Math.max(w, h) > MAX_DISPLAY_DIM;
}

/** بناء النسخة المخفّضة تزامنياً عبر ctx.drawImage (الاحتياطي/المسار السريع). */
function drawSyncProxy(image: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const { w, h } = naturalSizeOf(image);
  const scale = MAX_DISPLAY_DIM / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
  return canvas;
}

/**
 * يعيد نسخة عرض مخفّضة (HTMLCanvasElement) للصور التي تتجاوز السقف،
 * أو الصورة الأصلية نفسها إن كانت ضمن الحد — متزامن ومحمول على useMemo.
 */
export function getDisplayImage(
  image: HTMLImageElement | null | undefined,
): HTMLImageElement | HTMLCanvasElement | null {
  if (!image) return null;
  const { w, h } = naturalSizeOf(image);
  if (w <= 0 || h <= 0 || Math.max(w, h) <= MAX_DISPLAY_DIM) return image;

  const hit = displayCache.get(image);
  if (hit) {
    touchCacheOrder(image, hit);
    return hit;
  }

  const canvas = drawSyncProxy(image);
  if (!canvas) return image;
  touchCacheOrder(image, canvas);
  return canvas;
}

/**
 * بناء النسخة المخفّضة خارج خيط الرسم: يفكّ الترميز ويصغّر عبر createImageBitmap
 * ثم يبلت الناتج على Canvas واحد (الأبعاد نهائية سابقاً فتكون البلتة رخيصة).
 * يسقط إلى المسار التزامني حين لا تتوفّر الواجهة أو تفشل (jsdom/الاختبارات).
 */
async function buildProxyAsync(image: HTMLImageElement): Promise<HTMLCanvasElement | null> {
  const { w, h } = naturalSizeOf(image);
  const scale = MAX_DISPLAY_DIM / Math.max(w, h);
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));

  if (typeof document === 'undefined') return null;

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(image, {
        resizeWidth: dw,
        resizeHeight: dh,
        resizeQuality: 'high',
      });
      const canvas = document.createElement('canvas');
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close?.();
        return null;
      }
      ctx.drawImage(bitmap, 0, 0, dw, dh);
      bitmap.close?.();
      return canvas;
    } catch {
      // يسقط أدناه إلى المسار التزامني
    }
  }

  const fallback = document.createElement('canvas');
  fallback.width = dw;
  fallback.height = dh;
  const fctx = fallback.getContext('2d');
  if (!fctx) return null;
  try {
    fctx.drawImage(image, 0, 0, dw, dh);
  } catch {
    return null;
  }
  return fallback;
}

/**
 * تسخين مسبق لنسخة العرض خارج طور الرسم. أمِن ضد الاستدعاء المزدوج (dedupe)
 * ولا يرفع أبداً: تُستدعى من دورة تحميل الصورة كي يصبح أوّل وصول لاحق لعقدة
 * الصورة إصابةً فورية في الكاش بلا حجب طور الرسم. الصور ضمن السقف لا شيء تفعله.
 */
export async function ensureDisplayProxy(
  image: HTMLImageElement | null | undefined,
): Promise<void> {
  if (!image || !exceedsCap(image)) return;

  const hit = displayCache.get(image);
  if (hit) {
    touchCacheOrder(image, hit);
    return;
  }

  const pending = pendingProxy.get(image);
  if (pending) {
    await pending;
    return;
  }

  const job = buildProxyAsync(image).then((canvas) => {
    if (canvas) touchCacheOrder(image, canvas);
    return canvas;
  });
  pendingProxy.set(image, job);
  try {
    await job;
  } finally {
    pendingProxy.delete(image);
  }
}
