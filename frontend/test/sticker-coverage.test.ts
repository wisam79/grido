import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadStickerPresets,
  saveStickerPreset,
  deleteStickerPreset,
  getPresetsForTemplate,
  STICKER_PRESETS_STORAGE_KEY,
} from '@/features/stickers/lib/preset-utils';
import type { StickerParams } from '@/features/stickers/types';
import {
  generateBarcodeInnerSvg,
  generateBarcodeInnerSvgAsync,
  generateQrCodeInnerSvgAsync,
} from '@/features/stickers/lib/barcode-svg';
import { embedStickerFonts } from '@/features/stickers/lib/sticker-font-embed';
import {
  ALL_STICKER_TEMPLATES,
  getStickerTemplateById,
  getStickerTemplatesByCategory,
  getTemplateShape,
  searchStickerTemplates,
} from '@/features/stickers/templates';
import { findHiddenFieldIds } from '@/features/stickers/templates/svg-elements';
import { estimateTextWidth, mmToPx, stickerRasterSize } from '@/features/stickers/lib/sticker-text';

function sampleParams(overrides: Partial<StickerParams> = {}): StickerParams {
  return {
    fields: { title: 'متجر السعادة' },
    primaryColor: '#1e293b',
    secondaryColor: '#d97706',
    backgroundColor: '#ffffff',
    isTransparent: false,
    fontFamily: 'Cairo',
    fontScale: 1,
    ...overrides,
  };
}

describe('sticker-coverage: user presets storage hardening', () => {
  beforeEach(() => localStorage.removeItem(STICKER_PRESETS_STORAGE_KEY));
  afterEach(() => localStorage.removeItem(STICKER_PRESETS_STORAGE_KEY));

  it.each([
    ['corrupted JSON', 'not-json{{{'],
    ['non-array object', '{"a":1}'],
    ['null literal', 'null'],
    ['entry without params', JSON.stringify([{ id: 'x', templateId: 't' }])],
    ['entry without fields object', JSON.stringify([{ id: 'x', templateId: 't', params: {} }])],
    [
      'entry with non-object fields',
      JSON.stringify([{ id: 'x', templateId: 't', params: { fields: 'nope' } }]),
    ],
  ])('rejects invalid stored payload: %s', (_label, raw) => {
    localStorage.setItem(STICKER_PRESETS_STORAGE_KEY, raw);
    expect(loadStickerPresets()).toEqual([]);
  });

  it('replaces same-name preset of the same template keeping latest params', () => {
    saveStickerPreset('المفضل', 'retail_was_now', sampleParams({ primaryColor: '#111111' }));
    saveStickerPreset('المفضل', 'retail_was_now', sampleParams({ primaryColor: '#222222' }));
    const loaded = loadStickerPresets();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].params.primaryColor).toBe('#222222');
  });

  it('keeps same-name presets of different templates apart', () => {
    saveStickerPreset('المفضل', 'retail_was_now', sampleParams());
    saveStickerPreset('المفضل', 'cafe_freshly_brewed', sampleParams());
    expect(loadStickerPresets()).toHaveLength(2);
    expect(getPresetsForTemplate(loadStickerPresets(), 'retail_was_now')).toHaveLength(1);
  });

  it('caps stored presets at 50 newest-first', () => {
    for (let i = 0; i < 55; i++) {
      saveStickerPreset(`قالب ${i}`, 'retail_was_now', sampleParams());
    }
    const loaded = loadStickerPresets();
    expect(loaded).toHaveLength(50);
    expect(loaded[0].name).toBe('قالب 54');
  });

  it('issues collision-proof ids across rapid saves', () => {
    for (let i = 0; i < 50; i++) {
      saveStickerPreset(`سريع ${i}`, 'retail_was_now', sampleParams());
    }
    const ids = loadStickerPresets().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to default name on blank input', () => {
    const saved = saveStickerPreset('   ', 'retail_was_now', sampleParams());
    expect(saved.name).toBe('قالب مخصص');
  });

  it('deep-copies fields so later mutations cannot corrupt the stored preset', () => {
    const params = sampleParams();
    saveStickerPreset('نسخة', 'retail_was_now', params);
    params.fields.title = 'مُعَدَّل لاحقاً';
    expect(loadStickerPresets()[0].params.fields.title).toBe('متجر السعادة');
  });

  it('deleting an unknown id leaves the list untouched', () => {
    saveStickerPreset('باقٍ', 'retail_was_now', sampleParams());
    expect(deleteStickerPreset('preset_missing')).toHaveLength(1);
    expect(loadStickerPresets()).toHaveLength(1);
  });
});

