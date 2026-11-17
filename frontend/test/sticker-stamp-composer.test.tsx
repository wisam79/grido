import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { StickerDesignTab } from '@/features/stickers/components/sticker-design-tab';
import { COMPOSER_ICONS } from '@/features/stickers/lib/composer-icons';
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

  it('renders pill selectors for concise select fields and dropdown trigger for icon list in StickerDesignTab', () => {
    const onFieldChange = vi.fn();
    render(
      <TooltipProvider>
        <StickerDesignTab
          template={customStamp}
          params={buildDefaultStickerParams(customStamp)}
          onChangeParams={vi.fn()}
          commit={vi.fn()}
          contrastWarning={null}
          onFieldChange={onFieldChange}
          onColorChange={vi.fn()}
        />
      </TooltipProvider>,
    );

    const waxBtn = screen.getByRole('button', { name: 'شمعي' });
    fireEvent.click(waxBtn);
    expect(onFieldChange).toHaveBeenCalledWith('shape', 'wax');

    const confettiBtn = screen.getByRole('button', { name: 'قصاصات' });
    fireEvent.click(confettiBtn);
    expect(onFieldChange).toHaveBeenCalledWith('decor', 'confetti');

    expect(screen.getByLabelText('الأيقونة')).toBeInTheDocument();
  });
});
