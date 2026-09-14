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

export const SHAPE_PATH_TRIANGLE = "M 12 3 L 22 21 L 2 21 Z";
export const SHAPE_PATH_HEART =
  "M 12 21.35 l -1.45 -1.32 C 5.4 15.36 2 12.28 2 8.5 C 2 5.42 4.42 3 7.5 3 c 1.74 0 3.41 0.81 4.5 2.09 C 13.09 3.81 14.76 3 16.5 3 c 3.08 0 5.5 2.42 5.5 5.5 c 0 3.78 -3.4 6.86 -8.55 11.54 L 12 21.35 z";
export const SHAPE_PATH_DIAMOND = "M 12 2 L 22 12 L 12 22 L 2 12 Z";
export const SHAPE_PATH_HEXAGON = "M 12 2 L 21 7.2 L 21 17.6 L 12 22.8 L 3 17.6 L 3 7.2 Z";
export const SHAPE_PATH_SHIELD = "M 12 2 L 4 5.5 L 4 11.5 C 4 16.5 7.5 20.8 12 22 C 16.5 20.8 20 16.5 20 11.5 L 20 5.5 Z";
export const SHAPE_PATH_ARROW = "M 2 9 L 13 9 L 13 4 L 22 12 L 13 20 L 13 15 L 2 15 Z";

export const VECTOR_SHAPES: SvgShape[] = [
  {
    id: "triangle",
    name: "مثلث",
    emoji: "🔺",
    path: SHAPE_PATH_TRIANGLE,
    viewBox: { w: 24, h: 24 },
  },
  {
    id: "heart",
    name: "قلب",
    emoji: "❤️",
    path: SHAPE_PATH_HEART,
    viewBox: { w: 24, h: 24 },
  },
  {
    id: "diamond",
    name: "معين",
    emoji: "🔷",
    path: SHAPE_PATH_DIAMOND,
    viewBox: { w: 24, h: 24 },
  },
  {
    id: "hexagon",
    name: "سداسي",
    emoji: "⬡",
    path: SHAPE_PATH_HEXAGON,
    viewBox: { w: 24, h: 24 },
  },
  {
    id: "shield",
    name: "درع",
    emoji: "🛡️",
    path: SHAPE_PATH_SHIELD,
    viewBox: { w: 24, h: 24 },
  },
  {
    id: "arrow",
    name: "سهم",
    emoji: "➡️",
    path: SHAPE_PATH_ARROW,
    viewBox: { w: 24, h: 24 },
  },
];

export function getShapePath(id: string): string | undefined {
  return VECTOR_SHAPES.find((s) => s.id === id)?.path;
}
