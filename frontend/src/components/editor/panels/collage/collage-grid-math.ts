/**
 * حسابات شبكة الكولاج الفوتوغرافي — المقاسات الملموسة، حدود الورقة، ومحاذاة الشبكة.
 * كانت هذه الحسابات مكررة ثلاث مرات داخل custom-collage-card (الحدود، التطبيق، الحفظ).
 *
 * رياضيات المقاسات والـ DPI تأتي من `grid-utils` — المصدر الوحيد الذي يستخدمه
 * مولّد الخلايا الديناميكية في المتجر أيضاً، فلا ينحرف ما يعرضه الباني عن
 * ما يعيد المتجر حسابه عند التطبيق.
 */

import { buildPhysicalGridCellsMM, getEffectiveDpi } from '@/lib/templates';

import type { GridAlignment } from '@/lib/print/print-layout-math';
// إعادة تصدير للمستهلكين الحاليين (arrange-tab، custom-grid-tab) — المصدر الوحيد print-layout-math.
export type { GridAlignment };

export type PhotoGridType =
  | 'stretch'
  | 'passport'
  | 'id'
  | 'visa'
  | 'iq-national-id'
  | 'iq-civil-id'
  | 'iq-general-id'
  | 'iq-transactions';

export interface PhotoDimensions {
  wMM: number;
  hMM: number;
  label: string;
}

/** مقاسات صور الوثائق العراقية المعتمدة بالمليمتر + تسمياتها في الواجهة */
export function getPhotoDimensions(photoType: PhotoGridType): PhotoDimensions {
  switch (photoType) {
    case 'iq-national-id':
    case 'passport':
      return { wMM: 35, hMM: 45, label: 'بطاقة وطنية / جواز' };
    case 'iq-civil-id':
      return { wMM: 32, hMM: 40, label: 'هوية أحوال' };
    case 'iq-general-id':
      return { wMM: 40, hMM: 60, label: 'هوية عامة' };
    case 'iq-transactions':
      return { wMM: 30, hMM: 40, label: 'معاملات' };
    case 'id':
      return { wMM: 35, hMM: 45, label: 'هوية قياسية' };
    case 'visa':
      return { wMM: 35, hMM: 45, label: 'فيزا شنغن' };
    default:
      return { wMM: 35, hMM: 45, label: 'بطاقة وطنية' };
  }
}

/** تحويل قيمة بكسلية على الكانفس إلى مليمتر بنفس DPI الفعلي المستخدم في الخلايا */
function pxToMm(px: number, dpi: number): number {
  return (Math.max(0, px) / dpi) * 25.4;
}

export interface GridLimits {
  maxRows: number;
  maxCols: number;
}

/**
 * أقصى صفوف/أعمدة تتسع في المساحة المتاحة (بعد الهوامش) بمقاس ملموس وفجوة معلومة.
 * حساب الهامش والفجوة هنا يمنع الواجهة من الوعد بشبكة 7×6 ثم يصغّرها المحرك إلى
 * 31.67×39.59 مم عند التطبيق لأن الهوامش لم تكن محسوبة في السعة.
 */
export function getGridLimits(
  photoType: PhotoGridType,
  canvasWidth: number,
  canvasHeight: number,
  storedDpi: number,
  gapPx: number = 0,
  marginPx: number = 0,
): GridLimits {
  if (photoType === 'stretch') {
    return { maxRows: 12, maxCols: 12 };
  }
  const W = canvasWidth || 2480;
  const H = canvasHeight || 3508;
  const dpi = getEffectiveDpi(W, H, storedDpi);
  const { wMM, hMM } = getPhotoDimensions(photoType);
  const gapMM = pxToMm(gapPx, dpi);
  const marginMM = pxToMm(marginPx, dpi);
  const availW = (W / dpi) * 25.4 - 2 * marginMM;
  const availH = (H / dpi) * 25.4 - 2 * marginMM;
  const maxCols = Math.max(1, Math.floor((availW + gapMM) / (wMM + gapMM)));
  const maxRows = Math.max(1, Math.floor((availH + gapMM) / (hMM + gapMM)));
  return { maxRows, maxCols };
}

export interface NormalizedCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * توليد خانات الشبكة الطبيعية (0..1) لمقاس ملموس — نفس رياضيات
 * `computeDynamicCollageCells` (هامش + فجوة + تصغير عند التجاوز)، فما يعرضه
 * الباني هو ما يعيد المتجر حسابه عند التطبيق أو تغيير المسافات.
 */
export function buildPhysicalGridCells(
  photoType: PhotoGridType,
  rows: number,
  cols: number,
  align: GridAlignment,
  canvasWidth: number,
  canvasHeight: number,
  storedDpi: number,
  gapPx: number = 0,
  marginPx: number = 0,
): NormalizedCell[] {
  if (photoType === 'stretch') {
    return buildStretchGridCells(rows, cols);
  }
  const W = canvasWidth || 2480;
  const H = canvasHeight || 3508;
  const dpi = getEffectiveDpi(W, H, storedDpi);
  const { wMM, hMM } = getPhotoDimensions(photoType);
  return buildPhysicalGridCellsMM(
    cols,
    rows,
    wMM,
    hMM,
    pxToMm(gapPx, dpi),
    (W / dpi) * 25.4,
    (H / dpi) * 25.4,
    align,
    pxToMm(marginPx, dpi),
  );
}

/** توليد خانات تمدد حر متساوية تملأ الورقة بالكامل */
export function buildStretchGridCells(rows: number, cols: number): NormalizedCell[] {
  const cellW = 1 / cols;
  const cellH = 1 / rows;
  const cells: NormalizedCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        x: col * cellW,
        y: row * cellH,
        w: cellW,
        h: cellH,
      });
    }
  }
  return cells;
}
