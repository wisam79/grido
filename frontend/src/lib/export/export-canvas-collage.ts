/**
 * فرع الكولاج من التصدير اليدوي — رسم الخانات والحدود وخطوط القص.
 * مستخرج من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */
import { collageCut, collageEndCut } from '@/lib/canvas/canvas-colors';
import { isPixelFilter } from '@/lib/filters/pixel-filters';
import { createLogger } from '@/lib/logger';
import { calculatePrintCutLines } from '@/lib/print/cut-lines-utils';
import { computeSheetGrid, computeSlotRectMM } from '@/lib/print/print-layout-math';
import { buildAdjustmentCSS, buildCSSFilter } from '@/lib/utils';

import { renderWithPixelFilter } from './export-pixel-filter';
import {
  applySlotTransform,
  drawRoundRect,
  drawSlotImage,
  drawSlotImageLocal,
  loadImage,
} from './export-primitives';

import type { useEditorStore } from '@/lib/editor-store';

const logger = createLogger('export-canvas-collage');

type StoreState = ReturnType<typeof useEditorStore.getState>;

export type CollageCutLineStyle = 'dashed' | 'solid' | 'dotted' | 'cropmarks';

/**
 * 🖨️ إيقاع الشرطات الموحّد (RV-Print-25): المعاينة ومسار Go يحترمان
 * cutLineStyle بينما التصدير اليدوي كان يرسم شرطات ثابتة دائماً —
 * ثلاثة مخرجات مختلفة لنفس الإعداد. الآن مصدر واحد للحقيقة.
 */
export function resolveCutLineDash(style: CollageCutLineStyle | string | undefined): number[] {
  switch (style) {
    case 'solid':
    case 'cropmarks': // الزوايا تُرسم منفصلة — بلا شرطات على الخطوط (لا توجد خطوط أصلاً)
      return [];
    case 'dotted':
      return [2, 5];
    case 'dashed':
    default:
      return [8, 8];
  }
}

export interface CollageRenderOptions {
  canvasWidth: number;
  canvasHeight: number;
  slots: StoreState['slots'];
  collageGap?: number;
  collageMargin?: number;
  collageRadius?: number;
  collageShowCutLines?: boolean;
  collageShowEndCutLine?: boolean;
  collageCutLineStyle?: CollageCutLineStyle;
  collageStrokeWidth?: number;
  collageStrokeColor?: string;
  collageTemplate?: StoreState['collageTemplate'];
}

/**
 * نتيجة تحميل صور الخانات قبل الرسم. الصور الفاشلة تُعلَم بمعرّف خانتها كي
 * يستطيع المستدعي (التصدير اليدوي/الطباعة) إظهار تحذير بدل ملف ناقص صامت.
 */
export interface CollageImageLoadResult {
  loaded: Map<string, HTMLImageElement>;
  failedSlotIds: string[];
}

