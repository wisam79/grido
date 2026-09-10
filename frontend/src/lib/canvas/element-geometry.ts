import { CanvasElement } from "@/lib/store/types";

export interface VisualBox {
  /** أصغر إحداثي سيني مرئي بالبكسل */
  minX: number;
  /** أكبر إحداثي سيني مرئي بالبكسل */
  maxX: number;
  /** أصغر إحداثي صادي مرئي بالبكسل */
  minY: number;
  /** أكبر إحداثي صادي مرئي بالبكسل */
  maxY: number;
  /** العرض المرئي الفعلي بالبكسل */
  width: number;
  /** الارتفاع المرئي الفعلي بالبكسل */
  height: number;
  /** المركز السيني المرئي بالبكسل */
  centerX: number;
  /** المركز الصادي المرئي بالبكسل */
  centerY: number;
  /** الإزاحة الأفقية من أصل العقدة (node.x) إلى minX */
  offsetX: number;
  /** الإزاحة الرأسية من أصل العقدة (node.y) إلى minY */
  offsetY: number;
}

export interface NormalizedVisualBox {
  /** أصغر إحداثي سيني مرئي منسوباً لعرض الكانفس (0..1) */
  x: number;
  /** أصغر إحداثي صادي مرئي منسوباً لارتفاع الكانفس (0..1) */
  y: number;
  /** العرض المرئي الفعلي منسوباً لعرض الكانفس */
  width: number;
  /** الارتفاع المرئي الفعلي منسوباً لارتفاع الكانفس */
  height: number;
  /** المركز السيني المرئي منسوباً لعرض الكانفس */
  centerX: number;
  /** المركز الصادي المرئي منسوباً لارتفاع الكانفس */
  centerY: number;
  /** الإزاحة الأفقية النسبية من أصل العنصر إلى x */
  offsetX: number;
  /** الإزاحة الرأسية النسبية من أصل العنصر إلى y */
  offsetY: number;
}

/**
 * تحسب الصندوق المحيط المرئي (AABB) لعنصر مستطيل بزاوية دوران معينة في فضاء البكسل.
 * أصل الدوران هو (x, y) في Konva عندما تكون offsetX=0 و offsetY=0.
 */
export function getElementPixelVisualBox(
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDeg: number = 0
): VisualBox {
  const rot = ((rotationDeg % 360) + 360) % 360;
  if (Math.abs(rot) < 0.0001 || Math.abs(rot - 360) < 0.0001) {
    return {
      minX: x,
      maxX: x + width,
      minY: y,
      maxY: y + height,
      width,
      height,
      centerX: x + width / 2,
      centerY: y + height / 2,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const x1 = x;
  const y1 = y;
  const x2 = x + width * cos;
  const y2 = y + width * sin;
  const x3 = x + width * cos - height * sin;
  const y3 = y + width * sin + height * cos;
  const x4 = x - height * sin;
  const y4 = y + height * cos;

  const minX = Math.min(x1, x2, x3, x4);
  const maxX = Math.max(x1, x2, x3, x4);
  const minY = Math.min(y1, y2, y3, y4);
  const maxY = Math.max(y1, y2, y3, y4);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    offsetX: minX - x,
    offsetY: minY - y,
  };
}

/**
 * تحسب الصندوق المحيط المرئي النسبي لعنصر (0..1) مع مراعاة نسبة أبعاد الكانفس في الدوران.
 */
export function getElementVisualBox(
  element: Pick<CanvasElement, "x" | "y" | "width" | "height"> & { rotation?: number },
  canvasWidth: number,
  canvasHeight: number
): NormalizedVisualBox {
  const cw = canvasWidth > 0 ? canvasWidth : 1;
  const ch = canvasHeight > 0 ? canvasHeight : 1;
  const px = element.x * cw;
  const py = element.y * ch;
  const pw = element.width * cw;
  const ph = element.height * ch;
  const pBox = getElementPixelVisualBox(px, py, pw, ph, element.rotation || 0);

  return {
    x: pBox.minX / cw,
    y: pBox.minY / ch,
    width: pBox.width / cw,
    height: pBox.height / ch,
    centerX: pBox.centerX / cw,
    centerY: pBox.centerY / ch,
    offsetX: pBox.offsetX / cw,
    offsetY: pBox.offsetY / ch,
  };
}

/**
 * تحسب موضع الأصل الجديد (x, y) عند تغيير زاوية التدوير للحفاظ على ثبات مركز العنصر المرئي في مكانه.
 */
export function rotateElementAroundCenter(
  element: Pick<CanvasElement, "x" | "y" | "width" | "height"> & { rotation?: number },
  newRotationDeg: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const currentRot = element.rotation || 0;
  const normalizedNew = ((newRotationDeg % 360) + 360) % 360;
  const normalizedCur = ((currentRot % 360) + 360) % 360;
  if (Math.abs(normalizedNew - normalizedCur) < 0.0001) {
    return { x: element.x, y: element.y };
  }

  const cw = canvasWidth > 0 ? canvasWidth : 1;
  const ch = canvasHeight > 0 ? canvasHeight : 1;
  const w = element.width * cw;
  const h = element.height * ch;
  const x0 = element.x * cw;
  const y0 = element.y * ch;

  // المركز المرئي الحالي بالبكسل
  const curRad = (normalizedCur * Math.PI) / 180;
  const curCos = Math.cos(curRad);
  const curSin = Math.sin(curRad);
  const cx = x0 + (w * curCos - h * curSin) / 2;
  const cy = y0 + (w * curSin + h * curCos) / 2;

  // أصل العقدة الجديد اللازم للحفاظ على نفس المركز (cx, cy) عند الزاوية الجديدة
  const newRad = (normalizedNew * Math.PI) / 180;
  const newCos = Math.cos(newRad);
  const newSin = Math.sin(newRad);
  const newX0 = cx - (w * newCos - h * newSin) / 2;
  const newY0 = cy - (w * newSin + h * newCos) / 2;

  return {
    x: newX0 / cw,
    y: newY0 / ch,
  };
}
