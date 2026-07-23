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
  
  logAiUsage: (record: Omit<AiUsageRecord, "id" | "timestamp">) => void;
}

const DEFAULT_AI_LOGS: AiUsageRecord[] = [];

export const createLicenseSlice: StateCreator<LicenseSlice, [], [], LicenseSlice> = (set, get) => ({
  user: null,
  licenseLoading: false,
  accountModalOpen: false,
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
    const cryptoId = typeof window !== "undefined" && window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36);
    const newLog: AiUsageRecord = {
      ...record,
      id: `log_${Date.now()}_${cryptoId.slice(0, 8)}`,
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
    try {
      if (typeof LicenseHandler.Logout === "function") {
        await LicenseHandler.Logout();
      }
    } catch (err) {
      console.error("Failed to execute backend Logout:", err);
    } finally {
      set({ user: null });
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
      if (new Date(user.expiresAt).getTime() > Date.now()) {
        return true;
      }
    }
    return false;
  },
});
