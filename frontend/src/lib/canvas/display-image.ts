/**
 * نسخة العرض المخفّضة للكانفاس (Display-Resolution Image Proxy).
 * M16-final: getDisplayImage غير محجوب في المتصفح الحقيقي.
 */
export const MAX_DISPLAY_DIM = 2048;
const CACHE_LIMIT = 24;
// 2048×2048×4 ≈ 16 MiB للنسخة الواحدة؛ 24 نسخة تعني ~384 MiB. الميزانية
// تُبقي أحدث النسخ فقط بغض النظر عن العدد، وتُحرَّر مع مستند جديد.
const MAX_DISPLAY_BYTES = 128 * 1024 * 1024;
const displayCache = new Map<HTMLImageElement, HTMLCanvasElement>();
const pendingProxy = new Map<HTMLImageElement, Promise<HTMLCanvasElement | null>>();
const displayBytes = new Map<HTMLImageElement, number>();
// خريطة عكسية ضعيفة: نسخة العرض ← الصورة الأصلية، ليتمكن مسار الطباعة من
// التقاط الدقة الكاملة بدل تكبير نسخة 2048px. WeakMap لا يمنع تحرير الأصل.
const proxySources = new WeakMap<HTMLCanvasElement, HTMLImageElement>();
let totalDisplayBytes = 0;

function canvasBytes(canvas: HTMLCanvasElement): number {
  return canvas.width * canvas.height * 4;
}

function dropDisplayEntry(image: HTMLImageElement): void {
  if (!displayCache.delete(image)) return;
  totalDisplayBytes -= displayBytes.get(image) ?? 0;
  displayBytes.delete(image);
}

function touchCacheOrder(image: HTMLImageElement, canvas: HTMLCanvasElement): void {
  dropDisplayEntry(image);
  displayCache.set(image, canvas);
  const bytes = canvasBytes(canvas);
  displayBytes.set(image, bytes);
  totalDisplayBytes += bytes;
  proxySources.set(canvas, image);
  while (
    displayCache.size > 1 &&
    (displayCache.size > CACHE_LIMIT || totalDisplayBytes > MAX_DISPLAY_BYTES)
  ) {
    const oldest = displayCache.keys().next();
    if (oldest.done) break;
    dropDisplayEntry(oldest.value);
    pendingProxy.delete(oldest.value);
  }
}

/** يعيد الصورة الأصلية لنسخة عرض، أو null إن لم تكن نسخة مُشتقة. */
export function getDisplaySource(
  image: HTMLImageElement | HTMLCanvasElement | null | undefined,
): HTMLImageElement | null {
  if (!image || !(image instanceof HTMLCanvasElement)) return null;
  return proxySources.get(image) ?? null;
}

function naturalSizeOf(image: HTMLImageElement): { w: number; h: number } {
  const w = image.naturalWidth || image.width || 0;
  const h = image.naturalHeight || image.height || 0;
  return { w, h };
}
function exceedsCap(image: HTMLImageElement): boolean {
  const { w, h } = naturalSizeOf(image);
  return w > 0 && h > 0 && Math.max(w, h) > MAX_DISPLAY_DIM;
}
function drawSyncProxy(image: HTMLImageElement): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const { w, h } = naturalSizeOf(image);
  const scale = MAX_DISPLAY_DIM / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
  return canvas;
}
export function getDisplayImage(
  image: HTMLImageElement | null | undefined,
): HTMLImageElement | HTMLCanvasElement | null {
  if (!image) return null;
  const { w, h } = naturalSizeOf(image);
  if (w <= 0 || h <= 0 || Math.max(w, h) <= MAX_DISPLAY_DIM) return image;
  const hit = displayCache.get(image);
  if (hit) {
    touchCacheOrder(image, hit);
    return hit;
  }
  const hasAsyncResize = typeof createImageBitmap === 'function' && typeof document !== 'undefined';
  if (!hasAsyncResize) {
    const canvas = drawSyncProxy(image);
    if (!canvas) return image;
    touchCacheOrder(image, canvas);
    return canvas;
  }
  void ensureDisplayProxy(image);
  return image;
}
async function buildProxyAsync(image: HTMLImageElement): Promise<HTMLCanvasElement | null> {
  const { w, h } = naturalSizeOf(image);
  const scale = MAX_DISPLAY_DIM / Math.max(w, h);
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  if (typeof document === 'undefined') return null;
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(image, {
        resizeWidth: dw,
        resizeHeight: dh,
        resizeQuality: 'high',
      });
      const canvas = document.createElement('canvas');
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close?.();
        return null;
      }
      ctx.drawImage(bitmap, 0, 0, dw, dh);
      bitmap.close?.();
      return canvas;
    } catch {
      /* fallback */
    }
  }
  return drawSyncProxy(image);
}
export async function ensureDisplayProxy(
  image: HTMLImageElement | null | undefined,
): Promise<void> {
  if (!image || !exceedsCap(image)) return;
  const hit = displayCache.get(image);
  if (hit) {
    touchCacheOrder(image, hit);
    return;
  }
  const pending = pendingProxy.get(image);
  if (pending) {
    await pending;
    return;
  }
  const job = buildProxyAsync(image).then((canvas) => {
    if (canvas) touchCacheOrder(image, canvas);
    return canvas;
  });
  pendingProxy.set(image, job);
  try {
    await job;
  } finally {
    pendingProxy.delete(image);
  }
}
export function hasDisplayProxy(image: HTMLImageElement): boolean {
  return displayCache.has(image);
}
export function displayCacheSize(): number {
  return displayCache.size;
}
export function clearDisplayCache(): void {
  displayCache.clear();
  pendingProxy.clear();
  displayBytes.clear();
  totalDisplayBytes = 0;
}
