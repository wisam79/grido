/**
 * admin-utils — منطق نقي (بلا React ولا شبكة) لقابليّة الاختبار في لوحة الإدارة.
 * كان منطق التصدير والتوليد مضمّناً في `AdminDashboard.tsx` بلا أي اختبار؛ استُخرج هنا.
 */

/**
 * يحيّد صيغ CSV الخطرة (Formula Injection) ويهرّب الفواصل والاقتباسات.
 * أي خلية تبدأ بـ`= + - @` أو tab/CR تُسبق بعلامة اقتباس مفردة فلا تُنفَّذ صيغة في Excel/Sheets.
 */
export function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/** يقرأ حدّاً رقمياً محفوظاً محلياً مع قيمة احتياطية آمنة عند التلف أو السلبية. */
export function parseStoredLimit(raw: string | null, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** لاحقة عشوائية آمنة (CSPRNG) لمفاتيح البادئة المخصصة بدل `Math.random`. */
export function randomKeySuffix(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(1000 + (buf[0] % 9000));
}

/** يبني مفتاحاً مخصصاً من بادئة المستخدم، أو `undefined` لمسار التوليد الخادمي الآمن. */
export function buildCustomKey(prefix: string, plan: string, suffix: string): string | undefined {
  const clean = prefix.trim().toUpperCase();
  if (!clean) return undefined;
  return `${clean}-${plan.toUpperCase()}-${suffix}`;
}

/** يبني مفتاح دفعة مخصصاً بلواحق عشوائية (CSPRNG) وفهرس فريد لمنع التصادم عند تكرار الدفعات. */
export function buildBatchCustomKey(
  prefix: string,
  plan: string,
  index: number,
  suffix?: string,
): string | undefined {
  if (!prefix.trim()) return undefined;
  return buildCustomKey(prefix, plan, `${suffix ?? randomKeySuffix()}-${index + 1}`);
}

/** يحلّل قيمة `genCount`/`genDuration` الصحيحة كعدد صحيح موجب، أو يرجع `null` عند الفراغ أو `NaN`. */
export function parsePositiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

/** يطبع حقل انتهاء الصلاحية: `null` عند المسح، أو ISO عند الصلاحية، أو `{ valid: false }` عند التلف. */
export function resolveExpiresAtInput(
  raw: string,
): { valid: true; value: string | null } | { valid: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: true, value: null };
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return { valid: false };
  return { valid: true, value: parsed.toISOString() };
}

/** يحفظ تكلفة AI الصريحة (بما فيها `0`) ولا يسقط للاحتياطي إلا عند الغياب أو القيم غير المنتهية. */
export function resolveAiCostUsd(costUsd: unknown, fallback = 0.012): number {
  return typeof costUsd === 'number' && Number.isFinite(costUsd) && costUsd >= 0
    ? costUsd
    : fallback;
}

export interface PagedResult<T> {
  data: T[];
  truncated: boolean;
  error: { message?: string } | null;
}

/** يجلب الصفوف على صفحات عبر `.range()` لتفادي بتر PostgREST الصامت عند 1000 صف. */
export async function fetchAllPaged<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
  pageSize = 1000,
  maxRows = 50000,
): Promise<PagedResult<T>> {
  const all: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = Math.min(from + pageSize - 1, maxRows - 1);
    const { data, error } = await fetchPage(from, to);
    if (error) {
      return { data: [], truncated: false, error };
    }
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < to - from + 1) {
      return { data: all, truncated: false, error: null };
    }
  }
  return { data: all, truncated: true, error: null };
}

export interface UserMetricsSummary {
  totalUsers: number;
  sampleTruncated: boolean;
  activePro: number;
  activeEnt: number;
  windowAiCost: number;
  estimatedMRR: number;
  proCount: number;
  entCount: number;
  freeCount: number;
  proPct: number;
  entPct: number;
  freePct: number;
}

