/**
 * تحويل عناصر الأشكال إلى مسارات متجهة — المرحلة الأولى من دمج الطبقات.
 *
 * كل شكل قياسي يُبنى هنا بنفس الهندسة التي يرسمها محرّك Konva
 * (elements/shape-node.tsx) ومسار التصدير الاحتياطي (export-canvas-fitted.ts)،
 * ثم يُطبَّق عليه تحويل العنصر الكامل (الموضع + الدوران + القلب) فينتج مسار
 * بإحداثيات بكسلات الورقة المطلقة — الفضاء المشترك الذي تُجرى فيه العمليات
 * المنطقية بين عدة أشكال.
 *
 * الأشكال الخطية (خط/سهم) ليس لها مساحة تعبئة في الأصل، فتُوسَّع بسماكة
 * الحدّ إلى مضلعات مطابقة لما يُرسم على الشاشة.
 */
import { pathFromPathData } from 'path-bool';

import { resolveRingInnerRadius, ringOuterRadius } from '@/lib/canvas/ring-geometry';

import {
  PathBuilder,
  multiplyMat,
  normalizeSegments,
  rotateMat,
  scaleMat,
  segmentsToPathData,
  translateMat,
  transformSegments,
} from './path-geometry';
import { getSvgPathBounds } from './svg-path-bounds';

import type { CubicSeg, Mat, Vec } from './path-geometry';
import type { ShapeElement } from '@/lib/store/types';

/** سماكة الحد الفعلية للأشكال الخطية — نفس منطق عقدة Konva (افتراضي 4) */
function resolvedLinearStroke(el: ShapeElement): number {
  return el.strokeWidth && el.strokeWidth > 0 ? el.strokeWidth : 4;
}

/** الارتفاع الفعلي لصندوق الأشكال الخطية — يطابق lineH/arrowH في عقدة Konva */
function linearBoxHeight(h: number, strokeW: number): number {
  return Math.max(h, strokeW, 16);
}

function roundedRectCommands(w: number, h: number, el: ShapeElement): CubicSeg[] {
  const uniform = el.radius ?? 0;
  const corners = el.radiusCorners ?? [uniform, uniform, uniform, uniform];
  // ترتيب Konva: [أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار]
  const limit = Math.min(w, h) / 2;
  const r = corners.map((v) => Math.max(0, Math.min(v || 0, limit)));
  // تجاوز مجموع زاويتين متجاورتين للضلع يجعل القوسين يتقاطعان — يُصغَّران معاً
  const shrink = (a: number, b: number, side: number): [number, number] => {
    const sum = a + b;
    if (sum <= side || sum === 0) return [a, b];
    const k = side / sum;
    return [a * k, b * k];
  };
  const [tl, tr] = shrink(r[0], r[1], w);
  const [tr2, br] = shrink(r[1], r[2], h);
  const [br2, bl] = shrink(r[2], r[3], w);
  const [bl2, tl2] = shrink(r[3], r[0], h);
  const radii: [number, number, number, number] = [
    Math.min(tl, tl2),
    Math.min(tr, tr2),
    Math.min(br, br2),
    Math.min(bl, bl2),
  ];
  const [rTL, rTR, rBR, rBL] = radii;

  const b = new PathBuilder();
  b.moveTo([rTL, 0]);
  b.lineTo([w - rTR, 0]);
  if (rTR > 0) b.arcTo(w - rTR, rTR, rTR, rTR, -Math.PI / 2, 0);
  b.lineTo([w, h - rBR]);
  if (rBR > 0) b.arcTo(w - rBR, h - rBR, rBR, rBR, 0, Math.PI / 2);
  b.lineTo([rBL, h]);
  if (rBL > 0) b.arcTo(rBL, h - rBL, rBL, rBL, Math.PI / 2, Math.PI);
  b.lineTo([0, rTL]);
  if (rTL > 0) b.arcTo(rTL, rTL, rTL, rTL, Math.PI, Math.PI * 1.5);
  return b.close().segments();
}

function ellipseCommands(w: number, h: number): CubicSeg[] {
  const b = new PathBuilder();
  const rx = w / 2;
  const ry = h / 2;
  b.moveTo([w / 2 + rx, h / 2]);
  b.arcTo(w / 2, h / 2, rx, ry, 0, Math.PI * 2);
  return b.close().segments();
}

