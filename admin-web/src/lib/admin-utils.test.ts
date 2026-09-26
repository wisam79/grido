import { describe, expect, it } from 'vitest';
import {
  buildBatchKeysCsv,
  buildCustomKey,
  buildUsersCsv,
  csvCell,
  parseStoredLimit,
  randomKeySuffix,
} from './admin-utils';

describe('csvCell — تحصين ضد CSV Formula Injection', () => {
  it('يحيّد كل بادئة صيغة خطرة بعلامة اقتباس مفردة', () => {
    for (const dangerous of ['=cmd|calc', '+1+1', '-2+3', '@SUM(A1)', '\ttab', '\rcr']) {
      const result = csvCell(dangerous);
      expect(result.startsWith('"\'')).toBe(true);
      expect(result.endsWith('"')).toBe(true);
    }
  });

  it('يغلّف القيم العادية بعلامات تنصيص دون تحييد', () => {
    expect(csvCell('hello')).toBe('"hello"');
    expect(csvCell('a,b')).toBe('"a,b"');
  });

  it('يهرّب الاقتباسات المزدوجة بمضاعفتها', () => {
    expect(csvCell('a"b')).toBe('"a""b"');
  });

  it('يحوّل null وundefined إلى خلية فارغة', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('يحوّل الأرقام إلى نص مغلّف', () => {
    expect(csvCell(42)).toBe('"42"');
  });
});

describe('parseStoredLimit — قراءة حدّ محفوظ بأمان', () => {
  it('يرجع الرقم الصالح كما هو', () => {
    expect(parseStoredLimit('50', 5)).toBe(50);
    expect(parseStoredLimit('0', 5)).toBe(0);
  });

  it('يرجع القيمة الاحتياطية عند التلف أو الغياب', () => {
    expect(parseStoredLimit(null, 7)).toBe(7);
    expect(parseStoredLimit('', 7)).toBe(7);
    expect(parseStoredLimit('abc', 7)).toBe(7);
    expect(parseStoredLimit('-3', 7)).toBe(7);
  });
});

describe('randomKeySuffix — CSPRNG', () => {
  it('ينتج دائماً أربعة أرقام ضمن المدى [1000, 9999]', () => {
    for (let i = 0; i < 200; i++) {
      const suffix = randomKeySuffix();
      expect(suffix).toMatch(/^\d{4}$/);
      const value = Number(suffix);
      expect(value).toBeGreaterThanOrEqual(1000);
      expect(value).toBeLessThanOrEqual(9999);
    }
  });
});

describe('buildUsersCsv', () => {
  it('يبدأ بعلامة BOM ويحوي عمود رأس واحد', () => {
    const csv = buildUsersCsv([]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.trim().split('\n')).toHaveLength(1);
  });

  it('يحصّن حقول المستخدم ضد الصيغ ويغلّف كل خلية', () => {
    const csv = buildUsersCsv([
      { name: '=cmd|calc', email: 'a@b.com', plan: 'pro', status: 'active', expires_at: null, license_key: null, created_at: null },
    ]);
    expect(csv).toContain('"\'=cmd|calc"');
    expect(csv).toContain('"a@b.com"');
    // قيمة فارغة تُعرَض كشرطة لا خلية فارغة
    expect(csv).toContain('"—"');
  });
});

describe('buildBatchKeysCsv', () => {
  it('يولّد صفاً لكل مفتاح مع الباقة كبيرة وBOM', () => {
    const csv = buildBatchKeysCsv(['K-1', 'K-2'], 'pro');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"K-1","PRO"');
    expect(csv).toContain('"K-2","PRO"');
  });
});

describe('buildCustomKey', () => {
  it('يبني مفتاحاً بادئته كبيرة والباقة كبيرة', () => {
    expect(buildCustomKey('grido', 'pro', '1234')).toBe('GRIDO-PRO-1234');
  });

  it('يقصّ الفراغات في البادئة', () => {
    expect(buildCustomKey('  gx  ', 'enterprise', '9999')).toBe('GX-ENTERPRISE-9999');
  });

  it('يرجع undefined عند بادئة فارغة (مسار التوليد الخادمي)', () => {
    expect(buildCustomKey('', 'pro', '1234')).toBeUndefined();
    expect(buildCustomKey('   ', 'pro', '1234')).toBeUndefined();
  });
});
