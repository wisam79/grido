import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useEditorStore } from "@/lib/editor-store";

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

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showRecoveryOtp, setShowRecoveryOtp] = useState(false);
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Countdown timer for OTP resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Reset errors when auth mode toggles
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
  }, [authMode]);

  const handleGoogleLogin = useCallback(async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      await loginWithGoogle();
      toast.success("تم تسجيل الدخول بنجاح!");
      onAuthenticated();
    } catch (err) {
      const errMsg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشلت عملية تسجيل الدخول عبر Google.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoadingGoogle(false);
    }
  }, [loginWithGoogle, onAuthenticated]);

  const handleResendOTP = useCallback(async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || resendCooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      await resendOTP(cleanEmail);
      toast.success("تم إعادة إرسال كود التحقق بنجاح إلى بريدك الإلكتروني.");
      setResendCooldown(60);
    } catch (err) {
      const errMsg = typeof err === "string" ? err : ((err as Error)?.message || "فشل إعادة إرسال رمز التحقق.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setResending(false);
    }
  }, [email, resendCooldown, resendOTP]);

  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanOtp = otpCode.trim();

    try {
      if (showOtp) {
        await verifyOTP(cleanEmail, cleanOtp);
        toast.success("تم تأكيد الحساب وتسجيل الدخول بنجاح!");
        setShowOtp(false);
        onAuthenticated();
      } else {
        let profile;
        if (authMode === "login") {
          profile = await loginAccount(cleanEmail, password);
        } else {
          profile = await registerAccount(cleanName, cleanEmail, password);
        }

        if (profile && profile.status === "pending_otp") {
          setShowOtp(true);
          toast.info("تم إرسال كود التحقق المكون من 6 أرقام إلى بريدك الإلكتروني.");
        } else {
          toast.success("تم تسجيل الدخول بنجاح!");
          onAuthenticated();
        }
      }
    } catch (err) {
      const errMsg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشلت العملية، يرجى التحقق من المدخلات.");

      if (errMsg.includes("تأكيد") || errMsg.includes("Email not confirmed") || errMsg.includes("pending_otp")) {
        setShowOtp(true);
        setError(null);
        toast.info("البريد الإلكتروني بحاجة لتأكيد. يرجى إدخال كود التحقق (OTP) الخاص بك.");
      } else if (errMsg.includes("مسجل بالفعل") || errMsg.includes("already registered")) {
        setAuthMode("login");
        setError("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.");
        toast.info("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.");
      } else if (errMsg.includes("تم إنشاء الحساب بنجاح")) {
        toast.success(errMsg);
        setAuthMode("login");
        setError(null);
      } else {
        setError(errMsg);
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  }, [email, name, otpCode, password, showOtp, authMode, loginAccount, registerAccount, verifyOTP, onAuthenticated]);

  const handleResetPassword = useCallback(async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("يرجى إدخال البريد الإلكتروني أولاً لإرسال كود الاستعادة.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(cleanEmail);
      setShowRecoveryOtp(true);
      toast.success("تم إرسال كود استعادة كلمة المرور (OTP) إلى بريدك الإلكتروني.");
    } catch (err) {
      const errMsg = typeof err === "string" ? err : ((err as Error)?.message || "فشل إرسال كود استعادة كلمة المرور.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [email, resetPassword]);

  const handleVerifyRecovery = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = recoveryOtp.trim();
    const cleanNewPassword = newPassword.trim();

    if (!cleanEmail || !cleanOtp || !cleanNewPassword) {
      toast.error("جميع الحقول مطلوبة.");
      setLoading(false);
      return;
    }

    try {
      await verifyRecoveryOTP(cleanEmail, cleanOtp, cleanNewPassword);
      toast.success("تم تعيين كلمة المرور الجديدة وتسجيل الدخول بنجاح!");
      setShowRecoveryOtp(false);
      setRecoveryOtp("");
      setNewPassword("");
      onAuthenticated();
    } catch (err) {
      const errMsg = typeof err === "string" ? err : ((err as Error)?.message || "فشل تعيين كلمة المرور الجديدة. تحقق من كود الاستعادة والبيانات.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [email, recoveryOtp, newPassword, verifyRecoveryOTP, onAuthenticated]);

  return {
    authMode,
    setAuthMode,
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
