import type { CollageTemplate } from './types';
import { PAPER_SIZES } from './constants';
export function getEffectiveDpi(W: number, H: number, storedDpi: number = 300): number {
  let dpi = storedDpi;
  outerLoop:
  for (const paper of PAPER_SIZES) {
    for (const [pW, pH] of [
      [paper.widthMM, paper.heightMM],
      [paper.heightMM, paper.widthMM],
    ] as [number, number][]) {
      const expectedW = (pW * storedDpi) / 25.4;
      const expectedH = (pH * storedDpi) / 25.4;
      if (
        Math.abs(W - expectedW) / expectedW < 0.02 &&
        Math.abs(H - expectedH) / expectedH < 0.02
      ) {
        const dpiFromW = (W * 25.4) / pW;
        const dpiFromH = (H * 25.4) / pH;
        dpi = (dpiFromW + dpiFromH) / 2;
        break outerLoop;
      }
    }
  }
  return dpi;
}

function getGridCells(
  cols: number,
  rows: number,
  wMM: number,
  hMM: number,
  gapMM: number,
  paperW: number,
  paperH: number,
  align: string = "center",
  marginMM: number = 4
) {
  const marginX = marginMM;
  const marginY = marginMM;
  const availW = paperW - 2 * marginX;
  const availH = paperH - 2 * marginY;

  const gridW_raw = cols * wMM + (cols - 1) * gapMM;
  const gridH_raw = rows * hMM + (rows - 1) * gapMM;

  let scale = 1;
  const tolerance = 0.15; // 0.15 mm tolerance for floating point rounding
  if (gridW_raw > availW + tolerance || gridH_raw > availH + tolerance) {
    scale = Math.min(availW / gridW_raw, availH / gridH_raw);
  }

  const finalCellW = wMM * scale;
  const finalCellH = hMM * scale;
  const finalGap = gapMM * scale;

  const gridW = cols * finalCellW + (cols - 1) * finalGap;
  const gridH = rows * finalCellH + (rows - 1) * finalGap;

  let startX = (paperW - gridW) / 2;
  let startY = (paperH - gridH) / 2;

  if (align === "top-left") {
    startX = marginX;
    startY = marginY;
  } else if (align === "top-center") {
    startX = (paperW - gridW) / 2;
    startY = marginY;
  } else if (align === "top-right") {
    startX = paperW - marginX - gridW;
    startY = marginY;
  } else if (align === "center-left") {
    startX = marginX;
    startY = (paperH - gridH) / 2;
  } else if (align === "center-right") {
    startX = paperW - marginX - gridW;
    startY = (paperH - gridH) / 2;
  } else if (align === "bottom-left") {
    startX = marginX;
    startY = paperH - marginY - gridH;
  } else if (align === "bottom-center") {
    startX = (paperW - gridW) / 2;
    startY = paperH - marginY - gridH;
  } else if (align === "bottom-right") {
    startX = paperW - marginX - gridW;
    startY = paperH - marginY - gridH;
  }

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: (startX + c * (finalCellW + finalGap)) / paperW,
        y: (startY + r * (finalCellH + finalGap)) / paperH,
        w: finalCellW / paperW,
        h: finalCellH / paperH,
      });
    }
  }
  return cells;
}

