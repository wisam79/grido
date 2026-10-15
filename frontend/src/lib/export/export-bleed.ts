/**
 * منطقة النزيف (Bleed) وعلامات القص — تُطبق بعد التصدير وقبل التسليم.
 * مستخرجة من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */
import { previewWhite, TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { assertExportablePixels } from '@/lib/export/export-limits';

function renderBleedCanvas(
  drawable: CanvasImageSource,
  imgWidth: number,
  imgHeight: number,
  bleedMM: number,
  showCropMarks: boolean,
  format: 'png' | 'jpg',
  quality: number,
  dpi: number,
  fallbackBlob: Blob,
): Promise<Blob> {
  return new Promise((resolve) => {
    const bleedPx = Math.round((bleedMM * dpi) / 25.4);
    const canvas = document.createElement('canvas');
    canvas.width = imgWidth + bleedPx * 2;
    canvas.height = imgHeight + bleedPx * 2;

    // النزيف يكبّر اللوحة — نحرسها أيضاً حتى لا ننفجر ذاكرةً بعد نجاح التصدير
    assertExportablePixels(canvas.width, canvas.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(fallbackBlob);
      return;
    }

    // خلفية بيضاء لتغطية منطقة النزيف
    ctx.fillStyle = previewWhite();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // رسم الصورة الأصلية في المنتصف
    ctx.drawImage(drawable, bleedPx, bleedPx);

    // مرآة حواف الصورة داخل منطقة النزيف بدلاً من خلفية بيضاء ناصعة —
    // انعكاس شرائط الحواف الأربعة ثم الزوايا الأربع (على المحورين)
    if (bleedPx > 0) {
      const strip = Math.min(bleedPx, imgWidth, imgHeight);
      if (strip > 0) {
        ctx.save();
        // يسار
        ctx.translate(bleedPx, bleedPx);
        ctx.scale(-1, 1);
        ctx.drawImage(drawable, 0, 0, strip, imgHeight, 0, 0, strip, imgHeight);
        ctx.restore();
        // يمين
        ctx.save();
        ctx.translate(bleedPx + imgWidth, bleedPx);
        ctx.scale(-1, 1);
        ctx.drawImage(drawable, imgWidth - strip, 0, strip, imgHeight, 0, 0, strip, imgHeight);
        ctx.restore();
        // أعلى
        ctx.save();
        ctx.translate(bleedPx, bleedPx);
        ctx.scale(1, -1);
        ctx.drawImage(drawable, 0, 0, imgWidth, strip, 0, 0, imgWidth, strip);
        ctx.restore();
        // أسفل
        ctx.save();
        ctx.translate(bleedPx, bleedPx + imgHeight);
        ctx.scale(1, -1);
        ctx.drawImage(drawable, 0, imgHeight - strip, imgWidth, strip, 0, 0, imgWidth, strip);
        ctx.restore();
        // الزاوية العلوية اليسرى
        ctx.save();
        ctx.translate(bleedPx, bleedPx);
        ctx.scale(-1, -1);
        ctx.drawImage(drawable, 0, 0, strip, strip, 0, 0, strip, strip);
        ctx.restore();
        // الزاوية العلوية اليمنى
        ctx.save();
        ctx.translate(bleedPx + imgWidth, bleedPx);
        ctx.scale(-1, -1);
        ctx.drawImage(drawable, imgWidth - strip, 0, strip, strip, 0, 0, strip, strip);
        ctx.restore();
        // الزاوية السفلية اليسرى
        ctx.save();
        ctx.translate(bleedPx, bleedPx + imgHeight);
        ctx.scale(-1, -1);
        ctx.drawImage(drawable, 0, imgHeight - strip, strip, strip, 0, 0, strip, strip);
        ctx.restore();
        // الزاوية السفلية اليمنى
        ctx.save();
        ctx.translate(bleedPx + imgWidth, bleedPx + imgHeight);
        ctx.scale(-1, -1);
        ctx.drawImage(
          drawable,
          imgWidth - strip,
          imgHeight - strip,
          strip,
          strip,
          0,
          0,
          strip,
          strip,
        );
        ctx.restore();
      }
    }

    // رسم علامات القص
    if (showCropMarks && bleedPx > 0) {
      ctx.strokeStyle = TEXT_COLOR_DEFAULT;
      ctx.lineWidth = Math.max(1, Math.round(dpi / 150));
      const markLen = Math.min(bleedPx * 0.8, dpi * 0.2); // طول العلامة
      const offset = bleedPx;

      ctx.beginPath();
      // Top Left
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, markLen);
      ctx.moveTo(0, offset);
      ctx.lineTo(markLen, offset);

      // Top Right
      ctx.moveTo(canvas.width - offset, 0);
      ctx.lineTo(canvas.width - offset, markLen);
      ctx.moveTo(canvas.width, offset);
      ctx.lineTo(canvas.width - markLen, offset);

      // Bottom Left
      ctx.moveTo(offset, canvas.height);
      ctx.lineTo(offset, canvas.height - markLen);
      ctx.moveTo(0, canvas.height - offset);
      ctx.lineTo(markLen, canvas.height - offset);

      // Bottom Right
      ctx.moveTo(canvas.width - offset, canvas.height);
      ctx.lineTo(canvas.width - offset, canvas.height - markLen);
      ctx.moveTo(canvas.width, canvas.height - offset);
      ctx.lineTo(canvas.width - markLen, canvas.height - offset);

      ctx.stroke();
    }

    canvas.toBlob(
      (newBlob) => resolve(newBlob || fallbackBlob),
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality,
    );
  });
}

// تطبيق منطقة النزيف وعلامات القص
export async function applyBleedAndCropMarks(
  blob: Blob,
  bleedMM: number,
  showCropMarks: boolean,
  format: 'png' | 'jpg' = 'png',
  quality = 0.95,
  dpi = 300,
): Promise<Blob> {
  if (bleedMM === 0 && !showCropMarks) return blob;

  // 🚀 مسار فك الترميز غير المتزامن المسرَّع بالعتاد (createImageBitmap)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const res = await renderBleedCanvas(
        bitmap,
        bitmap.width,
        bitmap.height,
        bleedMM,
        showCropMarks,
        format,
        quality,
        dpi,
        blob,
      );
      bitmap.close();
      return res;
    } catch {
      // احتياطي للبيئات غير المدعومة أو الاختبارات
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const res = await renderBleedCanvas(
        img,
        img.width,
        img.height,
        bleedMM,
        showCropMarks,
        format,
        quality,
        dpi,
        blob,
      );
      resolve(res);
    };
    img.src = url;
  });
}
