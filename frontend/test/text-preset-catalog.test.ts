import { describe, expect, it } from 'vitest';

import {
  INSERT_TEXT_PRESETS,
  TEXT_INSERT_GROUPS,
  TEXT_PRESETS,
  textPresetPreviewSize,
  type TextPresetType,
} from '../src/lib/templates';

describe('text preset catalog', () => {
  it('exposes the professional insert set in a fixed order', () => {
    expect(INSERT_TEXT_PRESETS.map((item) => item.id)).toEqual([
      'heading',
      'subheading',
      'body',
      'caption',
      'studio-date',
      'photographer-tag',
      'watermark',
      'badge',
      'stamp-circle',
    ]);
  });

  it('keeps badge and stamp as studio blocks and removed gimmicks out of the catalog', () => {
    expect(TEXT_PRESETS.badge.group).toBe('studio');
    expect(TEXT_PRESETS['stamp-circle'].group).toBe('studio');

    const ids = new Set(INSERT_TEXT_PRESETS.map((item) => item.id));
    for (const removed of [
      'gold-luxury',
      'neon-glow',
      '3d-title',
      'outline-modern',
      'congrats',
      'sale-offer',
      'certificate',
      'special-price',
    ]) {
      expect(ids.has(removed as TextPresetType)).toBe(false);
      expect(removed in TEXT_PRESETS).toBe(false);
    }
  });

  it('provides complete display metadata for every insert item', () => {
    for (const item of INSERT_TEXT_PRESETS) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(TEXT_INSERT_GROUPS.map((group) => group.id)).toContain(item.group);
      expect(item.config.lineHeight).toBeGreaterThan(0);
      expect(item.config.fontFamily.trim().length).toBeGreaterThan(0);
      expect(item.config.getText().trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps the insert groups in typography-then-studio order', () => {
    expect(TEXT_INSERT_GROUPS.map((group) => group.id)).toEqual(['typography', 'studio']);
    expect(TEXT_INSERT_GROUPS.map((group) => group.label)).toEqual([
      'أنماط النص',
      'توثيق الاستوديو',
    ]);
  });

  it('previews typography labels with a compressed but ordered size hierarchy', () => {
    const sizes = (['heading', 'subheading', 'body', 'caption'] as const).map((id) =>
      textPresetPreviewSize(TEXT_PRESETS[id]),
    );
    expect(sizes).toEqual([20, 15, 13, 12]);
    expect(textPresetPreviewSize({ fontSize: 400 })).toBe(20);
    expect(textPresetPreviewSize({ fontSize: 4 })).toBe(12);
  });
});
