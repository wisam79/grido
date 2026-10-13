/**
 * نسخة العرض المخفّضة للكانفاس (Display-Resolution Image Proxy).
 * M16-final: getDisplayImage غير محجوب في المتصفح الحقيقي.
 */
const MAX_DISPLAY_DIM = 2048;
const CACHE_LIMIT = 24;
const displayCache = new Map<HTMLImageElement, HTMLCanvasElement>();
const pendingProxy = new Map<HTMLImageElement, Promise<HTMLCanvasElement | null>>();
function touchCacheOrder(image: HTMLImageElement, canvas: HTMLCanvasElement): void {
  displayCache.delete(image);
  displayCache.set(image, canvas);
  while (displayCache.size > CACHE_LIMIT) {
    const oldest = displayCache.keys().next();
    if (oldest.done) break;
    displayCache.delete(oldest.value);
    pendingProxy.delete(oldest.value);
  }
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
}
