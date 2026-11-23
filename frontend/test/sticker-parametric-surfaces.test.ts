import { describe, expect, it } from 'vitest';

import {
  deriveMetallicPair,
  deriveSurfaceGradient,
  deriveSurfacePalette,
  pickAccessibleInk,
  shiftLightnessHex,
} from '@/features/stickers/lib/color-derivation';
import {
  generateDieCutContour,
  resolveTemplateCutShape,
} from '@/features/stickers/lib/die-cut-offset';
import {
  SURFACE_BACKGROUND_OPTIONS,
  SURFACE_FRAME_OPTIONS,
  SURFACE_ORNAMENT_OPTIONS,
  SURFACE_PATTERN_OPTIONS,
  composeParametricCardSvg,
} from '@/features/stickers/lib/parametric-surfaces';
import { contrastRatio } from '@/features/stickers/lib/sticker-a11y';
import {
  buildDefaultStickerParams,
  buildStickerSvg,
} from '@/features/stickers/lib/sticker-design/build-svg';
import { searchStickerTemplates } from '@/features/stickers/templates';
import { COMPOSER_CARD_TEMPLATES } from '@/features/stickers/templates/composer_cards';

import type { StickerFinish, StickerParams } from '@/features/stickers/types';

describe('OKLCH Color Derivation Engine', () => {
  it('derives lighter/deeper surface and metallic stops as valid hex colors', () => {
    const surface = deriveSurfaceGradient('#1e3f63');
    const metallic = deriveMetallicPair('#f7d774');

    expect(surface.light).toMatch(/^#[0-9a-f]{6}$/i);
    expect(surface.base).toBe('#1e3f63');
    expect(surface.deep).toMatch(/^#[0-9a-f]{6}$/i);
    expect(surface.light).not.toBe(surface.deep);

    expect(metallic.highlight).toMatch(/^#[0-9a-f]{6}$/i);
    expect(metallic.base).toBe('#f7d774');
    expect(metallic.shadow).toMatch(/^#[0-9a-f]{6}$/i);
    expect(metallic.highlight).not.toBe(metallic.shadow);
  });

  it('picks WCAG-accessible ink for both dark and light surfaces', () => {
    const onDark = pickAccessibleInk('#0f172a');
    const onLight = pickAccessibleInk('#fef3c7');

    expect(onDark).toBe('#ffffff');
    expect(onLight).toBe('#0f172a');
    expect(contrastRatio(onDark, '#0f172a')!).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(onLight, '#fef3c7')!).toBeGreaterThanOrEqual(4.5);
  });

  it('falls back gracefully on invalid colors without throwing', () => {
    expect(shiftLightnessHex('not-a-color', 0.1)).toBe('not-a-color');
    const palette = deriveSurfacePalette('invalid', '#d97706', 'bad-bg');
    expect(palette.primaryBase).toBe('invalid');
    expect(palette.accentInk).toMatch(/^#/);
  });
});

describe('Parametric Surfaces & Card Composer Templates', () => {
  it('registers both square and portrait parametric card templates in cards category with explicit sizes', () => {
    expect(COMPOSER_CARD_TEMPLATES).toHaveLength(2);
    const square = COMPOSER_CARD_TEMPLATES.find((t) => t.id === 'card_composer_square')!;
    const portrait = COMPOSER_CARD_TEMPLATES.find((t) => t.id === 'card_composer_portrait')!;

    expect(square).toBeDefined();
    expect(portrait).toBeDefined();
    expect(square.defaultMm).toEqual({ width: 100, height: 100 });
    expect(portrait.defaultMm).toEqual({ width: 90, height: 130 });
    expect(square.cutShape?.kind).toBe('roundedRect');
    expect(portrait.cutShape?.kind).toBe('roundedRect');

    const cardResults = searchStickerTemplates('', 'cards', 'all');
    expect(cardResults.some((t) => t.id === 'card_composer_square')).toBe(true);
    expect(cardResults.some((t) => t.id === 'card_composer_portrait')).toBe(true);
  });

  it('renders every background, pattern, frame, ornament, and finish cleanly without raster SVG filters', () => {
    const square = COMPOSER_CARD_TEMPLATES[0];
    const base = buildDefaultStickerParams(square);

    for (const bg of SURFACE_BACKGROUND_OPTIONS) {
      for (const pat of SURFACE_PATTERN_OPTIONS) {
        const svg = composeParametricCardSvg(
          {
            ...base,
            fields: {
              ...base.fields,
              bg: bg.id,
              pattern: pat.id,
            },
          },
          {
            layout: 'square',
            bg: 'aurora',
            pattern: 'dots',
            frame: 'classic',
            ornament: 'diamond',
            badgeText: 'عرض',
            title: 'بطاقة',
            subtitle: 'فرعي',
            footer: 'تذييل',
          },
        );
        expect(svg).toContain('<svg');
        expect(svg).not.toContain('NaN');
        expect(svg).not.toContain('undefined');
        expect(svg).not.toMatch(/feTurbulence|feDisplacementMap|<script/i);
      }
    }

    for (const frame of SURFACE_FRAME_OPTIONS) {
      for (const ornament of SURFACE_ORNAMENT_OPTIONS) {
        const svg = buildStickerSvg(
          square,
          {
            ...base,
            fields: {
              ...base.fields,
              frame: frame.id,
              ornament: ornament.id,
            },
          },
          { namespace: `card-${frame.id}-${ornament.id}` },
        );
        expect(svg).toContain('data-field-id="title"');
        expect(svg).toContain('data-color-role="primary"');
        expect(svg).toContain('data-color-role="secondary"');
        expect(svg).not.toContain('NaN');
        expect(svg).not.toMatch(/feTurbulence|feDisplacementMap/i);
      }
    }

    const portrait = COMPOSER_CARD_TEMPLATES[1];
    const portraitBase = buildDefaultStickerParams(portrait);
    for (const finish of ['standard', 'glossy', 'matte', 'holographic'] as StickerFinish[]) {
      const svg = buildStickerSvg(
        portrait,
        { ...portraitBase, finish },
        { namespace: `portrait-${finish}` },
      );
      expect(svg).toContain('viewBox="0 0 360 520"');
      expect(svg).not.toContain('NaN');
    }
  });

  it('preserves user copy on randomizeParams and exports valid roundedRect CutContour', () => {
    const square = COMPOSER_CARD_TEMPLATES[0];
    const base = buildDefaultStickerParams(square);
    const edited: StickerParams = {
      ...base,
      fields: {
        ...base.fields,
        title: 'عنوان مخصص لا يُمسح',
        subtitle: 'وصف العميل',
        footer: 'هاتف الاستوديو',
      },
    };
    const next = square.randomizeParams!(edited);
    expect(next.fields.title).toBe('عنوان مخصص لا يُمسح');
    expect(next.fields.subtitle).toBe('وصف العميل');
    expect(next.fields.footer).toBe('هاتف الاستوديو');
    expect(next.fields.bg).not.toBe(edited.fields.bg);

    const svg = buildStickerSvg(square, next, { namespace: 'card-cut' });
    const cut = resolveTemplateCutShape(square, next);
    const contour = generateDieCutContour(svg, {
      cutShape: cut,
      physicalMm: square.defaultMm,
    });
    expect(contour.standaloneContourSvg).toContain('CutContour');
    expect(contour.pathData).toContain('M');
  });
});
