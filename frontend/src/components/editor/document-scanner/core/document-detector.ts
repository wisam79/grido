import { createLogger } from '@/lib/logger';

import { computePolygonArea, findConnectedContours, convexHull } from './contour-tracer';
import { fuseDetections, mlGraceBudgetMs } from './detect-fusion';
import { DetectorWorkerClient } from './detector-worker-client';
import {
  rgbaToGrayscale,
  fastBoxBlur,
  buildIntegralImage,
  computeAdaptiveIntegralMasks,
  computeSobelGradients,
  computeOtsuThreshold,
  computeColorSalienceMask,
  computeMultiChannelGradient,
  applyMorphologicalGradient,
  applyCannyNmsHysteresis,
} from './fast-vision';
import { detectDocumentWithMl } from './ml-detector';
import {
  computeQuadEdgeGradient,
  computeEdgeGradientAlongLine,
  evaluateCandidateQuad,
  splitQuadIntoIdCards,
  splitQuadIntoIdCardsWithSeam,
  locateSplitSeamRatio,
  SPLIT_SEAM_RATIO_DEFAULT,
  applyNMS,
  addManualDocumentQuad,
} from './multi-doc-segmenter';
import { detectDocumentsWithOpenCV, computeOpenCvScale } from './opencv-detector';
import { OVERLAP_TUNING } from './overlap-tuning';
import { refineCornersSubPixel } from './perspective-warper';
import {
  sortCornerPoints,
  approxPolyDP,
  findRotatedQuadCorners,
  extractFourCornersFromHull,
  inferSmartDocumentAspect,
  isIdCardAspectRatio,
  getAspectKindLabel,
  getDocumentAspectLabel,
  fitRobustQuadLinesRANSAC,
  evaluateVanishingPointPhysics,
} from './quad-geometry';
import { STACKED_SPLIT_MIN_RATIO, STACKED_SPLIT_MAX_RATIO } from './types';
import { getLoadedOpenCV, loadOpenCV } from '../opencv-loader';

import type {
  Point,
  DetectedDocument,
  DetectionResult,
  ScoredCandidate,
  DetectionMode,
} from './types';

const logger = createLogger('document-detector');

export { splitQuadIntoIdCards, addManualDocumentQuad };

/**
 * الأركان الافتراضية بإزاحة 5% — مصدر واحد بدل 5 نسخ مكررة
 * (الكاشف ×3، الهوك، الحوار). أي تغيير هنا ينعكس في كل المسارات.
 */
export function defaultInsetCorners(w: number, h: number, insetRatio = 0.05): Point[] {
  const padX = Math.floor(w * insetRatio);
  const padY = Math.floor(h * insetRatio);
  return [
    { x: padX, y: padY },
    { x: w - padX, y: padY },
    { x: w - padX, y: h - padY },
    { x: padX, y: h - padY },
  ];
}

const FRAME_HULL_MIN = 0.88;
const RING_UNIFORM_THRESHOLD = 0.08;

function quadAreaRatio(quad: Point[], w: number, h: number): number {
  return computePolygonArea(quad) / (w * h);
}

function isIdCardAspect(quad: Point[]): boolean {
  const sorted = sortCornerPoints(quad);
  const w = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
  const h = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
  if (w <= 0 || h <= 0) return false;
  return isIdCardAspectRatio(Math.max(w / h, h / w));
}

/**
 * فحص مدى تجانس الإطار الخارجي للصورة (يُستخدم لتفريق المستند المقصوص كاملاً عن خلفية مكتب)
 */
function computeBorderRingSalience(
  salience: Uint8Array,
  w: number,
  h: number,
  ringWidth: number = 2,
): { salient: number; total: number; ratio: number } {
  let salient = 0;
  let total = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const onEdge = x < ringWidth || x >= w - ringWidth || y < ringWidth || y >= h - ringWidth;
      if (!onEdge) continue;
      total++;
      if (salience[y * w + x] === 255) salient++;
    }
  }
  return { salient, total, ratio: total > 0 ? salient / total : 0 };
}

/**
 * كشف كافة المستندات والبطاقات في الصورة بدقة متناهية وسرعة فائقة (20x Precision Detection)
 */
