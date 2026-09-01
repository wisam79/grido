import { Point, DetectedDocument, ScoredCandidate } from "./types";
import { computePolygonArea } from "./contour-tracer";
import {
  sortCornerPoints,
  computeQuadOrthogonality,
  computeQuadOverlapStats,
} from "./quad-geometry";

/**
 * قياس كثافة تدرجات الحواف على طول خط مستقيم بين نقطتين مع مقاومة الحجب الجزئي (Trimmed Mean)
 */
export function computeEdgeGradientAlongLine(
  p1: Point,
  p2: Point,
  mag: Float32Array,
  sw: number,
  sh: number
): number {
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const steps = Math.max(8, Math.round(dist));
  const samples: number[] = [];

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = Math.max(0, Math.min(sw - 1, Math.round(p1.x + t * (p2.x - p1.x))));
    const y = Math.max(0, Math.min(sh - 1, Math.round(p1.y + t * (p2.y - p1.y))));
    if (x >= 0 && x < sw && y >= 0 && y < sh) {
      samples.push(mag[y * sw + x]);
    }
  }

  if (samples.length === 0) return 0;
  samples.sort((a, b) => a - b);
  // تجاهل أدنى 20% لمقاومة حجب الأصابع أو الدبابيس
  const trimStart = Math.floor(samples.length * 0.20);
  let sum = 0;
  let count = 0;
  for (let i = trimStart; i < samples.length; i++) {
    sum += samples[i];
    count++;
  }

  return count > 0 ? sum / count : 0;
}

/**
 * قياس تدرجات الحواف على طول الأضلاع الأربعة للمضلع
 */
export function computeQuadEdgeGradient(
  quad: Point[],
  mag: Float32Array,
  sw: number,
  sh: number
): number {
  const edgeScores: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p1 = quad[i];
    const p2 = quad[(i + 1) % 4];
    edgeScores.push(computeEdgeGradientAlongLine(p1, p2, mag, sw, sh));
  }
  const minEdge = Math.min(...edgeScores);
  const avgEdge = edgeScores.reduce((a, b) => a + b, 0) / 4;
  return 0.65 * minEdge + 0.35 * avgEdge;
}

/**
 * تحليل ذكي لكثافة وطاقة النصوص وترددات الحبر (Document Text & Stroke Density Analysis)
 */
export function computeInternalTextDensity(
  quad: Point[],
  gray: Uint8Array,
  mag: Float32Array,
  sw: number,
  sh: number
): number {
  const sorted = sortCornerPoints(quad);
  const minX = Math.max(0, Math.min(sorted[0].x, sorted[1].x, sorted[2].x, sorted[3].x));
  const maxX = Math.min(sw - 1, Math.max(sorted[0].x, sorted[1].x, sorted[2].x, sorted[3].x));
  const minY = Math.max(0, Math.min(sorted[0].y, sorted[1].y, sorted[2].y, sorted[3].y));
  const maxY = Math.min(sh - 1, Math.max(sorted[0].y, sorted[1].y, sorted[2].y, sorted[3].y));

  const innerW = maxX - minX;
  const innerH = maxY - minY;
  if (innerW < 10 || innerH < 10) return 0;

  const startX = Math.round(minX + innerW * 0.15);
  const endX = Math.round(minX + innerW * 0.85);
  const startY = Math.round(minY + innerH * 0.15);
  const endY = Math.round(minY + innerH * 0.85);

  let textStrokeTransitions = 0;
  let sampledPixels = 0;
  let highContrastPixels = 0;
  let rowVarianceSum = 0;
  let rowsCounted = 0;

  const stepY = Math.max(1, Math.floor((endY - startY) / 30));
  const stepX = 1;

  for (let y = startY; y < endY; y += stepY) {
    let prevVal = gray[y * sw + startX];
    let rowMean = 0;
    let rowVariance = 0;
    let rowCount = 0;

    for (let x = startX; x < endX; x += stepX) {
      const idx = y * sw + x;
      const val = gray[idx];
      const m = mag[idx];

      rowMean += val;
      rowCount++;
      sampledPixels++;

      if (m > 16) {
        highContrastPixels++;
      }

      const diff = Math.abs(val - prevVal);
      if (diff > 20) {
        textStrokeTransitions++;
      }
      prevVal = val;
    }

    if (rowCount > 5) {
      rowMean /= rowCount;
      for (let x = startX; x < endX; x += stepX) {
        const diff = gray[y * sw + x] - rowMean;
        rowVariance += diff * diff;
      }
      rowVariance /= rowCount;
      rowVarianceSum += rowVariance;
      rowsCounted++;
    }
  }

  if (sampledPixels === 0) return 0;

  const strokeFrequency = textStrokeTransitions / sampledPixels;
  const highContrastRatio = highContrastPixels / sampledPixels;
  const avgRowVariance = rowsCounted > 0 ? rowVarianceSum / rowsCounted : 0;

  let score = 0;
  if (strokeFrequency >= 0.02) {
    score += Math.min(0.5, strokeFrequency * 3.5);
  }
  if (highContrastRatio >= 0.03) {
    score += Math.min(0.3, highContrastRatio * 2.0);
  }
  if (avgRowVariance > 100) {
    score += Math.min(0.2, (avgRowVariance - 100) / 800);
  }

  return Math.min(1.0, score);
}

