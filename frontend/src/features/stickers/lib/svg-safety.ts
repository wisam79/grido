/**
 * حماية قيم التصميم قبل حقنها في سلاسل SVG.
 *
 * قوالب الملصقات تُدرج الألوان وعائلة الخط مباشرة داخل سمات XML مثل
 * `fill="..."` و`stroke="..."` و`font-family="..."`، بخلاف حقول النص التي تمرّ
 * عبر `escapeXml`. أي قيمة غير موثوقة — يأتي مصدرها الآن من محرّر اللون الحر
 * (`<Input>` قابل للكتابة) أو من قالب محفوظ — قد تُنهي السمة وتُدخل سمات أو
 * عناصر جديدة، وتنعكس على ملف SVG المُصدَّر الذي يُفتح لاحقاً في المتصفح.
 *
 * لذلك تُمرَّر كل قيم التصميم عبر هذه الدوال في نقطة توليد واحدة
 * (`StickerStudioDialog`) لتغطية كل القوالب دون تكرار.
 */

/** #rgb · #rgba · #rrggbb · #rrggbbaa */
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** rgb()/rgba()/hsl()/hsla() بأرقام ونسب فقط — لا أقواس أو حروف إضافية */
const FUNCTIONAL_COLOR =
  /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9]+(?:\.[0-9]+)?%?\s*(?:[,/]\s*[0-9]+(?:\.[0-9]+)?%?\s*){2,3}\)$/i;

/** أسماء CSS القياسية (red، navy، transparent…) — حروف فقط، بلا رموز حقن */
const NAMED_COLOR = /^[a-z]{3,20}$/i;

/** عائلة الخط: حروف وأرقام وشرطة فقط — تُلغي علامات الاقتباس والفصل والأقواس */
const FONT_FAMILY_NAME = /^[\p{L}\p{N} _-]+$/u;

/** هل القيمة لون CSS آمن للحقن؟ (يستثني أي محرف يمكنه كسر السمة) */
export function isSafeCssColor(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return HEX_COLOR.test(v) || FUNCTIONAL_COLOR.test(v) || NAMED_COLOR.test(v);
}

/**
 * يعيد لوناً صالحاً للحقن في سمة SVG، أو القيمة الاحتياطية للقالب عند
 * أي قيمة غير صالحة (فارغة، أو تحمل علامات اقتباس/أقواس/نقاط فصل...).
 */
export function sanitizeStickerColor(value: string | undefined, fallback: string): string {
  if (typeof value === 'string') {
    const v = value.trim();
    if (isSafeCssColor(v)) return v;
  }
  return fallback;
}

/**
 * يعيد اسم عائلة خط نظيفاً (بلا قتباسات/فواصل/رمز حقن) أو الافتراضي.
 * الواجهة تُلحق `, sans-serif` لاحقاً، لذا تُعاد العائلة الواحدة فقط.
 */
export function sanitizeStickerFontFamily(value: string | undefined, fallback = 'Cairo'): string {
  const raw = (value ?? '').split(',')[0].replace(/['"]/g, '').trim();
  if (!raw || !FONT_FAMILY_NAME.test(raw)) return fallback;
  return raw;
}
