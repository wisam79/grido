/**
 * print-pixel-preview.ts — معاينة حقيقية لمرشّحات البكسل في نافذة الطباعة.
 *
 * المشكلة (RV-16-L7): خانات الكولاج ذات مرشّح pixelate/threshold كانت تُعاين
 * بتقريب CSS (blur(3px) / grayscale+contrast(200%)) بينما المحرر (Konva) والمطبوع
 * (Go) يطبّقان الخوارزمية الحقيقية — فترى المعاينة ضباباً وتطبع مكعبات.
 *
 * الحل: نفس خوارزميات المصدر الواحد (lib/filters/pixel-filters.ts — مطابقة حرفياً
 * لـ Go) + نافذة القص الفعلية (`computeSlotCrop` مع zoom/drag/rotation/cropMode)
 * تُطبَّق على كانفاس مصغّر بنسبة أبعاد الخانة المحلية وأبعاد طباعة مخفّضة (سقف
 * 480px وحجم كتلة pixelate متناسب مع نسبة التصغير فتظهر المكعبات بمقياس المطبوع)،
 * ثم تُستخدم النتيجة كصورة الخانة بلا إعادة تطبيق zoom/pan/object-position.
 *
 * الفشل دائماً هادئ: يعيد url فارغاً وتبقى الخانة على تقريب CSS القديم.
 */

import { DEFAULT_DPI } from '@/lib/canvas/units';
import {
  clampSlotZoom,
  computeSlotCrop,
  getSlotLocalSize,
  resolveSlotCropMode,
  type SlotCropMode,
} from '@/lib/export/export-primitives';
import { applyPrintFilterOperation } from '@/lib/filters/custom-filters';
import {
  applyNearestPixelate,
  isPixelFilter,
  PIXELATE_BLOCK_PX,
} from '@/lib/filters/pixel-filters';
import { getOrderedPrintFilterOperations } from '@/lib/filters/print-filter-contract';
import { buildAdjustmentCSS, type FilterableObject } from '@/lib/utils';

/** سقف الضلع الأطول لكانفاس المعاينة — يكفي حدة الشاشة ويحفظ الذاكرة. */
const MAX_PREVIEW_PX = 480;

export interface PixelPreviewSlotInput extends FilterableObject {
  zoom?: number;
  dragX?: number;
  dragY?: number;
  rotation?: number;
  cropMode?: SlotCropMode;
}

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

/** يبني مفتاح كاش موحّداً يشمل كافة مدخلات القص والمرشّح والتعديلات. */
export function buildPixelPreviewCacheKey(
  src: string,
  filter: string,
  el: PixelPreviewSlotInput | undefined,
  targetW: number,
  targetH: number,
  blockPx: number,
): string {
  const adjustments = buildAdjustmentCSS(el);
  const zoom = clampSlotZoom(el?.zoom);
  const dragX = el?.dragX || 0;
  const dragY = el?.dragY || 0;
  const rotation = (((el?.rotation || 0) % 360) + 360) % 360;
  const cropMode = resolveSlotCropMode(el?.cropMode);
  return `${src}|${filter}|${adjustments}|${targetW}x${targetH}|${blockPx}|z=${zoom}|dx=${dragX}|dy=${dragY}|r=${rotation}|cm=${cropMode}`;
}

/**
 * يعيد صورة معاينة لخانة بمرشّح بكسل حقيقي (data URL) مع أبعاد المصدر الأصلية.
 * يعيد url فارغاً عند أي فشل (رسم غير متاح في jsdom، فك ترميز، …) — المستهلك
 * يبقى حينها على تقريب CSS.
 */
export function renderPixelFilterPreview(
  src: string,
  filter: string,
  el: PixelPreviewSlotInput | undefined,
  slotRectMM: { wMM: number; hMM: number; dpi?: number },
): Promise<PixelPreviewResult> {
  if (!isPixelFilter(filter)) {
    return Promise.resolve({ url: '', naturalW: 0, naturalH: 0 });
  }

  // أبعاد الطباعة المحلية للخانة (تبدّل عند 90/270) مخفّضة إلى سقف المعاينة —
  // كتلة pixelate تُقاس بنسبة التصغير نفسها فتبقى المكعبات بمقياس المطبوع.
  const effectiveDpi =
    slotRectMM.dpi && Number.isFinite(slotRectMM.dpi) && slotRectMM.dpi > 0
      ? slotRectMM.dpi
      : DEFAULT_DPI;
  const localSize = getSlotLocalSize(slotRectMM.wMM, slotRectMM.hMM, el?.rotation);
  const printW = Math.max(1, Math.round((localSize.width / 25.4) * effectiveDpi));
  const printH = Math.max(1, Math.round((localSize.height / 25.4) * effectiveDpi));
  const shrink = Math.min(1, MAX_PREVIEW_PX / Math.max(printW, printH));
  const targetW = Math.max(4, Math.round(printW * shrink));
  const targetH = Math.max(4, Math.round(printH * shrink));
  const blockPx = Math.max(1, Math.round(PIXELATE_BLOCK_PX * shrink));

  const key = buildPixelPreviewCacheKey(src, filter, el, targetW, targetH, blockPx);

  const cached = resultCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async (): Promise<PixelPreviewResult> => {
    const img = await loadImage(src);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    naturalDims.set(src, { w: nw, h: nh });

    if (typeof document === 'undefined') throw new Error('no document for pixel preview');
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context for pixel preview');

    // نافذة القصّ الفعلية للخانة (cover + zoom + dragX/dragY + rotation + cropMode)
    const { sx, sy, sw, sh } = computeSlotCrop(
      { width: nw, height: nh },
      slotRectMM.wMM,
      slotRectMM.hMM,
      {
        zoom: el?.zoom,
        dragX: el?.dragX,
        dragY: el?.dragY,
        rotation: el?.rotation,
        cropMode: el?.cropMode,
      },
    );
    ctx.filter = 'none';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

    // ترتيب العقد القانوني (مطابق لـ Konva و Go): الوصفة الأساسية (pixelate / threshold)
    // أولاً، ثم تعديلات المستخدم (brightness → contrast → saturation) على بيانات البكسل.
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    for (const op of getOrderedPrintFilterOperations(filter, el)) {
      if (op.kind === 'pixelate') {
        applyNearestPixelate(imageData.data, targetW, targetH, blockPx);
      } else {
        applyPrintFilterOperation(imageData, op);
      }
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
