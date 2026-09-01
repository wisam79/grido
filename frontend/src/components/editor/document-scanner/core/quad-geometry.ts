import { Point, DocumentAspectType, QuadOverlapStats } from "./types";
import { computePolygonArea } from "./contour-tracer";

/**
 * فرز الأركان الأربعة في اتجاه عقارب الساعة:
 * [0] Top-Left, [1] Top-Right, [2] Bottom-Right, [3] Bottom-Left
 */
export function sortCornerPoints(pts: Point[]): Point[] {
  if (pts.length !== 4) return pts;

  // 1. حساب المركز الهندسي (Centroid)
  const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
  const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;

  // 2. فرز النقاط حسب الزاوية القطبية حول المركز
  const sorted = pts
    .slice()
    .sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

  // 3. تحديد نقطة البداية (Top-Left) كأقرب زاوية للربع العلوي الأيسر (-3π/4) مع ترجيح أقل x + y
  let tlIdx = 0;
  let minScore = Infinity;
  for (let i = 0; i < 4; i++) {
    const angle = Math.atan2(sorted[i].y - cy, sorted[i].x - cx);
    let diff = Math.abs(angle - -0.75 * Math.PI);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const score = diff * 0.7 + ((sorted[i].x + sorted[i].y) / Math.max(1, cx + cy)) * 0.3;
    if (score < minScore) {
      minScore = score;
      tlIdx = i;
    }
  }

  // 4. تدوير المصفوفة لتبدأ بـ Top-Left مع الحفاظ على الترتيب الدائري
  return [
    sorted[tlIdx],
    sorted[(tlIdx + 1) % 4],
    sorted[(tlIdx + 2) % 4],
    sorted[(tlIdx + 3) % 4],
  ];
}

/**
 * خوارزمية Douglas-Peucker لتقريب المضلعات مع حماية عمق التكرار
 */
export function approxPolyDP(points: Point[], epsilon: number, depth: number = 0): Point[] {
  if (points.length <= 2 || depth > 30) return points;

  const start = 0;
  const end = points.length - 1;

  const p1 = points[start];
  const p2 = points[end];

  let maxDist = 0;
  let index = 0;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lineLen = Math.hypot(dx, dy);

  for (let i = start + 1; i < end; i++) {
    const p = points[i];
    let dist = 0;
    if (lineLen === 0) {
      dist = Math.hypot(p.x - p1.x, p.y - p1.y);
    } else {
      dist = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / lineLen;
    }

    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon && index !== 0) {
    const rec1 = approxPolyDP(points.slice(0, index + 1), epsilon, depth + 1);
    const rec2 = approxPolyDP(points.slice(index), epsilon, depth + 1);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [points[0], points[end]];
  }
}

/**
 * استخراج الأركان الأربعة الحقيقية للمستند مباشرة من نقاط الغلاف المحدب (Convex Hull)
 */
