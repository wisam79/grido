import { aiUtcDayKey } from '@/lib/ai/quota';
import { createLogger } from '@/lib/logger';
import { toErrorMessage } from '@/lib/wails-error';

import * as LicenseHandler from '../../../../wailsjs/go/handlers/LicenseHandler';
import * as App from '../../../../wailsjs/go/main/App';

import type { domain } from '../../../../wailsjs/go/models';
import type { StateCreator } from 'zustand';

const logger = createLogger('license-slice');

export type UserProfile = domain.UserProfile;

export interface AiUsageRecord {
  id: string;
  email: string;
  serviceName: string; // "ترميم الوجوه بالذكاء الاصطناعي (GFPGAN v1.4)" | "عزل الخلفية الذكي"
  source: string; // "Grido Studio Desktop (Windows)"
  durationSec: number;
  costUsd: number;
  status: 'success' | 'failed';
  timestamp: string;
  /**
   * مفتاح يوم الاستخدام (UTC) — يُحسب عند التسجيل ليطابق عدّاد الخادم
   * (`date_trunc('day', timezone('utc', now()))`) بدل تاريخ محلي ينزاح
   * بتوقيت UTC+3. السجلات القديمة لا تحمله فتُقدّر من `timestamp`.
   */
  utcDay?: string;
}

export interface LicenseSlice {
  user: UserProfile | null;
  licenseLoading: boolean;
  accountModalOpen: boolean;
  aiUsageLogs: AiUsageRecord[];

  setAccountModalOpen: (open: boolean) => void;
  checkLicenseStatus: (options?: { throwOnError?: boolean }) => Promise<UserProfile | null>;
  registerAccount: (name: string, email: string, password: string) => Promise<UserProfile>;
  loginAccount: (email: string, password: string) => Promise<UserProfile>;
  verifyOTP: (email: string, otp: string) => Promise<UserProfile>;
  resendOTP: (email: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  activateLicenseKey: (key: string) => Promise<UserProfile>;
  logoutAccount: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyRecoveryOTP: (email: string, token: string, newPassword: string) => Promise<UserProfile>;
  isLicenseActive: () => boolean;

  /** ملء سجلات AI من AppData عند الإقلاع (يُستدعى مرة من تأثير التطبيق) */
  hydrateAiUsageLogs: () => Promise<AiUsageRecord[]>;

  logAiUsage: (record: Omit<AiUsageRecord, 'id' | 'timestamp' | 'utcDay'>) => void;
}

const DEFAULT_AI_LOGS: AiUsageRecord[] = [];
const AI_LOGS_STORAGE_KEY = 'grido_ai_usage_logs';
const AI_LOGS_MAX_ENTRIES = 200;

/**
 * حفظ سجلات استخدام الذكاء الاصطناعي في AppData عبر Wails (ذرياً)،
 * مع الرجوع إلى localStorage في بيئة المتصفح/الاختبارات حيث جسر Wails
 * غير معرّف — أي فشل في Wails يستقر في localStorage كشبكة أمان.
 * 🛡️ استبقاء الأخطاء: فشل الحفظ لا يوقف الواجهة — يسجل تحذيراً فقط.
 */
async function persistAiLogs(logs: AiUsageRecord[]): Promise<void> {
  const payload = JSON.stringify(logs.slice(0, AI_LOGS_MAX_ENTRIES));
  try {
    await App.SaveAiUsageLogs(payload);
  } catch (wailsErr) {
    try {
      localStorage.setItem(AI_LOGS_STORAGE_KEY, payload);
    } catch (lsErr) {
      logger.error('Failed to persist AI log:', wailsErr, lsErr);
    }
  }
}

/**
 * استرجاع السجلات من AppData مع ترحيل شفاف من localStorage القديم:
 * إن كان ملف AppData فارغاً و localStorage يحوي بيانات قديمة، تُرحّل
 * ثم يُمسح localStorage لتفادي التكرار مستقبلاً.
 */
async function loadAiLogs(): Promise<AiUsageRecord[]> {
  let saved: string = '';
  try {
    saved = await App.LoadAiUsageLogs();
  } catch {
    // بيئة متصفح/اختبار بدون Wails — جرب localStorage مباشرة
  }
  try {
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : DEFAULT_AI_LOGS;
    }
    // لا ملف AppData — حاول الترحيل من localStorage القديم
    const legacy = localStorage.getItem(AI_LOGS_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const migrated = Array.isArray(parsed) ? parsed : DEFAULT_AI_LOGS;
      if (migrated.length > 0) {
        // #17 — انتظار اكتمال الحفظ قبل مسح localStorage لمنع فقدان السجلات عند الإقلاع المبكر
        await persistAiLogs(migrated);
      }
      localStorage.removeItem(AI_LOGS_STORAGE_KEY);
      return migrated;
    }
  } catch {
    // JSON تالف — نبدأ نظيفين
  }
  return DEFAULT_AI_LOGS;
}

