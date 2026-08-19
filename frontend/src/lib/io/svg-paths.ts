/**
 * svg-paths.ts
 * مسارات رسومية (SVG paths) للأشكال الجاهزة والرموز المتجهة
 * تم فصلها عن ملف toolbar.tsx لزيادة نظافة الكود وسهولة التوسعة
 */

export interface SvgShape {
  id: string;
  name: string;
  emoji: string;
  path: string;
  /** أبعاد الإطار المرجعي للمسار — مطلوبة لقياسه داخل صندوق العنصر (E-3 fix) */
  viewBox: { w: number; h: number };
}

export const VECTOR_SHAPES: SvgShape[] = [];
