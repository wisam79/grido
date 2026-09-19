/* ═══════════════════════════════════════════════════════════════
   التفضيلات المحلية (مفضلة/آخر استخدام) — مصدر واحد للمفاتيح.
   كُتبت لتفادي تكرار أسماء مفاتيح localStorage في كل مكوّن يقرأها،
   وهو ما كان يُنتج مفاتيح متقاربة الاسم لا يشارك بعضها بعضاً.
   ═══════════════════════════════════════════════════════════════ */

export const PREF_KEYS = {
  favoriteFonts: "grido_favorite_fonts",
  recentFonts: "grido_recent_fonts",
  favoriteColors: "grido_favorite_colors",
  recentColors: "grido_recent_colors",
  favoriteShapes: "grido_favorite_shapes",
  favoriteTextPresets: "grido_favorite_text_presets",
  /** عناصر أُضيفت حديثاً بصيغة `shape:<id>` أو `text:<id>` */
  recentItems: "grido_recent_items",
} as const;

/** خطوط مفضّلة افتراضية عند أول تشغيل (خطوط عربية شائعة في الاستوديو) */
export const DEFAULT_FAVORITE_FONTS = ["cairo", "tajawal", "amiri"];

const MAX_FAVORITES = 60;
const MAX_RECENTS = 12;

/** قراءة قائمة نصوص من localStorage بأمان (بيئة الاختبار/المتصفح قد تمنع الوصول) */
export function readStoredList(key: string, fallback: string[] = []): string[] {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : fallback;
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

/** إضافة/إزالة عنصر من قائمة (مع سقف حجم) وإرجاع القائمة الجديدة */
export function toggleStoredValue(list: string[], value: string): string[] {
  const next = list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value].slice(-MAX_FAVORITES);
  return next;
}

/** دفع عنصر إلى مقدمة قائمة «آخر استخدام» بلا تكرار */
export function pushStoredRecent(list: string[], value: string): string[] {
  return [value, ...list.filter((item) => item !== value)].slice(0, MAX_RECENTS);
}

/** مفتاح عنصر في «آخر استخدام» — يوحّد صيغة `shape:<id>` / `text:<id>` في موضع واحد */
export function elementPrefKey(kind: "shape" | "text", id: string): string {
  return `${kind}:${id}`;
}

/** تحليل مفتاح عنصر إلى نوعه ومعرّفه (يرجع null لأي صيغة غير معروفة) */
export function parseElementPrefKey(
  key: string
): { kind: "shape" | "text"; id: string } | null {
  const separator = key.indexOf(":");
  if (separator < 1) return null;
  const kind = key.slice(0, separator);
  const id = key.slice(separator + 1);
  if ((kind !== "shape" && kind !== "text") || !id) return null;
  return { kind, id };
}