export function autoDetectAllDocumentCorners(
  smallImgData: ImageData,
  sw: number,
  sh: number,
  originalWidth: number,
  originalHeight: number,
): DetectedDocument[] {
  const totalPixels = sw * sh;
  const srcData = smallImgData.data;

  // 1. تحويل سريع لتدرج الرمادي + تنعيم موضعي
  const gray = rgbaToGrayscale(srcData, sw, sh);
  const blurred = fastBoxBlur(gray, sw, sh, 2);

  // 2. حساب تدرجات سوبل والعتبات الإحصائية
  const { mag, maxMag } = computeSobelGradients(blurred, sw, sh);
  const otsuThresh = computeOtsuThreshold(blurred, totalPixels);

  // 🌟 3. حساب تدرجات متعددة القنوات اللونية والإضاءة (Multi-Channel Color Gradients)
  const multiGrad = computeMultiChannelGradient(srcData, sw, sh);
  const effMag = multiGrad.maxMag > maxMag ? multiGrad.mag : mag;
  const effMaxMag = Math.max(maxMag, multiGrad.maxMag);

  // إذا كانت الصورة فارغة أو بدون تباين كافٍ، إعادة المستطيل الافتراضي 5%
  if (effMaxMag < 8) {
    return [
      {
        id: 'doc-1',
        corners: defaultInsetCorners(originalWidth, originalHeight),
        confidence: 0.5,
        label: 'مستند 1',
        aspectType: 'free',
      },
    ];
  }

  // 4. بناء الأقنعة الثنائية المصمتة (Salience, Adaptive Bright/Dark, Otsu, Canny NMS, Morphological)
  const masks: Uint8Array[] = [];
  let salienceMask: Uint8Array | null = null;

  // أ) قناع التباين اللوني القياسي والحساس للتباين المنخفض جداً
  const mSalient = computeColorSalienceMask(srcData, sw, sh, 18);
  const mSalientSens = computeColorSalienceMask(srcData, sw, sh, 8);
  masks.push(mSalient);
  masks.push(mSalientSens);
  salienceMask = mSalient;

  // ب) قناع العتبة التكيفية (Adaptive Integral Thresholds - قياسي وواسع لمقاومة وهج الفلاش)
  // جدول تكاملي واحد مشترك للنافذتين بدل بنائه مرتين من الصفر
  const sharedIntegral = buildIntegralImage(blurred, sw, sh);
  const { darkMask, brightMask } = computeAdaptiveIntegralMasks(
    blurred,
    sw,
    sh,
    16,
    4,
    sharedIntegral,
  );
  const { darkMask: darkWide, brightMask: brightWide } = computeAdaptiveIntegralMasks(
    blurred,
    sw,
    sh,
    24,
    2,
    sharedIntegral,
  );
  masks.push(darkMask);
  masks.push(brightMask);
  masks.push(darkWide);
  masks.push(brightWide);

  // ج) قناع Otsu العام
  const mOtsu = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) mOtsu[i] = blurred[i] >= otsuThresh ? 255 : 0;
  masks.push(mOtsu);

  // د) 🌟 قناع Canny Directional NMS & Hysteresis لربط الحواف المستمرة بدقة فائقة
  const cannyMask = applyCannyNmsHysteresis(
    multiGrad.mag,
    multiGrad.gx,
    multiGrad.gy,
    sw,
    sh,
    Math.max(10, effMaxMag * 0.08),
    Math.max(25, effMaxMag * 0.22),
  );
  masks.push(cannyMask);

  // هـ) 🌟 قناع التدرج المورفولوجي لإلغاء الظلال القاسية
  const morphGrad = applyMorphologicalGradient(blurred, sw, sh, 1);
  const mMorph = new Uint8Array(totalPixels);
  const morphThresh = Math.max(12, effMaxMag * 0.14);
  for (let i = 0; i < totalPixels; i++) mMorph[i] = morphGrad[i] >= morphThresh ? 255 : 0;
  masks.push(mMorph);

  const allCandidates: ScoredCandidate[] = [];
  const minArea = Math.round(totalPixels * 0.018);

  // تتبع الكتل الكبيرة القريبة من إطار الصورة لكشف المستند المقصوص كاملاً
  let frameHullRatio = 0;
  const ringStats = salienceMask
    ? computeBorderRingSalience(salienceMask, sw, sh, 2)
    : { salient: 0, total: 1, ratio: 0 };

  for (const mask of masks) {
    const isThinEdgeMask = mask === cannyMask || mask === mMorph;
    const threshArea = isThinEdgeMask ? 40 : minArea;
    const contours = findConnectedContours(mask, sw, sh, threshArea);

    for (const borderPts of contours) {
      if (borderPts.length >= 10) {
        const step = Math.max(1, Math.floor(borderPts.length / 40));
        const sampled: Point[] = [];
        for (let i = 0; i < borderPts.length; i += step) {
          sampled.push(borderPts[i]);
        }

        if (sampled.length >= 8) {
          const hull = convexHull(sampled);
          if (hull.length < 4) continue;

          const hullArea = computePolygonArea(hull);
          const areaRatio = hullArea / totalPixels;
          if (areaRatio < 0.015) continue;

          if (areaRatio >= FRAME_HULL_MIN) {
            if (areaRatio > frameHullRatio) frameHullRatio = areaRatio;
            continue;
          }

          let perim = 0;
          for (let i = 0; i < hull.length; i++) {
            const p1 = hull[i];
            const p2 = hull[(i + 1) % hull.length];
            perim += Math.hypot(p1.x - p2.x, p1.y - p2.y);
          }

          const quads: Point[][] = [];

          // 1. الأركان الأربعة الحقيقية المستخرجة مباشرة من الغلاف المحدب
          const trueHullQuad = extractFourCornersFromHull(hull);
          if (trueHullQuad) quads.push(trueHullQuad);

          // 2. المستطيل المحيط الأصغر بالدوران (Rotating Calipers)
          const rotQuad = findRotatedQuadCorners(hull);
          if (rotQuad) quads.push(rotQuad);

          // 3. المضلع المقرب (Douglas-Peucker Polygon Approximation)
          const closedHull = [...hull, hull[0]];
          const poly = approxPolyDP(closedHull, 0.022 * perim);
          const polyPts = poly.length === 5 ? poly.slice(0, 4) : poly;
          if (polyPts.length === 4) {
            quads.push(polyPts);
          }

          // 3ب. محاولة أضيق (0.012) لالتقاط الأركان الحادة دون قصها —
          // عتبة 0.022 تقص الركن بمقدار يصل لـ 22px على محيط 1000px.
          // تُقبل فقط إن اختلفت فعلاً عن المحاولة القياسية لتفادي التكرار.
          const tightPoly = approxPolyDP(closedHull, 0.012 * perim);
          const tightPts = tightPoly.length === 5 ? tightPoly.slice(0, 4) : tightPoly;
          if (tightPts.length === 4 && polyPts.length === 4) {
            let differs = false;
            for (let k = 0; k < 4; k++) {
              if (Math.hypot(tightPts[k].x - polyPts[k].x, tightPts[k].y - polyPts[k].y) > 1) {
                differs = true;
                break;
              }
            }
            if (differs) quads.push(tightPts);
          } else if (tightPts.length === 4) {
            quads.push(tightPts);
          }

          // 4. 🌟 إعادة بناء أركان الخطوط المتقاطعة بـ RANSAC من نقاط الحواف الفعلية
          const seedQuad = trueHullQuad || rotQuad || (polyPts.length === 4 ? polyPts : null);
          if (seedQuad) {
            const ransacQuad = fitRobustQuadLinesRANSAC(borderPts, seedQuad);
            if (ransacQuad) {
              quads.push(ransacQuad);
            }
          }

          for (const quad of quads) {
            const baseScore = evaluateCandidateQuad(quad, sw, sh, effMag, gray, effMaxMag);
            if (baseScore > 0.12) {
              const physicsScore = evaluateVanishingPointPhysics(quad);
              const finalScore = baseScore * (0.75 + 0.25 * physicsScore);
              allCandidates.push({ quad, score: finalScore });
            }
          }
        }
      }
    }
  }

  // 4. قرار الإطار الكامل (Frame-Tier): عندما لا يوجد أي مرشح حقيقي
  const ringUniform = ringStats.ratio <= RING_UNIFORM_THRESHOLD;
  const hasFrameHull = frameHullRatio >= FRAME_HULL_MIN;

  const buildFrameDocument = (): DetectedDocument => {
    const inset = Math.max(1, Math.round(Math.min(originalWidth, originalHeight) * 0.005));
    const w = originalWidth;
    const h = originalHeight;
    const corners: Point[] = [
      { x: inset, y: inset },
      { x: w - inset, y: inset },
      { x: w - inset, y: h - inset },
      { x: inset, y: h - inset },
    ];
    const aspect = inferSmartDocumentAspect(corners);
    return {
      id: 'doc-1',
      corners,
      confidence: 0.62,
      label: `مستند 1 (إطار كامل — ${getAspectKindLabel(aspect)})`,
      aspectType: aspect,
    };
  };

  if (allCandidates.length === 0) {
    if (hasFrameHull && ringUniform) {
      return [buildFrameDocument()];
    }
    return [
      {
        id: 'doc-1',
        corners: defaultInsetCorners(originalWidth, originalHeight),
        confidence: 0.5,
        label: 'مستند 1',
        aspectType: 'free',
      },
    ];
  }

  // 5. تطبيق NMS ثم قرار الإطار الكامل عند ضعف المرشحين الحقيقيين
  const selectedCandidates = applyNMS(allCandidates);

  const bestCand = selectedCandidates[0];
  const bestAreaRatio = bestCand ? quadAreaRatio(bestCand.quad, sw, sh) : 0;

  const bestCandEdgeGrad = bestCand ? computeQuadEdgeGradient(bestCand.quad, mag, sw, sh) : 0;
  const bestCandEdgeNorm = maxMag > 0 ? bestCandEdgeGrad / (maxMag * 0.22) : 0;

  const bestCandSorted = bestCand ? sortCornerPoints(bestCand.quad) : null;
  let candContrast = 0;
  if (bestCandSorted) {
    const q = bestCandSorted;
    const samples: number[] = [];
    for (const v of [0.25, 0.5, 0.75]) {
      for (const u of [0.25, 0.5, 0.75]) {
        const topX = q[0].x + (q[1].x - q[0].x) * u;
        const topY = q[0].y + (q[1].y - q[0].y) * u;
        const botX = q[3].x + (q[2].x - q[3].x) * u;
        const botY = q[3].y + (q[2].y - q[3].y) * u;
        const sx = Math.round(topX + (botX - topX) * v);
        const sy = Math.round(topY + (botY - topY) * v);
        if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
          samples.push(gray[sy * sw + sx]);
        }
      }
    }
    if (samples.length > 0) {
      samples.sort((a, b) => a - b);
      const paperVal = samples[Math.floor(samples.length * 0.75)];
      candContrast = Math.abs(paperVal - gray[0]);
    }
  }

  const isWeakTextCandidate =
    (candContrast < 15 && bestAreaRatio < 0.85) || (bestAreaRatio < 0.65 && bestCandEdgeNorm < 0.2);

  // شروط تفعيل الإطار الكامل: إطار يملأ الصورة أو حلقة موحدة مع مرشح نصي بدون تباين لوني مع الخلفية
  const shouldUseFrame =
    ringUniform &&
    (selectedCandidates.length === 0 ||
      (candContrast < 15 && isWeakTextCandidate) ||
      (hasFrameHull && isWeakTextCandidate));

  if (shouldUseFrame) {
    return [buildFrameDocument()];
  }

  // 6. تفكيك بطاقات الهوية المزدوجة المكدسة (Stacked ID Auto-Split) — تكافؤ مع مسار OpenCV
  const finalCandidates: ScoredCandidate[] = [];
  for (const cand of selectedCandidates) {
    const sorted = sortCornerPoints(cand.quad);
    const cw = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
    const ch = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
    if (cw <= 0 || ch <= 0) {
      finalCandidates.push(cand);
      continue;
    }
    const ratio = cw / ch;

    if (ratio >= STACKED_SPLIT_MIN_RATIO && ratio <= STACKED_SPLIT_MAX_RATIO) {
      const midY = (sorted[0].y + sorted[3].y) / 2;
      const midGrad = computeEdgeGradientAlongLine(
        { x: sorted[0].x, y: midY },
        { x: sorted[1].x, y: midY },
        mag,
        sw,
        sh,
      );
      const midNorm = maxMag > 0 ? midGrad / (maxMag * 0.22) : 0;

      if (midNorm >= 0.45) {
        // موضع القص يتبع الفاصل الحقيقي (أقوى حافة داخل نطاق البحث)، لا منتصف المضلع دائماً
        const seamRatio =
          locateSplitSeamRatio(
            { x: (sorted[0].x + sorted[1].x) / 2, y: (sorted[0].y + sorted[1].y) / 2 },
            { x: (sorted[3].x + sorted[2].x) / 2, y: (sorted[3].y + sorted[2].y) / 2 },
            mag,
            sw,
            sh,
            maxMag,
          ) ?? SPLIT_SEAM_RATIO_DEFAULT;
        const splits = splitQuadIntoIdCardsWithSeam(
          cand.quad,
          'vertical',
          seamRatio,
          (cards) =>
            cards.length === 2 &&
            isIdCardAspect(cards[0].corners) &&
            isIdCardAspect(cards[1].corners),
        );
        if (
          splits.length === 2 &&
          isIdCardAspect(splits[0].corners) &&
          isIdCardAspect(splits[1].corners)
        ) {
          const s1Score = evaluateCandidateQuad(splits[0].corners, sw, sh, mag, gray, maxMag);
          const s2Score = evaluateCandidateQuad(splits[1].corners, sw, sh, mag, gray, maxMag);
          if (s1Score > 0.12 && s2Score > 0.12 && s1Score + s2Score > cand.score * 1.25) {
            finalCandidates.push({
              quad: splits[0].corners,
              score: s1Score,
              aspectType: splits[0].aspectType,
            });
            finalCandidates.push({
              quad: splits[1].corners,
              score: s2Score,
              aspectType: splits[1].aspectType,
            });
            continue;
          }
        }
      }
    } else if (ratio >= 1 / STACKED_SPLIT_MAX_RATIO && ratio <= 1 / STACKED_SPLIT_MIN_RATIO) {
      const midX = (sorted[0].x + sorted[1].x) / 2;
      const midGrad = computeEdgeGradientAlongLine(
        { x: midX, y: sorted[0].y },
        { x: midX, y: sorted[2].y },
        mag,
        sw,
        sh,
      );
      const midNorm = maxMag > 0 ? midGrad / (maxMag * 0.22) : 0;

      if (midNorm >= 0.45) {
        // موضع القص يتبع الفاصل الحقيقي (أقوى حافة داخل نطاق البحث)، لا منتصف المضلع دائماً
        const seamRatio =
          locateSplitSeamRatio(
            { x: (sorted[0].x + sorted[3].x) / 2, y: (sorted[0].y + sorted[3].y) / 2 },
            { x: (sorted[1].x + sorted[2].x) / 2, y: (sorted[1].y + sorted[2].y) / 2 },
            mag,
            sw,
            sh,
            maxMag,
          ) ?? SPLIT_SEAM_RATIO_DEFAULT;
        const splits = splitQuadIntoIdCardsWithSeam(
          cand.quad,
          'horizontal',
          seamRatio,
          (cards) =>
            cards.length === 2 &&
            isIdCardAspect(cards[0].corners) &&
            isIdCardAspect(cards[1].corners),
        );
        if (
          splits.length === 2 &&
          isIdCardAspect(splits[0].corners) &&
          isIdCardAspect(splits[1].corners)
        ) {
          const s1Score = evaluateCandidateQuad(splits[0].corners, sw, sh, mag, gray, maxMag);
          const s2Score = evaluateCandidateQuad(splits[1].corners, sw, sh, mag, gray, maxMag);
          if (s1Score > 0.12 && s2Score > 0.12 && s1Score + s2Score > cand.score * 1.25) {
            finalCandidates.push({
              quad: splits[0].corners,
              score: s1Score,
              aspectType: splits[0].aspectType,
            });
            finalCandidates.push({
              quad: splits[1].corners,
              score: s2Score,
              aspectType: splits[1].aspectType,
            });
            continue;
          }
        }
      }
    }
    finalCandidates.push(cand);
  }

  const finalSelected = applyNMS(finalCandidates);

  const scaleX = originalWidth / sw;
  const scaleY = originalHeight / sh;

  const resultDocs: DetectedDocument[] = finalSelected.map((cand, idx) => {
    const scaledCorners = cand.quad.map((p) => ({
      x: Math.min(originalWidth, Math.max(0, Math.round(p.x * scaleX))),
      y: Math.min(originalHeight, Math.max(0, Math.round(p.y * scaleY))),
    }));

    const sorted = sortCornerPoints(scaledCorners);
    const aspect = cand.aspectType ?? inferSmartDocumentAspect(sorted);

    const confidence = Math.min(0.99, Math.max(0.4, Math.round((cand.score / 1.5) * 100) / 100));

    return {
      id: `doc-${idx + 1}`,
      corners: sorted,
      confidence,
      label: getDocumentAspectLabel(aspect, idx + 1),
      aspectType: aspect,
    };
  });

  return resultDocs;
}

