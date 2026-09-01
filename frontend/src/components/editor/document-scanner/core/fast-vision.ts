/**
 * معالجة الصور البصرية فائقة السرعة (<2ms)
 * مبنية على الصور التكاملية (Integral Images) للعمليات ذات التعقيد الزمني الثابت O(1)
 */

/**
 * تحويل مصفوفة RGBA إلى تدرج رمادي دقيق (ITU-R BT.601) مع دمج قناة الشفافية مع خلفية بيضاء
 */
export function rgbaToGrayscale(
  src: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number
): Uint8Array {
  const total = w * h;
  const dst = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const a = src[idx + 3];
    if (a === 255 || a === 0) {
      dst[i] = (306 * src[idx] + 601 * src[idx + 1] + 117 * src[idx + 2]) >> 10;
    } else {
      const alpha = a / 255;
      const r = src[idx] * alpha + 255 * (1 - alpha);
      const g = src[idx + 1] * alpha + 255 * (1 - alpha);
      const b = src[idx + 2] * alpha + 255 * (1 - alpha);
      dst[i] = (306 * r + 601 * g + 117 * b) >> 10;
    }
  }

  return dst;
}

/**
 * تنعيم فائق السرعة قابل للفصل (Fast Separable Box Blur)
 */
export function fastBoxBlur(src: Uint8Array, w: number, h: number, r: number = 2): Uint8Array {
  if (r <= 0 || w <= 0 || h <= 0) return src.slice();
  const total = w * h;
  const tmp = new Uint8Array(total);
  const dst = new Uint8Array(total);
  const effRx = Math.min(r, Math.max(0, w - 1));
  const effRy = Math.min(r, Math.max(0, h - 1));
  const winSizeX = 2 * effRx + 1;
  const winSizeY = 2 * effRy + 1;

  // مسار أفقي (Horizontal pass)
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    let sum = 0;
    for (let x = -effRx; x <= effRx; x++) {
      const px = Math.min(w - 1, Math.max(0, x));
      sum += src[rowOffset + px];
    }
    tmp[rowOffset] = Math.round(sum / winSizeX);

    for (let x = 1; x < w; x++) {
      const leftPx = Math.max(0, x - effRx - 1);
      const rightPx = Math.min(w - 1, x + effRx);
      sum += src[rowOffset + rightPx] - src[rowOffset + leftPx];
      tmp[rowOffset + x] = Math.round(sum / winSizeX);
    }
  }

  // مسار رأسي (Vertical pass)
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -effRy; y <= effRy; y++) {
      const py = Math.min(h - 1, Math.max(0, y));
      sum += tmp[py * w + x];
    }
    dst[x] = Math.round(sum / winSizeY);

    for (let y = 1; y < h; y++) {
      const topPy = Math.max(0, y - effRy - 1);
      const botPy = Math.min(h - 1, y + effRy);
      sum += tmp[botPy * w + x] - tmp[topPy * w + x];
      dst[y * w + x] = Math.round(sum / winSizeY);
    }
  }

  return dst;
}

/**
 * بناء الصورة التكاملية (Integral Image / Summed-Area Table)
 * تمكن من حساب مجموع أي مستطيل في زمن ثابت O(1)
 */
export function buildIntegralImage(gray: Uint8Array, w: number, h: number): Float64Array {
  const stride = w + 1;
  const integral = new Float64Array((w + 1) * (h + 1));

  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    const grayOffset = y * w;
    const currOffset = (y + 1) * stride;
    const prevOffset = y * stride;

    for (let x = 0; x < w; x++) {
      rowSum += gray[grayOffset + x];
      integral[currOffset + (x + 1)] = rowSum + integral[prevOffset + (x + 1)];
    }
  }

  return integral;
}

/**
 * استخراج العتبة التكيفية الموضعية باستخدام الصورة التكاملية في زمن O(1) لكل بكسل
 */