/**
 * تقييم مضلع رباعي مرشح ومنحه درجة جودة بناءً على كثافة النصوص، التعامد، التباين، الحواف، ونسبة الأبعاد
 */
export function evaluateCandidateQuad(
  quad: Point[],
  sw: number,
  sh: number,
  mag: Float32Array,
  gray: Uint8Array,
  maxMag: number
): number {
  const totalPixels = sw * sh;
  const area = computePolygonArea(quad);
  const areaRatio = area / totalPixels;

  if (areaRatio < 0.015 || areaRatio > 0.955) return -Infinity;

  const orthogonality = computeQuadOrthogonality(quad);
  if (orthogonality <= 0.15) return -Infinity;

  const sorted = sortCornerPoints(quad);

  const minX = Math.min(sorted[0].x, sorted[1].x, sorted[2].x, sorted[3].x);
  const maxX = Math.max(sorted[0].x, sorted[1].x, sorted[2].x, sorted[3].x);
  const minY = Math.min(sorted[0].y, sorted[1].y, sorted[2].y, sorted[3].y);
  const maxY = Math.max(sorted[0].y, sorted[1].y, sorted[2].y, sorted[3].y);

  if (areaRatio > 0.55 && areaRatio < 0.82 && (minX <= 8 || minY <= 8 || maxX >= sw - 9 || maxY >= sh - 9)) {
    return -Infinity;
  }

  const topW = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
  const botW = Math.hypot(sorted[2].x - sorted[3].x, sorted[2].y - sorted[3].y);
  const leftH = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
  const rightH = Math.hypot(sorted[2].x - sorted[1].x, sorted[2].y - sorted[1].y);

  const avgW = (topW + botW) / 2;
  const avgH = (leftH + rightH) / 2;
  if (avgH === 0 || avgW === 0) return -Infinity;

  const ratio = Math.max(avgW / avgH, avgH / avgW);
  // دعم الإيصالات الممتدة والفواتير الطويلة حتى نسبة 4.5:1
  if (ratio > 4.5) return -Infinity;

  // مكافأة نسب الأبعاد القياسية
  let aspectBonus = 1.0;
  if (ratio >= 1.44 && ratio <= 1.84) {
    aspectBonus = 1.85; // بطاقة هوية قياسية (~1.58)
  } else if (ratio >= 1.28 && ratio < 1.44) {
    aspectBonus = 1.60; // ورقة A4 قياسية (~1.41)
  } else if (ratio >= 2.2 && ratio <= 4.2) {
    aspectBonus = 1.45; // إيصال متجر طويل
  } else if (ratio >= 0.88 && ratio <= 1.14) {
    aspectBonus = 1.15; // مربع
  }

  // تدرج الحواف
  const edgeGrad = computeQuadEdgeGradient(sorted, mag, sw, sh);
  const edgeNorm = maxMag > 0 ? Math.min(1, edgeGrad / (maxMag * 0.22)) : 0;

  const touchesEdge = minX <= 5 || minY <= 5 || maxX >= sw - 5 || maxY >= sh - 5;
  if (touchesEdge && areaRatio > 0.75 && edgeNorm < 0.20) {
    return -Infinity;
  }

  // تباين الداخل مقابل الخارج
  const cx = Math.round((sorted[0].x + sorted[1].x + sorted[2].x + sorted[3].x) / 4);
  const cy = Math.round((sorted[0].y + sorted[1].y + sorted[2].y + sorted[3].y) / 4);
  let intSum = 0;
  let intCount = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const sx = cx + dx * Math.round(avgW * 0.08);
      const sy = cy + dy * Math.round(avgH * 0.08);
      if (sx >= 0 && sx < sw && sy >= 0 && sy < sh) {
        intSum += gray[sy * sw + sx];
        intCount++;
      }
    }
  }
  const avgInt = intCount > 0 ? intSum / intCount : 128;
  const contrastNorm = Math.min(1, Math.abs(avgInt - 128) / 64 + 0.35);

  const textDensity = computeInternalTextDensity(sorted, gray, mag, sw, sh);
  const textBonus = 1.0 + textDensity * 2.5;

  const sizeFactor = 0.85 + 0.15 * Math.min(1, areaRatio * 3.5);
  return (
    (0.40 * edgeNorm + 0.30 * contrastNorm + 0.30 * orthogonality) *
    aspectBonus *
    sizeFactor *
    textBonus
  );
}

