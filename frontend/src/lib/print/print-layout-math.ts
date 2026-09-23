// هندسة تخطيط ورقة الطباعة — المصدر الوحيد لصيغ الشبكة والخلايا.
//
// كل هذه الحسابات كانت مكررة في: cut-lines-utils.ts، print-dialog.tsx (buildItems
// و buildSingleItems)، و print-preview.tsx — وأي اختلاف بينها كان يعني انحرافاً
// بين المعاينة وورقة الطباعة الفعلية. الآن مستهلك واحد للصيغ.

export type GridAlignment =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center"
  | "center-left"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface SheetGridInput {
  cols: number;
  actualCopies: number;
  imageWidthMM: number;
  imageHeightMM: number;
  gapMM: number;
  effectiveMarginMM: number;
  availableWidthMM: number;
  availableHeightMM: number;
  align?: GridAlignment;
}

export interface SheetGrid {
  safeCols: number;
  actualRows: number;
  gridWidth: number;
  gridHeight: number;
  offsetX: number;
  offsetY: number;
  cellWidth: number;
  cellHeight: number;
}

// أبعاد شبكة النسخ على الورقة مع محاذاتها وفق نقطة الارتكاز (بالمليمتر)
// المحاذاة الافتراضية هي أعلى اليسار (top-left) للقص السريع المباشر في الاستوديو
export function computeSheetGrid(input: SheetGridInput): SheetGrid {
  const safeCols = Math.max(1, Math.floor(input.cols));
  const actualRows = Math.max(1, Math.ceil(input.actualCopies / safeCols));
  const effectiveCols = actualRows === 1 ? Math.max(1, Math.min(safeCols, input.actualCopies)) : safeCols;
  const gridWidth = effectiveCols * input.imageWidthMM + Math.max(0, effectiveCols - 1) * input.gapMM;
  const gridHeight = actualRows * input.imageHeightMM + Math.max(0, actualRows - 1) * input.gapMM;

  const align = input.align || "top-left";
  const remainingW = Math.max(0, input.availableWidthMM - gridWidth);
  const remainingH = Math.max(0, input.availableHeightMM - gridHeight);

  let extraX = 0;
  let extraY = 0;

  if (align === "top-left" || align === "center-left" || align === "bottom-left") {
    extraX = 0;
  } else if (align === "top-right" || align === "center-right" || align === "bottom-right") {
    extraX = remainingW;
  } else {
    // center / top-center / bottom-center
    extraX = remainingW / 2;
  }

  if (align === "top-left" || align === "top-center" || align === "top-right") {
    extraY = 0;
  } else if (align === "bottom-left" || align === "bottom-center" || align === "bottom-right") {
    extraY = remainingH;
  } else {
    // center / center-left / center-right
    extraY = remainingH / 2;
  }

  const offsetX = input.effectiveMarginMM + extraX;
  const offsetY = input.effectiveMarginMM + extraY;

  return {
    safeCols,
    actualRows,
    gridWidth,
    gridHeight,
    offsetX,
    offsetY,
    cellWidth: input.imageWidthMM + input.gapMM,
    cellHeight: input.imageHeightMM + input.gapMM,
  };
}

export interface BlockPosition {
  col: number;
  row: number;
  xMM: number;
  yMM: number;
}

// موضع ركن كتلة النسخة (رقم النسخة → عمود/صف + إحداثيات بالمليمتر)
export function computeBlockPosition(index: number, grid: SheetGrid): BlockPosition {
  const col = index % grid.safeCols;
  const row = Math.floor(index / grid.safeCols);
  return {
    col,
    row,
    xMM: grid.offsetX + col * grid.cellWidth,
    yMM: grid.offsetY + row * grid.cellHeight,
  };
}