/** يحسب مؤشرات لوحة الإدارة بمقام متسق مع العينة وتكلفة AI دقيقة تحفظ الصفر. */
export function computeAdminUserMetrics(
  users: Array<{ plan?: string | null; status?: string | null; expires_at?: string | null }>,
  totalUsersServer: number,
  aiLogs: Array<{ cost_usd?: unknown }>,
  serverSampleTruncated = false,
  now: Date = new Date(),
): UserMetricsSummary {
  const totalUsers = totalUsersServer > 0 ? totalUsersServer : users.length;
  const sampleTruncated = serverSampleTruncated || users.length < totalUsers;

  const activePro = users.filter(
    (u) => u.plan === 'pro' && getUserAccountState(u, now) === 'active',
  ).length;
  const activeEnt = users.filter(
    (u) => u.plan === 'enterprise' && getUserAccountState(u, now) === 'active',
  ).length;
  const windowAiCost = aiLogs.reduce((acc, curr) => acc + resolveAiCostUsd(curr.cost_usd), 0);
  const estimatedMRR = activePro * 15 + activeEnt * 49;

  const proCount = users.filter((u) => u.plan === 'pro').length;
  const entCount = users.filter((u) => u.plan === 'enterprise').length;
  const freeCount = users.filter(
    (u) => u.plan !== 'pro' && u.plan !== 'enterprise' && u.plan !== 'trial',
  ).length;

  const denominator = sampleTruncated ? users.length : totalUsers;
  const proPct = denominator > 0 ? Math.round((proCount / denominator) * 100) : 0;
  const entPct = denominator > 0 ? Math.round((entCount / denominator) * 100) : 0;
  const freePct = denominator > 0 ? Math.round((freeCount / denominator) * 100) : 0;

  return {
    totalUsers,
    sampleTruncated,
    activePro,
    activeEnt,
    windowAiCost,
    estimatedMRR,
    proCount,
    entCount,
    freeCount,
    proPct,
    entPct,
    freePct,
  };
}

/** صف مستخدم قابل للتصدير — أعمدة `profiles` المُصدَّرة في CSV. */
export interface CsvUser {
  name?: string | null;
  email?: string | null;
  plan?: string | null;
  status?: string | null;
  expires_at?: string | null;
  license_key?: string | null;
  created_at?: string | null;
}

function arabicDate(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('ar-SA') : '—';
}

/** يبني CSV كامل للمستخدمين (بـBOM لـExcel) مع عمود رأس وتحصين كل خلية. */
export function buildUsersCsv(users: CsvUser[]): string {
  const header = ['الاسم', 'البريد الإلكتروني', 'الباقة', 'الحالة', 'تاريخ انتهاء الصلاحية', 'مفتاح التفعيل', 'تاريخ التسجيل'];
  let csv = '\uFEFF' + header.map(csvCell).join(',') + '\n';
  for (const u of users) {
    const row = [
      u.name || 'غير معروف',
      u.email || '',
      (u.plan || '').toUpperCase(),
      u.status || 'active',
      arabicDate(u.expires_at),
      u.license_key || '—',
      arabicDate(u.created_at),
    ];
    csv += row.map(csvCell).join(',') + '\n';
  }
  return csv;
}

/** يبني CSV لدفعة مفاتيح مولّدة. */
export function buildBatchKeysCsv(keys: string[], plan: string): string {
  let csv = '\uFEFF' + ['مفتاح الترخيص', 'الباقة', 'تاريخ التوليد'].map(csvCell).join(',') + '\n';
  const generatedOn = new Date().toLocaleDateString('ar-SA');
  for (const key of keys) {
    csv += [key, plan.toUpperCase(), generatedOn].map(csvCell).join(',') + '\n';
  }
  return csv;
}

/** ينزّل نصاً كملف ثم يحرّر عنوان الـURL المؤقت (يمنع تسريب الذاكرة). */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type DerivedAccountState = 'active' | 'expired' | 'banned';
export type UserSortBy = 'newest' | 'expiry-asc' | 'name' | 'plan';

const PLAN_RANK: Record<string, number> = {
  enterprise: 4,
  pro: 3,
  trial: 2,
  free: 1,
};

