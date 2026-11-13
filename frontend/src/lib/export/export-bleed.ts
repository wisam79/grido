/**
 * منطقة النزيف (Bleed) وعلامات القص — تُطبق بعد التصدير وقبل التسليم.
 */
import { previewWhite, TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { mmToPx } from '@/lib/canvas/units';
import { assertExportablePixels } from '@/lib/export/export-limits';
import { MAX_BLEED_MM } from '@/lib/schema';

function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason;
  return new DOMException('تم إلغاء معالجة النزيف', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError(signal);
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof DOMException && error.name === 'AbortError');
}

export function assertValidBleedMM(bleedMM: number): void {
  if (!Number.isFinite(bleedMM) || bleedMM < 0 || bleedMM > MAX_BLEED_MM) {
    throw new RangeError(`Bleed must be a finite number between 0 and ${MAX_BLEED_MM} mm`);
  }
}

function getBleedPixels(bleedMM: number, dpi: number): number {
  if (!Number.isFinite(dpi) || dpi <= 0) {
    throw new RangeError('DPI must be a finite positive number');
  }
  const bleedPx = Math.round(mmToPx(bleedMM, dpi));
  if (!Number.isSafeInteger(bleedPx) || bleedPx <= 0) {
    throw new RangeError('Positive bleed is too small to produce a pixel at the selected DPI');
  }
  return bleedPx;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: 'image/png' | 'image/jpeg',
  quality: number,
  signal?: AbortSignal,
): Promise<Blob> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => finish(() => reject(abortError(signal)));
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            finish(() => resolve(blob));
          } else {
            finish(() => reject(new Error('تعذر ترميز صورة النزيف إلى ملف')));
          }
        },
        mimeType,
        quality,
      );
    } catch (error) {
      finish(() =>
        reject(error instanceof Error ? error : new Error('تعذر ترميز صورة النزيف إلى ملف')),
      );
    }
  });
}

async function renderBleedCanvas(
  drawable: CanvasImageSource,
  imgWidth: number,
  imgHeight: number,
  bleedMM: number,
  showCropMarks: boolean,
  format: 'png' | 'jpg',
  quality: number,
  dpi: number,
  signal?: AbortSignal,
): Promise<Blob> {
  throwIfAborted(signal);
  if (
    !Number.isSafeInteger(imgWidth) ||
    !Number.isSafeInteger(imgHeight) ||
    imgWidth <= 0 ||
    imgHeight <= 0
  ) {
    throw new Error('أبعاد صورة التصدير غير صالحة لمعالجة النزيف');
  }

  const bleedPx = getBleedPixels(bleedMM, dpi);
  const outputWidth = imgWidth + bleedPx * 2;
  const outputHeight = imgHeight + bleedPx * 2;
  if (!Number.isSafeInteger(outputWidth) || !Number.isSafeInteger(outputHeight)) {
    throw new Error('أبعاد صورة النزيف الموسعة غير صالحة');
  }

  // يجب أن يسبق الحارس إنشاء canvas أو تعيين أبعاده حتى لا تُخصّص لوحة تتجاوز 50MP.
  assertExportablePixels(outputWidth, outputHeight);
  throwIfAborted(signal);

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('تعذر إنشاء سياق الرسم لمعالجة النزيف');
  }

  try {
    ctx.fillStyle = previewWhite();
    ctx.fillRect(0, 0, outputWidth, outputHeight);
    ctx.drawImage(drawable, bleedPx, bleedPx);

    const strip = Math.min(bleedPx, imgWidth, imgHeight);
    if (strip > 0) {
      ctx.save();
      ctx.translate(bleedPx, bleedPx);
      ctx.scale(-1, 1);
      ctx.drawImage(drawable, 0, 0, strip, imgHeight, 0, 0, strip, imgHeight);
      ctx.restore();

      ctx.save();
      ctx.translate(bleedPx + imgWidth, bleedPx);
      ctx.scale(-1, 1);
      ctx.drawImage(drawable, imgWidth - strip, 0, strip, imgHeight, 0, 0, strip, imgHeight);
      ctx.restore();

      ctx.save();
      ctx.translate(bleedPx, bleedPx);
      ctx.scale(1, -1);
      ctx.drawImage(drawable, 0, 0, imgWidth, strip, 0, 0, imgWidth, strip);
      ctx.restore();

      ctx.save();
      ctx.translate(bleedPx, bleedPx + imgHeight);
      ctx.scale(1, -1);
      ctx.drawImage(drawable, 0, imgHeight - strip, imgWidth, strip, 0, 0, imgWidth, strip);
      ctx.restore();

      ctx.save();
      ctx.translate(bleedPx, bleedPx);
      ctx.scale(-1, -1);
      ctx.drawImage(drawable, 0, 0, strip, strip, 0, 0, strip, strip);
      ctx.restore();

      ctx.save();
      ctx.translate(bleedPx + imgWidth, bleedPx);
      ctx.scale(-1, -1);
      ctx.drawImage(drawable, imgWidth - strip, 0, strip, strip, 0, 0, strip, strip);
      ctx.restore();

      ctx.save();
      ctx.translate(bleedPx, bleedPx + imgHeight);
      ctx.scale(-1, -1);
      ctx.drawImage(drawable, 0, imgHeight - strip, strip, strip, 0, 0, strip, strip);
      ctx.restore();

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

    if (showCropMarks) {
      ctx.strokeStyle = TEXT_COLOR_DEFAULT;
      ctx.lineWidth = Math.max(1, Math.round(dpi / 150));
      const markLen = Math.min(bleedPx * 0.8, dpi * 0.2);
      const offset = bleedPx;

      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset, markLen);
      ctx.moveTo(0, offset);
      ctx.lineTo(markLen, offset);
      ctx.moveTo(outputWidth - offset, 0);
      ctx.lineTo(outputWidth - offset, markLen);
      ctx.moveTo(outputWidth, offset);
      ctx.lineTo(outputWidth - markLen, offset);
      ctx.moveTo(offset, outputHeight);
      ctx.lineTo(offset, outputHeight - markLen);
      ctx.moveTo(0, outputHeight - offset);
      ctx.lineTo(markLen, outputHeight - offset);
      ctx.moveTo(outputWidth - offset, outputHeight);
      ctx.lineTo(outputWidth - offset, outputHeight - markLen);
      ctx.moveTo(outputWidth, outputHeight - offset);
      ctx.lineTo(outputWidth - markLen, outputHeight - offset);
      ctx.stroke();
    }
  } catch (error) {
    if (isAbortError(error, signal)) throw abortError(signal);
    throw error instanceof Error ? error : new Error('تعذر رسم منطقة النزيف');
  }

  throwIfAborted(signal);
  return canvasToBlob(canvas, format === 'png' ? 'image/png' : 'image/jpeg', quality, signal);
}

