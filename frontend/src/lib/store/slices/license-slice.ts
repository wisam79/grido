import { StateCreator } from "zustand";
import * as LicenseHandler from "../../../../wailsjs/go/handlers/LicenseHandler";
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
  adminUsers: UserProfile[];
  aiUsageLogs: AiUsageRecord[];

  setAccountModalOpen: (open: boolean) => void;
  checkLicenseStatus: () => Promise<UserProfile | null>;
  registerAccount: (name: string, email: string, password: string) => Promise<UserProfile>;
  loginAccount: (email: string, password: string) => Promise<UserProfile>;
  verifyOTP: (email: string, otp: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  activateLicenseKey: (key: string) => Promise<UserProfile>;
  logoutAccount: () => Promise<void>;
  isLicenseActive: () => boolean;
  
  // Admin Operations
  adminFetchAllUsers: () => Promise<UserProfile[]>;
  adminGenerateKey: (plan: string, durationMonths: number) => Promise<string>;
  adminRevokeLicense: (email: string) => Promise<void>;
  adminExtendLicense: (email: string, months: number) => Promise<void>;
  logAiUsage: (record: Omit<AiUsageRecord, "id" | "timestamp">) => void;
}

const DEFAULT_AI_LOGS: AiUsageRecord[] = [
  {
    id: "log_1",
    email: "wisamsamir78@gmail.com",
    serviceName: "ترميم الوجوه بالذكاء الاصطناعي (GFPGAN v1.4)",
    source: "Grido Studio Desktop (Windows)",
    durationSec: 2.35,
    costUsd: 0.001329,
    status: "success",
    timestamp: "2026-07-19 19:55:12",
  },
  {
    id: "log_2",
    email: "wisamsamir78@gmail.com",
    serviceName: "ترميم الوجوه بالذكاء الاصطناعي (GFPGAN v1.4)",
    source: "Grido Studio Desktop (Windows)",
    durationSec: 2.10,
    costUsd: 0.001252,
    status: "success",
    timestamp: "2026-07-19 19:42:08",
  },
  {
    id: "log_3",
    email: "studio_account_02@grido.app",
    serviceName: "عزل الخلفية الذكي (AI Background Removal)",
    source: "Grido Studio Desktop (Windows)",
    durationSec: 1.80,
    costUsd: 0.000550,
    status: "success",
    timestamp: "2026-07-19 18:30:15",
  },
  {
    id: "log_4",
    email: "studio_account_05@grido.app",
    serviceName: "ترميم الوجوه بالذكاء الاصطناعي (GFPGAN v1.4)",
    source: "Grido Studio Desktop (Windows)",
    durationSec: 2.80,
    costUsd: 0.001466,
    status: "success",
    timestamp: "2026-07-19 17:15:40",
  },
];

export const createLicenseSlice: StateCreator<LicenseSlice, [], [], LicenseSlice> = (set, get) => ({
  user: null,
  licenseLoading: false,
  accountModalOpen: false,
  adminUsers: [],
  aiUsageLogs: (() => {
    try {
      const saved = localStorage.getItem("grido_ai_usage_logs");
      return saved ? JSON.parse(saved) : DEFAULT_AI_LOGS;
    } catch {
      return DEFAULT_AI_LOGS;
    }
  })(),

  setAccountModalOpen: (open) => set({ accountModalOpen: open }),

  logAiUsage: (record) => {
    const newLog: AiUsageRecord = {
      ...record,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleString("sv-SE").replace("T", " "),
    };
    const updated = [newLog, ...get().aiUsageLogs];
    set({ aiUsageLogs: updated });
    try {
      localStorage.setItem("grido_ai_usage_logs", JSON.stringify(updated.slice(0, 200)));
    } catch (err) {
      console.error("Failed to persist AI log:", err);
    }
  },

  checkLicenseStatus: async () => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.GetLicenseStatus();
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err) {
      console.error("Failed to check license status:", err);
      set({ user: null, licenseLoading: false });
      return null;
    }
  },

  registerAccount: async (name, email, password) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.RegisterAccount(name, email, password);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: any) {
      set({ licenseLoading: false });
      throw new Error(err || "فشل إنشاء الحساب");
    }
  },

  verifyOTP: async (email, otp) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.VerifyOTP(email, otp);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: any) {
      set({ licenseLoading: false });
      throw new Error(err || "رمز التحقق غير صحيح");
    }
  },

  loginAccount: async (email, password) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.LoginAccount(email, password);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: any) {
      set({ licenseLoading: false });
      throw new Error(err || "بريد إلكتروني أو كلمة مرور غير صحيحة");
    }
  },

  loginWithGoogle: async () => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.LoginWithGoogle();
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: any) {
      set({ licenseLoading: false });
      throw new Error(err || "فشل تسجيل الدخول بواسطة Google");
    }
  },

  activateLicenseKey: async (key) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.ActivateLicenseKey(key);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err: any) {
      set({ licenseLoading: false });
      throw new Error(err || "مفتاح تفعيل غير صالحة أو مستخدم سابقاً");
    }
  },

  logoutAccount: async () => {
    set({ user: null });
  },

  isLicenseActive: () => {
    const user = get().user;
    if (!user) return false;
    if (user.plan === "pro" || user.plan === "enterprise") {
      if (user.status === "active" && new Date(user.expiresAt).getTime() > Date.now()) {
        return true;
      }
    } else if (user.plan === "trial") {
      if (new Date(user.expiresAt).getTime() > Date.now()) {
        return true;
      }
    }
    return false;
  },

  adminFetchAllUsers: async () => {
    set({ licenseLoading: true });
    try {
      const users = await LicenseHandler.AdminGetAllUsers();
      const mapped = users || [];
      set({ adminUsers: mapped, licenseLoading: false });
      return mapped;
    } catch (err) {
      console.error("Failed to fetch admin users:", err);
      set({ licenseLoading: false });
      return [];
    }
  },

  adminGenerateKey: async (plan, durationMonths) => {
    set({ licenseLoading: true });
    try {
      const key = await LicenseHandler.AdminGenerateKey(plan, durationMonths);
      set({ licenseLoading: false });
      return key;
    } catch (err: any) {
      set({ licenseLoading: false });
      throw new Error(err || "فشل توليد المفتاح");
    }
  },

  adminRevokeLicense: async (email) => {
    set({ licenseLoading: true });
    try {
      await LicenseHandler.AdminRevokeUserLicense(email);
      await get().adminFetchAllUsers();
    } catch (err: any) {
      set({ licenseLoading: false });
      throw new Error(err || "فشل إلغاء الترخيص");
    }
  },

  adminExtendLicense: async (email, months) => {
    set({ licenseLoading: true });
    try {
      await LicenseHandler.AdminExtendUserLicense(email, months);
      await get().adminFetchAllUsers();
    } catch (err: any) {
      set({ licenseLoading: false });
      throw new Error(err || "فشل تمديد الترخيص");
    }
  },
});
