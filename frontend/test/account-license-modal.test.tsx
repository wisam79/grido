import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React, { StrictMode } from 'react';
import { toast } from 'sonner';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useAuthForms } from '../src/components/editor/dialogs/account/use-auth-forms';
import { AccountLicenseModal } from '../src/components/editor/dialogs/account-license-modal';
import { useEditorStore } from '../src/lib/editor-store';
import * as LicenseHandler from '../wailsjs/go/handlers/LicenseHandler';

import type { UserProfile } from '../src/lib/store/slices/license-slice';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../wailsjs/go/main/App', () => ({
  ExportSupportLogs: vi.fn(() => Promise.resolve('/tmp/logs.txt')),
}));

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function deferBackend<T>(handler: (...args: never[]) => PromiseLike<T>) {
  const request = deferred<T>();
  vi.mocked(handler).mockReturnValueOnce(request.promise);
  return request;
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'usr_session',
    name: 'Ali',
    email: 'test@example.com',
    plan: 'pro',
    status: 'active',
    token: 'tok_session',
    refreshToken: 'refresh_session',
    licenseKey: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
}

const formEvent = () => ({ preventDefault: vi.fn() }) as unknown as React.FormEvent;
type Forms = ReturnType<typeof useAuthForms>;

function fillForms(forms: Forms) {
  act(() => {
    forms.setName(' Ali ');
    forms.setEmail(' Test@Example.com ');
    forms.setPassword('secret123');
    forms.setOtpCode('123456');
    forms.setRecoveryOtp('654321');
    forms.setNewPassword('newPass123');
  });
}

