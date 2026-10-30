// هندسة تخطيط ورقة الطباعة — المصدر الوحيد لصيغ الشبكة والخلايا.
//
// كل هذه الحسابات كانت مكررة في: cut-lines-utils.ts، print-dialog.tsx (buildItems
// و buildSingleItems)، و print-preview.tsx — وأي اختلاف بينها كان يعني انحرافاً
// بين المعاينة وورقة الطباعة الفعلية. الآن مستهلك واحد للصيغ.

export type GridAlignment =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'center-left'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

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
  const effectiveCols =
    actualRows === 1 ? Math.max(1, Math.min(safeCols, input.actualCopies)) : safeCols;
  const gridWidth =
    effectiveCols * input.imageWidthMM + Math.max(0, effectiveCols - 1) * input.gapMM;
  const gridHeight = actualRows * input.imageHeightMM + Math.max(0, actualRows - 1) * input.gapMM;

  const align = input.align || 'top-left';
  const remainingW = Math.max(0, input.availableWidthMM - gridWidth);
  const remainingH = Math.max(0, input.availableHeightMM - gridHeight);

  let extraX = 0;
  let extraY = 0;

  if (align === 'top-left' || align === 'center-left' || align === 'bottom-left') {
    extraX = 0;
  } else if (align === 'top-right' || align === 'center-right' || align === 'bottom-right') {
    extraX = remainingW;
  } else {
    // center / top-center / bottom-center
    extraX = remainingW / 2;
  }

  if (align === 'top-left' || align === 'top-center' || align === 'top-right') {
    extraY = 0;
  } else if (align === 'bottom-left' || align === 'bottom-center' || align === 'bottom-right') {
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
// ثابت التكافؤ (parity invariant — RV-Print-26): المحوران مستقلان في كل
// المسارات (المعاينة buildItems/cut-lines هنا، ومسار Go يرسم قيم المليمتر
// حرفياً عبر mmToPx بلا إعادة حساب — print_compose.go). التعليق القديم عن
// «مقياس موحّد في Go» كان عتيقاً وخاطئاً وحُذف — أي توحيد مستقبلي للمقياس
// يجب أن يطال المصادر الثلاثة معاً مع اختبار تكافؤ.
export function computeSlotRectMM(
  block: { xMM: number; yMM: number },
  slot: SlotFractions,
  image: { widthMM: number; heightMM: number },
  margins: { marginXMM: number; marginYMM: number },
  gaps: { gapXMM: number; gapYMM: number },
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

/** Final size of one collage copy; spacing remains in project pixels. */
export interface CollageSlotGeometry {
  canvasWidth: number;
  canvasHeight: number;
  imageWidthMM: number;
  imageHeightMM: number;
  collageMargin: number;
  collageGap: number;
  hasPhysical: boolean;
}

/** Shared by print payloads and export/preflight; physical cells already include spacing. */
export function computeCollageSlotRectMM(
  slot: SlotFractions,
  geometry: CollageSlotGeometry,
  block: { xMM: number; yMM: number } = { xMM: 0, yMM: 0 },
): SlotRectMM {
  const { canvasWidth, canvasHeight, imageWidthMM, imageHeightMM, hasPhysical } = geometry;
  const marginPx = hasPhysical ? 0 : geometry.collageMargin;
  const gapPx = hasPhysical ? 0 : geometry.collageGap;
  const scaleX = imageWidthMM / canvasWidth;
  const scaleY = imageHeightMM / canvasHeight;
  return computeSlotRectMM(
    block,
    slot,
    { widthMM: imageWidthMM, heightMM: imageHeightMM },
    { marginXMM: marginPx * scaleX, marginYMM: marginPx * scaleY },
    { gapXMM: gapPx * scaleX, gapYMM: gapPx * scaleY },
  );
}

// نسبة أبعاد الخانة على الكانفاس (لحساب الاقتصاص cover في Go)
export function computeSlotAspect(
  slot: Pick<SlotFractions, 'w' | 'h'>,
  canvasWidth: number,
  canvasHeight: number,
): number {
  if (slot.h <= 0 || canvasHeight <= 0) return 0;
  return (slot.w * canvasWidth) / (slot.h * canvasHeight);
}

// 🖨️ RV-16-H3: حُذفت calculateOptimalSheetImposition (كانت بلا أي مستدعٍ إنتاجي
// وحقلها rotateItem متعذر رياضياً): مرشح «أفقي + عنصر مدوّر» مكافئ دائماً لـ
// «رأسي + عنصر سليم» في عدد النسخ (تبديل طرفي الورقة والعنصر يلغي بعضهما)،
// فكانت المرشحات المدوّرة لا تزيد شيئاً — والوظيفة تصدّر وعداً (تدوير 90°)
// لا يمكن تحقيقه أصلاً بمقاربة تعداد الشبكات مع اتجاهين حرَّين للورقة.