/**
 * كشف أركان المستند الأساسي
 */
export function autoDetectDocumentCorners(
  smallImgData: ImageData,
  sw: number,
  sh: number,
  originalWidth: number,
  originalHeight: number,
): Point[] {
  const allDocs = autoDetectAllDocumentCorners(smallImgData, sw, sh, originalWidth, originalHeight);
  return allDocs[0]?.corners ?? defaultInsetCorners(originalWidth, originalHeight);
}

/**
 * استخراج صورة مصغرة وتشغيل خوارزمية الكشف الهندسية عليها
 */
export function runJsDetection(
  src: CanvasImageSource,
  sw: number,
  sh: number,
  originalWidth: number,
  originalHeight: number,
): DetectedDocument[] {
  const offCanvas = document.createElement('canvas');
  offCanvas.width = sw;
  offCanvas.height = sh;
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return [];

  offCtx.drawImage(src, 0, 0, sw, sh);
  const smallImgData = offCtx.getImageData(0, 0, sw, sh);

  const docs = autoDetectAllDocumentCorners(smallImgData, sw, sh, originalWidth, originalHeight);

  // تنظيف الذاكرة
  offCanvas.width = 0;
  offCanvas.height = 0;

  return docs;
}

// 🧵 عميل واحد لعامل الكشف: هرم الرؤية النقية + محرك OpenCV (WASM) معاً —
// فتبقى تهيئة WASM（约13MB） وحسابات الكفاف خارج الخيط الرئيسي.
const detectorWorkerClient = new DetectorWorkerClient();

