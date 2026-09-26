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
