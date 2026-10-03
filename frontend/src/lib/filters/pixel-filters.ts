/**
 * مرشّحات البكسل لملفات التصوير (threshold / pixelate) — مصدر واحد للحقيقة.
 *
 * هذه الخوارزميات نسخة مطابقة لكود الطباعة في Go:
 *   internal/service/print_image_pipeline.go → applyThreshold / applyPixelate
 * وتُستخدم في مسارين:
 *   1) فلاتر Konva المخصصة (canvas/filters/custom-filters.ts) لمعاينة المحرر.
 *   2) مسار التصدير (lib/export/export-pixel-filter.ts) لتصدير PNG/الكولاج.
 *
 * ملاحظة مهمة: CSS لا يوفّر "أقرب جار" ولا عتبة إضاءة تحفظ الشفافية، لذا
 * تُتجاهل قيمتا pixelate/threshold في مسار التصدير (يبقى buildCSSFilter
 * للمعاينة السريعة داخل DOM) وتُطبَّق هذه الخوارزميات مكانهما.
 */

/** حجم الكتلة بالبكسل — يطابق applyPixelate(img, 10) في Go */
export const PIXELATE_BLOCK_PX = 10;

/** عتبة التحويل إلى أبيض/أسود (0..1) — تطابق applyThreshold(img, 0.5) في Go */
export const THRESHOLD_LEVEL = 0.5;

/** هل هذا المعرّف مرشّح يعمل على مستوى البكسل (لا يمكن تمثيله بـ CSS)؟ */
export function isPixelFilter(filter: string | undefined): boolean {
  return filter === 'pixelate' || filter === 'threshold';
}

/**
 * عتبة الإضاءة (luminance) مع الحفاظ على قناة الشفافية — مطابقة لـ Go:
 *   gray = 0.299R + 0.587G + 0.114B ؛ val = gray >= th ? 255 : 0 ؛ A كما هي
 * (فلتر Konva المدمج Threshold يعمل على كل قناة RGBA مستقلة فينكسر على
 *  الصور الشفافة/الملونة، و CSS threshold لا يدعم أصلاً).
 */
export function applyLuminanceThreshold(
  data: Uint8ClampedArray,
  level: number = THRESHOLD_LEVEL,
): void {
  const th = Math.max(0, Math.min(1, level)) * 255;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const val = gray >= th ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    // data[i + 3] (الشفافية) تُترك كما هي عمداً — مطابقة لـ Go
  }
}

/**
 * تكبير nearest-neighbor بمقدار حجم الكتلة — مطابق لـ Go:
 *   imaging.Resize(img, w/block, h/block, NearestNeighbor) ثم
 *   imaging.Resize(small, w, h, NearestNeighbor)
 * وفهرسة المصدر في Go هي int((dst + 0.5) * srcLen/dstLen) (إحداثي مركزي
 * داخل الكتلة، لا ركنها) — وهو ما نطبقه هنا حرفياً بأرقام صحيحة.
 */
export function applyNearestPixelate(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  blockPx: number = PIXELATE_BLOCK_PX,
): void {
  const block = Math.max(1, Math.round(blockPx));
  // شرط التخطي نفسه في Go: الصورة أصغر من الكتلة أو الكتلة بلا أثر
  if (block <= 1 || width <= block || height <= block) return;

  const smallW = Math.max(1, Math.floor(width / block));
  const smallH = Math.max(1, Math.floor(height / block));
  const small = new Uint8ClampedArray(smallW * smallH * 4);

  const downX = width / smallW;
  const downY = height / smallH;
  for (let y = 0; y < smallH; y++) {
    const sy = Math.floor((y + 0.5) * downY);
    for (let x = 0; x < smallW; x++) {
      const sx = Math.floor((x + 0.5) * downX);
      const src = (sy * width + sx) * 4;
      const dst = (y * smallW + x) * 4;
      small[dst] = data[src];
      small[dst + 1] = data[src + 1];
      small[dst + 2] = data[src + 2];
      small[dst + 3] = data[src + 3];
    }
  }

  const upX = smallW / width;
  const upY = smallH / height;
  for (let y = 0; y < height; y++) {
    const sy = Math.floor((y + 0.5) * upY);
    for (let x = 0; x < width; x++) {
      const sx = Math.floor((x + 0.5) * upX);
      const src = (sy * smallW + sx) * 4;
      const dst = (y * width + x) * 4;
      data[dst] = small[src];
      data[dst + 1] = small[src + 1];
      data[dst + 2] = small[src + 2];
      data[dst + 3] = small[src + 3];
    }
  }
}

/** يطبّق مرشّح البكسل المحدد على بيانات الصورة ويعيد هل تمّت معالجته فعلاً */
export function applyPixelFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  filter: string,
): boolean {
  if (filter === 'threshold') {
    applyLuminanceThreshold(data);
    return true;
  }
  if (filter === 'pixelate') {
    applyNearestPixelate(data, width, height);
    return true;
  }
  return false;
}
