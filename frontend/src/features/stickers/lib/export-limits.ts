/**
 * export-limits.ts — ميزانية بكسل موحّدة لتصدير الملصقات.
 *
 * 50MP تطابق سقف PDF في Go (`maxPDFPixels`) وتمنع محاولة إنشاء Canvas
 * بحجم قد يستهلك مئات الميجابايت. الحد الجانبي يحمي من أبعاد شاذة حتى لو
 * كانت المساحة الكلية صغيرة.
 */

export const MAX_RASTER_PIXELS = 50_000_000;
export const MAX_RASTER_SIDE = 32_000;

export interface RasterBudgetResult {
  ok: boolean;
  width: number;
  height: number;
  pixels: number;
  reason?: string;
}

export function checkRasterBudget(width: number, height: number): RasterBudgetResult {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return {
      ok: false,
      width,
      height,
      pixels: 0,
      reason: 'أبعاد التصدير غير صالحة — تحقق من المقاس والدقة',
    };
  }

  const w = Math.round(width);
  const h = Math.round(height);
  if (w > MAX_RASTER_SIDE || h > MAX_RASTER_SIDE) {
    return {
      ok: false,
      width: w,
      height: h,
      pixels: w * h,
      reason: `أحد أبعاد التصدير يتجاوز ${MAX_RASTER_SIDE}px — اخفض الدقة أو المقاس`,
    };
  }

  const pixels = w * h;
  if (pixels > MAX_RASTER_PIXELS) {
    const mp = (pixels / 1_000_000).toFixed(1);
    return {
      ok: false,
      width: w,
      height: h,
      pixels,
      reason: `حجم التصدير ${mp}MP يتجاوز الحد ${MAX_RASTER_PIXELS / 1_000_000}MP — اخفض DPI أو المقاس`,
    };
  }

  return { ok: true, width: w, height: h, pixels };
}

export function assertRasterBudget(width: number, height: number): RasterBudgetResult {
  const result = checkRasterBudget(width, height);
  if (!result.ok) {
    throw new Error(result.reason || 'حجم التصدير يتجاوز الميزانية');
  }
  return result;
}
