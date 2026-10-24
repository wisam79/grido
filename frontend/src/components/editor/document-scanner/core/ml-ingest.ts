import { createScannerCanvas, getScanner2DContext } from './scanner-canvas';

/**
 * 🧩 ابتلاع عصبي ثابت الميزانية (R2 من خطة الترحيل §3) — المرحلة 3.
 *
 * كانفاس ابتلاع مربّع ثابت `ML_INGEST_SIZE = 224` (عقد النموذج المفحوص:
 * دخل غراف ثابت [1,224,224,3]) بـletterbox يحافظ على النسبة وتعبئة محايدة
 * #808080 — لا حواف زائفة. drawImage مباشرة من عنصر الصورة (تحجيم GPU —
 * لا ImageData وسيط بدقة كاملة)، ثم getImageData مرة واحدة (~197KB)
 * يُنقل للعامل بـtransfer (إصلاح نمط النسخ detector-worker-client.ts:88).
 *
 * الضمان المكاني: Heap الكشف ≤ 50MB بغض النظر عن دقة المصدر (سجل B2/B3).
 */

export const ML_INGEST_SIZE = 224;

/** لون التعبئة المحايد للـletterbox (رمادي 50% — لا يُقرأ كحافة مستند). */
const INGEST_PADDING_GRAY = 0x80;

export interface IngestFrame {
  /** بيانات البكسل 224×224 RGBA — المخزن transferable. */
  buffer: ArrayBuffer;
  width: number;
  height: number;
  /** عامل التحويل من فضاء الابتلاع إلى فضاء المصدر المعروض. */
  scaleX: number;
  scaleY: number;
  /** إزاحة الـletterbox داخل الابتلاع (بكسلات ابتلاع). */
  offsetX: number;
  offsetY: number;
}

/** كانفاس الابتلاع الحي (يُحتفظ به للتمريرات المتعددة — تعتيم المناطق المكتشفة). */
export interface IngestCanvas {
  canvas: HTMLCanvasElement;
  size: number;
}

/** يبني كانفاس الابتلاع الثابت من عنصر الصورة (letterbox + تعبئة محايدة). */
export function buildIngestCanvas(src: HTMLImageElement, size = ML_INGEST_SIZE): IngestCanvas {
  const canvas = createScannerCanvas(size, size) as HTMLCanvasElement;
  const ctx = getScanner2DContext(canvas, true);
  if (!ctx) return { canvas, size };

  ctx.fillStyle = `rgb(${INGEST_PADDING_GRAY}, ${INGEST_PADDING_GRAY}, ${INGEST_PADDING_GRAY})`;
  ctx.fillRect(0, 0, size, size);

  const srcW = src.naturalWidth || src.width;
  const srcH = src.naturalHeight || src.height;
  if (srcW > 0 && srcH > 0) {
    // تحجيم يحافظ على النسبة (letterbox) — لا ضغط تشويه
    const scale = Math.min(size / srcW, size / srcH);
    const drawW = Math.max(1, Math.round(srcW * scale));
    const drawH = Math.max(1, Math.round(srcH * scale));
    ctx.drawImage(src, 0, 0, srcW, srcH, 0, 0, drawW, drawH);
  }
  return { canvas, size };
}

/** يلتقط إطار الابتلاع مع مصفوفة التحويل عكسية نحو فضاء المصدر. */
export function captureIngestFrame(
  ingest: IngestCanvas,
  srcW: number,
  srcH: number,
): IngestFrame | null {
  const ctx = getScanner2DContext(ingest.canvas, true);
  if (!ctx) return null;
  const data = ctx.getImageData(0, 0, ingest.size, ingest.size);

  const scale = Math.min(ingest.size / srcW, ingest.size / srcH);
  const drawW = Math.max(1, Math.round(srcW * scale));
  const drawH = Math.max(1, Math.round(srcH * scale));

  return {
    buffer: data.data.slice().buffer,
    width: ingest.size,
    height: ingest.size,
    scaleX: srcW / drawW,
    scaleY: srcH / drawH,
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
  ctx.save();
  ctx.fillStyle = `rgb(${INGEST_PADDING_GRAY}, ${INGEST_PADDING_GRAY}, ${INGEST_PADDING_GRAY})`;
  ctx.beginPath();
  ctx.moveTo(quadInIngest[0].x, quadInIngest[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(quadInIngest[i].x, quadInIngest[i].y);
  ctx.closePath();
  ctx.fill();
  // تمديد بسيط لإخفاء هالة الحافة المحيطة بالمضلع
  ctx.lineWidth = 4;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.stroke();
  ctx.restore();
  return true;
}

/** يحرر كانفاس الابتلاع (تصفير الأبعاد). */
export function releaseIngestCanvas(ingest: IngestCanvas): void {
  ingest.canvas.width = 0;
  ingest.canvas.height = 0;
}
