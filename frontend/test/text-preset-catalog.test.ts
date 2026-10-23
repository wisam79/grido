import { describe, expect, it } from 'vitest';

import {
  INSERT_TEXT_PRESETS,
  TEXT_INSERT_GROUPS,
  TEXT_PRESETS,
  type TextPresetType,
} from '../src/lib/templates';

describe('text preset catalog', () => {
  it('exposes only the professional insert set in a fixed order', () => {
    expect(INSERT_TEXT_PRESETS.map((item) => item.id)).toEqual([
      'heading',
      'subheading',
      'body',
      'caption',
      'studio-date',
      'photographer-tag',
      'watermark',
    ]);
  });

  it('keeps decorative styles and removed gimmicks out of the insert catalog', () => {
    const ids = new Set(INSERT_TEXT_PRESETS.map((item) => item.id));

    expect(ids.has('badge')).toBe(false);
    expect(ids.has('stamp-circle')).toBe(false);
    expect(TEXT_PRESETS.badge).toBeDefined();
    expect(TEXT_PRESETS['stamp-circle']).toBeDefined();

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
});
