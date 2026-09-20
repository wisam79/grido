/* ═══════════════════════════════════════════════════════════════
   منطق الزوم الوحيد للمحرر.

   كانت حدود الزوم (0.1 – 5) وخطوته (0.1) والتقريب العشري مكرّرة في
   خمسة أماكن: اختصارات لوحة المفاتيح، أوامر لوحة الأوامر، شريط العرض،
   قائمة سطح المكتب، وعجلة الفأرة المركزية. أي تعديل على حد واحد كان
   يترك البقية متأخرة عنه — فجُمع الجميع هنا.
   ═══════════════════════════════════════════════════════════════ */

/** أدنى نسبة زوم مسموحة */
export const ZOOM_MIN = 0.1;
/** أقصى نسبة زوم مسموحة */
export const ZOOM_MAX = 5;
/** خطوة الزوم لأزرار واختصارات التكبير/التصغير */
export const ZOOM_STEP = 0.1;
/** الحجم الفعلي 100% */
export const ZOOM_DEFAULT = 1;

/** تقريب آمن لخطوات الزوم العشرية (يمنع 0.30000000000000004) */
export function roundZoom(zoom: number): number {
  return parseFloat(zoom.toFixed(2));
}

/** حصر زوم متصل (عجلة الفأرة/القرص) داخل الحدود بلا تقريب */
export function clampZoomRaw(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** حصر خطوة زوم ثابتة داخل الحدود مع التقريب العشري */
export function clampZoom(zoom: number): number {
  return clampZoomRaw(roundZoom(zoom));
}

/** زوم بخطوة واحدة: direction = 1 تكبير، -1 تصغير */
export function stepZoom(zoom: number, direction: 1 | -1, steps = 1): number {
  return clampZoom(zoom + direction * ZOOM_STEP * steps);
}

/** هل ما زال هناك مجال للتكبير؟ — لتعطيل الأزرار والأوامر عند الحد */
export function canZoomIn(zoom: number): boolean {
  return zoom < ZOOM_MAX;
}

/** هل ما زال هناك مجال للتصغير؟ */
export function canZoomOut(zoom: number): boolean {
  return zoom > ZOOM_MIN;
}

/** هل النسبة عند الحجم الفعلي 100%؟ (بهامش أمان للفاصلة العائمة) */
export function isDefaultZoom(zoom: number): boolean {
  return Math.abs(zoom - ZOOM_DEFAULT) < 0.005;
}
