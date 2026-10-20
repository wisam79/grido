/**
 * print-payload-builder.ts — تجميع عناصر ورقة الطباعة وخطوط القص
 *
 * مسؤولية أحادية: تحويل بيانات تخطيط الكولاج أو الوضع الحر إلى عناصر domain.PrintItem[]
 * وخطوط domain.CutLine[] جاهزة للإرسال إلى Go backend.
 * مستخرج من use-print-export.ts ضمن خطة الإصلاح المعماري.
 */

import * as domain from '@bindings/grido/internal/core/domain';
import { calculatePrintCutLines } from '@/lib/print/cut-lines-utils';
import {
  computeBlockPosition,
  computeSlotAspect,
  computeSlotRectMM,
} from '@/lib/print/print-layout-math';
import { buildSingleComposition } from '@/lib/print/single-print-composition';
import { captureStageBlob } from '@/lib/canvas/konva-export-utils';
import { previewWhite } from '@/lib/canvas/canvas-colors';
import { paperCaptureRect } from '@/lib/canvas/fit';
import { assertExportablePixels } from '@/lib/export/export-limits';
import { uploadPrintImage } from './print-transport';
import type { usePrintLayout } from '@/hooks/use-print-layout';
import type { CanvasSlot, CanvasElement, CollageTemplate, PrintSettings } from '@/lib/store/types';
import type Konva from 'konva';

export interface BuiltItems {
  items: domain.PrintItem[];
  cutLines: domain.CutLine[];
  composition?: domain.CanvasComposition;
}

export interface CollagePayloadContext {
  layout: ReturnType<typeof usePrintLayout>;
  slots: CanvasSlot[];
  canvasWidth: number;
  canvasHeight: number;
  collageTemplate: CollageTemplate | null | undefined;
  collageMargin: number;
  collageGap: number;
  collageRadius: number;
  collageStrokeWidth: number;
  collageStrokeColor: string;
  collageShowCutLines: boolean;
  collageShowEndCutLine: boolean | undefined;
}

