import { useState, useEffect, useMemo } from 'react';
import { getDisplayImage, ensureDisplayProxy, hasDisplayProxy } from '@/lib/canvas/display-image';

/**
 * useDisplayImage — نسخة عرض تفاعلية غير محجوبة (M16-final)
 *
 * المشكلة التي تحلّها: getDisplayImage السابق كان يبني النسخة المخفّضة تزامنياً
 * داخل useMemo أثناء طور الرسم (ctx.drawImage على 5000px → 80-200ms حجب).
 * النسخة الجديدة غير محجوبة في المتصفح الحقيقي: تعيد الأصل فوراً وتُطلق
 * البناء خارج خيط الرسم عبر createImageBitmap، ثم تعيد الرسم عند اكتمالها.
 *
 * هذا الـ hook هو الجسر التفاعلي:
 * - يحسب getDisplayImage تزامنياً (إصابة فورية أو أصل مؤقت)
 * - إن كانت الصورة كبيرة وبلا كاش، يُطلق ensureDisplayProxy ويرفع version
 *   عند الاكتمال فيُعاد حساب getDisplayImage ليصيب الكاش بلا حجب ثانٍ
 * - في jsdom/الاختبارات (لا createImageBitmap) يبقى المسار تزامنياً فوراً —
 *   لا وميض ولا دورة إضافية، واختبارات القصّ تبقى محددة.
 */
export function useDisplayImage(
  image: HTMLImageElement | null | undefined,
): HTMLImageElement | HTMLCanvasElement | null {
  const [tick, setTick] = useState(0);

  // tick يُجبر إعادة الحساب عند اكتمال بناء النسخة المخفّضة في الخلفية
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const display = useMemo(() => getDisplayImage(image), [image, tick]);

  useEffect(() => {
    if (!image) return;
    // إن أصابت الكاش أو كانت ضمن السقف، لا عمل إضافي
    if (hasDisplayProxy(image)) return;
    const w = image.naturalWidth || image.width || 0;
    const h = image.naturalHeight || image.height || 0;
    if (w <= 0 || h <= 0 || Math.max(w, h) <= 2048) return;
    // لا createImageBitmap في jsdom → البناء تزامني أصلاً داخل getDisplayImage
    if (typeof createImageBitmap !== 'function') return;

    let cancelled = false;
    void ensureDisplayProxy(image).then(() => {
      if (!cancelled) setTick((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [image]);

  return display;
}
