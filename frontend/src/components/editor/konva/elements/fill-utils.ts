import { CanvasElement } from '@/lib/editor-store';
import { gradientStart, gradientEnd, TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { computeShapePattern, toLocalPattern } from '@/lib/canvas/shape-pattern';

/**
 * نقطة حل التعبئة الوحيدة لكل عناصر الكانفاس (شكل/نص).
 * تعبئة الصورة (fillType='image') مدعومة للأشكال والنصوص عبر نقش Konva
 * الأصلي (fillPatternImage)؛ قبل تحميل الصورة يبقى اللون المصمت ظاهراً بدل
 * شفافية — فيرى المستخدم عنصره فوراً ثم تُطبَّق الصورة عند جاهزيتها.
 */
export function getFillProps(
  element: CanvasElement,
  w: number,
  h: number,
  patternImage?: HTMLImageElement | null,
  patternSpace?: { scaleX: number; scaleY: number },
) {
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
      // أشكال المسار ترسم بمقياس داخلي (viewBox) — تعويضه يبقي النقش بمقاس العنصر
      const t = patternSpace
        ? toLocalPattern(computed, patternSpace.scaleX, patternSpace.scaleY)
        : computed;
      return {
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
      fillLinearGradientStartPoint: { x: start.x * w, y: start.y * h },
      fillLinearGradientEndPoint: { x: end.x * w, y: end.y * h },
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
    return {
      fillPriority: 'radial-gradient',
      fillRadialGradientStartPoint: { x: start.x * w, y: start.y * h },
      fillRadialGradientStartRadius: rStart * Math.max(w, h),
      fillRadialGradientEndPoint: { x: end.x * w, y: end.y * h },
      fillRadialGradientEndRadius: rEnd * Math.max(w, h),
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
