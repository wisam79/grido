/**
 * Gradient Geometry – Single Source of Truth
 * ==========================================
 * هندسة التدرج الخطي في مساحة الكانفاس: إحداثيات نسبية (0-1) للعنصر، وبكسل مطلق
 * بالنسبة للورقة. يشترك فيها المرسم (Konva) والتصدير (Canvas 2D) ومعاينة الطباعة،
 * فلا ينحرف اتجاه التدرج أو امتداده بين ما يُعرض وما يُصدَّر.
 *
 * ⚠️ القاعدة الحاكمة: `gradientPointsFromAngle` تُرجع نسباً (0-1)، أما Konva
 * وCanvas 2D فيفسّران نقطتي التدرج كـ**بكسل محلي** — استخدم `gradientPixelPoints`
 * (أو اضرب في مقاس السطح) وإلا انحصر التدرج في مربع 1px وظهر لوناً مصمتاً.
 */

/** نقطتا التدرج النسبيتان (0-1) حول مركز العنصر من زاوية معطاة */
export function gradientPointsFromAngle(deg: number): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const rad = (deg * Math.PI) / 180;
  const dx = Math.cos(rad) * 0.5;
  const dy = Math.sin(rad) * 0.5;
  return {
    start: { x: 0.5 - dx, y: 0.5 - dy },
    end: { x: 0.5 + dx, y: 0.5 + dy },
  };
}

/** حساب زاوية التدرج من نقطتي البداية/النهاية (0° = يسار→يمين، مع عقارب الساعة) */
export function gradientAngleFromPoints(
  start?: { x: number; y: number },
  end?: { x: number; y: number }
): number {
  const s = start || { x: 0, y: 0 };
  const e = end || { x: 1, y: 1 };
  const deg = (Math.atan2(e.y - s.y, e.x - s.x) * 180) / Math.PI;
  return Math.round(((deg + 360) % 360) * 10) / 10;
}

/** نقطتا التدرج بالبكسل لسطح بمقاس معطى (صيغة Konva وCanvas 2D معاً) */
export function gradientPixelPoints(
  deg: number,
  width: number,
  height: number
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const { start, end } = gradientPointsFromAngle(deg);
  return {
    start: { x: start.x * width, y: start.y * height },
    end: { x: end.x * width, y: end.y * height },
  };
}

/**
 * تحويل زاوية الكانفاس إلى زاوية CSS.
 *
 * الكانفاس (و`gradientPointsFromAngle`) يقيس 0° من **اليسار إلى اليمين** ويدور
 * مع عقارب الساعة، بينما CSS يقيس 0° من **الأسفل إلى الأعلى** — أي فرق 90°.
 * بدون هذا التحويل تُعرض أي معاينة CSS للتدرج (شريحة، معاينة الطباعة) باتجاه
 * عمودي على المتدرج فعلاً في الكانفاس.
 */
export function canvasAngleToCss(deg: number): number {
  return (((deg + 90) % 360) + 360) % 360;
}
