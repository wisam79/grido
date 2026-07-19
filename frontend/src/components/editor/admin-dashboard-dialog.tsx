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
  Wand2,
  DollarSign,
  Activity,
  Cpu,
  CheckCircle2,
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
    aiUsageLogs,
    licenseLoading,
    adminFetchAllUsers,
    adminGenerateKey,
    adminRevokeLicense,
    adminExtendLicense,
  } = useEditorStore(
    useShallow((state) => ({
      adminUsers: state.adminUsers,
      aiUsageLogs: state.aiUsageLogs,
      licenseLoading: state.licenseLoading,
      adminFetchAllUsers: state.adminFetchAllUsers,
      adminGenerateKey: state.adminGenerateKey,
      adminRevokeLicense: state.adminRevokeLicense,
      adminExtendLicense: state.adminExtendLicense,
    }))
  );

  const [activeTab, setActiveTab] = useState<"users" | "generator" | "usage" | "stats">("users");

  // Key generator form
  const [genPlan, setGenPlan] = useState<"PRO" | "ENTERPRISE">("PRO");
  const [genDuration, setGenDuration] = useState("12"); // default 12 months
  const [generatedKey, setGeneratedKey] = useState("");

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [usageSearch, setUsageSearch] = useState("");

  // Fetch users on open
  useEffect(() => {
    if (open) {
      adminFetchAllUsers();
    }
  }, [open, adminFetchAllUsers]);

  // Actions
  const handleGenerate = async () => {
    try {
      const months = parseInt(genDuration, 10);
      const key = await adminGenerateKey(genPlan, months);
      setGeneratedKey(key);
      toast.success("تم توليد مفتاح الترخيص بنجاح");
      adminFetchAllUsers();
    } catch (err: any) {
      toast.error(err.message || "فشل توليد المفتاح");
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    toast.success("تم نسخ الترخيص للحافظة");
  };

  const handleRevoke = async (email: string) => {
    try {
      await adminRevokeLicense(email);
      toast.success(`تم إلغاء ترخيص الحساب ${email}`);
    } catch (err: any) {
      toast.error(err.message || "فشل إلغاء الترخيص");
    }
  };

  const handleExtend = async (email: string, months: number) => {
    try {
      await adminExtendLicense(email, months);
      toast.success(`تم تمديد الترخيص لـ ${email} بـ ${months} شهر`);
    } catch (err: any) {
      toast.error(err.message || "فشل تمديد الترخيص");
    }
  };

  // Filtering
  const filteredUsers = adminUsers.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.plan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = aiUsageLogs.filter(
    (l) =>
      l.email.toLowerCase().includes(usageSearch.toLowerCase()) ||
      l.serviceName.toLowerCase().includes(usageSearch.toLowerCase()) ||
      l.source.toLowerCase().includes(usageSearch.toLowerCase())
  );

  // Overall Stats
  const totalUsers = adminUsers.length;
  const activePro = adminUsers.filter((u) => u.plan === "pro" || u.plan === "enterprise").length;
  const activeTrial = adminUsers.filter(
    (u) => u.plan === "trial" && new Date(u.expiresAt).getTime() > Date.now()
  ).length;
  const expiredUsers = adminUsers.filter(
    (u) => u.plan !== "free" && new Date(u.expiresAt).getTime() <= Date.now()
  ).length;

  // AI Usage Stats
  const totalAiRequests = aiUsageLogs.length;
  const totalAiCostUsd = aiUsageLogs.reduce((acc, curr) => acc + curr.costUsd, 0);
  const avgDurationSec = totalAiRequests > 0 ? (aiUsageLogs.reduce((acc, curr) => acc + curr.durationSec, 0) / totalAiRequests).toFixed(2) : "0";
  const uniqueAiAccounts = new Set(aiUsageLogs.map((l) => l.email)).size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-2xl" dir="rtl">
        <DialogHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span>لوحة التحكم والإدارة (Admin Dashboard)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              إدارة المشتركين، توليد التراخيص، وتتبع سجل استهلاك الذكاء الاصطناعي على السيرفر السحابي.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* التبويبات الرئيسية */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col overflow-hidden mt-3 font-cairo">
          <TabsList className="grid w-full grid-cols-4 bg-muted p-1 rounded-xl h-10 shrink-0">
            <TabsTrigger value="users" className="text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>إدارة المشتركين</span>
            </TabsTrigger>
            <TabsTrigger value="generator" className="text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 font-bold">
              <Key className="w-3.5 h-3.5" />
              <span>توليد التراخيص</span>
            </TabsTrigger>
            <TabsTrigger value="usage" className="text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 font-bold text-violet-600 dark:text-violet-400">
              <Wand2 className="w-3.5 h-3.5" />
              <span>سجل استهلاك الـ AI 📊</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5 font-bold">
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
                  className="h-9.5 text-xs pr-4 pl-9 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9.5 gap-1.5 text-xs font-semibold rounded-xl"
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
                      <tr className="border-b bg-muted/40 text-[11px] font-bold text-muted-foreground sticky top-0 backdrop-blur-md">
                        <th className="p-3 text-right">المستخدم / البريد</th>
                        <th className="p-3 text-right">الباقة الحالية</th>
                        <th className="p-3 text-right">مفتاح الترخيص</th>
                        <th className="p-3 text-right">تاريخ الانتهاء</th>
                        <th className="p-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-border/30 font-medium">
                      {filteredUsers.map((u) => {
                        const isExpired = new Date(u.expiresAt).getTime() <= Date.now() && u.plan !== "free";
                        return (
                          <tr key={u.id || u.email} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-foreground">{u.name || "مستخدم Grido"}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{u.email}</div>
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={u.plan === "enterprise" ? "default" : u.plan === "pro" ? "secondary" : "outline"}
                                className="text-[10px] uppercase font-bold"
                              >
                                {u.plan}
                              </Badge>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-muted-foreground select-all">
                              {u.licenseKey || "—"}
                            </td>
                            <td className="p-3 font-mono text-[11px]">
                              {u.plan === "free" ? (
                                <span className="text-muted-foreground">غير محدد</span>
                              ) : isExpired ? (
                                <span className="text-red-500 font-bold">منتهي ({new Date(u.expiresAt).toLocaleDateString("ar-EG")})</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {new Date(u.expiresAt).toLocaleDateString("ar-EG")}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] font-bold gap-1 rounded-lg border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600"
                                  onClick={() => handleExtend(u.email, 12)}
                                >
                                  + سنة
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-red-500 hover:bg-red-500/10 rounded-lg">
                                      إلغاء
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent dir="rtl" className="rounded-xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>تأكيد إلغاء ترخيص الحساب</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        هل أنت أعدت التأكيد على إلغاء ترخيص الحساب <span className="font-mono font-bold text-foreground">{u.email}</span> وتحويله إلى الباقة المجانية؟
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-2">
                                      <AlertDialogCancel className="rounded-lg text-xs">تراجع</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-xs font-bold"
                                        onClick={() => handleRevoke(u.email)}
                                      >
                                        إلغاء الترخيص
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
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

          {/* تبويب سجل استهلاك الـ AI الجوهري 📊 */}
          <TabsContent value="usage" className="flex-1 flex flex-col overflow-hidden mt-4 space-y-4">
            {/* بطاقات المؤشرات الأربعة */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              <div className="bg-card border border-violet-500/20 rounded-xl p-3.5 text-right space-y-1 bg-gradient-to-br from-violet-500/[0.03] to-purple-500/[0.05]">
                <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-bold text-[11px]">
                  <DollarSign className="w-4 h-4" />
                  <span>إجمالي الاستهلاك ($)</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-foreground">${totalAiCostUsd.toFixed(6)}</div>
                <div className="text-[9px] text-muted-foreground">تكلفة معالجة الـ GPU الحقيقية</div>
              </div>

              <div className="bg-card border rounded-xl p-3.5 text-right space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
                  <Activity className="w-4 h-4" />
                  <span>إجمالي عدد الطلبات</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-foreground">{totalAiRequests} طلب</div>
                <div className="text-[9px] text-muted-foreground">معالجة الذكاء الاصطناعي الناجحة</div>
              </div>

              <div className="bg-card border rounded-xl p-3.5 text-right space-y-1">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                  <Cpu className="w-4 h-4" />
                  <span>متوسط سرعة الطلب</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-foreground">{avgDurationSec} ثانية</div>
                <div className="text-[9px] text-muted-foreground">على كرت NVIDIA A10G</div>
              </div>

              <div className="bg-card border rounded-xl p-3.5 text-right space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  <UserCheck className="w-4 h-4" />
                  <span>الحسابات المستهلكة</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-foreground">{uniqueAiAccounts} حساب</div>
                <div className="text-[9px] text-muted-foreground">مستخدم نشط للذكاء الاصطناعي</div>
              </div>
            </div>

            {/* فلتر البحث في سجل الاستهلاك */}
            <div className="relative shrink-0">
              <Input
                placeholder="تصفية السجل حسب البريد الإلكتروني، نوع الخدمة، أو المصدر..."
                className="h-9 text-xs pr-4 rounded-xl"
                value={usageSearch}
                onChange={(e) => setUsageSearch(e.target.value)}
              />
            </div>

            {/* جدول سجل الطلبات والاستهلاك */}
            <div className="flex-1 border rounded-xl overflow-hidden bg-card/50 flex flex-col">
              <div className="overflow-y-auto flex-1 text-right text-xs">
                {filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-44 text-muted-foreground gap-2">
                    <Wand2 className="w-8 h-8 opacity-40 text-violet-500" />
                    <span>لا توجد سجلات استهلاك مطابقة للبحث</span>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/40 text-[11px] font-bold text-muted-foreground sticky top-0 backdrop-blur-md">
                        <th className="p-3 text-right">الحساب المستهلك</th>
                        <th className="p-3 text-right">نوع الخدمة والنموذج</th>
                        <th className="p-3 text-right">منصة المصدر</th>
                        <th className="p-3 text-center">الزمن (ثانية)</th>
                        <th className="p-3 text-left">التكلفة ($)</th>
                        <th className="p-3 text-center">التاريخ والوقت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-border/30 font-medium">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-foreground font-mono text-[11px]">{log.email}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[10px] font-bold">
                              {log.serviceName}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground text-[11px]">
                            {log.source}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-foreground">
                            {log.durationSec}ث
                          </td>
                          <td className="p-3 text-left font-mono font-extrabold text-violet-600 dark:text-violet-400 dir-ltr">
                            ${log.costUsd.toFixed(6)}
                          </td>
                          <td className="p-3 text-center font-mono text-[10px] text-muted-foreground">
                            {log.timestamp}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* تبويب مولد التراخيص */}
          <TabsContent value="generator" className="mt-4 space-y-4 flex-1 overflow-y-auto">
            <div className="bg-card border rounded-xl p-5 space-y-4 max-w-xl mx-auto">
              <div className="space-y-1 text-right">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>توليد مفتاح ترخيص جديد</span>
                </h3>
                <p className="text-xs text-muted-foreground">قم باختيار نوع الباقة والمدة الزمنية لتوليد كود ترخيص مشفر.</p>
              </div>

              <div className="space-y-3 text-right">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">الباقة المطلوبة</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={genPlan === "PRO" ? "default" : "outline"}
                      className="h-10 text-xs font-bold rounded-lg cursor-pointer"
                      onClick={() => setGenPlan("PRO")}
                    >
                      Pro الاحترافية
                    </Button>
                    <Button
                      variant={genPlan === "ENTERPRISE" ? "default" : "outline"}
                      className="h-10 text-xs font-bold rounded-lg cursor-pointer"
                      onClick={() => setGenPlan("ENTERPRISE")}
                    >
                      Enterprise المتقدمة
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">مدة الترخيص (بالأشهر)</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {["1", "3", "12", "120"].map((d) => (
                      <Button
                        key={d}
                        variant={genDuration === d ? "default" : "outline"}
                        className="h-9 text-xs font-bold rounded-lg cursor-pointer"
                        onClick={() => setGenDuration(d)}
                      >
                        {d === "120" ? "مدى الحياة" : `${d} شهر`}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full h-10 text-xs font-bold gap-2 rounded-lg cursor-pointer" onClick={handleGenerate} disabled={licenseLoading}>
                    {licenseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>توليد المفتاح الآن</span>
                  </Button>
                </div>

                {generatedKey ? (
                  <div className="w-full space-y-2.5 pt-2">
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
              <h4 className="text-xs font-bold text-foreground">💡 معلومات إرشادية حول سجل الاستهلاك والترخيص</h4>
              <p className="text-[11px] text-muted-foreground leading-normal">
                لوحة التحكم ترتبط سحابياً بقاعدة البيانات المركزية وبمنصة Modal. يتم توثيق وتسجيل كل طلب معالجة ذكاء اصطناعي (مثل ترميم الوجوه بـ GFPGAN أو عزل الخلفية) بشكل فوري مبيناً بريد الحساب، نوع الخدمة، زمن الاستغراق بالثواني، والتكلفة الحقيقية بالدولار على كرت الشاشة السحابي.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