/** تهيئة OpenCV داخل العامل مسبقاً (بلا كلفة على الخيط الرئيسي). */
export function warmupDocumentDetectorWorker(): void {
  detectorWorkerClient.warmup();
}

/** إنهاء عامل الكشف وتحرير ذاكرة WASM — يُستدعى عند إغلاق الماسح. */
export function terminateDocumentDetectorWorker(): void {
  detectorWorkerClient.terminate();
}

/**
 * تشغيل الكشف غير المتزامن عبر Web Worker لتفادي تجميد الخيط الرئيسي
 */
export async function runJsDetectionAsync(
  src: CanvasImageSource,
  sw: number,
  sh: number,
  originalWidth: number,
  originalHeight: number,
): Promise<DetectedDocument[]> {
  const offCanvas = document.createElement('canvas');
  offCanvas.width = sw;
  offCanvas.height = sh;
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return [];

  offCtx.drawImage(src, 0, 0, sw, sh);
  const smallImgData = offCtx.getImageData(0, 0, sw, sh);

  offCanvas.width = 0;
  offCanvas.height = 0;

  // المسار غير المتزامن عبر العامل (هرم الرؤية النقية)
  try {
    const response = await detectorWorkerClient.request('detect', smallImgData, {
      originalWidth,
      originalHeight,
    });
    if (response?.type === 'success') {
      return response.docs ?? [];
    }
  } catch (workerErr) {
    logger.warn('Worker detection failed, falling back to sync JS:', workerErr);
  }

  // Fallback متين في حال عدم توفر Web Worker
  return autoDetectAllDocumentCorners(smallImgData, sw, sh, originalWidth, originalHeight);
}

