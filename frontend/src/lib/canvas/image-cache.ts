/**
 * Image Cache & Preloader (Canvas & UI Image Pipeline)
 *
 * كاش صور نقي في طبقة المكتبات (lib/canvas) بمعمارية LRU بسقفين: 100 صورة
 * و256 MiB تقديرية — أيّهما بلغ أولاً يُطلق أقدم إدخال.
 * مستقل تماماً عن React hooks ولا يعتمد على دورة حياة المكونات،
 * مما يسمح لشرائح Zustand (مثل core-slice) باستدعائه مباشرةً
 * دون اختراق حدود الطبقات بين الستور والواجهة.
 */

const imageCache = new Map<string, HTMLImageElement>();

const MAX_IMAGE_CACHE = 100;
// سقف بايتات تقديري بجانب سقف العدد: 100 صورة بدقة كاملة قد تعني ~9.6 غ.ب
// لصور 24 ميجابكسل (24MP × 4 بايت × 100)، وهو ما يُغرق الذاكرة بلا حاجة.
const MAX_CACHE_BYTES = 256 * 1024 * 1024;

const cacheBytes = new Map<string, number>();
let totalCacheBytes = 0;

function estimateBytes(img: HTMLImageElement): number {
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  // الصور بلا أبعاد معروفة (jsdom/قبل الـ decode) لا تُحتسب في ميزانية البايتات.
  return w > 0 && h > 0 ? w * h * 4 : 0;
}

function dropKey(key: string): void {
  if (!imageCache.delete(key)) return;
  totalCacheBytes -= cacheBytes.get(key) ?? 0;
  cacheBytes.delete(key);
}

// إسقاط أقدم إدخال حتى يتحقق سقف العدد والبايتات معاً، مع إبقاء الإدخال
// الجديد وحده إن كان أكبر من الميزانية كاملة (وإلا طُرد فوراً).
// ⚠️ حذف الإدخال فقط دون لمس img.src: الكائن المطرود قد تكون عقدة Konva
// تعرضه حالياً (نفس المرجع مُمرَّر عبر setImage)، وتصفير src كان سيُفرغ
// الصورة من الكانفس. جامع القمامة يحرر الذاكرة عند زوال آخر مرجع حي.
function evictOverflow(): void {
  while (
    imageCache.size > 1 &&
    (imageCache.size > MAX_IMAGE_CACHE || totalCacheBytes > MAX_CACHE_BYTES)
  ) {
    const oldestKey = imageCache.keys().next().value;
    if (!oldestKey) break;
    dropKey(oldestKey);
  }
}

export function touchCacheKey(key: string): void {
  // إعادة الإدراج عند الإصابة لتحريك المفتاح إلى نهاية ترتيب Map (الأحدث استخداماً) —
  // بلا هذا، يبقى ترتيب الطرد بتاريخ الإدراج الأول (FIFO) لا بالاستخدام الفعلي (LRU).
  const img = imageCache.get(key);
  if (img) {
    imageCache.delete(key);
    imageCache.set(key, img);
  }
}

export function setWithLRU(key: string, img: HTMLImageElement): void {
  // If already present, re-insert to mark as recently used
  if (imageCache.has(key)) {
    dropKey(key);
  }
  imageCache.set(key, img);
  const bytes = estimateBytes(img);
  cacheBytes.set(key, bytes);
  totalCacheBytes += bytes;
  evictOverflow();
}

export function getCachedImage(key: string): HTMLImageElement | undefined {
  return imageCache.get(key);
}

export function hasCachedImage(key: string): boolean {
  return imageCache.has(key);
}

export function invalidateImageCache(src?: string): void {
  if (src) {
    for (const key of Array.from(imageCache.keys())) {
      if (key === src || key.startsWith(`${src}__`)) {
        // حذف الإدخال فقط دون تصفير img.src — الكائن المحذوف قد تكون
        // عقدة Konva تعرضه حالياً، والتصفير كان سيُفرغه من الكانفس.
        // إسقاط مرجع الكاش يكفي: جامع القمامة يحرر الذاكرة عند زوال
        // آخر مرجع حي، وإعادة الطلب لاحقاً تعيد التحميل من الشبكة/القرص.
        dropKey(key);
      }
    }
  } else {
    imageCache.clear();
    cacheBytes.clear();
    totalCacheBytes = 0;
  }
}

/**
 * تسخين الكاش بصورة (تحميل + decode) قبل تبديل عنصر الكانفس عليها —
 * عند إعادة الرندر يصيب useAsyncImage الكاش فوراً فيظهر التبديل بلا وميض.
 * لا ترفع خطأ أبداً: فشل التسخين يعني ببساطة العودة للمسار العادي (jsdom/الاختبارات).
 */
export function preloadImageIntoCache(src: string, crossOrigin?: string): Promise<void> {
  if (!src) return Promise.resolve();
  const cacheKey = `${src}__${crossOrigin || ''}`;
  if (imageCache.has(cacheKey)) {
    touchCacheKey(cacheKey);
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;

    img.onload = () => {
      const finish = () => {
        setWithLRU(cacheKey, img);
        resolve();
      };
      if (typeof img.decode === 'function') {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}
