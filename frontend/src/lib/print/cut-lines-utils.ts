import { computeBlockPosition, computeSlotRectMM } from "@/lib/print/print-layout-math";
import type { SheetGrid } from "@/lib/print/print-layout-math";
import type { CanvasSlot } from "@/lib/store/types";

export type CutLineStyle = "dashed" | "dotted" | "solid" | "cropmarks";

export interface CutLineMM {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isBottomEnd?: boolean;
}

export interface CalculateCutLinesParams {
  mode: "single" | "collage";
  actualCopies: number;
  imageWidthMM: number;
  imageHeightMM: number;
  gapMM: number;
  paperWidth: number;
  paperHeight: number;
  showEndCutLine?: boolean;
  slots?: CanvasSlot[];
  collageMargin?: number;
  collageGap?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  hasPhysical?: boolean;
  cutLineStyle?: "dashed" | "dotted" | "solid" | "cropmarks";
  // الشبكة المحسوبة مسبقاً من computeSheetGrid — المصدر الوحيد للصيغ،
  // لا يُعاد حسابها هنا (كانت مكررة وتسبب انحراف المعاينة عن الطباعة)
  grid: SheetGrid;
}

/**
 * دالة موحدة لحساب إحداثيات خطوط القص بالمليمتر على ورقة الطباعة.
 * تضمن المطابقة التامة بين معاينة الواجهة (PrintPreview) والمخرجات في Go Backend.
 */
export function calculatePrintCutLines(params: CalculateCutLinesParams): CutLineMM[] {
  const {
    mode,
    actualCopies,
    imageWidthMM,
    imageHeightMM,
    gapMM,
    paperWidth,
    paperHeight,
    showEndCutLine = true,
    slots,
    collageMargin = 0,
    collageGap = 0,
    canvasWidth = 2480,
    canvasHeight = 3508,
    hasPhysical = false,
    grid,
  } = params;

  if (actualCopies <= 0) return [];

  const cutLines: CutLineMM[] = [];
  const { safeCols, actualRows, gridWidth, gridHeight, offsetX, offsetY } = grid;

  // 🧩 فرع الكولاج: الاعتماد على الإحداثيات الفعلية للخلايا (slots)
  if (mode === "collage" && slots && slots.length > 0) {
    const colLefts = new Set<number>();
    const colRights = new Set<number>();
    const rowTops = new Set<number>();
    const rowBottoms = new Set<number>();

    // 🛡️ إصلاح: مقياسان منفصلان لكل محور — كان يستخدم مقياس العرض لكلا المحورين
    // مما يسبب انحرافاً عمودياً في مواضع خطوط القص بين المعاينة والطباعة
    const scaleXPxToMM = imageWidthMM / Math.max(1, canvasWidth);
    const scaleYPxToMM = imageHeightMM / Math.max(1, canvasHeight);
    const marginPx = hasPhysical ? 0 : collageMargin;
    const gapPx = hasPhysical ? 0 : collageGap;
    const marginXMM = marginPx * scaleXPxToMM;
    const marginYMM = marginPx * scaleYPxToMM;
    const gapXMM = gapPx * scaleXPxToMM;
    const gapYMM = gapPx * scaleYPxToMM;

    for (let i = 0; i < actualCopies; i++) {
      const block = computeBlockPosition(i, grid);

      for (const slot of slots) {
        if (!slot.imageSrc && (slot.w <= 0 || slot.h <= 0)) continue;
        const rect = computeSlotRectMM(
          block,
          { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
          { widthMM: imageWidthMM, heightMM: imageHeightMM },
          { marginXMM, marginYMM },
          { gapXMM, gapYMM }
        );

        colLefts.add(Math.round(rect.xMM * 100) / 100);
        colRights.add(Math.round((rect.xMM + rect.wMM) * 100) / 100);
        rowTops.add(Math.round(rect.yMM * 100) / 100);
        rowBottoms.add(Math.round((rect.yMM + rect.hMM) * 100) / 100);
      }
    }

    const sortedLefts = Array.from(colLefts).sort((a, b) => a - b);
    const sortedRights = Array.from(colRights).sort((a, b) => a - b);
    const sortedTops = Array.from(rowTops).sort((a, b) => a - b);
    const sortedBottoms = Array.from(rowBottoms).sort((a, b) => a - b);

    if (sortedLefts.length > 0 && sortedTops.length > 0) {
      const xCutLines: number[] = [];
      xCutLines.push(Math.max(0, sortedLefts[0] - gapXMM / 2));
      for (let i = 0; i < sortedRights.length - 1; i++) {
        const midX = (sortedRights[i] + sortedLefts[i + 1]) / 2;
        xCutLines.push(midX);
      }
      xCutLines.push(Math.min(paperWidth, sortedRights[sortedRights.length - 1] + gapXMM / 2));

      const yCutLines: number[] = [];
      yCutLines.push(Math.max(0, sortedTops[0] - gapYMM / 2));
      for (let i = 0; i < sortedBottoms.length - 1; i++) {
        const midY = (sortedBottoms[i] + sortedTops[i + 1]) / 2;
        yCutLines.push(midY);
      }
      const gridBottomY = Math.min(paperHeight, sortedBottoms[sortedBottoms.length - 1] + gapYMM / 2);
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