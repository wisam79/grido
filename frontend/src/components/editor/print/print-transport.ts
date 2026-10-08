/**
 * print-transport.ts — إدارة النقل الشبكي ومهلات طباعة الورقة
 *
 * مسؤولية أحادية: رفع صور الطباعة كتيار ثنائي ولف وعود الـ IPC بمهلات آمنة ووصف الأخطاء.
 * مستخرج من use-print-export.ts ضمن خطة الإصلاح المعماري.
 */

/** مهلة رفع صورة الطباعة — بلا AbortController سابقاً كان التعليق أبدياً. */
export const UPLOAD_TIMEOUT_MS = 120_000;

/** مهلة توليد الورقة عبر Go — ورقة 50MP TIFF قد تستغرق دقائق؛ فوقها فشل صريح. */
export const EXPORT_TIMEOUT_MS = 10 * 60_000;

/** وصف خطأ آمن للعرض: أخطاء Go/Wails كائنات تُنتج "[object Object]" بـ String(). */
export function describeError(err: unknown): string {
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
    const resp = await fetch(`${window.location.origin}/api/upload-print-image`, {
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
