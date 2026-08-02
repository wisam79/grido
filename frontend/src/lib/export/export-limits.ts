// حارس حجم البكسل الموحّد لكل مسارات التصدير والطباعة.
//
// كان تجاوز 50MP يمر بصمت (console.warn فقط) فينتج عن التصدير رسالة فشل عامة
// غامضة، وعن الطباعة تعليقاً أو انهياراً للذاكرة. الآن يرمي خطأً مصنّفاً
// يعرضه كل متصل للمستخدم برسالة صريحة تذكر الأبعاد الفعلية.

export const MAX_EXPORT_PIXELS = 50_000_000;

export class CanvasTooLargeError extends Error {
  readonly width: number;
  readonly height: number;
  readonly pixelCount: number;

  constructor(width: number, height: number) {
    const pixelCount = width * height;
    super(
      `Canvas too large for export: ${width}×${height} = ${pixelCount}px exceeds ` +
        `the ${MAX_EXPORT_PIXELS}px limit (~${Math.round((pixelCount * 4) / 1024 / 1024)}MB buffer).`
    );
    this.name = "CanvasTooLargeError";
    this.width = width;
    this.height = height;
    this.pixelCount = pixelCount;
  }
}

export function assertExportablePixels(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  if (width * height > MAX_EXPORT_PIXELS) {
    throw new CanvasTooLargeError(width, height);
  }
}
