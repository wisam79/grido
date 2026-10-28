/* ═══════════════════════════════════════════════════════════════
   قراءة وكتابة قوائم التفضيلات المحلية (مفضلة/آخر استخدام) بأمان.
   ═══════════════════════════════════════════════════════════════ */

/** قراءة قائمة نصوص من localStorage بأمان (بيئة الاختبار/المتصفح قد تمنع الوصول) */
export function readStoredList(key: string, fallback: string[] = []): string[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : fallback;
  } catch {
    return fallback;
  }
}

/** كتابة قائمة نصوص — الفشل صامت لأن التفضيل ليس جزءاً من التصميم المحفوظ */
export function writeStoredList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* تجاهل أخطاء التخزين */
  }
}

const AUTO_FILL_GRID_KEY = 'grido_auto_fill_grid';

/** تعبئة خلايا الشبكة تلقائياً بعد اختيار صورة — مفعّلة افتراضياً. */
export function isAutoFillGridEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_FILL_GRID_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setAutoFillGridEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_FILL_GRID_KEY, String(enabled));
  } catch {
    /* تجاهل أخطاء التخزين */
  }
}
