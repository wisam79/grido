/**
 * Barrel للتوافقية — كل المنطق انتقل إلى وحدات متخصصة (P1 تفكيك الملفات):
 * primitives / color / watermark / canvas-collage / canvas-fitted / canvas / slot / bleed.
 * جميع الاستيرادات القائمة (`export-image`, `export/index`) تعمل بلا تغيير.
 */
export {
  loadImage,
  drawImageCover,
  drawSlotImage,
  drawRoundRect,
  drawStar,
} from './export-primitives';
export type { SlotTransform } from './export-primitives';
export { colorWithAlpha, getRoundedPool, buildGradientFill } from './export-color';
export { applyWatermarkIfFree } from './export-watermark';
export { renderCollageBranch } from './export-canvas-collage';
export type { CollageRenderOptions } from './export-canvas-collage';
export { renderFittedBranch } from './export-canvas-fitted';
export { exportCanvas } from './export-canvas';
export { exportSlotCanvas } from './export-slot';
export { applyBleedAndCropMarks } from './export-bleed';
