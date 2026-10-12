import { useState, useEffect } from 'react';
import {
  touchCacheKey,
  setWithLRU,
  getCachedImage,
  invalidateImageCache,
  preloadImageIntoCache,
} from '@/lib/canvas/image-cache';
import { ensureDisplayProxy } from '@/lib/canvas/display-image';
import { createLogger } from '@/lib/logger';

const logger = createLogger('async-image');

export { invalidateImageCache, preloadImageIntoCache };

const pendingLoads = new Map<string, Promise<HTMLImageElement>>();

export function useAsyncImage(src: string, crossOrigin?: string) {
  // ⚡ تهيئة كسولة تزامنية من الكاش — كانت الحالة الابتدائية undefined دائماً
  // فيطلق queueMicrotask + re-render إضافي حتى للصور المتواجدة مسبقاً في الكاش
  const [image, setImage] = useState<HTMLImageElement | undefined>(() => {
    if (!src) return undefined;
    const cacheKey = `${src}__${crossOrigin || ''}`;
    const cached = getCachedImage(cacheKey);
    // لمس LRU عند الإصابة من المهيئ الكسول — القراءة وحدها لا تحرّك ترتيب Map.
    if (cached) touchCacheKey(cacheKey);
    return cached && cached.complete ? cached : undefined;
  });
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(() => {
    if (!src) return 'failed';
    const cached = getCachedImage(`${src}__${crossOrigin || ''}`);
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
    const cached = getCachedImage(cacheKey);
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
          // 🚀 تسخين نسخة العرض المخفّضة خارج طور الرسم مباشرةً بعد فكّ الترميز:
          //تُبنى النسخة الكبيرة هنا بشكل غير متزامن (M16)، فيصبح أوّل وصول لاحق
          // لعقدة Konva إصابةً في الكاش بلا حجب ctx.drawImage أثناء الرسم.
          void ensureDisplayProxy(img);
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
          logger.error('[useAsyncImage] Failed to load image:', src);
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
