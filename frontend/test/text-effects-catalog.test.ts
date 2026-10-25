import { describe, expect, it } from 'vitest';

import {
  clampFontSize,
  nextFontSizeStep,
} from '../src/components/editor/properties/panels/text/font-size-utils';
import {
  TEXT_PILL_RADIUS,
  TEXT_SHADOW_PRESETS,
  hasTextShadow,
  matchTextCurvePreset,
  matchTextShadowPreset,
  resolveTextBackgroundMode,
  textShadowPreviewCss,
} from '../src/lib/templates';

describe('text effects catalog', () => {
  it('matches the active shadow preset from element values', () => {
    expect(matchTextShadowPreset({})).toBe('none');
    expect(hasTextShadow({ shadowBlur: 0, shadowOpacity: 0 })).toBe(false);

    for (const preset of TEXT_SHADOW_PRESETS.filter((p) => p.id !== 'none')) {
      expect(
        matchTextShadowPreset({
          shadowBlur: preset.blur,
          shadowOffsetX: preset.ox,
          shadowOffsetY: preset.oy,
          shadowOpacity: preset.opacity,
        }),
      ).toBe(preset.id);
    }

    // قيم معدّلة يدوياً لا تطابق أي خلية
    expect(
      matchTextShadowPreset({
        shadowBlur: 7,
        shadowOffsetX: 1,
        shadowOffsetY: 9,
        shadowOpacity: 1,
      }),
    ).toBeNull();
  });

  it('resolves background mode from color and radius', () => {
    expect(resolveTextBackgroundMode({})).toBe('none');
    expect(resolveTextBackgroundMode({ textBgColor: 'transparent' })).toBe('none');
    expect(resolveTextBackgroundMode({ textBgColor: '#fff', textBgRadius: 8 })).toBe('box');
    expect(resolveTextBackgroundMode({ textBgColor: '#fff', textBgRadius: TEXT_PILL_RADIUS })).toBe(
      'pill',
    );
  });

  it('matches curve presets and derives CSS previews from the same values', () => {
    expect(matchTextCurvePreset(undefined)).toBe('straight');
    expect(matchTextCurvePreset(60)).toBe('arc');
    expect(matchTextCurvePreset(-60)).toBe('dip');
    expect(matchTextCurvePreset(35)).toBeNull();

    expect(textShadowPreviewCss(TEXT_SHADOW_PRESETS[0])).toBeUndefined();
    const neon = TEXT_SHADOW_PRESETS.find((p) => p.id === 'neon')!;
    expect(textShadowPreviewCss(neon)).toBe('0px 0px 8.8px #38bdf8e6');
  });
});

describe('font size field steps', () => {
  it('jumps between typographic steps and clamps typed values', () => {
    expect(nextFontSizeStep(32, 1)).toBe(36);
    expect(nextFontSizeStep(33, 1)).toBe(36);
    expect(nextFontSizeStep(33, -1)).toBe(32);
    expect(nextFontSizeStep(8, -1)).toBe(7);
    expect(nextFontSizeStep(300, 1)).toBe(310);
    expect(clampFontSize(2)).toBe(6);
    expect(clampFontSize(9999)).toBe(500);
    expect(clampFontSize(17.6)).toBe(18);
  });
});
