/**
 * lib/canvas/units — المصدر الوحيد لوحدات القياس وتحويلات px/mm
 * (كان التفرع `if(unit===...)` مكرراً في 4 ملفات بدقة غير متسقة،
 * و`RulerUnit` معرّفاً مرتين، وصيغة `/25.4` مبعثرة في ~10 ملفات).
 */

export type RulerUnit = "mm" | "cm" | "in" | "px";

export const MM_PER_INCH = 25.4;
export const DEFAULT_DPI = 300;

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

export function mmToPx(mm: number, dpi: number): number {
  return (mm * dpi) / MM_PER_INCH;
}

/** تنسيق قيمة مليمترية بوحدة العرض (الدقة موحدة: mm عشر واحد، cm/in عشران). */
export function formatMm(mm: number, unit: Exclude<RulerUnit, "px">): string {
  if (unit === "cm") return `${(mm / 10).toFixed(1)} cm`;
  if (unit === "in") return `${(mm / MM_PER_INCH).toFixed(2)} in`;
  return `${mm.toFixed(1)} mm`;
}

/** تنسيق أبعاد الكانفس `عرض × ارتفاع` بأي وحدة من بكسلات الكانفس والدقة. */
export function formatDimensions(
  canvasWidthPx: number,
  canvasHeightPx: number,
  dpi: number,
  unit: RulerUnit
): string {
  if (unit === "px") {
    return `${Math.round(canvasWidthPx)} × ${Math.round(canvasHeightPx)} px`;
  }
  const wMM = pxToMm(canvasWidthPx, dpi);
  const hMM = pxToMm(canvasHeightPx, dpi);
  if (unit === "cm") return `${(wMM / 10).toFixed(1)} × ${(hMM / 10).toFixed(1)} cm`;
  if (unit === "in")
    return `${(wMM / MM_PER_INCH).toFixed(2)} × ${(hMM / MM_PER_INCH).toFixed(2)} in`;
  return `${wMM.toFixed(1)} × ${hMM.toFixed(1)} mm`;
}

/**
 * شارة قياس الخط الإرشادي (منقولة من editor-canvas formatGuideMeasurement
 * ليعاد استخدامها بدل النسخ).
 */
export function formatGuideMeasurement(
  relPos: number,
  isH: boolean,
  unit: RulerUnit,
  widthMM: number,
  heightMM: number,
  canvasWidth: number,
  canvasHeight: number
): string {
  const clamped = Math.min(1, Math.max(0, relPos));
  if (unit === "px") {
    const px = Math.round(clamped * (isH ? canvasHeight : canvasWidth));
    return `${px} px`;
  }
  if (unit === "cm") {
    const cm = ((clamped * (isH ? heightMM : widthMM)) / 10).toFixed(2);
    return `${cm} cm`;
  }
  if (unit === "in") {
    const inch = ((clamped * (isH ? heightMM : widthMM)) / MM_PER_INCH).toFixed(2);
    return `${inch} in`;
  }
  const mm = (clamped * (isH ? heightMM : widthMM)).toFixed(1);
  return `${mm} mm`;
}

export interface PaperSizeLike {
  id: string;
  widthMM: number;
  heightMM: number;
}

/** مطابقة ورقة من الأبعاد المليمترية (تقبل التدوير) — كانت مكررة في 3 ملفات. */
export function findPaperByMm<T extends PaperSizeLike>(
  wMM: number,
  hMM: number,
  papers: T[]
): T | undefined {
  const w = Math.round(wMM);
  const h = Math.round(hMM);
  return papers.find(
    (p) => (p.widthMM === w && p.heightMM === h) || (p.widthMM === h && p.heightMM === w)
  );
}

/** مليمترات الكانفس الحالية من بكسلاته والدقة (موحدة التقريب). */
export function canvasMm(
  canvasWidthPx: number,
  canvasHeightPx: number,
  dpi: number
): { wMM: number; hMM: number } {
  return {
    wMM: Math.round(pxToMm(canvasWidthPx, dpi)),
    hMM: Math.round(pxToMm(canvasHeightPx, dpi)),
  };
}
