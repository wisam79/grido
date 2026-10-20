/**
 * طبقة توافق الكانفس بين الخيط الرئيسي و Web Worker.
 *
 * الخيط الرئيسي يعمل بـ HTMLCanvasElement والعامل يعمل بـ OffscreenCanvas،
 * والدوال المشتركة (الفلاتر/الاستعدال) يجب أن تعمل في السياقين بلا تكرار.
 */

export type ScannerCanvas = HTMLCanvasElement | OffscreenCanvas;

export type Scanner2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** ينشئ كانفساً مناسباً للسياق الحالي: OffscreenCanvas داخل العامل. */
export function createScannerCanvas(width: number, height: number): ScannerCanvas {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  return new OffscreenCanvas(w, h);
}

/**
 * سياق الرسم ثنائي الأبعاد مع خيارات willReadFrequently.
 * نستخدم cast لأن توقيع getContext يختلف بين HTMLCanvasElement و OffscreenCanvas.
 */
export function getScanner2DContext(
  canvas: ScannerCanvas,
  readFrequently = false,
): Scanner2DContext | null {
  const target = canvas as unknown as {
    getContext: (id: '2d', options?: unknown) => unknown;
  };
  const ctx = target.getContext('2d', readFrequently ? { willReadFrequently: true } : undefined);
  return (ctx as Scanner2DContext | null) ?? null;
}

/** يحرّر ذاكرة الكانفس (تصفير الأبعاد) بعد الانتهاء من استخدامه. */
export function releaseScannerCanvas(canvas: ScannerCanvas): void {
  canvas.width = 0;
  canvas.height = 0;
}
