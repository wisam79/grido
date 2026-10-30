/**
 * تصدير خانة واحدة من الكولاج كصورة مستقلة (استخدام في تصدير الدفعات).
 * مستخرج من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */
import { previewWhite } from '@/lib/canvas/canvas-colors';
import { useEditorStore } from '@/lib/editor-store';
import { assertExportablePixels, CanvasTooLargeError } from '@/lib/export/export-limits';
import { isPixelFilter } from '@/lib/filters/pixel-filters';
import { createLogger } from '@/lib/logger';
import { computeCollageSlotRectMM } from '@/lib/print/print-layout-math';
import { buildAdjustmentCSS, buildCSSFilter } from '@/lib/utils';

import { renderWithPixelFilter } from './export-pixel-filter';
import {
  applySlotTransform,
  drawSlotImage,
  drawSlotImageLocal,
  loadImage,
} from './export-primitives';

import type { CollageRenderOptions } from './export-canvas-collage';
import type { SlotFractions } from '@/lib/print/print-layout-math';

const logger = createLogger('export-slot');

/** Exact integer bitmap size, shared with batch-export preflight (not the page size). */
export function getSlotExportSize(
  slot: SlotFractions,
  opts: Pick<
    CollageRenderOptions,
    'canvasWidth' | 'canvasHeight' | 'collageMargin' | 'collageGap' | 'collageTemplate'
  >,
): { width: number; height: number } {
  const rect = computeCollageSlotRectMM(slot, {
    canvasWidth: opts.canvasWidth,
    canvasHeight: opts.canvasHeight,
    imageWidthMM: opts.canvasWidth,
    imageHeightMM: opts.canvasHeight,
    collageMargin: opts.collageMargin ?? 0,
    collageGap: opts.collageGap ?? 0,
    hasPhysical: Boolean(opts.collageTemplate?.physicalLayout),
  });
  // Canvas dimensions truncate fractional pixels. Draw into those same integer bounds.
  return { width: Math.max(1, Math.floor(rect.wMM)), height: Math.max(1, Math.floor(rect.hMM)) };
}

export async function exportSlotCanvas(
  slotId: string,
  format: 'png' | 'jpg' = 'png',
  quality = 0.95,
): Promise<Blob | null> {
  const {
    canvasWidth,
    canvasHeight,
    collageMargin = 0,
    collageGap = 0,
    collageTemplate,
    slots,
  } = useEditorStore.getState();
  const slot = slots.find((s) => s.id === slotId);
  if (!slot || !slot.imageSrc) return null;

  try {
    const img = await loadImage(slot.imageSrc);

    const { width: exportWidth, height: exportHeight } = getSlotExportSize(slot, {
      canvasWidth,
      canvasHeight,
      collageMargin,
      collageGap,
      collageTemplate,
    });

    // خانة واحدة قد تتجاوز الحد إذا كان الكانفاس ضخماً (w=1 يعني الكانفاس كاملاً)
    assertExportablePixels(exportWidth, exportHeight);

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (slot.bgColor && slot.bgColor !== 'transparent') {
      ctx.fillStyle = slot.bgColor;
      ctx.fillRect(0, 0, exportWidth, exportHeight);
    } else if (format === 'jpg') {
      ctx.fillStyle = previewWhite();
      ctx.fillRect(0, 0, exportWidth, exportHeight);
    }

    // مرشّحات البكسل تُطبَّق في الفضاء المحلي قبل القلب/الدوران (ترتيب Konva)
    if (isPixelFilter(slot.filter)) {
      const off = renderWithPixelFilter(exportWidth, exportHeight, slot.filter, (octx) => {
        // تعديلات اللون قبل مرشّح البكسل (ترتيب Go)
        octx.filter = buildAdjustmentCSS(slot);
        drawSlotImageLocal(octx, img, exportWidth, exportHeight, slot);
      });
      if (off) {
        ctx.save();
        applySlotTransform(ctx, 0, 0, exportWidth, exportHeight, slot);
        ctx.drawImage(off, 0, 0, exportWidth, exportHeight);
        ctx.restore();
      }
    } else {
      ctx.save();
      const filterStr = buildCSSFilter(slot);
      if (filterStr && filterStr !== 'none') {
        ctx.filter = filterStr;
      }
      // القص (zoom/drag) والقلب والدوران يُحترمون أيضاً في تصدير الخانة المفردة (إصلاح E-7)
      drawSlotImage(ctx, img, 0, 0, exportWidth, exportHeight, slot);
      ctx.filter = 'none';
      ctx.restore();
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        format === 'png' ? 'image/png' : 'image/jpeg',
        quality,
      );
    });
  } catch (e) {
    // خطأ الحجم ليس فشل خانة عابراً — نمرره للمتصل ليعرض رسالة الأبعاد الصريحة
    if (e instanceof CanvasTooLargeError) throw e;
    logger.error(`Failed to export slot ${slotId}:`, e);
    return null;
  }
}
