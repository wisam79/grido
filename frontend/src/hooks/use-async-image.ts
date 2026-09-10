import { useState, useEffect } from "react";

const imageCache = new Map<string, HTMLImageElement>();
const pendingLoads = new Map<string, Promise<HTMLImageElement>>();

export function invalidateImageCache(src?: string) {
  if (src) {
    for (const key of imageCache.keys()) {
      if (key.startsWith(src)) {
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
  const cacheKey = `${src}__${crossOrigin || ""}`;
  if (imageCache.has(cacheKey)) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;

    img.onload = () => {
      const finish = () => {
        if (imageCache.size >= 200) {
          const firstKey = imageCache.keys().next().value;
          if (firstKey) imageCache.delete(firstKey);
        }
        imageCache.set(cacheKey, img);
        resolve();
      };
      if (typeof img.decode === "function") {
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
    const cached = imageCache.get(`${src}__${crossOrigin || ""}`);
    return cached && cached.complete ? cached : undefined;
  });
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(() => {
    if (!src) return "failed";
    const cached = imageCache.get(`${src}__${crossOrigin || ""}`);
    return cached && cached.complete ? "loaded" : "loading";
  });

  useEffect(() => {
    let isCurrent = true;

    if (!src) {
      queueMicrotask(() => {
        if (!isCurrent) return;
        setImage(undefined);
        setStatus("failed");
      });
      return () => {
        isCurrent = false;
      };
    }

    const cacheKey = `${src}__${crossOrigin || ""}`;
    const cached = imageCache.get(cacheKey);
    if (cached && cached.complete) {
      // الحالة الأولية أصيبت تزامنياً من lazy initializer — هذا المسار يخدم
      // فقط تغييرات src اللاحقة على مثيل مركّب. microtask يبقي التحديث خارج
      // جسم الـ effect المتزامن (react-hooks/set-state-in-effect) مع بقاء
      // تحديث واحد لا أكثر (functional updates لا تعيد رندر عند تطابق القيمة)
      queueMicrotask(() => {
        if (!isCurrent) return;
        setImage((prev) => (prev === cached ? prev : cached));
        setStatus((prev) => (prev === "loaded" ? prev : "loaded"));
      });
      return () => {
        isCurrent = false;
      };
    }

    queueMicrotask(() => {
      if (isCurrent) setStatus("loading");
    });

    const pending = pendingLoads.get(cacheKey);
    if (pending) {
      pending
        .then((loadedImg) => {
          if (!isCurrent) return;
          setImage(loadedImg);
          setStatus("loaded");
        })
        .catch(() => {
          if (!isCurrent) return;
          setImage(undefined);
          setStatus("failed");
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
          // Implement LRU-like limit to prevent unbounded memory growth
          if (imageCache.size >= 200) {
            const firstKey = imageCache.keys().next().value;
            if (firstKey) imageCache.delete(firstKey);
          }
          
          imageCache.set(cacheKey, img);
          pendingLoads.delete(cacheKey);
          if (isCurrent) {
            setImage(img);
            setStatus("loaded");
          }
          resolve(img);
        };

        if (typeof img.decode === "function") {
          img.decode().then(finish).catch(finish);
        } else {
          finish();
        }
      };

      img.onerror = () => {
        pendingLoads.delete(cacheKey);
        if (isCurrent) {
          console.error("[useAsyncImage] Failed to load image:", src);
          setImage(undefined);
          setStatus("failed");
        }
        reject(new Error(`Failed to load image: ${src}`));
      };
    });

    pendingLoads.set(cacheKey, loadPromise);
    img.src = src;

    return () => {
      isCurrent = false;
    };
  }, [src, crossOrigin]);

  return [image, status] as const;
}
