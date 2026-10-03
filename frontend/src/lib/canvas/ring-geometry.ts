/**
 * هندسة شكل الحلقة (ring) — مصدر واحد للحقيقة.
 *
 * كان نصف القطر الداخلي يُحسم بأربعة أرقام مختلفة (نصف قطر خارجي في Konva،
 * و20 ثابتاً في لوحة الخصائص، و|| في التصدير، وقيمة أولية من slice أخرى)،
 * فيظهر التصدير والمعاينة مختلفين وتنقلب الحلقة إلى فراغ إذا تجاوزت القيمة
 * الحد الأقصى (KonvaRing لا يرسم شيئاً عند innerRadius > outerRadius).
 */

/** نسبة نصف القطر الداخلي من الضلع الأقصر — مرجع القيمة الافتراضية */
export const RING_INNER_RATIO = 0.25;

/** الحد الأدنى المسموح — يمنع انهيار الحلقة إلى نقطة/خط */
const RING_INNER_MIN = 1;

/** فرق لا يقل عن بكسل واحد بين الداخلي والخارجي حتى يبقى للحلقة سماكة */
const RING_MIN_THICKNESS = 1;

export function ringOuterRadius(widthPx: number, heightPx: number): number {
  return Math.min(widthPx, heightPx) / 2;
}

/** أعلى قيمة مسموحة للسلايدر: أقل من نصف القطر الخارجي دائماً */
export function ringInnerRadiusMax(widthPx: number, heightPx: number): number {
  return Math.max(
    RING_INNER_MIN,
    Math.floor(ringOuterRadius(widthPx, heightPx)) - RING_MIN_THICKNESS,
  );
}

/**
 * يحلّ نصف القطر الداخلي الفعلي: القيمة المخزَّنة إن وُجدت وإلا الافتراضي،
 * مع حبسها ضمن [min, max] حتى يبقى الرسم متطابقاً بين المعاينة والتصدير.
 */
export function resolveRingInnerRadius(
  stored: number | undefined,
  widthPx: number,
  heightPx: number,
): number {
  const max = ringInnerRadiusMax(widthPx, heightPx);
  const fallback = Math.round(Math.min(widthPx, heightPx) * RING_INNER_RATIO);
  const value = stored ?? fallback;
  if (!Number.isFinite(value)) return Math.min(fallback, max);
  return Math.max(RING_INNER_MIN, Math.min(Math.round(value), max));
}
