import { createScannerCanvas, getScanner2DContext } from './scanner-canvas';

/**
 * 🧩 ابتلاع عصبي ثابت الميزانية (R2 من خطة الترحيل §3) — المرحلة 3.
 *
 * كانفاس ابتلاع مربّع ثابت `ML_INGEST_SIZE = 224` مطابق لعقد التدريب والاستدلال
 * الأصلي لنموذج `DocCornerNet` (`scanic-mlDetector.js`):
 *   - دخل الغراف ثابت `[1, 224, 224, 3]`.
 *   - يُرسم إطار المصدر ليملأ كامل الكانفاس `224×224` مباشرة (`drawImage` بملء الإطار
 *     بلا أشرطة letterbox رمادية مصطنعة تولّد حواف حادة زائفة داخل التنسور).
 *   - يُستخرج `getImageData` مرة واحدة (~197KB) ويُنقل للعامل بـ`transfer`.
 *
 * الضمان المكاني: Heap الكشف ≤ 50MB بغض النظر عن دقة المصدر (سجل B2/B3).
 */

export const ML_INGEST_SIZE = 224;

/** لون التعبئة المحايد لتعتيم المناطق المكتشفة في التمريرات المتعددة. */
const INGEST_PADDING_GRAY = 0x80;

export interface IngestFrame {
  /** بيانات البكسل 224×224 RGBA — المخزن transferable. */
  buffer: ArrayBuffer;
  width: number;
  height: number;
  /** عامل التحويل من فضاء الابتلاع (224×224) إلى فضاء المصدر المعروض. */
  scaleX: number;
  scaleY: number;
  /** إزاحة الابتلاع (0 لأن الرسم بملء الإطار الكامل 224×224). */
  offsetX: number;
  offsetY: number;
}

/** كانفاس الابتلاع الحي (يُحتفظ به للتمريرات المتعددة — تعتيم المناطق المكتشفة). */
export interface IngestCanvas {
  canvas: HTMLCanvasElement;
  size: number;
}

/** يبني كانفاس الابتلاع الثابت (224×224 بملء الإطار الكامل كما دُرّب DocCornerNet). */
export function buildIngestCanvas(src: HTMLImageElement, size = ML_INGEST_SIZE): IngestCanvas {
  const canvas = createScannerCanvas(size, size) as HTMLCanvasElement;
  const ctx = getScanner2DContext(canvas, true);
  if (!ctx) return { canvas, size };

  const srcW = src.naturalWidth || src.width;
  const srcH = src.naturalHeight || src.height;
  if (srcW > 0 && srcH > 0 && typeof ctx.drawImage === 'function') {
    ctx.drawImage(src, 0, 0, srcW, srcH, 0, 0, size, size);
  }
  return { canvas, size };
}

/** يلتقط إطار الابتلاع مع مصفوفة التحويل العكسية نحو فضاء المصدر. */
export function captureIngestFrame(
  ingest: IngestCanvas,
  srcW: number,
  srcH: number,
): IngestFrame | null {
  const ctx = getScanner2DContext(ingest.canvas, true);
  if (!ctx) return null;
  const data = ctx.getImageData(0, 0, ingest.size, ingest.size);

  return {
    buffer: data.data.slice().buffer,
    width: ingest.size,
    height: ingest.size,
    scaleX: srcW / ingest.size,
    scaleY: srcH / ingest.size,
    offsetX: 0,
    offsetY: 0,
  };
}

/** يرفع ركنين من فضاء الابتلاع إلى فضاء المصدر (عكس الـletterbox) مع القصّ للحدود. */
export function ingestPointToSource(
  x: number,
  y: number,
  frame: Pick<IngestFrame, 'scaleX' | 'scaleY'>,
  srcW: number,
  srcH: number,
): { x: number; y: number } {
  return {
    x: Math.min(srcW - 1, Math.max(0, x * frame.scaleX)),
    y: Math.min(srcH - 1, Math.max(0, y * frame.scaleY)),
  };
}

/** يعتيم مضلع مكتشف على كانفاس الابتلاع (تمريرة multi التالية) بلون الحشوة المحايد. */
export function maskQuadOnIngest(
  ingest: IngestCanvas,
  quadInIngest: Array<{ x: number; y: number }>,
): boolean {
  const ctx = getScanner2DContext(ingest.canvas, true);
  if (!ctx || quadInIngest.length !== 4) return false;
  if (typeof ctx.save === 'function') {
    ctx.save();
    ctx.fillStyle = `rgb(${INGEST_PADDING_GRAY}, ${INGEST_PADDING_GRAY}, ${INGEST_PADDING_GRAY})`;
    ctx.beginPath?.();
    ctx.moveTo?.(quadInIngest[0].x, quadInIngest[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo?.(quadInIngest[i].x, quadInIngest[i].y);
    ctx.closePath?.();
    ctx.fill?.();
    // تمديد بسيط لإخفاء هالة الحافة المحيطة بالمضلع
    ctx.lineWidth = 4;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.stroke?.();
    ctx.restore();
  }
  return true;
}

/** يحرر كانفاس الابتلاع (تصفير الأبعاد). */
export function releaseIngestCanvas(ingest: IngestCanvas): void {
  ingest.canvas.width = 0;
  ingest.canvas.height = 0;
}