export async function loadCollageSlotImages(
  slots: StoreState['slots'],
  timeoutMs = 8000,
): Promise<CollageImageLoadResult> {
  const loaded = new Map<string, HTMLImageElement>();
  const failedSlotIds: string[] = [];
  await Promise.all(
    slots
      .filter((slot) => slot.imageSrc)
      .map(async (slot) => {
        try {
          // مهلة لكل صورة: مصدر معلّق (شبكة متوقف/بيئة اختبار بلا مصغرات)
          // لا يجوز أن يوقف الفحص أو التصدير إلى الأبد.
          const img = await Promise.race([
            loadImage(slot.imageSrc!),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('image load timeout')), timeoutMs),
            ),
          ]);
          loaded.set(slot.id, img);
        } catch (e) {
          logger.error('Failed to pre-load slot image:', slot.imageSrc, e);
          failedSlotIds.push(slot.id);
        }
      }),
  );
  return { loaded, failedSlotIds };
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
    collageCutLineStyle = 'dashed',
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
  const loadResult = await loadCollageSlotImages(slots);
  for (const [id, img] of loadResult.loaded) slotImageMap[id] = img;

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
      ctx.beginPath();
      if (radius > 0) {
        drawRoundRect(ctx, left, top, width, height, radius);
      } else {
        ctx.rect(left, top, width, height);
      }
      ctx.clip();
      // خلفية الخانة جزء مقصود من التصميم — تُرسم حتى عند فشل الصورة
      if (slot.bgColor && slot.bgColor !== 'transparent') {
        ctx.fillStyle = slot.bgColor;
        ctx.fillRect(left, top, width, height);
      }
      // مرشّحات البكسل تُطبَّق في الفضاء المحلي قبل القلب/الدوران (ترتيب Konva)
      if (isPixelFilter(slot.filter)) {
        const off = renderWithPixelFilter(width, height, slot.filter, (octx) => {
          // تعديلات اللون قبل مرشّح البكسل (ترتيب Go)
          octx.filter = buildAdjustmentCSS(slot);
          drawSlotImageLocal(octx, img, width, height, slot);
        });
        if (off) {
          applySlotTransform(ctx, left, top, width, height, slot);
          ctx.drawImage(off, 0, 0, width, height);
        }
      } else {
        // يطبّق zoom/dragX/dragY/flipX/flipY/rotation كما في عقدة Konva (إصلاح E-7)
        const filterStr = buildCSSFilter(slot);
        if (filterStr && filterStr !== 'none') {
          ctx.filter = filterStr;
        }
        drawSlotImage(ctx, img, left, top, width, height, slot);
        ctx.filter = 'none';
      }
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
    const dash = resolveCutLineDash(collageCutLineStyle);

    // 🖨️ cropmarks: علامات زوايا فقط على الصندوق المحيط (مطابق للمعاينة
    // print-preview التي تبني زواياها من نفس bbox) — لا خطوط كاملة.
    if (collageCutLineStyle === 'cropmarks') {
      // الخط الختامي يمتد على عرض الورقة كاملاً (دليل نهاية الطباعة) — إدخاله
      // في حساب الصندوق المحيط يوسّع الزوايا إلى حدود الورقة بدل حدود الشبكة.
      const boundsLines = cutLines.filter((l) => !l.isBottomEnd);
      const xs = boundsLines.flatMap((l) => [l.x1, l.x2]);
      const ys = boundsLines.flatMap((l) => [l.y1, l.y2]);
      if (xs.length > 0 && ys.length > 0) {
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const len = Math.max(4, Math.min(canvasWidth, canvasHeight) * 0.04);
        ctx.strokeStyle = collageCut();
        ctx.lineWidth = lineW;
        ctx.setLineDash([]);
        ctx.beginPath();
        const corners: Array<[number, number, number, number]> = [
          [minX, minY, 1, 1],
          [maxX, minY, -1, 1],
          [minX, maxY, 1, -1],
          [maxX, maxY, -1, -1],
        ];
        for (const [cx, cy, hx, hy] of corners) {
          ctx.moveTo(hx > 0 ? cx : cx - len, cy);
          ctx.lineTo(hx > 0 ? cx + len : cx, cy);
          ctx.moveTo(cx, hy > 0 ? cy : cy - len);
          ctx.lineTo(cx, hy > 0 ? cy + len : cy);
        }
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // تجميع أوامر الرسم: مساران (عادي/ختامي) بدل beginPath+stroke لكل خط —
    // تغيير strokeStyle/dash فقط عند الانتقال بين الفئتين
    const regularLines = cutLines.filter((l) => !l.isBottomEnd);
    const endLines = cutLines.filter((l) => l.isBottomEnd);

    const strokeBatch = (
      lines: typeof cutLines,
      style: string,
      width: number,
      lineDash: number[],
    ) => {
      if (lines.length === 0) return;
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.setLineDash(lineDash);
      ctx.beginPath();
      for (const line of lines) {
        ctx.moveTo(Math.round(line.x1), Math.round(line.y1));
        ctx.lineTo(Math.round(line.x2), Math.round(line.y2));
      }
      ctx.stroke();
    };

    strokeBatch(regularLines, collageCut(), lineW, dash);
    // الخط الختامي يبقى مميزاً (أسمك) لكن بإيقاع النمط المختار.
    strokeBatch(endLines, collageEndCut(), lineW * 1.5, dash);
    ctx.restore();
  }
}
