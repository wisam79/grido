import { useState, useEffect, useRef, lazy, Suspense } from "react";
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
  User,
} from "@phosphor-icons/react";
import { useTheme } from "@/hooks/use-theme";
import { useWindowControls } from "@/hooks/use-window-controls";
import { WindowControls } from "@/components/editor/system/window-controls";
import { LicenseLockScreen } from "@/components/editor/system/license-lock-screen";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAutoSave } from "@/hooks/use-autosave";
import { useEditorStore } from "@/lib/editor-store";
import { useRenderQuality } from "@/lib/canvas/render-quality";
import { warmupOpenCV } from "@/components/editor/document-scanner/opencv-loader";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { usePhoneBridgeListener } from "@/components/editor/system/use-phone-bridge";

export default function App() {
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [mobileTemplatesOpen, setMobileTemplatesOpen] = useState(false);
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const { theme, toggleTheme } = useTheme();

  const sidebarsRef = useRef({ right: rightSidebarOpen, left: leftSidebarOpen });
  useEffect(() => {
    sidebarsRef.current = { right: rightSidebarOpen, left: leftSidebarOpen };
  }, [rightSidebarOpen, leftSidebarOpen]);

  useEffect(() => {
    const handleToggleRight = () => setRightSidebarOpen((v) => !v);
    const handleToggleLeft = () => setLeftSidebarOpen((v) => !v);
    const handleToggleZen = () => {
      const { right, left } = sidebarsRef.current;
      const anyOpen = right || left;
      setRightSidebarOpen(!anyOpen);
      setLeftSidebarOpen(!anyOpen);
    };

    window.addEventListener("grido:toggle-right-sidebar", handleToggleRight);
    window.addEventListener("grido:toggle-left-sidebar", handleToggleLeft);
    window.addEventListener("grido:toggle-zen-mode", handleToggleZen);

    return () => {
      window.removeEventListener("grido:toggle-right-sidebar", handleToggleRight);
      window.removeEventListener("grido:toggle-left-sidebar", handleToggleLeft);
      window.removeEventListener("grido:toggle-zen-mode", handleToggleZen);
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
  usePhoneBridgeListener();

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

  useEffect(() => {
    const check = async () => {
      try {
        const profile = await checkLicenseStatus();
        if (!profile || !profile.token) {
          setAccountModalOpen(true);
        }
        // ملء سجلات استخدام AI من AppData (مع ترحيل localStorage القديم)
        void useEditorStore.getState().hydrateAiUsageLogs();
        // فحص وجود صورة ممررة عند الإقلاع (مثل النقر بالزر الأيمن "فتح بواسطة" في ويندوز)
        try {
          if (typeof GetStartupFile === "function") {
            const startupUrl = await GetStartupFile();
            if (startupUrl) {
              const img = new window.Image();
              img.onload = () => {
                const aspect = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
                const store = useEditorStore.getState();
                store.setMode("single");
                store.addImageElement(startupUrl, aspect);
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
      <div className="fixed inset-0 z-(--z-ruler) flex flex-col items-center justify-center bg-background text-foreground font-cairo select-none" dir="rtl">
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
      <LicenseLockScreen
        theme={theme}
        onToggleTheme={toggleTheme}
        isMaximized={isMaximized}
        isFocused={isFocused}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
        onActivate={activateLicenseKey}
        onOpenAccount={() => setAccountModalOpen(true)}
        onLogout={logoutAccount}
        user={user}
      />
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAccountModalOpen(true)}
                  className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 relative rounded-md"
                  aria-label="الحساب والتراخيص"
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
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-cairo text-xs font-semibold py-1 px-2.5">الحساب والتراخيص</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 rounded-md"
                  aria-label={theme === "light" ? "الوضع الداكن" : "الوضع المضيء"}
                >
                  {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-cairo text-xs font-semibold py-1 px-2.5">
                {theme === "light" ? "الوضع الداكن" : "الوضع المضيء"}
              </TooltipContent>
            </Tooltip>

            {/* أزرار طي وتوسيع الألواح الجانبية لسطح المكتب */}
            <Tooltip>
              <TooltipTrigger asChild>
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
                  aria-label={rightSidebarOpen ? "إخفاء لوحة القوالب" : "إظهار لوحة القوالب"}
                >
                  <SidebarSimple className="w-4 h-4" weight={rightSidebarOpen ? "fill" : "regular"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-cairo text-xs font-semibold py-1 px-2.5">
                <div className="flex items-center gap-1.5">
                  <span>{rightSidebarOpen ? "إخفاء لوحة القوالب" : "إظهار لوحة القوالب"}</span>
                  <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+B</kbd>
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
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
                  aria-label={leftSidebarOpen ? "إخفاء لوحة الخصائص" : "إظهار لوحة الخصائص"}
                >
                  <SlidersHorizontal className="w-4 h-4" weight={leftSidebarOpen ? "bold" : "regular"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-cairo text-xs font-semibold py-1 px-2.5">
                <div className="flex items-center gap-1.5">
                  <span>{leftSidebarOpen ? "إخفاء لوحة الخصائص" : "إظهار لوحة الخصائص"}</span>
                  <kbd className="px-1 py-0.5 text-[10px] font-mono bg-muted/80 rounded border border-border">Ctrl+Shift+B</kbd>
                </div>
              </TooltipContent>
            </Tooltip>

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
            <WindowControls
              isMaximized={isMaximized}
              onMinimize={handleMinimize}
              onMaximize={handleMaximize}
              onClose={handleClose}
            />
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
          data-collapsed={!rightSidebarOpen}
          className={cn(
            "hidden lg:flex h-full native-depth-sidebar flex-col no-print z-20 overflow-hidden fluent-panel-motion",
            rightSidebarOpen
              ? "w-[288px] min-w-[288px] max-w-[288px] opacity-100 border-l border-sidebar-border shadow-sm"
              : "w-0 min-w-0 max-w-0 opacity-0 pointer-events-none border-l-0 shadow-none"
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
                  <span>جاري المعالجة ...</span>
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
          data-collapsed={!leftSidebarOpen}
          className={cn(
            "hidden lg:flex h-full native-depth-sidebar flex-col no-print z-20 overflow-hidden fluent-panel-motion",
            leftSidebarOpen
              ? "w-[296px] min-w-[296px] max-w-[296px] opacity-100 border-r border-sidebar-border shadow-sm"
              : "w-0 min-w-0 max-w-0 opacity-0 pointer-events-none border-r-0 shadow-none"
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
