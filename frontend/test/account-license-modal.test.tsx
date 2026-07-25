import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { AccountLicenseModal } from '../src/components/editor/account-license-modal';
import { useEditorStore } from '../src/lib/editor-store';
import * as LicenseHandler from '../wailsjs/go/handlers/LicenseHandler';

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

describe('AccountLicenseModal Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
    useEditorStore.setState({
      accountModalOpen: true,
      user: null,
    });
  });

  it('renders modal title and auth tab by default when user is null', () => {
    render(<AccountLicenseModal />);
    expect(screen.getByText('الحساب والترخيص')).toBeInTheDocument();
    expect(screen.getByText('تسجيل الحساب')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
  });

  it('allows toggling between login and register mode', () => {
    render(<AccountLicenseModal />);
    const toggleBtn = screen.getByText('إنشاء حساب جديد');
    fireEvent.click(toggleBtn);

    expect(screen.getByPlaceholderText('الاسم')).toBeInTheDocument();
    expect(screen.getByText('لديك حساب بالفعل؟ تسجيل الدخول')).toBeInTheDocument();
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
    fireEvent.click(screen.getByText('إنشاء حساب جديد'));

    fireEvent.change(screen.getByPlaceholderText('الاسم'), { target: { value: 'Ali' } });
    fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'pending@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass1234' } });

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء حساب' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'تأكيد الكود وتسجيل الدخول' })).toBeInTheDocument();
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
});