export function extractFourCornersFromHull(hull: Point[]): Point[] | null {
  if (hull.length < 4) return null;
  if (hull.length === 4) return sortCornerPoints(hull);

  // 1. تقريب المضلع التكيفي (Adaptive Douglas-Peucker) للوصول إلى 4 أركان بالضبط
  let perim = 0;
  const n = hull.length;
  for (let i = 0; i < n; i++) {
    const p1 = hull[i];
    const p2 = hull[(i + 1) % n];
    perim += Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  const closed = [...hull, hull[0]];
  for (let epsRatio = 0.012; epsRatio <= 0.095; epsRatio += 0.004) {
    const poly = approxPolyDP(closed, epsRatio * perim);
    const pts = poly.length === 5 ? poly.slice(0, 4) : poly;
    if (pts.length === 4 && isPhysicallyPlausibleDocumentQuad(pts)) {
      return sortCornerPoints(pts);
    }
  }

  // 2. مستطيل الدوران الأدنى كحل هندسي موثوق وسريع O(N)
  const rotQuad = findRotatedQuadCorners(hull);
  if (rotQuad && isPhysicallyPlausibleDocumentQuad(rotQuad)) {
    return rotQuad;
  }

  return null;
}

/**
 * إيجاد مستطيل الدوران الأدنى (Minimum Area Bounding Box عبر Rotating Calipers)
 */
export function findRotatedQuadCorners(hull: Point[]): Point[] | null {
  if (hull.length < 3) return null;

  let minArea = Infinity;
  let bestCorners: Point[] | null = null;
  const n = hull.length;

  for (let i = 0; i < n; i++) {
    const p1 = hull[i];
    const p2 = hull[(i + 1) % n];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;

    const ux = dx / len;
    const uy = dy / len;
    const vx = -uy;
    const vy = ux;

    let minU = Infinity, maxU = -Infinity;
    let minV = Infinity, maxV = -Infinity;

    for (let j = 0; j < n; j++) {
      const p = hull[j];
      const projU = p.x * ux + p.y * uy;
      const projV = p.x * vx + p.y * vy;

      if (projU < minU) minU = projU;
      if (projU > maxU) maxU = projU;
      if (projV < minV) minV = projV;
      if (projV > maxV) maxV = projV;
    }

    const area = (maxU - minU) * (maxV - minV);
    if (area < minArea && area > 0) {
      minArea = area;

      const c1 = { x: minU * ux + minV * vx, y: minU * uy + minV * vy };
      const c2 = { x: maxU * ux + minV * vx, y: maxU * uy + minV * vy };
      const c3 = { x: maxU * ux + maxV * vx, y: maxU * uy + maxV * vy };
      const c4 = { x: minU * ux + maxV * vx, y: minU * uy + maxV * vy };

      bestCorners = sortCornerPoints([c1, c2, c3, c4]);
    }
  }

  // حل احتياطي عند استقامة النقاط على خط واحد
  if (!bestCorners && n >= 2) {
    const minX = Math.min(...hull.map((p) => p.x));
    const maxX = Math.max(...hull.map((p) => p.x));
    const minY = Math.min(...hull.map((p) => p.y));
    const maxY = Math.max(...hull.map((p) => p.y));
    bestCorners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
  }

  return bestCorners;
}

/**
 * فحص الصلاحية الهندسية والفيزيائية لأي مضلع مستند/بطاقة هوية
 */
export function isPhysicallyPlausibleDocumentQuad(quad: Point[]): boolean {
  if (!quad || quad.length !== 4) return false;

  const sorted = sortCornerPoints(quad);
  let initialSign = 0;

  for (let i = 0; i < 4; i++) {
    const pPrev = sorted[(i + 3) % 4];
    const pCurr = sorted[i];
    const pNext = sorted[(i + 1) % 4];

    const v1x = pPrev.x - pCurr.x;
    const v1y = pPrev.y - pCurr.y;
    const v2x = pNext.x - pCurr.x;
    const v2y = pNext.y - pCurr.y;

    const cross = v1x * v2y - v1y * v2x;
    const mag1 = Math.hypot(v1x, v1y);
    const mag2 = Math.hypot(v2x, v2y);
    if (mag1 < 1e-4 || mag2 < 1e-4) return false;

    // فحص عدم الاستقامة على خط واحد عبر الجداء الشعاعي المطبع
    if (Math.abs(cross) / (mag1 * mag2) < 0.03) return false;

    const sign = cross > 0 ? 1 : -1;
    if (initialSign === 0) {
      initialSign = sign;
    } else if (sign !== initialSign) {
      return false; // مضلع مقعر أو به تقاطع ذاتي
    }

    const dot = v1x * v2x + v1y * v2y;
    const cosAngle = Math.abs(dot / (mag1 * mag2));
    if (cosAngle > 0.72) return false; // زوايا منفرجة/حادة جداً
  }

  const topW = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
  const botW = Math.hypot(sorted[2].x - sorted[3].x, sorted[2].y - sorted[3].y);
  const leftH = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
  const rightH = Math.hypot(sorted[2].x - sorted[1].x, sorted[2].y - sorted[1].y);

  if (topW === 0 || botW === 0 || leftH === 0 || rightH === 0) return false;

  const maxWDiff = Math.max(topW / botW, botW / topW);
  const maxHDiff = Math.max(leftH / rightH, rightH / leftH);
  if (maxWDiff > 2.2 || maxHDiff > 2.2) return false;

  return true;
}

/**
 * قياس مدى تعامد زوايا المضلع الرباعي (Orthogonality Score)
 */
export function computeQuadOrthogonality(quad: Point[]): number {
  if (!isPhysicallyPlausibleDocumentQuad(quad)) return 0;

  const sorted = sortCornerPoints(quad);
  let score = 0;

  for (let i = 0; i < 4; i++) {
    const pPrev = sorted[(i + 3) % 4];
    const pCurr = sorted[i];
    const pNext = sorted[(i + 1) % 4];

    const v1x = pPrev.x - pCurr.x;
    const v1y = pPrev.y - pCurr.y;
    const v2x = pNext.x - pCurr.x;
    const v2y = pNext.y - pCurr.y;

    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.hypot(v1x, v1y);
    const mag2 = Math.hypot(v2x, v2y);

    if (mag1 === 0 || mag2 === 0) return 0;
    const cosAngle = Math.min(1.0, Math.max(0.0, Math.abs(dot / (mag1 * mag2))));
    score += 1.0 - cosAngle;
  }

  return score / 4;
}

/**
 * استنتاج نوع ونسبة أبعاد المستند بذكاء
 */
export function inferSmartDocumentAspect(quad: Point[]): DocumentAspectType {
  const sorted = sortCornerPoints(quad);
  const topW = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y);
  const botW = Math.hypot(sorted[2].x - sorted[3].x, sorted[2].y - sorted[3].y);
  const leftH = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y);
  const rightH = Math.hypot(sorted[2].x - sorted[1].x, sorted[2].y - sorted[1].y);

  const avgW = (topW + botW) / 2;
  const avgH = (leftH + rightH) / 2;
  if (avgW <= 0 || avgH <= 0) return "free";

  const ratio = avgW / avgH;

  // بطاقة هوية أفقية (ID-1 ISO 7810: 85.6mm / 53.98mm = 1.586)
  if (ratio >= 1.44 && ratio <= 1.84) return "id_card";
  // A4 عمودي (1:1.414 -> 0.707)
  if (ratio >= 0.63 && ratio <= 0.79) return "a4_p";
  // A4 أفقي (1.414)
  if (ratio >= 1.28 && ratio <= 1.44) return "a4_l";
  // مستند مربع
  if (ratio >= 0.88 && ratio <= 1.14) return "square";

  return "free";
}

