import { describe, it, expect } from 'vitest';
import { embedStickerFonts, isSafeFontFaceStyle } from '@/features/stickers/lib/sticker-font-embed';
import { sanitizeSvgMarkup } from '@/lib/utils';
import { CanvasElementSchema } from '@/lib/schema';
import { mmToPx } from '@/features/stickers/lib/sticker-text';

describe('phase2: portable SVG + vector source + mm sheet', () => {
  it('allows safe @font-face data: style through sanitizer', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>@font-face{font-family:'Cairo';src:url(data:font/woff2;base64,AAA=) format('woff2');}</style><text x="50" y="50">مرحبا</text></svg>`;
    const out = sanitizeSvgMarkup(svg);
    expect(out).toContain('@font-face');
    expect(out).toContain('data:font/woff2');
  });

  it('still strips dangerous style content', () => {
    expect(isSafeFontFaceStyle(`@import url(http://evil/x.css);`)).toBe(false);
    expect(
      isSafeFontFaceStyle(`.a{background:url(http://evil/x.png)} @font-face{font-family:'X';}`),
    ).toBe(false);
    expect(
      isSafeFontFaceStyle(`@font-face{font-family:'Cairo';src:url(data:font/woff2;base64,AAA=);}`),
    ).toBe(true);
  });

  it('embed returns original gracefully without document fonts', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="50">Hi</text></svg>`;
    const out = await embedStickerFonts(svg, ['NonExistentFontXYZ']);
    expect(out).toBe(svg);
  });

  it('embed skips already-embedded svg', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>@font-face{font-family:'Cairo';}</style><text>x</text></svg>`;
    const out = await embedStickerFonts(svg, ['Cairo']);
    expect(out).toBe(svg);
  });

  it('schema accepts vector svg in stickerSource (back-compat)', () => {
    const el = {
      id: 'a',
      type: 'image',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      imageSrc: 'data:image/png;base64,AAA',
      stickerSource: {
        templateId: 'seal_gold_guarantee',
        params: { fields: {} },
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>`,
      },
    };
    expect(CanvasElementSchema.safeParse(el).success).toBe(true);
    const legacy = { ...el, stickerSource: { templateId: 'x', params: {} } };
    expect(CanvasElementSchema.safeParse(legacy).success).toBe(true);
  });

  it('sheet generator honors paper mm aspect (A4) not forced square', () => {
    expect(mmToPx(200)).toBe(2362); // 200*300/25.4
    expect(mmToPx(4)).toBe(47);
    // A4 بحسب الإعدادات: 210×297مم — نسبة 0.707 لا 1.0 (مربع)
    const a4w = mmToPx(210);
    const a4h = mmToPx(297);
    expect(a4h / a4w).toBeCloseTo(297 / 210, 2);
    expect(a4h).not.toBe(a4w);
  });
});