/**
 * نتيجة محاولة تشغيل OpenCV داخل العامل.
 * - ran: نجح العامل (قد لا يجد مستنداً — النتيجة null مشروعة)
 * - unavailable: لا يوجد Worker في هذه البيئة → نعود للمسار المتزامن
 * - failed: العامل موجود لكنه لم يجب (بطء/خطأ) → نكمل بهرم JS بلا تحميل WASM
 */
type OpenCvWorkerOutcome =
  | { status: 'ran'; result: DetectionResult | null }
  | { status: 'unavailable' }
  | { status: 'failed' };

/** مهلة انتظار OpenCV في العامل — بعدها نكمل بهرم JS (لا نحمّل WASM على الخيط الرئيسي). */
const OPENCV_WORKER_TIMEOUT_MS = 4000;

/**
 * تشغيل كشف OpenCV داخل العامل: الخيط_MAIN يرسم الصورة مصغّرة (640px) ويرسل
 * البكسلات، والعامل ينفّذ محرك WASM بالكامل. النتيجة مطابقة للمسار المتزامن
 * لأن البكسلات نفسها.
 */
async function runOpenCvDetectionInWorker(
  src: CanvasImageSource,
  originalWidth: number,
  originalHeight: number,
  mode: DetectionMode,
): Promise<OpenCvWorkerOutcome> {
  const { sw, sh } = computeOpenCvScale(originalWidth, originalHeight);

  const offCanvas = document.createElement('canvas');
  offCanvas.width = sw;
  offCanvas.height = sh;
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return { status: 'unavailable' };

  offCtx.drawImage(src, 0, 0, sw, sh);
  const imgData = offCtx.getImageData(0, 0, sw, sh);
  offCanvas.width = 0;
  offCanvas.height = 0;

  // العامل غير متاح في هذه البيئة (بلا Worker) → المسار المتزامن.
  if (!detectorWorkerClient.isAvailable()) {
    return { status: 'unavailable' };
  }

  const request = detectorWorkerClient
    .request('opencv', imgData, { originalWidth, originalHeight, mode })
    .then((response) => {
      if (!response) return { status: 'failed' as const };
      if (response.type === 'opencv-success') {
        return { status: 'ran' as const, result: response.result ?? null };
      }
      return { status: 'failed' as const };
    })
    .catch((error) => {
      logger.warn('OpenCV worker detection failed:', error);
      return { status: 'failed' as const };
    });

  const timeout = new Promise<{ status: 'failed' }>((resolve) => {
    setTimeout(() => resolve({ status: 'failed' }), OPENCV_WORKER_TIMEOUT_MS);
  });

  return Promise.race([request, timeout]);
}

