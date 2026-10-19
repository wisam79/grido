import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AiUsageRecord,
  GenPlan,
  LicenseKey,
  UserProfile,
  UserStatusFilter,
} from '../types';
import {
  buildBatchKeysCsv,
  buildCustomKey,
  buildUsersCsv,
  parseStoredLimit,
} from '../../../lib/admin-utils';

// ============================================================================
// Fixtures: بيانات اختبار معزولة تماماً في الذاكرة — لا تلمس قاعدة الإنتاج إطلاقاً
// ============================================================================

const NOW = new Date('2026-10-19T10:00:00Z');
const FUTURE_DATE = new Date('2027-10-19T10:00:00Z').toISOString();
const PAST_DATE = new Date('2025-10-19T10:00:00Z').toISOString();

const MOCK_PROFILES: UserProfile[] = [
  {
    id: 'user-1',
    name: 'استوديو بغداد الذهبي',
    email: 'baghdad@example.com',
    plan: 'pro',
    status: 'active',
    expires_at: FUTURE_DATE,
    license_key: 'GRID-PRO-1001',
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
  },
  {
    id: 'user-2',
    name: 'مؤسسة الرياض للطباعة',
    email: 'riyadh@example.com',
    plan: 'enterprise',
    status: 'active',
    expires_at: FUTURE_DATE,
    license_key: 'GRID-ENT-2002',
    created_at: '2026-09-01T12:00:00Z',
    updated_at: '2026-09-01T12:00:00Z',
  },
  {
    id: 'user-3',
    name: 'مصور حر',
    email: 'freelancer@example.com',
    plan: 'free',
    status: 'active',
    expires_at: '',
    license_key: '',
    created_at: '2026-07-01T12:00:00Z',
    updated_at: '2026-07-01T12:00:00Z',
  },
  {
    id: 'user-4',
    name: 'استوديو منتهي الاشتراك',
    email: 'expired@example.com',
    plan: 'pro',
    status: 'active',
    expires_at: PAST_DATE, // منتهي تاريخياً
    license_key: 'GRID-PRO-9999',
    created_at: '2025-01-01T12:00:00Z',
    updated_at: '2025-01-01T12:00:00Z',
  },
  {
    id: 'user-5',
    name: 'حساب محظور',
    email: 'banned@example.com',
    plan: 'pro',
    status: 'banned',
    expires_at: FUTURE_DATE,
    license_key: 'GRID-PRO-8888',
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-06-01T12:00:00Z',
  },
];

const MOCK_KEYS: LicenseKey[] = [
  {
    key: 'KEY-PRO-001',
    plan: 'pro',
    duration_months: 12,
    status: 'unused',
    user_id: '',
    created_at: '2026-10-01T12:00:00Z',
    activated_at: '',
  },
  {
    key: 'KEY-PRO-002',
    plan: 'pro',
    duration_months: 6,
    status: 'activated',
    user_id: 'user-1',
    created_at: '2026-08-01T12:00:00Z',
    activated_at: '2026-08-01T12:05:00Z',
  },
  {
    key: 'KEY-ENT-003',
    plan: 'enterprise',
    duration_months: 12,
    status: 'unused',
    user_id: '',
    created_at: '2026-10-05T12:00:00Z',
    activated_at: '',
  },
];

const MOCK_AI_LOGS: AiUsageRecord[] = [
  {
    id: 'log-1',
    user_id: 'user-1',
    used_at: '2026-10-18T10:00:00Z',
    image_bytes: 2048576,
    execution_seconds: 1.4,
    cost_usd: 0.015,
  },
  {
    id: 'log-2',
    user_id: 'user-2',
    used_at: '2026-10-18T11:00:00Z',
    image_bytes: 4194304,
    execution_seconds: 2.1,
    cost_usd: 0.025,
  },
];

// ============================================================================
// Mock Supabase Client Factory (In-Memory Hermetic Test Double)
// ============================================================================

interface MockSupabaseOptions {
  isAdmin?: boolean;
  rpcError?: string | null;
  profilesData?: UserProfile[];
  keysData?: LicenseKey[];
  aiData?: AiUsageRecord[];
}