// 🛡️ الجلسة الواحدة النشطة (Last-Wins): كشف خطأ الطرد القادم من Go
// (ErrSessionSuperseded) عبر رمز ثابت لا نصاً عربياً — الصياغة قابلة للتغيير
// في session_manager.go دون كسر الكشف، والرمز جزء من عقد الطرد.
const SESSION_SUPERSEDED_MARK = 'ERR_SESSION_SUPERSEDED';
const SESSION_SUPERSEDED_FALLBACK =
  'تم تسجيل الدخول إلى حسابك من جهاز آخر — هذه الجلسة لم تعد نشطة';
export function isSessionSupersededError(err: unknown): boolean {
  return toErrorMessage(err, '').includes(SESSION_SUPERSEDED_MARK);
}
export function sessionSupersededMessage(err: unknown): string {
  const msg = toErrorMessage(err, '')
    .replace(SESSION_SUPERSEDED_MARK + ': ', '')
    .trim();
  return msg || SESSION_SUPERSEDED_FALLBACK;
}

class LicenseCheckInvalidatedError extends Error {
  readonly code = 'ERR_LICENSE_CHECK_INVALIDATED';

  constructor() {
    super('License check invalidated by an authentication change');
    this.name = 'LicenseCheckInvalidatedError';
  }
}

export function isLicenseCheckInvalidatedError(err: unknown): boolean {
  return err instanceof LicenseCheckInvalidatedError;
}

// جيل الطلبات: يمنع نداء checkLicenseStatus قديماً (in-flight) من استعادة
// جلسة بعد تسجيل الخروج (إصلاح Bug#4 — race guard)
let licenseCheckEpoch = 0;
// Share the backend outcome, not a caller's fallback/error policy. Keep ownership
// of an invalidated native request until it settles before starting another one.
interface LicenseCheckFlight {
  epoch: number;
  promise: Promise<UserProfile | null>;
}
let inFlightCheck: LicenseCheckFlight | null = null;

// 🛡️ Single-flight لتحميل السجلات: StrictMode يستدعي تأثير الإقلاع مرتين —
// نداءان متزامنان يتشاركان نفس الوعد بدل تحميل الملف مرتين
let inFlightAiLogsLoad: Promise<AiUsageRecord[]> | null = null;

/**
 * إبطال أي فحص ترخيص معلّق (in-flight) بعد نجاح مسار مصادقة.
 * 🛡️ تسابق زمني: كان فحص `checkLicenseStatus` بدأه الإقلاع/شاشة الترخيص قبل
 * الدخول يُكمل بعد نجاح الدخول فيكتب `set({ user })` من جلسة قديمة (أو null
 * قبل وجود الجلسة) — فيطمس جلسة سجّل المستخدم للتو فيرتدّ لواجهة الترخيص.
 * رفع الجيل يُلغي نتيجة الفحص القديم (حارس `epoch !== licenseCheckEpoch`).
 * يبقى الطلب الأصلي مملوكاً حتى يستقر؛ الفحص الجديد ينتظره ثم يبدأ/يشارك جيلاً جديداً.
 */
function invalidateInFlightLicenseCheck(): void {
  licenseCheckEpoch++;
}

/** مُضيّق نوع معيّن الحالة لغلاف الإجراءات — يستقبل partial فقط */
type LicenseStateSetter = (partial: Partial<LicenseSlice>) => void;