function waitForBitmap(blob: Blob, signal?: AbortSignal): Promise<ImageBitmap> {
  throwIfAborted(signal);
  const work = createImageBitmap(blob);
  if (!signal) return work;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => finish(() => reject(abortError(signal)));
    signal.addEventListener('abort', onAbort, { once: true });
    work.then(
      (bitmap) => {
        if (settled) {
          bitmap.close();
          return;
        }
        finish(() => resolve(bitmap));
      },
      (error) => finish(() => reject(error)),
    );
  });
}

function renderThroughImageElement(
  blob: Blob,
  bleedMM: number,
  showCropMarks: boolean,
  format: 'png' | 'jpg',
  quality: number,
  dpi: number,
  signal?: AbortSignal,
): Promise<Blob> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const img = new Image();
    let url = '';
    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      img.onload = null;
      img.onerror = null;
      if (url) URL.revokeObjectURL(url);
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        img.src = '';
      } catch {
        // لا يؤثر فشل تفريغ المصدر في نتيجة الإلغاء.
      }
      reject(abortError(signal));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    img.onerror = () => finish(() => reject(new Error('تعذر فك ترميز صورة التصدير للنزيف')));
    img.onload = () => {
      void (async () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          const result = await renderBleedCanvas(
            img,
            width,
            height,
            bleedMM,
            showCropMarks,
            format,
            quality,
            dpi,
            signal,
          );
          finish(() => resolve(result));
        } catch (error) {
          finish(() => reject(error));
        }
      })();
    };

    try {
      url = URL.createObjectURL(blob);
      img.src = url;
    } catch (error) {
      finish(() =>
        reject(error instanceof Error ? error : new Error('تعذر تحضير صورة التصدير للنزيف')),
      );
    }
  });
}

/** تطبيق منطقة النزيف وعلامات القص. */
export async function applyBleedAndCropMarks(
  blob: Blob,
  bleedMM: number,
  showCropMarks: boolean,
  format: 'png' | 'jpg' = 'png',
  quality = 0.95,
  dpi = 300,
  signal?: AbortSignal,
): Promise<Blob> {
  assertValidBleedMM(bleedMM);
  throwIfAborted(signal);

  // لا إعادة ترميز ولا تخصيص: صفر نزيف يعيد الكائن نفسه حرفياً.
  if (bleedMM === 0) return blob;

  // يتحقق أيضاً من أن النزيف الموجب ينتج بكسلاً واحداً على الأقل.
  getBleedPixels(bleedMM, dpi);

  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap;
    try {
      bitmap = await waitForBitmap(blob, signal);
    } catch (error) {
      if (isAbortError(error, signal)) throw abortError(signal);
      // قد لا يدعم WebView فك هذا النوع عبر createImageBitmap؛ نجرب مفكك Image.
      // أخطاء الرسم والسياق والترميز بعد نجاح الفك لا تُبتلع ولا تُعاد المحاولة.
      return renderThroughImageElement(blob, bleedMM, showCropMarks, format, quality, dpi, signal);
    }

    try {
      return await renderBleedCanvas(
        bitmap,
        bitmap.width,
        bitmap.height,
        bleedMM,
        showCropMarks,
        format,
        quality,
        dpi,
        signal,
      );
    } finally {
      bitmap.close();
    }
  }

  return renderThroughImageElement(blob, bleedMM, showCropMarks, format, quality, dpi, signal);
}
