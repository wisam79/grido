import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sparkles,
  Printer,
  Download,
  LayoutGrid,
  CheckCircle2,
  Smartphone,
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
    }))
  );

  // Form states
  const [activeTab, setActiveTab] = useState<"auth" | "license">("auth");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset errors when modal status changes or tabs toggle
  useEffect(() => {
    setError(null);
  }, [activeTab, authMode, accountModalOpen]);

  // Automatically switch tabs if user is logged in
  useEffect(() => {
    if (user && user.plan !== "free" && user.token) {
      setActiveTab("license");
    } else {
      setActiveTab("auth");
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError(null);
    try {
      await loginWithGoogle();
      toast.success("تم تسجيل الدخول وتفعيل حسابك عبر Google بنجاح!");
      setAccountModalOpen(false);
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : (err?.message || "فشلت عملية تسجيل الدخول عبر Google.");
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
      if (authMode === "login") {
        await loginAccount(email, password);
        toast.success("تم تسجيل الدخول بنجاح! تم تنشيط الفترة التجريبية (7 أيام) تلقائياً.");
      } else {
        await registerAccount(name, email, password);
        toast.success("تم إنشاء الحساب وتنشيط الفترة التجريبية (7 أيام) بنجاح!");
      }
      setActiveTab("license");
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : (err?.message || "فشلت العملية، يرجى التحقق من المدخلات.");
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
      toast.success("تهانينا! تم تفعيل مفتاح الترخيص بنجاح، وترقية حسابك إلى باقة Pro الاحترافية.");
      setAccountModalOpen(false);
    } catch (err: any) {
      const errMsg = typeof err === "string" ? err : (err?.message || "مفتاح الترخيص غير صالح. يرجى التحقق من الصيغة.");
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("هل أنت متأكد من رغبتك في تسجيل الخروج؟")) {
      await logoutAccount();
      toast.info("تم تسجيل الخروج بنجاح.");
      setAuthMode("login");
      setActiveTab("auth");
    }
  };

  // Calculate remaining days for Trial
  const getTrialDaysLeft = () => {
    if (!user || user.plan !== "trial" || !user.expiresAt) return 0;
    const expiry = new Date(user.expiresAt).getTime();
    const now = Date.now();
    const diff = expiry - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const trialDaysLeft = getTrialDaysLeft();
  const active = isLicenseActive();

  return (
    <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
      <DialogContent className="max-w-md bg-background/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl p-6" dir="rtl">
        <DialogHeader className="space-y-3 text-right">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20">
              <User className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm font-extrabold text-foreground tracking-tight">إدارة الحساب والتراخيص</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">سجل دخولك أو فعّل مفتاح الترخيص لفتح كامل الميزات</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* 📊 صندوق حالة الاشتراك الحالي */}
        <div className="bg-card border border-border/60 p-4 rounded-xl space-y-3.5 shadow-xs">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-muted-foreground">حالة الاشتراك الحالية:</span>
            {active ? (
              user?.plan === "trial" ? (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                  نسخة تجريبية ({trialDaysLeft} أيام متبقية)
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                  مفعّل PRO
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-border text-[10px] px-2 py-0.5 rounded-md bg-muted/40 font-bold">
                خطة مجانية مقيدة
              </Badge>
            )}
          </div>

          {user && user.email ? (
            <div className="flex justify-between items-center text-xs border-t border-border/40 pt-3">
              <span className="text-[11px] text-muted-foreground">المستخدم النشط:</span>
              <span className="font-bold text-foreground">{user.email}</span>
            </div>
          ) : (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">خطة مجانية محدودة</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                يرجى تسجيل الدخول أو إنشاء حساب جديد لتنشيط باقة تجريبية متكاملة مجاناً لمدة 7 أيام فوراً.
              </p>
            </div>
          )}

          {/* 🌟 قائمة مقارنة الميزات وقيود الباقة */}
          <div className="border-t border-border/60 pt-3 space-y-2 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">عدد المشاريع المتاحة:</span>
              <span className={`font-bold flex items-center gap-1.5 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500'}`}>
                {active ? 'غير محدودة' : 'الحد الأقصى 3 مشاريع'}
                <CheckCircle2 className={`w-3.5 h-3.5 ${active ? 'text-emerald-500' : 'text-amber-500/40'}`} />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">إزالة علامة التصدير المائية:</span>
              <span className={`font-bold flex items-center gap-1.5 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500'}`}>
                {active ? 'بدون علامة مائية' : 'مفعّلة على التصاميم'}
                <CheckCircle2 className={`w-3.5 h-3.5 ${active ? 'text-emerald-500' : 'text-amber-500/40'}`} />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">عزل الخلفية الذكي والطباعة:</span>
              <span className={`font-bold flex items-center gap-1.5 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60'}`}>
                {active ? 'متاحة بالكامل' : 'مغلقة'}
                <CheckCircle2 className={`w-3.5 h-3.5 ${active ? 'text-emerald-500' : 'text-muted-foreground/30'}`} />
              </span>
            </div>
          </div>
        </div>

        {/* 🎛️ إدارة التبويبات والمحتوى */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full mt-2 font-cairo">
          <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-xl h-10 border border-border/40">
            <TabsTrigger 
              value="auth" 
              disabled={!!(user && user.token)} 
              className="text-xs rounded-lg cursor-pointer transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              تسجيل الحساب
            </TabsTrigger>
            <TabsTrigger 
              value="license" 
              disabled={!(user && user.token)} 
              className="text-xs rounded-lg cursor-pointer transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              مفتاح الترخيص
            </TabsTrigger>
          </TabsList>

          {/* 🔑 تبويب المصادقة وإنشاء الحساب */}
          <TabsContent value="auth" className="mt-4 space-y-4">
            <form onSubmit={handleAuth} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center gap-2 text-destructive text-xs font-bold leading-relaxed">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {authMode === "register" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground/80 font-bold">الاسم بالكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      placeholder="أدخل اسمك"
                      className="pr-9 h-10 text-xs bg-card border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary rounded-lg text-foreground"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/80 font-bold">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    className="pr-9 h-10 text-xs bg-card border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary rounded-lg text-foreground"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/80 font-bold">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pr-9 h-10 text-xs bg-card border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary rounded-lg text-foreground"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-10 mt-2 gap-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all duration-200 border-0 cursor-pointer shadow-xs active:scale-[0.98]" 
                disabled={loading || loadingGoogle}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authMode === "login" ? (
                  "تسجيل الدخول"
                ) : (
                  "إنشاء الحساب وتفعيل الأسبوع المجاني"
                )}
              </Button>

              <div className="relative flex py-1.5 items-center">
                <div className="flex-grow border-t border-border/40"></div>
                <span className="flex-shrink mx-3 text-[10px] text-muted-foreground font-bold">أو</span>
                <div className="flex-grow border-t border-border/40"></div>
              </div>

              <Button 
                type="button"
                onClick={handleGoogleLogin}
                variant="outline"
                className="w-full h-10 gap-2.5 text-xs font-bold border-border/60 hover:bg-muted/50 rounded-xl transition-all duration-200 cursor-pointer shadow-xs active:scale-[0.98] text-foreground"
                disabled={loading || loadingGoogle}
              >
                {loadingGoogle ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.69 5.69 0 0 1 8.24 12.8a5.69 5.69 0 0 1 5.751-5.714c1.47 0 2.824.509 3.89 1.527l3.076-3.076C19.11 3.793 15.932 2.4 12.24 2.4a9.6 9.6 0 0 0-9.6 9.6c0 5.302 4.298 9.6 9.6 9.6c5.8 0 9.69-4.08 9.69-9.873c0-.622-.057-1.12-.132-1.44H12.24Z"
                      />
                    </svg>
                    <span>الدخول بحساب Google</span>
                  </>
                )}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                className="text-[10px] text-primary hover:text-primary/80 hover:underline font-bold cursor-pointer"
              >
                {authMode === "login" ? "لا تملك حساباً؟ أنشئ حساباً جديداً" : "لديك حساب بالفعل؟ سجل دخولك"}
              </button>
            </div>
          </TabsContent>

          {/* 🏷️ تبويب تفعيل الترخيص الاحترافي */}
          <TabsContent value="license" className="mt-4 space-y-4">
            {user && user.token && (
              <div className="space-y-4">
                {user.plan === "pro" || user.plan === "enterprise" ? (
                  <div className="bg-card border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-5 text-center space-y-4 shadow-lg shadow-emerald-500/5 relative overflow-hidden select-none">
                    <div className="absolute -right-10 -top-10 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-primary/5 dark:bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20 animate-pulse">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-foreground tracking-wide">الترخيص مفعل بنشاط</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal">التطبيق مرخص بالكامل ويعمل بدون أي قيود.</p>
                    </div>

                    <div className="bg-muted/50 border border-border/60 rounded-xl p-3.5 text-right space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-muted-foreground">نوع الباقة الحالية:</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          {user.plan === "pro" ? "Pro احترافي" : "Enterprise مؤسسات"}
                        </span>
                      </div>
                      {user.licenseKey && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground">مفتاح التفعيل:</span>
                          <code className="font-mono text-[10px] bg-card border border-border px-2 py-1 rounded text-primary font-bold tracking-wider">{user.licenseKey}</code>
                        </div>
                      )}
                      {user.expiresAt && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground">تاريخ انتهاء الصلاحية:</span>
                          <span className="font-mono text-foreground">{new Date(user.expiresAt).toLocaleDateString("ar-SA")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleActivate} className="space-y-4">
                    {error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center gap-2 text-destructive text-xs font-bold leading-relaxed">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs text-foreground/80 font-bold">مفتاح الترخيص (License Key)</Label>
                        <Badge variant="outline" className="text-[8px] bg-muted/60 text-primary border-primary/20 uppercase select-none">
                          GRIDO-XXXX-XXXX-XXXX
                        </Badge>
                      </div>
                      <div className="relative">
                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        <Input
                          placeholder="GRIDO-PRO-XXXX-XXXX-XXXX"
                          className="pr-9 h-10 text-xs font-mono bg-card border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary rounded-lg text-foreground uppercase"
                          required
                          value={licenseKey}
                          onChange={(e) => setLicenseKey(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-10 mt-2 gap-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all duration-200 border-0 cursor-pointer shadow-xs active:scale-[0.98]" 
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "تفعيل مفتاح الترخيص"
                      )}
                    </Button>
                  </form>
                )}

                <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-2">
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5 h-8.5 px-3 rounded-lg">
                    <LogOut className="w-3.5 h-3.5" />
                    <span>تسجيل الخروج</span>
                  </Button>

                  <a
                    href="https://grido.studio/pricing"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline hover:text-primary/80 leading-none"
                  >
                    <span>شراء ترخيص جديد</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
