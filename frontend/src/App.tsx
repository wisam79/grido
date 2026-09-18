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
  WorkspaceLayout,
} from "@/components/editor";
import { useWorkspacePanels } from "@/hooks/use-workspace-panels";
import { ErrorBoundary } from "@/components/error-boundary";
import { GetStartupFile, ProcessLocalImageFile } from "../wailsjs/go/main/App";
import { EventsOn, EventsOff } from "../wailsjs/runtime/runtime";

const ExportDialog = lazy(() => import("@/components/editor/dialogs/export-dialog").then(module => ({ default: module.ExportDialog })));
const PrintDialog = lazy(() => import("@/components/editor/dialogs/print-dialog").then(module => ({ default: module.PrintDialog })));
import { FluentSegmentedControl } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { useOperationStatusStore } from "@/lib/ui/operation-status";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/huge-icon";
import { PhosphorProvider } from "@/components/ui/phosphor-provider";
import {
  SquaresFour,
  Image,
  ShieldCheck,
  Moon,
  Sun,
  Desktop,
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
  const [isInitializing, setIsInitializing] = useState(true);

  const panelsHook = useWorkspacePanels();
  const isTemplatesOpen = panelsHook.breakpoint === "wide" ? panelsHook.isTemplatesDrawerOpen : panelsHook.activePanel === "templates";
  const isPropertiesOpen = panelsHook.activePanel === "properties";
  const { theme, themeMode, toggleTheme } = useTheme();
  const activeOperation = useOperationStatusStore((s) => s.activeOperation);
  const cancelActiveOperation = useOperationStatusStore((s) => s.cancelActiveOperation);

  useEffect(() => {
    const handleToggleRight = () => panelsHook.togglePanel("templates");
    const handleToggleLeft = () => panelsHook.togglePanel("properties");
    const handleToggleZen = () => panelsHook.toggleZenMode();

    window.addEventListener("grido:toggle-right-sidebar", handleToggleRight);
    window.addEventListener("grido:toggle-left-sidebar", handleToggleLeft);
    window.addEventListener("grido:toggle-zen-mode", handleToggleZen);

    return () => {
      window.removeEventListener("grido:toggle-right-sidebar", handleToggleRight);
      window.removeEventListener("grido:toggle-left-sidebar", handleToggleLeft);
      window.removeEventListener("grido:toggle-zen-mode", handleToggleZen);
    };
  }, [panelsHook]);


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

  // ⚡ الاستماع لأحداث محرك Wails وقت التشغيل (Runtime Events):
  // 1. فتح ملف عبر سطر الأوامر أو مثيل ثانٍ للتطبيق (file-opened)
  // 2. السحب والإفلات المباشر للملفات من سطح المكتب (native-file-drop)
  // 3. استئناف النظام من وضع السكون (app:resume)
  useEffect(() => {
    let unbindFileOpened: (() => void) | undefined;
    let unbindFileDrop: (() => void) | undefined;
    let unbindResume: (() => void) | undefined;

    if (typeof EventsOn === "function") {
      try {
        unbindFileOpened = EventsOn("file-opened", async (filePath: string) => {
          if (!filePath) return;
          try {
            const src = typeof ProcessLocalImageFile === "function"
              ? await ProcessLocalImageFile(filePath)
              : filePath;
            if (src) {
              const img = new window.Image();
              img.onload = () => {
                const aspect = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
                const store = useEditorStore.getState();
                store.setMode("single");
                store.addImageElement(src, aspect);
              };
              img.src = src;
            }
          } catch (err) {
            console.error("Failed to open file from Wails event:", err);
          }
        });

        unbindFileDrop = EventsOn("native-file-drop", (data: { x: number; y: number; images: string[] }) => {
          if (!data || !data.images || data.images.length === 0) return;
          const store = useEditorStore.getState();
          data.images.forEach((src) => {
            const img = new window.Image();
            img.onload = () => {
              const aspect = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
              store.addImageElement(src, aspect);
            };
            img.src = src;
          });
        });

        unbindResume = EventsOn("app:resume", () => {
          void checkLicenseStatus();
        });
      } catch (err) {
        console.warn("Wails runtime EventsOn not available in this environment:", err);
      }
    }

    return () => {
      unbindFileOpened?.();
      unbindFileDrop?.();
      unbindResume?.();
      if (typeof EventsOff === "function") {
        try {
          EventsOff("file-opened");
          EventsOff("native-file-drop");
          EventsOff("app:resume");
        } catch {
          // ignore
        }
      }
    };
  }, [checkLicenseStatus]);


  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-(--z-ruler) flex flex-col items-center justify-center bg-background text-foreground font-cairo select-none" dir="rtl">
        <div className="relative flex flex-col items-center max-w-xs text-center px-4">
          <motion.div 
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.1, 0.9, 0.2, 1] }}
            className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mb-5 border border-primary/20 shadow-fluent-16 shadow-primary/10"
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
      <PhosphorProvider weight="regular" size={18}>
        <TooltipProvider delayDuration={650} skipDelayDuration={150}>
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
          <AccountLicenseModal />
          <UpdateNotifier />
        </TooltipProvider>
      </PhosphorProvider>
    );
  }

  return (
    <PhosphorProvider weight="regular" size={18}>
      <TooltipProvider delayDuration={650} skipDelayDuration={150}>
        <div 
          className={cn(
            "h-screen flex flex-col overflow-hidden font-cairo bg-background/90",
          )}
          dir="rtl"
        >
      {!isMaximized && <WindowResizeHandles />}
      {/* الرأس الموحد للنافذة بتصميم Fluent 2 Acrylic */}
      <ErrorBoundary>
      <header
        className={cn(
          "border-b border-border bg-sidebar/85 backdrop-blur-xl no-print title-bar-draggable select-none transition-opacity duration-200 z-30 fluent-specular shadow-2xs",
          !isFocused && "opacity-75"
        )}
        onDoubleClick={handleMaximize}
      >
        <div className="flex items-center justify-between ps-3 pe-0 py-0 h-9 relative">
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
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 title-bar-controls" dir="rtl">
            <FluentSegmentedControl<"collage" | "single">
              layoutId="header-active-mode-pill"
              value={mode}
              onChange={setMode}
              size="md"
              fullWidth={false}
              options={[
                {
                  id: "collage",
                  label: "كولاج",
                  icon: <SquaresFour className="w-4 h-4" weight={mode === "collage" ? "fill" : "regular"} />,
                  tooltip: "وضع الكولاج والشبكات",
                },
                {
                  id: "single",
                  label: "تعديل حر",
                  icon: <Image className="w-4 h-4" weight={mode === "single" ? "fill" : "regular"} />,
                  tooltip: "وضع التعديل والتصميم الحر",
                },
              ]}
            />
          </div>

          <div className="flex items-center gap-1.5 h-full title-bar-controls">
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
                    <ShieldCheck className="w-4 h-4 text-emerald-500" weight="duotone" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
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
                  aria-label={
                    themeMode === "system"
                      ? "مظهر النظام تلقائي مع Windows 11"
                      : themeMode === "dark"
                      ? "الوضع الداكن"
                      : "الوضع المضيء"
                  }
                >
                  {themeMode === "system" ? (
                    <Desktop className="w-4 h-4 text-primary" weight="duotone" />
                  ) : themeMode === "dark" ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-cairo text-xs font-semibold py-1 px-2.5">
                {themeMode === "system"
                  ? `مظهر النظام تلقائي (${theme === "dark" ? "داكن" : "مضيء"})`
                  : themeMode === "dark"
                  ? "الوضع الداكن (يدوي)"
                  : "الوضع المضيء (يدوي)"}
              </TooltipContent>
            </Tooltip>

            {/* أزرار طي وتوسيع الألواح الجانبية لسطح المكتب */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => panelsHook.togglePanel("templates")}
                  className={cn(
                    "hidden lg:flex h-8 w-8 p-0 items-center justify-center rounded-md cursor-pointer transition-all",
                    isTemplatesOpen
                      ? "text-primary bg-primary/10 hover:bg-primary/20 font-bold"
                      : "text-muted-foreground hover:bg-muted/80"
                  )}
                  aria-label={isTemplatesOpen ? (mode === "collage" ? "إخفاء لوحة القوالب" : "إخفاء استوديو التصميم") : (mode === "collage" ? "إظهار لوحة القوالب" : "إظهار استوديو التصميم")}
                >
                  <SidebarSimple className="w-4 h-4" weight={isTemplatesOpen ? "fill" : "regular"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-cairo text-xs font-semibold py-1 px-2.5">
                <div className="flex items-center gap-1.5">
                  <span>{isTemplatesOpen ? (mode === "collage" ? "إخفاء لوحة القوالب" : "إخفاء استوديو التصميم") : (mode === "collage" ? "إظهار لوحة القوالب" : "إظهار استوديو التصميم")}</span>
                  <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl+B</kbd>
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => panelsHook.togglePanel("properties")}
                  className={cn(
                    "hidden lg:flex h-8 w-8 p-0 items-center justify-center rounded-md cursor-pointer transition-all",
                    isPropertiesOpen
                      ? "text-primary bg-primary/10 hover:bg-primary/20 font-bold"
                      : "text-muted-foreground hover:bg-muted/80"
                  )}
                  aria-label={isPropertiesOpen ? "إخفاء لوحة الخصائص" : "إظهار لوحة الخصائص"}
                >
                  <SlidersHorizontal className="w-4 h-4" weight={isPropertiesOpen ? "bold" : "regular"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-cairo text-xs font-semibold py-1 px-2.5">
                <div className="flex items-center gap-1.5">
                  <span>{isPropertiesOpen ? "إخفاء لوحة الخصائص" : "إظهار لوحة الخصائص"}</span>
                  <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">Ctrl+Shift+B</kbd>
                </div>
              </TooltipContent>
            </Tooltip>

            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5 h-8 px-2.5 rounded-md"
              onClick={() => panelsHook.openPanel("templates")}
            >
              <SidebarSimple className="w-4 h-4" />
              <span className="text-xs font-semibold">{mode === "collage" ? "القوالب" : "التصميم"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5 h-8 px-2.5 rounded-md"
              onClick={() => panelsHook.openPanel("properties")}
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
      </ErrorBoundary>

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
        onSave={() => window.dispatchEvent(new CustomEvent("grido:open-projects-dialog", { detail: { tab: "save" } }))}
      />

      {/* المحتوى الرئيسي للمساحة بتصميم Fluent 2 المستقر */}
      <WorkspaceLayout
        panelsHook={panelsHook}
        templatesContent={
          <ErrorBoundary>
            <TemplatePanel
              onCollapse={panelsHook.closeActivePanel}
              activeStudioTab={panelsHook.activeStudioTab}
              onActiveStudioTabChange={panelsHook.setActiveStudioTab}
            />
          </ErrorBoundary>
        }
        propertiesContent={
          <ErrorBoundary>
            <PropertiesPanel onCollapse={panelsHook.closeActivePanel} />
          </ErrorBoundary>
        }
        canvasContent={
          <ErrorBoundary>
            <EditorCanvas
              onOpenFile={() => window.dispatchEvent(new CustomEvent("grido:open-file-dialog"))}
              onOpenTemplates={() => panelsHook.openPanel("templates")}
            />
          </ErrorBoundary>
        }
        floatingFeedback={
          activeOperation ? (
            <div className="absolute top-4 end-4 z-30 font-cairo animate-in fade-in slide-in-from-top-2 duration-200 no-print flex items-center gap-2 bg-card/95 backdrop-blur-xl h-8 ps-3 pe-1.5 rounded-lg border border-border/80 shadow-fluent-8 fluent-specular pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-xs font-bold text-foreground truncate max-w-xs">{activeOperation.title}</span>
              {activeOperation.canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelActiveOperation}
                  className="h-6 px-2 text-mini font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer transition-all"
                >
                  إلغاء
                </Button>
              )}
            </div>
          ) : isBusy ? (
            <div className="absolute top-4 end-4 z-30 font-cairo animate-in fade-in slide-in-from-top-2 duration-200 no-print flex items-center gap-2 bg-card/95 backdrop-blur-xl h-8 px-3 rounded-lg border border-border/80 shadow-fluent-8 fluent-specular pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-xs font-bold text-primary">جاري المعالجة ...</span>
            </div>
          ) : null
        }
        footerContent={
          <CanvasViewportDeck
            isZenMode={panelsHook.isZenMode}
            onToggleZenMode={panelsHook.toggleZenMode}
          />
        }
      />

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

      <SonnerToaster position="top-center" duration={1500} offset={56} closeButton />
      <KeyboardShortcutsDialog />
    </div>
    </TooltipProvider>
    </PhosphorProvider>
  );
}
