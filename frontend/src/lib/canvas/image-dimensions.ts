import { createLogger } from '@/lib/logger';

import { GetImageDimensions, GetBatchImageDimensions } from '../../../wailsjs/go/main/App';
import { getExifOrientation } from '../io/exif-utils';

const logger = createLogger('image-dimensions');

// كاش في الذاكرة للنسب الباعية لتفادي أي استدعاءات مكررة للصورة نفسها
const aspectRatioCache = new Map<string, number>();
// كاش الأبعاد الكاملة بعد EXIF — يُستخدم في فحص الدقة قبل التصدير/الطباعة
const dimensionsCache = new Map<string, { width: number; height: number }>();

function rememberDimensions(src: string, width: number, height: number, isRotated?: boolean): void {
  if (!src || !(width > 0) || !(height > 0)) return;
  const dims = isRotated ? { width: height, height: width } : { width, height };
  dimensionsCache.set(src, dims);
  setCachedImageAspectRatio(src, dims.width / dims.height);
}

/**
 * أبعاد المصدر بعد تدوير EXIF — من الكاش المحلي فقط (بلا I/O).
 * غياب النتيجة يعني «لم تُقس بعد» وليس صورة غير صالحة.
 */
export function getCachedImageDimensions(
  src: string,
): { width: number; height: number } | undefined {
  return src ? dimensionsCache.get(src) : undefined;
}

/**
 * استرجاع النسبة الباعية المخزنة في الكاش إن وجدت
 */
export function getCachedImageAspectRatio(src: string): number | undefined {
  if (!src) return undefined;
  return aspectRatioCache.get(src);
}

/**
 * تخزين النسبة الباعية في الكاش يدوياً
 */
export function setCachedImageAspectRatio(src: string, aspectRatio: number): void {
  if (src && Number.isFinite(aspectRatio) && aspectRatio > 0) {
    aspectRatioCache.set(src, aspectRatio);
  }
}

/**
 * تفريغ كاش النسب الباعية (مفيد في الاختبارات)
 */
export function clearImageAspectRatioCache(): void {
  aspectRatioCache.clear();
}

/**
 * دالة موحدة فائقة الدقة والسرعة لحساب النسبة الباعية الحقيقية (Native Aspect Ratio = Width / Height) لأي صورة
 * مع مراعاة وسم تدوير الكاميرات (EXIF Orientation 1..8)
 *
 * 1. تفحص كاش الذاكرة أولاً O(1).
 * 2. تفحص Go Backend عبر `GetImageDimensions` للصور المحلية (/local-image/) لقراءة أبعاد الملف الأصلية
 *    مع تصحيح التدوير إذا كانت الصورة ملتقطة رأسياً بكاميرا/هاتف.
 * 3. تستخدم `createImageBitmap` مع `imageOrientation: 'from-image'` لفك الأبعاد مع التدوير التلقائي.
 * 4. تضمن عدم إجبار أي صورة على نسبة افتراضية غير دقيقة 1:1 إطلاقاً
 */
