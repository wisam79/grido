import { describe, it, expect, vi } from 'vitest';

import { embedStickerFonts, isSafeFontFaceStyle } from '@/features/stickers/lib/sticker-font-embed';
import { mmToPx } from '@/features/stickers/lib/sticker-text';
import { CanvasElementSchema } from '@/lib/schema';
import { sanitizeSvgMarkup } from '@/lib/utils';

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

  it('embeds every script subset and weight of the requested family', async () => {
    const style = document.createElement('style');
    style.textContent = [400, 700]
      .flatMap((weight) =>
        ['U+0600-06FF', 'U+0000-00FF'].map(
          (range, index) =>
            `@font-face{font-family:'StickerSubsetTest';font-style:normal;font-weight:${weight};unicode-range:${range};src:url('/subset-${weight}-${index}.woff2') format('woff2');}`,
        ),
      )
      .join('');
    document.head.appendChild(style);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'font/woff2' }),
      arrayBuffer: async () => new Uint8Array([119, 79, 70, 50]).buffer,
    } as Response);
    try {
      const out = await embedStickerFonts(
        '<svg xmlns="http://www.w3.org/2000/svg"><text>مرحبا ABC</text></svg>',
        ['StickerSubsetTest'],
      );
      expect(out.match(/@font-face/g)).toHaveLength(4);
      expect(out.match(/font-weight:700/g)).toHaveLength(2);
      expect(out).toContain('unicode-range:U+0600-06FF;');
      expect(out).toContain('unicode-range:U+0000-00FF;');
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(out).toContain('src:url(data:font/woff2;base64,');
    } finally {
      style.remove();
      fetchMock.mockRestore();
    }
  });

  it('embeds cloud subsets from unreadable Google CSS, allowing only Google font assets', async () => {
    const href = 'https://fonts.googleapis.com/css2?family=Lalezar:wght@400&display=swap';
    const sheet = {
      href,
      get cssRules(): CSSRuleList {
        throw new DOMException('Cross origin', 'SecurityError');
      },
    } as CSSStyleSheet;
    const sheets = vi
      .spyOn(document, 'styleSheets', 'get')
      .mockReturnValue([sheet] as unknown as StyleSheetList);
    const css = [
      "@font-face{font-family:'Lalezar';font-weight:400;unicode-range:U+0600-06FF;src:url(https://fonts.gstatic.com/s/lalezar/test-arabic.woff2) format('woff2');}",
      "@font-face{font-family:'Lalezar';font-weight:400;unicode-range:U+0000-00FF;src:url(https://fonts.gstatic.com/s/lalezar/test-latin.woff2) format('woff2');}",
      "@font-face{font-family:'Lalezar';src:url(https://fonts.gstatic.com.evil.test/font.woff2);}",
      "@font-face{font-family:'Unrelated';src:url(https://fonts.gstatic.com/s/unrelated.woff2);}",
    ].join('');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      return {
        ok: true,
        url,
        headers: new Headers({ 'content-type': url === href ? 'text/css' : 'font/woff2' }),
        text: async () => css,
        arrayBuffer: async () => new Uint8Array([119, 79, 70, 50]).buffer,
      } as Response;
    });
    try {
      const out = await embedStickerFonts(
        '<svg><text font-family="Lalezar">مرحبا ABC</text></svg>',
        ['Lalezar'],
      );
      expect(out.match(/@font-face/g)).toHaveLength(2);
      expect(out).toContain('unicode-range:U+0600-06FF;');
      expect(out).toContain('unicode-range:U+0000-00FF;');
      expect(out).toContain('src:url(data:font/woff2;base64,');
      expect(out).not.toContain('https:');
      expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
        href,
        'https://fonts.gstatic.com/s/lalezar/test-arabic.woff2',
        'https://fonts.gstatic.com/s/lalezar/test-latin.woff2',
      ]);
    } finally {
      sheets.mockRestore();
      fetchMock.mockRestore();
    }
  });

  it('resolves local font assets relative to the stylesheet rather than the document', async () => {
    const sheet = {
      href: `${window.location.origin}/assets/styles/fonts.css`,
      cssRules: [
        {
          type: 5,
          cssText:
            "@font-face{font-family:'RelativeFontTest';src:url('../relative-test.woff2') format('woff2');}",
        },
      ],
    } as unknown as CSSStyleSheet;
    const sheets = vi
      .spyOn(document, 'styleSheets', 'get')
      .mockReturnValue([sheet] as unknown as StyleSheetList);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'font/woff2' }),
      arrayBuffer: async () => new Uint8Array([119, 79, 70, 50]).buffer,
    } as Response);
    try {
      const out = await embedStickerFonts('<svg><text>Text</text></svg>', ['RelativeFontTest']);
      expect(out).toContain('@font-face');
      expect(String(fetchMock.mock.calls[0][0])).toBe(
        `${window.location.origin}/assets/relative-test.woff2`,
      );
    } finally {
      sheets.mockRestore();
      fetchMock.mockRestore();
    }
  });

  it('does not fetch arbitrary or protocol-relative stylesheet/font origins', async () => {
    const sheet = {
      href: 'https://fonts.googleapis.com.evil.test/fonts.css',
      cssRules: [
        {
          type: 5,
          cssText: "@font-face{font-family:'BlockedFontTest';src:url('//evil.test/font.woff2');}",
        },
      ],
    } as unknown as CSSStyleSheet;
    const sheets = vi
      .spyOn(document, 'styleSheets', 'get')
      .mockReturnValue([sheet] as unknown as StyleSheetList);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as Response);
    try {
      const svg = '<svg><text>Text</text></svg>';
      expect(await embedStickerFonts(svg, ['BlockedFontTest'])).toBe(svg);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      sheets.mockRestore();
      fetchMock.mockRestore();
    }
  });

  it('does not fetch a cloud stylesheet warmed by the picker for another family', async () => {
    const sheet = {
      href: 'https://fonts.googleapis.com/css2?family=Katibeh:wght@400&display=swap',
      get cssRules(): CSSRuleList {
        throw new DOMException('Cross origin', 'SecurityError');
      },
    } as CSSStyleSheet;
    const sheets = vi
      .spyOn(document, 'styleSheets', 'get')
      .mockReturnValue([sheet] as unknown as StyleSheetList);
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    try {
      const svg = '<svg><text>Text</text></svg>';
      expect(await embedStickerFonts(svg, ['Cairo'])).toBe(svg);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      sheets.mockRestore();
      fetchMock.mockRestore();
    }
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
