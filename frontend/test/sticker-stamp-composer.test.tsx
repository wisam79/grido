import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { StickerDesignTab } from '@/features/stickers/components/sticker-design-tab';
import { StickerPreview } from '@/features/stickers/components/sticker-preview';
import { COMPOSER_ICONS } from '@/features/stickers/lib/composer-icons';
import {
  generateDieCutContour,
  resolveTemplateCutShape,
} from '@/features/stickers/lib/die-cut-offset';
import {
  STAMP_DECOR_OPTIONS,
  STAMP_SHAPE_OPTIONS,
  composeStampV2Svg,
  resolveStampV2CutShape,
} from '@/features/stickers/lib/stamp-composer-v2';
import {
  buildDefaultStickerParams,
  buildStickerSvg,
} from '@/features/stickers/lib/sticker-design/build-svg';
import { COMPOSER_STAMP_TEMPLATES } from '@/features/stickers/templates/composer_stamps';

import type { StickerParams } from '@/features/stickers/types';

describe('Stamp Composer v2 Engine & Templates', () => {
  const customStamp = COMPOSER_STAMP_TEMPLATES.find((t) => t.id === 'composer_stamp_custom')!;

  it('registers all 8 v2 composite stamps with valid defaultMm and cutShape', () => {
    expect(COMPOSER_STAMP_TEMPLATES).toHaveLength(8);
    for (const template of COMPOSER_STAMP_TEMPLATES) {
      expect(template.defaultMm).toEqual({ width: 55, height: 55 });
      expect(template.cutShape).toBeDefined();
      const svg = buildStickerSvg(template, buildDefaultStickerParams(template), {
        namespace: template.id,
      });
      expect(svg).toContain('<svg');
      expect(svg).toContain('clipPath');
      expect(svg).not.toContain('NaN');
      expect(svg).not.toContain('undefined');
    }
  });

  it('renders every shape, decor, finish, and MIT icon without unsafe attributes', () => {
    const base = buildDefaultStickerParams(customStamp);
    for (const shape of STAMP_SHAPE_OPTIONS) {
      expect(resolveStampV2CutShape(shape.id)).toBeDefined();
      for (const decor of STAMP_DECOR_OPTIONS) {
        const svg = composeStampV2Svg(
          {
            ...base,
            finish: 'glossy',
            dieCutBorder: true,
            fields: {
              ...base.fields,
              shape: shape.id,
              decor: decor.id,
            },
          },
          {
            shape: 'rosette',
            icon: 'ph:seal-check-fill',
            decor: 'stars',
            topText: 'PREMIUM QUALITY',
            mainText: 'موثوق',
            subText: 'جودة مضمونة',
          },
        );
        expect(svg).toContain('data-field-id="shape"');
        expect(svg).toContain('data-field-id="icon"');
        expect(svg).toContain('data-field-id="decor"');
        expect(svg).toContain('data-field-id="mainText"');
        expect(svg).not.toMatch(/onload=|onerror=|<script/i);
      }
    }

    for (const icon of COMPOSER_ICONS) {
      const svg = buildStickerSvg(
        customStamp,
        {
          ...base,
          fields: { ...base.fields, icon: icon.id },
        },
        { namespace: 'ic-check' },
      );
      expect(svg).toContain('<svg');
      expect(svg).not.toContain('NaN');
    }
  });

  it('includes 47 pure-MIT icons and excludes CC-BY / brand icon sets', () => {
    expect(COMPOSER_ICONS).toHaveLength(47);
    const ids = new Set(COMPOSER_ICONS.map((ic) => ic.id));
    expect(ids.size).toBe(47);
    for (const icon of COMPOSER_ICONS) {
      expect(icon.id).toMatch(/^(ph|tabler|fluent-emoji-flat):/);
      expect(icon.id).not.toMatch(/^(twemoji|simple-icons):/);
    }
  });

  it('tracks live selected stamp shape dynamically in resolveTemplateCutShape and die-cut contour export', () => {
    const base = buildDefaultStickerParams(customStamp);
    const rosetteCut = resolveTemplateCutShape(customStamp, base);
    const shieldParams = { ...base, fields: { ...base.fields, shape: 'shield' } };
    const circleParams = { ...base, fields: { ...base.fields, shape: 'circle' } };

    const shieldCut = resolveTemplateCutShape(customStamp, shieldParams);
    const circleCut = resolveTemplateCutShape(customStamp, circleParams);

    expect(rosetteCut).toEqual(resolveStampV2CutShape('rosette'));
    expect(shieldCut).toEqual(resolveStampV2CutShape('shield'));
    expect(circleCut).toEqual({ kind: 'circle', cx: 120, cy: 120, r: 100 });

    const shieldSvg = buildStickerSvg(customStamp, shieldParams, { namespace: 'cut-shield' });
    const circleSvg = buildStickerSvg(customStamp, circleParams, { namespace: 'cut-circle' });
    const shieldContour = generateDieCutContour(shieldSvg, { cutShape: shieldCut });
    const circleContour = generateDieCutContour(circleSvg, { cutShape: circleCut });

    expect(shieldContour.pathData).toBe((shieldCut as { kind: 'path'; d: string }).d);
    expect(circleContour.pathData).not.toBe(shieldContour.pathData);
  });

  it('shrinks mainText and its drop-shadow identically when mainText overflows maxWidth', () => {
    const base = buildDefaultStickerParams(customStamp);
    const longParams = {
      ...base,
      fields: {
        ...base.fields,
        mainText: 'جودة فائقة ومضمونة لعملائنا الكرام جداً',
      },
    };
    const svg = buildStickerSvg(customStamp, longParams, { namespace: 'shadow-parity' });
    const shadowSize = svg.match(/<text aria-hidden="true"[^>]*font-size="([\d.]+)"/)?.[1];
    const mainSize = svg.match(/<text data-field-id="mainText"[^>]*font-size="([\d.]+)"/)?.[1];

    expect(shadowSize).toBeDefined();
    expect(mainSize).toBeDefined();
    expect(shadowSize).toBe(mainSize);
    expect(Number(mainSize)).toBeLessThan(23);
  });

  it('renders visual shape-grid, filterable icon-grid, and randomize button preserving user text', () => {
    const onFieldChange = vi.fn();
    const base = buildDefaultStickerParams(customStamp);
    const userParams: StickerParams = {
      ...base,
      fields: {
        ...base.fields,
        mainText: 'نص العميل المحفوظ',
      },
    };
    const commit = vi.fn((updater: (prev: StickerParams) => StickerParams) => updater(userParams));

    render(
      <TooltipProvider>
        <StickerDesignTab
          template={customStamp}
          params={userParams}
          onChangeParams={vi.fn()}
          commit={commit}
          contrastWarning={null}
          onFieldChange={onFieldChange}
          onColorChange={vi.fn()}
        />
      </TooltipProvider>,
    );

    const waxBtn = screen.getByRole('button', { name: 'شمعي' });
    expect(waxBtn.querySelector('svg')).not.toBeNull();
    fireEvent.click(waxBtn);
    expect(onFieldChange).toHaveBeenCalledWith('shape', 'wax');

    const confettiBtn = screen.getByRole('button', { name: 'قصاصات' });
    fireEvent.click(confettiBtn);
    expect(onFieldChange).toHaveBeenCalledWith('decor', 'confetti');

    const iconGroup = screen.getByLabelText('الأيقونة');
    expect(iconGroup).toBeInTheDocument();
    expect(iconGroup.querySelectorAll('button').length).toBe(47);

    const filterInput = screen.getByLabelText('تصفية الأيقونات');
    fireEvent.change(filterInput, { target: { value: 'طرد' } });
    const filteredButtons = iconGroup.querySelectorAll('button');
    expect(filteredButtons.length).toBeLessThan(10);

    fireEvent.click(screen.getByRole('button', { name: 'طرد ممتلئ' }));
    expect(onFieldChange).toHaveBeenCalledWith('icon', 'ph:package-fill');

    fireEvent.click(screen.getByRole('button', { name: 'توليفة عشوائية' }));
    expect(commit).toHaveBeenCalledTimes(1);
    const randomized = commit.mock.results[0].value;
    expect(randomized.fields.mainText).toBe('نص العميل المحفوظ');
    expect(randomized.fields.topText).toBe(userParams.fields.topText);
    expect(randomized.fields.subText).toBe(userParams.fields.subText);
    expect(randomized.fields.shape).not.toBe(userParams.fields.shape);
  });

  it('steps Enter only through editable text fields in StickerInlineEditor on composite stamps', () => {
    const base = buildDefaultStickerParams(customStamp);
    const svg = buildStickerSvg(customStamp, base, { namespace: 'inline-step' });
    const view = render(
      <TooltipProvider>
        <StickerPreview template={customStamp} params={base} svgString={svg} />
      </TooltipProvider>,
    );

    const topEl = view.container.querySelector('svg text[data-field-id="topText"]')!;
    fireEvent.click(topEl);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue(base.fields.mainText);

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue(base.fields.subText);
  });
});