export function computeAdaptiveIntegralMasks(
  gray: Uint8Array,
  w: number,
  h: number,
  winRadius: number = 14,
  cOffset: number = 4
): { darkMask: Uint8Array; brightMask: Uint8Array } {
  const total = w * h;
  const stride = w + 1;
  const integral = buildIntegralImage(gray, w, h);
  const darkMask = new Uint8Array(total);
  const brightMask = new Uint8Array(total);

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - winRadius);
    const y2 = Math.min(h, y + winRadius + 1);
    const rowOffset = y * w;

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - winRadius);
      const x2 = Math.min(w, x + winRadius + 1);
      const count = (x2 - x1) * (y2 - y1);

      const sum =
        integral[y2 * stride + x2] -
        integral[y1 * stride + x2] -
        integral[y2 * stride + x1] +
        integral[y1 * stride + x1];

      const localMean = count > 0 ? sum / count : 128;
      const pixelVal = gray[rowOffset + x];

      // darkMask: للبطاقات أو النصوص الأغمق من الخلفية الموضعية
      if (pixelVal <= localMean - cOffset) {
        darkMask[rowOffset + x] = 255;
      }
      // brightMask: للمستندات الأفتح من الخلفية الموضعية
      if (pixelVal >= localMean + cOffset) {
        brightMask[rowOffset + x] = 255;
      }
    }
  }

  return { darkMask, brightMask };
}

/**
 * حساب تدرجات سوبل المدمجة (Sobel Gradients 3x3)
 */
export function computeSobelGradients(
  gray: Uint8Array,
  w: number,
  h: number
): { mag: Float32Array; maxMag: number } {
  const total = w * h;
  const mag = new Float32Array(total);
  let maxMag = 0;

  if (w < 3 || h < 3) {
    return { mag, maxMag: 1 };
  }

  for (let y = 1; y < h - 1; y++) {
    const prevRow = (y - 1) * w;
    const currRow = y * w;
    const nextRow = (y + 1) * w;

    for (let x = 1; x < w - 1; x++) {
      const p00 = gray[prevRow + (x - 1)];
      const p01 = gray[prevRow + x];
      const p02 = gray[prevRow + (x + 1)];

      const p10 = gray[currRow + (x - 1)];
      const p12 = gray[currRow + (x + 1)];

      const p20 = gray[nextRow + (x - 1)];
      const p21 = gray[nextRow + x];
      const p22 = gray[nextRow + (x + 1)];

      const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
      const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

      // التقريب السريع لقيمة المتجه (|gx| + |gy|)
      const val = Math.hypot(gx, gy);
      mag[currRow + x] = val;
      if (val > maxMag) maxMag = val;
    }
  }

  return { mag, maxMag: Math.max(maxMag, 1) };
}

/**
 * حساب عتبة أوتسو الإحصائية (Otsu's Global Threshold)
 */