function getMixedCells(
  paperW: number,
  paperH: number,
  gapMM: number,
  align: string = "center",
  marginMM: number = 4
) {
  const marginX = marginMM;
  const marginY = marginMM;
  const availW = paperW - 2 * marginX;
  const availH = paperH - 2 * marginY;

  const leftW = 2 * 35 + gapMM;
  const leftH = 2 * 45 + gapMM;
  const rightW = 60;
  const rightH = 2 * 40 + gapMM;

  const totalW_raw = leftW + gapMM + rightW;
  const totalH_raw = Math.max(leftH, rightH);

  let scale = 1;
  if (totalW_raw > availW || totalH_raw > availH) {
    scale = Math.min(availW / totalW_raw, availH / totalH_raw);
  }

  const final35 = 35 * scale;
  const final45 = 45 * scale;
  const final60 = 60 * scale;
  const final40 = 40 * scale;
  const finalGap = gapMM * scale;

  const finalLeftW = 2 * final35 + finalGap;
  const finalLeftH = 2 * final45 + finalGap;
  const finalRightW = final60;
  const finalRightH = 2 * final40 + finalGap;

  const gridW = finalLeftW + finalGap + finalRightW;
  const gridH = Math.max(finalLeftH, finalRightH);

  let startX = (paperW - gridW) / 2;
  let startY = (paperH - gridH) / 2;

  if (align === "top-left") {
    startX = marginX;
    startY = marginY;
  } else if (align === "top-center") {
    startX = (paperW - gridW) / 2;
    startY = marginY;
  } else if (align === "top-right") {
    startX = paperW - marginX - gridW;
    startY = marginY;
  } else if (align === "center-left") {
    startX = marginX;
    startY = (paperH - gridH) / 2;
  } else if (align === "center-right") {
    startX = paperW - marginX - gridW;
    startY = (paperH - gridH) / 2;
  } else if (align === "bottom-left") {
    startX = marginX;
    startY = paperH - marginY - gridH;
  } else if (align === "bottom-center") {
    startX = (paperW - gridW) / 2;
    startY = paperH - marginY - gridH;
  } else if (align === "bottom-right") {
    startX = paperW - marginX - gridW;
    startY = paperH - marginY - gridH;
  }

  const cells = [];

  // Left 2x2 grid of 35x45 mm (4 slots)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      cells.push({
        x: (startX + c * (final35 + finalGap)) / paperW,
        y: (startY + (gridH - finalLeftH) / 2 + r * (final45 + finalGap)) / paperH,
        w: final35 / paperW,
        h: final45 / paperH,
      });
    }
  }

  // Right 1x2 grid of 60x40 mm (2 slots)
  for (let r = 0; r < 2; r++) {
    cells.push({
      x: (startX + finalLeftW + finalGap) / paperW,
      y: (startY + (gridH - finalRightH) / 2 + r * (final40 + finalGap)) / paperH,
      w: final60 / paperW,
      h: final40 / paperH,
    });
  }

  return cells;
}

export function computeDynamicCollageCells(
  template: CollageTemplate,
  canvasW: number,
  canvasH: number,
  dpi: number,
  collageGap: number = 0,
  collageMargin: number = 0
): { x: number; y: number; w: number; h: number }[] | null {
  if (!template.physicalLayout) return null;

  const { type, rows, cols, align = "center" } = template.physicalLayout;
  const paperW_mm = (canvasW / dpi) * 25.4;
  const paperH_mm = (canvasH / dpi) * 25.4;

  const gap = collageGap > 0 ? (collageGap / dpi) * 25.4 : 2.0;
  const margin = collageMargin > 0 ? (collageMargin / dpi) * 25.4 : 4.0;

  if (type === "iq-mixed") {
    return getMixedCells(paperW_mm, paperH_mm, gap, align, margin);
  }

  let wMM = 35;
  let hMM = 45;

  if (type === "iq-national-id" || type === "passport") {
    wMM = 35;
    hMM = 45;
  } else if (type === "iq-civil-id") {
    wMM = 32;
    hMM = 40;
  } else if (type === "iq-general-id" || type === "id") {
    if (template.id === "collage-iq-general") {
      wMM = 60;
      hMM = 40;
    } else {
      wMM = 40;
      hMM = 60;
    }
  } else if (type === "iq-transactions") {
    wMM = 30;
    hMM = 40;
  } else if (type === "visa") {
    wMM = 50;
    hMM = 50;
  } else {
    return null;
  }

  return getGridCells(cols, rows, wMM, hMM, gap, paperW_mm, paperH_mm, align, margin);
}
