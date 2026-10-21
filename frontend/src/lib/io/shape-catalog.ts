/**
 * shape-catalog.ts — المصدر الوحيد لكل أشكال المحرر.
 *
 * كان تعريف الأشكال مكرراً في أربعة مواضع (قائمة toolbar وشبكة التحرير الحر
 * وقائمة svg-paths ومفتاح أيقونات الخصائص) فيظهر شكلاً في واجهة ويغيب عن أخرى.
 * الآن: هذا الكتالوج يستهلكه شريط الإضافة، وشبكة العناصر السريعة، ومعاينة
 * الخصائص (ShapeGlyph)، وبحث أبعاد العرض في عقدة Konva والتصدير الاحتياطي.
 *
 * كل مسارات `kind: 'path'` مرسومة في إطار 24×24 (نفس مرجع svg-paths.ts).
 */
import {
  SHAPE_PATH_TRIANGLE,
  SHAPE_PATH_HEART,
  SHAPE_PATH_DIAMOND,
  SHAPE_PATH_HEXAGON,
  SHAPE_PATH_SHIELD,
  SHAPE_PATH_ARROW,
  SHAPE_PATH_ARROW_LEFT,
  SHAPE_PATH_ARROW_UP,
  SHAPE_PATH_ARROW_DOUBLE,
  SHAPE_PATH_ARROW_CURVED,
  SHAPE_PATH_PENTAGON,
  SHAPE_PATH_OCTAGON,
  SHAPE_PATH_CROSS,
  SHAPE_PATH_PARALLELOGRAM,
  SHAPE_PATH_TRAPEZOID,
  SHAPE_PATH_SEMICIRCLE,
  SHAPE_PATH_SPEECH,
  SHAPE_PATH_CLOUD,
  SHAPE_PATH_BOLT,
  SHAPE_PATH_SPARKLE,
  SHAPE_PATH_CROWN,
  SHAPE_PATH_BOOKMARK,
  SHAPE_PATH_BURST,
} from './svg-paths';

import type { ShapeElement } from '@/lib/store/types';

export type ShapeKind = ShapeElement['shape'];
export type ShapeCategoryId = 'geometric' | 'arrows' | 'symbols';

export interface ShapeCatalogItem {
  id: string;
  label: string;
  kind: ShapeKind;
  category: ShapeCategoryId;
  /** مسار SVG — لأشكال kind='path' فقط */
  path?: string;
  viewBox?: { w: number; h: number };
  /** نسبة العرض/الارتفاع عند الإدراج (الافتراضي 1 = مربع) */
  aspect?: number;
  /** تظهر في شبكة الإدراج السريع (التحرير الحر) */
  quickAccess?: boolean;
  /** خصائص ابتدائية تُدمج فوق القيم الافتراضية عند الإدراج */
  defaults?: Partial<ShapeElement>;
}

export const SHAPE_CATEGORIES: Array<{ id: ShapeCategoryId; label: string }> = [
  { id: 'geometric', label: 'أشكال هندسية' },
  { id: 'arrows', label: 'أسهم' },
  { id: 'symbols', label: 'رموز وشارات' },
];

/** مُنشئ عنصر مسار — يوحّد إطار العرض 24×24 فلا يتكرر في كل سطر */
function pathShape(
  id: string,
  label: string,
  path: string,
  category: ShapeCategoryId,
  extra: Partial<ShapeCatalogItem> = {},
): ShapeCatalogItem {
  return { id, label, kind: 'path', path, category, viewBox: { w: 24, h: 24 }, ...extra };
}

