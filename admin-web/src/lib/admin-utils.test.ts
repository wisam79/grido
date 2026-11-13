import { describe, expect, it } from 'vitest';
import {
  buildBatchCustomKey,
  buildBatchKeysCsv,
  buildCustomKey,
  buildUsersCsv,
  computeAdminUserMetrics,
  csvCell,
  fetchAllPaged,
  parsePositiveInt,
  parseStoredLimit,
  randomKeySuffix,
  resolveAiCostUsd,
  resolveExpiresAtInput,
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

describe('Batch 1 P0 admin-utils — تحقق الجلسة والمفاتيح والصفحات والتكلفة', () => {
  it('buildBatchCustomKey يضيف لاحقة عشوائية + فهرس فريد لمنع التصادم بين الدفعات', () => {
    const k1 = buildBatchCustomKey('vip', 'pro', 0, '4821');
    const k2 = buildBatchCustomKey('vip', 'pro', 1, '4821');
    expect(k1).toBe('VIP-PRO-4821-1');
    expect(k2).toBe('VIP-PRO-4821-2');
    expect(buildBatchCustomKey('   ', 'pro', 0)).toBeUndefined();

    const randA = buildBatchCustomKey('vip', 'pro', 0);
    expect(randA).toMatch(/^VIP-PRO-\d{4}-1$/);
  });

  it('parsePositiveInt يرفض NaN والفراغ والصفر والسالب والقيم غير الرقمية', () => {
    expect(parsePositiveInt('')).toBeNull();
    expect(parsePositiveInt('   ')).toBeNull();
    expect(parsePositiveInt('0')).toBeNull();
    expect(parsePositiveInt('-5')).toBeNull();
    expect(parsePositiveInt('12abc')).toBeNull();
    expect(parsePositiveInt(' 15 ')).toBe(15);
  });

  it('resolveExpiresAtInput يمسح التاريخ إلى null ويرفض الصيغ التالفة', () => {
    expect(resolveExpiresAtInput('')).toEqual({ valid: true, value: null });
    expect(resolveExpiresAtInput('   ')).toEqual({ valid: true, value: null });
    expect(resolveExpiresAtInput('not-a-date')).toEqual({ valid: false });
    const ok = resolveExpiresAtInput('2027-05-01');
    expect(ok.valid).toBe(true);
    if (ok.valid) expect(ok.value).toBe(new Date('2027-05-01').toISOString());
  });

  it('resolveAiCostUsd يحفظ التكلفة الصريحة 0 ولا يحوّلها إلى 0.012', () => {
    expect(resolveAiCostUsd(0)).toBe(0);
    expect(resolveAiCostUsd(0.025)).toBe(0.025);
    expect(resolveAiCostUsd(null)).toBe(0.012);
    expect(resolveAiCostUsd(undefined)).toBe(0.012);
    expect(resolveAiCostUsd(Number.NaN)).toBe(0.012);
  });

  it('fetchAllPaged يجمع أكثر من صفحة كاملة ولا يتوقف عند 1000 صف', async () => {
    const dataset = Array.from({ length: 2050 }, (_, idx) => ({ id: idx + 1 }));
    const res = await fetchAllPaged(async (from, to) => ({
      data: dataset.slice(from, to + 1),
      error: null,
    }));
    expect(res.error).toBeNull();
    expect(res.truncated).toBe(false);
    expect(res.data).toHaveLength(2050);

    const errRes = await fetchAllPaged(async () => ({
      data: null,
      error: { message: 'permission denied' },
    }));
    expect(errRes.error?.message).toBe('permission denied');
    expect(errRes.data).toHaveLength(0);
  });

  it('computeAdminUserMetrics يحسب نسب الاشتراكات بمقام متسق ويعيد 0 عند الفراغ', () => {
    const empty = computeAdminUserMetrics([], 0, []);
    expect(empty.proPct).toBe(0);
    expect(empty.entPct).toBe(0);
    expect(empty.freePct).toBe(0);

    const sampled = computeAdminUserMetrics(
      [
        { plan: 'pro', status: 'active', expires_at: null },
        { plan: 'trial', status: 'active', expires_at: null },
      ],
      100,
      [{ cost_usd: 0 }, { cost_usd: 0.05 }],
    );
    expect(sampled.sampleTruncated).toBe(true);
    // المقام عند البتر هو حجم العينة (2) لا 100
    expect(sampled.proPct).toBe(50);
    expect(sampled.entPct).toBe(0);
    expect(sampled.freePct).toBe(0);
    expect(sampled.windowAiCost).toBeCloseTo(0.05, 6);
  });
});
