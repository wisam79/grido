/**
 * حدود بيانات مسار SVG — مصدر واحد للحقيقة يتشاركه محرّك الرسم (عقدة Konva)،
 * ومسار التصدير الاحتياطي، وتحويل الأشكال إلى مسارات للدمج المنطقي.
 *
 * كان كل موضع يحسب الحدود بطريقة مختلفة: العقدة بنقاط التحكم (تُصغّر الشكل لأن
 * نقاط تحكم Bézier قد تخرج عن منحناه)، والتصدير الاحتياطي بـ viewBox ثابت 24×24
 * (فيُخطئ المقياس خطأً جسيماً لأي مسار خارج كتالوج الأشكال). التوحيد هنا على
 * الصندوق المحكم يجعل المعاينة والتصدير والدمج متطابقة.
 */
import { pathFromPathData } from 'path-bool';

import { getShapeByPath } from '@/lib/io/shape-catalog';

import { normalizeSegments, segmentsBounds } from './path-geometry';

export interface SvgPathBounds {
  w: number;
  h: number;
  /** أدنى إحداثي داخل المسار — يلزم لإزاحة الرسم ليملأ صندوق العنصر */
  minX: number;
  minY: number;
}

const FALLBACK_BOUNDS: SvgPathBounds = { w: 24, h: 24, minX: 0, minY: 0 };

/**
 * سقف الكاش: المسارات المدموجة سلاسل طويلة (كيلوبايتات) وتُولَّد بكثرة في
 * جلسة التحرير، فالكاش غير المحدود كان يسرّب ذاكرة. الإخلاء FIFO ببساطة.
 */
const CACHE_LIMIT = 200;
const boundsCache = new Map<string, SvgPathBounds>();

function computeBounds(pathStr: string): SvgPathBounds {
  // أشكال الكتالوج مرسومة في إطار مرجعي معلوم — نأخذه كما هو حتى لا يتغير
  // مقاس أي شكل موجود في المستندات المحفوظة
  const def = getShapeByPath(pathStr);
  if (def?.viewBox) {
    return { w: def.viewBox.w, h: def.viewBox.h, minX: 0, minY: 0 };
  }
  try {
    const segs = normalizeSegments(pathFromPathData(pathStr));
    const box = segmentsBounds(segs);
    if (!box) return FALLBACK_BOUNDS;
    return { w: box.w, h: box.h, minX: box.minX, minY: box.minY };
  } catch {
    return FALLBACK_BOUNDS;
  }
}

export function getSvgPathBounds(pathStr: string): SvgPathBounds {
  if (!pathStr) return FALLBACK_BOUNDS;
  const cached = boundsCache.get(pathStr);
  if (cached) return cached;

  const bounds = computeBounds(pathStr);
  if (boundsCache.size >= CACHE_LIMIT) {
    const oldest = boundsCache.keys().next().value;
    if (oldest !== undefined) boundsCache.delete(oldest);
  }
  boundsCache.set(pathStr, bounds);
  return bounds;
}