function expectReset(forms: Forms) {
  expect(forms).toMatchObject({
    name: '',
    email: '',
    password: '',
    otpCode: '',
    recoveryOtp: '',
    newPassword: '',
    loading: false,
    loadingGoogle: false,
    resending: false,
    resendCooldown: 0,
    error: null,
    showOtp: false,
    showRecoveryOtp: false,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  useEditorStore.getState().reset();
  useEditorStore.setState({ accountModalOpen: true, user: null });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AccountLicenseModal Component Tests', () => {
  it('renders modal title and auth tab by default when user is null', () => {
    render(<AccountLicenseModal />);
    expect(screen.getByText('الحساب والترخيص')).toBeInTheDocument();
    expect(screen.getByText('الحساب')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
  });

  it('allows toggling between login and register mode', () => {
    render(<AccountLicenseModal />);
    const toggleBtn = screen.getByText('إنشاء حساب');
    fireEvent.click(toggleBtn);

    expect(screen.getByPlaceholderText('الاسم')).toBeInTheDocument();
    expect(screen.getByText('لديك حساب؟ تسجيل الدخول')).toBeInTheDocument();
  });

  it('submits login form successfully', async () => {
    const mockUser = {
      id: 'usr_1',
      email: 'test@example.com',
      plan: 'pro',
      status: 'active',
      token: 'tok_1',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    } as any;

    vi.mocked(LicenseHandler.LoginAccount).mockResolvedValueOnce(mockUser);

    render(<AccountLicenseModal />);

    const emailInput = screen.getByPlaceholderText('name@example.com');
    const passInput = screen.getByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: 'تسجيل الدخول' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passInput, { target: { value: 'secret123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(LicenseHandler.LoginAccount).toHaveBeenCalledWith('test@example.com', 'secret123');
    });
  });

  it('shows OTP input step if registration status is pending_otp', async () => {
    const mockPendingUser = {
      id: 'usr_2',
      email: 'pending@example.com',
      plan: 'trial',
      status: 'pending_otp',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    } as any;

    vi.mocked(LicenseHandler.RegisterAccount).mockResolvedValueOnce(mockPendingUser);

    render(<AccountLicenseModal />);

    // Switch to register
    fireEvent.click(screen.getByText('إنشاء حساب'));

    fireEvent.change(screen.getByPlaceholderText('الاسم'), { target: { value: 'Ali' } });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'pending@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass1234' } });

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء حساب' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'تأكيد الكود والدخول' })).toBeInTheDocument();
    });
  });

  it('renders license activation tab when user has active session', () => {
    useEditorStore.setState({
      user: {
        id: 'usr_pro',
        email: 'pro@example.com',
        plan: 'free',
        status: 'active',
        token: 'tok_active',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      } as any,
    });

    render(<AccountLicenseModal />);

    expect(screen.getByPlaceholderText('GRIDO-PRO-XXXX-XXXX-XXXX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تفعيل مفتاح الترخيص' })).toBeInTheDocument();
  });

  it('submits license key activation', async () => {
    useEditorStore.setState({
      user: {
        id: 'usr_free',
        email: 'free@example.com',
        plan: 'free',
        status: 'active',
        token: 'tok_active',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      } as any,
    });

    const mockProUser = {
      id: 'usr_free',
      email: 'free@example.com',
      plan: 'pro',
      status: 'active',
      licenseKey: 'GRIDO-PRO-KEY-999',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    } as any;

    vi.mocked(LicenseHandler.ActivateLicenseKey).mockResolvedValueOnce(mockProUser);

    render(<AccountLicenseModal />);

    const inputKey = screen.getByPlaceholderText('GRIDO-PRO-XXXX-XXXX-XXXX');
    fireEvent.change(inputKey, { target: { value: 'GRIDO-PRO-KEY-999' } });

    fireEvent.click(screen.getByRole('button', { name: 'تفعيل مفتاح الترخيص' }));

    await waitFor(() => {
      expect(LicenseHandler.ActivateLicenseKey).toHaveBeenCalledWith('GRIDO-PRO-KEY-999');
    });
  });

  it('resets forms through the store when the close button is used', () => {
    render(<AccountLicenseModal />);
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    expect(useEditorStore.getState().accountModalOpen).toBe(false);
    act(() => useEditorStore.getState().setAccountModalOpen(true));
    expect(screen.getByPlaceholderText('name@example.com')).toHaveValue('');
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('');
  });

  it('closes normally after successful login in StrictMode and reopens on license', async () => {
    const request = deferBackend(LicenseHandler.LoginAccount);
    const user = profile();
    render(
      <StrictMode>
        <AccountLicenseModal />
      </StrictMode>,
    );
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));
    await act(async () => {
      request.resolve(user);
      await request.promise;
    });
    expect(useEditorStore.getState().accountModalOpen).toBe(false);
    expect(useEditorStore.getState().user).toEqual(user);
    expect(toast.success).toHaveBeenCalledTimes(1);
    act(() => useEditorStore.getState().setAccountModalOpen(true));
    expect(screen.getByRole('tab', { name: 'الترخيص' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'الحساب' }));
    expect(screen.getByPlaceholderText('name@example.com')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).not.toBeDisabled();
  });

  it('keeps late login success in the store without closing a reopened modal', async () => {
    const request = deferBackend(LicenseHandler.LoginAccount);
    const user = profile();
    render(<AccountLicenseModal />);
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    await act(async () => {
      useEditorStore.getState().setAccountModalOpen(false);
      useEditorStore.getState().setAccountModalOpen(true);
      request.resolve(user);
      await request.promise;
    });

    expect(useEditorStore.getState().user).toEqual(user);
    expect(useEditorStore.getState().accountModalOpen).toBe(true);
    expect(screen.getByPlaceholderText('name@example.com')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).not.toBeDisabled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(LicenseHandler.Logout).not.toHaveBeenCalled();
  });
});

const profileFlows = [
  {
    name: 'login',
    handler: LicenseHandler.LoginAccount,
    prepare: (_forms: Forms) => {},
    submit: (forms: Forms) => forms.handleAuth(formEvent()),
    loading: 'loading',
    authenticates: true,
  },
  {
    name: 'registration',
    handler: LicenseHandler.RegisterAccount,
    prepare: (forms: Forms) => forms.setAuthMode('register'),
    submit: (forms: Forms) => forms.handleAuth(formEvent()),
    loading: 'loading',
    authenticates: false,
  },
  {
    name: 'OTP verification',
    handler: LicenseHandler.VerifyOTP,
    prepare: (forms: Forms) => forms.setShowOtp(true),
    submit: (forms: Forms) => forms.handleAuth(formEvent()),
    loading: 'loading',
    authenticates: true,
  },
  {
    name: 'recovery verification',
    handler: LicenseHandler.VerifyRecoveryOTP,
    prepare: (forms: Forms) => forms.setShowRecoveryOtp(true),
    submit: (forms: Forms) => forms.handleVerifyRecovery(formEvent()),
    loading: 'loading',
    authenticates: true,
  },
  {
    name: 'Google',
    handler: LicenseHandler.LoginWithGoogle,
    prepare: (_forms: Forms) => {},
    submit: (forms: Forms) => forms.handleGoogleLogin(),
    loading: 'loadingGoogle',
    authenticates: true,
  },
  {
    name: 'resend',
    handler: LicenseHandler.ResendOTP,
    prepare: (forms: Forms) => forms.setShowOtp(true),
    submit: (forms: Forms) => forms.handleResendOTP(),
    loading: 'resending',
    authenticates: false,
  },
] as const;

