/**
 * sticker-a11y.ts — فحص تباين ألوان الملصقات (WCAG 2.1) بحساب نقي بلا مكتبات.
 *
 * الهدف مطبعي/قرائي: نص بتباين منخفض يُطبع باهتاً أو يضيع على الخلفية.
 * عتبة 3.0 للنصوص الكبيرة/الزخرفية، و4.5 للنصوص الصغيرة المقروءة.
 */

function parseChannel(hex: string): [number, number, number] | null {
  let h = hex.trim().toLowerCase();
  if (!h.startsWith('#')) return null;
  h = h.slice(1);
  if (h.length === 3 || h.length === 4) {
    h = h
      .slice(0, 3)
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (h.length === 8) {
    h = h.slice(0, 6);
  }
  if (h.length !== 6 || /[^0-9a-f]/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const lin = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** نسبة تباين WCAG بين لونين سداسيين (1–21)، أو null عند لون غير صالح. */
export function contrastRatio(fg: string, bg: string): number | null {
  const f = parseChannel(fg);
  const b = parseChannel(bg);
  if (!f || !b) return null;
  const l1 = relativeLuminance(f);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** هل الثنائي منخفض التباين عن العتبة (يُتجاهل عند الألوان غير الصالحة)؟ */
export function isLowContrastPair(fg: string, bg: string, threshold = 3.0): boolean {
  const r = contrastRatio(fg, bg);
  return r !== null && r < threshold;
}
