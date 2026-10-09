/**
 * print-pixel-preview.ts — معاينة حقيقية لمرشّحات البكسل في نافذة الطباعة.
 *
 * المشكلة (RV-16-L7): خانات الكولاج ذات مرشّح pixelate/threshold كانت تُعاين
 * بتقريب CSS (blur(3px) / grayscale+contrast(200%)) بينما المحرر (Konva) والمطبوع
 * (Go) يطبّقان الخوارزمية الحقيقية — فترى المعاينة ضباباً وتطبع مكعبات.
 *
 * الحل: نفس خوارزميات المصدر الواحد (lib/filters/pixel-filters.ts — مطابقة حرفياً
 * لـ Go) تُطبَّق على كانفاس مصغّر بنسبة أبعاد الخانة وأبعاد طباعة مخفّضة (سقف 480px
 * وحجم كتلة pixelate متناسب مع نسبة التصغير فتظهر المكعبات بمقياس المطبوع)، ثم
 * تُستخدم النتيجة كصورة الخانة بدل تقريب CSS. تعديلات الألوان (سطوع/تباين/تشبع)
 * تُخبز مسبقاً بـ ctx.filter قبل مرشّح البكسل — نفس ترتيب Go (تعديلات ثم مرشّح).
 *
 * الفشل دائماً هادئ: يعيد url فارغاً وتبقى الخانة على تقريب CSS القديم.
 */

import {
  applyLuminanceThreshold,
  applyNearestPixelate,
  isPixelFilter,
  PIXELATE_BLOCK_PX,
} from '@/lib/filters/pixel-filters';
import { buildAdjustmentCSS, type FilterableObject } from '@/lib/utils';

/** سقف الضلع الأطول لكانفاس المعاينة — يكفي حدة الشاشة ويحفظ الذاكرة. */
const MAX_PREVIEW_PX = 480;

/** أساس حساب أبعاد الطباعة للنسبة — نفس DPI الافتراضي للطباعة. */
const PREVIEW_DPI = 300;

export interface PixelPreviewResult {
  url: string;
  naturalW: number;
  naturalH: number;
}

/** كاش النتائج (مفتاحه يشمل كل مدخلات المعالجة) + منع التكرار الجاري. */
const resultCache = new Map<string, PixelPreviewResult>();
const inflight = new Map<string, Promise<PixelPreviewResult>>();
/** أبعاد المصدر الأصلية لكل src — لتغذية منطق السحب (dragX/dragY) في المعاينة. */
const naturalDims = new Map<string, { w: number; h: number }>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load image for pixel preview'));
    img.src = src;
  });
}

/** هل يجب أن تُعاين هذه الخانة عبر مسار البكسل الحقيقي؟ */
export function isPrintPixelFilter(filter: string | undefined): boolean {
  return isPixelFilter(filter);
}

/** أبعاد المصدر الأصلية إن كانت محفوظة من آخر معاينة لنفس src. */
export function getPixelPreviewNaturalSize(src: string): { w: number; h: number } | undefined {
  return naturalDims.get(src);
}

/**
 * يعيد صورة معاينة لخانة بمرشّح بكسل حقيقي (data URL) مع أبعاد المصدر الأصلية.
 * يعيد url فارغاً عند أي فشل (رسم غير متاح في jsdom، فك ترميز، …) — المستهلك
 * يبقى حينها على تقريب CSS.
 */
export function renderPixelFilterPreview(
  src: string,
  filter: string,
  el: FilterableObject | undefined,
  slotRectMM: { wMM: number; hMM: number },
): Promise<PixelPreviewResult> {
  if (!isPixelFilter(filter)) {
    return Promise.resolve({ url: '', naturalW: 0, naturalH: 0 });
  }

  // أبعاد الطباعة الكاملة للخانة مخفّضة إلى سقف المعاينة — كتلة pixelate تُقاس
  // بنسبة التصغير نفسها فتبقى المكعبات بمقياس المطبوع لا بمقياس المصدر.
  const printW = Math.max(1, Math.round((slotRectMM.wMM / 25.4) * PREVIEW_DPI));
  const printH = Math.max(1, Math.round((slotRectMM.hMM / 25.4) * PREVIEW_DPI));
  const shrink = Math.min(1, MAX_PREVIEW_PX / Math.max(printW, printH));
  const targetW = Math.max(4, Math.round(printW * shrink));
  const targetH = Math.max(4, Math.round(printH * shrink));
  const blockPx = Math.max(1, Math.round(PIXELATE_BLOCK_PX * shrink));

  const adjustments = buildAdjustmentCSS(el);
  const key = `${src}|${filter}|${adjustments}|${targetW}x${targetH}|${blockPx}`;

  const cached = resultCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async (): Promise<PixelPreviewResult> => {
    const img = await loadImage(src);
    naturalDims.set(src, { w: img.naturalWidth, h: img.naturalHeight });

    if (typeof document === 'undefined') throw new Error('no document for pixel preview');
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context for pixel preview');

    // تعديلات الألوان أولاً (نفس ترتيب Go: applyColorAdjustments قبل applyFilter)
    ctx.filter = adjustments === 'none' ? 'none' : adjustments;
    // اقتصاص تغطية (object-cover) — نفس هندسة الخانة في المحرر
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const coverScale = Math.max(targetW / nw, targetH / nh);
    const sw = targetW / coverScale;
    const sh = targetH / coverScale;
    ctx.drawImage(img, (nw - sw) / 2, (nh - sh) / 2, sw, sh, 0, 0, targetW, targetH);
    ctx.filter = 'none';

    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    if (filter === 'pixelate') {
      applyNearestPixelate(imageData.data, targetW, targetH, blockPx);
    } else {
      applyLuminanceThreshold(imageData.data);
    }
    ctx.putImageData(imageData, 0, 0);

    const result: PixelPreviewResult = {
      url: canvas.toDataURL('image/png'),
      naturalW: nw,
      naturalH: nh,
    };
    if (resultCache.size > 32) {
      const oldest = resultCache.keys().next();
      if (!oldest.done) resultCache.delete(oldest.value);
    }
    resultCache.set(key, result);
    return result;
  })()
    .catch(() => ({ url: '', naturalW: 0, naturalH: 0 }) as PixelPreviewResult)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, job);
  return job;
}
