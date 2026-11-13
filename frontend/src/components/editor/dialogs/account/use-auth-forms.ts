import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useEditorStore } from '@/lib/editor-store';
import { toErrorMessage } from '@/lib/wails-error';

function validateStrongPassword(rawPassword: string): void {
  if (rawPassword.length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }
  const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(rawPassword);
  const hasDigit = /[0-9]/.test(rawPassword);
  if (!hasLetter || !hasDigit) {
    throw new Error('كلمة المرور يجب أن تتضمن حروفاً وأرقاماً معاً');
  }
}

/**
 * 🧭 منطق مصادقة الحساب: دخول/تسجيل/OTP/استعادة كلمة المرور/Google OAuth،
 * مع العد التنازلي لإعادة إرسال OTP. كانت هذه الحالة والمعالجات مضمّنة
 * في AccountLicenseModal.
 */
export function useAuthForms(onAuthenticated: () => void) {
  const {
    loginAccount,
    loginWithGoogle,
    registerAccount,
    verifyOTP,
    resendOTP,
    resetPassword,
    verifyRecoveryOTP,
  } = useEditorStore.getState();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [showRecoveryOtp, setShowRecoveryOtp] = useState(false);
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const isMountedRef = useRef(false);
  const requestGenRef = useRef(0);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearResendTimer = useCallback(() => {
    if (resendTimerRef.current !== null) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
  }, []);

  const resetForms = useCallback(() => {
    // Invalidate only this UI session; backend auth may still update store.user.
    requestGenRef.current += 1;
    clearResendTimer();
    if (!isMountedRef.current) return;
    setName('');
    setEmail('');
    setPassword('');
    setResendCooldown(0);
    setLoading(false);
    setLoadingGoogle(false);
    setResending(false);
    setError(null);
    setShowOtp(false);
    setShowRecoveryOtp(false);
    setOtpCode('');
    setRecoveryOtp('');
    setNewPassword('');
  }, [clearResendTimer]);

  const isUiOpen = useCallback(
    () => isMountedRef.current && useEditorStore.getState().accountModalOpen,
    [],
  );
  const isRequestCurrent = useCallback(
    (generation: number) => isUiOpen() && requestGenRef.current === generation,
    [isUiOpen],
  );

  useEffect(() => {
    isMountedRef.current = true;
    // Zustand notifies synchronously: close/reopen invalidates old requests even
    // when React has not rendered the closed state yet.
    const unsubscribe = useEditorStore.subscribe((state, previousState) => {
      if (previousState.accountModalOpen && !state.accountModalOpen) resetForms();
    });
    return () => {
      unsubscribe();
      isMountedRef.current = false;
      requestGenRef.current += 1;
      clearResendTimer();
    };
  }, [clearResendTimer, resetForms]);

  // Countdown timer for OTP resend button
  useEffect(() => {
    if (resendCooldown <= 0 || !isUiOpen()) return;
    const reqGen = requestGenRef.current;
    resendTimerRef.current = setInterval(() => {
      if (!isRequestCurrent(reqGen)) return;
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return clearResendTimer;
  }, [resendCooldown, isUiOpen, isRequestCurrent, clearResendTimer]);

  // Reset errors when auth mode toggles
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
  }, [authMode]);

  const handleGoogleLogin = useCallback(async () => {
    if (!isUiOpen()) return;
    const reqGen = requestGenRef.current;
    setLoadingGoogle(true);
    setError(null);
    try {
      await loginWithGoogle();
      if (!isRequestCurrent(reqGen)) return;
      toast.success('تم تسجيل الدخول بنجاح!');
      onAuthenticated();
    } catch (err) {
      if (!isRequestCurrent(reqGen)) return;
      const errMsg = toErrorMessage(err, 'فشلت عملية تسجيل الدخول عبر Google.');
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      if (isRequestCurrent(reqGen)) {
        setLoadingGoogle(false);
      }
    }
  }, [loginWithGoogle, onAuthenticated, isUiOpen, isRequestCurrent]);

  const handleResendOTP = useCallback(async () => {
    if (!isUiOpen()) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || resendCooldown > 0) return;
    const reqGen = requestGenRef.current;
    setResending(true);
    setError(null);
    try {
      await resendOTP(cleanEmail);
      if (!isRequestCurrent(reqGen)) return;
      toast.success('تم إعادة إرسال كود التحقق بنجاح إلى بريدك الإلكتروني.');
      setResendCooldown(60);
    } catch (err) {
      if (!isRequestCurrent(reqGen)) return;
      const errMsg = toErrorMessage(err, 'فشل إعادة إرسال رمز التحقق.');
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      if (isRequestCurrent(reqGen)) {
        setResending(false);
      }
    }
  }, [email, resendCooldown, resendOTP, isUiOpen, isRequestCurrent]);

  const handleAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isUiOpen()) return;
      const reqGen = requestGenRef.current;
      setLoading(true);
      setError(null);
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanOtp = otpCode.trim();

      try {
        if (showOtp) {
          await verifyOTP(cleanEmail, cleanOtp);
          if (!isRequestCurrent(reqGen)) return;
          toast.success('تم تأكيد الحساب وتسجيل الدخول بنجاح!');
          setShowOtp(false);
          onAuthenticated();
        } else {
          let profile;
          if (authMode === 'login') {
            profile = await loginAccount(cleanEmail, password);
          } else {
            validateStrongPassword(password);
            profile = await registerAccount(cleanName, cleanEmail, password);
          }
          if (!isRequestCurrent(reqGen)) return;

          if (profile && profile.status === 'pending_otp') {
            setShowOtp(true);
            toast.info('تم إرسال كود التحقق المكون من 6 أرقام إلى بريدك الإلكتروني.');
          } else {
            toast.success('تم تسجيل الدخول بنجاح!');
            onAuthenticated();
          }
        }
      } catch (err) {
        if (!isRequestCurrent(reqGen)) return;
        const errMsg = toErrorMessage(err, 'فشلت العملية، تحقق من البيانات المدخلة.');

        if (
          errMsg.includes('تأكيد') ||
          errMsg.includes('Email not confirmed') ||
          errMsg.includes('pending_otp')
        ) {
          setShowOtp(true);
          setError(null);
          toast.info('البريد الإلكتروني بحاجة لتأكيد. يرجى إدخال كود التحقق (OTP) الخاص بك.');
        } else if (errMsg.includes('مسجل بالفعل') || errMsg.includes('already registered')) {
          setAuthMode('login');
          setError('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.');
          toast.info('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.');
        } else if (errMsg.includes('تم إنشاء الحساب بنجاح')) {
          toast.success(errMsg);
          setAuthMode('login');
          setError(null);
        } else {
          setError(errMsg);
          toast.error(errMsg);
        }
      } finally {
        if (isRequestCurrent(reqGen)) {
          setLoading(false);
        }
      }
    },
    [
      email,
      name,
      otpCode,
      password,
      showOtp,
      authMode,
      loginAccount,
      registerAccount,
      verifyOTP,
      onAuthenticated,
      isUiOpen,
      isRequestCurrent,
    ],
  );

  const handleResetPassword = useCallback(async () => {
    if (!isUiOpen()) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('يرجى إدخال البريد الإلكتروني أولاً لإرسال كود الاستعادة.');
      return;
    }
    const reqGen = requestGenRef.current;
    setLoading(true);
    setError(null);
    try {
      await resetPassword(cleanEmail);
      if (!isRequestCurrent(reqGen)) return;
      setShowRecoveryOtp(true);
      toast.success('تم إرسال كود استعادة كلمة المرور (OTP) إلى بريدك الإلكتروني.');
    } catch (err) {
      if (!isRequestCurrent(reqGen)) return;
      const errMsg = toErrorMessage(err, 'فشل إرسال كود استعادة كلمة المرور.');
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      if (isRequestCurrent(reqGen)) {
        setLoading(false);
      }
    }
  }, [email, resetPassword, isUiOpen, isRequestCurrent]);

  const handleVerifyRecovery = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isUiOpen()) return;
      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = recoveryOtp.trim();

      if (!cleanEmail || !cleanOtp || !newPassword) {
        toast.error('جميع الحقول مطلوبة.');
        return;
      }

      const reqGen = requestGenRef.current;
      setLoading(true);
      setError(null);
      try {
        validateStrongPassword(newPassword);
        await verifyRecoveryOTP(cleanEmail, cleanOtp, newPassword);
        if (!isRequestCurrent(reqGen)) return;
        toast.success('تم تعيين كلمة المرور الجديدة وتسجيل الدخول بنجاح!');
        setShowRecoveryOtp(false);
        setRecoveryOtp('');
        setNewPassword('');
        onAuthenticated();
      } catch (err) {
        if (!isRequestCurrent(reqGen)) return;
        const errMsg = toErrorMessage(
          err,
          'فشل تعيين كلمة المرور الجديدة. تحقق من كود الاستعادة والبيانات.',
        );
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        if (isRequestCurrent(reqGen)) {
          setLoading(false);
        }
      }
    },
    [
      email,
      recoveryOtp,
      newPassword,
      verifyRecoveryOTP,
      onAuthenticated,
      isUiOpen,
      isRequestCurrent,
    ],
  );

  return {
    authMode,
    setAuthMode,
    resetForms,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    loadingGoogle,
    resending,
    resendCooldown,
    error,
    setError,
    showOtp,
    setShowOtp,
    otpCode,
    setOtpCode,
    showRecoveryOtp,
    setShowRecoveryOtp,
    recoveryOtp,
    setRecoveryOtp,
    newPassword,
    setNewPassword,
    handleGoogleLogin,
    handleResendOTP,
    handleAuth,
    handleResetPassword,
    handleVerifyRecovery,
  };
}