export function buildCollagePayload(ctx: CollagePayloadContext): BuiltItems {
  const {
    layout,
    slots,
    canvasWidth,
    canvasHeight,
    collageTemplate,
    collageMargin,
    collageGap,
    collageRadius,
    collageStrokeWidth,
    collageStrokeColor,
    collageShowCutLines,
    collageShowEndCutLine,
  } = ctx;

  const { imageWidthMM, imageHeightMM, gapMM, actualCopies, paperWidth, paperHeight, grid } =
    layout;

  const items: domain.PrintItem[] = [];
  const hasPhysical = Boolean(collageTemplate?.physicalLayout);
  const marginPx = hasPhysical ? 0 : collageMargin;
  const gapPx = hasPhysical ? 0 : collageGap;
  const scaleXPxToMM = imageWidthMM / canvasWidth;
  const scaleYPxToMM = imageHeightMM / canvasHeight;
  const marginXMM = marginPx * scaleXPxToMM;
  const marginYMM = marginPx * scaleYPxToMM;
  const gapXMM = gapPx * scaleXPxToMM;
  const gapYMM = gapPx * scaleYPxToMM;

  const rawCutLines = collageShowCutLines
    ? calculatePrintCutLines({
        mode: 'collage',
        actualCopies,
        imageWidthMM,
        imageHeightMM,
        gapMM,
        paperWidth,
        paperHeight,
        showEndCutLine: collageShowEndCutLine !== false,
        slots,
        collageMargin,
        collageGap,
        canvasWidth,
        canvasHeight,
        hasPhysical,
        grid,
      })
    : [];

  const cutLines: domain.CutLine[] = rawCutLines.map((l) => ({
    x1: l.x1,
    y1: l.y1,
    x2: l.x2,
    y2: l.y2,
  }));

  const slotTemplates = slots.filter((slot) => slot.imageSrc);
  const firstBlock = computeBlockPosition(0, grid);
  const stepXMM = actualCopies > 1 ? grid.cellWidth : 0;
  const stepYMM = actualCopies > 1 ? grid.cellHeight : 0;

  for (const slot of slotTemplates) {
    const rect = computeSlotRectMM(
      firstBlock,
      { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
      { widthMM: imageWidthMM, heightMM: imageHeightMM },
      { marginXMM, marginYMM },
      { gapXMM, gapYMM },
    );
    const slotAspect = computeSlotAspect({ w: slot.w, h: slot.h }, canvasWidth, canvasHeight);

    items.push(
      domain.PrintItem.createFrom({
        imageSrc: slot.imageSrc,
        x: rect.xMM,
        y: rect.yMM,
        w: rect.wMM,
        h: rect.hMM,
        filter: slot.filter || 'none',
        brightness: slot.brightness ?? 100,
        contrast: slot.contrast ?? 100,
        saturation: slot.saturation ?? 100,
        slotAspect,
        zoom: slot.zoom || 1,
        dragX: slot.dragX || 0,
        dragY: slot.dragY || 0,
        cornerRadiusMM: collageRadius * scaleXPxToMM,
        borderWidthMM: collageStrokeWidth * scaleXPxToMM,
        borderColor: collageStrokeColor,
        bgColor: slot.bgColor || '',
        flipX: slot.flipX,
        flipY: slot.flipY,
        rotation: slot.rotation,
        copies: actualCopies,
        copyCols: grid.safeCols,
        copyStepX: stepXMM,
        copyStepY: stepYMM,
      }),
    );
  }

  return { items, cutLines, composition: undefined };
}

export interface SinglePayloadContext {
  stage: Konva.Stage | null;
  layout: ReturnType<typeof usePrintLayout>;
  elements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  backgroundGradientColor2?: string | null;
  printDpi: number;
  printShowCutLines: boolean;
  printShowEndCutLine: boolean | undefined;
  printCutLineStyle: PrintSettings['cutLineStyle'];
}

export async function buildSinglePayload(ctx: SinglePayloadContext): Promise<BuiltItems | null> {
  const {
    stage,
    layout,
    elements,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    backgroundGradientColor2,
    printDpi,
    printShowCutLines,
    printShowEndCutLine,
    printCutLineStyle,
  } = ctx;

  if (!stage) return null;

  const { imageWidthMM, imageHeightMM, gapMM, actualCopies, paperWidth, paperHeight, grid } =
    layout;

  const items: domain.PrintItem[] = [];
  const exportDpi = printDpi || 300;
  const printPixelW = Math.round((imageWidthMM / 25.4) * exportDpi);
  const printPixelH = Math.round((imageHeightMM / 25.4) * exportDpi);

  assertExportablePixels(printPixelW, printPixelH);

  const singleCompRes = buildSingleComposition({
    elements,
    canvasWidth,
    canvasHeight,
    canvasWidthMM: imageWidthMM,
    canvasHeightMM: imageHeightMM,
    backgroundColor: backgroundColor || previewWhite(),
    backgroundGradientColor2: backgroundGradientColor2 ?? null,
  });

  const isSimpleRaster = singleCompRes.eligible && !!singleCompRes.composition;
  const comp = singleCompRes.composition;
  let singleImageSrc = '';

  if (!isSimpleRaster) {
    // 🛡️ M15: التقاط منطقة الورقة بإحداثياتها المنطقية يجعل عرض المخرج
    // `printPixelW` بغضّ النظر عن مستوى التكبير على الشاشة. كان `stage.width()`
    // هو مقاس العرض المرئي فيتغير حجم الطباعة بمجرد تكبير المستخدم.
    const captureRect = paperCaptureRect(canvasWidth, canvasHeight);
    const targetPixelRatio = canvasWidth > 0 ? printPixelW / canvasWidth : 1;
    const capturedBlob = await captureStageBlob(
      stage,
      targetPixelRatio,
      'image/png',
      undefined,
      captureRect,
      { useFullResolution: true },
    );
    if (!capturedBlob) {
      throw new Error('stage capture returned no blob');
    }
    singleImageSrc = await uploadPrintImage(capturedBlob);
  }

  const rawCutLines = printShowCutLines
    ? calculatePrintCutLines({
        mode: 'single',
        actualCopies,
        imageWidthMM,
        imageHeightMM,
        gapMM,
        paperWidth,
        paperHeight,
        showEndCutLine: printShowEndCutLine !== false,
        cutLineStyle: printCutLineStyle ?? 'dashed',
        grid,
      })
    : [];

  const cutLines: domain.CutLine[] = rawCutLines.map((l) => ({
    x1: l.x1,
    y1: l.y1,
    x2: l.x2,
    y2: l.y2,
  }));

  // 🖨️ RV-16-M3: توسيع النسخ على جانب Go (نفس آلية الكولاج — domain.PrintItem.copies)
  // بدل تكرار العناصر عبر IPC: 48 نسخة × 21 عنصراً كانت تتجاوز حد التحقق 1000 عنصر
  // وتُرفض الورقة، والحمولة كانت تتضخم ×48 بلا حاجة.
  const firstBlock = computeBlockPosition(0, grid);
  const stepXMM = actualCopies > 1 ? grid.cellWidth : 0;
  const stepYMM = actualCopies > 1 ? grid.cellHeight : 0;

  if (isSimpleRaster && comp) {
    const itemWidthMM = imageWidthMM;
    const itemHeightMM = imageHeightMM;
    const scaleX = itemWidthMM / comp.canvasWidthPx;
    const scaleY = itemHeightMM / comp.canvasHeightPx;

    for (const compItem of comp.items) {
      items.push(
        domain.PrintItem.createFrom({
          imageSrc: compItem.imageSrc,
          x: firstBlock.xMM + compItem.x * scaleX,
          y: firstBlock.yMM + compItem.y * scaleY,
          w: compItem.w * scaleX,
          h: compItem.h * scaleY,
          filter: compItem.filter,
          brightness: compItem.brightness,
          contrast: compItem.contrast,
          saturation: compItem.saturation,
          // 🖨️ RV-16-H2: عناصر الوضع الحر تُمدَّد (stretch) داخل مستطيلها في Konva
          // (image-node.tsx يضبط width/height مباشرة). إرسال slotAspect كان يفعّل
          // قصاً تغاطياً (cover) في computeCropFromSlot فتُطبع منتصف الصورة بدل
          // تمديدها كاملاً كلما تبدّلت نسبة المستطيل عن نسبة المصدر. الصفر = بلا
          // قصّ ⇒ تمديد كامل مطابق للمحرر.
          slotAspect: 0,
          zoom: 1,
          dragX: 0,
          dragY: 0,
          cornerRadiusMM: (compItem.cornerRadius / comp.canvasWidthPx) * itemWidthMM,
          borderWidthMM: 0,
          borderColor: '#000000',
          bgColor: compItem.bgColor || '',
          flipX: compItem.flipX,
          flipY: compItem.flipY,
          rotation: compItem.rotation,
          copies: actualCopies,
          copyCols: grid.safeCols,
          copyStepX: stepXMM,
          copyStepY: stepYMM,
        }),
      );
    }
  } else {
    items.push(
      domain.PrintItem.createFrom({
        imageSrc: singleImageSrc,
        x: firstBlock.xMM,
        y: firstBlock.yMM,
        w: imageWidthMM,
        h: imageHeightMM,
        filter: 'none',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        zoom: 1,
        dragX: 0,
        dragY: 0,
        copies: actualCopies,
        copyCols: grid.safeCols,
        copyStepX: stepXMM,
        copyStepY: stepYMM,
      }),
    );
  }

  return { items, cutLines, composition: undefined };
}