/**
 * المسار الكلاسيكي للكشف التلقائي (OpenCV WASM ثم هرم JS) — بلا النموذج
 * العصبي. يُستدعى من detectDocumentAuto الذي يشغّل ML بالتوازي ويدمج
 * النتائج عبر fuseDetections.
 */
async function runClassicalDetection(
  src: HTMLCanvasElement | HTMLImageElement,
  originalWidth: number,
  originalHeight: number,
  mode: DetectionMode = 'single',
): Promise<DetectionResult> {
  // 🌟 محرك OpenCV WASM — المفضّل داخل العامل (الخيط_MAIN يبقى خفيفاً).
  let cvResult: DetectionResult | null = null;
  let cvOutcome: OpenCvWorkerOutcome = { status: 'failed' };
  try {
    cvOutcome = await runOpenCvDetectionInWorker(src, originalWidth, originalHeight, mode);
  } catch (error) {
    logger.warn('OpenCV worker path failed:', error);
  }

  if (cvOutcome.status === 'unavailable') {
    // ⚠️ لا يوجد Worker في هذه البيئة — نحمل OpenCV على الخيط الرئيسي
    // (سلوك سابق) مع انتظار قصير مشترك (1200ms) كما كان.
    const cvReady =
      getLoadedOpenCV() ??
      (await Promise.race([
        loadOpenCV(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
      ]));
    if (cvReady) {
      try {
        cvResult = await detectDocumentsWithOpenCV(src, originalWidth, originalHeight, mode);
      } catch {
        // Fall through to pure JS detection
      }
    }
  } else if (cvOutcome.status === 'ran') {
    cvResult = cvOutcome.result;
  }

  if (cvResult && cvResult.documents && cvResult.documents.length > 0) {
    if (mode !== 'multi' || cvResult.documents.length >= 2) {
      // فحص أمان: إذا كان المستند المكتشف في وضع المفرد يغطي مساحة صغيرة فقط (< 40% من مساحة الصورة)
      // ولا يمثل بطاقة هوية، فقد يكون مجرد كتلة نصوص داخلية (مثل حقل نصوص بطاقة الهوية).
      // في هذه الحالة نمرر المعالجة لهرم الرؤية النقية JS للتأكد من عدم وجود المستند الكامل الأكبر.
      const topDoc = cvResult.documents[0];
      const areaRatio = quadAreaRatio(topDoc.corners, originalWidth, originalHeight);
      const isSuspectSubBlock =
        mode === 'single' && areaRatio < 0.4 && topDoc.aspectType !== 'id_card';
      if (!isSuspectSubBlock) {
        return cvResult;
      }
    }
  }

  // 🌟 هرم المقاييس المتعددة للرؤية النقية (Pure JS Multi-Scale Vision Pyramid عبر Web Worker)
  const maxDim1 = 480;
  const procScale1 = Math.min(1, maxDim1 / originalWidth, maxDim1 / originalHeight);
  const sw1 = Math.max(1, Math.round(originalWidth * procScale1));
  const sh1 = Math.max(1, Math.round(originalHeight * procScale1));

  let jsDocs = await runJsDetectionAsync(src, sw1, sh1, originalWidth, originalHeight);

  // إذا كانت الصورة بدقة عالية والنتائج بحاجة لتدعيم، نشغل مقياساً أدق (720px)
  const needsFinePyramid =
    Math.max(originalWidth, originalHeight) >= 720 &&
    (!jsDocs || jsDocs.length === 0 || jsDocs[0]?.confidence < 0.7 || mode === 'multi');

  if (needsFinePyramid) {
    const maxDim2 = 720;
    const procScale2 = Math.min(1, maxDim2 / originalWidth, maxDim2 / originalHeight);
    const sw2 = Math.max(1, Math.round(originalWidth * procScale2));
    const sh2 = Math.max(1, Math.round(originalHeight * procScale2));

    const fineDocs = await runJsDetectionAsync(src, sw2, sh2, originalWidth, originalHeight);
    if (fineDocs && fineDocs.length > 0) {
      if (!jsDocs || jsDocs.length === 0) {
        jsDocs = fineDocs;
      } else {
        // دمج المرشحين من المقياسين وتطبيق NMS
        const combinedCands: ScoredCandidate[] = [
          ...jsDocs.map((d) => ({ quad: d.corners, score: d.confidence })),
          ...fineDocs.map((d) => ({ quad: d.corners, score: d.confidence })),
        ];
        const nmsCands = applyNMS(combinedCands, OVERLAP_TUNING.nmsIouThresholdFused);
        jsDocs = nmsCands.map((c, i) => ({
          id: `doc-${i + 1}`,
          corners: c.quad,
          confidence: c.score,
          label: `مستند ${i + 1}`,
          aspectType: inferSmartDocumentAspect(c.quad),
        }));
      }
    }
  }

  // 🌟 نصف قطر الصقل البكسلي بموتر الهيكل يتناسب مع حجم الصورة
  const refineRadius = Math.max(
    6,
    Math.min(22, Math.round(Math.max(originalWidth, originalHeight) / 280)),
  );

  if (jsDocs && jsDocs.length > 0 && jsDocs[0]?.corners) {
    const padX = Math.floor(originalWidth * 0.05);
    const padY = Math.floor(originalHeight * 0.05);
    const firstDoc = jsDocs[0];
    const padTolerance = Math.max(2, Math.round(Math.min(originalWidth, originalHeight) * 0.01));
    const isDefault =
      jsDocs.length === 1 &&
      firstDoc.corners &&
      Math.abs(firstDoc.corners[0].x - padX) <= padTolerance &&
      Math.abs(firstDoc.corners[0].y - padY) <= padTolerance &&
      Math.abs(firstDoc.corners[2].x - (originalWidth - padX)) <= padTolerance &&
      Math.abs(firstDoc.corners[2].y - (originalHeight - padY)) <= padTolerance;

    if (!isDefault) {
      let filteredDocs = jsDocs.filter((doc) => doc.corners && doc.corners.length === 4);

      if (mode === 'single') {
        filteredDocs = filteredDocs.filter((doc) => doc.confidence >= 0.4).slice(0, 1);
      } else {
        filteredDocs = filteredDocs.filter((doc) => doc.confidence >= 0.35);
      }

      const refinedDocs = filteredDocs.map((doc) => {
        // 🆕 تخطي الصقل البكسلي للمضلعات القريبة من إطار الصورة (إطار كامل أو مقصوص بشدة)
        const docAreaRatio = quadAreaRatio(doc.corners, originalWidth, originalHeight);
        if (docAreaRatio >= 0.96) return doc;
        return {
          ...doc,
          corners: refineCornersSubPixel(
            doc.corners,
            src,
            originalWidth,
            originalHeight,
            refineRadius,
          ),
        };
      });

      if (refinedDocs.length > 0) {
        if (cvResult && cvResult.documents && cvResult.documents.length > 0) {
          const cvDoc = cvResult.documents[0];
          const cvArea = quadAreaRatio(cvDoc.corners, originalWidth, originalHeight);
          const jsDoc = refinedDocs[0];
          const jsArea = quadAreaRatio(jsDoc.corners, originalWidth, originalHeight);
          // إذا كان OpenCV كشف بطاقة هوية بينما JS لم يكشفها، OpenCV أولى
          if (cvDoc.aspectType === 'id_card' && jsDoc.aspectType !== 'id_card') {
            return cvResult;
          }
          // إذا كان مضلع JS أصغر بكثير من OpenCV وثقة OpenCV أعلى، OpenCV أولى
          if (jsArea < cvArea * 0.7 && cvDoc.confidence > jsDoc.confidence) {
            return cvResult;
          }
        }
        return {
          corners: refinedDocs[0].corners,
          confidence: refinedDocs[0].confidence,
          method: 'js',
          documents: refinedDocs,
        };
      }
    }
  }

  // إذا لم يجد JS مستنداً حقيقياً وكان لدينا كشف مسبق من OpenCV، نعتمد نتيجة OpenCV بدلاً من الإطار الافتراضي
  if (cvResult && cvResult.documents && cvResult.documents.length > 0) {
    return cvResult;
  }

  const fallbackCorners: Point[] = defaultInsetCorners(originalWidth, originalHeight);

  return {
    corners: jsDocs[0]?.corners ?? fallbackCorners,
    confidence: jsDocs[0]?.confidence ?? 0.5,
    method: 'default',
    documents:
      jsDocs && jsDocs.length > 0
        ? jsDocs
        : [
            {
              id: 'doc-1',
              corners: fallbackCorners,
              confidence: 0.5,
              label: 'مستند 1',
              aspectType: 'free',
            },
          ],
  };
}

/**
 * نقطة الدخول الشاملة للكشف التلقائي — النموذج العصبي (DocCornerNet) يبدأ
 * بالتوازي في كل الأنماط كمُدقّق، والمسار الكلاسيكي (OpenCV ثم JS) يعمل
 * بالتوازي، ثم تُدمج النتائج نقية عبر fuseDetections:
 *
 * - لا ننتظر ML أكثر من ميزانية متدرّجة تُحسب من جودة النتيجة الكلاسيكية
 *   (mlGraceBudgetMs): قصيرة عندما يكون الكلاسيكي واثقاً، وكاملة عندما يفشل
 *   أو تكون ثقته منخفضة — فأول كشف بارد لم يعد يُهدر أذكى إشارة عندنا.
 * - ML لم يعد مساراً منفصلاً يقصر النتيجة على مستند واحد في نمط single،
 *   ولا بديلاً أخيراً في multi — بل يؤكد/يسترد/يستبدل مرشحات الكلاسيكي.
 */
export async function detectDocumentAuto(
  src: HTMLCanvasElement | HTMLImageElement,
  originalWidth: number,
  originalHeight: number,
  mode: DetectionMode = 'single',
): Promise<DetectionResult> {
  const mlPromise = detectDocumentWithMl(src, originalWidth, originalHeight).catch(() => null);

  const classical = await runClassicalDetection(src, originalWidth, originalHeight, mode);

  const ml = await new Promise<DetectionResult | null>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, mlGraceBudgetMs(classical));
    mlPromise.then((value) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(value);
      }
    });
  });

  return fuseDetections(ml, classical, mode);
}
