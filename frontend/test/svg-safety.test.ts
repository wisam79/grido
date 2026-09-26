import { describe, it, expect } from 'vitest';
import { sanitizeSvgMarkup } from '@/lib/utils';
import {
  isSafeCssColor,
  sanitizeStickerColor,
  sanitizeStickerFontFamily,
} from '@/features/stickers/lib/svg-safety';
import { ALL_STICKER_TEMPLATES } from '@/features/stickers/templates';

const INJECTIONS = [
  `red" onload="alert(1)`,
  `#fff"></rect><script>alert(1)</script><rect fill="#fff`,
  'javascript:alert(1)',
  `url(javascript:alert(1))`,
  `red', stroke='blue`,
];

describe('SVG sticker value safety', () => {
  describe('sanitizeStickerColor', () => {
    it('accepts valid hex / rgb / hsl / named colors', () => {
      [
        '#fff',
        '#1a2b3c',
        '#0f0f0f80',
        'rgb(10, 20, 30)',
        'rgba(1,2,3,0.5)',
        'hsl(120, 50%, 50%)',
        'red',
        'transparent',
      ].forEach((c) => expect(isSafeCssColor(c)).toBe(true));
    });

    it('rejects attribute/XML injection attempts and falls back', () => {
      INJECTIONS.forEach((bad) => {
        expect(isSafeCssColor(bad)).toBe(false);
        expect(sanitizeStickerColor(bad, '#000000')).toBe('#000000');
      });
    });

    it('keeps the sanitized value when it is safe', () => {
      expect(sanitizeStickerColor('  #ABCDEF ', '#000')).toBe('#ABCDEF');
    });
  });

  describe('sanitizeStickerFontFamily', () => {
    it('strips quotes/commas and keeps a clean family name', () => {
      expect(sanitizeStickerFontFamily("'Cairo', sans-serif")).toBe('Cairo');
      expect(sanitizeStickerFontFamily('Noto Kufi Arabic')).toBe('Noto Kufi Arabic');
    });

    it('rejects injection-shaped families and falls back', () => {
      expect(sanitizeStickerFontFamily(`x" onload="alert(1)`)).toBe('Cairo');
      expect(sanitizeStickerFontFamily('</text><script>')).toBe('Cairo');
      expect(sanitizeStickerFontFamily('')).toBe('Cairo');
    });
  });

  describe('sanitizeSvgMarkup hardening', () => {
    it('removes scripts, event handlers and SMIL animation nodes', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <script>alert(1)</script>
        <rect width="10" height="10" onload="alert(2)"/>
        <a href="#ok"><animate attributeName="href" values="javascript:alert(3)"/></a>
        <set attributeName="onclick" to="alert(4)"/>
      </svg>`;
      const clean = sanitizeSvgMarkup(svg).toLowerCase();
      expect(clean).not.toContain('<script');
      expect(clean).not.toContain('onload');
      expect(clean).not.toContain('<animate');
      expect(clean).not.toContain('<set');
      expect(clean).not.toContain('javascript:');
    });

    it('drops the <style> element and external url() references', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <style>@import url(https://evil.example/x.css);</style>
        <rect width="10" height="10" style="fill:url(https://evil.example/y)"/>
      </svg>`;
      const clean = sanitizeSvgMarkup(svg).toLowerCase();
      expect(clean).not.toContain('<style');
      expect(clean).not.toContain('@import');
      expect(clean).not.toContain('evil.example');
    });

    it('blocks external hrefs but keeps local fragments and embedded raster data', () => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg">
        <textPath href="#local">ok</textPath>
        <image href="https://evil.example/track.png"/>
        <image href="data:image/png;base64,AAAA"/>
      </svg>`;
      const clean = sanitizeSvgMarkup(svg);
      expect(clean).toContain('#local');
      expect(clean).not.toContain('evil.example');
      expect(clean).toContain('data:image/png');
    });

    it('neutralizes a template generated with an injected color', () => {
      const template = ALL_STICKER_TEMPLATES[0];
      const fields = Object.fromEntries(template.fields.map((f) => [f.id, f.defaultValue]));
      const raw = template.generateSvg({
        fields,
        primaryColor: `#fff" onload="alert(1)`,
        secondaryColor: `#000"></rect><script>alert(2)</script>`,
        backgroundColor: template.defaultColors.background,
        isTransparent: false,
        fontFamily: 'Cairo',
      });
      const clean = sanitizeSvgMarkup(raw).toLowerCase();
      expect(clean).not.toContain('onload');
      expect(clean).not.toContain('<script');
    });
  });
});
