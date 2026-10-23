import { describe, expect, it } from 'vitest';

import { resolveTextDirection, resolveTextRenderState } from '../src/lib/canvas/text-helpers';

describe('resolveTextDirection (UAX #9 first strong)', () => {
  it.each([
    ['first strong letter is Arabic', 'تصميم 2026', 'rtl'],
    ['digits before a Latin word stay neutral', '٢٠٢٦ Grido', 'ltr'],
    ['Arabic comma before a Latin word stays neutral', '، Grido', 'ltr'],
    ['Arabic question mark before Arabic stays neutral', '؟ تصميم', 'rtl'],
    ['text of digits only falls back to ltr', '٢٠٢٦ 2026', 'ltr'],
    ['empty text falls back to ltr', '', 'ltr'],
  ])('%s', (_label, text, expected) => {
    expect(resolveTextDirection(text)).toBe(expected);
  });
});

describe('resolveTextRenderState', () => {
  it('converts Arabic-Indic numerals when enabled', () => {
    const state = resolveTextRenderState({
      text: 'طلب 2026',
      arabicNumerals: true,
    });
    expect(state.text).toBe('طلب ٢٠٢٦');
    expect(state.isArabic).toBe(true);
  });

  it('replaces Arabic letter spacing with extra word spaces', () => {
    const state = resolveTextRenderState({
      text: 'مرحبا بالعالم',
      letterSpacing: 7,
    });
    expect(state.letterSpacing).toBe(0);
    expect(state.text).toBe('مرحبا  بالعالم');
  });

  it('zeroes negative Arabic letter spacing instead of tightening ligatures', () => {
    const state = resolveTextRenderState({
      text: 'مرحبا',
      letterSpacing: -4,
    });
    expect(state.letterSpacing).toBe(0);
    expect(state.text).toBe('مرحبا');
  });

  it('keeps Latin letter spacing and applies case transforms', () => {
    const state = resolveTextRenderState({
      text: 'grido studio',
      letterSpacing: 3,
      textTransform: 'uppercase',
    });
    expect(state.text).toBe('GRIDO STUDIO');
    expect(state.letterSpacing).toBe(3);
    expect(state.isArabic).toBe(false);
  });

  it('capitalizes Latin words only and leaves Arabic text unchanged', () => {
    expect(resolveTextRenderState({ text: 'grido studio', textTransform: 'capitalize' }).text).toBe(
      'Grido Studio',
    );
    expect(resolveTextRenderState({ text: 'استوديو', textTransform: 'uppercase' }).text).toBe(
      'استوديو',
    );
  });
});