export const SHAPE_CATALOG: ShapeCatalogItem[] = [
  // ── أشكال هندسية ────────────────────────────────────────────────
  { id: 'rect', label: 'مستطيل', kind: 'rect', category: 'geometric', quickAccess: true },
  {
    id: 'ellipse',
    label: 'دائرة / بيضوي',
    kind: 'ellipse',
    category: 'geometric',
    quickAccess: true,
  },
  pathShape('triangle', 'مثلث', SHAPE_PATH_TRIANGLE, 'geometric', { quickAccess: true }),
  pathShape('diamond', 'معيّن', SHAPE_PATH_DIAMOND, 'geometric', { quickAccess: true }),
  pathShape('pentagon', 'خماسي', SHAPE_PATH_PENTAGON, 'geometric'),
  pathShape('hexagon', 'مسدس', SHAPE_PATH_HEXAGON, 'geometric', { quickAccess: true }),
  pathShape('octagon', 'ثماني', SHAPE_PATH_OCTAGON, 'geometric'),
  pathShape('cross', 'صليب / زائد', SHAPE_PATH_CROSS, 'geometric', { quickAccess: true }),
  pathShape('parallelogram', 'متوازي أضلاع', SHAPE_PATH_PARALLELOGRAM, 'geometric', {
    aspect: 1.4,
  }),
  pathShape('trapezoid', 'شبه منحرف', SHAPE_PATH_TRAPEZOID, 'geometric', { aspect: 1.5 }),
  pathShape('semicircle', 'نصف دائرة', SHAPE_PATH_SEMICIRCLE, 'geometric', {
    aspect: 1.8,
    quickAccess: true,
  }),
  { id: 'line', label: 'خط', kind: 'line', category: 'geometric', quickAccess: true },
  {
    id: 'ring',
    label: 'حلقة',
    kind: 'ring',
    category: 'geometric',
    quickAccess: true,
  },
  {
    id: 'arc',
    label: 'قوس حلقي',
    kind: 'arc',
    category: 'geometric',
    quickAccess: true,
  },
  {
    id: 'wedge',
    label: 'قطاع دائري',
    kind: 'wedge',
    category: 'geometric',
    quickAccess: true,
  },
  {
    id: 'polygon',
    label: 'مضلع منتظم',
    kind: 'polygon',
    category: 'geometric',
    quickAccess: true,
    defaults: { sides: 6 },
  },
  {
    id: 'star',
    label: 'نجمة',
    kind: 'star',
    category: 'geometric',
    quickAccess: true,
    defaults: { starPoints: 5 },
  },

  // ── أسهم ────────────────────────────────────────────────────────
  { id: 'arrow', label: 'سهم خطي', kind: 'arrow', category: 'arrows', quickAccess: true },
  {
    id: 'arrow-double',
    label: 'سهم مزدوج',
    kind: 'arrow',
    category: 'arrows',
    quickAccess: true,
    defaults: { pointerAtBeginning: true },
  },
  pathShape('block-arrow', 'سهم عريض', SHAPE_PATH_ARROW, 'arrows', {
    aspect: 1.5,
    quickAccess: true,
  }),
  pathShape('block-arrow-left', 'سهم عريض يسار', SHAPE_PATH_ARROW_LEFT, 'arrows', {
    aspect: 1.5,
  }),
  pathShape('block-arrow-up', 'سهم عريض أعلى', SHAPE_PATH_ARROW_UP, 'arrows'),
  pathShape('block-arrow-double', 'سهم عريض مزدوج', SHAPE_PATH_ARROW_DOUBLE, 'arrows', {
    aspect: 1.8,
  }),
  pathShape('curved-arrow', 'سهم منحنٍ', SHAPE_PATH_ARROW_CURVED, 'arrows', {
    aspect: 1.2,
    quickAccess: true,
  }),

  // ── رموز وشارات ────────────────────────────────────────────────
  pathShape('heart', 'قلب', SHAPE_PATH_HEART, 'symbols', { quickAccess: true }),
  pathShape('shield', 'درع', SHAPE_PATH_SHIELD, 'symbols', { quickAccess: true }),
  pathShape('cloud', 'سحابة', SHAPE_PATH_CLOUD, 'symbols', { aspect: 1.5, quickAccess: true }),
  pathShape('bolt', 'صاعقة', SHAPE_PATH_BOLT, 'symbols', { quickAccess: true }),
  pathShape('burst', 'شارة شمسية', SHAPE_PATH_BURST, 'symbols', { quickAccess: true }),
  pathShape('sparkle', 'بريق', SHAPE_PATH_SPARKLE, 'symbols', { quickAccess: true }),
  pathShape('crown', 'تاج', SHAPE_PATH_CROWN, 'symbols', { aspect: 1.2 }),
  pathShape('speech', 'فقاعة حوار', SHAPE_PATH_SPEECH, 'symbols', { aspect: 1.3 }),
  pathShape('bookmark', 'علامة مرجعية', SHAPE_PATH_BOOKMARK, 'symbols', { aspect: 0.7 }),
];

/** أشكال الإدراج السريع — نفس الكتالوج، لا قائمة ثانية تُصان يدوياً */
export const QUICK_SHAPES = SHAPE_CATALOG.filter((s) => s.quickAccess);

export function shapesInCategory(category: ShapeCategoryId): ShapeCatalogItem[] {
  return SHAPE_CATALOG.filter((s) => s.category === category);
}

/** بحث بمسار SVG — يخدم حساب أبعاد العرض في عقدة Konva والتصدير الاحتياطي */
const byPath = new Map<string, ShapeCatalogItem>();
for (const item of SHAPE_CATALOG) {
  if (item.path) byPath.set(item.path, item);
}

export function getShapeByPath(path: string): ShapeCatalogItem | undefined {
  return byPath.get(path);
}