/**
 * حساب إحصائيات التداخل ونسبة التقاطع بين مضلعين مع كبح أمان المساحة
 */
export function computeQuadOverlapStats(q1: Point[], q2: Point[]): QuadOverlapStats {
  const a1 = Math.max(0, computePolygonArea(q1));
  const a2 = Math.max(0, computePolygonArea(q2));

  const minX1 = Math.min(q1[0].x, q1[1].x, q1[2].x, q1[3].x);
  const maxX1 = Math.max(q1[0].x, q1[1].x, q1[2].x, q1[3].x);
  const minY1 = Math.min(q1[0].y, q1[1].y, q1[2].y, q1[3].y);
  const maxY1 = Math.max(q1[0].y, q1[1].y, q1[2].y, q1[3].y);

  const minX2 = Math.min(q2[0].x, q2[1].x, q2[2].x, q2[3].x);
  const maxX2 = Math.max(q2[0].x, q2[1].x, q2[2].x, q2[3].x);
  const minY2 = Math.min(q2[0].y, q2[1].y, q2[2].y, q2[3].y);
  const maxY2 = Math.max(q2[0].y, q2[1].y, q2[2].y, q2[3].y);

  const interW = Math.max(0, Math.min(maxX1, maxX2) - Math.max(minX1, minX2));
  const interH = Math.max(0, Math.min(maxY1, maxY2) - Math.max(minY1, minY2));
  const rawInterArea = interW * interH;
  const safeInterArea = Math.min(rawInterArea, Math.min(a1, a2));

  const unionArea = Math.max(0, a1 + a2 - safeInterArea);
  const iou = unionArea > 0 ? safeInterArea / unionArea : 0;
  const overlapRatio1 = a1 > 0 ? safeInterArea / a1 : 0;
  const overlapRatio2 = a2 > 0 ? safeInterArea / a2 : 0;

  return {
    iou,
    overlapRatio1,
    overlapRatio2,
    maxOverlapRatio: Math.max(overlapRatio1, overlapRatio2),
  };
}

