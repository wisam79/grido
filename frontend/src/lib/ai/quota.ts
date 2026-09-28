/**
 * الحصة اليومية لاستخدام الذكاء الاصطناعي — منطق نقي بلا React أو Store.
 *
 * **قاعدة الحقيقة:** الخادم. المرجع الخادمي هو دالة RPC `check_and_record_ai_usage`
 * التي تعدّ استهلاك اليوم بحدود `date_trunc('day', timezone('utc', now()))` وتشتق
 * الحد من خطة المستخدم. لذلك:
 *
 * 1. **الحد** مشتق من الخطة (مطابق تماماً لـ`CASE` داخل الهجرة — ثلاثة مواضع
 *    متزامنة موثّقة في `docs/DOCUMENTATION_MAP.md`).
 * 2. **العدّاد** يُعرض من لقطة الخادم (`used_today`/`daily_limit`) التي يعيدها
 *    الخادم في رد التحسين، ولا يُشتق محلياً إلا قبل أول عملية في اليوم.
 * 3. **مفتاح اليوم UTC** — لا محلي — لأن انقلاب اليوم محلياً (00:00) يخالف
 *    انقلاب يوم الخادم (03:00 بتوقيت UTC+3) فيعرض المحرر رصيداً متبقياً بينما
 *    يرفض الخادم الطلب. هذا كان عيباً مرئياً للمستخدم (تقرير التدقيق 12 / F-01).
 */

/** الحدود اليومية حسب الباقة — يجب أن تطابق `CASE` في الهجرة وثوابت Go. */
export const AI_DAILY_LIMITS = {
  free: 5,
  pro: 15,
  enterprise: 50,
} as const;

export type AiPlanName = keyof typeof AI_DAILY_LIMITS;

/** الحد اليومي لباقة (غير المعروفة/المجهولة ⇒ الحد المجاني الأكثر أماناً). */
export function aiPlanDailyLimit(plan?: string | null): number {
  if (plan && Object.prototype.hasOwnProperty.call(AI_DAILY_LIMITS, plan)) {
    return AI_DAILY_LIMITS[plan as AiPlanName];
  }
  return AI_DAILY_LIMITS.free;
}

/** مفتاح اليوم الموحّد (UTC) — يطابق عدّاد الخادم `timezone('utc', now())`. */
export function aiUtcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** أقل وصف مطلوب من سجل الاستخدام المحلي (يتفادى جعل الوحدة تعتمد على الستور). */
export interface AiUsageLogLike {
  serviceName?: string;
  status?: string;
  email?: string;
  timestamp?: string;
  /** مفتاح يوم UTC يُخزَّن مع السجل الحديث — السجلات القديمة تعتمد على `timestamp` */
  utcDay?: string;
}

/** هل الخدمة المسجَّلة عملية ترميم/تحسين (المحسوبة على حصة الخادم)؟ */
function isEnhanceServiceName(name?: string): boolean {
  if (!name) return false;
  return name.includes('ترميم') || name.includes('GFPGAN');
}

/**
 * يوم السجل القديم: السجلات المحفوظة قبل إضافة `utcDay` تحمل طابعاً محلياً
 * `YYYY-MM-DD HH:mm:ss`، فنأخذ تاريخه المحلي كتقدير. القيمة تزول تدريجياً مع
 * دوران السجلات (200 سجل كحد أقصى) ولا تمسّ الحكم الخادمي في أي حال.
 */
function legacyLocalDayKey(timestamp?: string): string {
  return timestamp ? timestamp.substring(0, 10) : '';
}

/**
 * عدد عمليات التحسين الناجحة المسجَّلة لليوم المطلوب (UTC) — احتياطي محلي
 * يُستخدَم قبل أول عملية في اليوم فقط (بعدها تعرض الواجهة عدّاد الخادم).
 */
export function countEnhanceUsageForDay(
  logs: readonly AiUsageLogLike[],
  utcDay: string,
  userEmail?: string | null,
): number {
  return logs.filter((log) => {
    if (log.status !== 'success') return false;
    if (!isEnhanceServiceName(log.serviceName)) return false;
    if (userEmail && log.email && log.email !== userEmail) return false;
    const day = log.utcDay ?? legacyLocalDayKey(log.timestamp);
    return day === utcDay;
  }).length;
}

/** لقطة الحصة الخادمية كما وصلت من رد التحسين. */
export interface AiQuotaSnapshot {
  used: number;
  limit: number;
  /** زمن وصول اللقطة (ms) — لاعتبارها صالحة ضمن نفس يوم UTC فقط */
  at: number;
  /** بريد المستخدم صاحب اللقطة لمنع تسريبها لحساب آخر */
  userEmail?: string | null;
}

export interface ResolvedAiQuota {
  used: number;
  limit: number;
  remaining: number;
  /** server = قيم الخادم كما هي · local = احتياطي محلي قبل أول عملية في اليوم */
  source: 'server' | 'local';
}

/**
 * يحسم حصة العرض: لقطة الخادم إن كانت لنفس يوم UTC الحالي ومطابقة لخطة المستخدم
 * وبريده، وإلا احتياطي محلي مشتق من السجلات على مفتاح يوم UTC نفسه.
 */
export function resolveAiQuota(params: {
  snapshot?: AiQuotaSnapshot | null;
  plan?: string | null;
  logs?: readonly AiUsageLogLike[];
  userEmail?: string | null;
  now?: Date;
}): ResolvedAiQuota {
  const now = params.now ?? new Date();
  const utcDay = aiUtcDayKey(now);
  const snapshot = params.snapshot ?? null;
  const expectedLimit = aiPlanDailyLimit(params.plan);

  // 🛡️ اللقطة الخادمية مقبولة فقط إذا كانت:
  // 1. لنفس يوم UTC الحالي
  // 2. تطابق حد الباقة الحالية (ترفض اللقطة القديمة فوراً عند الترقية مثلاً من 5 إلى 15)
  // 3. تطابق بريد المستخدم الحالي إن وُجد كلاهما (تمنع توريث لقطة حساب مستهلك لحساب جديد)
  const isPlanMatch = params.plan !== undefined ? snapshot?.limit === expectedLimit : true;
  const isEmailMatch =
    !snapshot?.userEmail || !params.userEmail || snapshot.userEmail === params.userEmail;

  if (
    snapshot &&
    snapshot.limit > 0 &&
    snapshot.used >= 0 &&
    isPlanMatch &&
    isEmailMatch &&
    aiUtcDayKey(new Date(snapshot.at)) === utcDay
  ) {
    const limit = snapshot.limit;
    const used = Math.max(0, snapshot.used);
    return { used, limit, remaining: Math.max(0, limit - used), source: 'server' };
  }

  const limit = expectedLimit;
  const used = countEnhanceUsageForDay(params.logs ?? [], utcDay, params.userEmail);
  return { used, limit, remaining: Math.max(0, limit - used), source: 'local' };
}

/** استخراج لقطة الحصة من رد التحسين إن حملها الخادم. */
export function parseQuotaSnapshotFromResponse(
  payload: unknown,
  at: number = Date.now(),
  userEmail?: string | null,
): AiQuotaSnapshot | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const used = record.used_today;
  const limit = record.daily_limit;
  if (typeof used !== 'number' || typeof limit !== 'number') return null;
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0 || used < 0) return null;
  return { used, limit, at, userEmail: userEmail ?? null };
}
