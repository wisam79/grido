/**
 * Image Cache & Preloader (Canvas & UI Image Pipeline)
 *
 * كاش صور نقي في طبقة المكتبات (lib/canvas) بمعمارية LRU (سقف 100 صورة).
 * مستقل تماماً عن React hooks ولا يعتمد على دورة حياة المكونات،
 * مما يسمح لشرائح Zustand (مثل core-slice) باستدعائه مباشرةً
 * دون اختراق حدود الطبقات بين الستور والواجهة.
 */

const imageCache = new Map<string, HTMLImageElement>();
const pendingLoads = new Map<string, Promise<HTMLImageElement>>();

const MAX_IMAGE_CACHE = 100;

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
    imageCache.delete(key);
  } else if (imageCache.size >= MAX_IMAGE_CACHE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) {
      // ⚠️ حذف الإدخال فقط دون لمس oldImg.src: الكائن المطرود قد تكون
      // عقدة Konva تعرضه حالياً (نفس المرجع مُمرَّر عبر setImage)، وتصفير
      // src كان سيُفرغ الصورة من الكانفس. جامع القمامة يحرر الذاكرة
      // عندما لا يبقى أي مرجع حي — وهذا يكفي لمنع التسريب.
      imageCache.delete(oldestKey);
    }
  }
  imageCache.set(key, img);
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
        imageCache.delete(key);
      }
    }
  } else {
    imageCache.clear();
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
