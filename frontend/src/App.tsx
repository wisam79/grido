import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { 
  Toolbar, 
  TemplatePanel, 
  PropertiesPanel, 
  EditorCanvas,
  AccountLicenseModal,
  UpdateNotifier,
  KeyboardShortcutsDialog,
  WindowResizeHandles,
  CanvasViewportDeck,
  DesktopMenuBar,
} from "@/components/editor";
import { ErrorBoundary } from "@/components/error-boundary";
import { GetStartupFile } from "../wailsjs/go/main/App";

const ExportDialog = lazy(() => import("@/components/editor/dialogs/export-dialog").then(module => ({ default: module.ExportDialog })));
const PrintDialog = lazy(() => import("@/components/editor/dialogs/print-dialog").then(module => ({ default: module.PrintDialog })));
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/huge-icon";
import { PhosphorProvider } from "@/components/ui/phosphor-provider";
import {
  SquaresFour,
  Image,
  ShieldCheck,
  Moon,
  Sun,
  SidebarSimple,
  SlidersHorizontal,
  Minus,
  Square,
  CopySimple,
  X,
  LockSimple,
  Key,
  User,
} from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";
import { useWindowControls } from "@/hooks/use-window-controls";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAutoSave } from "@/hooks/use-autosave";
import { useEditorStore } from "@/lib/editor-store";
import { useRenderQuality } from "@/lib/canvas/render-quality";
import { warmupOpenCV } from "@/components/editor/document-scanner/opencv-loader";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function App() {
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [mobileTemplatesOpen, setMobileTemplatesOpen] = useState(false);
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleToggleRight = () => setRightSidebarOpen((v) => !v);
    const handleToggleLeft = () => setLeftSidebarOpen((v) => !v);

    window.addEventListener("grido:toggle-right-sidebar", handleToggleRight);
    window.addEventListener("grido:toggle-left-sidebar", handleToggleLeft);

    return () => {
      window.removeEventListener("grido:toggle-right-sidebar", handleToggleRight);
      window.removeEventListener("grido:toggle-left-sidebar", handleToggleLeft);
    };
  }, []);


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
    canvasWidth,
    canvasHeight,
  } = useEditorStore(useShallow((state) => ({
    isLicenseActive: state.isLicenseActive,
    canvasZoom: state.canvasZoom,
    setCanvasZoom: state.setCanvasZoom,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
  })));
  const isLicenseActive = isLicenseActiveFn();
  const setAccountModalOpen = useEditorStore((state) => state.setAccountModalOpen);
  const activateLicenseKey = useEditorStore((state) => state.activateLicenseKey);
  const logoutAccount = useEditorStore((state) => state.logoutAccount);

  // شريط الحالة: "جاهز" مرتبطة بحالة فعلية الآن — تعمل مؤشرات الذكاء الاصطناعي
  // على تعيين enhancingElementId أثناء المعالجة
  const isBusy = useRenderQuality((s) => s.enhancingElementId !== null);

  const [lockKey, setLockKey] = useState("");
  const [lockLoading, setLockLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const profile = await checkLicenseStatus();
        if (!profile || !profile.token) {
          setAccountModalOpen(true);
        }
        // فحص وجود صورة ممررة عند الإقلاع (مثل النقر بالزر الأيمن "فتح بواسطة" في ويندوز)
        try {
          if (typeof GetStartupFile === "function") {
            const startupUrl = await GetStartupFile();
            if (startupUrl) {
              const img = new window.Image();
              img.onload = () => {
                const aspect = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
                useEditorStore.getState().addImageElement(startupUrl, aspect);
              };
              img.src = startupUrl;
            }
          }
        } catch {
          // تجاهل الخطأ في بيئة الاختبارات عند عدم توفر واجهة Wails
        }
      } catch (err) {
        console.error("Failed to check license status during init:", err);
      } finally {
        setIsInitializing(false);
      }
    };
    check();

    warmupOpenCV();

    // Check periodically every 5 minutes to ensure dynamic state updates
    const intervalId = setInterval(() => {
      checkLicenseStatus();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [checkLicenseStatus, setAccountModalOpen]);

  // اختصارات Ctrl+E / Ctrl+P تفتح حوارات التصدير والطباعة عبر أحداث عامة (إصلاح Bug#7)
  useEffect(() => {
    const openExport = () => setExportOpen(true);
    const openPrint = () => setPrintOpen(true);
    window.addEventListener("grido:open-export-dialog", openExport);
    window.addEventListener("grido:open-print-dialog", openPrint);
    return () => {
      window.removeEventListener("grido:open-export-dialog", openExport);
      window.removeEventListener("grido:open-print-dialog", openPrint);
    };
  }, []);

  const isModalOpen = exportOpen || printOpen || mobileTemplatesOpen || mobilePropsOpen;

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background text-foreground font-cairo select-none" dir="rtl">
        <div className="relative flex flex-col items-center max-w-xs text-center px-4">
          <motion.div 
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.1, 0.9, 0.2, 1] }}
            className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mb-5 border border-primary/20 shadow-lg shadow-primary/10"
          >
            <Spinner className="w-8 h-8 text-primary" size={32} />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
            className="text-xl font-extrabold tracking-tight"
          >
            Grido Studio
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            className="text-xs text-muted-foreground mt-1.5 font-medium"
          >
            جاري تهيئة مساحة العمل ...
          </motion.p>
        </div>
      </div>
    );
  }

  if (!isLicenseActive) {
    return (
      <div 
        className="h-screen flex flex-col overflow-hidden font-cairo bg-background select-none" 
        dir="rtl"
      >
        {!isMaximized && <WindowResizeHandles />}
        {/* الرأس الموحد للنافذة */}
        <header
          className={`border-b bg-card/85 backdrop-blur-xl no-print title-bar-draggable select-none transition-opacity duration-200 fluent-specular ${
            !isFocused ? "opacity-75" : ""
          }`}
          onDoubleClick={handleMaximize}
        >
          <div className="flex items-center justify-between px-4 py-1.5 relative">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
              <h1 className="text-xs font-bold text-foreground/80">
                Grido Studio | تفعيل الترخيص
              </h1>
            </div>

            <div className="flex items-center gap-2 title-bar-controls">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="gap-1.5 h-7 w-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted"
                title={theme === "light" ? "الوضع الداكن" : "الوضع المضيء"}
              >
                {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              </Button>

              <div className="w-px h-5 bg-border mx-1" />

              <Button
                variant="ghost"
                size="sm"
                onClick={handleMinimize}
                className="w-9 h-7.5 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 rounded-md transition-colors"
                title="تصغير"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMaximize}
                className="w-9 h-7.5 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 rounded-md transition-colors"
                title={isMaximized ? "استعادة" : "تكبير"}
              >
                {isMaximized ? <CopySimple className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="w-9 h-7.5 p-0 flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white rounded-md transition-colors active:bg-red-600"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* شاشة التفعيل المركزية */}
        <div className="flex-1 flex items-center justify-center bg-background/95 backdrop-blur-2xl text-right p-6">
          <div className="w-full max-w-md bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 p-8 rounded-2xl shadow-xl space-y-6 text-center fluent-specular">
            <div className="inline-flex p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 animate-pulse">
              <LockSimple className="w-10 h-10" weight="duotone" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-extrabold text-foreground">النسخة مقفلة</h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                انتهت الفترة التجريبية. يرجى إدخال مفتاح التفعيل للمتابعة.
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
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-foreground">أدخل مفتاح الترخيص</label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setLockKey(text.trim().toUpperCase());
                          toast.success("تم لصق المفتاح من الحافظة");
                        }
                      } catch {
                        toast.error("يرجى لصق المفتاح يدوياً");
                      }
                    }}
                    className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    لصق من الحافظة 📋
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-4 h-4" />
                  <input
                    type="text"
                    required
                    placeholder="GRIDO-PRO-XXXX-XXXX-XXXX"
                    value={lockKey}
                    onChange={(e) => setLockKey(e.target.value.toUpperCase())}
                    className="w-full pr-9 pl-4 h-8 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono uppercase text-foreground"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer shadow-xs gap-1.5 rounded-md" disabled={lockLoading}>
                {lockLoading ? (
                  <>
                    <Spinner className="w-3.5 h-3.5" size={14} />
                    <span>جاري التفعيل ...</span>
                  </>
                ) : (
                  "تفعيل الترخيص الفوري"
                )}
              </Button>
            </form>

            <div className="border-t border-border/40 pt-4 flex flex-col gap-2">
              <Button variant="outline" className="w-full text-xs font-semibold h-8 rounded-md cursor-pointer" onClick={() => setAccountModalOpen(true)}>
                إدارة الحساب
              </Button>
              
              {user && user.token && (
                <Button variant="ghost" className="w-full text-xs text-red-500 hover:bg-red-500/5 h-8 rounded-md cursor-pointer" onClick={() => logoutAccount()}>
                  تسجيل الخروج
                </Button>
              )}
            </div>
          </div>
          <AccountLicenseModal />
        </div>
      </div>
    );
  }

  return (
    <PhosphorProvider weight="regular" size={18}>
      <TooltipProvider delayDuration={650} skipDelayDuration={150}>
        <div 
          className={cn(
            "h-screen flex flex-col overflow-hidden font-cairo bg-background",
          )}
          dir="rtl"
        >
      {!isMaximized && <WindowResizeHandles />}
      {/* الرأس الموحد للنافذة بتصميم Fluent 2 Acrylic */}
      <header
        className={cn(
          "border-b border-border bg-sidebar/95 backdrop-blur-xl no-print title-bar-draggable select-none transition-opacity duration-200 z-30 fluent-specular shadow-2xs",
          !isFocused && "opacity-75"
        )}
        onDoubleClick={handleMaximize}
      >
        <div className="flex items-center justify-between px-3 py-1.5 relative">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-xs shadow-primary/40 ring-2 ring-primary/20 shrink-0" />
              <h1 className="text-xs font-black text-foreground tracking-wider font-mono flex items-center gap-1.5">
                <span>GRIDO</span>
                <span className="sr-only">Grido Studio | استوديو الهوية</span>
              </h1>
            </div>
            <div className="w-px h-4 bg-border/60 mx-1 hidden sm:block" />
            <div className="hidden sm:flex items-center title-bar-controls">
              <DesktopMenuBar />
            </div>
          </div>

          {/* وضع العمل - Fluent 2 Segmented Control */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-input p-1 rounded-xl border border-border z-10 title-bar-controls shadow-inner" dir="rtl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("collage")}
              aria-label="وضع الكولاج"
              title="وضع الكولاج"
              className={cn(
                "h-8 px-3.5 rounded-md cursor-pointer gap-2 flex items-center justify-center font-cairo text-xs z-10 relative transition-all duration-150 select-none",
                mode === "collage"
                  ? "text-primary font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "collage" && (
                <motion.div
                  layoutId="active-mode-pill"
                  className="absolute inset-0 bg-card border border-border rounded-md shadow-xs -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <SquaresFour className="w-4 h-4" weight={mode === "collage" ? "fill" : "regular"} />
              <span className="leading-none font-bold">كولاج</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("single")}
              aria-label="وضع التعديل الحر"
              title="وضع التعديل الحر"
              className={cn(
                "h-8 px-3.5 rounded-md cursor-pointer gap-2 flex items-center justify-center font-cairo text-xs z-10 relative transition-all duration-150 select-none",
                mode === "single"
                  ? "text-primary font-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "single" && (
                <motion.div
                  layoutId="active-mode-pill"
                  className="absolute inset-0 bg-card border border-border rounded-md shadow-xs -z-10"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Image className="w-4 h-4" weight={mode === "single" ? "fill" : "regular"} />
              <span className="leading-none font-bold">تعديل حر</span>
            </Button>
          </div>

          <div className="flex items-center gap-1.5 title-bar-controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAccountModalOpen(true)}
              className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 relative rounded-md"
              title="الحساب والتراخيص"
            >
              {isLicenseActive ? (
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" weight="duotone" />
              ) : (
                <User className="w-4.5 h-4.5 text-muted-foreground" />
              )}
              {user?.plan === "trial" && (
                <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse ring-2 ring-background" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 rounded-md"
              title={theme === "light" ? "الوضع الداكن" : "الوضع المضيء"}
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>

            {/* أزرار طي وتوسيع الألواح الجانبية لسطح المكتب */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRightSidebarOpen((v) => !v)}
              className={cn(
                "hidden lg:flex h-8 w-8 p-0 items-center justify-center rounded-md cursor-pointer transition-all",
                rightSidebarOpen
                  ? "text-primary bg-primary/10 hover:bg-primary/20 font-bold"
                  : "text-muted-foreground hover:bg-muted/80"
              )}
              title={rightSidebarOpen ? "إخفاء لوحة القوالب (Ctrl+B)" : "إظهار لوحة القوالب (Ctrl+B)"}
            >
              <SidebarSimple className="w-4 h-4" weight={rightSidebarOpen ? "fill" : "regular"} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLeftSidebarOpen((v) => !v)}
              className={cn(
                "hidden lg:flex h-8 w-8 p-0 items-center justify-center rounded-md cursor-pointer transition-all",
                leftSidebarOpen
                  ? "text-primary bg-primary/10 hover:bg-primary/20 font-bold"
                  : "text-muted-foreground hover:bg-muted/80"
              )}
              title={leftSidebarOpen ? "إخفاء لوحة الخصائص (Ctrl+Shift+B)" : "إظهار لوحة الخصائص (Ctrl+Shift+B)"}
            >
              <SlidersHorizontal className="w-4 h-4" weight={leftSidebarOpen ? "bold" : "regular"} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5 h-8 px-2.5 rounded-md"
              onClick={() => setMobileTemplatesOpen(true)}
            >
              <SidebarSimple className="w-4 h-4" />
              <span className="text-xs font-semibold">القوالب</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5 h-8 px-2.5 rounded-md"
              onClick={() => setMobilePropsOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-xs font-semibold">خصائص</span>
            </Button>

            {/* Separator */}
            <div className="w-px h-5 bg-border/60 mx-1" />

            {/* Window Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMinimize}
              className="w-9 h-7.5 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 rounded-md transition-colors"
              title="تصغير"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMaximize}
              className="w-9 h-7.5 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 rounded-md transition-colors"
              title={isMaximized ? "استعادة" : "تكبير"}
            >
              {isMaximized ? <CopySimple className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-9 h-7.5 p-0 flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white rounded-md transition-colors active:bg-red-600"
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
        onSave={() => window.dispatchEvent(new CustomEvent("grido:open-projects-dialog"))}
      />

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex overflow-hidden">
        {/* لوحة القوالب — أول عنصر في flex مع dir="rtl" فيُعرض على يمين الشاشة */}
        <aside
          className={cn(
            "hidden lg:flex h-full native-depth-sidebar flex-col no-print z-20 overflow-hidden fluent-panel-motion",
            rightSidebarOpen
              ? "w-[335px] min-w-[335px] max-w-[335px] opacity-100"
              : "w-0 min-w-0 max-w-0 opacity-0 pointer-events-none border-l-0"
          )}
        >
          <TemplatePanel onCollapse={() => setRightSidebarOpen(false)} />
        </aside>

        {/* الكانفس - الوسط */}
        <section className="flex-1 flex flex-col min-w-0 bg-background relative z-10 overflow-hidden">
          <div className="flex-1 relative h-full w-full overflow-hidden">
            <ErrorBoundary>
              <EditorCanvas />
            </ErrorBoundary>

            {/* مؤشر المعالجة العائم (يظهر فقط أثناء العمل على الكانفاس) */}
            {isBusy && (
              <div className="absolute top-4 right-4 z-30 font-cairo animate-in fade-in slide-in-from-top-2 duration-300 no-print pointer-events-none">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-primary bg-card/90 backdrop-blur-xl h-8 px-3.5 rounded-full border border-border shadow-fluent-8">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>جاري العمل ...</span>
                </span>
              </div>
            )}
          </div>

          {/* شريط الأدوات السفلي المثبت (Docked Bottom Command Bar - لا يغطي الكانفاس نهائياً) */}
          <footer className="h-10 shrink-0 border-t border-border bg-sidebar px-3 flex items-center justify-center relative z-20 no-print select-none">
            <CanvasViewportDeck
              isZenMode={!rightSidebarOpen && !leftSidebarOpen}
              onToggleZenMode={() => {
                const zen = !rightSidebarOpen && !leftSidebarOpen;
                if (zen) {
                  setRightSidebarOpen(true);
                  setLeftSidebarOpen(true);
                } else {
                  setRightSidebarOpen(false);
                  setLeftSidebarOpen(false);
                }
              }}
            />
          </footer>
        </section>

        {/* لوحة الخصائص — ثاني عنصر في flex مع dir="rtl" فيُعرض على يسار الشاشة */}
        <aside
          className={cn(
            "hidden lg:flex h-full native-depth-sidebar flex-col no-print shadow-sm z-20 overflow-hidden fluent-panel-motion",
            leftSidebarOpen
              ? "w-[335px] min-w-[335px] max-w-[335px] opacity-100"
              : "w-0 min-w-0 max-w-0 opacity-0 pointer-events-none border-r-0"
          )}
        >
          <PropertiesPanel onCollapse={() => setLeftSidebarOpen(false)} />
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

      <SonnerToaster position="top-center" duration={1500} closeButton />
      <KeyboardShortcutsDialog />
    </div>
    </TooltipProvider>
    </PhosphorProvider>
  );
}