describe('useAuthForms UI session guards', () => {
  describe.each(profileFlows)('$name', (flow) => {
    it.each([
      { reopen: false, rejects: false },
      { reopen: false, rejects: true },
      { reopen: true, rejects: false },
      { reopen: true, rejects: true },
    ])(
      'ignores late completion (reopen=$reopen, rejects=$rejects)',
      async ({ reopen, rejects }) => {
        const request = deferBackend(flow.handler);
        const onAuthenticated = vi.fn();
        const { result } = renderHook(() => useAuthForms(onAuthenticated));
        fillForms(result.current);
        act(() => flow.prepare(result.current));
        let submission!: Promise<void>;
        act(() => {
          submission = flow.submit(result.current);
        });
        expect(result.current[flow.loading]).toBe(true);
        expect(flow.handler).toHaveBeenCalledTimes(1);
        const user = profile(
          flow.name === 'registration' ? { status: 'pending_otp', token: '' } : {},
        );

        // No effect wait or separate act: invalidation must happen inside setState.
        await act(async () => {
          useEditorStore.getState().setAccountModalOpen(false);
          if (reopen) useEditorStore.getState().setAccountModalOpen(true);
          if (rejects) request.reject(new Error('late failure'));
          else request.resolve(user);
          await submission;
        });

        expectReset(result.current);
        expect(useEditorStore.getState().accountModalOpen).toBe(reopen);
        expect(onAuthenticated).not.toHaveBeenCalled();
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).not.toHaveBeenCalled();
        expect(toast.info).not.toHaveBeenCalled();
        expect(LicenseHandler.Logout).not.toHaveBeenCalled();
        expect(useEditorStore.getState().user).toEqual(
          rejects || flow.name === 'resend' ? null : user,
        );
      },
    );

    it('does not let old finally clear a new request after close/reopen', async () => {
      const oldRequest = deferBackend(flow.handler);
      const newRequest = deferBackend(flow.handler);
      const onAuthenticated = vi.fn();
      const { result } = renderHook(() => useAuthForms(onAuthenticated));
      fillForms(result.current);
      act(() => flow.prepare(result.current));
      let oldSubmission!: Promise<void>;
      act(() => {
        oldSubmission = flow.submit(result.current);
      });
      // Both transitions are batched: no render ever sees accountModalOpen=false.
      act(() => {
        useEditorStore.getState().setAccountModalOpen(false);
        useEditorStore.getState().setAccountModalOpen(true);
      });
      expectReset(result.current);
      fillForms(result.current);
      act(() => flow.prepare(result.current));
      let newSubmission!: Promise<void>;
      act(() => {
        newSubmission = flow.submit(result.current);
      });
      expect(result.current[flow.loading]).toBe(true);

      await act(async () => {
        oldRequest.resolve(profile());
        await oldSubmission;
      });
      expect(result.current[flow.loading]).toBe(true);
      expect(result.current.error).toBeNull();
      expect(onAuthenticated).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.info).not.toHaveBeenCalled();

      await act(async () => {
        newRequest.reject(new Error('current failure'));
        await newSubmission;
      });
      expect(result.current[flow.loading]).toBe(false);
      expect(result.current.error).toBe('current failure');
      expect(toast.error).toHaveBeenCalledWith('current failure');
    });

    it('allows normal successful completion in StrictMode', async () => {
      const request = deferBackend(flow.handler);
      const onAuthenticated = vi.fn();
      const { result } = renderHook(() => useAuthForms(onAuthenticated), {
        wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
      });
      fillForms(result.current);
      act(() => flow.prepare(result.current));
      let submission!: Promise<void>;
      act(() => {
        submission = flow.submit(result.current);
      });
      const user = profile(
        flow.name === 'registration' ? { status: 'pending_otp', token: '' } : {},
      );
      await act(async () => {
        request.resolve(user);
        await submission;
      });

      expect(result.current[flow.loading]).toBe(false);
      expect(result.current.error).toBeNull();
      expect(flow.handler).toHaveBeenCalledTimes(1);
      expect(onAuthenticated).toHaveBeenCalledTimes(flow.authenticates ? 1 : 0);
      if (flow.name === 'registration') {
        expect(result.current.showOtp).toBe(true);
        expect(toast.info).toHaveBeenCalledTimes(1);
      } else {
        expect(toast.success).toHaveBeenCalledTimes(1);
      }
      if (flow.name === 'resend') expect(result.current.resendCooldown).toBe(60);
      expect(useEditorStore.getState().user).toEqual(flow.name === 'resend' ? null : user);
    });

    it.each([false, true])('suppresses completion after unmount (rejects=%s)', async (rejects) => {
      const request = deferBackend(flow.handler);
      const onAuthenticated = vi.fn();
      const unsubscribe = vi.fn();
      const originalSubscribe = useEditorStore.subscribe;
      vi.spyOn(useEditorStore, 'subscribe').mockImplementation((listener) => {
        const stop = originalSubscribe(listener);
        return () => {
          stop();
          unsubscribe();
        };
      });
      const { result, unmount } = renderHook(() => useAuthForms(onAuthenticated), {
        wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
      });
      fillForms(result.current);
      act(() => flow.prepare(result.current));
      const snapshot = result.current;
      let submission!: Promise<void>;
      act(() => {
        submission = flow.submit(result.current);
      });
      // StrictMode cleaned the first subscription; unmount cleans its replacement.
      const cleanupCount = unsubscribe.mock.calls.length;
      unmount();
      expect(unsubscribe).toHaveBeenCalledTimes(cleanupCount + 1);
      const user = profile();
      await act(async () => {
        if (rejects) request.reject(new Error('late unmounted failure'));
        else request.resolve(user);
        await submission;
      });
      expect(onAuthenticated).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.info).not.toHaveBeenCalled();
      expect(useEditorStore.getState().user).toEqual(
        rejects || flow.name === 'resend' ? null : user,
      );
      act(() => snapshot.resetForms());
      // An unmounted subscription must no longer reset forms on store close.
      act(() => useEditorStore.getState().setAccountModalOpen(false));
      expect(LicenseHandler.Logout).not.toHaveBeenCalled();
    });
  });

  it.each([
    { reopen: false, rejects: false },
    { reopen: false, rejects: true },
    { reopen: true, rejects: false },
    { reopen: true, rejects: true },
  ])(
    'suppresses late recovery-code request (reopen=$reopen, rejects=$rejects)',
    async ({ reopen, rejects }) => {
      const request = deferBackend(LicenseHandler.ResetPassword);
      const onAuthenticated = vi.fn();
      const { result } = renderHook(() => useAuthForms(onAuthenticated));
      fillForms(result.current);
      let submission!: Promise<void>;
      act(() => {
        submission = result.current.handleResetPassword();
      });
      expect(LicenseHandler.ResetPassword).toHaveBeenCalledWith('test@example.com');
      await act(async () => {
        useEditorStore.getState().setAccountModalOpen(false);
        if (reopen) useEditorStore.getState().setAccountModalOpen(true);
        if (rejects) request.reject(new Error('late recovery failure'));
        else request.resolve('success');
        await submission;
      });
      expectReset(result.current);
      expect(onAuthenticated).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(useEditorStore.getState().accountModalOpen).toBe(reopen);
      expect(useEditorStore.getState().user).toBeNull();
    },
  );

  it('guards recovery-code request finally across close/reopen', async () => {
    const oldRequest = deferBackend(LicenseHandler.ResetPassword);
    const newRequest = deferBackend(LicenseHandler.ResetPassword);
    const { result } = renderHook(() => useAuthForms(vi.fn()));
    fillForms(result.current);
    let oldSubmission!: Promise<void>;
    act(() => {
      oldSubmission = result.current.handleResetPassword();
    });
    act(() => {
      useEditorStore.getState().setAccountModalOpen(false);
      useEditorStore.getState().setAccountModalOpen(true);
    });
    fillForms(result.current);
    let newSubmission!: Promise<void>;
    act(() => {
      newSubmission = result.current.handleResetPassword();
    });
    await act(async () => {
      oldRequest.resolve('success');
      await oldSubmission;
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.showRecoveryOtp).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () => {
      newRequest.resolve('success');
      await newSubmission;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.showRecoveryOtp).toBe(true);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('allows normal recovery-code success in StrictMode', async () => {
    const request = deferBackend(LicenseHandler.ResetPassword);
    const onAuthenticated = vi.fn();
    const { result } = renderHook(() => useAuthForms(onAuthenticated), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });
    fillForms(result.current);
    let submission!: Promise<void>;
    act(() => {
      submission = result.current.handleResetPassword();
    });
    await act(async () => {
      request.resolve('success');
      await submission;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.showRecoveryOtp).toBe(true);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(useEditorStore.getState().user).toBeNull();
  });

  it.each([false, true])(
    'suppresses recovery-code completion after unmount (rejects=%s)',
    async (rejects) => {
      const request = deferBackend(LicenseHandler.ResetPassword);
      const onAuthenticated = vi.fn();
      const { result, unmount } = renderHook(() => useAuthForms(onAuthenticated), {
        wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
      });
      fillForms(result.current);
      let submission!: Promise<void>;
      act(() => {
        submission = result.current.handleResetPassword();
      });
      unmount();
      await act(async () => {
        if (rejects) request.reject(new Error('unmounted recovery failure'));
        else request.resolve('success');
        await submission;
      });
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(onAuthenticated).not.toHaveBeenCalled();
      expect(LicenseHandler.Logout).not.toHaveBeenCalled();
      expect(useEditorStore.getState().user).toBeNull();
    },
  );

  it('does not start any request or emit validation toasts while closed or unmounted', async () => {
    const { result, unmount } = renderHook(() => useAuthForms(vi.fn()));
    fillForms(result.current);
    const openHandlers = result.current;
    await act(async () => {
      useEditorStore.getState().setAccountModalOpen(false);
      await openHandlers.handleAuth(formEvent());
      await openHandlers.handleGoogleLogin();
      await openHandlers.handleResetPassword();
      await openHandlers.handleVerifyRecovery(formEvent());
      await openHandlers.handleResendOTP();
    });
    await act(async () => {
      await result.current.handleResetPassword();
      await result.current.handleVerifyRecovery(formEvent());
    });
    expectReset(result.current);
    act(() => useEditorStore.getState().setAccountModalOpen(true));
    fillForms(result.current);
    const unmountedHandlers = result.current;
    unmount();
    await act(async () => {
      await unmountedHandlers.handleAuth(formEvent());
      await unmountedHandlers.handleGoogleLogin();
      await unmountedHandlers.handleResetPassword();
      await unmountedHandlers.handleVerifyRecovery(formEvent());
      await unmountedHandlers.handleResendOTP();
    });
    for (const flow of profileFlows) expect(flow.handler).not.toHaveBeenCalled();
    expect(LicenseHandler.ResetPassword).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('keeps resetForms stable and synchronously stops countdown on close', async () => {
    vi.useFakeTimers();
    const request = deferBackend(LicenseHandler.ResendOTP);
    const { result, unmount } = renderHook(() => useAuthForms(vi.fn()));
    const resetForms = result.current.resetForms;
    fillForms(result.current);
    let submission!: Promise<void>;
    act(() => {
      submission = result.current.handleResendOTP();
    });
    await act(async () => {
      request.resolve(profile());
      await submission;
    });
    expect(result.current.resendCooldown).toBe(60);
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => {
      await result.current.handleResendOTP();
    });
    expect(LicenseHandler.ResendOTP).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.resendCooldown).toBe(59);
    expect(result.current.resetForms).toBe(resetForms);
    act(() => {
      useEditorStore.getState().setAccountModalOpen(false);
      expect(vi.getTimerCount()).toBe(0);
      useEditorStore.getState().setAccountModalOpen(true);
      vi.advanceTimersByTime(60000);
    });
    expectReset(result.current);
    expect(result.current.resetForms).toBe(resetForms);

    const nextRequest = deferBackend(LicenseHandler.ResendOTP);
    fillForms(result.current);
    act(() => {
      submission = result.current.handleResendOTP();
    });
    await act(async () => {
      nextRequest.resolve(profile());
      await submission;
    });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
