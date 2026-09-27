import { describe, it, expect } from 'vitest';
import {
  applyRowToParams,
  buildDatasetForTest,
  VDP_MAX_ROWS,
} from '@/features/stickers/lib/vdp-parser';
import type { StickerParams } from '@/features/stickers';

const baseParams = (): StickerParams => ({
  fields: { title: 'افتراضي', subtitle: 'ثابت' },
  primaryColor: '#111111',
  secondaryColor: '#222222',
  backgroundColor: '#ffffff',
  isTransparent: false,
  fontFamily: 'Cairo',
});

describe('vdp-parser dataset building', () => {
  it('uses the first row as headers and maps subsequent rows', () => {
    const ds = buildDatasetForTest([
      ['الاسم', 'الوظيفة'],
      ['أحمد', 'مدير'],
      ['سارة', 'مهندسة'],
    ]);

    expect(ds.columns).toEqual(['الاسم', 'الوظيفة']);
    expect(ds.rows).toHaveLength(2);
    expect(ds.rows[0]).toEqual({ الاسم: 'أحمد', الوظيفة: 'مدير' });
    expect(ds.rows[1]['الاسم']).toBe('سارة');
  });

  it('names unnamed columns عمود N', () => {
    const ds = buildDatasetForTest([
      ['', 'القيمة'],
      ['x', '1'],
    ]);
    expect(ds.columns[1]).toBe('القيمة');
    expect(ds.rows[0]['القيمة']).toBe('1');
  });

  it('trims cell values', () => {
    const ds = buildDatasetForTest([['A'], ['  hello  ']]);
    expect(ds.rows[0]['A']).toBe('hello');
  });

  it('skips fully empty rows', () => {
    const ds = buildDatasetForTest([
      ['A', 'B'],
      ['x', 'y'],
      ['', ''],
      ['z', 'w'],
    ]);
    expect(ds.rows).toHaveLength(2);
  });
});

describe('vdp-parser row application', () => {
  it('fills mapped fields and leaves unmapped fields at base values', () => {
    const base = baseParams();
    const row = { الاسم: 'أحمد', الوظيفة: 'مدير' };
    const result = applyRowToParams(base, { title: 'الاسم' }, row);

    expect(result.fields.title).toBe('أحمد');
    expect(result.fields.subtitle).toBe('ثابت'); // غير مرتبط يبقى
    expect(result.primaryColor).toBe(base.primaryColor);
  });

  it('ignores mapping to a column missing from the row', () => {
    const base = baseParams();
    const result = applyRowToParams(base, { title: 'غير_موجود' }, { الاسم: 'أحمد' });
    expect(result.fields.title).toBe('افتراضي');
  });

  it('does not mutate the base params', () => {
    const base = baseParams();
    const snapshot = { ...base.fields };
    applyRowToParams(base, { title: 'الاسم' }, { الاسم: 'أحمد' });
    expect(base.fields).toEqual(snapshot);
  });

  it('respects the max rows cap constant', () => {
    expect(VDP_MAX_ROWS).toBeGreaterThan(0);
    expect(VDP_MAX_ROWS).toBeLessThanOrEqual(1000);
  });
});
