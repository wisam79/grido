import { useState, useEffect } from 'react';

import { ensureDisplayProxy, registerDisplayOwnership } from '@/lib/canvas/display-image';
import {
  touchCacheKey,
  setWithLRU,
  getCachedImage,
  invalidateImageCache,
  preloadImageIntoCache,
} from '@/lib/canvas/image-cache';
import { buildDisplaySrcFor } from '@/lib/canvas/thumbnail-src';
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

    // ⚡ ملكية الصور: التحميل يستهلك مشتق العرض 2048px من Go بدل تفكيك الأصل
    // كامل الدقة (القرار المحمي: المشتق للعرض فقط، وimageSrc في الستور يبقى
    // الأصل دون تقليص). المصادر غير المحلية (data:/blob:/http) تُحمَّل كما هي.
    // EXIF آمن هنا: مشتق Go موجّه أصلاً (AutoOrientation) بلا وسم اتجاه، فلا
    // تطبيق اتجاه يدوياً ولا ازدواج — انظر توثيق E1 في display-image.ts.
    const loadSrc = buildDisplaySrcFor(src);
    const isDisplayDerivative = loadSrc !== src;

    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }

    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const finish = (el: HTMLImageElement, derivative: boolean) => {
        setWithLRU(cacheKey, el);
        // 🚀 تسخين نسخة العرض المخفّضة خارج طور الرسم مباشرةً بعد فكّ الترميز:
        //تُبنى النسخة الكبيرة هنا بشكل غير متزامن (M16)، فيصبح أوّل وصول لاحق
        // لعقدة Konva إصابةً في الكاش بلا حجب ctx.drawImage أثناء الرسم.
        // (للمشتق ≤2048px هي لا-عمل: exceedsCap يرفضه، والسقوط للمسار القديم
        // عند fallback الأصل الكبير يبقى كما كان تماماً.)
        void ensureDisplayProxy(el);
        // 🖼️ ملكية العرض: المشتق يُسجَّل بمالكه الأصلي لترقيته وقت التصدير/الطباعة.
        if (derivative) registerDisplayOwnership(el, src);
        pendingLoads.delete(cacheKey);
        if (isCurrent) {
          setImage(el);
          setStatus('loaded');
        }
        resolve(el);
      };

      const startLoad = (el: HTMLImageElement, url: string, derivative: boolean) => {
        el.onload = () => {
          const wrapped = () => finish(el, derivative);
          if (typeof el.decode === 'function') {
            el.decode().then(wrapped).catch(wrapped);
          } else {
            wrapped();
          }
        };
        el.onerror = () => {
          if (derivative) {
            // 🛡️ fallback كامل: فشل تحميل المشتق (وضع تطوير بلا asset server،
            // أو ملف مفقود من .thumbs) يعيد مسار الأصل القديم كما هو — نفس
            // الوعد المعلق ونفس مفتاح الكاش، فلا يرى المستدعى أي اختلاف.
            const retry = new Image();
            if (crossOrigin) {
              retry.crossOrigin = crossOrigin;
            }
            startLoad(retry, src, false);
            return;
          }
          pendingLoads.delete(cacheKey);
          if (isCurrent) {
            logger.error('[useAsyncImage] Failed to load image:', src);
            setImage(undefined);
            setStatus('failed');
          }
          reject(new Error(`Failed to load image: ${src}`));
        };
        el.src = url;
      };

      startLoad(img, loadSrc, isDisplayDerivative);
    });

    pendingLoads.set(cacheKey, loadPromise);

    return () => {
      isCurrent = false;
      // 🛡️ لا نقوم بتصفير img.onload / img.onerror أو تفريغ img.src هنا،
      // لضمان اكتمال الوعد في pendingLoads وحفظ الصورة في الكاش العالمي (imageCache)
      // حتى عند إلغاء تركيب المكون (unmount)، مما يمنع تسريب وعود معلقة أو تجميد التحميل.
    };
  }, [src, crossOrigin]);

  return [image, status] as const;
}