export async function resolveImageAspectRatio(src: string): Promise<number> {
  if (!src) return 1;

  const cached = aspectRatioCache.get(src);
  if (cached !== undefined) return cached;

  // 1. استخدام Go Backend السريع للصور المحلية (/local-image/) مع قراءة EXIF في Go مباشرة
  if (typeof GetImageDimensions === 'function' && src.startsWith('/local-image/')) {
    try {
      const dims = await GetImageDimensions(src);
      if (dims && dims.width > 0 && dims.height > 0) {
        rememberDimensions(src, dims.width, dims.height, dims.isRotated);
        const aspect = dims.isRotated ? dims.height / dims.width : dims.width / dims.height;
        setCachedImageAspectRatio(src, aspect);
        return aspect;
      }
    } catch (e) {
      logger.warn(
        '[resolveImageAspectRatio] Go backend GetImageDimensions failed, falling back to browser decoder:',
        e,
      );
    }
  }

  // 2. محاولة فك الأبعاد السريعة عبر createImageBitmap (الأداء الأقصى في المتصفح مع مراعاة EXIF)
  // فقط للمصادر الموجودة في الذاكرة/المشتقة من blob: أي مصدر شبكي أو ملفي كامل
  // كان يُنزَّل بالكامل ويُنسخ في الذاكرة لمجرد قراءة الأبعاد (ذروة لا مبرر لها).
  const isInMemorySource = src.startsWith('data:') || src.startsWith('blob:');
  if (isInMemorySource) {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      try {
        if (bitmap && bitmap.width > 0 && bitmap.height > 0) {
          rememberDimensions(src, bitmap.width, bitmap.height);
          const aspect = bitmap.width / bitmap.height;
          setCachedImageAspectRatio(src, aspect);
          return aspect;
        }
      } finally {
        // إغلاق دائماً (بما فيه مسار القياس الصفري) — كان يتسرب قبل السقوط
        bitmap?.close?.();
      }
    } catch {
      // Continue to standard Image fallback
    }
  }

  // 3. المسار القياسي الاحتياطي عبر HTMLImageElement مع EXIF check
  return new Promise<number>((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      img.onload = null;
      img.onerror = null;
      img.src = '';
      if (w > 0 && h > 0) {
        const exif = await getExifOrientation(src);
        rememberDimensions(src, w, h, exif.isQuarterRotated);
        const aspect = exif.isQuarterRotated ? h / w : w / h;
        setCachedImageAspectRatio(src, aspect);
        resolve(aspect);
      } else {
        resolve(1);
      }
    };
    img.onerror = () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
      resolve(1);
    };
    img.src = src;
  });
}

/**
 * قياس أبعاد مجموعة صور دفعة واحدة وبسرعة قصوى:
 * يستفيد من كاش الذاكرة أولاً، ثم يستدعي GetBatchImageDimensions في Go دفعة واحدة
 * لجميع الصور المحلية عبر طلب IPC واحد بالتوازي على كل أنوية المعالج.
 */
export async function resolveBatchImageAspectRatios(srcs: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!srcs || srcs.length === 0) return result;

  const uncached: string[] = [];
  for (const src of srcs) {
    if (!src) continue;
    const cached = aspectRatioCache.get(src);
    if (cached !== undefined) {
      result.set(src, cached);
    } else {
      uncached.push(src);
    }
  }

  if (uncached.length === 0) {
    return result;
  }

  // فرز المسارات المحلية لاستدعائها دفعة واحدة عبر Go GetBatchImageDimensions
  const localSrcs = uncached.filter((s) => s.startsWith('/local-image/'));

  if (localSrcs.length > 0 && typeof GetBatchImageDimensions === 'function') {
    try {
      const batchDims = await GetBatchImageDimensions(localSrcs);
      if (batchDims && typeof batchDims === 'object') {
        for (const src of localSrcs) {
          const dims = (
            batchDims as Record<string, { width: number; height: number; isRotated?: boolean }>
          )[src];
          if (dims && dims.width > 0 && dims.height > 0) {
            rememberDimensions(src, dims.width, dims.height, dims.isRotated);
            const aspect = dims.isRotated ? dims.height / dims.width : dims.width / dims.height;
            setCachedImageAspectRatio(src, aspect);
            result.set(src, aspect);
          }
        }
      }
    } catch (e) {
      logger.warn('[resolveBatchImageAspectRatios] Go batch call failed, will fallback:', e);
    }
  }

  // معالجة أي مسار لم يتم حله بعد (غير محلي أو فشل في Go) بالتوازي
  const stillUnresolved = uncached.filter((s) => !result.has(s));
  if (stillUnresolved.length > 0) {
    await Promise.all(
      stillUnresolved.map(async (src) => {
        try {
          const aspect = await resolveImageAspectRatio(src);
          result.set(src, aspect);
        } catch {
          result.set(src, 1);
        }
      }),
    );
  }

  return result;
}