/**
 * غلاف موحد لإجراءات المصادقة المرتِّبة لملف تعريف — كانت ستة إجراءات
 * (تسجيل، دخول، Google، تفعيل مفتاح، تحقق OTP، تعيين كلمة مرور جديدة)
 * تكرر يدوياً النمط نفسه (~110 أسطر): تحميل ← نداء الربط ← رفض نتيجة فارغة
 * برسالة السياق ← إبطال الفحص المعلق ← تعيين الجلسة ← إعادة رمي الخطأ برسالة
 * السياق نفسها. خيارا الانحراف الموثقان للإجراء الشاذ (resendOTP): يعيد
 * الملف دون تعيين جلسة (لا مستخدم جديد في مرحلة التسجيل بعد) ودون إبطال
 * الفحص المعلق (سلوكه الأصلي المقصود).
 */
async function runProfileAuthAction(
  set: LicenseStateSetter,
  call: () => Promise<UserProfile | null>,
  errorContext: string,
  {
    applyProfile = true,
    invalidateCheck = true,
  }: { applyProfile?: boolean; invalidateCheck?: boolean } = {},
): Promise<UserProfile> {
  set({ licenseLoading: true });
  try {
    const profile = await call();
    if (!profile) throw new Error(errorContext);
    if (invalidateCheck) invalidateInFlightLicenseCheck();
    set(applyProfile ? { user: profile, licenseLoading: false } : { licenseLoading: false });
    return profile;
  } catch (err: unknown) {
    set({ licenseLoading: false });
    throw new Error(toErrorMessage(err, errorContext));
  }
}

