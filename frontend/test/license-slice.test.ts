import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';
import * as LicenseHandler from '../wailsjs/go/handlers/LicenseHandler';

vi.mock('../wailsjs/go/handlers/LicenseHandler', () => ({
  GetLicenseStatus: vi.fn(),
  RegisterAccount: vi.fn(),
  LoginAccount: vi.fn(),
  VerifyOTP: vi.fn(),
  ResendOTP: vi.fn(),
  LoginWithGoogle: vi.fn(),
  ActivateLicenseKey: vi.fn(),
  ResetPassword: vi.fn(),
  VerifyRecoveryOTP: vi.fn(),
  Logout: vi.fn(),
}));

describe('LicenseSlice Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
    localStorage.clear();
  });

  it('should initialize with default license slice state', () => {
    const state = useEditorStore.getState();
    expect(state.user).toBeNull();
    expect(state.licenseLoading).toBe(false);
    expect(state.accountModalOpen).toBe(false);
    expect(state.aiUsageLogs).toEqual([]);
  });

  it('checkLicenseStatus updates user on success', async () => {
    const mockUser = {
      id: 'usr_1',
      name: 'Ali Hassan',
      email: 'ali@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    } as any;

    vi.mocked(LicenseHandler.GetLicenseStatus).mockResolvedValueOnce(mockUser);

    const profile = await useEditorStore.getState().checkLicenseStatus();
    expect(profile).toEqual(mockUser);
    expect(useEditorStore.getState().user).toEqual(mockUser);
    expect(useEditorStore.getState().licenseLoading).toBe(false);
  });

  it('checkLicenseStatus keeps session on network error (offline grace)', async () => {
    // أولاً: جلسة صالحة موجودة
    const mockUser = {
      id: 'usr_1',
      name: 'Ali Hassan',
      email: 'ali@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    } as any;
    vi.mocked(LicenseHandler.GetLicenseStatus).mockResolvedValueOnce(mockUser);
    await useEditorStore.getState().checkLicenseStatus();

    // عند فشل الشبكة لاحقاً: تبقى الجلسة ولا يُقفل التطبيق على المستخدم
    vi.mocked(LicenseHandler.GetLicenseStatus).mockRejectedValueOnce(new Error('Network error'));
    const profile = await useEditorStore.getState().checkLicenseStatus();
    expect(profile).toEqual(mockUser);
    expect(useEditorStore.getState().user).toEqual(mockUser);
    expect(useEditorStore.getState().licenseLoading).toBe(false);
  });

  it('checkLicenseStatus clears user only on explicit server response of no-session', async () => {
    // ردّ خادم صريح بحالة «لا جلسة» (ليس خطأ شبكة) يصفّر المستخدم
    const noSession = { id: '', name: '', email: '', plan: 'free', status: 'none', expiresAt: '' } as any;
    vi.mocked(LicenseHandler.GetLicenseStatus).mockResolvedValueOnce(noSession);
    await useEditorStore.getState().checkLicenseStatus();
    expect(useEditorStore.getState().user).toEqual(noSession);
  });

  it('registerAccount succeeds and sets user', async () => {
    const mockUser = {
      id: 'usr_2',
      name: 'New User',
      email: 'new@example.com',
      plan: 'trial',
      status: 'pending_otp',
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    } as any;

    vi.mocked(LicenseHandler.RegisterAccount).mockResolvedValueOnce(mockUser);

    const profile = await useEditorStore.getState().registerAccount('New User', 'new@example.com', 'pass123');
    expect(LicenseHandler.RegisterAccount).toHaveBeenCalledWith('New User', 'new@example.com', 'pass123');
    expect(profile).toEqual(mockUser);
    expect(useEditorStore.getState().user).toEqual(mockUser);
  });

  it('loginAccount succeeds and sets user', async () => {
    const mockUser = {
      id: 'usr_3',
      name: 'Logged In User',
      email: 'login@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      token: 'tok_123',
    } as any;

    vi.mocked(LicenseHandler.LoginAccount).mockResolvedValueOnce(mockUser);

    const profile = await useEditorStore.getState().loginAccount('login@example.com', 'pass123');
    expect(LicenseHandler.LoginAccount).toHaveBeenCalledWith('login@example.com', 'pass123');
    expect(profile).toEqual(mockUser);
    expect(useEditorStore.getState().user).toEqual(mockUser);
  });

  it('verifyOTP succeeds and sets user', async () => {
    const mockUser = {
      id: 'usr_4',
      name: 'Verified User',
      email: 'otp@example.com',
      plan: 'trial',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      token: 'tok_otp',
    } as any;

    vi.mocked(LicenseHandler.VerifyOTP).mockResolvedValueOnce(mockUser);

    const profile = await useEditorStore.getState().verifyOTP('otp@example.com', '123456');
    expect(LicenseHandler.VerifyOTP).toHaveBeenCalledWith('otp@example.com', '123456');
    expect(profile).toEqual(mockUser);
    expect(useEditorStore.getState().user).toEqual(mockUser);
  });

  it('resendOTP calls LicenseHandler.ResendOTP', async () => {
    const mockUser = {
      id: 'usr_5',
      name: 'Resend User',
      email: 'resend@example.com',
      plan: 'trial',
      status: 'pending_otp',
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    } as any;

    vi.mocked(LicenseHandler.ResendOTP).mockResolvedValueOnce(mockUser);

    const profile = await useEditorStore.getState().resendOTP('resend@example.com');
    expect(LicenseHandler.ResendOTP).toHaveBeenCalledWith('resend@example.com');
    expect(profile).toEqual(mockUser);
  });

  it('loginWithGoogle succeeds and sets user', async () => {
    const mockUser = {
      id: 'usr_google',
      name: 'Google User',
      email: 'google@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      token: 'tok_google',
    } as any;

    vi.mocked(LicenseHandler.LoginWithGoogle).mockResolvedValueOnce(mockUser);

    const profile = await useEditorStore.getState().loginWithGoogle();
    expect(LicenseHandler.LoginWithGoogle).toHaveBeenCalled();
    expect(profile).toEqual(mockUser);
    expect(useEditorStore.getState().user).toEqual(mockUser);
  });

  it('activateLicenseKey succeeds and sets user', async () => {
    const mockUser = {
      id: 'usr_pro',
      name: 'Pro User',
      email: 'pro@example.com',
      plan: 'pro',
      status: 'active',
      licenseKey: 'GRIDO-PRO-TEST-KEY',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    } as any;

    vi.mocked(LicenseHandler.ActivateLicenseKey).mockResolvedValueOnce(mockUser);

    const profile = await useEditorStore.getState().activateLicenseKey('GRIDO-PRO-TEST-KEY');
    expect(LicenseHandler.ActivateLicenseKey).toHaveBeenCalledWith('GRIDO-PRO-TEST-KEY');
    expect(profile).toEqual(mockUser);
    expect(useEditorStore.getState().user).toEqual(mockUser);
  });

  it('resetPassword calls LicenseHandler.ResetPassword', async () => {
    vi.mocked(LicenseHandler.ResetPassword).mockResolvedValueOnce('OK');

    await useEditorStore.getState().resetPassword('reset@example.com');
    expect(LicenseHandler.ResetPassword).toHaveBeenCalledWith('reset@example.com');
  });

  it('verifyRecoveryOTP calls LicenseHandler.VerifyRecoveryOTP and updates user', async () => {
    const mockUser = { id: 'usr_rec', email: 'rec@example.com', plan: 'pro', status: 'active', expiresAt: '2027-01-01T00:00:00Z', token: 'token123' } as any;
    vi.mocked(LicenseHandler.VerifyRecoveryOTP).mockResolvedValueOnce(mockUser);

    const profile = await useEditorStore.getState().verifyRecoveryOTP('rec@example.com', '123456', 'newpass123');
    expect(LicenseHandler.VerifyRecoveryOTP).toHaveBeenCalledWith('rec@example.com', '123456', 'newpass123');
    expect(profile).toEqual(mockUser);
    expect(useEditorStore.getState().user).toEqual(mockUser);
  });


  it('logoutAccount calls LicenseHandler.Logout and clears user', async () => {
    useEditorStore.setState({
      user: { id: 'usr_1', email: 'test@example.com' } as any
    });

    vi.mocked(LicenseHandler.Logout).mockResolvedValueOnce('Logged out');

    await useEditorStore.getState().logoutAccount();
    expect(LicenseHandler.Logout).toHaveBeenCalled();
    expect(useEditorStore.getState().user).toBeNull();
  });

  it('isLicenseActive evaluates correctly for different user states', () => {
    const store = useEditorStore.getState();

    // 1. No user
    useEditorStore.setState({ user: null });
    expect(store.isLicenseActive()).toBe(false);

    // 2. Active Pro user unexpired
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      } as any
    });
    expect(store.isLicenseActive()).toBe(true);

    // 3. Expired Pro user
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() - 100000).toISOString(),
      } as any
    });
    expect(store.isLicenseActive()).toBe(false);

    // 4. Inactive Pro user status
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'inactive',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      } as any
    });
    expect(store.isLicenseActive()).toBe(false);

    // 5. Active Trial user unexpired
    useEditorStore.setState({
      user: {
        plan: 'trial',
        status: 'active',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      } as any
    });
    expect(store.isLicenseActive()).toBe(true);

    // 6. Free user
    useEditorStore.setState({
      user: {
        plan: 'free',
        status: 'active',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      } as any
    });
    expect(store.isLicenseActive()).toBe(false);
  });

  it('logAiUsage appends records and persists to localStorage', () => {
    const store = useEditorStore.getState();
    store.logAiUsage({
      email: 'test@example.com',
      serviceName: 'عزل الخلفية الذكي',
      source: 'Grido Studio Desktop (Windows)',
      durationSec: 1.5,
      costUsd: 0.002,
      status: 'success',
    });

    const logs = useEditorStore.getState().aiUsageLogs;
    expect(logs.length).toBe(1);
    expect(logs[0].serviceName).toBe('عزل الخلفية الذكي');
    expect(logs[0].status).toBe('success');

    const saved = localStorage.getItem('grido_ai_usage_logs');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].email).toBe('test@example.com');
  });
});
