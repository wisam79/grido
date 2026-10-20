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
