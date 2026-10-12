/**
 * admin/types — الأنواع المشتركة المستخرجة verbatim من AdminDashboard.tsx (سطور ~44-75).
 * لا منطق هنا، فقط تعريفات للاستخدام المشترك بين الخطافات والمكوّنات.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  plan: string;
  expires_at: string;
  license_key: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LicenseKey {
  key: string;
  plan: string;
  duration_months: number;
  status: string;
  user_id: string;
  created_at: string;
  activated_at: string;
}

export interface AiUsageRecord {
  id: string;
  user_id: string;
  used_at: string;
  image_bytes: number;
  execution_seconds: number;
  cost_usd: number;
  user_email?: string;
}

export type ActiveTab = 'users' | 'keys' | 'usage' | 'stats' | 'settings';

export type UserStatusFilter =
  | 'all'
  | 'pro'
  | 'enterprise'
  | 'trial'
  | 'free'
  | 'expired'
  | 'banned';

export type KeyStatusFilter = 'all' | 'unused' | 'used' | 'revoked';

export type GenMode = 'single' | 'batch';

export type GenPlan = 'pro' | 'enterprise';
