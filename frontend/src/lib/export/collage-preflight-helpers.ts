/**
 * تجميع مساعدات فحص الكولاج لمستدعي واحد (export-dialog) — يفصل الاستيراد
 * الديناميكي عن نقطة دخول الفهرس حتى لا يثقل حِزمة الإقلاع.
 */
export { loadCollageSlotImages } from './export-canvas-collage';
export { runCollagePreflight } from './collage-preflight';
export { getCachedImageDimensions } from '@/lib/canvas/image-dimensions';
