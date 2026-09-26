import { useState, useEffect } from 'react';

const imageCache = new Map<string, HTMLImageElement>();
const pendingLoads = new Map<string, Promise<HTMLImageElement>>();

const MAX_IMAGE_CACHE = 100;

function touchCacheKey(key: string) {
  // إعادة الإدراج عند الإصابة لتحريك المفتاح إلى نهاية ترتيب Map (الأحدث استخداماً) —
  // بلا هذا، يبقى ترتيب الطرد بتاريخ الإدراج الأول (FIFO) لا بالاستخدام الفعلي (LRU).
  const img = imageCache.get(key);
  if (img) {
    imageCache.delete(key);
    imageCache.set(key, img);
  }
}

function setWithLRU(key: string, img: HTMLImageElement) {
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

export function invalidateImageCache(src?: string) {
  if (src) {
    for (const key of Array.from(imageCache.keys())) {
      if (key.startsWith(src)) {
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

export function useAsyncImage(src: string, crossOrigin?: string) {
  // ⚡ تهيئة كسولة تزامنية من الكاش — كانت الحالة الابتدائية undefined دائماً
  // فيطلق queueMicrotask + re-render إضافي حتى للصور المتواجدة مسبقاً في الكاش
  const [image, setImage] = useState<HTMLImageElement | undefined>(() => {
    if (!src) return undefined;
    const cacheKey = `${src}__${crossOrigin || ''}`;
    const cached = imageCache.get(cacheKey);
    // لمس LRU عند الإصابة من المهيئ الكسول — القراءة وحدها لا تحرّك ترتيب Map.
    if (cached) touchCacheKey(cacheKey);
    return cached && cached.complete ? cached : undefined;
  });
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(() => {
    if (!src) return 'failed';
    const cached = imageCache.get(`${src}__${crossOrigin || ''}`);
    return cached && cached.complete ? 'loaded' : 'loading';
  });

  useEffect(() => {
    let isCurrent = true;

    if (!src) {
      queueMicrotask(() => {
        if (!isCurrent) return;
        setImage(undefined);
        setStatus('failed');
      });
      return () => {
        isCurrent = false;
      };
    }

    const cacheKey = `${src}__${crossOrigin || ''}`;
    const cached = imageCache.get(cacheKey);
    if (cached && cached.complete) {
      // لمس LRU: إصابة الكاش عند تغيّر src تُحدّث الحداثة أيضاً.
      touchCacheKey(cacheKey);
      // الحالة الأولية أصيبت تزامنياً من lazy initializer — هذا المسار يخدم
      // فقط تغييرات src اللاحقة على مثيل مركّب. microtask يبقي التحديث خارج
      // جسم الـ effect المتزامن (react-hooks/set-state-in-effect) مع بقاء
      // تحديث واحد لا أكثر (functional updates لا تعيد رندر عند تطابق القيمة)
      queueMicrotask(() => {
        if (!isCurrent) return;
        setImage((prev) => (prev === cached ? prev : cached));
        setStatus((prev) => (prev === 'loaded' ? prev : 'loaded'));
      });
      return () => {
        isCurrent = false;
      };
    }

    queueMicrotask(() => {
      if (isCurrent) setStatus('loading');
    });

    const pending = pendingLoads.get(cacheKey);
    if (pending) {
      pending
        .then((loadedImg) => {
          if (!isCurrent) return;
          setImage(loadedImg);
          setStatus('loaded');
        })
        .catch(() => {
          if (!isCurrent) return;
          setImage(undefined);
          setStatus('failed');
        });
      return () => {
        isCurrent = false;
      };
    }

    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }

    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => {
        const finish = () => {
          setWithLRU(cacheKey, img);
          pendingLoads.delete(cacheKey);
          if (isCurrent) {
            setImage(img);
            setStatus('loaded');
          }
          resolve(img);
        };

        if (typeof img.decode === 'function') {
          img.decode().then(finish).catch(finish);
        } else {
          finish();
        }
      };

      img.onerror = () => {
        pendingLoads.delete(cacheKey);
        if (isCurrent) {
          console.error('[useAsyncImage] Failed to load image:', src);
          setImage(undefined);
          setStatus('failed');
        }
        reject(new Error(`Failed to load image: ${src}`));
      };
    });

    pendingLoads.set(cacheKey, loadPromise);
    img.src = src;

    return () => {
      isCurrent = false;
      // 🛡️ لا نقوم بتصفير img.onload / img.onerror أو تفريغ img.src هنا،
      // لضمان اكتمال الوعد في pendingLoads وحفظ الصورة في الكاش العالمي (imageCache)
      // حتى عند إلغاء تركيب المكون (unmount)، مما يمنع تسريب وعود معلقة أو تجميد التحميل.
    };
  }, [src, crossOrigin]);

  return [image, status] as const;
}
