import { Point, DetectedDocument, DetectionResult, ScoredCandidate, DetectionMode } from "./types";
import { computePolygonArea as calculatePolygonArea } from "./contour-tracer";
import {
  sortCornerPoints,
  computeQuadOrthogonality,
  computeQuadOverlapStats,
  inferSmartDocumentAspect,
} from "./quad-geometry";
import { splitQuadIntoIdCards } from "./multi-doc-segmenter";
import { loadOpenCV, getLoadedOpenCV, CvRuntime } from "../opencv-loader";
import type { CvMat, CvMatVector, CvRuntimeLike } from "./cv-types";
import type { CvPoint } from "./cv-types";

interface CvDisposableLike {
  delete: () => void;
  isDeleted?: () => boolean;
}

/**
 * تقييم مضلع رباعي مستخرج من OpenCV وحساب درجة الجودة
 */
function evaluateOpenCvQuadScore(
  quad: Point[],
  sw: number,
  sh: number,
  grayData: Uint8Array,
  totalPixels: number
): number {
  const quadArea = calculatePolygonArea(quad);
  const areaRatio = quadArea / totalPixels;

  if (areaRatio < 0.015 || areaRatio > 0.98) return -Infinity;

  const orthogonality = computeQuadOrthogonality(quad);
  if (orthogonality <= 0.15) return -Infinity;

  const sorted = sortCornerPoints(quad);
  const w = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
  const h = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
  const ratio = Math.max(w / Math.max(1, h), h / Math.max(1, w));

  if (ratio > 2.8) return -Infinity;

  // مكافأة نسب المستندات القياسية
  let aspectBonus = 1.0;
  if (ratio >= 1.46 && ratio <= 1.78) {
    aspectBonus = 1.95; // بطاقة هوية قياسية (ID-1 / ISO 7810 ~ 1.586)
  } else if (ratio >= 1.34 && ratio < 1.46) {
    aspectBonus = 1.65; // ورقة A4 قياسية (~ 1.414)
  } else if (ratio >= 1.16 && ratio < 1.34) {
    aspectBonus = 0.80; // كتلة مدمجة لبطاقتين مكدستين
  } else if (ratio >= 0.88 && ratio <= 1.15) {
    aspectBonus = 1.20; // مربع
  } else {
    aspectBonus = 0.50; // شريط نحيف
  }

  // حساب التباين بين داخل المضلع وخارجه
  let interiorSum = 0;
  let interiorCount = 0;
  const cx = Math.round((sorted[0].x + sorted[1].x + sorted[2].x + sorted[3].x) / 4);
  const cy = Math.round((sorted[0].y + sorted[1].y + sorted[2].y + sorted[3].y) / 4);

  // عينات داخلية
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const sx = cx + dx * Math.round(w * 0.1);
      const sy = cy + dy * Math.round(h * 0.1);
      if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
        interiorSum += grayData[sy * sw + sx];
        interiorCount++;
      }
    }
  }
  const avgInterior = interiorCount > 0 ? interiorSum / interiorCount : 128;

  // عقوبة لمس حواف الكانفاس — مع استثناء المستندات القريبة من تملؤ الإطار
  let borderTouches = 0;
  for (const p of quad) {
    if (p.x <= 2 || p.x >= sw - 3 || p.y <= 2 || p.y >= sh - 3) {
      borderTouches++;
    }
  }
  let borderPenalty = 1.0;
  if (areaRatio < 0.94) {
    if (borderTouches >= 2) borderPenalty = 0.55;
    if (borderTouches >= 3) borderPenalty = 0.30;
  }

  const sizeFactor = 0.80 + 0.20 * Math.min(1, areaRatio * 3.5);
  const baseScore = (0.50 * orthogonality + 0.50 * (Math.abs(avgInterior - 128) / 128 + 0.5)) * aspectBonus * sizeFactor * borderPenalty;

  return baseScore;
}

/**
 * كشف المستندات والبطاقات باستخدام محرك OpenCV (WASM) فائق الدقة
 */