export interface SlotFractions {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SlotRectMM {
  xMM: number;
  yMM: number;
  wMM: number;
  hMM: number;
}

// مستطيل الخانة داخل كتلة النسخة بالمليمتر.
// margins/gaps هما قيمتا الهامش والفجوة محوّلتين إلى المليمتر لكل محور
// (0 في القوالب الفيزيائية physicalLayout حيث تُخبز داخل إحداثيات الخلايا).
// ملاحظة: المحوران مستقلان عمداً — معاينة الكولاج تحسب Y بـ canvasHeight،
// بينما مسار الطباعة الفعلي يستخدم مقياساً موحداً بـ canvasWidth.
export function computeSlotRectMM(
  block: { xMM: number; yMM: number },
  slot: SlotFractions,
  image: { widthMM: number; heightMM: number },
  margins: { marginXMM: number; marginYMM: number },
  gaps: { gapXMM: number; gapYMM: number }
): SlotRectMM {
  const availWMM = image.widthMM - 2 * margins.marginXMM;
  const availHMM = image.heightMM - 2 * margins.marginYMM;
  return {
    xMM: block.xMM + margins.marginXMM + slot.x * availWMM + gaps.gapXMM / 2,
    yMM: block.yMM + margins.marginYMM + slot.y * availHMM + gaps.gapYMM / 2,
    wMM: slot.w * availWMM - gaps.gapXMM,
    hMM: slot.h * availHMM - gaps.gapYMM,
  };
}

// نسبة أبعاد الخانة على الكانفاس (لحساب الاقتصاص cover في Go)
export function computeSlotAspect(
  slot: Pick<SlotFractions, "w" | "h">,
  canvasWidth: number,
  canvasHeight: number
): number {
  if (slot.h <= 0 || canvasHeight <= 0) return 0;
  return (slot.w * canvasWidth) / (slot.h * canvasHeight);
}

export interface OptimalImpositionInput {
  paperWidthMM: number;
  paperHeightMM: number;
  itemWidthMM: number;
  itemHeightMM: number;
  marginMM?: number;
  gapMM?: number;
  bleedMM?: number;
}

export interface OptimalImpositionResult {
  orientation: "portrait" | "landscape";
  rotateItem: boolean;
  paperWidthMM: number;
  paperHeightMM: number;
  cols: number;
  rows: number;
  maxCopies: number;
  gapMM: number;
  marginMM: number;
  bleedMM: number;
  wastePercentage: number;
}

/**
 * حساب المونتاج الأمثل للورقة (N-Up Imposition):
 * يحسب تلقائياً الاتجاه الأنسب للورقة (طولي أو عرضي) وأقصى عدد نسخ متوافقة
 * مع فحص إمكانية تدوير العنصر بـ 90 درجة واحتساب هامش النزيف لتقليل الهدر الورقي في المطابع.
 */
export function calculateOptimalSheetImposition(
  input: OptimalImpositionInput
): OptimalImpositionResult {
  const margin = Math.max(0, input.marginMM ?? 5);
  const gap = Math.max(0, input.gapMM ?? 2);
  const bleed = Math.max(0, input.bleedMM ?? 0);
  const rawItemW = Math.max(1, input.itemWidthMM);
  const rawItemH = Math.max(1, input.itemHeightMM);

  // إذا كان هناك هامش نزيف، فإن مساحة الكارت المطبوعة تتسع بالنزيف
  const itemW = rawItemW + 2 * bleed;
  const itemH = rawItemH + 2 * bleed;

  const minPaper = Math.min(input.paperWidthMM, input.paperHeightMM);
  const maxPaper = Math.max(input.paperWidthMM, input.paperHeightMM);

  interface Candidate {
    orientation: "portrait" | "landscape";
    rotateItem: boolean;
    paperWidthMM: number;
    paperHeightMM: number;
    cols: number;
    rows: number;
    maxCopies: number;
  }

  const evalLayout = (
    orientation: "portrait" | "landscape",
    rotateItem: boolean,
    sheetW: number,
    sheetH: number
  ): Candidate => {
    const effW = rotateItem ? itemH : itemW;
    const effH = rotateItem ? itemW : itemH;
    const availW = sheetW - 2 * margin;
    const availH = sheetH - 2 * margin;
    const cols = availW > 0 ? Math.floor((availW + gap) / (effW + gap)) : 0;
    const rows = availH > 0 ? Math.floor((availH + gap) / (effH + gap)) : 0;
    const maxCopies = Math.max(0, cols) * Math.max(0, rows);
    return {
      orientation,
      rotateItem,
      paperWidthMM: sheetW,
      paperHeightMM: sheetH,
      cols,
      rows,
      maxCopies,
    };
  };

  const candidates: Candidate[] = [
    evalLayout("portrait", false, minPaper, maxPaper),
    evalLayout("landscape", false, maxPaper, minPaper),
  ];

  // ترتيب المرشحين: الأفضل هو الأعلى في عدد النسخ، وفي حال التساوي نفضل الوضع الرأسي الطبيعي
  candidates.sort((a, b) => {
    if (b.maxCopies !== a.maxCopies) return b.maxCopies - a.maxCopies;
    if (a.orientation !== b.orientation) return a.orientation === "portrait" ? -1 : 1;
    return 0;
  });

  const best = candidates[0];
  const totalArea = best.paperWidthMM * best.paperHeightMM;
  const usedArea = best.maxCopies * rawItemW * rawItemH;
  const wastePercentage = Math.max(0, Math.min(100, Math.round((1 - usedArea / totalArea) * 100)));

  return {
    ...best,
    gapMM: gap,
    marginMM: margin,
    bleedMM: bleed,
    wastePercentage,
  };
}
