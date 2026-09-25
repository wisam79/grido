/**
 * تصدير خانة واحدة من الكولاج كصورة مستقلة (استخدام في تصدير الدفعات).
 * مستخرج من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */
import { useEditorStore } from '@/lib/editor-store';
import { buildCSSFilter } from '@/lib/utils';
import { computeSlotRectMM } from '@/lib/print/print-layout-math';
import { previewWhite } from '@/lib/canvas/canvas-colors';
import { assertExportablePixels, CanvasTooLargeError } from '@/lib/export/export-limits';
import { drawSlotImage, loadImage } from './export-primitives';
import { applyWatermarkIfFree } from './export-watermark';

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

    // مزامنة القص مع هوامش/فجوات الكولاج الفعلية — تطبيق القيم الحقيقية
    // (وليس صفراً) يطابق نسبة الخلية المعروضة في المحرر وإلا انحرف القص
    // واقتطع أجزاء من رأس/وجه الشخص خلافاً للمعاينة
    const hasPhysical = Boolean(collageTemplate?.physicalLayout);
    const marginPx = hasPhysical ? 0 : collageMargin;
    const gapPx = hasPhysical ? 0 : collageGap;
    const rect = computeSlotRectMM(
      { xMM: 0, yMM: 0 },
      { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
      { widthMM: canvasWidth, heightMM: canvasHeight },
      { marginXMM: marginPx, marginYMM: marginPx },
      { gapXMM: gapPx, gapYMM: gapPx },
    );
    const exportWidth = Math.max(1, rect.wMM);
    const exportHeight = Math.max(1, rect.hMM);

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

    ctx.save();
    const filterStr = buildCSSFilter(slot);
    if (filterStr && filterStr !== 'none') {
      ctx.filter = filterStr;
    }
    // القص (zoom/drag) والقلب والدوران يُحترمون أيضاً في تصدير الخانة المفردة (إصلاح E-7)
    drawSlotImage(ctx, img, 0, 0, exportWidth, exportHeight, slot);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const watermarked = await applyWatermarkIfFree(blob, format, quality);
            resolve(watermarked);
          } else {
            resolve(null);
          }
        },
        format === 'png' ? 'image/png' : 'image/jpeg',
        quality,
      );
    });
  } catch (e) {
    // خطأ الحجم ليس فشل خانة عابراً — نمرره للمتصل ليعرض رسالة الأبعاد الصريحة
    if (e instanceof CanvasTooLargeError) throw e;
    console.error(`Failed to export slot ${slotId}:`, e);
    return null;
  }
}
