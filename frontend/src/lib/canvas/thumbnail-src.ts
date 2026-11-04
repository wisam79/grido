/**
 * مساعد اشتقاق مسار مصغرة محلية من مسار الصورة الأصلي.
 *
 * المصغرات ملفات مشتقة تُولَّد في Go عند الطلب؛ لا نضيف حقلاً جديداً إلى
 * مخطط المشروع ولا نغيّر imageSrc المستخدم في Konva/الطباعة. إذا كان المصدر
 * غير محلي (Data URL/Blob/HTTP) أو كان معاينة طباعة، نُعيد المصدر كما هو.
 */

const LOCAL_PREFIX = '/local-image/';
const THUMB_PREFIX = '/local-image/thumb/';

export type ThumbnailWidth = 128 | 256 | 512;

/**
 * عرض مشتق العرض الرسمي للكانفس (2048px) — مولَّد في Go عبر نفس مسار
 * المصغرات (`EnsureThumbnail`) بنفس الحواجز (فحص ترويسة، سقف 120MP،
 * singleflight، سيمفور بسعة 2، كتابة ذرية، تصحيح EXIF). القرار المحمي
 * (الجلسات 1.15/1.66/1.80): المشتق للعرض فقط — القص والتصدير والطباعة
 * والذكاء الاصطناعي تبقى على الأصل الكامل الموجّه بـEXIF.
 */
export type DisplayWidth = 2048;
export const DISPLAY_DERIVATIVE_WIDTH: DisplayWidth = 2048;

const THUMBNAIL_WIDTHS: readonly ThumbnailWidth[] = [128, 256, 512];

function normalizeWidth(width: number): ThumbnailWidth {
  return (THUMBNAIL_WIDTHS as readonly number[]).includes(width) ? (width as ThumbnailWidth) : 256;
}

function extractLocalFilename(src: string): string | null {
  if (!src.startsWith(LOCAL_PREFIX) || src.startsWith(THUMB_PREFIX)) return null;

  const withoutQuery = src.slice(LOCAL_PREFIX.length).split(/[?#]/, 1)[0];
  if (!withoutQuery || withoutQuery.includes('/') || withoutQuery.includes('\\')) return null;

  // معاينات الطباعة تُخدَم من Exports وليست ضمن Media/.thumbs.
  if (withoutQuery.toLowerCase().startsWith('print_')) return null;

  // نطلب المصغرات للصيغ التي يستطيع Go فك ترميزها فقط.
  if (!/\.(?:jpe?g|png|gif|webp|bmp)$/i.test(withoutQuery)) return null;

  return withoutQuery;
}

export function isLocalThumbnailable(src: string): boolean {
  return extractLocalFilename(src) !== null;
}

export function getThumbnailSrc(src: string, width: number = 256): string {
  const filename = extractLocalFilename(src);
  if (!filename) return src;
  return `${THUMB_PREFIX}${encodeURIComponent(filename)}?w=${normalizeWidth(width)}`;
}

/**
 * يبني رابط مشتق العرض 2048px من رابط صورة محلي — مدخل فك ترميز الواجهة
 * بدل الأصل كامل الدقة (ملكية الصور: الواجهة لا تفك الأصل للعرض إطلاقاً).
 *
 * يتعامل مع روابط /local-image/ فقط: المصادر غير المحلية (data:/blob:/http)
 * أو معاينات الطباعة (print_) أو الامتدادات غير المدعومة تُعاد كما هي،
 * وروابط المشتقات القائمة تمر سليمة (idempotent عبر extractLocalFilename).
 * Fallback الأصل عند فشل تحميل المشتق تديره طبقة التحميل (use-async-image).
 */
export function buildDisplaySrcFor(
  src: string,
  width: DisplayWidth = DISPLAY_DERIVATIVE_WIDTH,
): string {
  const filename = extractLocalFilename(src);
  if (!filename) return src;
  // قيمة مشتق العرض وحيدة 2048 — أي مدخل آخر يعود إليها دفاعياً.
  const w = width === DISPLAY_DERIVATIVE_WIDTH ? width : DISPLAY_DERIVATIVE_WIDTH;
  return `${THUMB_PREFIX}${encodeURIComponent(filename)}?w=${w}`;
}