describe('sticker-coverage: barcode and QR generation paths', () => {
  it('renders a real scannable CODE128 barcode synchronously after warmup', async () => {
    await generateBarcodeInnerSvgAsync('TEST123', 'CODE128');
    const svg = generateBarcodeInnerSvg('TEST123', 'CODE128', { lineColor: '#111111' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).not.toContain('جارٍ تجهيز');
    expect(svg).not.toContain('بيانات غير صالحة');
  });

  it('renders an explicit warning for invalid EAN13 instead of fake bars', () => {
    const svg = generateBarcodeInnerSvg('NOT-NUMERIC!', 'EAN13');
    expect(svg).toContain('بيانات غير صالحة');
    expect(svg).toContain('stroke-dasharray');
  });

  it('generates barcode asynchronously with caller size options', async () => {
    const svg = await generateBarcodeInnerSvgAsync('621100012345', 'EAN13', { height: 80 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('height="80"');
    expect(svg).not.toContain('بيانات غير صالحة');
  });

  it('generates a real QR code asynchronously, never a solid placeholder', async () => {
    const svg = await generateQrCodeInnerSvgAsync('https://grido.app/s/test', 200);
    expect(svg).toContain('<svg');
    expect(svg).not.toContain('تعذر توليد');
  });
});

describe('sticker-coverage: font embedding skip paths', () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="50">نص</text></svg>`;

  it('returns input unchanged when no families requested', async () => {
    await expect(embedStickerFonts(svg, [])).resolves.toBe(svg);
  });

  it('returns input unchanged when fonts are already embedded', async () => {
    const embedded = svg.replace(
      '</svg>',
      `<style>@font-face{font-family:'Cairo';src:url(data:font/woff2;base64,AAA=);}</style></svg>`,
    );
    await expect(embedStickerFonts(embedded, ['Cairo'])).resolves.toBe(embedded);
  });

  it('returns input unchanged for unknown families without fetchable faces', async () => {
    await expect(embedStickerFonts(svg, ['NoSuchFontXYZ'])).resolves.toBe(svg);
  });
});

describe('sticker-coverage: catalog lookup and grouping', () => {
  it.each([
    ['commercial', ['badges', 'retail']],
    ['packaging', ['shipping', 'packaging']],
    ['codes', ['barcodes', 'social']],
    ['stores', ['cafe', 'beauty']],
    ['occasions', ['greeting', 'kids', 'seasonal']],
    ['safety', ['safety']],
    ['frames', ['frames']],
  ])('group %s resolves to categories %j', (group, expected) => {
    const hits = searchStickerTemplates('', group as 'commercial', 'all');
    expect(hits.length).toBeGreaterThan(0);
    expect(new Set(hits.map((t) => t.category))).toEqual(new Set(expected));
  });

  it('shape filter keeps only matching silhouettes', () => {
    for (const shape of ['circle', 'rect', 'square'] as const) {
      const hits = searchStickerTemplates('', 'all', shape);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.every((t) => getTemplateShape(t) === shape)).toBe(true);
    }
  });

  it('empty query returns the whole catalog', () => {
    expect(searchStickerTemplates('', 'all', 'all')).toHaveLength(ALL_STICKER_TEMPLATES.length);
  });

  it('looks templates up by id, category, and unknown id', () => {
    expect(getStickerTemplateById('seal_gold_guarantee')?.name).toBe('ختم الضمان الذهبي');
    expect(getStickerTemplateById('no_such_template')).toBeUndefined();
    const cafe = getStickerTemplatesByCategory('cafe');
    expect(cafe.length).toBeGreaterThanOrEqual(6);
    expect(cafe.every((t) => t.category === 'cafe')).toBe(true);
  });

  it('detects fields with no clickable element in the svg', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text data-field-id="visible">نص</text></svg>`;
    expect(findHiddenFieldIds(svg, ['visible', 'qrValue'])).toEqual(['qrValue']);
    expect(findHiddenFieldIds(svg, ['visible'])).toEqual([]);
  });
});

describe('sticker-coverage: measurement and sizing edge cases', () => {
  it('falls back to glyph estimate when canvas measurement is unavailable', () => {
    expect(estimateTextWidth('', 20, 'Cairo', 700)).toBe(0);
    // jsdom has no canvas 2d context → 3 glyphs × 10px × 0.6
    expect(estimateTextWidth('abc', 10, 'Cairo', 400)).toBeCloseTo(18, 5);
  });

  it.each([[0], [-5]])('floors non-positive millimeters to 1px: %i', (mm) => {
    expect(mmToPx(mm)).toBe(1);
  });

  it.each([[0], [-2], [NaN]])('falls back to square default on degenerate aspect %s', (aspect) => {
    const size = stickerRasterSize(aspect, undefined);
    expect(size).toEqual({ width: 591, height: 591 });
  });
});