export const createLicenseSlice: StateCreator<LicenseSlice, [], [], LicenseSlice> = (set, get) => ({
  user: null,
  licenseLoading: false,
  accountModalOpen: false,
  // تبدأ فارغة وتُملأ غير متزامنًا من AppData (hydrateAiUsageLogs)
  aiUsageLogs: DEFAULT_AI_LOGS,

  setAccountModalOpen: (open) => set({ accountModalOpen: open }),

  hydrateAiUsageLogs: () => {
    if (inFlightAiLogsLoad) return inFlightAiLogsLoad;
    inFlightAiLogsLoad = (async () => {
      try {
        const logs = await loadAiLogs();
        // لا نطغى على سجلات أُضيت أثناء التحميل (مكسب نادر لكن ممكن)
        const current = get().aiUsageLogs;
        if (current.length === 0) {
          set({ aiUsageLogs: logs });
        } else if (logs.length > current.length) {
          set({ aiUsageLogs: logs });
        }
        return logs;
      } finally {
        inFlightAiLogsLoad = null;
      }
    })();
    return inFlightAiLogsLoad;
  },

  logAiUsage: (record) => {
    const cryptoId =
      typeof window !== 'undefined' && window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : Date.now().toString(36);
    const newLog: AiUsageRecord = {
      ...record,
      id: `log_${Date.now()}_${cryptoId.slice(0, 8)}`,
      timestamp: new Date().toLocaleString('sv-SE').replace('T', ' '),
      // 🕒 مفتاح يوم UTC يُثبَّت وقت التسجيل ولا يُعاد اشتقاقه لاحقاً من الطابع المحلي
      utcDay: aiUtcDayKey(),
    };
    const updated = [newLog, ...get().aiUsageLogs];
    set({ aiUsageLogs: updated });
    void persistAiLogs(updated);
  },

  checkLicenseStatus: async ({ throwOnError = false } = {}) => {
    // Authentication invalidates the outcome, not the native request. Wait for
    // that request to settle, then re-read ownership so all waiters join one flight.
    while (inFlightCheck && inFlightCheck.epoch !== licenseCheckEpoch) {
      set({ licenseLoading: true });
      await inFlightCheck.promise.catch(() => undefined);
    }

    let flight = inFlightCheck;
    if (!flight) {
      const epoch = licenseCheckEpoch;
      const currentFlight: LicenseCheckFlight = {
        epoch,
        // Defer invocation until ownership is assigned, including synchronous
        // bridge throws. Never cancel/reset this work on a UI timeout.
        promise: Promise.resolve()
          .then(() => LicenseHandler.GetLicenseStatus())
          .then(
            (profile) => {
              // Go owns offline validation; keep every resolved value unchanged.
              if (epoch === licenseCheckEpoch) set({ user: profile });
              return profile;
            },
            (err: unknown) => {
              if (isSessionSupersededError(err)) {
                if (epoch === licenseCheckEpoch) {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('grido:auth-logout'));
                  }
                  set({ user: null, aiUsageLogs: [], accountModalOpen: true });
                }
              } else if (epoch === licenseCheckEpoch) {
                logger.error('Failed to check license status:', err);
              }
              // Preserve the raw bridge rejection, including the superseded marker.
              throw err;
            },
          )
          .finally(() => {
            if (inFlightCheck === currentFlight) {
              inFlightCheck = null;
              if (epoch === licenseCheckEpoch) set({ licenseLoading: false });
            }
          }),
      };
      inFlightCheck = currentFlight;
      flight = currentFlight;
      set({ licenseLoading: true });
    }

    let profile: UserProfile | null;
    try {
      profile = await flight.promise;
    } catch (err) {
      // Strict startup callers must recheck after any auth change, even when
      // the old session's rejection says it was superseded.
      if (throwOnError) {
        if (flight.epoch !== licenseCheckEpoch) throw new LicenseCheckInvalidatedError();
        throw err;
      }
      // Legacy callers still receive the original explicit supersession marker.
      if (isSessionSupersededError(err)) throw err;
      return get().user;
    }

    if (flight.epoch !== licenseCheckEpoch) {
      if (throwOnError) throw new LicenseCheckInvalidatedError();
      return get().user;
    }
    return profile;
  },

  registerAccount: (name, email, password) =>
    runProfileAuthAction(
      set,
      () => LicenseHandler.RegisterAccount(name, email, password),
      'فشل إنشاء الحساب',
    ),

  verifyOTP: (email, otp) =>
    runProfileAuthAction(set, () => LicenseHandler.VerifyOTP(email, otp), 'رمز التحقق غير صحيح'),

  resendOTP: (email) =>
    runProfileAuthAction(set, () => LicenseHandler.ResendOTP(email), 'فشل إعادة إرسال رمز التحقق', {
      applyProfile: false,
      invalidateCheck: false,
    }),

  loginAccount: (email, password) =>
    runProfileAuthAction(
      set,
      () => LicenseHandler.LoginAccount(email, password),
      'بريد إلكتروني أو كلمة مرور غير صحيحة',
    ),

  loginWithGoogle: () =>
    runProfileAuthAction(
      set,
      () => LicenseHandler.LoginWithGoogle(),
      'فشل تسجيل الدخول بواسطة Google',
    ),

  activateLicenseKey: (key) =>
    runProfileAuthAction(
      set,
      () => LicenseHandler.ActivateLicenseKey(key),
      'مفتاح تفعيل غير صالحة أو مستخدم سابقاً',
    ),

  // إجراء بلا ملف تعريف (بذري فقط) — شكله مختلف عن الغلاف فيُبقى صريحاً
  resetPassword: async (email) => {
    set({ licenseLoading: true });
    try {
      await LicenseHandler.ResetPassword(email);
    } catch (err: unknown) {
      const msg = toErrorMessage(err, 'فشل إرسال رابط إعادة تعيين كلمة المرور');
      throw new Error(msg);
    } finally {
      set({ licenseLoading: false });
    }
  },

  verifyRecoveryOTP: (email, token, newPassword) =>
    runProfileAuthAction(
      set,
      () => LicenseHandler.VerifyRecoveryOTP(email, token, newPassword),
      'فشل تعيين كلمة المرور الجديدة',
    ),

  logoutAccount: async () => {
    // إبطال أي فحص ترخيص in-flight حتى لا يعيد الجلسة بعد الخروج (إصلاح Bug#4)
    licenseCheckEpoch++;
    try {
      if (typeof LicenseHandler.Logout === 'function') {
        await LicenseHandler.Logout();
      }
    } catch (err) {
      logger.error('Failed to execute backend Logout:', err);
    } finally {
      // #18 — مسح سجلات AI ولقطة الحصة الخادمية من الذاكرة عند الخروج لمنع تسريبها للجلسة التالية
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('grido:auth-logout'));
      }
      set({ user: null, licenseLoading: false, aiUsageLogs: [] });
    }
  },

  isLicenseActive: () => {
    const user = get().user;
    if (!user) return false;
    if (user.plan === 'pro' || user.plan === 'enterprise') {
      if (user.status === 'active' && new Date(user.expiresAt).getTime() > Date.now()) {
        return true;
      }
    } else if (user.plan === 'trial') {
      if (user.status === 'active' && new Date(user.expiresAt).getTime() > Date.now()) {
        return true;
      }
    }
    return false;
  },
});