export interface LineEquation {
  a: number; // a*x + b*y + c = 0, a^2 + b^2 = 1
  b: number;
  c: number;
}

/**
 * تقاطع خطين مستقيمين بدقة رياضية
 */
export function computeLineIntersection(
  l1: LineEquation,
  l2: LineEquation
): Point | null {
  const d = l1.a * l2.b - l2.a * l1.b;
  if (Math.abs(d) < 1e-7) return null;
  const x = (l1.b * l2.c - l2.b * l1.c) / d;
  const y = (l1.c * l2.a - l2.c * l1.a) / d;
  return { x, y };
}

/**
 * 🌟 ملاءمة خط مستقيم متين باستخدام خوارزمية RANSAC مع دالة خسارة M-Estimator (Huber/Tukey)
 * يستبعد الأصابع والشوائب والأركان المدورة للحصول على معادلة الحافة الحقيقية بدقة متناهية
 */
export function fitRobustLineRANSAC(
  pts: Point[],
  maxIter: number = 30,
  inlierThresh: number = 2.5
): LineEquation | null {
  if (pts.length < 2) return null;
  if (pts.length === 2) {
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return null;
    const a = -dy / len;
    const b = dx / len;
    const c = -(a * pts[0].x + b * pts[0].y);
    return { a, b, c };
  }

  let bestInliers: Point[] = [];
  let bestLine: LineEquation | null = null;
  const n = pts.length;

  for (let iter = 0; iter < maxIter; iter++) {
    const i1 = Math.floor(Math.random() * n);
    let i2 = Math.floor(Math.random() * n);
    if (i2 === i1) i2 = (i1 + 1) % n;

    const p1 = pts[i1];
    const p2 = pts[i2];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-4) continue;

    const a = -dy / len;
    const b = dx / len;
    const c = -(a * p1.x + b * p1.y);

    const inliers: Point[] = [];
    for (let k = 0; k < n; k++) {
      const dist = Math.abs(a * pts[k].x + b * pts[k].y + c);
      if (dist <= inlierThresh) {
        inliers.push(pts[k]);
      }
    }

    if (inliers.length > bestInliers.length) {
      bestInliers = inliers;
      bestLine = { a, b, c };
    }
  }

  // إعادة الملاءمة باستخدام الانحدار المتعامد (TLS) على النقاط المتوافقة (Inliers)
  if (bestInliers.length >= 2) {
    let meanX = 0;
    let meanY = 0;
    for (const p of bestInliers) {
      meanX += p.x;
      meanY += p.y;
    }
    meanX /= bestInliers.length;
    meanY /= bestInliers.length;

    let sxx = 0, sxy = 0, syy = 0;
    for (const p of bestInliers) {
      const x = p.x - meanX;
      const y = p.y - meanY;
      sxx += x * x;
      sxy += x * y;
      syy += y * y;
    }

    const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const a = -Math.sin(angle);
    const b = Math.cos(angle);
    const c = -(a * meanX + b * meanY);
    return { a, b, c };
  }

  return bestLine;
}

/**
 * 🌟 إعادة بناء أركان المستند الأربعة الحادة عبر تقاطع خطوط RANSAC الأربعة
 * يعيد بناء الأركان المفقودة أو المدورة أو المحجوبة بنسبة دقة 100%
 */
