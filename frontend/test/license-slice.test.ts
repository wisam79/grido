import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useEditorStore } from '../src/lib/editor-store';
import {
  isLicenseCheckInvalidatedError,
  isSessionSupersededError,
  sessionSupersededMessage,
} from '../src/lib/store/slices/license-slice';
import * as LicenseHandler from '../wailsjs/go/handlers/LicenseHandler';

import type { UserProfile } from '../src/lib/store/slices/license-slice';

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

vi.mock('../wailsjs/go/main/App', () => ({
  SaveAiUsageLogs: vi.fn(() => Promise.reject(new Error('Wails bridge not available in test'))),
  LoadAiUsageLogs: vi.fn(() => Promise.resolve('[]')),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function deferLicenseCheck() {
  const pending = deferred<UserProfile | null>();
  const cancel = vi.fn();
  // Test-only bridge adaptation: this ordinary deferred promise deliberately
  // omits Wails' cancelOn/cancellable chaining; cancellation must not be used.
  vi.mocked(LicenseHandler.GetLicenseStatus).mockReturnValueOnce(
    Object.assign(pending.promise, { cancel }) as unknown as ReturnType<
      typeof LicenseHandler.GetLicenseStatus
    >,
  );
  return { ...pending, cancel };
}

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'cached-user',
    name: 'Cached User',
    email: 'cached@example.com',
    plan: 'pro',
    status: 'active',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    token: 'cached-token',
    refreshToken: '',
    createdAt: '',
    updatedAt: '',
    licenseKey: '',
    ...overrides,
  };
}

describe('LicenseSlice Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
    useEditorStore.setState({
      user: null,
      licenseLoading: false,
      accountModalOpen: false,
      aiUsageLogs: [],
    });
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
    const noSession = {
      id: '',
      name: '',
      email: '',
      plan: 'free',
      status: 'none',
      expiresAt: '',
    } as any;
    vi.mocked(LicenseHandler.GetLicenseStatus).mockResolvedValueOnce(noSession);
    await useEditorStore.getState().checkLicenseStatus();
    expect(useEditorStore.getState().user).toEqual(noSession);
  });

  it('checkLicenseStatus evicts session with explicit message when superseded on another device', async () => {
    // جلسة صالحة موجودة ثم الخادم يثبت طردها (دخول أحدث من جهاز آخر)
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

    vi.mocked(LicenseHandler.GetLicenseStatus).mockRejectedValueOnce(
      new Error(
        'ERR_SESSION_SUPERSEDED: تم تسجيل الدخول إلى حسابك من جهاز آخر — هذه الجلسة لم تعد نشطة',
      ),
    );
    await expect(useEditorStore.getState().checkLicenseStatus()).rejects.toThrow('جهاز آخر');
    // الطرد: تصفير الجلسة + فتح نافذة الحساب (رسالة الطرد تُعرض من App.tsx)
    expect(useEditorStore.getState().user).toBeNull();
    expect(useEditorStore.getState().accountModalOpen).toBe(true);
    expect(useEditorStore.getState().licenseLoading).toBe(false);
  });

  it.each(['default', 'strict'] as const)(
    'shares a successful native check when the %s caller starts first',
    async (firstMode) => {
      const pending = deferLicenseCheck();
      const profile = makeUser({ id: 'backend-offline-profile' });
      const check = useEditorStore.getState().checkLicenseStatus;
      const first = check(firstMode === 'strict' ? { throwOnError: true } : undefined);
      const second = check(firstMode === 'default' ? { throwOnError: true } : undefined);
      const third = check({ throwOnError: true });

      await Promise.resolve();
      expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(1);
      expect(useEditorStore.getState().licenseLoading).toBe(true);
      pending.resolve(profile);

      const results = await Promise.all([first, second, third]);
      results.forEach((result) => expect(result).toBe(profile));
      expect(useEditorStore.getState().user).toBe(profile);
      expect(useEditorStore.getState().licenseLoading).toBe(false);
      expect(pending.cancel).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['validated cached profile', makeUser({ id: 'offline-cache' })],
    ['expired profile', makeUser({ status: 'expired', expiresAt: '2000-01-01T00:00:00Z' })],
    ['no-session profile', makeUser({ id: '', plan: 'free', status: 'none', expiresAt: '' })],
    ['null', null],
  ] as const)(
    'strict checks preserve a resolved %s without new policy',
    async (_label, profile) => {
      useEditorStore.setState({ user: makeUser() });
      const pending = deferLicenseCheck();
      const check = useEditorStore.getState().checkLicenseStatus({ throwOnError: true });
      pending.resolve(profile);

      await expect(check).resolves.toBe(profile);
      expect(useEditorStore.getState().user).toBe(profile);
      expect(useEditorStore.getState().licenseLoading).toBe(false);
    },
  );

  it.each(['default', 'strict'] as const)(
    'keeps error modes independent when the %s caller starts first and allows retry',
    async (firstMode) => {
      const cached = makeUser();
      useEditorStore.setState({ user: cached });
      const pending = deferLicenseCheck();
      const check = useEditorStore.getState().checkLicenseStatus;
      const first = check(firstMode === 'strict' ? { throwOnError: true } : undefined);
      const second = check(firstMode === 'default' ? { throwOnError: true } : undefined);
      const strict = firstMode === 'strict' ? first : second;
      const legacy = firstMode === 'default' ? first : second;
      const bridgeError = new Error('Native bridge unavailable');
      const strictResult = expect(strict).rejects.toBe(bridgeError);
      const legacyResult = expect(legacy).resolves.toBe(cached);

      await Promise.resolve();
      expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(1);
      pending.reject(bridgeError);
      await Promise.all([strictResult, legacyResult]);
      expect(useEditorStore.getState().user).toBe(cached);
      expect(useEditorStore.getState().licenseLoading).toBe(false);
      expect(useEditorStore.getState().accountModalOpen).toBe(false);

      const retry = deferLicenseCheck();
      const fresh = makeUser({ id: 'retried-user' });
      const retryCheck = check({ throwOnError: true });
      await Promise.resolve();
      expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(2);
      retry.resolve(fresh);
      await expect(retryCheck).resolves.toBe(fresh);
      expect(useEditorStore.getState().user).toBe(fresh);
      expect(pending.cancel).not.toHaveBeenCalled();
      expect(retry.cancel).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['Error', new Error('Native bridge failed')],
    ['string', 'Native bridge failed'],
    ['object', { message: 'Native bridge failed', code: 'IPC_FAILURE' }],
  ])(
    'strict checks reject the actual %s bridge error without an in-memory fallback',
    async (_label, error) => {
      const cached = makeUser();
      useEditorStore.setState({ user: cached });
      const pending = deferLicenseCheck();
      const result = expect(
        useEditorStore.getState().checkLicenseStatus({ throwOnError: true }),
      ).rejects.toBe(error);
      pending.reject(error);

      await result;
      expect(useEditorStore.getState().user).toBe(cached);
      expect(useEditorStore.getState().licenseLoading).toBe(false);
      expect(isLicenseCheckInvalidatedError(error)).toBe(false);
    },
  );

  it('default checks still resolve null on generic failure without a cached user', async () => {
    const pending = deferLicenseCheck();
    const check = useEditorStore.getState().checkLicenseStatus({ throwOnError: false });
    pending.reject(new Error('Bridge disconnected'));

    await expect(check).resolves.toBeNull();
    expect(useEditorStore.getState().licenseLoading).toBe(false);
  });

  it.each([
    new Error('ERR_SESSION_SUPERSEDED: تم تسجيل الدخول من جهاز آخر'),
    'ERR_SESSION_SUPERSEDED: تم تسجيل الدخول من جهاز آخر',
  ])(
    'retains supersession for both error modes and clears the matching session once (%s)',
    async (error) => {
      useEditorStore.setState({ user: makeUser() });
      const pending = deferLicenseCheck();
      const onLogout = vi.fn();
      window.addEventListener('grido:auth-logout', onLogout);
      try {
        const check = useEditorStore.getState().checkLicenseStatus;
        const legacy = check();
        const strict = check({ throwOnError: true });
        const results = Promise.all([
          expect(legacy).rejects.toBe(error),
          expect(strict).rejects.toBe(error),
        ]);
        pending.reject(error);
        await results;

        expect(isSessionSupersededError(error)).toBe(true);
        expect(sessionSupersededMessage(error)).toBe('تم تسجيل الدخول من جهاز آخر');
        expect(useEditorStore.getState().user).toBeNull();
        expect(useEditorStore.getState().aiUsageLogs).toEqual([]);
        expect(useEditorStore.getState().accountModalOpen).toBe(true);
        expect(useEditorStore.getState().licenseLoading).toBe(false);
        expect(onLogout).toHaveBeenCalledTimes(1);
        expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(1);
      } finally {
        window.removeEventListener('grido:auth-logout', onLogout);
      }
    },
  );

  it.each(['profile', 'null', 'error'] as const)(
    'rejects an invalidated strict result after login without applying a stale %s',
    async (outcome) => {
      const stale = deferLicenseCheck();
      const fresh = makeUser({ id: 'new-login' });
      const check = useEditorStore.getState().checkLicenseStatus;
      const strict = check({ throwOnError: true });
      const legacy = check();
      const strictResult = expect(strict).rejects.toSatisfy(isLicenseCheckInvalidatedError);
      let settled = false;
      void strict.then(
        () => {
          settled = true;
        },
        () => {
          settled = true;
        },
      );
      vi.mocked(LicenseHandler.LoginAccount).mockResolvedValueOnce(fresh);
      await useEditorStore.getState().loginAccount('new@example.com', 'password');
      expect(useEditorStore.getState().user).toBe(fresh);
      expect(settled).toBe(false);
      expect(stale.cancel).not.toHaveBeenCalled();

      if (outcome === 'error') stale.reject(new Error('Old native failure'));
      else stale.resolve(outcome === 'null' ? null : makeUser({ id: 'stale-profile' }));
      await strictResult;
      await expect(legacy).resolves.toBe(fresh);
      expect(useEditorStore.getState().user).toBe(fresh);
      expect(useEditorStore.getState().accountModalOpen).toBe(false);
      expect(useEditorStore.getState().licenseLoading).toBe(false);
    },
  );

  it.each(['profile', 'error'] as const)(
    'waits for an invalidated native %s before starting one fresh check and joining a third caller',
    async (outcome) => {
      const stale = deferLicenseCheck();
      const fresh = deferLicenseCheck();
      const signedIn = makeUser({ id: 'new-login' });
      const verified = makeUser({ id: 'verified-new-login' });
      const check = useEditorStore.getState().checkLicenseStatus;
      const original = check({ throwOnError: true });
      const originalResult = expect(original).rejects.toSatisfy(isLicenseCheckInvalidatedError);
      vi.mocked(LicenseHandler.LoginAccount).mockResolvedValueOnce(signedIn);
      await useEditorStore.getState().loginAccount('new@example.com', 'password');

      const waiting = check({ throwOnError: true });
      const alsoWaiting = check();
      await Promise.resolve();
      expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(1);
      expect(useEditorStore.getState().licenseLoading).toBe(true);
      expect(stale.cancel).not.toHaveBeenCalled();

      if (outcome === 'error') stale.reject(new Error('Old native failure'));
      else stale.resolve(makeUser({ id: 'stale-profile' }));
      await originalResult;
      await vi.waitFor(() => expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(2));
      expect(useEditorStore.getState().user).toBe(signedIn);
      expect(useEditorStore.getState().licenseLoading).toBe(true);

      // A caller arriving after the old finally must still join the fresh flight.
      const third = check({ throwOnError: true });
      await Promise.resolve();
      expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(2);
      expect(useEditorStore.getState().licenseLoading).toBe(true);
      fresh.resolve(verified);
      const profiles = await Promise.all([waiting, alsoWaiting, third]);
      profiles.forEach((profile) => expect(profile).toBe(verified));
      expect(useEditorStore.getState().user).toBe(verified);
      expect(useEditorStore.getState().licenseLoading).toBe(false);
      expect(fresh.cancel).not.toHaveBeenCalled();
    },
  );

  it('does not restore a logged-out profile and makes post-logout checks wait for native settlement', async () => {
    const stale = deferLicenseCheck();
    const fresh = deferLicenseCheck();
    useEditorStore.setState({ user: makeUser() });
    const check = useEditorStore.getState().checkLicenseStatus;
    const original = check({ throwOnError: true });
    const legacy = check();
    const originalResult = expect(original).rejects.toSatisfy(isLicenseCheckInvalidatedError);
    vi.mocked(LicenseHandler.Logout).mockResolvedValueOnce('Logged out');
    await useEditorStore.getState().logoutAccount();

    const waiting = check({ throwOnError: true });
    await Promise.resolve();
    expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(1);
    stale.resolve(makeUser({ id: 'logged-out-profile' }));
    await originalResult;
    await expect(legacy).resolves.toBeNull();
    await vi.waitFor(() => expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(2));
    expect(useEditorStore.getState().user).toBeNull();
    expect(useEditorStore.getState().licenseLoading).toBe(true);

    const third = check();
    await Promise.resolve();
    expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(2);
    fresh.resolve(null);
    await expect(waiting).resolves.toBeNull();
    await expect(third).resolves.toBeNull();
    expect(useEditorStore.getState().licenseLoading).toBe(false);
    expect(stale.cancel).not.toHaveBeenCalled();
  });

  it('invalidates stale strict supersession while preserving the legacy error and newer login', async () => {
    const stale = deferLicenseCheck();
    const fresh = deferLicenseCheck();
    const check = useEditorStore.getState().checkLicenseStatus;
    const legacy = check();
    const strict = check({ throwOnError: true });
    const error = new Error('ERR_SESSION_SUPERSEDED: old session');
    const oldResults = Promise.all([
      expect(legacy).rejects.toBe(error),
      expect(strict).rejects.toSatisfy(isLicenseCheckInvalidatedError),
    ]);
    const signedIn = makeUser({ id: 'new-login' });
    vi.mocked(LicenseHandler.LoginAccount).mockResolvedValueOnce(signedIn);
    await useEditorStore.getState().loginAccount('new@example.com', 'password');
    const waiting = check({ throwOnError: true });
    const onLogout = vi.fn();
    window.addEventListener('grido:auth-logout', onLogout);
    try {
      stale.reject(error);
      await oldResults;
      await vi.waitFor(() => expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(2));
      expect(useEditorStore.getState().user).toBe(signedIn);
      expect(useEditorStore.getState().accountModalOpen).toBe(false);
      expect(useEditorStore.getState().licenseLoading).toBe(true);
      expect(onLogout).not.toHaveBeenCalled();

      const third = check();
      await Promise.resolve();
      expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(2);
      fresh.resolve(signedIn);
      await expect(waiting).resolves.toBe(signedIn);
      await expect(third).resolves.toBe(signedIn);
      expect(useEditorStore.getState().licenseLoading).toBe(false);
    } finally {
      window.removeEventListener('grido:auth-logout', onLogout);
    }
  });

  it('rechecks the new login after an old strict request rejects with supersession', async () => {
    const stale = deferLicenseCheck();
    const fresh = deferLicenseCheck();
    const check = useEditorStore.getState().checkLicenseStatus;
    const original = check({ throwOnError: true });
    const originalResult = expect(original).rejects.toSatisfy((error: unknown) => {
      return isLicenseCheckInvalidatedError(error) && !isSessionSupersededError(error);
    });
    await Promise.resolve();
    expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(1);

    const signedIn = makeUser({ id: 'new-login' });
    vi.mocked(LicenseHandler.LoginAccount).mockResolvedValueOnce(signedIn);
    await useEditorStore.getState().loginAccount('new@example.com', 'password');
    stale.reject(new Error('ERR_SESSION_SUPERSEDED: old session'));
    await originalResult;

    expect(useEditorStore.getState().user).toBe(signedIn);
    expect(useEditorStore.getState().accountModalOpen).toBe(false);
    expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(1);
    expect(stale.cancel).not.toHaveBeenCalled();

    // Bootstrap starts this only after observing the settled invalidated request.
    const retry = check({ throwOnError: true });
    await Promise.resolve();
    expect(LicenseHandler.GetLicenseStatus).toHaveBeenCalledTimes(2);
    expect(useEditorStore.getState().licenseLoading).toBe(true);
    const verified = makeUser({ id: 'verified-new-login' });
    fresh.resolve(verified);
    await expect(retry).resolves.toBe(verified);
    expect(useEditorStore.getState().user).toBe(verified);
    expect(useEditorStore.getState().licenseLoading).toBe(false);
  });

  it('does not mistake unrelated errors for local license-check invalidation', () => {
    expect(isLicenseCheckInvalidatedError(null)).toBe(false);
    expect(isLicenseCheckInvalidatedError(new Error('ERR_LICENSE_CHECK_INVALIDATED'))).toBe(false);
    expect(isLicenseCheckInvalidatedError({ code: 'ERR_LICENSE_CHECK_INVALIDATED' })).toBe(false);
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

    const profile = await useEditorStore
      .getState()
      .registerAccount('New User', 'new@example.com', 'pass123');
    expect(LicenseHandler.RegisterAccount).toHaveBeenCalledWith(
      'New User',
      'new@example.com',
      'pass123',
    );
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
    const mockUser = {
      id: 'usr_rec',
      email: 'rec@example.com',
      plan: 'pro',
      status: 'active',
      expiresAt: '2027-01-01T00:00:00Z',
      token: 'token123',
    } as any;
    vi.mocked(LicenseHandler.VerifyRecoveryOTP).mockResolvedValueOnce(mockUser);

    const profile = await useEditorStore
      .getState()
      .verifyRecoveryOTP('rec@example.com', '123456', 'newpass123');
    expect(LicenseHandler.VerifyRecoveryOTP).toHaveBeenCalledWith(
      'rec@example.com',
      '123456',
      'newpass123',
    );
    expect(profile).toEqual(mockUser);
    expect(useEditorStore.getState().user).toEqual(mockUser);
  });

  it('logoutAccount calls LicenseHandler.Logout and clears user', async () => {
    useEditorStore.setState({
      user: { id: 'usr_1', email: 'test@example.com' } as any,
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
      } as any,
    });
    expect(store.isLicenseActive()).toBe(true);

    // 3. Expired Pro user
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() - 100000).toISOString(),
      } as any,
    });
    expect(store.isLicenseActive()).toBe(false);

    // 4. Inactive Pro user status
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'inactive',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      } as any,
    });
    expect(store.isLicenseActive()).toBe(false);

    // 5. Active Trial user unexpired
    useEditorStore.setState({
      user: {
        plan: 'trial',
        status: 'active',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      } as any,
    });
    expect(store.isLicenseActive()).toBe(true);

    // 6. Free user
    useEditorStore.setState({
      user: {
        plan: 'free',
        status: 'active',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      } as any,
    });
    expect(store.isLicenseActive()).toBe(false);
  });

  it('logAiUsage appends records and persists (Wails with localStorage fallback)', async () => {
    // في بيئة الاختبار جسر Wails غير معرّف — persistAiLogs يجب أن يستقر
    // في localStorage كشبكة أمان دون أن يكسر الواجهة
    localStorage.removeItem('grido_ai_usage_logs');

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

    // انتظار دورة الحفظ غير المتزامنة (fallback إلى localStorage)
    await vi.waitFor(() => {
      expect(localStorage.getItem('grido_ai_usage_logs')).not.toBeNull();
    });
    const parsed = JSON.parse(localStorage.getItem('grido_ai_usage_logs')!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].email).toBe('test@example.com');

    localStorage.removeItem('grido_ai_usage_logs');
  });
});
