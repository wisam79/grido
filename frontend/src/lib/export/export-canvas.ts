/**
 * منسق التصدير اليدوي exportCanvas — المسار السريع Konva ثم الاحتياطي اليدوي.
 * مستخرج من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 * الفروع التفصيلية في export-canvas-collage.ts و export-canvas-fitted.ts.
 */
import type Konva from 'konva';
import { useEditorStore } from '@/lib/editor-store';
import { captureStageBlob } from '@/lib/canvas/konva-export-utils';
import { gradientPixelPoints } from '@/lib/canvas/gradient-geometry';
import { previewWhite } from '@/lib/canvas/canvas-colors';
import { assertExportablePixels } from '@/lib/export/export-limits';
import { renderCollageBranch } from './export-canvas-collage';
import { renderFittedBranch } from './export-canvas-fitted';
import { applyWatermarkIfFree } from './export-watermark';

// تصدير الكانفس الحالي كصورة PNG/JPG
export async function exportCanvas(
  format: 'png' | 'jpg' = 'png',
  quality = 0.95,
  stageRef?: Konva.Stage | null,
): Promise<Blob | null> {
  const {
    mode,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    backgroundGradientColor2,
    backgroundGradientAngle,
    elements,
    slots,
  } = useEditorStore.getState();

  // حارس الذاكرة: ~200MB خامة عند 50MP — التجاوز كان يفشل بصمت برسالة عامة.
  // الآن يرمي CanvasTooLargeError ويعرض المتصل للمستخدم الأبعاد الفعلية
  assertExportablePixels(canvasWidth, canvasHeight);

  // محاولة التصدير مباشرةً من Konva Stage لتوحيد محرك التصيير للوضعين (Fitted & Collage)
  if (stageRef) {
    let stageBlob: Blob | null = null;
    try {
      const targetPixelRatio = canvasWidth / stageRef.width();
      // JPEG لا يدعم الشفافية — نلتقط PNG ثم نركّبه على خلفية بيضاء
      // (كان يُنتج خلفية سوداء للتصدير الشفاف)
      const needsWhiteFlatten = format === 'jpg' && backgroundColor === 'transparent';
      stageBlob = await captureStageBlob(
        stageRef,
        targetPixelRatio,
        needsWhiteFlatten ? 'image/png' : format === 'png' ? 'image/png' : 'image/jpeg',
        needsWhiteFlatten ? undefined : quality,
      );
      if (needsWhiteFlatten && stageBlob) {
        const captured = await createImageBitmap(stageBlob);
        const flattenCanvas = document.createElement('canvas');
        flattenCanvas.width = canvasWidth;
        flattenCanvas.height = canvasHeight;
        const fctx = flattenCanvas.getContext('2d');
        if (fctx) {
          fctx.fillStyle = previewWhite();
          fctx.fillRect(0, 0, canvasWidth, canvasHeight);
          // تمرير الأبعاد المستهدفة صراحة — اللقطة قد تُلتقط بدقة مصغرة والرسم
          // بحجمها الأصلي كان يترك إطاراً أبيض فارغاً على يمين وأسفل الصورة
          fctx.drawImage(captured, 0, 0, canvasWidth, canvasHeight);
          const flattenedBlob = await new Promise<Blob | null>((resolve) => {
            flattenCanvas.toBlob(resolve, 'image/jpeg', quality);
          });
          if (flattenedBlob) stageBlob = flattenedBlob;
        }
        captured.close();
      }
    } catch (e) {
      console.error('Failed to export via Konva Stage, falling back to manual canvas:', e);
      stageBlob = null;
    }

    if (stageBlob) {
      return await applyWatermarkIfFree(stageBlob, format, quality);
    }
  }

  // Fallback البديل في حال عدم وجود المكون الرسومي نشطاً (للاختبارات مثلاً)
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (format === 'jpg' || backgroundColor !== 'transparent') {
    // 🎨 تدرج الخلفية: نفس هندسة Konva (0° يسار→يمين مع عقارب الساعة، حول المركز)
    const hasGradient =
      Boolean(backgroundGradientColor2) &&
      backgroundColor !== 'transparent' &&
      backgroundGradientColor2 !== 'transparent';
    if (hasGradient) {
      // نفس دالة المرسم (gradient-geometry) → امتداد واتجاه متطابقان بين المعاينة والناتج
      const { start, end } = gradientPixelPoints(
        backgroundGradientAngle ?? 135,
        canvasWidth,
        canvasHeight,
      );
      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, backgroundColor);
      grad.addColorStop(1, backgroundGradientColor2 as string);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = backgroundColor === 'transparent' ? previewWhite() : backgroundColor;
    }
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  if (mode === 'collage') {
    const state = useEditorStore.getState();
    await renderCollageBranch(ctx, {
      canvasWidth,
      canvasHeight,
      slots,
      collageGap: state.collageGap,
      collageMargin: state.collageMargin,
      collageRadius: state.collageRadius,
      collageShowCutLines: state.collageShowCutLines,
      collageShowEndCutLine: state.collageShowEndCutLine,
      collageStrokeWidth: state.collageStrokeWidth,
      collageStrokeColor: state.collageStrokeColor,
      collageTemplate: state.collageTemplate,
    });
  } else {
    await renderFittedBranch(ctx, elements, canvasWidth, canvasHeight);
  }

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
}
