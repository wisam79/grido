import { StateCreator } from "zustand";
import * as LicenseHandler from "../../../../wailsjs/go/handlers/LicenseHandler";
import { domain } from "../../../../wailsjs/go/models";

export type UserProfile = domain.UserProfile;

export interface LicenseSlice {
  user: UserProfile | null;
  licenseLoading: boolean;
  accountModalOpen: boolean;
  adminUsers: UserProfile[];

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
}

export const createLicenseSlice: StateCreator<LicenseSlice, [], [], LicenseSlice> = (set, get) => ({
  user: null,
  licenseLoading: false,
  accountModalOpen: false,
  adminUsers: [],

  setAccountModalOpen: (open) => set({ accountModalOpen: open }),

  checkLicenseStatus: async () => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.GetLicenseStatus();
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err) {
      console.error("Failed to check license status:", err);
      set({ licenseLoading: false });
      return null;
    }
  },

  registerAccount: async (name, email, password) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.RegisterAccount(name, email, password);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err) {
      set({ licenseLoading: false });
      throw err;
    }
  },

  loginAccount: async (email, password) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.LoginAccount(email, password);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err) {
      set({ licenseLoading: false });
      throw err;
    }
  },

  verifyOTP: async (email, otp) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.VerifyOTP(email, otp);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err) {
      set({ licenseLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async () => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.LoginWithGoogle();
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err) {
      set({ licenseLoading: false });
      throw err;
    }
  },

  activateLicenseKey: async (key) => {
    set({ licenseLoading: true });
    try {
      const profile = await LicenseHandler.ActivateLicenseKey(key);
      set({ user: profile, licenseLoading: false });
      return profile;
    } catch (err) {
      set({ licenseLoading: false });
      throw err;
    }
  },

  logoutAccount: async () => {
    set({ licenseLoading: true });
    try {
      await LicenseHandler.Logout();
      set({ user: { plan: "free", status: "none" } as any, licenseLoading: false });
    } catch (err) {
      console.error("Failed to logout:", err);
      set({ licenseLoading: false });
    }
  },

  isLicenseActive: () => {
    const user = get().user;
    if (!user) return false;
    
    // Pro and Enterprise plans are active if status is active and not expired
    if (user.plan === "pro" || user.plan === "enterprise") {
      return user.status === "active" && new Date(user.expiresAt) > new Date();
    }
    
    // Trial plan is active if expiry date is in the future
    if (user.plan === "trial") {
      return new Date(user.expiresAt) > new Date();
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
      console.error("Failed to fetch all users:", err);
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
    } catch (err) {
      set({ licenseLoading: false });
      throw err;
    }
  },

  adminRevokeLicense: async (email) => {
    set({ licenseLoading: true });
    try {
      await LicenseHandler.AdminRevokeUserLicense(email);
      set({ licenseLoading: false });
      // Refresh local list
      await get().adminFetchAllUsers();
      // If revoking current user, refresh status
      const currentUser = get().user;
      if (currentUser && currentUser.email === email) {
        await get().checkLicenseStatus();
      }
    } catch (err) {
      set({ licenseLoading: false });
      throw err;
    }
  },

  adminExtendLicense: async (email, months) => {
    set({ licenseLoading: true });
    try {
      await LicenseHandler.AdminExtendUserLicense(email, months);
      set({ licenseLoading: false });
      // Refresh local list
      await get().adminFetchAllUsers();
      // If extending current user, refresh status
      const currentUser = get().user;
      if (currentUser && currentUser.email === email) {
        await get().checkLicenseStatus();
      }
    } catch (err) {
      set({ licenseLoading: false });
      throw err;
    }
  },
});
