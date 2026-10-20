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

/**
 * يعيد أسطر النص بعد الالتفاف وفق النمط المطلوب.
 * - word: يلتف عند حدود الكلمات (السلوك الافتراضي السابق).
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

  const lines: string[] = [];
  const width = Math.max(1, maxWidth);

  for (const paragraph of paragraphs) {
    if (wrap === 'char') {
      let current = '';
      for (const char of Array.from(paragraph)) {
        const test = current + char;
        if (current && ctx.measureText(test).width > width) {
          lines.push(current);
          current = char;
        } else {
          current = test;
        }
      }
      lines.push(current);
      continue;
    }

    const words = paragraph.split(' ');
    let current = '';
    for (let i = 0; i < words.length; i++) {
      const test = current ? `${current} ${words[i]}` : words[i];
      if (ctx.measureText(test).width > width && i > 0) {
        lines.push(current);
        current = words[i];
      } else {
        current = test;
      }
    }
    lines.push(current);
  }

  return lines;
}
