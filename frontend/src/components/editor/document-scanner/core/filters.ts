import { ScannerFilterMode } from "./types";
import { buildIntegralImage } from "./fast-vision";

/**
 * فلتر المسح الذكي (Magic Color Filter):
 * يقوم بتبييض خلفية الورقة وإزالة ظلال الكاميرا وتوحيد الألوان والتباين للطباعة
 * مع حماية ألوان الأختام والصور الشخصية
 */
export function applyMagicColorFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return canvas;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // 1. حساب متوسط الإضاءة لتقدير لون الورقة الأساسي
  const sampleStep = Math.max(1, Math.floor(Math.sqrt((w * h) / 1500)));
  let bgSum = 0;
  let bgCount = 0;

  for (let y = 0; y < h; y += sampleStep) {
    for (let x = 0; x < w; x += sampleStep) {
      const idx = (y * w + x) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (gray > 115) {
        bgSum += gray;
        bgCount++;
      }
    }
  }

  const avgBg = bgCount > 0 ? bgSum / bgCount : 210;
  const whitePoint = Math.max(165, Math.min(245, avgBg * 0.94));

  // 2. تطبيق منحنى تباين ذكي متوازن (S-Curve & White Point Stretch)
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    const lum = (306 * r + 601 * g + 117 * b) >> 10;
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;

    // تمديد النطاق الديناميكي (White Point Normalization)
    r = Math.min(255, (r / whitePoint) * 255);
    g = Math.min(255, (g / whitePoint) * 255);
    b = Math.min(255, (b / whitePoint) * 255);

    // تفتيح الخلفيات الفاتحة ذات التشبع المنخفض لتصبح بيضاء نقية
    if (lum > 200 && saturation < 0.35) {
      const boost = Math.min(1, (lum - 200) / 45);
      r = Math.min(255, r + (255 - r) * boost);
      g = Math.min(255, g + (255 - g) * boost);
      b = Math.min(255, b + (255 - b) * boost);
    }

    // تعزيز تباين النصوص الداكنة
    if (lum < 95) {
      const darkFactor = 0.82;
      r *= darkFactor;
      g *= darkFactor;
      b *= darkFactor;
    }

    data[i] = Math.round(r);
    data[i + 1] = Math.round(g);
    data[i + 2] = Math.round(b);
    data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * فلتر أبيض وأسود ذكي وتكيفي (Adaptive Document Binarization):
 * يستند إلى الصورة التكاملية (Integral Image) لمعالجة التغيرات في إضاءة الورقة والظلال
 */