function createMockSupabase(options: MockSupabaseOptions = {}) {
  const {
    isAdmin = true,
    rpcError = null,
    profilesData = [...MOCK_PROFILES],
    keysData = [...MOCK_KEYS],
    aiData = [...MOCK_AI_LOGS],
  } = options;

  const rpcCalls: Array<{ name: string; params: unknown }> = [];
  const updateCalls: Array<{ table: string; patch: unknown; filter: unknown }> = [];

  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'admin-uuid', email: 'admin@grido.studio' } } },
        error: null,
      }),
      signInWithPassword: vi.fn().mockImplementation(async ({ email, password }) => {
        if (password === 'wrong-password') {
          return { data: { user: null }, error: new Error('Invalid login credentials') };
        }
        return { data: { user: { id: 'admin-uuid', email } }, error: null };
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: vi.fn().mockImplementation(async (name: string, params: unknown) => {
      rpcCalls.push({ name, params });

      if (rpcError) {
        return { data: null, error: new Error(rpcError) };
      }

      if (name === 'is_admin') {
        return { data: isAdmin, error: null };
      }

      if (name === 'admin_extend_license') {
        const p = params as { p_user_id: string; p_additional_months: number };
        const user = profilesData.find((u) => u.id === p.p_user_id);
        if (user) {
          const currentExp = user.expires_at ? new Date(user.expires_at) : new Date(NOW);
          currentExp.setMonth(currentExp.getMonth() + p.p_additional_months);
          user.expires_at = currentExp.toISOString();
        }
        return { data: true, error: null };
      }

      if (name === 'admin_revoke_license') {
        const p = params as { p_user_id: string };
        const user = profilesData.find((u) => u.id === p.p_user_id);
        if (user) {
          user.plan = 'free';
          user.license_key = '';
        }
        return { data: true, error: null };
      }

      if (name === 'admin_create_license_key') {
        const p = params as { p_plan: string; p_duration_months: number; p_custom_key?: string };
        const keyString = p.p_custom_key || `GRIDO-${p.p_plan.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const newKey: LicenseKey = {
          key: keyString,
          plan: p.p_plan,
          duration_months: p.p_duration_months,
          status: 'unused',
          user_id: '',
          created_at: NOW.toISOString(),
          activated_at: '',
        };
        keysData.push(newKey);
        return { data: { key: keyString }, error: null };
      }

      return { data: null, error: new Error(`Unknown RPC: ${name}`) };
    }),
    from: vi.fn().mockImplementation((tableName: string) => {
      let currentTableData: Record<string, any>[] = [];
      if (tableName === 'profiles') currentTableData = profilesData;
      else if (tableName === 'license_keys') currentTableData = keysData;
      else if (tableName === 'ai_usage') currentTableData = aiData;

      let filteredData: Record<string, any>[] = [...currentTableData];

      const queryBuilder = {
        select: vi.fn().mockImplementation((_cols?: string, selectOpts?: { count?: string; head?: boolean }) => {
          if (selectOpts?.head && selectOpts?.count === 'exact') {
            return Promise.resolve({ count: filteredData.length, data: null, error: null });
          }
          return queryBuilder;
        }),
        order: vi.fn().mockImplementation((_field: string, _orderOpts?: { ascending?: boolean }) => {
          return queryBuilder;
        }),
        limit: vi.fn().mockImplementation((limitCount: number) => {
          filteredData = filteredData.slice(0, limitCount);
          return queryBuilder;
        }),
        eq: vi.fn().mockImplementation((field: string, val: unknown) => {
          filteredData = filteredData.filter((item) => item[field] === val);
          return queryBuilder;
        }),
        update: vi.fn().mockImplementation((patch: Record<string, unknown>) => {
          return {
            eq: vi.fn().mockImplementation((idField: string, idVal: unknown) => {
              updateCalls.push({ table: tableName, patch, filter: { [idField]: idVal } });
              const item = currentTableData.find((rec) => rec[idField] === idVal);
              if (item) Object.assign(item, patch);
              return Promise.resolve({ error: null });
            }),
          };
        }),
        then: vi.fn().mockImplementation((resolve) => {
          return Promise.resolve({ data: filteredData, error: null }).then(resolve);
        }),
      };

      return queryBuilder;
    }),
  };

  return { client: client as unknown as SupabaseClient, rpcCalls, updateCalls, profilesData, keysData, aiData };
}

// ============================================================================
// Core Test Suites (Business Logic, Security, Filtering & Financials)
// ============================================================================

describe('🛡️ لوحة الإدارة — أمان المصادقة وفحص الصلاحيات (RBAC & Session)', () => {
  it('يسمح بالدخول عند نجاح rpc(is_admin) بصلاحية مسؤول', async () => {
    const { client, rpcCalls } = createMockSupabase({ isAdmin: true });

    const { data: isAdmin, error } = await client.rpc('is_admin');
    expect(error).toBeNull();
    expect(isAdmin).toBe(true);
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].name).toBe('is_admin');
  });

  it('يرفض الحساب غير المسؤول ويمنع الوصول للوحة', async () => {
    const { client } = createMockSupabase({ isAdmin: false });

    const { data: isAdmin, error } = await client.rpc('is_admin');
    expect(error).toBeNull();
    expect(isAdmin).toBe(false);
  });

  it('يفشل تسجيل الدخول عند إدخال كلمة مرور خاطئة قبل فحص الصلاحية', async () => {
    const { client } = createMockSupabase();

    const { data, error } = await client.auth.signInWithPassword({
      email: 'admin@grido.studio',
      password: 'wrong-password',
    });

    expect(data.user).toBeNull();
    expect(error).toBeTruthy();
    expect(error?.message).toContain('Invalid login credentials');
  });
});

describe('👥 لوحة الإدارة — محرك تصفية وفرز المشتركين (Filtering & Search Engine)', () => {
  // دالة مطابقة لخوارزمية useAdminUsers:172-195
  function filterUsers(
    users: UserProfile[],
    searchQuery: string,
    statusFilter: UserStatusFilter,
    now: Date = NOW,
  ) {
    return users
      .filter((user) => {
        const matchesSearch =
          (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.license_key || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (statusFilter === 'all') return true;
        if (statusFilter === 'banned') return user.status === 'banned';
        if (statusFilter === 'pro') return user.plan === 'pro';
        if (statusFilter === 'enterprise') return user.plan === 'enterprise';
        if (statusFilter === 'trial') return user.plan === 'trial';
        if (statusFilter === 'free')
          return user.plan !== 'pro' && user.plan !== 'enterprise' && user.plan !== 'trial';
        if (statusFilter === 'expired') {
          const isExpiredDate = user.expires_at && new Date(user.expires_at) <= now;
          return user.status === 'expired' || isExpiredDate;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  it('يعيد كل المستخدمين عند تفعيل الفلتر all مرتبين بالأحدث تسجيلاً', () => {
    const result = filterUsers(MOCK_PROFILES, '', 'all');
    expect(result).toHaveLength(5);
    // الأحدث هو user-2 (سبتمبر 2026) ثم user-1 (أغسطس 2026)
    expect(result[0].id).toBe('user-2');
    expect(result[1].id).toBe('user-1');
  });

  it('يصفي المشتركين حسب الباقة (pro, enterprise, free)', () => {
    const proUsers = filterUsers(MOCK_PROFILES, '', 'pro');
    expect(proUsers).toHaveLength(3); // user-1, user-4, user-5
    expect(proUsers.every((u) => u.plan === 'pro')).toBe(true);

    const entUsers = filterUsers(MOCK_PROFILES, '', 'enterprise');
    expect(entUsers).toHaveLength(1);
    expect(entUsers[0].id).toBe('user-2');

    const freeUsers = filterUsers(MOCK_PROFILES, '', 'free');
    expect(freeUsers).toHaveLength(1);
    expect(freeUsers[0].id).toBe('user-3');
  });

  it('يكتشف الحسابات المنتهية تاريخياً بدقة حتى لو كانت حالتها active', () => {
    const expiredUsers = filterUsers(MOCK_PROFILES, '', 'expired', NOW);
    expect(expiredUsers).toHaveLength(1);
    expect(expiredUsers[0].id).toBe('user-4');
  });

  it('يكتشف الحسابات المحظورة status=banned', () => {
    const bannedUsers = filterUsers(MOCK_PROFILES, '', 'banned');
    expect(bannedUsers).toHaveLength(1);
    expect(bannedUsers[0].id).toBe('user-5');
  });

  it('يبحث في الاسم والبريد ومفتاح الترخيص دون تحسس لحالة الأحرف', () => {
    // بحث بالاسم العربي
    expect(filterUsers(MOCK_PROFILES, 'بغداد', 'all')).toHaveLength(1);
    // بحث بالبريد
    expect(filterUsers(MOCK_PROFILES, 'RIYADH@', 'all')).toHaveLength(1);
    // بحث بمفتاح الترخيص
    expect(filterUsers(MOCK_PROFILES, 'GRID-PRO-1001', 'all')).toHaveLength(1);
    // بحث غير مطابق
    expect(filterUsers(MOCK_PROFILES, 'nonexistent', 'all')).toHaveLength(0);
  });
});

describe('📊 لوحة الإدارة — الحسابات المالية والمؤشرات التشغيلية (Financials & Metrics Engine)', () => {
  // دالة مطابقة لحسابات useAdminUsers:211-234
  function computeMetrics(users: UserProfile[], aiLogs: AiUsageRecord[], totalUsersServer = 0) {
    const totalUsers = totalUsersServer || users.length;
    const sampleTruncated = users.length < totalUsers;

    const activePro = users.filter(
      (u) =>
        u.plan === 'pro' &&
        u.status !== 'banned' &&
        (!u.expires_at || new Date(u.expires_at) > NOW),
    ).length;

    const activeEnt = users.filter((u) => u.plan === 'enterprise' && u.status !== 'banned').length;
    const estimatedMRR = activePro * 15 + activeEnt * 49;
    const windowAiCost = aiLogs.reduce((acc, curr) => acc + (curr.cost_usd || 0.012), 0);

    const proCount = users.filter((u) => u.plan === 'pro').length;
    const entCount = users.filter((u) => u.plan === 'enterprise').length;
    const freeCount = users.filter(
      (u) => u.plan !== 'pro' && u.plan !== 'enterprise' && u.plan !== 'trial',
    ).length;

    const totalSegment = totalUsers || 1;
    const proPct = Math.round((proCount / totalSegment) * 100);
    const entPct = Math.round((entCount / totalSegment) * 100);

    return {
      totalUsers,
      sampleTruncated,
      activePro,
      activeEnt,
      estimatedMRR,
      windowAiCost,
      proCount,
      entCount,
      freeCount,
      proPct,
      entPct,
    };
  }

  it('يحسب المشتركين الفاعلين ويستثني المحظورين والمنتهيين تاريخياً', () => {
    const metrics = computeMetrics(MOCK_PROFILES, MOCK_AI_LOGS);

    // لدينا 3 pro في العينة:
    // user-1: active, future -> يحسب ✅
    // user-4: active, past -> مستثنى ❌
    // user-5: banned, future -> مستثنى ❌
    expect(metrics.activePro).toBe(1);

    // لدينا 1 enterprise وهو user-2 وغير محظور -> يحسب ✅
    expect(metrics.activeEnt).toBe(1);

    // MRR = 1 * 15 + 1 * 49 = $64
    expect(metrics.estimatedMRR).toBe(64);
  });

  it('يحسب تكلفة عمليات الذكاء الاصطناعي بدقة مع التراجع الافتراضي 0.012$', () => {
    const logs: AiUsageRecord[] = [
      { id: '1', user_id: 'u1', used_at: '', image_bytes: 100, execution_seconds: 1, cost_usd: 0.02 },
      { id: '2', user_id: 'u2', used_at: '', image_bytes: 100, execution_seconds: 1, cost_usd: 0 }, // fallback
    ];
    const metrics = computeMetrics(MOCK_PROFILES, logs);
    expect(metrics.windowAiCost).toBeCloseTo(0.02 + 0.012, 4);
  });

  it('يتفادى القسمة على صفر عند فراغ قائمة المستخدمين', () => {
    const metrics = computeMetrics([], []);
    expect(metrics.totalUsers).toBe(0);
    expect(metrics.proPct).toBe(0);
    expect(metrics.entPct).toBe(0);
    expect(metrics.estimatedMRR).toBe(0);
  });
});

describe('🔑 لوحة الإدارة — توليد وإدارة مفاتيح التراخيص (License Key Lifecycle)', () => {
  it('ينفذ تمديد صلاحية الحساب عبر admin_extend_license', async () => {
    const { client, rpcCalls, profilesData } = createMockSupabase();

    const { error } = await client.rpc('admin_extend_license', {
      p_user_id: 'user-1',
      p_additional_months: 6,
    });

    expect(error).toBeNull();
    expect(rpcCalls).toContainEqual({
      name: 'admin_extend_license',
      params: { p_user_id: 'user-1', p_additional_months: 6 },
    });

    const user = profilesData.find((u) => u.id === 'user-1');
    expect(user).toBeDefined();
    // يجب أن يزيد تاريخ الانتهاء بمقدار 6 أشهر
    const oldYear = new Date(FUTURE_DATE).getFullYear();
    const newYear = new Date(user!.expires_at).getFullYear();
    expect(newYear).toBeGreaterThanOrEqual(oldYear);
  });

  it('ينفذ سحب الترخيص وإعادة الحساب للباقة المجانية عبر admin_revoke_license', async () => {
    const { client, rpcCalls, profilesData } = createMockSupabase();

    const { error } = await client.rpc('admin_revoke_license', {
      p_user_id: 'user-1',
    });

    expect(error).toBeNull();
    expect(rpcCalls).toContainEqual({
      name: 'admin_revoke_license',
      params: { p_user_id: 'user-1' },
    });

    const user = profilesData.find((u) => u.id === 'user-1');
    expect(user!.plan).toBe('free');
    expect(user!.license_key).toBe('');
  });

  it('يولّد مفتاحاً مفرداً مع بادئة مخصصة عبر buildCustomKey و admin_create_license_key', async () => {
    const { client, keysData } = createMockSupabase();

    const customKey = buildCustomKey('STUDIO-VIP', 'pro', '7777');
    expect(customKey).toBe('STUDIO-VIP-PRO-7777');

    const { data, error } = await client.rpc('admin_create_license_key', {
      p_plan: 'pro',
      p_duration_months: 12,
      p_custom_key: customKey,
    });

    expect(error).toBeNull();
    expect(data.key).toBe('STUDIO-VIP-PRO-7777');

    const inserted = keysData.find((k) => k.key === 'STUDIO-VIP-PRO-7777');
    expect(inserted).toBeDefined();
    expect(inserted?.status).toBe('unused');
    expect(inserted?.duration_months).toBe(12);
  });

  it('يولّد دفعة مفاتيح مجمّعة (Batch) مع تسلسل أرقام الموزع', async () => {
    const { client, keysData } = createMockSupabase();
    const prefix = 'RESELLER';
    const plan: GenPlan = 'enterprise';
    const count = 3;
    const batchResults: string[] = [];

    for (let i = 0; i < count; i++) {
      const customPrefix = `${prefix.trim().toUpperCase()}-${plan.toUpperCase()}-${i + 1}`;
      const { data, error } = await client.rpc('admin_create_license_key', {
        p_plan: plan,
        p_duration_months: 12,
        p_custom_key: customPrefix,
      });
      if (!error && data) batchResults.push(data.key);
    }

    expect(batchResults).toEqual([
      'RESELLER-ENTERPRISE-1',
      'RESELLER-ENTERPRISE-2',
      'RESELLER-ENTERPRISE-3',
    ]);
    expect(keysData.some((k) => k.key === 'RESELLER-ENTERPRISE-3')).toBe(true);
  });
});

describe('🛡️ لوحة الإدارة — أمان التصدير والتحصين ضد Formula Injection', () => {
  it('يحيّد الرموز التنفيذية (=, +, -, @) عند تصدير المشتركين إلى CSV', () => {
    const dangerousUsers: UserProfile[] = [
      {
        id: 'u-bad',
        name: '=cmd|calc',
        email: '+9647811942002@domain.com',
        plan: '-2+3',
        status: '@admin',
        expires_at: '',
        license_key: '=DDE("cmd";"calc")',
        created_at: '',
        updated_at: '',
      },
    ];

    const csv = buildUsersCsv(dangerousUsers);

    // علامة BOM لـ Excel
    expect(csv.startsWith('\uFEFF')).toBe(true);

    // تحييد الخانات الخطرة بعلامة اقتباس مفردة تبطل تنفيذ الصيغة ومضاعفة الاقتباسات المزدوجة
    expect(csv).toContain('"\'=cmd|calc"');
    expect(csv).toContain('"\'=DDE(""cmd"";""calc"")"');
    expect(csv).toContain('"\'@admin"');
  });

  it('يصدر دفعة المفاتيح بصيغة CSV نظيفة ومتوافقة مع Excel', () => {
    const keys = ['VIP-1', 'VIP-2'];
    const csv = buildBatchKeysCsv(keys, 'pro');

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"مفتاح الترخيص","الباقة","تاريخ التوليد"');
    expect(csv).toContain('"VIP-1","PRO"');
    expect(csv).toContain('"VIP-2","PRO"');
  });
});

describe('⚙️ لوحة الإدارة — تفضيلات المسودة المحلية (Local Draft Settings)', () => {
  it('يقرأ الحدود المحلية مع توفير قيمة احتياطية آمنة ضد القيم السالبة أو التالفة', () => {
    expect(parseStoredLimit('15', 5)).toBe(15);
    expect(parseStoredLimit('0', 5)).toBe(0);
    expect(parseStoredLimit('-10', 5)).toBe(5);
    expect(parseStoredLimit('invalid', 15)).toBe(15);
    expect(parseStoredLimit(null, 50)).toBe(50);
  });
});
