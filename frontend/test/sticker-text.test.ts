import { describe, it, expect } from 'vitest';

import { ALL_STICKER_TEMPLATES } from '@/features/stickers';
import {
  detectTextDirection,
  isArabicText,
  mmToPx,
  stickerRasterSize,
  postProcessStickerSvg,
} from '@/features/stickers/lib/sticker-text';

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

  it('fits narrow fields rather than the whole sticker, including short values', () => {
    const svg = `<svg viewBox="0 0 500 500"><text data-max-width="60" font-size="100">1+1</text></svg>`;
    const out = postProcessStickerSvg(svg);
    const fontSize = Number(out.match(/font-size="([\d.]+)"/)?.[1]);
    expect(fontSize).toBeGreaterThan(0);
    expect(fontSize).toBeLessThan(55);
    expect(fontSize * 3 * 0.6).toBeLessThanOrEqual(60);
  });

  it('fits an explicitly bounded arc and preserves Arabic shaping', () => {
    const svg = `<svg viewBox="0 0 500 500"><text data-max-width="100" font-size="30" letter-spacing="3"><textPath href="#curve">عبارة تهنئة عربية طويلة للمناسبة</textPath></text></svg>`;
    const out = postProcessStickerSvg(svg);
    expect(out).toContain('direction="rtl"');
    expect(out).not.toContain('letter-spacing');
    expect(out).toContain('href="#curve"');
    expect(Number(out.match(/font-size="([\d.]+)"/)?.[1])).toBeLessThan(30);
  });

  it('fits Latin tracking with the font instead of overflowing a narrow label', () => {
    const svg = `<svg viewBox="0 0 500 500"><text data-max-width="70" font-size="20" letter-spacing="8">PREMIUM</text></svg>`;
    const out = postProcessStickerSvg(svg);
    const size = Number(out.match(/font-size="([\d.]+)"/)?.[1]);
    const spacing = Number(out.match(/letter-spacing="([\d.]+)"/)?.[1]);
    expect(size).toBeLessThan(20);
    expect(spacing).toBeLessThan(8);
    expect(size * 7 * 0.6 + spacing * 7).toBeLessThanOrEqual(70);
    expect(postProcessStickerSvg(out)).toBe(out);
  });

  it('retains literal XML-special field content when measuring its width', () => {
    const svg = `<svg viewBox="0 0 500 500"><text data-max-width="80" font-size="40">&lt;Limited&gt; &amp; Co</text></svg>`;
    const out = postProcessStickerSvg(svg);
    expect(out).toContain('&lt;Limited&gt; &amp; Co');
    expect(Number(out.match(/font-size="([\d.]+)"/)?.[1])).toBeLessThan(15);
  });

  it('namespaces SVG definitions without changing editable field identities', () => {
    const svg = `<svg viewBox="0 0 500 500"><defs><path id="curve" d="M0 0H100"/></defs><text data-field-id="title" font-size="20"><textPath href="#curve">نص</textPath></text></svg>`;
    const out = postProcessStickerSvg(svg, { namespace: 'preview' });
    expect(out).toContain('id="preview-curve"');
    expect(out).toContain('href="#preview-curve"');
    expect(out).toContain('data-field-id="title"');
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
