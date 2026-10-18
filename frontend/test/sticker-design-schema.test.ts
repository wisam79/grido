import { describe, expect, it } from 'vitest';
import {
  migrateStickerParams,
  stripDangerousKeys,
} from '@/features/stickers/lib/sticker-design/schema';
import { buildDefaultStickerParams } from '@/features/stickers/lib/sticker-design/build-svg';
import { ALL_STICKER_TEMPLATES } from '@/features/stickers/templates';
import type { StickerParams } from '@/features/stickers';

describe('sticker-design/schema migration', () => {
  const template =
    ALL_STICKER_TEMPLATES.find((item) => item.id === 'seal_gold_guarantee') ??
    ALL_STICKER_TEMPLATES[0];

  it('upgrades a v1 parameter set (no version key) to v2 keeping design identity', () => {
    const v1: StickerParams = {
      ...buildDefaultStickerParams(template),
      fields: { ...buildDefaultStickerParams(template).fields, topText: 'خصم اليوم فقط' },
      primaryColor: '#1a2b3c',
      fontScale: 1.1,
    };
    const migrated = migrateStickerParams(v1, template);
    expect(migrated.version).toBe(2);
    expect(migrated.fields.topText).toBe('خصم اليوم فقط');
    expect(migrated.primaryColor).toBe('#1a2b3c');
    expect(migrated.fontScale).toBe(1.1);
  });

  it('salvages the design when one value is out of range instead of resetting everything', () => {
    const dirty: StickerParams = {
      ...buildDefaultStickerParams(template),
      fields: { ...buildDefaultStickerParams(template).fields, topText: 'سليم' },
      fontWeightless: 'x',
    } as StickerParams;
    const withBadSize: Record<string, unknown> = {
      ...dirty,
      sizeMm: { width: -5, height: 10 },
    };
    const migrated = migrateStickerParams(withBadSize, template);
    expect(migrated.fields.topText).toBe('سليم');
    expect(migrated.primaryColor).toBe(template.defaultColors.primary);
    expect(migrated.sizeMm).toBeUndefined();
  });

  it('drops unparsable overrides and clamps out-of-range numbers inside restorable ones', () => {
    const poisoned = {
      ...buildDefaultStickerParams(template),
      overrides: {
        topText: { dxMm: 'x', dyMm: 0, scale: 1, rotationDeg: 0, visible: true },
        priceTag: { dxMm: 10, dyMm: 20, scale: 9, rotationDeg: 0, visible: true },
      },
    };
    const migrated = migrateStickerParams(poisoned, template);
    expect(migrated.overrides).toBeDefined();
    expect(migrated.overrides?.topText).toBeUndefined();
    expect(migrated.overrides?.priceTag).toBeDefined();
    expect(migrated.overrides?.priceTag.scale).toBe(5);
  });

  it('coerces broken colors and unknown finish to template defaults', () => {
    const dirty = {
      ...buildDefaultStickerParams(template),
      primaryColor: 'javascript:alert(1)',
      finish: 'neon-laser',
    };
    const migrated = migrateStickerParams(dirty, template);
    expect(migrated.finish).toBe('standard');
    expect(migrated.primaryColor).toBe(template.defaultColors.primary);
  });

  it('falls back to template defaults for garbage input', () => {
    const migrated = migrateStickerParams(null, template);
    expect(migrated).toEqual(buildDefaultStickerParams(template));
  });

  it('strips prototype-pollution keys deeply before zod record assignment', () => {
    const item = JSON.parse(
      `{"name":"x","__proto__":{"evil":1},"params":{"fields":{"__proto__":{"a":1},"title":"ok"},"overrides":{"__proto__":{"x":1}}}}`,
    );
    const clean = stripDangerousKeys(item) as Record<string, unknown>;
    expect(clean).not.toHaveProperty('__proto__');
    const params = clean.params as Record<string, unknown>;
    expect(params.fields).not.toHaveProperty('__proto__');
    expect(params.fields).toHaveProperty('title', 'ok');
    expect(params.overrides).not.toHaveProperty('__proto__');
    expect(Object.getOwnPropertyNames(params.fields)).toEqual(['title']);
  });
});
