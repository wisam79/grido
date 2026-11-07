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

  it.each([45, -45])('flattens line breaks only for a nonzero curve (%s)', (curve) => {
    const text = 'grido\r\nstudio\n\n2026\rnext\u2028line\u2029end';
    const source = { text, curve, textTransform: 'uppercase' as const };
    expect(resolveTextRenderState(source).text).toBe('GRIDO STUDIO  2026 NEXT LINE END');
    expect(source.text).toBe(text);
    expect(resolveTextRenderState({ ...source, curve: 0 }).text).toBe(text.toUpperCase());
  });

  it('treats curved newlines exactly like word spaces before Arabic spacing and numerals', () => {
    const source = { text: 'بِـسم\nGrido 2026', curve: 50, letterSpacing: 7, arabicNumerals: true };
    const state = resolveTextRenderState(source);
    expect(state).toEqual(resolveTextRenderState({ ...source, text: 'بِـسم Grido 2026' }));
    expect(state.text).toBe('بِـسم  Grido  ٢٠٢٦');
    expect(state.direction).toBe('rtl');
    expect(state.letterSpacing).toBe(0);
    expect(source.text).toBe('بِـسم\nGrido 2026');
  });

  it('keeps raw line breaks for straight text with positive or negative Arabic spacing', () => {
    for (const letterSpacing of [-4, 7]) {
      const state = resolveTextRenderState({ text: 'مرحبا\nبكم\n', letterSpacing });
      expect(state.text).toBe('مرحبا\nبكم\n');
      expect(state.letterSpacing).toBe(0);
    }
  });

  it('resolves the available font face without rewriting a legacy stored weight', () => {
    const source = { text: 'بسم', fontFamily: 'Cairo, sans-serif', fontWeight: 800 };
    expect(resolveTextRenderState(source).fontWeight).toBe(700);
    expect(source.fontWeight).toBe(800);
    expect(resolveTextRenderState({ ...source, fontFamily: 'Lalezar' }).fontWeight).toBe(400);
    expect(resolveTextRenderState({ ...source, fontFamily: 'Arial' }).fontWeight).toBe(800);
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