function regularPolygonCommands(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
  startAngle = -Math.PI / 2,
): CubicSeg[] {
  const n = Math.max(3, Math.round(sides));
  const b = new PathBuilder();
  for (let i = 0; i < n; i += 1) {
    const angle = startAngle + (i * 2 * Math.PI) / n;
    const p: Vec = [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    if (i === 0) b.moveTo(p);
    else b.lineTo(p);
  }
  return b.close().segments();
}

/** نجمة Konva: 2n رأساً تتناوب بين نصف القطر الخارجي والداخلي، بدايتها من الأعلى */
function starCommands(w: number, h: number, el: ShapeElement): CubicSeg[] {
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * (el.starInnerRatio ?? 0.5);
  const points = Math.max(3, Math.round(el.starPoints ?? 5));
  const cx = w / 2;
  const cy = h / 2;
  const b = new PathBuilder();
  for (let i = 0; i < points * 2; i += 1) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outerR : innerR;
    const p: Vec = [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    if (i === 0) b.moveTo(p);
    else b.lineTo(p);
  }
  return b.close().segments();
}

/** حلقة كاملة: المحيط الخارجي باتجاه والداخلي بالاتجاه المعاكس فتُحدث ثقباً (nonzero) */
function ringCommands(w: number, h: number, el: ShapeElement): CubicSeg[] {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = ringOuterRadius(w, h);
  const innerR = resolveRingInnerRadius(el.innerRadius, w, h);
  if (innerR >= outerR) return ellipseCommands(w, h);
  const b = new PathBuilder();
  b.moveTo([cx + outerR, cy]);
  b.arcTo(cx, cy, outerR, outerR, 0, Math.PI * 2);
  b.close();
  b.moveTo([cx + innerR, cy]);
  b.arcTo(cx, cy, innerR, innerR, 0, -Math.PI * 2, true);
  return b.close().segments();
}

/** قوس حلقي (شريحة حلقة): يبدأ من أعلى الشكل (-90°) كما في Konva.Arc */
function arcCommands(w: number, h: number, el: ShapeElement): CubicSeg[] {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = ringOuterRadius(w, h);
  const innerR = resolveRingInnerRadius(el.innerRadius, w, h);
  const sweep = ((el.arcAngle ?? 270) * Math.PI) / 180;
  const start = -Math.PI / 2;
  const end = start + sweep;
  if (innerR >= outerR) {
    const b = new PathBuilder();
    b.moveTo([cx, cy]);
    b.arcTo(cx, cy, outerR, outerR, start, end);
    return b.close().segments();
  }
  const b = new PathBuilder();
  b.moveTo([cx + outerR * Math.cos(start), cy + outerR * Math.sin(start)]);
  b.arcTo(cx, cy, outerR, outerR, start, end);
  b.lineTo([cx + innerR * Math.cos(end), cy + innerR * Math.sin(end)]);
  b.arcTo(cx, cy, innerR, innerR, end, start, true);
  return b.close().segments();
}

/** قطاع دائري (بيتزا): من المركز إلى القوس والعودة */
function wedgeCommands(w: number, h: number, el: ShapeElement): CubicSeg[] {
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2;
  const start = -Math.PI / 2;
  const end = start + ((el.arcAngle ?? 90) * Math.PI) / 180;
  const b = new PathBuilder();
  b.moveTo([cx, cy]);
  b.arcTo(cx, cy, radius, radius, start, end);
  return b.close().segments();
}

/** خط: يُوسَّع بسماكة الحدّ إلى مستطيل مطابق لما يُرسم على الشاشة */
function lineCommands(w: number, h: number, el: ShapeElement): CubicSeg[] {
  const strokeW = resolvedLinearStroke(el);
  const lineH = linearBoxHeight(h, strokeW);
  const half = strokeW / 2;
  const y0 = lineH / 2 - half;
  const y1 = lineH / 2 + half;
  const b = new PathBuilder();
  b.moveTo([0, y0]);
  b.lineTo([w, y0]);
  b.lineTo([w, y1]);
  b.lineTo([0, y1]);
  return b.close().segments();
}

/**
 * سهم: جسم بخط مُوسَّع ورأس مثلث مُعبَّأ — نفس تفكيك مسار التصدير الاحتياطي
 * (خط من 0 إلى w−pointerLength ثم مثلث الرأس)، مع رأس اختياري في البداية.
 */
function arrowCommands(w: number, h: number, el: ShapeElement): CubicSeg[] {
  const strokeW = resolvedLinearStroke(el);
  const arrowH = linearBoxHeight(h, strokeW);
  const y = arrowH / 2;
  const pLen = el.pointerLength || 14;
  const pWidth = el.pointerWidth || 14;
  const bothEnds = el.pointerAtBeginning === true;
  const bodyStart = bothEnds ? Math.min(pLen, w) : 0;
  const bodyEnd = Math.max(bodyStart, w - pLen);
  const half = strokeW / 2;
  const segs: CubicSeg[] = [];

  const body = new PathBuilder();
  body.moveTo([bodyStart, y - half]);
  body.lineTo([bodyEnd, y - half]);
  body.lineTo([bodyEnd, y + half]);
  body.lineTo([bodyStart, y + half]);
  segs.push(...body.close().segments());

  const head = new PathBuilder();
  head.moveTo([w, y]);
  head.lineTo([w - pLen, y - pWidth / 2]);
  head.lineTo([w - pLen, y + pWidth / 2]);
  segs.push(...head.close().segments());

  if (bothEnds) {
    const tail = new PathBuilder();
    tail.moveTo([0, y]);
    tail.lineTo([pLen, y - pWidth / 2]);
    tail.lineTo([pLen, y + pWidth / 2]);
    segs.push(...tail.close().segments());
  }
  return segs;
}

/**
 * شكل بمسار SVG مخزَّن: يُحلَّل ثم يُطبَّق عليه مقياس viewBox وإزاحة الحد الأدنى
 * — نفس ما تفعله عقدة Konva حتى يملأ المسار صندوق العنصر.
 */
function svgPathCommands(w: number, h: number, el: ShapeElement): CubicSeg[] | null {
  const data = el.svgPath || '';
  if (!data) return null;
  const bounds = getSvgPathBounds(data);
  if (bounds.w <= 0 || bounds.h <= 0) return null;
  const sx = w / bounds.w;
  const sy = h / bounds.h;
  const inner: Mat = multiplyMat(
    translateMat(-bounds.minX * sx, -bounds.minY * sy),
    scaleMat(sx, sy),
  );
  try {
    return transformSegments(normalizeSegments(pathFromPathData(data)), inner);
  } catch {
    return null;
  }
}

/** هندسة الشكل بإحداثياته المحلية (0..w, 0..h) — مطابقة لمحرّك الرسم */
export function shapeLocalSegments(el: ShapeElement, w: number, h: number): CubicSeg[] | null {
  if (!(w > 0) || !(h > 0)) return null;
  switch (el.shape) {
    case 'rect':
      return roundedRectCommands(w, h, el);
    case 'ellipse':
      return ellipseCommands(w, h);
    case 'star':
      return starCommands(w, h, el);
    case 'polygon':
      return regularPolygonCommands(w / 2, h / 2, Math.min(w, h) / 2, el.sides ?? 6);
    case 'ring':
      return ringCommands(w, h, el);
    case 'arc':
      return arcCommands(w, h, el);
    case 'wedge':
      return wedgeCommands(w, h, el);
    case 'line':
      return lineCommands(w, h, el);
    case 'arrow':
      return arrowCommands(w, h, el);
    case 'path':
      return svgPathCommands(w, h, el);
    default:
      return null;
  }
}

/**
 * مصفوفة تحويل العنصر الكاملة: موضع على الورقة ← دوران حول أصله ← قلب حول
 * مركز صندوقه. ترتيب الضرب يطابق ترتيب عقد Konva المتداخلة في shape-node.
 */
export function elementTransform(
  el: Pick<ShapeElement, 'x' | 'y' | 'rotation' | 'flipX' | 'flipY'>,
  w: number,
  h: number,
  canvasWidth: number,
  canvasHeight: number,
): Mat {
  const flip = scaleMat(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
  const centered = multiplyMat(
    multiplyMat(translateMat(w / 2, h / 2), flip),
    translateMat(-w / 2, -h / 2),
  );
  const placed = multiplyMat(
    translateMat(el.x * canvasWidth, el.y * canvasHeight),
    rotateMat(el.rotation || 0),
  );
  return multiplyMat(placed, centered);
}

/**
 * مسار الشكل المطلق ببكسلات الورقة — جاهز للعمليات المنطقية مع غيره.
 * يعيد null عندما لا يمكن تمثيل العنصر (أبعاد صفرية أو مسار تالف).
 */
export function shapeElementToSegments(
  el: ShapeElement,
  canvasWidth: number,
  canvasHeight: number,
): CubicSeg[] | null {
  const w = el.width * canvasWidth;
  const h = el.height * canvasHeight;
  const local = shapeLocalSegments(el, w, h);
  if (!local || local.length === 0) return null;
  const m = elementTransform(el, w, h, canvasWidth, canvasHeight);
  return transformSegments(local, m);
}

/** بيانات مسار SVG مطلقة ببكسلات الورقة — الصيغة النصية لما سبق */
export function shapeElementToPathData(
  el: ShapeElement,
  canvasWidth: number,
  canvasHeight: number,
): string | null {
  const segs = shapeElementToSegments(el, canvasWidth, canvasHeight);
  if (!segs) return null;
  return segmentsToPathData(segs);
}