export async function detectDocumentsWithOpenCV(
  src: HTMLCanvasElement | HTMLImageElement,
  originalWidth: number,
  originalHeight: number,
  mode: DetectionMode = "auto"
): Promise<DetectionResult | null> {
  let cvFull: CvRuntime | null = getLoadedOpenCV();
  if (!cvFull) {
    try {
      cvFull = await loadOpenCV();
    } catch {
      return null;
    }
  }

  if (!cvFull || !cvFull.Mat || typeof cvFull.matFromImageData !== "function") {
    return null;
  }
  // واجهة هيكلية مُحصورة بالدوال المستخدمة فعلياً — أنواع @techstark تفرض
  // توقيعات Mat كاملة غير لازمة هنا، فنمرر عبر الواجهة الدقيقة cv-types.
  const cv = cvFull as unknown as CvRuntimeLike;

  const maxDim = 640;
  const scale = Math.min(1, maxDim / originalWidth, maxDim / originalHeight);
  const sw = Math.max(1, Math.round(originalWidth * scale));
  const sh = Math.max(1, Math.round(originalHeight * scale));
  const totalPixels = sw * sh;

  const offCanvas = document.createElement("canvas");
  offCanvas.width = sw;
  offCanvas.height = sh;
  const offCtx = offCanvas.getContext("2d", { willReadFrequently: true });
  if (!offCtx) return null;

  offCtx.drawImage(src, 0, 0, sw, sh);
  const imgData = offCtx.getImageData(0, 0, sw, sh);

  // مصفوفات OpenCV للتنظيف الإجباري في النهاية
  const matsToFree: CvDisposableLike[] = [];
  const track = <T extends object>(mat: T): T => {
    if (typeof (mat as { delete?: unknown }).delete === "function") {
      matsToFree.push(mat as unknown as CvDisposableLike);
    }
    return mat;
  };

  try {
    const srcMat = track(cv.matFromImageData(imgData));
    const grayMat = track(new cv.Mat());
    const blurMat = track(new cv.Mat());

    cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(grayMat, blurMat, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

    const grayData = new Uint8Array(grayMat.data);

  // توليد الأقنعة الثنائية المختلفة
  const binaryMats: CvMat[] = [];

    // 1. قناع Canny مع تمديد الحواف
    const cannyMat = track(new cv.Mat());
    cv.Canny(blurMat, cannyMat, 35, 120);
    const kernel = track(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3)));
    const dilatedCanny = track(new cv.Mat());
    cv.dilate(cannyMat, dilatedCanny, kernel);
    binaryMats.push(dilatedCanny);

    // 2. قناع Adaptive Threshold المعكوس
    const adaptInv = track(new cv.Mat());
    cv.adaptiveThreshold(blurMat, adaptInv, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 25, 4);
    binaryMats.push(adaptInv);

    // 3. قناع Otsu المعكوس (للبطاقات الداكنة على خلفية بيضاء)
    const otsuInv = track(new cv.Mat());
    cv.threshold(blurMat, otsuInv, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
    binaryMats.push(otsuInv);

    // 4. قناع Otsu المباشر (للمستندات البيضاء على خلفيات داكنة)
    const otsuNorm = track(new cv.Mat());
    cv.threshold(blurMat, otsuNorm, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    binaryMats.push(otsuNorm);

    const allCandidates: ScoredCandidate[] = [];

    for (const binMat of binaryMats) {
      let contours: CvMatVector | null = null;
      let hierarchy: CvMat | null = null;
      try {
        contours = track(new cv.MatVector());
        hierarchy = track(new cv.Mat());
        cv.findContours(binMat, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

        const numContours = contours.size();
        for (let i = 0; i < numContours; i++) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);

          // استبعاد الشوائب والمساحات الكلية
          if (area < 0.012 * totalPixels || area > 0.98 * totalPixels) {
            try { cnt.delete(); } catch { /* ignore */ }
            continue;
          }

          const peri = cv.arcLength(cnt, true);
          const approx = track(new cv.Mat());
          const hull = track(new cv.Mat());
          const hullApprox = track(new cv.Mat());

          try {
            cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

            const quads: Point[][] = [];

            // أ) مضلع التقريب الرباعي
            if (approx.rows === 4 && cv.isContourConvex(approx)) {
              const pts: Point[] = [];
              for (let r = 0; r < 4; r++) {
                pts.push({
                  x: approx.data32S[r * 2],
                  y: approx.data32S[r * 2 + 1],
                });
              }
              quads.push(pts);
            }

            // ب) مضلع مستطيل الدوران الأدنى
            try {
              const rotRect = cv.minAreaRect(cnt);
              let boxPts: CvPoint[] = [];
              if (typeof cv.rotatedRectPoints === "function") {
                boxPts = cv.rotatedRectPoints(rotRect);
              } else if (cv.RotatedRect && typeof cv.RotatedRect.points === "function") {
                boxPts = cv.RotatedRect.points(rotRect);
              }
              if (boxPts && boxPts.length === 4) {
                quads.push(boxPts.map((p) => ({ x: p.x, y: p.y })));
              }
            } catch {
              // ignore
            }

            // ج) غلاف محدب مقرب
            cv.convexHull(cnt, hull, false, true);
            cv.approxPolyDP(hull, hullApprox, 0.025 * peri, true);
            if (hullApprox.rows === 4 && cv.isContourConvex(hullApprox)) {
              const pts: Point[] = [];
              for (let r = 0; r < 4; r++) {
                pts.push({
                  x: hullApprox.data32S[r * 2],
                  y: hullApprox.data32S[r * 2 + 1],
                });
              }
              quads.push(pts);
            }

          for (const quad of quads) {
            const score = evaluateOpenCvQuadScore(quad, sw, sh, grayData, totalPixels);
            if (score > 0.15) {
              allCandidates.push({ quad, score });

              const qSorted = sortCornerPoints(quad);
              const qW = Math.hypot(qSorted[1].x - qSorted[0].x, qSorted[1].y - qSorted[0].y);
              const qH = Math.hypot(qSorted[3].x - qSorted[0].x, qSorted[3].y - qSorted[0].y);
              const qRatio = qW / Math.max(1, qH);

              const isIdCardAspect = (q: Point[]): boolean => {
                const s = sortCornerPoints(q);
                const ww = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y);
                const hh = Math.hypot(s[3].x - s[0].x, s[3].y - s[0].y);
                if (ww <= 0 || hh <= 0) return false;
                const r = Math.max(ww / hh, hh / ww);
                return r >= 1.44 && r <= 1.84;
              };

              if (qRatio >= 0.68 && qRatio <= 0.88) {
                const midY = Math.round((qSorted[0].y + qSorted[3].y) / 2);
                let midEdgeDiff = 0;
                for (let x = Math.round(qSorted[0].x); x <= Math.round(qSorted[1].x); x += 2) {
                  if (midY > 1 && midY < sh - 2 && x >= 0 && x < sw) {
                    midEdgeDiff += Math.abs(grayData[(midY - 1) * sw + x] - grayData[(midY + 1) * sw + x]);
                  }
                }
                const avgMidEdge = midEdgeDiff / Math.max(1, Math.round((qSorted[1].x - qSorted[0].x) / 2));
                if (avgMidEdge >= 12) {
                  const split = splitQuadIntoIdCards(quad, "vertical");
                  if (split.length === 2) {
                    const s1 = evaluateOpenCvQuadScore(split[0].corners, sw, sh, grayData, totalPixels);
                    const s2 = evaluateOpenCvQuadScore(split[1].corners, sw, sh, grayData, totalPixels);
                    if (
                      s1 > 0.15 &&
                      s2 > 0.15 &&
                      isIdCardAspect(split[0].corners) &&
                      isIdCardAspect(split[1].corners)
                    ) {
                      allCandidates.push({ quad: split[0].corners, score: s1 });
                      allCandidates.push({ quad: split[1].corners, score: s2 });
                    }
                  }
                }
              } else if (qRatio >= 1.18 && qRatio <= 1.38) {
                const midX = Math.round((qSorted[0].x + qSorted[1].x) / 2);
                let midEdgeDiff = 0;
                for (let y = Math.round(qSorted[0].y); y <= Math.round(qSorted[2].y); y += 2) {
                  if (midX > 1 && midX < sw - 2 && y >= 0 && y < sh) {
                    midEdgeDiff += Math.abs(grayData[y * sw + midX - 1] - grayData[y * sw + midX + 1]);
                  }
                }
                const avgMidEdge = midEdgeDiff / Math.max(1, Math.round((qSorted[2].y - qSorted[0].y) / 2));
                if (avgMidEdge >= 12) {
                  const split = splitQuadIntoIdCards(quad, "horizontal");
                  if (split.length === 2) {
                    const s1 = evaluateOpenCvQuadScore(split[0].corners, sw, sh, grayData, totalPixels);
                    const s2 = evaluateOpenCvQuadScore(split[1].corners, sw, sh, grayData, totalPixels);
                    if (
                      s1 > 0.15 &&
                      s2 > 0.15 &&
                      isIdCardAspect(split[0].corners) &&
                      isIdCardAspect(split[1].corners)
                    ) {
                      allCandidates.push({ quad: split[0].corners, score: s1 });
                      allCandidates.push({ quad: split[1].corners, score: s2 });
                    }
                  }
                }
              }
            }
          }
        } finally {
          try { approx.delete(); } catch { /* ignore */ }
          try { hull.delete(); } catch { /* ignore */ }
          try { hullApprox.delete(); } catch { /* ignore */ }
          try { cnt.delete(); } catch { /* ignore */ }
        }
      }
    } finally {
      if (contours) {
        try { contours.delete(); } catch { /* ignore */ }
      }
      if (hierarchy) {
        try { hierarchy.delete(); } catch { /* ignore */ }
      }
    }
  }

    if (allCandidates.length === 0) return null;

    // فرز وتطبيق NMS
    allCandidates.sort((a, b) => b.score - a.score);

    const selectedQuads: ScoredCandidate[] = [];
    for (const cand of allCandidates) {
      let overlaps = false;
      for (const sel of selectedQuads) {
        const stats = computeQuadOverlapStats(cand.quad, sel.quad);
        if (stats.overlapRatio1 > 0.40 || stats.maxOverlapRatio > 0.45 || stats.iou > 0.30) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        selectedQuads.push(cand);
      }
    }

    if (selectedQuads.length === 0) return null;

    // إذا كانت المرشحات تغطي مساحات صغيرة داخل صفحة مستند موحدة الأطراف (كتل نصوص داخل صفحة كاملة)، إرجاع null للسماح لكاشف الإطار بتحديد الصفحة كاملة
    const maxAreaRatio = Math.max(...selectedQuads.map((q) => calculatePolygonArea(q.quad) / totalPixels));
    const firstQuad = selectedQuads[0].quad;
    const qSorted = sortCornerPoints(firstQuad);
    const cx = Math.round((qSorted[0].x + qSorted[1].x + qSorted[2].x + qSorted[3].x) / 4);
    const cy = Math.round((qSorted[0].y + qSorted[1].y + qSorted[2].y + qSorted[3].y) / 4);
    const intContrast = Math.abs(grayData[cy * sw + cx] - grayData[0]);

    let borderDelta = 0;
    const corner0 = grayData[0];
    const corner1 = grayData[sw - 1];
    const corner2 = grayData[(sh - 1) * sw];
    const corner3 = grayData[sh * sw - 1];
    borderDelta = Math.max(
      Math.abs(corner0 - corner1),
      Math.abs(corner0 - corner2),
      Math.abs(corner0 - corner3)
    );

    if (maxAreaRatio < 0.65 && intContrast < 25 && borderDelta < 25) {
      return null;
    }

    const scaleX = originalWidth / sw;
    const scaleY = originalHeight / sh;

    const documents: DetectedDocument[] = selectedQuads.map((cand, idx) => {
      const scaledCorners = cand.quad.map((p) => ({
        x: Math.min(originalWidth, Math.max(0, Math.round(p.x * scaleX))),
        y: Math.min(originalHeight, Math.max(0, Math.round(p.y * scaleY))),
      }));
      const sorted = sortCornerPoints(scaledCorners);
      const aspect = inferSmartDocumentAspect(sorted);

      let aspectLabel = "مستند";
      if (aspect === "id_card") aspectLabel = "بطاقة هوية";
      else if (aspect === "a4_p" || aspect === "a4_l") aspectLabel = "ورقة A4";
      else if (aspect === "square") aspectLabel = "مستند مربع";

      const confidence = Math.min(0.99, Math.max(0.60, Math.round((cand.score / 1.6) * 100) / 100));

      return {
        id: `doc-${idx + 1}`,
        corners: sorted,
        confidence,
        label: `مستند ${idx + 1} (${aspectLabel})`,
        aspectType: aspect,
      };
    });

    let filteredDocs = documents;
    if (mode === "single") {
      filteredDocs = documents.slice(0, 1);
    } else if (mode === "multi") {
      filteredDocs = documents.filter((doc) => doc.confidence >= 0.50);
    } else {
      filteredDocs = documents.filter((doc) => doc.confidence >= 0.60);
    }

    if (filteredDocs.length === 0) return null;

    return {
      corners: filteredDocs[0].corners,
      confidence: filteredDocs[0].confidence,
      method: "opencv",
      documents: filteredDocs,
    };
  } finally {
    // تنظيف جميع كائنات OpenCV WASM لمنع أي تسريب في الذاكرة
    for (const mat of matsToFree) {
      try {
        if (mat && typeof mat.delete === "function") {
          if (typeof mat.isDeleted === "function" ? !mat.isDeleted() : true) {
            mat.delete();
          }
        }
      } catch {
        // ignore
      }
    }
    offCanvas.width = 0;
    offCanvas.height = 0;
  }
}
