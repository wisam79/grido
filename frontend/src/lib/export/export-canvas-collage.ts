/**
 * فرع الكولاج من التصدير اليدوي — رسم الخانات والحدود وخطوط القص.
 * مستخرج من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */
import { useEditorStore } from '@/lib/editor-store';
import { buildCSSFilter } from '@/lib/utils';
import { computeSheetGrid, computeSlotRectMM } from '@/lib/print/print-layout-math';
import { calculatePrintCutLines } from '@/lib/print/cut-lines-utils';
import { collageCut, collageEndCut } from '@/lib/canvas/canvas-colors';
import { drawRoundRect, drawSlotImage, loadImage } from './export-primitives';

type StoreState = ReturnType<typeof useEditorStore.getState>;

export interface CollageRenderOptions {
  canvasWidth: number;
  canvasHeight: number;
  slots: StoreState['slots'];
  collageGap?: number;
  collageMargin?: number;
  collageRadius?: number;
  collageShowCutLines?: boolean;
  collageShowEndCutLine?: boolean;
  collageStrokeWidth?: number;
  collageStrokeColor?: string;
  collageTemplate?: StoreState['collageTemplate'];
}

export async function renderCollageBranch(
  ctx: CanvasRenderingContext2D,
  opts: CollageRenderOptions,
): Promise<void> {
  const {
    canvasWidth,
    canvasHeight,
    slots,
    collageGap = 0,
    collageMargin = 0,
    collageRadius = 0,
    collageShowCutLines = false,
    collageShowEndCutLine = true,
    collageStrokeWidth = 0,
    collageStrokeColor = '#000000',
    collageTemplate,
  } = opts;

  // القوالب الفيزيائية (physicalLayout) تُخبز الهامش والفجوة داخل إحداثيات
  // الخلايا نفسها — تطبيقها مجدداً هنا يضاعفها ويُباعد التصدير عن المعاينة
  const hasPhysical = Boolean(collageTemplate?.physicalLayout);
  const margin = hasPhysical ? 0 : collageMargin;
  const gap = hasPhysical ? 0 : collageGap;
  const radius = collageRadius;
  const borderW = collageStrokeWidth;

  const slotImageMap: Record<string, HTMLImageElement> = {};
  const slotLoadPromises = slots
    .filter((slot) => slot.imageSrc)
    .map(async (slot) => {
      try {
        const img = await loadImage(slot.imageSrc!);
        slotImageMap[slot.id] = img;
      } catch (e) {
        console.error('Failed to pre-load slot image:', slot.imageSrc, e);
      }
    });
  await Promise.all(slotLoadPromises);

  for (const slot of slots) {
    // مستطيل الخانة من print-layout-math — نفس المصدر المستخدم في معاينة الطباعة
    // وخطوط القص ومسار Go. الوحدات هنا بكسل لكن الصيغة نسبة بحتة (block عند 0,0)
    const rect = computeSlotRectMM(
      { xMM: 0, yMM: 0 },
      { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
      { widthMM: canvasWidth, heightMM: canvasHeight },
      { marginXMM: margin, marginYMM: margin },
      { gapXMM: gap, gapYMM: gap },
    );
    const left = rect.xMM;
    const top = rect.yMM;
    const width = rect.wMM;
    const height = rect.hMM;

    if (slot.imageSrc && slotImageMap[slot.id]) {
      const img = slotImageMap[slot.id];
      ctx.save();
      const filterStr = buildCSSFilter(slot);
      if (filterStr && filterStr !== 'none') {
        ctx.filter = filterStr;
      }
      ctx.beginPath();
      if (radius > 0) {
        drawRoundRect(ctx, left, top, width, height, radius);
      } else {
        ctx.rect(left, top, width, height);
      }
      ctx.clip();
      if (slot.bgColor && slot.bgColor !== 'transparent') {
        ctx.fillStyle = slot.bgColor;
        ctx.fillRect(left, top, width, height);
      }
      // يطبّق zoom/dragX/dragY/flipX/flipY/rotation كما في عقدة Konva (إصلاح E-7)
      drawSlotImage(ctx, img, left, top, width, height, slot);
      ctx.restore();
    }

    if (borderW > 0) {
      ctx.save();
      ctx.strokeStyle = collageStrokeColor;
      ctx.lineWidth = borderW;
      ctx.beginPath();
      if (radius > 0) {
        drawRoundRect(ctx, left, top, width, height, radius);
      } else {
        ctx.rect(left, top, width, height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // رسم خطوط القص في النهاية فوق كافة الصور والحدود وضمان عدم تغطيتها —
  // المواضع من cut-lines-utils (نفس مصدر معاينة الطباعة ومسار Go) بمقياس 1:1
  // لأن الورقة والكانفاس هنا نفس الشيء (بكسل). الخلايا الميتة (بلا صورة وبلا
  // أبعاد) لم تعد تضيف خطوطاً وهمية عند الهامش — سلوك موحّد مع المعاينة.
  if (collageShowCutLines && slots.length > 0) {
    ctx.save();

    const cutLines = calculatePrintCutLines({
      mode: 'collage',
      actualCopies: 1,
      imageWidthMM: canvasWidth,
      imageHeightMM: canvasHeight,
      gapMM: gap,
      paperWidth: canvasWidth,
      paperHeight: canvasHeight,
      showEndCutLine: collageShowEndCutLine,
      slots,
      collageMargin,
      collageGap,
      canvasWidth,
      canvasHeight,
      hasPhysical,
      // لا ورقة طباعة هنا — الكانفاس هو الكولاج نفسه، فشبكة 1×1 بلا هوامش
      grid: computeSheetGrid({
        cols: 1,
        actualCopies: 1,
        imageWidthMM: canvasWidth,
        imageHeightMM: canvasHeight,
        gapMM: gap,
        effectiveMarginMM: 0,
        availableWidthMM: canvasWidth,
        availableHeightMM: canvasHeight,
      }),
    });

    const lineW = Math.max(1, Math.round(canvasWidth / 1200));

    // تجميع أوامر الرسم: مساران (عادي/ختامي) بدل beginPath+stroke لكل خط —
    // تغيير strokeStyle/dash فقط عند الانتقال بين الفئتين
    const regularLines = cutLines.filter((l) => !l.isBottomEnd);
    const endLines = cutLines.filter((l) => l.isBottomEnd);

    const strokeBatch = (lines: typeof cutLines, style: string, width: number, dash: number[]) => {
      if (lines.length === 0) return;
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (const line of lines) {
        ctx.moveTo(Math.round(line.x1), Math.round(line.y1));
        ctx.lineTo(Math.round(line.x2), Math.round(line.y2));
      }
      ctx.stroke();
    };

    strokeBatch(regularLines, collageCut(), lineW, [8, 8]);
    strokeBatch(endLines, collageEndCut(), lineW * 1.5, [12, 6]);
    ctx.restore();
  }
}
