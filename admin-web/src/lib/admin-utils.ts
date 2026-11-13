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
    (u) =>
      u.plan === 'pro' &&
      u.status !== 'banned' &&
      (!u.expires_at || new Date(u.expires_at) > now),
  ).length;
  const activeEnt = users.filter((u) => u.plan === 'enterprise' && u.status !== 'banned').length;
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
