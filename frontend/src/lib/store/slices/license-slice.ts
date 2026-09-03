import { StateCreator } from "zustand";
import * as LicenseHandler from "../../../../wailsjs/go/handlers/LicenseHandler";
import * as App from "../../../../wailsjs/go/main/App";
import { domain } from "../../../../wailsjs/go/models";

export type UserProfile = domain.UserProfile;

export interface AiUsageRecord {
  id: string;
  email: string;
  serviceName: string; // "ترميم الوجوه بالذكاء الاصطناعي (GFPGAN v1.4)" | "عزل الخلفية الذكي"
  source: string; // "Grido Studio Desktop (Windows)"
  durationSec: number;
  costUsd: number;
  status: "success" | "failed";
  timestamp: string;
}

export interface LicenseSlice {
  user: UserProfile | null;
  licenseLoading: boolean;
  accountModalOpen: boolean;
  aiUsageLogs: AiUsageRecord[];

  setAccountModalOpen: (open: boolean) => void;
  checkLicenseStatus: () => Promise<UserProfile | null>;
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

  logAiUsage: (record: Omit<AiUsageRecord, "id" | "timestamp">) => void;
}

const DEFAULT_AI_LOGS: AiUsageRecord[] = [];
const AI_LOGS_STORAGE_KEY = "grido_ai_usage_logs";
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
      console.error("Failed to persist AI log:", wailsErr, lsErr);
    }
  }
}

/**
 * استرجاع السجلات من AppData مع ترحيل شفاف من localStorage القديم:
 * إن كان ملف AppData فارغاً و localStorage يحوي بيانات قديمة، تُرحّل
 * ثم يُمسح localStorage لتفادي التكرار مستقبلاً.
 */
async function loadAiLogs(): Promise<AiUsageRecord[]> {
  let saved: string = "";
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
        void persistAiLogs(migrated);
      }
      localStorage.removeItem(AI_LOGS_STORAGE_KEY);
      return migrated;
    }
  } catch {
    // JSON تالف — نبدأ نظيفين
  }
  return DEFAULT_AI_LOGS;
}

// جيل الطلبات: يمنع نداء checkLicenseStatus قديماً (in-flight) من استعادة
// جلسة بعد تسجيل الخروج (إصلاح Bug#4 — race guard)
let licenseCheckEpoch = 0;
// 🛡️ Single-flight: نداءان متزامنان عند الإقلاع (StrictMode يستدعي التأثير
// مرتين) يتشاركان نفس الوعد — بدلاً من أن يعيد النداء الأقدم get().user
// وهي null قبل اكتمال الأحدث، فيفتح نافذة الحساب زوراً رغم وجود جلسة صالحة.
let inFlightCheck: Promise<UserProfile | null> | null = null;

// 🛡️ Single-flight لتحميل السجلات: StrictMode يستدعي تأثير الإقلاع مرتين —
// نداءان متزامنان يتشاركان نفس الوعد بدل تحميل الملف مرتين
let inFlightAiLogsLoad: Promise<AiUsageRecord[]> | null = null;

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
    const cryptoId = typeof window !== "undefined" && window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36);
    const newLog: AiUsageRecord = {
      ...record,
      id: `log_${Date.now()}_${cryptoId.slice(0, 8)}`,
      timestamp: new Date().toLocaleString("sv-SE").replace("T", " "),
    };
    const updated = [newLog, ...get().aiUsageLogs];
    set({ aiUsageLogs: updated });
    void persistAiLogs(updated);
  },

  checkLicenseStatus: async () => {
    // 🛡️ Single-flight: أعد نفس الوعد إن كان فحص جارٍ بالفعل
    if (inFlightCheck) return inFlightCheck;

    const epoch = ++licenseCheckEpoch;
    set({ licenseLoading: true });

    inFlightCheck = (async () => {
      try {
        const profile = await LicenseHandler.GetLicenseStatus();
        // تجاهل نتيجة قديمة إذا بدأ نداء أحدث أو سجّل المستخدم الخروج أثناء الانتظار
        if (epoch !== licenseCheckEpoch) return get().user;
        set({ user: profile, licenseLoading: false });
        return profile;
      } catch (err) {
        // فشل شبكة/عطل مؤقت → نبقي الجلسة الحالية (سماح عدم الاتصال) بدل قفل
        // المستخدم خارجاً فجأة. تصفير الجلسة يحدث فقط بردّ خادم صريح بأن
        // الترخيص غير صالح (يصل عبر profile بنجاح النداء أعلاه).
        console.error("Failed to check license status (network error, keeping session):", err);
        if (epoch === licenseCheckEpoch) set({ licenseLoading: false });
        return get().user;
      } finally {
        inFlightCheck = null;
      }
    })();

    return inFlightCheck;
  },

  registerAccount: async (name, email, password) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.RegisterAccount(name, email, password);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: unknown) {
      set({ licenseLoading: false });
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشل إنشاء الحساب");
      throw new Error(msg);
    }
  },

  verifyOTP: async (email, otp) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.VerifyOTP(email, otp);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: unknown) {
      set({ licenseLoading: false });
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "رمز التحقق غير صحيح");
      throw new Error(msg);
    }
  },

  resendOTP: async (email) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.ResendOTP(email);
      set({ licenseLoading: false });
      return profile;
    } catch (err: unknown) {
      set({ licenseLoading: false });
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشل إعادة إرسال رمز التحقق");
      throw new Error(msg);
    }
  },

  loginAccount: async (email, password) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.LoginAccount(email, password);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: unknown) {
      set({ licenseLoading: false });
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "بريد إلكتروني أو كلمة مرور غير صحيحة");
      throw new Error(msg);
    }
  },

  loginWithGoogle: async () => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.LoginWithGoogle();
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: unknown) {
      set({ licenseLoading: false });
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشل تسجيل الدخول بواسطة Google");
      throw new Error(msg);
    }
  },

  activateLicenseKey: async (key) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.ActivateLicenseKey(key);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: unknown) {
      set({ licenseLoading: false });
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "مفتاح تفعيل غير صالحة أو مستخدم سابقاً");
      throw new Error(msg);
    }
  },

  resetPassword: async (email) => {
    set({ licenseLoading: true });
    try {
      await LicenseHandler.ResetPassword(email);
    } catch (err: unknown) {
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشل إرسال رابط إعادة تعيين كلمة المرور");
      throw new Error(msg);
    } finally {
      set({ licenseLoading: false });
    }
  },

  verifyRecoveryOTP: async (email, token, newPassword) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.VerifyRecoveryOTP(email, token, newPassword);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: unknown) {
      set({ licenseLoading: false });
      const msg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشل تعيين كلمة المرور الجديدة");
      throw new Error(msg);
    }
  },


  logoutAccount: async () => {
    // إبطال أي فحص ترخيص in-flight حتى لا يعيد الجلسة بعد الخروج (إصلاح Bug#4)
    licenseCheckEpoch++;
    try {
      if (typeof LicenseHandler.Logout === "function") {
        await LicenseHandler.Logout();
      }
    } catch (err) {
      console.error("Failed to execute backend Logout:", err);
    } finally {
      set({ user: null, licenseLoading: false });
    }
  },

  isLicenseActive: () => {
    const user = get().user;
    if (!user) return false;
    if (user.plan === "pro" || user.plan === "enterprise") {
      if (user.status === "active" && new Date(user.expiresAt).getTime() > Date.now()) {
        return true;
      }
    } else if (user.plan === "trial") {
      if (user.status === "active" && new Date(user.expiresAt).getTime() > Date.now()) {
        return true;
      }
    }
    return false;
  },
});
