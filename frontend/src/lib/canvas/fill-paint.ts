/**
 * fill-paint.ts — نقطة واحدة لبناء تعبئة العناصر على Canvas 2D.
 *
 * يستهلكها مساران:
 *  1. التصدير اليدوي (نص/شكل) عبر resolveElementFill.
 *  2. النص المقوّس في المعاينة والتصدير عبر createElementGlyphPainter.
 *
 * الرياضيات نفسها المستخدمة في عقدة Konva (shape-pattern) حتى تتطابق
 * المعاينة مع التصدير بلا نسخة ثانية من المعادلات.
 */
import { gradientEnd, gradientStart, TEXT_COLOR_DEFAULT } from './canvas-colors';
import {
  computeShapePattern,
  shapePatternMatrix,
  toLocalPattern,
  type ShapeFillImageFit,
} from './shape-pattern';

import type { CanvasElement } from '@/lib/editor-store';

export type CanvasFillStyle = string | CanvasGradient | CanvasPattern;

export interface FillPoint {
  x: number;
  y: number;
}

/** يحوّل نقطة من فضاء العنصر إلى فضاء الرسم الحالي (هوية في المسار المستقيم) */
export type PointMapper = (point: FillPoint) => FillPoint;

export type AffineMatrix = [number, number, number, number, number, number];

export interface GlyphTransform {
  x: number;
  y: number;
  /** زاوية دوران الحرف بالدرجات */
  rotation: number;
}

export type GlyphFillPainter = (
  ctx: CanvasRenderingContext2D,
  glyph: GlyphTransform,
) => CanvasFillStyle;

/**
 * بناء تعبئة تدرج (linear/radial) مطابقة لمنطق getFillProps في Konva.
 * `mapPoint` اختياري لتحويل نقاط التدرج إلى فضاء الحرف المقوّس؛
 * يجب أن يكون تحويلاً صلباً (دوران/إزاحة) حتى تبقى أنصاف الأقطار صحيحة.
 */
export function buildGradientFill(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  w: number,
  h: number,
  mapPoint?: PointMapper,
): CanvasGradient | null {
  const map = mapPoint ?? ((point: FillPoint) => point);
  const addStops = (grad: CanvasGradient, stops?: Array<number | string>) => {
    const s = stops && stops.length >= 4 ? stops : [0, gradientStart(), 1, gradientEnd()];
    for (let i = 0; i + 1 < s.length; i += 2) {
      grad.addColorStop(Number(s[i]), String(s[i + 1]));
    }
  };
  if (el.fillType === 'linear') {
    const start = el.fillLinearGradientStartPoint || { x: 0, y: 0 };
    const end = el.fillLinearGradientEndPoint || { x: 1, y: 1 };
    const from = map({ x: start.x * w, y: start.y * h });
    const to = map({ x: end.x * w, y: end.y * h });
    const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    addStops(grad, el.fillLinearGradientColorStops);
    return grad;
  }
  if (el.fillType === 'radial') {
    const start = el.fillRadialGradientStartPoint || { x: 0.5, y: 0.5 };
    const end = el.fillRadialGradientEndPoint || { x: 0.5, y: 0.5 };
    const rStart = el.fillRadialGradientStartRadius ?? 0;
    const rEnd = el.fillRadialGradientEndRadius ?? 0.5;
    const from = map({ x: start.x * w, y: start.y * h });
    const to = map({ x: end.x * w, y: end.y * h });
    const grad = ctx.createRadialGradient(
      from.x,
      from.y,
      rStart * Math.max(w, h),
      to.x,
      to.y,
      rEnd * Math.max(w, h),
    );
    addStops(grad, el.fillRadialGradientColorStops);
    return grad;
  }
  return null;
}

/** اللون المصمت الاحتياطي للعنصر — نص يستخدم color، شكل يستخدم fill */
export function solidElementFill(el: CanvasElement): string {
  if (el.type === 'text') return el.color || TEXT_COLOR_DEFAULT;
  if (el.type === 'shape') return el.fill || gradientStart();
  return TEXT_COLOR_DEFAULT;
}

/**
 * إنشاء نقش صورة للعنصر مع مصفوفة التحويل الكاملة.
 * `patternSpace` يعوّض المقياس الداخلي لأشكال المسار (viewBox) فقط.
 */
