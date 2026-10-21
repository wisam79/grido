import { describe, expect, it } from 'vitest';

import { resolveTextRenderState } from '../src/lib/canvas/text-helpers';

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
