import { gradientStart, gradientEnd, TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { resolveElementFill, type AffineMatrix } from '@/lib/canvas/fill-paint';
import { computeShapePattern, toLocalPattern } from '@/lib/canvas/shape-pattern';
import { resolveTextDecorationColor } from '@/lib/canvas/text-helpers';

import type { CanvasElement } from '@/lib/editor-store';
import type Konva from 'konva';

/**
 * نقطة حل التعبئة الوحيدة لكل عناصر الكانفاس (شكل/نص).
 * تعبئة الصورة (fillType='image') مدعومة للأشكال والنصوص عبر نقش Konva
 * الأصلي (fillPatternImage)؛ قبل تحميل الصورة يبقى اللون المصمت ظاهراً بدل
 * شفافية — فيرى المستخدم عنصره فوراً ثم تُطبَّق الصورة عند جاهزيتها.
 */
/**
 * Native fill props cannot express inverse-affine radial gradients or rotated
 * patterns under nonuniform path scaling. Keep Konva's geometry/hit/stroke
 * implementation, but paint its already-traced path in element coordinates.
 * Canvas paths retain their device coordinates when the CTM changes.
 */
export function createElementSpaceSceneFunc(
  element: CanvasElement,
  w: number,
  h: number,
  image: HTMLImageElement | null,
  elementToLocal: AffineMatrix,
) {
  return (context: Konva.Context, shape: Konva.Shape) => {
    const originalFill = shape._fillFunc;
    shape._fillFunc = (fillContext) => {
      const ctx = fillContext._context;
      ctx.save();
      try {
        ctx.transform(...elementToLocal);
        ctx.fillStyle = resolveElementFill(ctx, element, w, h, image);
        ctx.fill();
      } finally {
        ctx.restore();
      }
    };
    try {
      // Use the native path/arc/wedge tracer, including Konva's hit geometry
      // and scaled strokes. Do not replace the shape or its export semantics.
      (shape as Konva.Shape & { _sceneFunc: (ctx: Konva.Context) => void })._sceneFunc(context);
    } finally {
      shape._fillFunc = originalFill;
    }
  };
}

export function getFillProps(
  element: CanvasElement,
  w: number,
  h: number,
  patternImage?: HTMLImageElement | null,
  patternSpace?: { scaleX?: number; scaleY?: number; originX?: number; originY?: number },
) {
  const sX = patternSpace?.scaleX && patternSpace.scaleX !== 0 ? patternSpace.scaleX : 1;
  const sY = patternSpace?.scaleY && patternSpace.scaleY !== 0 ? patternSpace.scaleY : 1;
  const ox = patternSpace?.originX ?? 0;
  const oy = patternSpace?.originY ?? 0;

  const textDecorationFill =
    element.type === 'text'
      ? { fill: resolveTextDecorationColor(element) ?? element.color ?? TEXT_COLOR_DEFAULT }
      : {};
  if (element.fillType === 'image') {
    if (element.fillImageSrc && patternImage) {
      const computed = computeShapePattern({
        imageWidth: patternImage.naturalWidth || patternImage.width,
        imageHeight: patternImage.naturalHeight || patternImage.height,
        boxWidth: w,
        boxHeight: h,
        fit: element.fillImageFit,
        scale: element.fillImageScale,
        rotation: element.fillImageRotation,
        offsetX: element.fillImageOffsetX,
        offsetY: element.fillImageOffsetY,
      });
      // أشكال المسار والمراكز ترسم بمقياس وإزاحة أصل مختلفة — نعوّضهما ليتطابق النقش مع التصدير
      const scaled = patternSpace ? toLocalPattern(computed, sX, sY) : computed;
      const t =
        ox !== 0 || oy !== 0
          ? { ...scaled, patternX: scaled.patternX + ox, patternY: scaled.patternY + oy }
          : scaled;
      return {
        ...textDecorationFill,
        fillPriority: 'pattern',
        fillPatternImage: patternImage,
        fillPatternRepeat: t.repeat,
        fillPatternX: t.patternX,
        fillPatternY: t.patternY,
        fillPatternScaleX: t.scaleX,
        fillPatternScaleY: t.scaleY,
        fillPatternRotation: t.rotation,
        fillPatternOffsetX: t.offsetX,
        fillPatternOffsetY: t.offsetY,
      };
    }
    // صورة لم تُحمَّل بعد: لون مصمت مع تصفير أولوية النقش حتى لا يظل
    // fillPattern القديم غالباً عند تبديل نوع التعبئة لاحقاً.
    if (element.type === 'text') {
      return { fillPriority: 'color', fill: element.color || TEXT_COLOR_DEFAULT };
    }
    if (element.type === 'shape') {
      return { fillPriority: 'color', fill: element.fill || 'transparent' };
    }
    return { fillPriority: 'color', fill: 'transparent' };
  }
  if (element.fillType === 'linear') {
    const start = element.fillLinearGradientStartPoint || { x: 0, y: 0 };
    const end = element.fillLinearGradientEndPoint || { x: 1, y: 1 };
    return {
      fillPriority: 'linear-gradient',
      fillLinearGradientStartPoint: { x: ox + (start.x * w) / sX, y: oy + (start.y * h) / sY },
      fillLinearGradientEndPoint: { x: ox + (end.x * w) / sX, y: oy + (end.y * h) / sY },
      fillLinearGradientColorStops: element.fillLinearGradientColorStops || [
        0,
        gradientStart(),
        1,
        gradientEnd(),
      ],
    };
  }
  if (element.fillType === 'radial') {
    const start = element.fillRadialGradientStartPoint || { x: 0.5, y: 0.5 };
    const end = element.fillRadialGradientEndPoint || { x: 0.5, y: 0.5 };
    const rStart =
      element.fillRadialGradientStartRadius !== undefined
        ? element.fillRadialGradientStartRadius
        : 0;
    const rEnd =
      element.fillRadialGradientEndRadius !== undefined ? element.fillRadialGradientEndRadius : 0.5;
    const radialScale = Math.max(Math.abs(sX), Math.abs(sY)) || 1;
    return {
      ...textDecorationFill,
      fillPriority: 'radial-gradient',
      fillRadialGradientStartPoint: { x: ox + (start.x * w) / sX, y: oy + (start.y * h) / sY },
      fillRadialGradientStartRadius: (rStart * Math.max(w, h)) / radialScale,
      fillRadialGradientEndPoint: { x: ox + (end.x * w) / sX, y: oy + (end.y * h) / sY },
      fillRadialGradientEndRadius: (rEnd * Math.max(w, h)) / radialScale,
      fillRadialGradientColorStops: element.fillRadialGradientColorStops || [
        0,
        gradientStart(),
        1,
        gradientEnd(),
      ],
    };
  }
  if (element.type === 'text') {
    return { fillPriority: 'color', fill: element.color || TEXT_COLOR_DEFAULT };
  }
  if (element.type === 'shape') {
    return { fillPriority: 'color', fill: element.fill || 'transparent' };
  }
  return { fillPriority: 'color', fill: 'transparent' };
}
