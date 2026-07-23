import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Toolbar } from "@/components/editor/toolbar";
import { TemplatePanel } from "@/components/editor/template-panel";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { ErrorBoundary } from "@/components/error-boundary";

const ExportDialog = lazy(() => import("@/components/editor/export-dialog").then(module => ({ default: module.ExportDialog })));
const PrintDialog = lazy(() => import("@/components/editor/print-dialog").then(module => ({ default: module.PrintDialog })));
import { saveProjectAsJSON } from "@/components/editor/export-utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import {
  Settings2,
  PanelsTopLeft,
  Sun,
  Moon,
  Minus,
  Square,
  Minimize2,
  X,
  LayoutGrid,
  Images,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useWindowControls } from "@/hooks/use-window-controls";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAutoSave } from "@/hooks/use-autosave";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { AccountLicenseModal } from "@/components/editor/account-license-modal";
import { UpdateNotifier } from "@/components/editor/update-notifier";
import { toast } from "sonner";
import { User, ShieldCheck, Lock, Key, Loader2 } from "lucide-react";
import { KeyboardShortcutsDialog } from "@/components/editor/keyboard-shortcuts-dialog";
import { WindowResizeHandles } from "@/components/editor/window-resize-handles";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function App() {
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [mobileTemplatesOpen, setMobileTemplatesOpen] = useState(false);
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const { theme, toggleTheme } = useTheme();


  const {
    isMaximized,
    isFocused,
    handleMinimize,
    handleMaximize,
    handleClose,
  } = useWindowControls();

  useKeyboardShortcuts();
  useAutoSave();

  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);

  const checkLicenseStatus = useEditorStore((state) => state.checkLicenseStatus);
  // [FIX #7] قراءة user مباشرة لضمان إعادة render عند تغيير أي من حقوله
  const user = useEditorStore((state) => state.user);
  const {
    isLicenseActive: isLicenseActiveFn,
    canvasZoom,
    setCanvasZoom,
  } = useEditorStore(useShallow((state) => ({
    isLicenseActive: state.isLicenseActive,
    canvasZoom: state.canvasZoom,
    setCanvasZoom: state.setCanvasZoom,
  })));
  const isLicenseActive = isLicenseActiveFn();
  const setAccountModalOpen = useEditorStore((state) => state.setAccountModalOpen);
  const activateLicenseKey = useEditorStore((state) => state.activateLicenseKey);
  const logoutAccount = useEditorStore((state) => state.logoutAccount);

  const [lockKey, setLockKey] = useState("");
  const [lockLoading, setLockLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const profile = await checkLicenseStatus();
      if (!profile || !profile.token) {
        setAccountModalOpen(true);
      }
      setIsInitializing(false);
    };
    check();

    // Check periodically every 5 minutes to ensure dynamic state updates
    const intervalId = setInterval(() => {
      checkLicenseStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [checkLicenseStatus, setAccountModalOpen]);

  const isModalOpen = exportOpen || printOpen || mobileTemplatesOpen || mobilePropsOpen;

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background text-foreground font-cairo">
        <div className="relative flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-primary/20 shadow-2xl shadow-primary/20"
          >
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-2xl font-black tracking-tight"
          >
            Grido Studio
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-sm text-muted-foreground mt-2 animate-pulse"
          >
            جاري تهيئة مساحة العمل...
          </motion.p>
        </div>
      </div>
    );
  }

  if (!isLicenseActive) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl text-right p-6 font-cairo select-none" dir="rtl">
        <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border/40 p-8 rounded-2xl shadow-2xl space-y-6 text-center">
          <div className="inline-flex p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 animate-pulse">
            <Lock className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-foreground">النسخة مقفلة</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              انتهت الفترة التجريبية. يرجى التفعيل.
            </p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!lockKey) return;
            setLockLoading(true);
            try {
              await activateLicenseKey(lockKey);
              toast.success("تم تفعيل الترخيص بنجاح! شكراً لك.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "فشل تفعيل الترخيص");
            } finally {
              setLockLoading(false);
            }
          }} className="space-y-4 text-right">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">أدخل مفتاح الترخيص</label>
              <div className="relative">
                <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  required
                  placeholder="GRIDO-PRO-XXXX-XXXX-XXXX"
                  value={lockKey}
                  onChange={(e) => setLockKey(e.target.value)}
                  className="w-full pr-9 pl-4 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono uppercase text-foreground"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0 font-bold text-xs" disabled={lockLoading}>
              {lockLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "تفعيل الترخيص الفوري"
              )}
            </Button>
          </form>

          <div className="border-t border-border/40 pt-4 flex flex-col gap-2">
            <Button variant="outline" className="w-full text-xs font-semibold h-9 cursor-pointer" onClick={() => setAccountModalOpen(true)}>
              إدارة الحساب
            </Button>
            
            {user && user.token && (
              <Button variant="ghost" className="w-full text-xs text-red-500 hover:bg-red-500/5 h-9 cursor-pointer" onClick={() => logoutAccount()}>
                تسجيل الخروج
              </Button>
            )}
          </div>
        </div>
        <AccountLicenseModal />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div 
        className={cn(
          "h-screen flex flex-col overflow-hidden font-cairo bg-background",
        )}
        dir="rtl"
      >
      {!isMaximized && <WindowResizeHandles />}
      {/* الرأس */}
      <header
        className={`border-b bg-card/90 backdrop-blur-md no-print title-bar-draggable select-none transition-opacity duration-200 ${
          !isFocused ? "opacity-75" : ""
        }`}
        onDoubleClick={handleMaximize}
      >
        <div className="flex items-center justify-between px-4 py-2 relative">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/80 shrink-0" />
            <h1 className="text-xs font-bold text-foreground/80">
              Grido Studio | استوديو الهوية
            </h1>
          </div>

          {/* وضع العمل */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/60 p-0.5 rounded-full border border-zinc-200/60 dark:border-zinc-800/50 shadow-inner z-10 backdrop-blur-xs title-bar-controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("collage")}
              aria-label="وضع الكولاج"
              title="وضع الكولاج"
              className={cn(
                "h-8 px-4 rounded-full cursor-pointer gap-2 flex items-center justify-center font-cairo text-xs z-10 relative transition-colors duration-300",
                mode === "collage"
                  ? "text-primary dark:text-blue-400 font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {mode === "collage" && (
                <motion.div
                  layoutId="active-mode-pill"
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/40 dark:border-zinc-700/40 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <LayoutGrid className="w-4 h-4" />
              <span className="leading-none">كولاج</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("single")}
              aria-label="وضع التعديل الحر"
              title="وضع التعديل الحر"
              className={cn(
                "h-8 px-4 rounded-full cursor-pointer gap-2 flex items-center justify-center font-cairo text-xs z-10 relative transition-colors duration-300",
                mode === "single"
                  ? "text-primary dark:text-blue-400 font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {mode === "single" && (
                <motion.div
                  layoutId="active-mode-pill"
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/40 dark:border-zinc-700/40 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Images className="w-4 h-4" />
              <span className="leading-none">تعديل حر</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 title-bar-controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAccountModalOpen(true)}
              className="gap-1.5 h-7 w-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted relative"
              title="الحساب والتراخيص"
            >
              {isLicenseActive ? (
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
              ) : (
                <User className="w-4.5 h-4.5 text-muted-foreground" />
              )}
              {user?.plan === "trial" && (
                <span className="absolute top-1 left-1 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="gap-1.5 h-7 w-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted"
              title={theme === "light" ? "الوضع الداكن" : "الوضع المضيء"}
            >
              {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5 h-7 px-2"
              onClick={() => setMobileTemplatesOpen(true)}
            >
              <PanelsTopLeft className="w-3.5 h-3.5" />
              <span className="text-xs">القوالب</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5 h-7 px-2"
              onClick={() => setMobilePropsOpen(true)}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-xs">خصائص</span>
            </Button>

            {/* Separator */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Window Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMinimize}
              className="w-7 h-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted"
              title="تصغير"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMaximize}
              className="w-7 h-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted"
              title={isMaximized ? "استعادة" : "تكبير"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Square className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-7 h-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* شريط الأدوات */}
      <Toolbar
        onPrint={() => {
          if (!isLicenseActive) {
            toast.error("ميزة الطباعة متوفرة فقط في الخطة الاحترافية (Pro).", {
              action: {
                label: "تفعيل الآن",
                onClick: () => setAccountModalOpen(true)
              }
            });
            return;
          }
          setPrintOpen(true);
        }}
        onExport={() => setExportOpen(true)}
        onSave={saveProjectAsJSON}
      />

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex overflow-hidden">
        {/* اللوحة اليسرى - القوالب (للأجهزة الكبيرة) */}
        <aside className="hidden lg:flex h-full w-[335px] min-w-[335px] max-w-[335px] border-l bg-card flex-col no-print animate-panel-right">
          <TemplatePanel />
        </aside>

        {/* الكانفس - الوسط */}
        <section className="flex-1 flex flex-col min-w-0 bg-muted/20 animate-fade-in">
          <div className="flex-1 relative">
            <ErrorBoundary>
              <EditorCanvas />
            </ErrorBoundary>
          </div>

          {/* شريط الحالة السفلي */}
          <div className="border-t bg-card px-4 py-1.5 no-print flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+Z</kbd>
                تراجع
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Delete</kbd>
                حذف العنصر
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>اضغط على عنصر لتحديده · اسحب لتغيير الموضع</span>
              
              <div className="flex items-center gap-1 border-r pr-4 border-border">
                <button className="hover:bg-muted p-1 rounded transition-colors" onClick={() => setCanvasZoom((z: number) => Math.max(0.1, z - 0.1))}>
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <div className="text-[11px] font-mono w-10 text-center select-none cursor-pointer hover:text-foreground" onDoubleClick={() => setCanvasZoom(1)}>
                  {Math.round(canvasZoom * 100)}%
                </div>
                <button className="hover:bg-muted p-1 rounded transition-colors" onClick={() => setCanvasZoom((z: number) => Math.min(5, z + 0.1))}>
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* اللوحة اليمنى - الخصائص (للأجهزة الكبيرة) */}
        <aside className="hidden lg:flex h-full w-[335px] min-w-[335px] max-w-[335px] border-r bg-card flex-col no-print animate-panel-left">
          <PropertiesPanel />
        </aside>
      </main>

      {/* النوافذ المنزلقة للجوال */}
      <Sheet open={mobileTemplatesOpen} onOpenChange={setMobileTemplatesOpen}>
        <SheetContent side="right" className="w-[85vw] sm:w-96 p-0" dir="rtl">
          <SheetHeader className="border-b">
            <SheetTitle>القوالب الجاهزة</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <TemplatePanel />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobilePropsOpen} onOpenChange={setMobilePropsOpen}>
        <SheetContent side="left" className="w-[85vw] sm:w-96 p-0" dir="rtl">
          <SheetHeader className="border-b">
            <SheetTitle>خصائص التعديل</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <PropertiesPanel />
          </div>
        </SheetContent>
      </Sheet>

      {/* نافذة التصدير */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
        </Suspense>
      </ErrorBoundary>

      {/* نافذة إعدادات الطباعة */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <PrintDialog open={printOpen} onOpenChange={setPrintOpen} />
        </Suspense>
      </ErrorBoundary>

      <AccountLicenseModal />
      <UpdateNotifier />

      <SonnerToaster position="top-center" duration={4000} richColors />
      <KeyboardShortcutsDialog />
    </div>
    </TooltipProvider>
  );
}
