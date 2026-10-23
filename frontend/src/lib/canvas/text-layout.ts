/**
 * text-layout.ts — تقسيم أسطر النص على Canvas 2D.
 *
 * Konva يتكفل بالالتفاف في المعاينة، أما التصدير اليدوي فيحتاج نفس
 * أنماط wrap الثلاثة (word/char/none) بلا نسخة ثانية من الخوارزمية.
 */

export type TextWrapMode = 'word' | 'char' | 'none';

interface TextMeasurer {
  measureText(text: string): { width: number };
}

/** أطول بادئة تتسع للسطر — بحث ثنائي مطابق لمسار Konva بدل المسح التربيعي. */
function longestPrefixLength(ctx: TextMeasurer, chars: string[], width: number): number {
  let low = 0;
  let high = chars.length;
  let match = 0;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (ctx.measureText(chars.slice(0, mid + 1).join('')).width <= width) {
      low = mid + 1;
      match = mid + 1;
    } else {
      high = mid;
    }
  }
  return match;
}

/** سطر واحد بلا التفاف — يطابق تكرار Konva لأسطر \n الفارغة. */
function wrapParagraph(
  ctx: TextMeasurer,
  paragraph: string,
  width: number,
  wrapAtWord: boolean,
): string[] {
  const lines: string[] = [];
  let chars = Array.from(paragraph);

  while (chars.length > 0) {
    const whole = chars.join('');
    if (ctx.measureText(whole).width <= width) {
      lines.push(whole);
      break;
    }

    let fit = longestPrefixLength(ctx, chars, width);
    // حرف واحد أعرض من الصندوق: نضعه وحده بدل حلقة لا نهائية.
    if (fit === 0) fit = 1;

    if (wrapAtWord) {
      const nextChar = chars[fit];
      const nextIsSpaceOrDash = nextChar === ' ' || nextChar === '-';
      // الكلمات الطويلة جداً تُقطع بالمحارف كما يفعل Konva في وضع word.
      if (!nextIsSpaceOrDash) {
        let wrapAt = 0;
        for (let i = fit; i > 0; i--) {
          if (chars[i - 1] === ' ' || chars[i - 1] === '-') {
            wrapAt = i;
            break;
          }
        }
        if (wrapAt > 0) fit = wrapAt;
      }
    }

    lines.push(chars.slice(0, fit).join('').trimEnd());
    chars = Array.from(chars.slice(fit).join('').trimStart());
  }

  if (lines.length === 0) lines.push('');
  return lines;
}

/**
 * يعيد أسطر النص بعد الالتفاف وفق النمط المطلوب.
 * - word: يلتف عند حدود الكلمات ويقطع الكلمة الأعرض من السطر (سلوك Konva).
 * - char: يلتف عند أي محرف (للروابط والنصوص بلا مسافات).
 * - none: يحترم أسطر \n فقط ويترك الفائض يتجاوز الصندوق كما في Konva.
 */
export function wrapTextLines(
  ctx: TextMeasurer,
  text: string,
  maxWidth: number,
  wrap: TextWrapMode = 'word',
): string[] {
  const paragraphs = (text || '').split('\n');
  if (wrap === 'none') return paragraphs;

  const width = Math.max(1, maxWidth);
  return paragraphs.flatMap((paragraph) => wrapParagraph(ctx, paragraph, width, wrap === 'word'));
}
