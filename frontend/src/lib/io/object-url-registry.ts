/**
 * object-url-registry.ts — دورة حياة صريحة لروابط Blob المؤقتة.
 *
 * السبب: تنزيل ملف عبر `URL.createObjectURL` يحتاج تأجيل الإلغاء حتى يبدأ
 * المتصفح قراءة البيانات فعلياً، لكن مؤقتاً عالمياً واحداً كان يُلغي مؤقت
 * الرابط السابق ويتركه بلا إلغاء (تسرّب ذاكرة). هذا السجل يحتفظ بمؤقت مستقل
 * لكل رابط، ويوفّر إلغاءً فورياً عند الحاجة.
 */

/** نافذة الأمان الافتراضية قبل إلغاء رابط التنزيل (60 ثانية). */
export const DEFAULT_OBJECT_URL_REVOKE_DELAY_MS = 60_000;

type RevokeTimer = ReturnType<typeof setTimeout>;

const pending = new Map<string, RevokeTimer>();

function canRevoke(): boolean {
  return typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function';
}

function revoke(url: string): void {
  if (canRevoke()) {
    URL.revokeObjectURL(url);
  }
}

/**
 * يسجّل رابط Blob ويؤجّل إلغاءه. إعادة تسجيل الرابط نفسه تُعيد ضبط المؤقت
 * بدل إنشاء مؤقت ثانٍ، فلا يتضاعف الإلغاء ولا يبقى الرابط حياً بلا نهاية.
 */
export function registerObjectUrl(
  url: string,
  delayMs: number = DEFAULT_OBJECT_URL_REVOKE_DELAY_MS,
): void {
  if (!url) return;
  const existing = pending.get(url);
  if (existing !== undefined) {
    clearTimeout(existing);
  }
  const timer = setTimeout(
    () => {
      pending.delete(url);
      revoke(url);
    },
    Math.max(0, delayMs),
  );
  pending.set(url, timer);
}

/** إلغاء فوري ومتكرر بأمان (مثلاً عند إغلاق حوار أو فشل تنزيل). */
export function revokeObjectUrlNow(url: string): void {
  if (!url) return;
  const timer = pending.get(url);
  if (timer !== undefined) {
    clearTimeout(timer);
    pending.delete(url);
    revoke(url);
  }
}

/** إلغاء كل الروابط المعلّقة — يُستخدم في التنظيف الجماعي والاختبارات. */
export function revokeAllObjectUrls(): void {
  for (const [url, timer] of pending) {
    clearTimeout(timer);
    revoke(url);
  }
  pending.clear();
}

/** عدد الروابط التي ما زالت بانتظار الإلغاء (مراقبة/اختبار). */
export function pendingObjectUrlCount(): number {
  return pending.size;
}