export function createElementPattern(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  w: number,
  h: number,
  image: HTMLImageElement,
  patternSpace?: { scaleX: number; scaleY: number },
): { pattern: CanvasPattern; matrix: AffineMatrix } | null {
  const computed = computeShapePattern({
    imageWidth: image.naturalWidth || image.width,
    imageHeight: image.naturalHeight || image.height,
    boxWidth: w,
    boxHeight: h,
    fit: el.fillImageFit as ShapeFillImageFit | undefined,
    scale: el.fillImageScale,
    rotation: el.fillImageRotation,
    offsetX: el.fillImageOffsetX,
    offsetY: el.fillImageOffsetY,
  });
  const t = patternSpace
    ? toLocalPattern(computed, patternSpace.scaleX, patternSpace.scaleY)
    : computed;
  const pattern = ctx.createPattern(image, t.repeat);
  if (!pattern) return null;
  const matrix = shapePatternMatrix(t);
  // DOMMatrix غير موجودة في بيئات الاختبار (jsdom) — الشرط يحمي المسار
  if (typeof DOMMatrix !== 'undefined') {
    pattern.setTransform(new DOMMatrix(matrix));
  }
  return { pattern, matrix };
}

/**
 * تعبئة العنصر في فضاءه المحلي — للرسم المستقيم (تصدير/خلفيات).
 * تُرجع اللون المصمت عند غياب الصورة أو تعذّر إنشاء النقش.
 */
export function resolveElementFill(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  w: number,
  h: number,
  image?: HTMLImageElement | null,
  patternSpace?: { scaleX: number; scaleY: number },
): CanvasFillStyle {
  if (el.fillType === 'image' && el.fillImageSrc && image) {
    const created = createElementPattern(ctx, el, w, h, image, patternSpace);
    if (created) return created.pattern;
  }
  return buildGradientFill(ctx, el, w, h) ?? solidElementFill(el);
}

/** ضرب مصفوفتين أفينيتين بالترتيب A · B */
export function multiplyAffine(a: AffineMatrix, b: AffineMatrix): AffineMatrix {
  const [a1, b1, c1, d1, e1, f1] = a;
  const [a2, b2, c2, d2, e2, f2] = b;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

/** معكوس تحويل حرف صلب: T(x,y) · R(rotation) */
export function inverseGlyphTransform(glyph: GlyphTransform): AffineMatrix {
  const rad = (glyph.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos, -sin, sin, cos, -cos * glyph.x - sin * glyph.y, sin * glyph.x - cos * glyph.y];
}

/**
 * مصفوفة النقش داخل حرف مقوّس: CTM(الحرف) · P = مصفوفة العنصر
 * ⇒ P = معكوس(CTM) · مصفوفة العنصر. بهذا تبقى الصورة ثابتة في فضاء
 * العنصر ولا تدور مع كل حرف.
 */
export function glyphPatternMatrix(
  elementMatrix: AffineMatrix,
  glyph: GlyphTransform,
): AffineMatrix {
  return multiplyAffine(inverseGlyphTransform(glyph), elementMatrix);
}

/** إعادة نقطة من فضاء العنصر إلى فضاء الحرف المقوّس (لإنشاء التدرج) */
export function toGlyphLocal(point: FillPoint, glyph: GlyphTransform): FillPoint {
  const rad = (glyph.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - glyph.x;
  const dy = point.y - glyph.y;
  return { x: cos * dx + sin * dy, y: -sin * dx + cos * dy };
}

/**
 * مولّد تعبئة لكل حرف في النص المقوّس — يضمن أن التدرج/الصورة في فضاء
 * العنصر رغم دوران كل حرف على القوس.
 */
export function createElementGlyphPainter(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  w: number,
  h: number,
  image?: HTMLImageElement | null,
): GlyphFillPainter {
  if (el.fillType === 'image' && el.fillImageSrc && image) {
    const created = createElementPattern(ctx, el, w, h, image);
    if (created) {
      return (_paintCtx, glyph) => {
        if (typeof DOMMatrix !== 'undefined') {
          created.pattern.setTransform(new DOMMatrix(glyphPatternMatrix(created.matrix, glyph)));
        }
        return created.pattern;
      };
    }
  }
  if (el.fillType === 'linear' || el.fillType === 'radial') {
    return (paintCtx, glyph) =>
      buildGradientFill(paintCtx, el, w, h, (point) => toGlyphLocal(point, glyph)) ??
      solidElementFill(el);
  }
  const solid = solidElementFill(el);
  return () => solid;
}
