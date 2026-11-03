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
