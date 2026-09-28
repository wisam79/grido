import { describe, it, expect, vi } from 'vitest';
import {
  applyRowToParams,
  buildDatasetForTest,
  parseVdpFile,
  VDP_MAX_FILE_BYTES,
  VDP_MAX_ROWS,
  VDP_PARSE_ROW_LIMIT,
} from '@/features/stickers/lib/vdp-parser';
import type { StickerParams } from '@/features/stickers';

// 🛡️ مكتبة xlsx من npm تحمل ثغرة تلوّث نموذج أولي بلا إصلاح متاح من npm
// (GHSA-4r6h-8v6p-xvw6) و ReDoS (GHSA-5pgg-2g8v-p4x9). نُثبّت هنا أن مسار
// التفكيك مقيَّد (صفوف + ميزات معطّلة) فلا يُفكّك ملف ضخم كاملاً في الذاكرة.
const xlsxMock = vi.hoisted(() => ({ read: vi.fn(), sheetToJson: vi.fn() }));
vi.mock('xlsx', () => ({
  read: xlsxMock.read,
  utils: { sheet_to_json: xlsxMock.sheetToJson },
}));

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
    expect(VDP_PARSE_ROW_LIMIT).toBe(VDP_MAX_ROWS + 1);
  });

  it('neutralizes dangerous column names (prototype pollution)', () => {
    const ds = buildDatasetForTest([
      ['__proto__', 'constructor', 'prototype', 'الاسم'],
      ['x', 'y', 'z', 'أحمد'],
    ]);

    const row = ds.rows[0];
    expect(Object.prototype.hasOwnProperty.call(row, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(row)).toBe(Object.prototype);
    expect(row['الاسم']).toBe('أحمد');
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    // العناوين الخطيرة تُعامل كعناوين بلا اسم
    expect(ds.columns.some((c) => c === '__proto__' || c === 'constructor')).toBe(false);
  });
});

describe('vdp-parser file guards', () => {
  it('rejects oversized files before reading them', async () => {
    const file = new File(['a,b'], 'huge.xlsx');
    Object.defineProperty(file, 'size', { value: VDP_MAX_FILE_BYTES + 1 });

    await expect(parseVdpFile(file)).rejects.toThrow(/كبير جداً/);
  });

  it('rejects unsupported extensions', async () => {
    const file = new File(['x'], 'data.pdf');
    await expect(parseVdpFile(file)).rejects.toThrow(/صيغة غير مدعومة/);
  });

  it('bounds the Excel parse itself (sheetRows + disabled features)', async () => {
    xlsxMock.read.mockReturnValue({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } });
    xlsxMock.sheetToJson.mockReturnValue([
      ['الاسم', 'الوظيفة'],
      ['أحمد', 'مدير'],
    ]);

    const file = new File(['dummy-xlsx-bytes'], 'data.xlsx');
    const ds = await parseVdpFile(file);

    expect(ds.rows).toHaveLength(1);
    expect(ds.rows[0]['الاسم']).toBe('أحمد');
    expect(xlsxMock.read).toHaveBeenCalledTimes(1);
    expect(xlsxMock.read.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        type: 'array',
        sheetRows: VDP_PARSE_ROW_LIMIT,
        cellFormula: false,
        cellHTML: false,
        cellStyles: false,
        dense: true,
      }),
    );
  });
});
