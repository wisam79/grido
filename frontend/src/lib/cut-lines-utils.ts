export interface CutLineMM {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isBottomEnd?: boolean;
}

export interface CalculateCutLinesParams {
  mode: "single" | "collage";
  cols: number;
  rows?: number;
  actualCopies: number;
  imageWidthMM: number;
  imageHeightMM: number;
  gapMM: number;
  effectiveMarginMM: number;
  availableWidthMM: number;
  availableHeightMM: number;
  paperWidth: number;
  paperHeight: number;
  showEndCutLine?: boolean;
  slots?: any[];
  collageMargin?: number;
  collageGap?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  hasPhysical?: boolean;
}

/**
 * دالة موحدة لحساب إحداثيات خطوط القص بالمليمتر على ورقة الطباعة.
 * تضمن المطابقة التامة بين معاينة الواجهة (PrintPreview) والمخرجات في Go Backend.
 */
export function calculatePrintCutLines(params: CalculateCutLinesParams): CutLineMM[] {
  const {
    mode,
    cols,
    actualCopies,
    imageWidthMM,
    imageHeightMM,
    gapMM,
    effectiveMarginMM,
    availableWidthMM,
    availableHeightMM,
    paperWidth,
    paperHeight,
    showEndCutLine = true,
    slots,
    collageMargin = 0,
    collageGap = 0,
    canvasWidth = 2480,
    canvasHeight = 3508,
    hasPhysical = false,
  } = params;

  const cutLines: CutLineMM[] = [];
  const safeCols = Math.max(1, cols);
  const actualRows = Math.max(1, Math.ceil(actualCopies / safeCols));
  const gridWidth = safeCols * imageWidthMM + Math.max(0, safeCols - 1) * gapMM;
  const gridHeight = actualRows * imageHeightMM + Math.max(0, actualRows - 1) * gapMM;
  const offsetX = effectiveMarginMM + Math.max(0, availableWidthMM - gridWidth) / 2;
  const offsetY = effectiveMarginMM + Math.max(0, availableHeightMM - gridHeight) / 2;

  // 🧩 فرع الكولاج: الاعتماد على الإحداثيات الفعلية للخلايا (slots)
  if (mode === "collage" && slots && slots.length > 0) {
    const colLefts = new Set<number>();
    const colRights = new Set<number>();
    const rowTops = new Set<number>();
    const rowBottoms = new Set<number>();

    const scalePxToMM = imageWidthMM / Math.max(1, canvasWidth);
    const marginPx = hasPhysical ? 0 : collageMargin;
    const gapPx = hasPhysical ? 0 : collageGap;
    const availWMM = imageWidthMM - 2 * (marginPx * scalePxToMM);
    const availHMM = imageHeightMM - 2 * (marginPx * scalePxToMM);
    const gapMM_cut = gapPx * scalePxToMM;

    for (let i = 0; i < actualCopies; i++) {
      const col = i % safeCols;
      const row = Math.floor(i / safeCols);
      const blockXMM = offsetX + col * (imageWidthMM + gapMM);
      const blockYMM = offsetY + row * (imageHeightMM + gapMM);

      for (const slot of slots) {
        if (!slot.imageSrc && (slot.w <= 0 || slot.h <= 0)) continue;
        const left = blockXMM + marginPx * scalePxToMM + slot.x * availWMM + gapMM_cut / 2;
        const top = blockYMM + marginPx * scalePxToMM + slot.y * availHMM + gapMM_cut / 2;
        const right = left + slot.w * availWMM - gapMM_cut;
        const bottom = top + slot.h * availHMM - gapMM_cut;

        colLefts.add(Math.round(left * 100) / 100);
        colRights.add(Math.round(right * 100) / 100);
        rowTops.add(Math.round(top * 100) / 100);
        rowBottoms.add(Math.round(bottom * 100) / 100);
      }
    }

    const sortedLefts = Array.from(colLefts).sort((a, b) => a - b);
    const sortedRights = Array.from(colRights).sort((a, b) => a - b);
    const sortedTops = Array.from(rowTops).sort((a, b) => a - b);
    const sortedBottoms = Array.from(rowBottoms).sort((a, b) => a - b);

    if (sortedLefts.length > 0 && sortedTops.length > 0) {
      const xCutLines: number[] = [];
      xCutLines.push(Math.max(0, sortedLefts[0] - gapMM_cut / 2));
      for (let i = 0; i < sortedRights.length - 1; i++) {
        const midX = (sortedRights[i] + sortedLefts[i + 1]) / 2;
        xCutLines.push(midX);
      }
      xCutLines.push(Math.min(paperWidth, sortedRights[sortedRights.length - 1] + gapMM_cut / 2));

      const yCutLines: number[] = [];
      yCutLines.push(Math.max(0, sortedTops[0] - gapMM_cut / 2));
      for (let i = 0; i < sortedBottoms.length - 1; i++) {
        const midY = (sortedBottoms[i] + sortedTops[i + 1]) / 2;
        yCutLines.push(midY);
      }
      const gridBottomY = Math.min(paperHeight, sortedBottoms[sortedBottoms.length - 1] + gapMM_cut / 2);
      yCutLines.push(gridBottomY);

      const minX = xCutLines[0];
      const maxX = xCutLines[xCutLines.length - 1];
      const minY = yCutLines[0];
      const maxY = yCutLines[yCutLines.length - 1];

      for (const x of xCutLines) {
        cutLines.push({
          x1: Math.min(paperWidth, Math.max(0, x)),
          y1: Math.min(paperHeight, Math.max(0, minY)),
          x2: Math.min(paperWidth, Math.max(0, x)),
          y2: Math.min(paperHeight, Math.max(0, maxY)),
        });
      }

      for (let i = 0; i < yCutLines.length; i++) {
        const y = yCutLines[i];
        const isBottomEnd = i === yCutLines.length - 1;
        if (isBottomEnd && !showEndCutLine) continue;
        const lineMinX = isBottomEnd ? 0 : minX;
        const lineMaxX = isBottomEnd ? paperWidth : maxX;
        cutLines.push({
          x1: Math.min(paperWidth, Math.max(0, lineMinX)),
          y1: Math.min(paperHeight, Math.max(0, y)),
          x2: Math.min(paperWidth, Math.max(0, lineMaxX)),
          y2: Math.min(paperHeight, Math.max(0, y)),
          isBottomEnd,
        });
      }

      return cutLines;
    }
  }

  // 🖼️ الوضع الافتراضي (الوضع الحر single أو كولاج بدون خلايا)
  const xCutLines: number[] = [];
  xCutLines.push(Math.max(0, offsetX));
  for (let c = 1; c < safeCols; c++) {
    const cx = offsetX + c * (imageWidthMM + gapMM) - gapMM / 2;
    if (cx > 0 && cx < paperWidth) {
      xCutLines.push(cx);
    }
  }
  xCutLines.push(Math.min(paperWidth, offsetX + gridWidth));

  const yCutLines: number[] = [];
  yCutLines.push(Math.max(0, offsetY));
  for (let r = 1; r < actualRows; r++) {
    const cy = offsetY + r * (imageHeightMM + gapMM) - gapMM / 2;
    if (cy > 0 && cy < paperHeight) {
      yCutLines.push(cy);
    }
  }
  const gridBottomY = Math.min(paperHeight, offsetY + gridHeight);
  yCutLines.push(gridBottomY);

  const minX = xCutLines[0];
  const maxX = xCutLines[xCutLines.length - 1];
  const minY = yCutLines[0];
  const maxY = yCutLines[yCutLines.length - 1];

  for (const x of xCutLines) {
    cutLines.push({
      x1: Math.min(paperWidth, Math.max(0, x)),
      y1: Math.min(paperHeight, Math.max(0, minY)),
      x2: Math.min(paperWidth, Math.max(0, x)),
      y2: Math.min(paperHeight, Math.max(0, maxY)),
    });
  }

  for (let i = 0; i < yCutLines.length; i++) {
    const y = yCutLines[i];
    const isBottomEnd = i === yCutLines.length - 1;
    if (isBottomEnd && !showEndCutLine) continue;
    const lineMinX = isBottomEnd ? 0 : minX;
    const lineMaxX = isBottomEnd ? paperWidth : maxX;
    cutLines.push({
      x1: Math.min(paperWidth, Math.max(0, lineMinX)),
      y1: Math.min(paperHeight, Math.max(0, y)),
      x2: Math.min(paperWidth, Math.max(0, lineMaxX)),
      y2: Math.min(paperHeight, Math.max(0, y)),
      isBottomEnd,
    });
  }

  return cutLines;
}
