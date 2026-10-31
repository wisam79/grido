/**
 * png-dpi.ts — حقن كثافة الطباعة (pHYs) في بايتات PNG على جانب الواجهة.
 *
 * المرآة الطرفية لـ `internal/server/dpi_patch.go` (setPNGDPI): canvas.toBlob
 * لا يكتب أي بيانات كثافة، فتفترض أدوات الطباعة الخارجية 72/96 DPI ويُقرأ
 * الملف على مقاس فيزيائي خاطئ (نفس البايتات على ورق أكبر/أصغر). مسارات
 * التصدير الرئيسية تمرّ عبر /api/save-file?dpi= ويحقن Go؛ أما تصدير
 * الملصقات المباشر (downloadBlob محلي) فلا يمر بخادم إطلاقاً — لذا الحقن هنا.
 *
 * بلا إعادة ترميز: 21 بايتاً تُدرج بعد IHDR وقبل أول IDAT، وتُحترم pHYs موجودة.
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** المدى المعقول المطابق لـ parseDPI في Go — خارجها يُتجاهل الحقن (0 = لا حقن) */
function isReasonableDpi(dpi: number): boolean {
  return Number.isFinite(dpi) && Number.isInteger(dpi) && dpi >= 36 && dpi <= 2400;
}

function pixelsPerMeter(dpi: number): number {
  return Math.round(dpi / 0.0254);
}

/* ── CRC32 (IEEE 802.3) — نفس متعددة الحدود التي يتطلبها معيار PNG ── */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function hasPngSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

/** يعيد نهاية كتلة IHDR (فهرس البايت الذي تلي CRC الخاص بها) أو -1 */
function findIhdrEnd(bytes: Uint8Array): number {
  // IHDR كتلة إلزامية أولى دائماً: 8 توقيع + 4 طول + 4 نوع
  if (bytes.length < 8 + 8) return -1;
  const type = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (type !== 'IHDR') return -1;
  const dataLen = (bytes[8] << 24) | (bytes[9] << 16) | (bytes[10] << 8) | bytes[11];
  const ihdrEnd = 8 + 8 + dataLen + 4; // +4 CRC
  return ihdrEnd <= bytes.length ? ihdrEnd : -1;
}

/** هل تحتوي البايتات على كتلة pHYs (تبدأ من نقطة معينة لتقليل المسح)؟ */
function containsPhysChunk(bytes: Uint8Array, from: number): boolean {
  let offset = from;
  while (offset + 8 <= bytes.length) {
    const dataLen =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const t1 = bytes[offset + 4];
    const t2 = bytes[offset + 5];
    const t3 = bytes[offset + 6];
    const t4 = bytes[offset + 7];
    if (t1 === 0x70 && t2 === 0x48 && t3 === 0x59 && t4 === 0x73) return true; // pHYs
    if (t1 === 0x49 && t2 === 0x45 && t3 === 0x4e && t4 === 0x44) return false; // IEND
    if (dataLen < 0 || offset + 12 + dataLen > bytes.length) return false;
    offset += 12 + dataLen;
  }
  return false;
}

/**
 * حقن كتلة pHYs في بايتات PNG بعد IHDR مباشرة. يعيد البايتات نفسها عند:
 * توقيع غير مطابق، أو DPI خارج المدى، أو وجود pHYs مسبق. الفشل الصامت مقصود —
 * التصدير لا يُكسر بسبب فشل الحقن (نفس عقد نظيره في Go).
 */
export function injectPngDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  if (!isReasonableDpi(dpi) || !hasPngSignature(bytes)) return bytes;
  const ihdrEnd = findIhdrEnd(bytes);
  if (ihdrEnd === -1) return bytes;
  if (containsPhysChunk(bytes, ihdrEnd)) return bytes;

  const ppm = pixelsPerMeter(dpi);
  // كتلة كاملة: 4 طول + 4 نوع + 9 بيانات + 4 CRC = 21 بايتاً
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9); // طول بيانات pHYs
  chunk[4] = 0x70; // p
  chunk[5] = 0x48; // H
  chunk[6] = 0x59; // Y
  chunk[7] = 0x73; // s
  view.setUint32(8, ppm); // X pixels per meter
  view.setUint32(12, ppm); // Y pixels per meter
  chunk[16] = 1; // unit = meter
  view.setUint32(17, crc32(chunk, 4, 17)); // CRC على النوع + البيانات

  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.subarray(0, ihdrEnd), 0);
  out.set(chunk, ihdrEnd);
  out.set(bytes.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return out;
}

/** نسخة Blob — المسار المباشر لمخرجات canvasToBlob */
export async function injectPngDpiBlob(blob: Blob, dpi: number): Promise<Blob> {
  if (!isReasonableDpi(dpi) || blob.type !== 'image/png') return blob;
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const patched = injectPngDpi(bytes, dpi);
    if (patched === bytes) return blob;
    // patched بايتات جديدة كاملة (لا subarray) — المخزن كله هو الملف
    return new Blob([patched.buffer as ArrayBuffer], { type: 'image/png' });
  } catch {
    // فشل قراءة البايتات لا يُسقط التصدير — يُعاد Blob كما هو
    return blob;
  }
}
