import type { ShapeElement } from '@/lib/editor-store';

/** حقول تعبئة الصورة المشتركة بين الأشكال والنصوص */
export type ImageFillFields = Pick<
  ShapeElement,
  | 'fillImageSrc'
  | 'fillImageFit'
  | 'fillImageScale'
  | 'fillImageRotation'
  | 'fillImageOffsetX'
  | 'fillImageOffsetY'
>;

/**
 * إزالة صورة التعبئة تُعيد العنصر إلى تعبئة مصمتة — قاعدة واحدة يستخدمها
 * منتقي الأشكال والنصوص معاً بدل تكرارها في كل لوحة.
 */
export function normalizeImageFillPatch(
  patch: Partial<ImageFillFields>,
): Partial<ImageFillFields> & { fillType?: 'solid' } {
  return 'fillImageSrc' in patch && !patch.fillImageSrc ? { ...patch, fillType: 'solid' } : patch;
}
