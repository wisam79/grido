import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExportSupportLogs } from "../../../../wailsjs/go/main/App";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Key,
  Mail,
  Lock,
  Loader2,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
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
    isLicenseActive,
    verifyOTP,
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
      isLicenseActive: state.isLicenseActive,
      verifyOTP: state.verifyOTP,
    }))
  );

  // Form states
  const [activeTab, setActiveTab] = useState<"auth" | "license">(() => {
    const user = useEditorStore.getState().user;
    if (user && user.plan !== "free" && user.token) {
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
  const [error, setError] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (showOtp) {
        await verifyOTP(email, otpCode);
        toast.success("تم تأكيد الحساب وتسجيل الدخول بنجاح!");
        setShowOtp(false);
        setActiveTab("license");
      } else {
        let profile;
        if (authMode === "login") {
          profile = await loginAccount(email, password);
        } else {
          profile = await registerAccount(name, email, password);
        }
        
        if (profile.status === "pending_otp") {
          setShowOtp(true);
          toast.info("تم إرسال كود التحقق المكون من 6 أرقام إلى بريدك الإلكتروني.");
        } else {
          toast.success("تم تسجيل الدخول بنجاح!");
          setActiveTab("license");
        }
      }
    } catch (err) {
      const errMsg = typeof err === "string" ? err : (err instanceof Error ? err.message : "فشلت العملية، يرجى التحقق من المدخلات.");
      if (errMsg.includes("تم إنشاء الحساب بنجاح")) {
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

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await activateLicenseKey(licenseKey);
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
        className="max-w-sm bg-background border border-border shadow-lg rounded-xl p-5 dir-rtl" 
        dir="rtl"
      >
        <DialogHeader className="space-y-1 text-right border-b border-border/60 pb-3">
          <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <User className="w-4 h-4 text-primary" />
            <span>الحساب والترخيص</span>
          </DialogTitle>
        </DialogHeader>

        {/* 📊 بطاقة حالة الاشتراك والنظام */}
        <div className="bg-muted/40 border border-border/60 p-3 rounded-lg space-y-2 mt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground text-[11px]">الباقة الحالية:</span>
            {active ? (
              user?.plan === "trial" ? (
                <Badge variant="secondary" className="text-[10px] px-2 py-0 font-medium">
                  تجريبي ({trialDaysLeft} يوم)
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0 font-medium">
                  PRO احترافي
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px] px-2 py-0 font-medium">
                مجاني
              </Badge>
            )}
          </div>

          {user && user.email ? (
            <div className="flex justify-between items-center text-xs border-t border-border/40 pt-2">
              <span className="text-[11px] text-muted-foreground">الحساب:</span>
              <span className="font-mono text-[11px] text-foreground font-medium">{user.email}</span>
            </div>
          ) : (
            <div className="border border-border/60 rounded-md p-2 flex items-center gap-2 bg-background/50 text-[11px] text-muted-foreground">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>سجل دخولك لتشغيل ميزات الحساب السحابية</span>
            </div>
          )}
        </div>

        {/* 🎛️ التبويبات والمحتوى */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg h-9 border border-border/40">
            <TabsTrigger 
              value="auth" 
              disabled={!!(user && user.token)} 
              className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground font-medium"
            >
              تسجيل الحساب
            </TabsTrigger>
            <TabsTrigger 
              value="license" 
              disabled={!(user && user.token)} 
              className="text-xs rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground font-medium"
            >
              مفتاح الترخيص
            </TabsTrigger>
          </TabsList>

          {/* 🔑 تبويب الدخول/التسجيل */}
          <TabsContent value="auth" className="mt-3 space-y-3">
            <form onSubmit={handleAuth} className="space-y-3">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2.5 flex items-center gap-2 text-destructive text-xs font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {showOtp ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">كود التحقق (OTP)</Label>
                  <div className="relative">
                    <Key className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      className="pr-8 h-9 text-xs tracking-widest text-center font-mono"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    تم إرسال الكود إلى {email}
                  </p>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowOtp(false)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      تغيير البريد
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {authMode === "register" && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">الاسم الكامل</Label>
                      <div className="relative">
                        <User className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="الاسم"
                          className="pr-8 h-9 text-xs"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        className="pr-8 h-9 text-xs"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pr-8 h-9 text-xs"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-9 text-xs font-bold" 
                    disabled={loading || loadingGoogle}
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
                    className="w-full h-9 text-xs font-medium gap-2 border-border"
                    disabled={loading || loadingGoogle}
                  >
                    {loadingGoogle ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
                className="text-[11px] text-primary hover:underline font-medium"
              >
                {authMode === "login" ? "إنشاء حساب جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}
              </button>
            </div>
          </TabsContent>

          {/* 🏷️ تبويب تفعيل الترخيص */}
          <TabsContent value="license" className="mt-3 space-y-3">
            {user && user.token && (
              <div className="space-y-3">
                {user.plan === "pro" || user.plan === "enterprise" ? (
                  <div className="bg-muted/30 border border-border rounded-lg p-3 text-center space-y-2">
                    <div className="inline-flex p-2 bg-emerald-500/10 text-emerald-600 rounded-full">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground">النسخة مفعلة بنجاح</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">الباقة: {user.plan === "pro" ? "Pro احترافي" : "Enterprise"}</p>
                    </div>

                    {user.licenseKey && (
                      <div className="bg-background border border-border/60 rounded p-1.5 text-center text-[10px]">
                        <span className="text-muted-foreground ml-1">مفتاح التفعيل:</span>
                        <code className="font-mono text-primary font-bold">{user.licenseKey}</code>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleActivate} className="space-y-3">
                    {error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2.5 flex items-center gap-2 text-destructive text-xs font-medium">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">مفتاح الترخيص (License Key)</Label>
                      <div className="relative">
                        <Key className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="GRIDO-PRO-XXXX-XXXX-XXXX"
                          className="pr-8 h-9 text-xs font-mono uppercase"
                          required
                          value={licenseKey}
                          onChange={(e) => setLicenseKey(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-9 text-xs font-bold" 
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "تفعيل مفتاح الترخيص"
                      )}
                    </Button>
                  </form>
                )}

                <div className="flex items-center justify-between border-t border-border/50 pt-2.5 mt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 h-7 px-2">
                        <LogOut className="w-3 h-3" />
                        <span>تسجيل الخروج</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="dir-rtl text-right" dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>تسجيل الخروج</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من رغبتك في تسجيل الخروج؟
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row-reverse sm:justify-start gap-2">
                        <AlertDialogAction onClick={confirmLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          تأكيد الخروج
                        </AlertDialogAction>
                        <AlertDialogCancel className="mt-0 border-border">إلغاء</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <a
                    href="https://grido.cloud-ip.cc"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <span>شراء ترخيص</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
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
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>تصدير السجلات</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