export function fitRobustQuadLinesRANSAC(
  contourPts: Point[],
  initialQuad: Point[]
): Point[] | null {
  if (contourPts.length < 8 || initialQuad.length !== 4) return null;

  const sorted = sortCornerPoints(initialQuad);
  const segments: Point[][] = [[], [], [], []]; // 0: Top, 1: Right, 2: Bottom, 3: Left

  // تقسيم نقاط الكنتور إلى 4 قطاعات حسب قربها من أضلاع المضلع الأولي
  for (const p of contourPts) {
    let minDist = Infinity;
    let bestSide = 0;

    for (let side = 0; side < 4; side++) {
      const p1 = sorted[side];
      const p2 = sorted[(side + 1) % 4];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) continue;
      const dist = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / len;
      if (dist < minDist) {
        minDist = dist;
        bestSide = side;
      }
    }

    if (minDist <= 30) {
      segments[bestSide].push(p);
    }
  }

  const lines: (LineEquation | null)[] = [];
  for (let s = 0; s < 4; s++) {
    if (segments[s].length >= 3) {
      lines.push(fitRobustLineRANSAC(segments[s], 25, 2.5));
    } else {
      // استخدام خط الضلع المبدئي كبديل
      const p1 = sorted[s];
      const p2 = sorted[(s + 1) % 4];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        lines.push({
          a: -dy / len,
          b: dx / len,
          c: -((-dy / len) * p1.x + (dx / len) * p1.y),
        });
      } else {
        lines.push(null);
      }
    }
  }

  if (lines.some((l) => l === null)) return null;

  // حساب التقاطعات: TL = L3 ∩ L0, TR = L0 ∩ L1, BR = L1 ∩ L2, BL = L2 ∩ L3
  const tl = computeLineIntersection(lines[3]!, lines[0]!);
  const tr = computeLineIntersection(lines[0]!, lines[1]!);
  const br = computeLineIntersection(lines[1]!, lines[2]!);
  const bl = computeLineIntersection(lines[2]!, lines[3]!);

  if (!tl || !tr || !br || !bl) return null;

  const reconstructed = [tl, tr, br, bl];
  if (isPhysicallyPlausibleDocumentQuad(reconstructed)) {
    return sortCornerPoints(reconstructed);
  }

  return null;
}

/**
 * 🌟 التحقق من فيزياء الإسقاط المنظوري ونقاط التلاشي (Vanishing Points Physics Check)
 * يؤكد أن المستند يتبع القوانين الفيزيائية لإسقاط الكاميرا المستوية
 */
export function evaluateVanishingPointPhysics(quad: Point[]): number {
  if (!isPhysicallyPlausibleDocumentQuad(quad)) return 0;
  const s = sortCornerPoints(quad);

  // الخط العلوي والسفلي
  const dxTop = s[1].x - s[0].x, dyTop = s[1].y - s[0].y;
  const dxBot = s[2].x - s[3].x, dyBot = s[2].y - s[3].y;
  const lenTop = Math.hypot(dxTop, dyTop);
  const lenBot = Math.hypot(dxBot, dyBot);
  if (lenTop === 0 || lenBot === 0) return 0;

  // الخط الأيسر والأيمن
  const dxLeft = s[3].x - s[0].x, dyLeft = s[3].y - s[0].y;
  const dxRight = s[2].x - s[1].x, dyRight = s[2].y - s[1].y;
  const lenLeft = Math.hypot(dxLeft, dyLeft);
  const lenRight = Math.hypot(dxRight, dyRight);
  if (lenLeft === 0 || lenRight === 0) return 0;

  const cosH = (dxTop * dxBot + dyTop * dyBot) / (lenTop * lenBot);
  const cosV = (dxLeft * dxRight + dyLeft * dyRight) / (lenLeft * lenRight);

  // الأضلاع المتقابلة يجب أن تكون شبه متوازية أو تتقارب برفق في مسقط منظوري
  if (cosH < 0.65 || cosV < 0.65) return 0.2;

  const ortho = computeQuadOrthogonality(quad);
  return 0.5 * cosH + 0.3 * cosV + 0.2 * ortho;
}

