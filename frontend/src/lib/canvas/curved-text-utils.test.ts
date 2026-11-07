import { describe, expect, it } from 'vitest';

import { shapeArabicGraphemes } from './curved-text-utils';

// #14 — اختبارات انحدار التشكيل العربي في النص المنحني:
// الحرف المتاخم لحركة يجب أن يأخذ الشكل المتصل (ابتدائي/وسطي/نهائي) كما لو
// كانت الحركة غائبة، مع بقاء الحركات نفسها محفوظة في المخرجات.
// الأشكال: [معزول, ابتدائي, وسطي, نهائي] وفق ARABIC_FORMS_MAP أعلاه.
describe('shapeArabicGraphemes — #14 التشكيل لا يقطع الاتصال', () => {
  it('«مُحَمَّد»: كل الحروف تأخذ أشكالها المتصلة رغم الحركات بينها', () => {
    const glyphs = shapeArabicGraphemes('مُحَمَّد');
    // ميم ابتدائية، حاء وسطية، ميم وسطية، دال نهائية
    expect(glyphs).toContain('\uFEE3');
    expect(glyphs).toContain('\uFEA4');
    expect(glyphs).toContain('\uFEE4');
    expect(glyphs).toContain('\uFEAA');
    // لا شكل معزول يتسلل (توقيع الخلل قبل الإصلاح)
    expect(glyphs).not.toContain('\uFEE1');
    expect(glyphs).not.toContain('\uFEA1');
    expect(glyphs).not.toContain('\uFEA9');
    // الحركات محفوظة: ضمة، فتحة، شدة
    const joined = glyphs.join('');
    expect(joined).toContain('\u064F');
    expect(joined).toContain('\u064E');
    expect(joined).toContain('\u0651');
  });

  it('«بَا»: الباء ابتدائية والألف نهائية رغم الفتحة بينهما', () => {
    expect(shapeArabicGraphemes('بَا')).toEqual(['\uFE91', '\u064E', '\uFE8E']);
  });

  it('«با» بلا تشكيل: نفس الأشكال المتصلة (ضابط عدم تغيير السلوك)', () => {
    expect(shapeArabicGraphemes('با')).toEqual(['\uFE91', '\uFE8E']);
  });

  it('المسافة تقطع الاتصال كما كان: «ب ا» تبقى معزولة', () => {
    expect(shapeArabicGraphemes('ب ا')).toEqual(['\uFE8F', ' ', '\uFE8D']);
  });

  it('«لَا»: رابطة اللام-ألف تلتقط الألف بعد الحركة دون إسقاطها أو تكرار الألف', () => {
    expect(shapeArabicGraphemes('لَا')).toEqual(['\uFEFB\u064E']);
  });

  it('«لا» بلا تشكيل: الرابطة كما كانت', () => {
    expect(shapeArabicGraphemes('لا')).toEqual(['\uFEFB']);
  });
});

describe('shapeArabicGraphemes — tatweel, wasla and Persian forms', () => {
  it.each([
    ['بـسم', '\uFE91\u0640\uFEB4\uFEE2'],
    ['بــب', '\uFE91\u0640\u0640\uFE90'],
    ['بَـِب', '\uFE91\u064E\u0640\u0650\uFE90'],
    ['بـ ب', '\uFE91\u0640 \uFE8F'],
  ])('keeps tatweel connected without dropping marks in %s', (text, expected) => {
    expect(shapeArabicGraphemes(text).join('')).toBe(expected);
  });

  it.each([
    ['ٱ', '\uFB50'],
    ['بٱب', '\uFE91\uFB51\uFE8F'],
    ['لٱ', '\uFEDF\uFB51'],
    ['لَٱِ', '\uFEDF\u064E\uFB51\u0650'],
  ])('uses only real wasla forms, not a fabricated lam-wasla ligature: %s', (text, expected) => {
    const shaped = shapeArabicGraphemes(text).join('');
    expect(shaped).toBe(expected);
    expect(shaped.normalize('NFKC')).toBe(text);
  });

  it.each([
    ['ک', ['\uFB8E', '\uFB90', '\uFB91', '\uFB8F']],
    ['ی', ['\uFBFC', '\uFBFE', '\uFBFF', '\uFBFD']],
  ])(
    'maps isolated/initial/medial/final forms of %s to the correct Unicode letter',
    (letter, forms) => {
      const cases = [
        [letter, forms[0]],
        [`${letter}ب`, `${forms[1]}\uFE90`],
        [`ب${letter}ب`, `\uFE91${forms[2]}\uFE90`],
        [`ب${letter}`, `\uFE91${forms[3]}`],
      ];
      for (const [text, expected] of cases) {
        const shaped = shapeArabicGraphemes(text).join('');
        expect(shaped).toBe(expected);
        expect(shaped.normalize('NFKC')).toBe(text);
      }
    },
  );

  it.each([' ', '\u200C', 'ء'])(
    'does not join across the non-joining character %s',
    (separator) => {
      expect(shapeArabicGraphemes(`ب${separator}ب`)).toEqual([
        '\uFE8F',
        separator === 'ء' ? '\uFE80' : separator,
        '\uFE8F',
      ]);
    },
  );

  it.each([
    ['لَا', '\uFEFB\u064E'],
    ['بِلَأُ', '\uFE91\u0650\uFEF8\u064E\u064F'],
    ['لآ', '\uFEF5'],
    ['لإ', '\uFEF9'],
  ])('preserves the existing lam-alef ligatures and diacritics: %s', (text, expected) => {
    expect(shapeArabicGraphemes(text).join('')).toBe(expected);
  });
});