export function applyOtsuFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return canvas;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const totalPixels = w * h;

  const gray = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }

  // 1. الصورة التكاملية في زمن O(N)
  const intW = w + 1;
  const integral = new Float64Array((w + 1) * (h + 1));

  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    const rowOffset = y * w;
    const intRowOffset = (y + 1) * intW;
    const prevIntRowOffset = y * intW;

    for (let x = 0; x < w; x++) {
      rowSum += gray[rowOffset + x];
      integral[intRowOffset + (x + 1)] = integral[prevIntRowOffset + (x + 1)] + rowSum;
    }
  }

  // 2. تطبيق العتبة التكيفية (Adaptive Sauvola/Bradley Threshold)
  const windowRadius = Math.max(8, Math.min(32, Math.floor(Math.min(w, h) / 18)));
  const C = 8;

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - windowRadius);
    const y2 = Math.min(h, y + windowRadius + 1);
    const rowOffset = y * w;

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - windowRadius);
      const x2 = Math.min(w, x + windowRadius + 1);

      const count = (y2 - y1) * (x2 - x1);
      const sum =
        integral[y2 * intW + x2] -
        integral[y1 * intW + x2] -
        integral[y2 * intW + x1] +
        integral[y1 * intW + x1];

      const localMean = sum / count;
      const g = gray[rowOffset + x];
      const val = g < localMean - C ? 0 : 255;

      const idx = (rowOffset + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * فلتر التدرج الرمادي المحسن للطباعة (Photo-grade Enhanced Grayscale):
 * يحافظ على التفاصيل اللونية والرمادية بدون تقطيع ثنائي مع تبييض خلفية الورقة
 */
export function applyGrayscaleFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return canvas;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // تقدير لون خلفية الورقة
  let bgSum = 0;
  let bgCount = 0;
  const sampleStep = Math.max(1, Math.floor(Math.sqrt((w * h) / 1000)));

  for (let i = 0; i < data.length; i += sampleStep * 4) {
    const lum = (306 * data[i] + 601 * data[i + 1] + 117 * data[i + 2]) >> 10;
    if (lum > 130) {
      bgSum += lum;
      bgCount++;
    }
  }

  const whitePoint = bgCount > 0 ? Math.max(30, Math.min(250, (bgSum / bgCount) * 0.95)) : 220;

  for (let i = 0; i < data.length; i += 4) {
    let lum = (306 * data[i] + 601 * data[i + 1] + 117 * data[i + 2]) >> 10;

    // تمديد التباين وتبييض الخلفية
    lum = Math.min(255, (lum / whitePoint) * 255);
    if (lum > 210) {
      lum = Math.min(255, lum + (255 - lum) * 0.85);
    } else if (lum < 90) {
      lum = lum * 0.85; // تعزيز سواد النصوص
    }

    const finalVal = Math.round(lum);
    data[i] = finalVal;
    data[i + 1] = finalVal;
    data[i + 2] = finalVal;
    data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * فلتر توضيح وشحذ النصوص الدقيقة (Text Sharpen / Unsharp Mask):
 * يزيد من وضوح الحروف العربية، الأختام، الأرقام والباركود
 */
export function applySharpenFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 2 || h <= 2) return canvas;

  const imgData = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(imgData.data);
  const dst = imgData.data;

  // مصفوفة الشحذ 3x3 (Laplacian High-Pass Filter)
  const centerWeight = 3.0;
  const neighborWeight = -0.5;

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    const isBorderRow = y === 0 || y === h - 1;

    for (let x = 0; x < w; x++) {
      const idx = (rowOffset + x) * 4;
      const isBorderCol = x === 0 || x === w - 1;

      if (isBorderRow || isBorderCol) {
        dst[idx] = src[idx];
        dst[idx + 1] = src[idx + 1];
        dst[idx + 2] = src[idx + 2];
        dst[idx + 3] = 255;
        continue;
      }

      const prevRow = (y - 1) * w;
      const nextRow = (y + 1) * w;
      const idxUp = (prevRow + x) * 4;
      const idxDown = (nextRow + x) * 4;
      const idxLeft = (rowOffset + x - 1) * 4;
      const idxRight = (rowOffset + x + 1) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          src[idx + c] * centerWeight +
          (src[idxUp + c] + src[idxDown + c] + src[idxLeft + c] + src[idxRight + c]) * neighborWeight;
        dst[idx + c] = Math.max(0, Math.min(255, Math.round(val)));
      }
      dst[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * فلتر إزالة الاصفرار والتقادم (De-Yellow & Vintage Paper Restoration):
 * يزيل درجات اللون الأصفر والبني من المستندات والكتب القديمة مع الحفاظ على الحبر الأسود والأزرق
 */
export function applyDeYellowFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return canvas;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    let b = data[i + 2];

    const lum = (306 * r + 601 * g + 117 * b) >> 10;

    // قياس درجة الاصفرار (Yellow tint: Red & Green are high while Blue is low)
    const yellowDiff = (r + g) / 2 - b;

    if (yellowDiff > 8 && lum > 90) {
      // تعويض القناة الزرقاء الناقصة لمعادلة الاصفرار بنعومة
      b = Math.min(255, b + yellowDiff * 0.92);
    }

    data[i] = Math.round(Math.min(255, r));
    data[i + 1] = Math.round(Math.min(255, g));
    data[i + 2] = Math.round(b);
    data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * خوارزمية مساندة: إزالة الظلال الموضعية ولمعان الكاميرا (Shadow & Glare Removal)
 */
export function applyShadowRemoval(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return canvas;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const total = w * h;

  const gray = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    gray[i] = (306 * data[idx] + 601 * data[idx + 1] + 117 * data[idx + 2]) >> 10;
  }

  const integral = buildIntegralImage(gray, w, h);
  const stride = w + 1;
  const r = Math.max(8, Math.min(64, Math.floor(Math.min(w, h) / 10)));

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - r);
    const y2 = Math.min(h, y + r + 1);
    const rowOffset = y * w;

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - r);
      const x2 = Math.min(w, x + r + 1);
      const count = (x2 - x1) * (y2 - y1);

      const sum =
        integral[y2 * stride + x2] -
        integral[y1 * stride + x2] -
        integral[y2 * stride + x1] +
        integral[y1 * stride + x1];

      const localBg = count > 0 ? sum / count : 128;
      const gain = localBg > 30 ? Math.min(2.5, 240 / localBg) : 1.0;

      const idx = (rowOffset + x) * 4;
      data[idx] = Math.min(255, Math.round(data[idx] * gain));
      data[idx + 1] = Math.min(255, Math.round(data[idx + 1] * gain));
      data[idx + 2] = Math.min(255, Math.round(data[idx + 2] * gain));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * خوارزمية مساندة: تشذيب وتنظيف حواف المستند من شوائب وقصاصات الماسح (Border Margin Cleanup)
 */
export function applyBorderCleanup(canvas: HTMLCanvasElement, borderPx: number = 2): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return canvas;

  const safeBorder = Math.min(borderPx, Math.floor(Math.min(w, h) / 4));
  if (safeBorder <= 0) return canvas;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // تبييض إطار الحواف الخارجية
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < safeBorder || x >= w - safeBorder || y < safeBorder || y >= h - safeBorder) {
        const idx = (y * w + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * تطبيق نمط الفلتر المطلوب على الكانفاس
 */
export function applyFilterMode(
  canvas: HTMLCanvasElement,
  filterMode: ScannerFilterMode
): HTMLCanvasElement {
  switch (filterMode) {
    case "magic":
      return applyMagicColorFilter(canvas);
    case "bw":
      return applyOtsuFilter(canvas);
    case "grayscale":
      return applyGrayscaleFilter(canvas);
    case "sharpen":
      return applySharpenFilter(canvas);
    case "deyellow":
      return applyDeYellowFilter(canvas);
    case "original":
    default:
      return canvas;
  }
}
