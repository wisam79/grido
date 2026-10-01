import { describe, it, expect } from 'vitest';
import {
  detectTextDirection,
  isArabicText,
  mmToPx,
  stickerRasterSize,
  postProcessStickerSvg,
} from '@/features/stickers/lib/sticker-text';
import { ALL_STICKER_TEMPLATES } from '@/features/stickers';

describe('sticker-text: direction + fit + DPI', () => {
  it('detects Arabic vs Latin by first strong char', () => {
    expect(detectTextDirection('مرحبا بالعالم')).toBe('rtl');
    expect(detectTextDirection('Hello World')).toBe('ltr');
    expect(detectTextDirection('زين كاش • Visa')).toBe('rtl');
    expect(detectTextDirection('Visa • FIB')).toBe('ltr');
    expect(detectTextDirection('+964 770 123 4567')).toBe('ltr');
    expect(isArabicText('خصم 50%')).toBe(true);
    expect(isArabicText('50% OFF')).toBe(false);
  });

  it('computes true 300DPI raster from mm (no fixed 1200)', () => {
    expect(mmToPx(50)).toBe(591); // 50*300/25.4 = 590.5 → 591
    expect(mmToPx(70)).toBe(827);
    const s = stickerRasterSize(1, { width: 50, height: 50 });
    expect(s.width).toBe(591);
    expect(s.height).toBe(591);
    const wide = stickerRasterSize(500 / 320, { width: 70, height: 45 });
    expect(wide.width).toBe(827);
    expect(wide.height).toBe(Math.round(827 / (500 / 320)));
  });

  it('injects missing direction on plain <text>', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><text data-field-id="t" x="250" y="250" font-size="30">مرحبا</text><text data-field-id="e" x="250" y="300" font-size="30">Hello</text></svg>`;
    const out = postProcessStickerSvg(svg);
    expect(out).toContain('direction="rtl"');
    expect(out).toContain('direction="ltr"');
    expect(out).toContain('unicode-bidi="embed"');
  });

  it('keeps explicit direction untouched', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><text data-field-id="h" x="230" y="288" font-size="28" direction="ltr" unicode-bidi="embed">handle</text></svg>`;
    const out = postProcessStickerSvg(svg);
    expect(out.match(/direction="ltr"/g)?.length).toBe(1);
  });

  it('shrinks overflowing long Arabic field', () => {
    const long = 'اسم متجر طويل جداً يحتاج تقليصاً تلقائياً حتى لا يفيض عن الإطار';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><text data-field-id="t" x="250" y="250" font-family="Cairo" font-size="70" font-weight="900" text-anchor="middle">${long}</text></svg>`;
    const out = postProcessStickerSvg(svg);
    const m = out.match(/font-size="(\d+)"/);
    expect(m).toBeTruthy();
    expect(parseInt(m![1], 10)).toBeLessThan(70);
    expect(parseInt(m![1], 10)).toBeGreaterThanOrEqual(Math.floor(70 * 0.55));
  });

  it('skips fitting for curved textPath', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><text data-field-id="t" font-size="20"><textPath href="#c">نص منحني طويل جداً جداً جداً</textPath></text></svg>`;
    const out = postProcessStickerSvg(svg);
    expect(out).toContain('font-size="20"');
  });

  it('post-process keeps every template valid XML', () => {
    const parser = new DOMParser();
    ALL_STICKER_TEMPLATES.forEach((t) => {
      const fields = Object.fromEntries(t.fields.map((f) => [f.id, f.defaultValue]));
      const raw = t.generateSvg({
        fields,
        primaryColor: t.defaultColors.primary,
        secondaryColor: t.defaultColors.secondary,
        backgroundColor: t.defaultColors.background,
        isTransparent: false,
        fontFamily: 'Cairo',
      });
      const out = postProcessStickerSvg(raw);
      const doc = parser.parseFromString(out, 'image/svg+xml');
      expect(doc.querySelector('parsererror')?.textContent || null, t.id).toBeNull();
      // كل نص مرئي يحمل اتجاهاً صريحاً بعد المعالجة
      const texts = doc.querySelectorAll('text[data-field-id]');
      texts.forEach((el) => {
        expect(el.getAttribute('direction'), `${t.id}`).toMatch(/^(rtl|ltr)$/);
      });
    });
  });
});