/**
 * تقسيم مضلع يحوي بطاقتي هوية مكدستين إلى بطاقتين مستقلتين مع مسافة أمان (2% Gap)
 */
export function splitQuadIntoIdCards(
  quad: Point[],
  direction: "vertical" | "horizontal" = "vertical"
): DetectedDocument[] {
  const sorted = sortCornerPoints(quad);
  const uid = Math.random().toString(36).slice(2, 7);

  if (direction === "vertical") {
    const midLeft1: Point = {
      x: Math.round(sorted[0].x + (sorted[3].x - sorted[0].x) * 0.49),
      y: Math.round(sorted[0].y + (sorted[3].y - sorted[0].y) * 0.49),
    };
    const midRight1: Point = {
      x: Math.round(sorted[1].x + (sorted[2].x - sorted[1].x) * 0.49),
      y: Math.round(sorted[1].y + (sorted[2].y - sorted[1].y) * 0.49),
    };

    const midLeft2: Point = {
      x: Math.round(sorted[0].x + (sorted[3].x - sorted[0].x) * 0.51),
      y: Math.round(sorted[0].y + (sorted[3].y - sorted[0].y) * 0.51),
    };
    const midRight2: Point = {
      x: Math.round(sorted[1].x + (sorted[2].x - sorted[1].x) * 0.51),
      y: Math.round(sorted[1].y + (sorted[2].y - sorted[1].y) * 0.51),
    };

    return [
      {
        id: `doc-${uid}-1`,
        corners: [sorted[0], sorted[1], midRight1, midLeft1],
        confidence: 0.95,
        label: "بطاقة 1 (الوجه الأمامي)",
        aspectType: "id_card",
      },
      {
        id: `doc-${uid}-2`,
        corners: [midLeft2, midRight2, sorted[2], sorted[3]],
        confidence: 0.95,
        label: "بطاقة 2 (الوجه الخلفي)",
        aspectType: "id_card",
      },
    ];
  } else {
    const midTop1: Point = {
      x: Math.round(sorted[0].x + (sorted[1].x - sorted[0].x) * 0.49),
      y: Math.round(sorted[0].y + (sorted[1].y - sorted[0].y) * 0.49),
    };
    const midBottom1: Point = {
      x: Math.round(sorted[3].x + (sorted[2].x - sorted[3].x) * 0.49),
      y: Math.round(sorted[3].y + (sorted[2].y - sorted[3].y) * 0.49),
    };

    const midTop2: Point = {
      x: Math.round(sorted[0].x + (sorted[1].x - sorted[0].x) * 0.51),
      y: Math.round(sorted[0].y + (sorted[1].y - sorted[0].y) * 0.51),
    };
    const midBottom2: Point = {
      x: Math.round(sorted[3].x + (sorted[2].x - sorted[3].x) * 0.51),
      y: Math.round(sorted[3].y + (sorted[2].y - sorted[3].y) * 0.51),
    };

    return [
      {
        id: `doc-${uid}-1`,
        corners: [sorted[0], midTop1, midBottom1, sorted[3]],
        confidence: 0.95,
        label: "بطاقة 1 (الجانب الأول)",
        aspectType: "id_card",
      },
      {
        id: `doc-${uid}-2`,
        corners: [midTop2, sorted[1], sorted[2], midBottom2],
        confidence: 0.95,
        label: "بطاقة 2 (الجانب الثاني)",
        aspectType: "id_card",
      },
    ];
  }
}

