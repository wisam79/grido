import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExportSupportLogs } from "../../../../wailsjs/go/main/App";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Person20Filled,
  Key20Filled,
  Mail20Filled,
  LockClosed20Filled,
  SignOut20Filled,
  ShieldCheckmark20Filled,
  Warning20Filled,
  Open20Filled,
  ArrowDownload20Filled,
} from "@fluentui/react-icons";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

export function AccountLicenseModal() {
  const {
    user,
    accountModalOpen,
    setAccountModalOpen,
    loginAccount,
    loginWithGoogle,
    registerAccount,
    activateLicenseKey,
    logoutAccount,
    resetPassword,
    verifyRecoveryOTP,
    isLicenseActive,
    verifyOTP,
    resendOTP,
  } = useEditorStore(

    useShallow((state) => ({
      user: state.user,
      accountModalOpen: state.accountModalOpen,
      setAccountModalOpen: state.setAccountModalOpen,
      loginAccount: state.loginAccount,
      loginWithGoogle: state.loginWithGoogle,
      registerAccount: state.registerAccount,
      activateLicenseKey: state.activateLicenseKey,
      logoutAccount: state.logoutAccount,
      resetPassword: state.resetPassword,
      verifyRecoveryOTP: state.verifyRecoveryOTP,
      isLicenseActive: state.isLicenseActive,
      verifyOTP: state.verifyOTP,
      resendOTP: state.resendOTP,
    }))
  );

  // Form states
  const [activeTab, setActiveTab] = useState<"auth" | "license">(() => {
    const user = useEditorStore.getState().user;
    if (user && user.token) {
      return "license";
    }
    return "auth";
  });
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Countdown timer for OTP resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false);
    setLoadingGoogle(false);
    setResending(false);
    setShowLogoutConfirm(false);
    if (!accountModalOpen) return;
    const currentUser = useEditorStore.getState().user;
    setActiveTab(currentUser && currentUser.token ? "license" : "auth");
  }, [accountModalOpen]);

  // Reset errors when modal status changes or tabs toggle
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
  }, [activeTab, authMode, accountModalOpen]);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      await loginWithGoogle();
      toast.success("تم تسجيل الدخول بنجاح!");
      setAccountModalOpen(false);
    } catch (err) {
      const errMsg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشلت عملية تسجيل الدخول عبر Google.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleResendOTP = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || resendCooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      if (typeof resendOTP === "function") {
        await resendOTP(cleanEmail);
      }
      toast.success("تم إعادة إرسال كود التحقق بنجاح إلى بريدك الإلكتروني.");
      setResendCooldown(60);
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : (err?.message || "فشل إعادة إرسال رمز التحقق.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setResending(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
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
        setActiveTab("license");
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
          setActiveTab("license");
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
  };

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("يرجى إدخال البريد الإلكتروني أولاً لإرسال كود الاستعادة.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (typeof resetPassword === "function") {
        await resetPassword(cleanEmail);
        setShowRecoveryOtp(true);
        toast.success("تم إرسال كود استعادة كلمة المرور (OTP) إلى بريدك الإلكتروني.");
      }
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : (err?.message || "فشل إرسال كود استعادة كلمة المرور.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecovery = async (e: React.FormEvent) => {
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
      if (typeof verifyRecoveryOTP === "function") {
        await verifyRecoveryOTP(cleanEmail, cleanOtp, cleanNewPassword);
        toast.success("تم تعيين كلمة المرور الجديدة وتسجيل الدخول بنجاح!");
        setShowRecoveryOtp(false);
        setRecoveryOtp("");
        setNewPassword("");
        setActiveTab("license");
      }
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : (err?.message || "فشل تعيين كلمة المرور الجديدة. تحقق من كود الاستعادة والبيانات.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };


  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await activateLicenseKey(licenseKey.trim());
      toast.success("تم تفعيل مفتاح الترخيص بنجاح!");
      setAccountModalOpen(false);
    } catch (err) {
      const errMsg = typeof err === "string" ? err : (err instanceof Error ? err.message : "مفتاح الترخيص غير صالح. يرجى التحقق من الصيغة.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const confirmLogout = async () => {
    await logoutAccount();
    toast.info("تم تسجيل الخروج بنجاح.");
    setAuthMode("login");
    setActiveTab("auth");
  };

  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  useEffect(() => {
    if (user && user.plan === "trial" && user.expiresAt) {
      const expiry = new Date(user.expiresAt).getTime();
      const diff = expiry - Date.now();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrialDaysLeft(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    } else {
      setTrialDaysLeft(0);
    }
  }, [user]);

  const active = isLicenseActive();

  return (
    <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
      <DialogContent 
        className="max-w-sm bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-xl rounded-2xl p-5 dir-rtl fluent-specular" 
        dir="rtl"
      >
        <DialogHeader className="space-y-1 text-right border-b border-border/60 pb-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Person20Filled className="w-4 h-4 text-primary" />
            <span>الحساب والترخيص</span>
          </DialogTitle>
        </DialogHeader>

        {/* 📊 بطاقة حالة الاشتراك والنظام */}
        <div className="bg-muted/40 border border-border/60 p-3 rounded-xl space-y-2 mt-2 fluent-specular">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground text-[11px]">الباقة الحالية:</span>
            {active ? (
              user?.plan === "trial" ? (
                <Badge variant="secondary" className="text-[10px] px-2 py-0 font-semibold rounded-md">
                  تجريبي ({trialDaysLeft} يوم)
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0 font-semibold rounded-md">
                  PRO احترافي
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px] px-2 py-0 font-semibold rounded-md">
                مجاني
              </Badge>
            )}
          </div>

          {user && user.email ? (
            <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2">
              <span className="text-[11px] text-muted-foreground">الحساب:</span>
              <span className="font-mono text-[11px] text-foreground font-semibold">{user.email}</span>
            </div>
          ) : (
            <div className="border border-border/60 rounded-md p-2 flex items-center gap-2 bg-background/50 text-[11px] text-muted-foreground">
              <Warning20Filled className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>سجل دخولك لتشغيل ميزات الحساب السحابية</span>
            </div>
          )}
        </div>

        {/* 🎛️ التبويبات والمحتوى */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-muted p-0.5 rounded-lg h-8 border border-border/40">
            <TabsTrigger 
              value="auth" 
              className="text-xs h-7 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground font-semibold cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
            >
              تسجيل الحساب
            </TabsTrigger>
            <TabsTrigger 
              value="license" 
              className="text-xs h-7 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground font-semibold cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
            >
              مفتاح الترخيص
            </TabsTrigger>
          </TabsList>

          {/* 🔑 تبويب الدخول/التسجيل */}
          <TabsContent value="auth" className="mt-3 space-y-3">
            {showRecoveryOtp ? (
              <form onSubmit={handleVerifyRecovery} className="space-y-3">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2.5 flex items-center gap-2 text-destructive text-xs font-medium">
                    <Warning20Filled className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail20Filled className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      className="pr-8 h-8 text-xs rounded-md"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">كود الاستعادة (OTP)</Label>
                  <div className="relative">
                    <Key20Filled className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      className="pr-8 h-8 text-xs tracking-widest text-center font-mono rounded-md"
                      required
                      value={recoveryOtp}
                      onChange={(e) => setRecoveryOtp(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    أدخل كود الاستعادة المكون من 6 أرقام المرسل إلى {email}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <LockClosed20Filled className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pr-8 h-8 text-xs rounded-md"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-8 text-xs font-bold rounded-md shadow-xs gap-1.5" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الحفظ ...</span>
                    </>
                  ) : (
                    "حفظ كلمة المرور الجديدة وتسجيل الدخول"
                  )}
                </Button>
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecoveryOtp(false);
                      setError(null);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  >
                    إلغاء والعودة لتسجيل الدخول
                  </button>
                </div>
              </form>
            ) : (
              <>
                <form onSubmit={handleAuth} className="space-y-3">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2.5 flex items-center gap-2 text-destructive text-xs font-medium">
                      <Warning20Filled className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {showOtp ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">كود التحقق (OTP)</Label>
                      <div className="relative">
                        <Key20Filled className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="123456"
                          maxLength={6}
                          className="pr-8 h-8 text-xs tracking-widest text-center font-mono rounded-md"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          dir="ltr"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center">
                        تم إرسال الكود إلى {email}
                      </p>

                      <Button 
                        type="submit" 
                        className="w-full h-8 text-xs font-bold rounded-md shadow-xs gap-1.5" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري تأكيد الكود ...</span>
                          </>
                        ) : (
                          "تأكيد الكود وتسجيل الدخول"
                        )}
                      </Button>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/40 mt-2">
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={resending || resendCooldown > 0}
                          className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline cursor-pointer"
                        >
                          {resending ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin inline" /> جاري الإرسال ...
                            </span>
                          ) : resendCooldown > 0 ? (
                            `إعادة الإرسال بعد (${resendCooldown} ث)`
                          ) : (
                            "إعادة إرسال كود التحقق"
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowOtp(false);
                            setError(null);
                          }}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          تغيير البريد
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {authMode === "register" && (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">الاسم الكامل</Label>
                          <div className="relative">
                            <Person20Filled className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              placeholder="الاسم"
                              className="pr-8 h-8 text-xs rounded-md"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Mail20Filled className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="name@example.com"
                            className="pr-8 h-8 text-xs rounded-md"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold">كلمة المرور</Label>
                          {authMode === "login" && (
                            <button
                              type="button"
                              onClick={handleResetPassword}
                              disabled={loading}
                              className="text-[10px] text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline cursor-pointer"
                            >
                              نسيت كلمة المرور؟
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <LockClosed20Filled className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pr-8 h-8 text-xs rounded-md"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-8 text-xs font-bold rounded-md shadow-xs gap-1.5" 
                        disabled={loading || loadingGoogle}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{authMode === "login" ? "جاري تسجيل الدخول ..." : "جاري إنشاء الحساب ..."}</span>
                          </>
                        ) : authMode === "login" ? (
                          "تسجيل الدخول"
                        ) : (
                          "إنشاء حساب"
                        )}
                      </Button>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-border/40"></div>
                        <span className="flex-shrink mx-2 text-[10px] text-muted-foreground">أو</span>
                        <div className="flex-grow border-t border-border/40"></div>
                      </div>

                      <Button 
                        type="button"
                        onClick={handleGoogleLogin}
                        variant="outline"
                        className="w-full h-8 text-xs font-semibold gap-2 border-border rounded-md shadow-2xs"
                        disabled={loading || loadingGoogle}
                      >
                        {loadingGoogle ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري الدخول عبر Google ...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                              <path
                                fill="#EA4335"
                                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.69 5.69 0 0 1 8.24 12.8a5.69 5.69 0 0 1 5.751-5.714c1.47 0 2.824.509 3.89 1.527l3.076-3.076C19.11 3.793 15.932 2.4 12.24 2.4a9.6 9.6 0 0 0-9.6 9.6c0 5.302 4.298 9.6 9.6 9.6c5.8 0 9.69-4.08 9.69-9.873c0-.622-.057-1.12-.132-1.44H12.24Z"
                              />
                            </svg>
                            <span>متابعة باستخدام Google</span>
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </form>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                    className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    {authMode === "login" ? "إنشاء حساب جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}
                  </button>
                </div>
              </>
            )}
          </TabsContent>


          {/* 🏷️ تبويب تفعيل الترخيص */}
          <TabsContent value="license" className="mt-3 space-y-3">
            <div className="space-y-3">
              {user && (user.plan === "pro" || user.plan === "enterprise") ? (
                <div className="bg-muted/30 border border-border rounded-xl p-3 text-center space-y-2 fluent-specular">
                  <div className="inline-flex p-2 bg-emerald-500/10 text-emerald-600 rounded-full">
                    <ShieldCheckmark20Filled className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">النسخة مفعلة بنجاح</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">الباقة: {user.plan === "pro" ? "Pro احترافي" : "Enterprise"}</p>
                  </div>

                  {user.licenseKey && (
                    <div className="bg-background border border-border/60 rounded-md p-1.5 text-center text-[10px] flex items-center justify-between px-3">
                      <div>
                        <span className="text-muted-foreground ml-1">مفتاح التفعيل:</span>
                        <code className="font-mono text-primary font-bold">{user.licenseKey}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.licenseKey || "");
                          toast.success("تم نسخ المفتاح إلى الحافظة");
                        }}
                        className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                      >
                        نسخ
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleActivate} className="space-y-3">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2.5 flex items-center gap-2 text-destructive text-xs font-medium">
                      <Warning20Filled className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold">مفتاح الترخيص (License Key)</Label>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                              setLicenseKey(text.trim().toUpperCase());
                              toast.success("تم لصق المفتاح من الحافظة");
                            }
                          } catch {
                            toast.error("يرجى لصق المفتاح يدوياً");
                          }
                        }}
                        className="text-[10px] text-primary hover:underline font-medium cursor-pointer flex items-center gap-1"
                      >
                        <span>لصق من الحافظة 📋</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Key20Filled className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="GRIDO-PRO-XXXX-XXXX-XXXX"
                        className="pr-8 h-8 text-xs font-mono uppercase rounded-md"
                        required
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-8 text-xs font-bold rounded-md shadow-xs gap-1.5" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري تفعيل الترخيص ...</span>
                      </>
                    ) : (
                      "تفعيل مفتاح الترخيص"
                    )}
                  </Button>
                </form>
              )}

              <div className="flex items-center justify-between border-t border-border/50 pt-2.5 mt-2">
                {user && user.token ? (
                  showLogoutConfirm ? (
                    <div className="flex items-center gap-1.5 text-xs animate-in fade-in-50 duration-150">
                      <span className="text-[11px] text-muted-foreground">تأكيد الخروج؟</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 px-2 text-[10px] font-bold cursor-pointer rounded-md"
                        onClick={confirmLogout}
                      >
                        نعم
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                        onClick={() => setShowLogoutConfirm(false)}
                      >
                        إلغاء
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 h-7 px-2 cursor-pointer rounded-md"
                      onClick={() => setShowLogoutConfirm(true)}
                    >
                      <SignOut20Filled className="w-3 h-3" />
                      <span>تسجيل الخروج</span>
                    </Button>
                  )
                ) : (
                  <div />
                )}

                <a
                  href="https://grido.cloud-ip.cc"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                >
                  <span>شراء ترخيص</span>
                  <Open20Filled className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const path = await ExportSupportLogs();
                      if (path) {
                        toast.success(`تم حفظ السجلات بنجاح في: ${path}`);
                      }
                    } catch (e: any) {
                      toast.error(e?.message || "فشل تصدير السجلات");
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <span>تصدير السجلات</span>
                  <ArrowDownload20Filled className="w-3 h-3" />
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
