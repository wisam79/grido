/**
 * هندسة القوس المشتركة بين الرسم (curved-text-utils) والقياس (text-fit/export).
 * الفصل هنا يمنع أي انحراف بين ارتفاع الصندوق ومركز القوس المرسوم فعلياً.
 */

export const CURVED_TEXT_MAX_ANGLE = Math.PI * 1.6;

export interface CurvedTextMetrics {
  radius: number;
  angularSpan: number;
  /** أقصى هبوط للحرف الطرفي عن قمة القوس — يحدد ارتفاع الصندوق الطبيعي */
  sagitta: number;
}

export function getCurvedTextMetrics(
  totalTextWidthPx: number,
  boxWidthPx: number,
  fontSize: number,
  curve: number,
): CurvedTextMetrics {
  const normalizedCurve = Math.max(-100, Math.min(100, curve));
  const curvatureRatio = Math.abs(normalizedCurve) / 100;
  const minRadius = Math.max(fontSize * 1.5, Math.max(0, boxWidthPx) * 0.4);
  const maxRadius = Math.max(0, boxWidthPx) * 3.5;
  const radius = Math.max(1, maxRadius - curvatureRatio * (maxRadius - minRadius));
  const angularSpan = Math.min(
    CURVED_TEXT_MAX_ANGLE,
    Math.max(0, totalTextWidthPx) / Math.max(1, radius),
  );
  const sagitta = radius * (1 - Math.cos(angularSpan / 2));
  return { radius, angularSpan, sagitta };
}

/** الارتفاع الطبيعي لكتلة نص مقوّس — ارتفاع السطر + هبوط القوس + سمك الحد. */
export function curvedTextNaturalHeightPx(
  totalTextWidthPx: number,
  boxWidthPx: number,
  fontSize: number,
  curve: number,
  lineHeight = 1.2,
  strokeWidth = 0,
): number {
  const { sagitta } = getCurvedTextMetrics(totalTextWidthPx, boxWidthPx, fontSize, curve);
  const lineBox = fontSize * Math.max(1.2, lineHeight);
  return lineBox + sagitta + Math.max(0, strokeWidth);
}
