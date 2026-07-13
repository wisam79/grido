import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Key,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Sparkles,
  BarChart3,
  Copy,
  Plus,
  RefreshCw,
  Clock,
  Mail,
  UserCheck,
} from "lucide-react";
import { useEditorStore } from "@/lib/editor-store";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

interface AdminDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminDashboardDialog({ open, onOpenChange }: AdminDashboardDialogProps) {
  const {
    adminUsers,
    licenseLoading,
    adminFetchAllUsers,
    adminGenerateKey,
    adminRevokeLicense,
    adminExtendLicense,
  } = useEditorStore(
    useShallow((state) => ({
      adminUsers: state.adminUsers,
      licenseLoading: state.licenseLoading,
      adminFetchAllUsers: state.adminFetchAllUsers,
      adminGenerateKey: state.adminGenerateKey,
      adminRevokeLicense: state.adminRevokeLicense,
      adminExtendLicense: state.adminExtendLicense,
    }))
  );

  const [activeTab, setActiveTab] = useState<"users" | "generator" | "stats">("users");

  // Key generator form
  const [genPlan, setGenPlan] = useState<"PRO" | "ENTERPRISE">("PRO");
  const [genDuration, setGenDuration] = useState("12"); // default 12 months
  const [generatedKey, setGeneratedKey] = useState("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      adminFetchAllUsers();
    }
  }, [open, adminFetchAllUsers]);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const months = parseInt(genDuration, 10) || 12;
      const key = await adminGenerateKey(genPlan, months);
      setGeneratedKey(key);
      toast.success("تم توليد مفتاح الترخيص بنجاح!");
      adminFetchAllUsers(); // update user stats if mock updated
    } catch (err: any) {
      toast.error(err.message || "فشل توليد مفتاح الترخيص");
    }
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success("تم نسخ مفتاح الترخيص إلى الحافظة!");
    }
  };

  const handleRevoke = async (email: string) => {
    try {
      await adminRevokeLicense(email);
      toast.success("تم إلغاء الترخيص وإرجاع الحساب للخطة المجانية.");
    } catch (err: any) {
      toast.error(err.message || "فشلت عملية إلغاء الترخيص");
    }
  };

  const handleExtend = async (email: string, months: number) => {
    try {
      await adminExtendLicense(email, months);
      toast.success(`تم تمديد اشتراك المستخدم بمقدار ${months} شهر بنجاح.`);
    } catch (err: any) {
      toast.error(err.message || "فشلت عملية التمديد");
    }
  };

  // Filter users based on search
  const filteredUsers = adminUsers.filter(
    (u) =>
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.plan && u.plan.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Compute stats
  const totalUsers = adminUsers.length;
  const activePro = adminUsers.filter((u) => u.plan === "pro" || u.plan === "enterprise").length;
  const activeTrial = adminUsers.filter(
    (u) => u.plan === "trial" && new Date(u.expiresAt) > new Date()
  ).length;
  const expiredUsers = adminUsers.filter(
    (u) => u.status === "expired" || (u.plan === "trial" && new Date(u.expiresAt) <= new Date())
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-lg border border-border/80 shadow-2xl rounded-2xl p-6 h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader className="space-y-1.5 text-right shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>لوحة تحكم إدارة الاشتراكات والتراخيص</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            إدارة الحسابات، توليد وتمديد مفاتيح الترخيص لـ Grido Studio
          </DialogDescription>
        </DialogHeader>

        {/* التبويبات الرئيسية */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col overflow-hidden mt-3 font-cairo">
          <TabsList className="grid w-full grid-cols-3 bg-muted p-1 rounded-lg h-9 shrink-0">
            <TabsTrigger value="users" className="text-xs rounded-md cursor-pointer flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              <span>إدارة المشتركين</span>
            </TabsTrigger>
            <TabsTrigger value="generator" className="text-xs rounded-md cursor-pointer flex items-center gap-2">
              <Key className="w-3.5 h-3.5" />
              <span>توليد التراخيص</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs rounded-md cursor-pointer flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>الإحصائيات العامة</span>
            </TabsTrigger>
          </TabsList>

          {/* تبويب جدول المشتركين */}
          <TabsContent value="users" className="flex-1 flex flex-col overflow-hidden mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1">
                <Input
                  placeholder="ابحث بالبريد الإلكتروني، الاسم، الباقة..."
                  className="h-9.5 text-xs pr-4 pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9.5 gap-1.5 text-xs font-semibold"
                onClick={() => adminFetchAllUsers()}
                disabled={licenseLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${licenseLoading ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </Button>
            </div>

            {/* الجدول الفعلي */}
            <div className="flex-1 border rounded-xl overflow-hidden bg-card/50 flex flex-col">
              <div className="overflow-y-auto flex-1 text-right text-xs">
                {filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                    <Users className="w-8 h-8 opacity-40" />
                    <span>لا توجد نتائج مطابقة لبحثك</span>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border/60 text-[10px] text-muted-foreground uppercase font-bold">
                        <th className="p-3 text-right">المشترك</th>
                        <th className="p-3 text-right">الباقة الحالية</th>
                        <th className="p-3 text-right">تاريخ الانتهاء</th>
                        <th className="p-3 text-right">مفتاح الترخيص</th>
                        <th className="p-3 text-center">العمليات والإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isUserActive = u.plan === "pro" || u.plan === "enterprise" || (u.plan === "trial" && new Date(u.expiresAt) > new Date());
                        return (
                          <tr key={u.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-foreground">{u.name || "مستخدم غير معروف"}</div>
                              <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" />
                                {u.email}
                              </div>
                            </td>
                            <td className="p-3">
                              {u.plan === "pro" ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] font-bold">PRO احترافي</Badge>
                              ) : u.plan === "enterprise" ? (
                                <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[9px] font-bold">Enterprise مؤسسات</Badge>
                              ) : u.plan === "trial" ? (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] font-bold">تجريبي (Trial)</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground border-border text-[9px] font-bold">مجاني (Free)</Badge>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground font-mono text-[10px]">
                              {u.expiresAt ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground/60" />
                                  <span>{new Date(u.expiresAt).toLocaleDateString("ar-SA")}</span>
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="p-3">
                              {u.licenseKey ? (
                                <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold select-all">{u.licenseKey}</code>
                              ) : (
                                <span className="text-muted-foreground/60">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/5 cursor-pointer font-bold px-2 rounded-md"
                                  onClick={() => handleExtend(u.email, 1)}
                                >
                                  تمديد (+1 شهر)
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/5 cursor-pointer font-bold px-2 rounded-md"
                                  onClick={() => handleExtend(u.email, 12)}
                                >
                                  تمديد (+1 سنة)
                                </Button>
                                {(u.plan === "pro" || u.plan === "enterprise") && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-500/5 cursor-pointer font-bold px-2 rounded-md"
                                      >
                                        إلغاء الترخيص
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="font-cairo text-right" dir="rtl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>إلغاء اشتراك مستخدم</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          هل أنت متأكد من إلغاء اشتراك/ترخيص المستخدم ({u.email}) وإعادته للباقة المجانية؟
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="flex-row-reverse sm:justify-start gap-2">
                                        <AlertDialogAction onClick={() => handleRevoke(u.email)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                          إلغاء الاشتراك
                                        </AlertDialogAction>
                                        <AlertDialogCancel className="mt-0 border-border">إلغاء</AlertDialogCancel>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* تبويب مولد مفاتيح التراخيص */}
          <TabsContent value="generator" className="mt-4 space-y-4 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <form onSubmit={handleGenerateKey} className="bg-card/50 border rounded-xl p-5 space-y-4 text-right">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  توليد ترخيص جديد
                </h3>

                <div className="space-y-1.5">
                  <Label className="text-xs">نوع باقة الاشتراك</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setGenPlan("PRO")}
                      className={`h-9.5 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
                        genPlan === "PRO"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      باقة Pro الاحترافية
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenPlan("ENTERPRISE")}
                      className={`h-9.5 text-xs font-bold rounded-lg border-2 transition-all cursor-pointer ${
                        genPlan === "ENTERPRISE"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      باقة Enterprise للمؤسسات
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">فترة الترخيص المتاحة</Label>
                  <select
                    className="w-full h-9.5 rounded-lg border border-border px-3 text-xs bg-background focus:outline-hidden"
                    value={genDuration}
                    onChange={(e) => setGenDuration(e.target.value)}
                  >
                    <option value="1">1 شهر (30 يوم)</option>
                    <option value="3">3 أشهر (90 يوم)</option>
                    <option value="6">6 أشهر (180 يوم)</option>
                    <option value="12">1 سنة كاملة (365 يوم)</option>
                    <option value="120">مدى الحياة (LifeTime)</option>
                  </select>
                </div>

                <Button type="submit" className="w-full h-10 mt-2 gap-2 text-xs font-bold" disabled={licenseLoading}>
                  {licenseLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  توليد مفتاح الترخيص السحابي
                </Button>
              </form>

              {/* قسم عرض الكود المولد */}
              <div className="bg-card/50 border rounded-xl p-5 flex flex-col justify-center items-center text-center space-y-4">
                <div className="p-3 bg-indigo-500/5 rounded-full border border-indigo-500/10">
                  <Key className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">مفتاح الترخيص المولد حديثاً</h4>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    انسخ هذا الكود وأرسله للعميل لتفعيل اشتراكه على أي جهاز
                  </p>
                </div>

                {generatedKey ? (
                  <div className="w-full space-y-2.5">
                    <div className="w-full bg-muted border border-border/80 p-3 rounded-lg flex items-center justify-between font-mono font-bold text-sm tracking-wide text-indigo-600 dark:text-indigo-400 select-all justify-center">
                      <span>{generatedKey}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer" onClick={handleCopyKey} title="نسخ الكود">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Badge variant="outline" className="bg-indigo-500/5 text-indigo-600 border-indigo-500/20 text-[9px] font-bold px-2 py-0.5">
                      باقة {genPlan === "PRO" ? "Pro الاحترافية" : "Enterprise"} · الصلاحية: {genDuration === "120" ? "مدى الحياة" : `${genDuration} شهر`}
                    </Badge>
                  </div>
                ) : (
                  <div className="w-full h-14 bg-muted/40 border border-dashed border-border/60 rounded-lg flex items-center justify-center text-xs text-muted-foreground/60 select-none">
                    قم بتوليد مفتاح ترخيص ليظهر هنا
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* تبويب الإحصائيات العامة */}
          <TabsContent value="stats" className="mt-4 space-y-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="bg-card border rounded-xl p-4 text-right space-y-1.5 shadow-inner">
                <Users className="w-5 h-5 text-indigo-600" />
                <div className="text-[10px] text-muted-foreground">إجمالي الحسابات</div>
                <div className="text-xl font-bold font-mono text-foreground">{totalUsers}</div>
              </div>

              <div className="bg-card border rounded-xl p-4 text-right space-y-1.5 shadow-inner">
                <UserCheck className="w-5 h-5 text-emerald-500" />
                <div className="text-[10px] text-muted-foreground">اشتراكات Pro نشطة</div>
                <div className="text-xl font-bold font-mono text-foreground">{activePro}</div>
              </div>

              <div className="bg-card border rounded-xl p-4 text-right space-y-1.5 shadow-inner">
                <Clock className="w-5 h-5 text-amber-500" />
                <div className="text-[10px] text-muted-foreground">أعضاء الفترة التجريبية</div>
                <div className="text-xl font-bold font-mono text-foreground">{activeTrial}</div>
              </div>

              <div className="bg-card border rounded-xl p-4 text-right space-y-1.5 shadow-inner">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <div className="text-[10px] text-muted-foreground">تراخيص منتهية</div>
                <div className="text-xl font-bold font-mono text-foreground">{expiredUsers}</div>
              </div>
            </div>

            <div className="bg-card/50 border rounded-xl p-5 space-y-3 text-right">
              <h4 className="text-xs font-bold text-foreground">💡 معلومات إرشادية حول خادم الترخيص</h4>
              <p className="text-[11px] text-muted-foreground leading-normal">
                لوحة التحكم الحالية ترتبط سحابياً بـ Supabase CLI وقاعدة البيانات الخاصة بها. في حال وجود التطبيق في وضع عدم الاتصال (Offline)، يعمل الباك اند Go بوضع المحاكاة ويقوم بالحقن والتغيير الفوري في قاعدة بيانات SQLite المحلية مما يتيح لك معاينة التنشيطات والتمديدات والاشتراكات بشكل كامل وسلس 100%.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
