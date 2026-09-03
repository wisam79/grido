import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Key,
  User,
  SignOut,
} from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useAuthForms } from "./account/use-auth-forms";
import { AuthTabContent } from "./account/auth-tab-content";
import { LicenseTabContent } from "./account/license-tab-content";

export function AccountLicenseModal() {
  const {
    user,
    accountModalOpen,
    setAccountModalOpen,
    activateLicenseKey,
    logoutAccount,
    isLicenseActive,
  } = useEditorStore(
    useShallow((state) => ({
      user: state.user,
      accountModalOpen: state.accountModalOpen,
      setAccountModalOpen: state.setAccountModalOpen,
      activateLicenseKey: state.activateLicenseKey,
      logoutAccount: state.logoutAccount,
      isLicenseActive: state.isLicenseActive,
    }))
  );

  const [activeTab, setActiveTab] = useState<"auth" | "license">(() => {
    const user = useEditorStore.getState().user;
    if (user && user.token) {
      return "license";
    }
    return "auth";
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  // 🧭 نماذج المصادقة (كانت مضمّنة هنا): دخول/تسجيل/OTP/استعادة
  const forms = useAuthForms(() => {
    setAccountModalOpen(false);
    setActiveTab("license");
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowLogoutConfirm(false);
    setLicenseError(null);
    if (!accountModalOpen) return;
    const currentUser = useEditorStore.getState().user;
    setActiveTab(currentUser && currentUser.token ? "license" : "auth");
  }, [accountModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const confirmLogout = async () => {
    await logoutAccount();
    toast.info("تم تسجيل الخروج بنجاح.");
    forms.setAuthMode("login");
    setActiveTab("auth");
  };

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
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "auth" | "license")} className="w-full mt-3.5">
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
              className="text-xs h-7 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs font-bold cursor-pointer select-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none flex items-center justify-center gap-1.5 transition-all"
            >
              <Key className="w-3.5 h-3.5" weight="bold" />
              <span>مفتاح الترخيص</span>
            </TabsTrigger>
          </TabsList>

          {/* 🔑 تبويب الدخول/التسجيل */}
          <TabsContent value="auth" className="mt-3.5 space-y-3.5 animate-in fade-in-50 duration-150">
            <AuthTabContent forms={forms} />
          </TabsContent>

          {/* 🏷️ تبويب تفعيل الترخيص */}
          <TabsContent value="license" className="mt-3.5 space-y-3.5 animate-in fade-in-50 duration-150">
            <LicenseTabContent
              user={user}
              licenseActive={active}
              onActivate={async (key) => {
                await activateLicenseKey(key);
                setAccountModalOpen(false);
              }}
              onClearError={() => setLicenseError(null)}
              error={licenseError}
              onError={setLicenseError}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
