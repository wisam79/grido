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
// ─── ملكية الصور: مشتق العرض 2048px من Go وترقية الالتقاط للأصل ───
//
// EXIF (استنتاج E1 الموثق): مسار العرض هنا لا يطبّق الاتجاه يدوياً إطلاقاً —
// لا استدعاء لـgetExifOrientation ولا createImageBitmap مع imageOrientation
// على هذا المسار؛ المتصفح يطبّق EXIF ضمنياً عند فك ترميز <img>، وcreateImageBitmap
// من عنصر <img> مُفكوك يستهلك بكسلاته الموجّهة جاهزةً. مشتق Go مولَّد عبر
// imaging.AutoOrientation(true) فيُخبز الاتجاه داخل البكسلات وينزع وسم
// Orientation من المخرج، فتعرضه الواجهة كما هو = موجّهاً صحيحاً. لذا التبديل
// من الأصل إلى المشتق آمن الاتجاه لكل الوسوم 1..8 دون بوابة اتجاه 1، وهو
// المتسق مع مسار التصدير/الطباعة في Go (AutoOrientation) ومسار القص (نفس
// فضاء الأبعاد الموجّه في الطرفين).
//
// imageSrc في المشروع يبقى الأصل الكامل دون تقليص (قرار محمي) — الخرائط أدناه
// مطلوبة حصراً لترقية التصدير/الطباعة من مشتق العرض إلى الأصل وقت الالتقاط.

// ملكية العرض: عنصر العرض المشتق ← رابط الأصل الكامل. تُسجَّل عند تحميل
// المشتق (use-async-image/preloadImageIntoCache) وتقرأ عند بدء الالتقاط.
const displayOwnership = new WeakMap<HTMLImageElement, string>();

/** يسجل أن عنصر العرض المُمرَّر مشتقٌ من رابط الأصل المُمرَّر (idempotent). */
export function registerDisplayOwnership(
  displayElement: HTMLImageElement,
  originalSrc: string,
): void {
  if (!displayElement || !originalSrc) return;
  if (displayOwnership.has(displayElement)) return;
  displayOwnership.set(displayElement, originalSrc);
}

function getRegisteredOriginalSrc(
  displayElement: HTMLImageElement | null | undefined,
): string | null {
  if (!displayElement || !(displayElement instanceof HTMLImageElement)) return null;
  return displayOwnership.get(displayElement) ?? null;
}

// كاش وعود جلب الأصول: نداءان متزامنان لنفس الرابط يفكّان ترميزه مرة واحدة.
// يبقى الوعد مشتركاً فقط أثناء التحميل؛ كل التقاط يحتفظ بالأصل في lease مستقل
// حتى لا يستطيع انتهاء التقاط مسرح أن يحرر أصول مسرح آخر يعمل بالتوازي.
const pendingOriginals = new Map<string, Promise<HTMLImageElement | null>>();

export interface CaptureOriginalLease {
  readonly released: boolean;
  get(displayElement: HTMLImageElement): HTMLImageElement | null;
  set(displayElement: HTMLImageElement, original: HTMLImageElement): void;
  release(): void;
}

/** ينشئ ملكية أصول مستقلة لعملية التقاط واحدة. */
export function createCaptureOriginalLease(): CaptureOriginalLease {
  const originals = new Map<HTMLImageElement, HTMLImageElement>();
  let released = false;
  return {
    get released() {
      return released;
    },
    get(displayElement) {
      return released ? null : (originals.get(displayElement) ?? null);
    },
    set(displayElement, original) {
      if (!released) originals.set(displayElement, original);
    },
    release() {
      if (released) return;
      released = true;
      originals.clear();
    },
  };
}

function loadOriginalElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * يجلب الأصل الكامل عبر new Image() للرابط المُمرَّر. المشاركة محصورة في وعد
 * التحميل الجاري فقط؛ المرجع القوي بعد التحميل يملكه CaptureOriginalLease.
 */
export function getOriginalForCapture(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const cached = pendingOriginals.get(src);
  if (cached) return cached;
  const job = loadOriginalElement(src);
  pendingOriginals.set(src, job);
  void job.finally(() => {
    if (pendingOriginals.get(src) === job) pendingOriginals.delete(src);
  });
  return job;
}

/** نسخة عنصر العرض: تقرأ ملكية العرض ثم تجلب الأصل داخل lease الالتقاط. */
export async function getOriginalForDisplayedElement(
  displayElement: HTMLImageElement | null | undefined,
  lease: CaptureOriginalLease,
): Promise<HTMLImageElement | null> {
  if (!displayElement || lease.released) return null;
  const src = getRegisteredOriginalSrc(displayElement);
  if (!src) return null;
  const bridged = lease.get(displayElement);
  if (bridged) return bridged;
  const original = await getOriginalForCapture(src);
  if (original) lease.set(displayElement, original);
  return lease.released ? null : original;
}

/** قراءة متزامنة من lease الالتقاط — مسار upgradeImagesToFullResolution. */
export function getCapturedOriginal(
  displayElement: HTMLImageElement | null | undefined,
  lease: CaptureOriginalLease,
): HTMLImageElement | null {
  if (!displayElement || !(displayElement instanceof HTMLImageElement)) return null;
  return lease.get(displayElement);
}

/** يفرغ كاش نسخ العرض بالكامل؛ leases النشطة مستقلة وتتحرر لدى مالكيها. */
export function clearDisplayCache(): void {
  displayCache.clear();
  pendingProxy.clear();
  displayBytes.clear();
  pendingOriginals.clear();
  totalDisplayBytes = 0;
}
