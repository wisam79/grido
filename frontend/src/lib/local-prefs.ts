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
