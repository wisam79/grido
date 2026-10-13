/**
 * print-transport.ts — إدارة النقل الشبكي ومهلات طباعة الورقة
 *
 * مسؤولية أحادية: رفع صور الطباعة كتيار ثنائي ولف وعود الـ IPC بمهلات آمنة ووصف الأخطاء.
 * مستخرج من use-print-export.ts ضمن خطة الإصلاح المعماري.
 */

import { fetchLocalApi } from '@/lib/local-api';

/** مهلة رفع صورة الطباعة — بلا AbortController سابقاً كان التعليق أبدياً. */
export const UPLOAD_TIMEOUT_MS = 120_000;

/** مهلة توليد الورقة عبر Go — ورقة 50MP TIFF قد تستغرق دقائق؛ فوقها فشل صريح. */
export const EXPORT_TIMEOUT_MS = 10 * 60_000;

/**
 * وصف خطأ آمن للعرض: أخطاء Go/Wails كائنات تُنتج "[object Object]" بـ String().
 * يحوّل رسائل السقوف التقنية (MP/Copies/DPI) لعربية واضحة مع اقتراح حل.
 */
export function describeError(err: unknown): string {
  const raw = (() => {
    if (err instanceof Error) return err.message || 'خطأ غير معروف';
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object') {
      const rec = err as Record<string, unknown>;
      if (typeof rec.message === 'string' && rec.message) return rec.message;
      if (typeof rec.error === 'string' && rec.error) return rec.error;
      try {
        const s = JSON.stringify(rec);
        if (s && s !== '{}') return s;
      } catch {
        /* ignore */
      }
    }
    return 'خطأ غير معروف';
  })();
  return humanizePrintError(raw);
}

function humanizePrintError(msg: string): string {
  // السقوف والأخطاء القابلة للترجمة — نكشفها بالنص الإنجليزي الخام
  if (/total pixels exceed 144 megapixels/i.test(msg))
    return 'الورقة كبيرة جداً (أكثر من 144 ميجابكسل). قلّل الـ DPI أو اختر مقاساً أصغر.';
  if (/image dimensions too large/i.test(msg) && /MP > \d+ MP max/i.test(msg))
    return 'صورة كبيرة جداً للطباعة. قلّل الـ DPI أو استخدم صورة أصغر.';
  if (/cmyk tiff too large/i.test(msg))
    return 'ورقة CMYK TIFF كبيرة جداً. اختر sRGB أو قلّل الـ DPI.';
  if (/cmyk jpeg too large/i.test(msg))
    return 'ورقة CMYK كبيرة جداً. قلّل الـ DPI.';
  if (/too many expanded print cells/i.test(msg))
    return 'عدد النسخ كبير جداً. قلّل عدد النسخ في الورقة.';
  if (/too many copies for one item/i.test(msg))
    return 'عدد النسخ للعنصر كبير جداً. قلّل عدد النسخ.';
  if (/too many items.*1000/i.test(msg))
    return 'عدد العناصر كبير جداً (الحد 1000). قلّل عدد الصور.';
  if (/invalid DPI/i.test(msg))
    return 'قيمة DPI غير صالحة. اختر قيمة بين 50 و 600.';
  if (/upload failed/i.test(msg) || /upload timed out/i.test(msg))
    return 'فشل رفع صورة الطباعة. تحقّق من الاتصال وحاول مجدداً.';
  if (/انتهت المهلة/i.test(msg)) return msg; // مهلة withTimeout عربية أصلاً
  if (/invalid image dimensions/i.test(msg)) return 'أبعاد صورة غير صالحة.';
  if (/decode.*image/i.test(msg)) return 'تعذّر قراءة إحدى الصور. تأكد من سلامة الملف.';
  return msg;
}

/** يلف وعداً بمهلة — Wails IPC لا يدعم الإلغاء، فالنتيجة المتأخرة تُتجاهل بالرمز. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label}: انتهت المهلة (${Math.round(ms / 1000)} ث)`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * رفع صورة الطباعة كتيار ثنائي إلى /api/upload-print-image وإرجاع
 * مسار /local-image/ — يقطع مرور DataURL عملاقة (25-60MB نص) عبر جسر
 * Wails IPC. الفشل يرمي ليقع التعامل معه في المستدعي.
 */
export async function uploadPrintImage(blob: Blob): Promise<string> {
  if (typeof window === 'undefined' || !window.location?.origin) {
    throw new Error('upload unavailable: no window origin');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS);
  try {
    // 🔑 fetchLocalApi يضيف ترويسة توكن الجلسة المفروضة على مسارات /api
    const resp = await fetchLocalApi(`${window.location.origin}/api/upload-print-image`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'image/png' },
      body: blob,
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      throw new Error(`upload failed: HTTP ${resp.status}`);
    }
    const resJson = (await resp.json().catch(() => null)) as {
      status?: string;
      imageSrc?: string;
    } | null;
    if (resJson?.status !== 'success' || !resJson.imageSrc) {
      throw new Error('upload failed: invalid server response');
    }
    return resJson.imageSrc;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