/**
 * تطبيق خوارزمية Non-Maximum Suppression (NMS) لترتيب واستبعاد المستندات المتداخلة
 */
export function applyNMS(
  candidates: ScoredCandidate[],
  iouThreshold: number = 0.30
): ScoredCandidate[] {
  if (candidates.length <= 1) return candidates.slice();

  const sortedCandidates = candidates.slice().sort((a, b) => b.score - a.score);
  const selected: ScoredCandidate[] = [];

  for (const cand of sortedCandidates) {
    let overlaps = false;
    const candArea = computePolygonArea(cand.quad);

    for (const sel of selected) {
      const stats = computeQuadOverlapStats(cand.quad, sel.quad);
      const selArea = computePolygonArea(sel.quad);

      // أ) إذا كان تفصيلاً داخلياً بنسبة تداخل > 38%
      if (stats.overlapRatio1 > 0.38) {
        overlaps = true;
        break;
      }
      // ب) إذا كان كتلة حاوية خارجية تحوي بداخلها مستنداً معتمداً بالفعل
      if (stats.overlapRatio2 > 0.60 && candArea >= 1.30 * selArea) {
        overlaps = true;
        break;
      }
      // ج) تداخل ثنائي عالي
      if (stats.maxOverlapRatio > 0.45 || stats.iou > iouThreshold) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      selected.push(cand);
    }
  }

  return selected;
}

/**
 * إضافة مضلع مستند يدوي في شبكة منظمة
 */
export function addManualDocumentQuad(
  existingDocs: DetectedDocument[],
  originalWidth: number,
  originalHeight: number
): DetectedDocument {
  const count = existingDocs.length;
  const nextIdx = count + 1;
  const w = Math.round(originalWidth * 0.42);
  const h = Math.round(originalHeight * 0.32);

  const cols = 2;
  const colIdx = count % cols;
  const rowIdx = Math.floor(count / cols) % 3;
  const maxShiftX = Math.max(1, Math.round(originalWidth * 0.1));
  const maxShiftY = Math.max(1, Math.round(originalHeight * 0.1));
  const pageOffset = (Math.floor(count / (cols * 3)) * 20) % maxShiftX;
  const pageOffsetY = (Math.floor(count / (cols * 3)) * 20) % maxShiftY;

  const baseX = Math.round(originalWidth * 0.05);
  const baseY = Math.round(originalHeight * 0.05);
  const stepX = Math.round(originalWidth * 0.48);
  const stepY = Math.round(originalHeight * 0.38);

  const x1 = Math.max(0, Math.min(originalWidth - w - 10, baseX + colIdx * stepX + pageOffset));
  const y1 = Math.max(0, Math.min(originalHeight - h - 10, baseY + rowIdx * stepY + pageOffsetY));

  const corners: Point[] = [
    { x: x1, y: y1 },
    { x: x1 + w, y: y1 },
    { x: x1 + w, y: y1 + h },
    { x: x1, y: y1 + h },
  ];

  return {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    corners,
    confidence: 0.85,
    label: `مستند ${nextIdx}`,
    aspectType: "free",
  };
}
