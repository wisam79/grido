import { describe, expect, it } from 'vitest';

import {
  buildDefaultStickerParams,
  buildStickerSvg,
  MAX_STICKER_FIELD_LENGTH,
  sanitizeStickerParams,
} from '@/features/stickers/lib/sticker-design/build-svg';
import { ALL_STICKER_TEMPLATES } from '@/features/stickers/templates';

describe('sticker-design/build-svg', () => {
  const template =
    ALL_STICKER_TEMPLATES.find((item) => item.id === 'seal_gold_guarantee') ??
    ALL_STICKER_TEMPLATES[0];

  it('builds a valid SVG for every bundled template without NaN/undefined', () => {
    for (const item of ALL_STICKER_TEMPLATES) {
      const svg = buildStickerSvg(item, buildDefaultStickerParams(item));
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).not.toContain('NaN');
      expect(svg).not.toContain('undefined');
    }
  });

  it('sanitizes unsafe colors and font families at the single build point', () => {
    const params = {
      ...buildDefaultStickerParams(template),
      primaryColor: '#fff" onload="alert(1)',
      secondaryColor: 'red;background:url(http://evil)',
      backgroundColor: '#ffffff',
      fontFamily: 'Cairo" onload="alert(1)',
    };
    const svg = buildStickerSvg(template, params);
    expect(svg).not.toContain('onload');
    expect(svg).not.toContain('evil');
    expect(svg).toContain(template.defaultColors.primary);
  });

  it('namespaces ids for repeated previews', () => {
    const svg = buildStickerSvg(template, buildDefaultStickerParams(template), {
      namespace: 'preview-a',
    });
    expect(svg).toContain('id="preview-a-');
    expect(svg).toMatch(/url\(#preview-a-/);
  });

  it('caps field length and clamps font scale', () => {
    const params = {
      ...buildDefaultStickerParams(template),
      fields: { ...buildDefaultStickerParams(template).fields, topText: 'ا'.repeat(600) },
      fontScale: 99,
    };
    const safe = sanitizeStickerParams(template, params);
    expect(safe.fields.topText).toHaveLength(MAX_STICKER_FIELD_LENGTH);
    expect(safe.fontScale).toBe(1.3);
  });

  it('falls back to defaults for non-finite font scale', () => {
    const params = { ...buildDefaultStickerParams(template), fontScale: Number.NaN };
    expect(sanitizeStickerParams(template, params).fontScale).toBe(1);
  });
});