/** يحدد ما إذا كان الحساب منتهي الصلاحية وفق الحالة الصريحة أو تاريخ الانتهاء. */
export function isUserExpired(
  user: { status?: string | null; expires_at?: string | null },
  now: Date = new Date(),
): boolean {
  if (user.status === 'expired') return true;
  if (!user.expires_at) return false;
  const ts = new Date(user.expires_at).getTime();
  return Number.isFinite(ts) && ts <= now.getTime();
}

/** يرجع الحالة الفعلية للحساب بأولوية الحظر ثم الانتهاء ثم النشط. */
export function getUserAccountState(
  user: { status?: string | null; expires_at?: string | null },
  now: Date = new Date(),
): DerivedAccountState {
  if (user.status === 'banned') return 'banned';
  if (isUserExpired(user, now)) return 'expired';
  return 'active';
}

/** يحسب الأيام المتبقية لانتهاء الصلاحية (سالب أو 0 للمنتهي، وnull لغير المحدد). */
export function getUserDaysRemaining(
  expiresAt?: string | null,
  now: Date = new Date(),
): number | null {
  if (!expiresAt) return null;
  const ts = new Date(expiresAt).getTime();
  if (!Number.isFinite(ts)) return null;
  const diffMs = ts - now.getTime();
  if (diffMs <= 0) return Math.floor(diffMs / 86_400_000);
  return Math.ceil(diffMs / 86_400_000);
}

/** يفرز نسخة جديدة من قائمة المستخدمين حسب المعيار المختار. */
export function sortUsers<
  T extends {
    name?: string | null;
    email?: string | null;
    plan?: string | null;
    expires_at?: string | null;
    created_at?: string | null;
  },
>(users: readonly T[], sortBy: UserSortBy): T[] {
  const list = [...users];
  switch (sortBy) {
    case 'expiry-asc':
      return list.sort((a, b) => {
        const aTs = a.expires_at ? new Date(a.expires_at).getTime() : Number.POSITIVE_INFINITY;
        const bTs = b.expires_at ? new Date(b.expires_at).getTime() : Number.POSITIVE_INFINITY;
        return aTs - bTs;
      });
    case 'name':
      return list.sort((a, b) =>
        (a.name || a.email || '').localeCompare(b.name || b.email || '', 'ar'),
      );
    case 'plan':
      return list.sort(
        (a, b) => (PLAN_RANK[b.plan || 'free'] ?? 0) - (PLAN_RANK[a.plan || 'free'] ?? 0),
      );
    case 'newest':
    default:
      return list.sort(
        (a, b) =>
          (b.created_at ? new Date(b.created_at).getTime() : 0) -
          (a.created_at ? new Date(a.created_at).getTime() : 0),
      );
  }
}

export interface UserFilterCounts {
  all: number;
  pro: number;
  enterprise: number;
  trial: number;
  free: number;
  expired: number;
  banned: number;
}

/** يحسب عدادات التبويبات الفرعية للمستخدمين بنفس منطق فلترة useAdminUsers. */
export function computeUserFilterCounts(
  users: readonly { plan?: string | null; status?: string | null; expires_at?: string | null }[],
  now: Date = new Date(),
): UserFilterCounts {
  let pro = 0;
  let enterprise = 0;
  let trial = 0;
  let free = 0;
  let expired = 0;
  let banned = 0;

  for (const u of users) {
    if (u.plan === 'pro') pro += 1;
    else if (u.plan === 'enterprise') enterprise += 1;
    else if (u.plan === 'trial') trial += 1;
    else free += 1;

    const state = getUserAccountState(u, now);
    if (state === 'banned') banned += 1;
    else if (state === 'expired') expired += 1;
  }

  return { all: users.length, pro, enterprise, trial, free, expired, banned };
}

export interface TopAiUserSummary {
  userId: string;
  runs: number;
  totalCostUsd: number;
  totalBytes: number;
}

export interface ExtendedAdminBreakdown {
  trialCount: number;
  expiredCount: number;
  bannedCount: number;
  activeUsersCount: number;
  totalAiBytes: number;
  totalAiMb: number;
  avgExecutionSeconds: number;
  totalAiCostUsd: number;
  topAiUsers: TopAiUserSummary[];
}

