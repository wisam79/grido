import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExportSupportLogs } from "../../../../wailsjs/go/main/App";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/huge-icon";
import {
  ShieldCheck,
  Warning,
  EnvelopeSimple,
  Key,
  Lock,
  User,
  SignOut,
  ArrowSquareOut,
  DownloadSimple,
} from "@phosphor-icons/react";
import { GoogleIcon } from "@/components/ui/image-icons";
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
        showCloseButton={false}
        className="w-[95vw] sm:max-w-[460px] bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl rounded-2xl p-5 sm:p-6 dir-rtl fluent-specular overflow-hidden" 
        dir="rtl"
      >
        {/* 🔹 1. رأس النافذة المتناسق مع زر الإغلاق المدمج */}
        <DialogHeader className="text-right border-b border-border/40 pb-3.5 space-y-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
                <ShieldCheck className="w-5.5 h-5.5" weight="duotone" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground tracking-tight truncate">
                  الحساب والترخيص
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                  {user && user.token ? "إدارة اشتراكك وحسابك السحابي" : "سجل دخولك لتفعيل ميزات الذكاء الاصطناعي والمزامنة"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* شارة الخطة السريعة في الهيدر إن كان مسجلاً */}
              {user && user.token && (
                <div>
                  {active ? (
                    user?.plan === "trial" ? (
                      <span className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] px-2.5 py-0.5 font-bold rounded-full shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        تجريبي ({trialDaysLeft} يوم)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 font-bold rounded-full shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        PRO احترافي
                      </span>
                    )
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground text-[10px] px-2 py-0 font-semibold rounded-full border-border/80">
                      مجاني
                    </Badge>
                  )}
                </div>
              )}

              {/* زر الإغلاق المدمج في شريط العنوان */}
              <DialogCloseButton />
            </div>
          </div>
        </DialogHeader>

        {/* 🔹 2. بطاقة الملف الشخصي للمستخدم المسجل (Profile Bento Hero) */}
        {user && user.token && (
          <div className="bg-muted/40 dark:bg-muted/20 border border-border/60 dark:border-white/10 p-3 rounded-xl flex items-center justify-between mt-3.5 fluent-specular">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/15 text-primary border border-primary/30 font-bold text-xs flex items-center justify-center shrink-0">
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 text-right">
                <span className="text-xs font-bold text-foreground block truncate">
                  {user.name || "مستخدم مسجل"}
                </span>
                <span className="font-mono text-[10.5px] text-muted-foreground truncate block">
                  {user.email}
                </span>
              </div>
            </div>

            {showLogoutConfirm ? (
              <div className="flex items-center gap-1 animate-in fade-in-50 duration-150 shrink-0">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-6.5 px-2 text-[10px] font-bold cursor-pointer rounded-md"
                  onClick={confirmLogout}
                >
                  تأكيد الخروج
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6.5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 h-7 px-2 cursor-pointer rounded-lg font-semibold shrink-0"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <SignOut className="w-3.5 h-3.5 shrink-0" weight="bold" />
                <span>خروج</span>
              </Button>
            )}
          </div>
        )}

        {/* 🔹 3. هيكل التبويبات والمحتوى الأساسي (Tabs & Core Deck) */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full mt-3.5">
          <TabsList className="grid w-full grid-cols-2 bg-muted/70 p-1 rounded-xl h-9 border border-border/40">
            <TabsTrigger 
              value="auth" 
              className="text-xs h-7 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs font-bold cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center gap-1.5 transition-all"
            >
              <User className="w-3.5 h-3.5" weight="bold" />
              <span>تسجيل الحساب</span>
            </TabsTrigger>
            <TabsTrigger 
              value="license" 
              className="text-xs h-7 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs font-bold cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center gap-1.5 transition-all"
            >
              <Key className="w-3.5 h-3.5" weight="bold" />
              <span>مفتاح الترخيص</span>
            </TabsTrigger>
          </TabsList>

          {/* 🔑 تبويب الدخول/التسجيل */}
          <TabsContent value="auth" className="mt-3.5 space-y-3.5 animate-in fade-in-50 duration-150">
            {showRecoveryOtp ? (
              <form onSubmit={handleVerifyRecovery} className="space-y-3">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center gap-2 text-destructive text-xs font-semibold">
                    <Warning className="w-4 h-4 shrink-0" weight="duotone" />
                    <span>{error}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground/90">البريد الإلكتروني</Label>
                  <div className="relative">
                    <EnvelopeSimple className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      className="pr-9 h-9 text-xs rounded-lg"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground/90">كود الاستعادة (OTP)</Label>
                  <div className="relative">
                    <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                    <Input
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      className="pr-9 h-9 text-xs tracking-widest text-center font-mono rounded-lg"
                      required
                      value={recoveryOtp}
                      onChange={(e) => setRecoveryOtp(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    أدخل كود الاستعادة المكون من 6 أرقام المرسل إلى {email}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground/90">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="pr-9 h-9 text-xs rounded-lg"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-9 text-xs font-bold rounded-lg shadow-sm gap-1.5 cursor-pointer" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner className="w-4 h-4" size={16} />
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
                    className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                  >
                    إلغاء والعودة لتسجيل الدخول
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* زر الدخول السريع عبر Google في مقدمة التفاعل */}
                <Button 
                  type="button"
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full h-9 text-xs font-bold gap-2.5 border-border/80 dark:border-white/15 bg-background hover:bg-muted/70 dark:bg-card/80 dark:hover:bg-accent rounded-lg shadow-2xs hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none"
                  disabled={loading || loadingGoogle}
                >
                  {loadingGoogle ? (
                    <>
                      <Spinner className="w-4 h-4 text-primary" size={16} />
                      <span>جاري الدخول عبر Google ...</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
                      <span className="font-semibold text-foreground/90 group-hover:text-foreground">
                        متابعة باستخدام Google
                      </span>
                    </>
                  )}
                </Button>

                <div className="relative flex py-0.5 items-center">
                  <div className="flex-grow border-t border-border/40"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-muted-foreground font-medium">أو بالبريد الإلكتروني</span>
                  <div className="flex-grow border-t border-border/40"></div>
                </div>

                <form onSubmit={handleAuth} className="space-y-3">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center gap-2 text-destructive text-xs font-semibold">
                      <Warning className="w-4 h-4 shrink-0" weight="duotone" />
                      <span>{error}</span>
                    </div>
                  )}
                  {showOtp ? (
                    <div className="space-y-2.5">
                      <Label className="text-xs font-bold text-foreground/90">كود التحقق (OTP)</Label>
                      <div className="relative">
                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                        <Input
                          type="text"
                          placeholder="123456"
                          maxLength={6}
                          className="pr-9 h-9 text-xs tracking-widest text-center font-mono rounded-lg"
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          dir="ltr"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center">
                        تم إرسال الكود إلى {email}
                      </p>

                      <Button 
                        type="submit" 
                        className="w-full h-9 text-xs font-bold rounded-lg shadow-sm gap-1.5 cursor-pointer" 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner className="w-4 h-4" size={16} />
                            <span>جاري تأكيد الكود ...</span>
                          </>
                        ) : (
                          "تأكيد الكود وتسجيل الدخول"
                        )}
                      </Button>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40 mt-2">
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={resending || resendCooldown > 0}
                          className="text-primary hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer"
                        >
                          {resending ? (
                            <span className="flex items-center gap-1">
                              <Spinner className="w-3.5 h-3.5 inline" size={14} /> جاري الإرسال ...
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
                          className="text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                        >
                          تغيير البريد
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {authMode === "register" && (
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-foreground/90">الاسم الكامل</Label>
                          <div className="relative">
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                            <Input
                              placeholder="الاسم"
                              className="pr-9 h-9 text-xs rounded-lg"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-foreground/90">البريد الإلكتروني</Label>
                        <div className="relative">
                          <EnvelopeSimple className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                          <Input
                            type="email"
                            placeholder="name@example.com"
                            className="pr-9 h-9 text-xs rounded-lg"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-foreground/90">كلمة المرور</Label>
                          {authMode === "login" && (
                            <button
                              type="button"
                              onClick={handleResetPassword}
                              disabled={loading}
                              className="text-[11px] text-primary hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer"
                            >
                              نسيت كلمة المرور؟
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pr-9 h-9 text-xs rounded-lg"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full h-9 text-xs font-bold rounded-lg shadow-sm gap-1.5 cursor-pointer" 
                        disabled={loading || loadingGoogle}
                      >
                        {loading ? (
                          <>
                            <Spinner className="w-4 h-4" size={16} />
                            <span>{authMode === "login" ? "جاري تسجيل الدخول ..." : "جاري إنشاء الحساب ..."}</span>
                          </>
                        ) : authMode === "login" ? (
                          "تسجيل الدخول"
                        ) : (
                          "إنشاء حساب"
                        )}
                      </Button>
                    </>
                  )}
                </form>

                <div className="text-center pt-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                    className="text-xs text-primary hover:underline font-bold cursor-pointer"
                  >
                    {authMode === "login" ? "إنشاء حساب جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}
                  </button>
                </div>
              </>
            )}
          </TabsContent>

          {/* 🏷️ تبويب تفعيل الترخيص */}
          <TabsContent value="license" className="mt-3.5 space-y-3.5 animate-in fade-in-50 duration-150">
            <div className="space-y-3.5">
              {user && (user.plan === "pro" || user.plan === "enterprise") ? (
                <div className="bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl p-4 text-center space-y-2.5 fluent-specular">
                  <div className="inline-flex p-2.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/30 shadow-2xs">
                    <ShieldCheck className="w-6 h-6 shrink-0" weight="duotone" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">النسخة مفعلة بنجاح</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">الباقة: {user.plan === "pro" ? "Pro احترافي" : "Enterprise"}</p>
                  </div>

                  {user.licenseKey && (
                    <div className="bg-background/80 border border-border/80 rounded-lg p-2 text-center text-xs flex items-center justify-between px-3">
                      <div>
                        <span className="text-muted-foreground ml-1 font-medium">مفتاح التفعيل:</span>
                        <code className="font-mono text-primary font-bold text-xs">{user.licenseKey}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.licenseKey || "");
                          toast.success("تم نسخ المفتاح إلى الحافظة");
                        }}
                        className="text-xs text-primary hover:underline font-bold cursor-pointer"
                      >
                        نسخ
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleActivate} className="space-y-3.5">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2.5 flex items-center gap-2 text-destructive text-xs font-semibold">
                      <Warning className="w-4 h-4 shrink-0" weight="duotone" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-foreground/90">مفتاح الترخيص (License Key)</Label>
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
                        className="text-[11px] text-primary hover:underline font-bold cursor-pointer flex items-center gap-1"
                      >
                        <span>لصق من الحافظة 📋</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 shrink-0" />
                      <Input
                        placeholder="GRIDO-PRO-XXXX-XXXX-XXXX"
                        className="pr-9 h-9 text-xs font-mono uppercase rounded-lg tracking-wider"
                        required
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-9 text-xs font-bold rounded-lg shadow-sm gap-1.5 cursor-pointer" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner className="w-4 h-4" size={16} />
                        <span>جاري تفعيل الترخيص ...</span>
                      </>
                    ) : (
                      "تفعيل مفتاح الترخيص"
                    )}
                  </Button>
                </form>
              )}

              {/* 🔹 الشريط السفلي للإجراءات والمعلومات */}
              <div className="flex items-center justify-between border-t border-border/50 pt-3 mt-3">
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
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium"
                >
                  <DownloadSimple className="w-3.5 h-3.5 shrink-0" weight="bold" />
                  <span>السجلات</span>
                </button>

                <a
                  href="https://grido.cloud-ip.cc"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline font-bold"
                >
                  <span>شراء ترخيص</span>
                  <ArrowSquareOut className="w-3.5 h-3.5 shrink-0" weight="bold" />
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