export function computeOtsuThreshold(gray: Uint8Array, total: number): number {
  if (total <= 0) return 128;
  const hist = new Int32Array(256);
  let totalSum = 0;
  for (let i = 0; i < total; i++) {
    const val = gray[i];
    hist[val]++;
    totalSum += val;
  }

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = Math.round(totalSum / total);

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (totalSum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * قناع التباين اللوني عن خلفية الأركان الأربعة (Color Distance Salience مع وسيط الأركان)
 */
export function computeColorSalienceMask(
  rgba: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
  threshold: number = 18
): Uint8Array {
  const total = w * h;
  if (total <= 0 || w <= 0 || h <= 0) return new Uint8Array(0);
  const mask = new Uint8Array(total);

  // أخذ عينات زوايا الصورة لتقدير لون الخلفية
  const sampleIndices = [
    0,
    Math.max(0, (w - 1) * 4),
    Math.max(0, ((h - 1) * w) * 4),
    Math.max(0, (total - 1) * 4),
  ];

  const rVals: number[] = [];
  const gVals: number[] = [];
  const bVals: number[] = [];

  for (const idx of sampleIndices) {
    rVals.push(rgba[idx]);
    gVals.push(rgba[idx + 1]);
    bVals.push(rgba[idx + 2]);
  }

  rVals.sort((a, b) => a - b);
  gVals.sort((a, b) => a - b);
  bVals.sort((a, b) => a - b);

  // استخدام الوسيط (Median) لحماية لون الخلفية من أي ركن شاذ أو محجوب بظل
  const bgR = (rVals[1] + rVals[2]) / 2;
  const bgG = (gVals[1] + gVals[2]) / 2;
  const bgB = (bVals[1] + bVals[2]) / 2;

  const threshSq = threshold * threshold;
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const dr = rgba[idx] - bgR;
    const dg = rgba[idx + 1] - bgG;
    const db = rgba[idx + 2] - bgB;
    const distSq = dr * dr + dg * dg + db * db;
    if (distSq >= threshSq) {
      mask[i] = 255;
    }
  }

  return mask;
}

/**
 * 🌟 حساب تدرج متعدد القنوات لوني وإضاءة (Multi-Channel Color & Luminance Gradient)
 * يدمج شدة التدرج عبر RGB وقنوات الألوان YCbCr لكشف المستندات متطابقة الإضاءة ومختلفة الألوان
 */
export function computeMultiChannelGradient(
  rgba: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number
): {
  mag: Float32Array;
  maxMag: number;
  gx: Float32Array;
  gy: Float32Array;
} {
  const total = w * h;
  const mag = new Float32Array(total);
  const gxArr = new Float32Array(total);
  const gyArr = new Float32Array(total);
  let maxMag = 0;

  if (w < 3 || h < 3) {
    return { mag, maxMag: 1, gx: gxArr, gy: gyArr };
  }

  for (let y = 1; y < h - 1; y++) {
    const prevRow = (y - 1) * w;
    const currRow = y * w;
    const nextRow = (y + 1) * w;

    for (let x = 1; x < w - 1; x++) {
      let gRx = 0, gRy = 0;
      let gGx = 0, gGy = 0;
      let gBx = 0, gBy = 0;

      // سوبل لكل قناة لونية على حدة
      const idxP00 = (prevRow + x - 1) * 4;
      const idxP01 = (prevRow + x) * 4;
      const idxP02 = (prevRow + x + 1) * 4;

      const idxP10 = (currRow + x - 1) * 4;
      const idxP12 = (currRow + x + 1) * 4;

      const idxP20 = (nextRow + x - 1) * 4;
      const idxP21 = (nextRow + x) * 4;
      const idxP22 = (nextRow + x + 1) * 4;

      // Red
      gRx = -rgba[idxP00] + rgba[idxP02] - 2 * rgba[idxP10] + 2 * rgba[idxP12] - rgba[idxP20] + rgba[idxP22];
      gRy = -rgba[idxP00] - 2 * rgba[idxP01] - rgba[idxP02] + rgba[idxP20] + 2 * rgba[idxP21] + rgba[idxP22];

      // Green
      gGx = -rgba[idxP00 + 1] + rgba[idxP02 + 1] - 2 * rgba[idxP10 + 1] + 2 * rgba[idxP12 + 1] - rgba[idxP20 + 1] + rgba[idxP22 + 1];
      gGy = -rgba[idxP00 + 1] - 2 * rgba[idxP01 + 1] - rgba[idxP02 + 1] + rgba[idxP20 + 1] + 2 * rgba[idxP21 + 1] + rgba[idxP22 + 1];

      // Blue
      gBx = -rgba[idxP00 + 2] + rgba[idxP02 + 2] - 2 * rgba[idxP10 + 2] + 2 * rgba[idxP12 + 2] - rgba[idxP20 + 2] + rgba[idxP22 + 2];
      gBy = -rgba[idxP00 + 2] - 2 * rgba[idxP01 + 2] - rgba[idxP02 + 2] + rgba[idxP20 + 2] + 2 * rgba[idxP21 + 2] + rgba[idxP22 + 2];

      // الجمع الطيفي المعياري
      const mR = gRx * gRx + gRy * gRy;
      const mG = gGx * gGx + gGy * gGy;
      const mB = gBx * gBx + gBy * gBy;

      const combinedMag = Math.sqrt(Math.max(mR, mG, mB) + 0.3 * (mR + mG + mB));
      const currIdx = currRow + x;

      mag[currIdx] = combinedMag;
      gxArr[currIdx] = 0.299 * gRx + 0.587 * gGx + 0.114 * gBx;
      gyArr[currIdx] = 0.299 * gRy + 0.587 * gGy + 0.114 * gBy;

      if (combinedMag > maxMag) maxMag = combinedMag;
    }
  }

  return { mag, maxMag: Math.max(maxMag, 1), gx: gxArr, gy: gyArr };
}

/**
 * 🌟 التدرج المورفولوجي السريع (Morphological Gradient: Dilation - Erosion)
 * يلغي التدرجات الضوئية البطيئة وظلال الأضواء مع تضخيم حواف الورق الصلبة
 */
export function applyMorphologicalGradient(
  gray: Uint8Array,
  w: number,
  h: number,
  radius: number = 1
): Uint8Array {
  const total = w * h;
  const gradient = new Uint8Array(total);
  if (w <= 0 || h <= 0) return gradient;

  for (let y = 0; y < h; y++) {
    const yMin = Math.max(0, y - radius);
    const yMax = Math.min(h - 1, y + radius);
    const rowOffset = y * w;

    for (let x = 0; x < w; x++) {
      const xMin = Math.max(0, x - radius);
      const xMax = Math.min(w - 1, x + radius);

      let minVal = 255;
      let maxVal = 0;

      for (let ny = yMin; ny <= yMax; ny++) {
        const nOffset = ny * w;
        for (let nx = xMin; nx <= xMax; nx++) {
          const v = gray[nOffset + nx];
          if (v < minVal) minVal = v;
          if (v > maxVal) maxVal = v;
        }
      }

      gradient[rowOffset + x] = maxVal - minVal;
    }
  }

  return gradient;
}

/**
 * 🌟 كبح غير القمم الاتجاهي مع التتبع المزدوج (Canny Directional NMS & Hysteresis Edge Linking)
 * ينتج خطوط حواف نحيفة مستمرة بسماكة 1 بكسل جاهزة للاستخراج المباشر
 */
export function applyCannyNmsHysteresis(
  mag: Float32Array,
  gx: Float32Array,
  gy: Float32Array,
  w: number,
  h: number,
  lowThresh: number = 15,
  highThresh: number = 40
): Uint8Array {
  const total = w * h;
  const nms = new Float32Array(total);
  const edges = new Uint8Array(total);

  // 1. Non-Maximum Suppression (NMS)
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const idx = row + x;
      const m = mag[idx];
      if (m < lowThresh) continue;

      const dx = gx[idx];
      const dy = gy[idx];
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const normAngle = ((angle % 180) + 180) % 180;

      let q = 0;
      let r = 0;

      // 0 degrees (horizontal edge -> vertical gradient)
      if ((normAngle >= 0 && normAngle < 22.5) || (normAngle >= 157.5 && normAngle <= 180)) {
        q = mag[idx + 1];
        r = mag[idx - 1];
      }
      // 45 degrees
      else if (normAngle >= 22.5 && normAngle < 67.5) {
        q = mag[(y + 1) * w + (x + 1)];
        r = mag[(y - 1) * w + (x - 1)];
      }
      // 90 degrees (vertical edge -> horizontal gradient)
      else if (normAngle >= 67.5 && normAngle < 112.5) {
        q = mag[(y + 1) * w + x];
        r = mag[(y - 1) * w + x];
      }
      // 135 degrees
      else if (normAngle >= 112.5 && normAngle < 157.5) {
        q = mag[(y - 1) * w + (x + 1)];
        r = mag[(y + 1) * w + (x - 1)];
      }

      if (m >= q && m >= r) {
        nms[idx] = m;
      }
    }
  }

  // 2. Hysteresis Edge Tracing
  const stack: number[] = [];

  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const idx = row + x;
      if (nms[idx] >= highThresh && edges[idx] === 0) {
        edges[idx] = 255;
        stack.push(idx);

        while (stack.length > 0) {
          const curr = stack.pop()!;
          const cy = Math.floor(curr / w);
          const cx = curr % w;

          for (let dy = -1; dy <= 1; dy++) {
            const ny = cy + dy;
            if (ny < 1 || ny >= h - 1) continue;
            for (let dx = -1; dx <= 1; dx++) {
              const nx = cx + dx;
              if (nx < 1 || nx >= w - 1) continue;
              const nidx = ny * w + nx;
              if (nms[nidx] >= lowThresh && edges[nidx] === 0) {
                edges[nidx] = 255;
                stack.push(nidx);
              }
            }
          }
        }
      }
    }
  }

  return edges;
}