/** يستخرج تفصيلاً إضافياً لصحة الحسابات وتلخيص استخدام الذكاء الاصطناعي من البيانات المحمّلة. */
export function computeExtendedAdminBreakdown(
  users: readonly { plan?: string | null; status?: string | null; expires_at?: string | null }[],
  aiLogs: readonly {
    user_id?: string | null;
    image_bytes?: number | null;
    execution_seconds?: number | null;
    cost_usd?: unknown;
  }[],
  now: Date = new Date(),
): ExtendedAdminBreakdown {
  let trialCount = 0;
  let expiredCount = 0;
  let bannedCount = 0;
  let activeUsersCount = 0;

  for (const u of users) {
    if (u.plan === 'trial') trialCount += 1;
    const state = getUserAccountState(u, now);
    if (state === 'banned') bannedCount += 1;
    else if (state === 'expired') expiredCount += 1;
    else activeUsersCount += 1;
  }

  let totalAiBytes = 0;
  let totalExecSeconds = 0;
  let totalAiCostUsd = 0;
  const perUser = new Map<string, TopAiUserSummary>();

  for (const log of aiLogs) {
    const bytes = Number.isFinite(log.image_bytes) && (log.image_bytes ?? 0) > 0 ? Number(log.image_bytes) : 0;
    const execSec =
      Number.isFinite(log.execution_seconds) && (log.execution_seconds ?? 0) > 0
        ? Number(log.execution_seconds)
        : 0;
    const cost = resolveAiCostUsd(log.cost_usd);

    totalAiBytes += bytes;
    totalExecSeconds += execSec;
    totalAiCostUsd += cost;

    if (log.user_id) {
      const prev = perUser.get(log.user_id);
      if (prev) {
        prev.runs += 1;
        prev.totalCostUsd += cost;
        prev.totalBytes += bytes;
      } else {
        perUser.set(log.user_id, {
          userId: log.user_id,
          runs: 1,
          totalCostUsd: cost,
          totalBytes: bytes,
        });
      }
    }
  }

  const topAiUsers = Array.from(perUser.values())
    .sort((a, b) => b.runs - a.runs || b.totalCostUsd - a.totalCostUsd)
    .slice(0, 5);

  return {
    trialCount,
    expiredCount,
    bannedCount,
    activeUsersCount,
    totalAiBytes,
    totalAiMb: totalAiBytes / (1024 * 1024),
    avgExecutionSeconds: aiLogs.length > 0 ? totalExecSeconds / aiLogs.length : 0,
    totalAiCostUsd,
    topAiUsers,
  };
}

/** يبني خريطة O(1) للوصول لبيانات المستخدم عبر المعرّف UUID في جداول المفاتيح والسجلات. */
export function buildUserLookupMap<T extends { id: string }>(users: readonly T[]): Record<string, T> {
  const map: Record<string, T> = {};
  for (const user of users) {
    map[user.id] = user;
  }
  return map;
}

/** يصفّي مفاتيح التراخيص حسب نص البحث (المفتاح، المعرف، الباقة، أو اسم/بريد المالك) وحالة المفتاح. */
export function filterLicenseKeys<
  TKey extends {
    key?: string | null;
    user_id?: string | null;
    plan?: string | null;
    status?: string | null;
  },
>(
  keys: readonly TKey[],
  searchQuery: string,
  statusFilter: string,
  usersLookup: Record<string, { name?: string | null; email?: string | null }> = {},
): TKey[] {
  const q = searchQuery.trim().toLowerCase();
  return keys.filter((key) => {
    if (statusFilter !== 'all' && key.status !== statusFilter) return false;
    if (!q) return true;
    const owner = key.user_id ? usersLookup[key.user_id] : undefined;
    return (
      (key.key || '').toLowerCase().includes(q) ||
      (key.user_id || '').toLowerCase().includes(q) ||
      (key.plan || '').toLowerCase().includes(q) ||
      (owner?.name || '').toLowerCase().includes(q) ||
      (owner?.email || '').toLowerCase().includes(q)
    );
  });
}
