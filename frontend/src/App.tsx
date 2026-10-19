import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Toolbar,
  TemplatePanel,
  PropertiesPanel,
  EditorCanvas,
  AccountLicenseModal,
  UpdateNotifier,
  WindowResizeHandles,
  CanvasViewportDeck,
  DesktopMenuBar,
  WorkspaceLayout,
  AppDialogsHost,
} from '@/components/editor';
import {
  useWorkspacePanels,
  type CollageTab,
  type FreeformTab,
} from '@/hooks/use-workspace-panels';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAppBootstrap } from '@/hooks/use-app-bootstrap';

import { Button } from '@/components/ui/button';
import { useOperationStatusStore } from '@/lib/ui/operation-status';
import { Spinner } from '@/components/ui/huge-icon';
import { FluentIconProvider } from '@/components/ui/fluent-icon-provider';
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
} from '@/components/ui/icons';

import { useTheme } from '@/hooks/use-theme';
import { useWindowControls } from '@/hooks/use-window-controls';
import { WindowControls } from '@/components/editor/system/window-controls';
import { LicenseLockScreen } from '@/components/editor/system/license-lock-screen';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { flushAutoSave, useAutoSave } from '@/hooks/use-autosave';
import { EventsOn, Quit } from '../wailsjs/runtime/runtime';
import { useEditorStore } from '@/lib/editor-store';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { usePhoneBridgeListener } from '@/components/editor/system/use-phone-bridge';
import { PAPER_BACKGROUND_EVENTS } from '@/lib/ui/paper-background';

export default function App() {
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const { isInitializing, crashReport, handleRecoverCrash, handleDismissCrash } = useAppBootstrap();

  const panelsHook = useWorkspacePanels();
  const isTemplatesOpen =
    panelsHook.breakpoint === 'wide'
      ? panelsHook.isTemplatesDrawerOpen
      : panelsHook.activePanel === 'templates';
  const isPropertiesOpen =
    panelsHook.breakpoint === 'wide'
      ? panelsHook.isInspectorPinned
      : panelsHook.activePanel === 'properties';
  const { theme, themeMode, toggleTheme } = useTheme();
  const activeOperation = useOperationStatusStore((s) => s.activeOperation);
  const cancelActiveOperation = useOperationStatusStore((s) => s.cancelActiveOperation);

  const { togglePanel, openPanel, toggleZenMode, selectCollageTab, selectStudioTab } = panelsHook;

  useEffect(() => {
    const handleToggleRight = () => togglePanel('templates');
    const handleToggleLeft = () => togglePanel('properties');
    const handleToggleZen = () => toggleZenMode();
    const handleSelectCollageTab = (e: Event) => {
      const detail = (e as CustomEvent<{ tab: CollageTab }>).detail;
      if (detail?.tab) {
        selectCollageTab(detail.tab);
      }
    };
    const handleSelectStudioTab = (e: Event) => {
      const detail = (e as CustomEvent<{ tab: FreeformTab }>).detail;
      if (detail?.tab) {
        selectStudioTab(detail.tab);
      }
    };
    // 🎯 انتقال موحّد إلى أداة خلفية الورقة الوحيدة (لوحة الخصائص)
    const handleOpenPropertiesPanel = () => openPanel('properties');

    window.addEventListener('grido:toggle-right-sidebar', handleToggleRight);
    window.addEventListener('grido:toggle-left-sidebar', handleToggleLeft);
    window.addEventListener('grido:toggle-zen-mode', handleToggleZen);
    window.addEventListener('grido:select-collage-tab', handleSelectCollageTab);
    window.addEventListener('grido:select-studio-tab', handleSelectStudioTab);
    window.addEventListener(PAPER_BACKGROUND_EVENTS.openPanel, handleOpenPropertiesPanel);

    return () => {
      window.removeEventListener('grido:toggle-right-sidebar', handleToggleRight);
      window.removeEventListener('grido:toggle-left-sidebar', handleToggleLeft);
      window.removeEventListener('grido:toggle-zen-mode', handleToggleZen);
      window.removeEventListener('grido:select-collage-tab', handleSelectCollageTab);
      window.removeEventListener('grido:select-studio-tab', handleSelectStudioTab);
      window.removeEventListener(PAPER_BACKGROUND_EVENTS.openPanel, handleOpenPropertiesPanel);
    };
  }, [togglePanel, openPanel, toggleZenMode, selectCollageTab, selectStudioTab]);

  const { isMaximized, isFocused, handleMinimize, handleMaximize, handleClose } =
    useWindowControls();

  useKeyboardShortcuts();
  useAutoSave();
  usePhoneBridgeListener();

  // ── الإغلاق النظيف عبر عقد الخلفية (P1 من تدقيق 2026-10-19) ─────────────
  // Go لم يعد يخرج مباشرةً بعد الآن: يُطلق حدث `app:quit-requested` (خروج
  // صينية النظام، و WindowClosing عندما يكون قابلاً للإلغاء) بدل إنهاء
  // العملية. هنا ننتظر تفريغ مسودة الحفظ التلقائي النهائي ثم نستدعي
  // `Quit()` — بلا هذا المستمع كان أي تعديل في آخر ثانيتين قبل الخروج يُفقد
  // لأن الكتابة العائمة داخل تنظيف React تُسبق إغلاق العملية.
  // التسجيل بالإرجاع المُنظَّم لـ EventsOn (دالة إلغاء اشتراك خاصة بهذا
  // المستمع) — لا بـ EventsOff العام الذي يقتلع مستمعين لا نملكهم.
  useEffect(() => {
    let quitHandled = false;
    const unsubQuit = EventsOn('app:quit-requested', () => {
      // حصر الخروج بمسار واحد: طلبات خروج متعددة لا تستدعي Quit مرتين
      if (quitHandled) return;
      quitHandled = true;
      void (async () => {
        try {
          await flushAutoSave();
        } catch {
          // فشل الحفظ لا يحبس المستخدم خارج التطبيق — يُغلق على أي حال
        } finally {
          Quit();
        }
      })();
    });

    return () => {
      if (typeof unsubQuit === 'function') unsubQuit();
    };
  }, []);

  const selectedId = useEditorStore((state) => state.selectedId);
  const prevSelectedIdRef = useRef<string | null>(null);

  // 🛡️ الأداء: تبعيات محددة لا الكائن الكامل — panelsHook كائن جديد بكل رندر،
  // وكان اعتماده كاملاً يعيد تسجيل التأثير (تنظيف + إعادة تشغيل) في كل تحديث
  // لأي حالة داخل App. حارس prevSelectedIdRef يضمن التشغيل مرة واحدة لكل تحديد،
  // فقراءة breakpoint/activePanel عند الإطلاق فقط سلوك مطابق للأصل.
  const { openPanel: panelsOpenPanel, setActiveStudioTab: panelsSetActiveStudioTab } = panelsHook;

  useEffect(() => {
    if (selectedId && selectedId !== prevSelectedIdRef.current) {
      // 🛡️ مزامنة التحديد ثنائية الاتجاه لجميع العروض: كان القيد standard-only
      // فيُهمل wide (الدبس غير مثبّت) وcompact (ورقة الجوال) رغم أن openPanel
      // يدعم الفروع الثلاثة — الآن يُفتح الأنسب لكل breakpoint.
      if (panelsHook.activePanel !== 'properties') {
        panelsOpenPanel('properties');
      }
    }
    prevSelectedIdRef.current = selectedId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, panelsOpenPanel]);

  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);
  const workflow = useEditorStore((state) => state.workflow);

  // مسار الإنتاج السريع يخفي تبويب العناصر — إن كان مفتوحاً نعيده للطبقات
  // بدل زر بلا إبراز ولوحة بلا مدخل في الشريط
  useEffect(() => {
    if (workflow === 'quick' && panelsHook.activeStudioTab === 'elements') {
      panelsSetActiveStudioTab('layers');
    }
    // 🛡️ activeStudioTab قراءة عند إطلاق التأثير فقط — التبعية الحقيقية workflow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow, panelsSetActiveStudioTab]);

  // [FIX #7] قراءة user مباشرة لضمان إعادة render عند تغيير أي من حقوله
  const user = useEditorStore((state) => state.user);
  const { isLicenseActive: isLicenseActiveFn } = useEditorStore(
    useShallow((state) => ({
      isLicenseActive: state.isLicenseActive,
    })),
  );
  const isLicenseActive = isLicenseActiveFn();
  const setAccountModalOpen = useEditorStore((state) => state.setAccountModalOpen);
  const activateLicenseKey = useEditorStore((state) => state.activateLicenseKey);
  const logoutAccount = useEditorStore((state) => state.logoutAccount);

  // شريط الحالة: "جاهز" مرتبطة بحالة فعلية الآن — تعمل مؤشرات الذكاء الاصطناعي
  // على تعيين enhancingElementId أثناء المعالجة
  const isBusy = useRenderQuality((s) => s.enhancingElementId !== null);

  // أوامر لوحة الأدوات التي مصدرها هذا المكوّن وحده: الثيم (مصدره useTheme هنا)
  // ونافذة الحساب — فلا تملك اللوحة نسخة ثانية من حالة الثيم أو المودال.
  useEffect(() => {
    const handleToggleTheme = () => toggleTheme();
    const handleOpenAccount = () => setAccountModalOpen(true);
    const openExport = () => setExportOpen(true);
    // 🎯 قناة أوامر واحدة: كل الأسطح (شريط القوائم، شريط الأدوات، الاختصارات) تبثّ
    // نفس الأحداث، وGate الترخيص يعيش هنا مرة واحدة — فأي مسار طباعة (بما فيه Ctrl+P
    // الذي كان يتجاوز البوابة) يمر عبره. (تقييم 2026-10-10، P1-4)
    const openPrint = () => {
      if (!useEditorStore.getState().isLicenseActive()) {
        toast.error('الطباعة في الخطة الاحترافية (Pro) فقط.', {
          action: { label: 'تفعيل الآن', onClick: () => setAccountModalOpen(true) },
        });
        return;
      }
      setPrintOpen(true);
    };

    window.addEventListener('grido:toggle-theme', handleToggleTheme);
    window.addEventListener('grido:open-account', handleOpenAccount);
    window.addEventListener('grido:open-export-dialog', openExport);
    window.addEventListener('grido:open-print-dialog', openPrint);

    return () => {
      window.removeEventListener('grido:toggle-theme', handleToggleTheme);
      window.removeEventListener('grido:open-account', handleOpenAccount);
      window.removeEventListener('grido:open-export-dialog', openExport);
      window.removeEventListener('grido:open-print-dialog', openPrint);
    };
  }, [toggleTheme, setAccountModalOpen]);

  if (isInitializing) {
    return (
      <div
        className="fixed inset-0 z-(--z-ruler) flex flex-col items-center justify-center bg-background text-foreground font-cairo select-none"
        dir="rtl"
      >
        <div className="relative flex flex-col items-center max-w-xs text-center px-4">
          <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mb-5 border border-primary/20 shadow-fluent-16 shadow-primary/10">
            <Spinner className="w-8 h-8 text-primary" size={32} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Grido Studio</h1>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">جاري التهيئة ...</p>
        </div>
      </div>
    );
  }

  if (!isLicenseActive) {
    return (
      <FluentIconProvider weight="regular" size={18}>
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
      </FluentIconProvider>
    );
  }

  return (
    <FluentIconProvider weight="regular" size={18}>
      <TooltipProvider delayDuration={650} skipDelayDuration={150}>
        <div
          className={cn('h-screen flex flex-col overflow-hidden font-cairo bg-background/90')}
          dir="rtl"
        >
          {!isMaximized && <WindowResizeHandles />}
          {/* الرأس الموحد للنافذة بتصميم Fluent 2 Acrylic */}
          <ErrorBoundary>
            <header
              className={cn(
                'border-b border-border bg-sidebar/85 backdrop-blur-xl no-print title-bar-draggable select-none transition-opacity duration-200 z-(--z-panel) fluent-specular shadow-2xs',
                !isFocused && 'opacity-75',
              )}
              // شريط النافذة بنمط RTL العربي الأصيل (القوائم تبدأ يميناً وأزرار التحكم يساراً)
              dir="rtl"
              onDoubleClick={(e) => {
                // 🛡️ منع تقليص النافذة (Unmaximise) عند النقر المزدوج على عناصر التحكم
                if (
                  (e.target as HTMLElement).closest(
                    '.title-bar-controls, button, [role="tab"], [role="menuitem"], a, input, select',
                  )
                ) {
                  return;
                }
                handleMaximize();
              }}
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
                  <div
                    className="hidden sm:flex items-center title-bar-controls"
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <DesktopMenuBar />
                  </div>
                  {/* مبدّل الوضع المدمج للشاشات الصغيرة — المبدّل الكامل مخفي
                      تحت md بلا بديل لمسي، فيبقى التبديل ممكناً بأيقونتين */}
                  <div
                    role="tablist"
                    aria-label="وضع العمل"
                    dir="rtl"
                    className="flex md:hidden items-center gap-0.5 p-0.5 rounded-lg bg-muted/40 dark:bg-black/20 border border-border/50 shadow-inner select-none title-bar-controls"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'collage'}
                      title="وضع الكولاج (Ctrl+Alt+1)"
                      onClick={() => setMode('collage')}
                      className={cn(
                        'h-7 w-7 flex items-center justify-center rounded-md transition-colors duration-150 cursor-pointer',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        mode === 'collage'
                          ? 'bg-background dark:bg-card border border-border/70 shadow-xs text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <SquaresFour
                        className="w-3.5 h-3.5 shrink-0"
                        weight={mode === 'collage' ? 'fill' : 'regular'}
                      />
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'single'}
                      title="وضع التعديل الحر (Ctrl+Alt+2)"
                      onClick={() => setMode('single')}
                      className={cn(
                        'h-7 w-7 flex items-center justify-center rounded-md transition-colors duration-150 cursor-pointer',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        mode === 'single'
                          ? 'bg-background dark:bg-card border border-border/70 shadow-xs text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Image
                        className="w-3.5 h-3.5 shrink-0"
                        weight={mode === 'single' ? 'fill' : 'regular'}
                      />
                    </button>
                  </div>
                </div>

                {/* وضع العمل — مبدّل الأوضاع القياسي وفق Fluent 2 */}
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 title-bar-controls hidden md:block"
                  dir="rtl"
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <div
                    role="tablist"
                    aria-label="وضع العمل"
                    className="relative inline-flex items-center p-0.5 rounded-lg bg-muted/40 dark:bg-black/20 border border-border/50 shadow-inner select-none"
                  >
                    {/* خيار 1: كولاج */}
                    <button
                      type="button"
                      role="tab"
                      id="mode-tab-collage"
                      aria-selected={mode === 'collage'}
                      data-testid="mode-tab-collage"
                      title="وضع الكولاج (Ctrl+Alt+1)"
                      onClick={() => setMode('collage')}
                      className={cn(
                        'relative z-10 flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold transition-colors duration-150 cursor-pointer select-none',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        mode === 'collage'
                          ? 'text-foreground font-bold'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {mode === 'collage' && (
                        <motion.span
                          layoutId="titlebar-mode-indicator"
                          className="absolute inset-0 bg-background dark:bg-card border border-border/70 dark:border-white/10 rounded-md shadow-xs -z-10"
                          transition={{ duration: 0.12, ease: 'easeOut' }}
                        />
                      )}

                      <SquaresFour
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 transition-colors',
                          mode === 'collage' ? 'text-foreground' : 'text-muted-foreground',
                        )}
                        weight={mode === 'collage' ? 'fill' : 'regular'}
                      />
                      <span>كولاج</span>
                    </button>

                    {/* خيار 2: تعديل حر */}
                    <button
                      type="button"
                      role="tab"
                      id="mode-tab-single"
                      aria-selected={mode === 'single'}
                      data-testid="mode-tab-single"
                      title="وضع التعديل الحر (Ctrl+Alt+2)"
                      onClick={() => setMode('single')}
                      className={cn(
                        'relative z-10 flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold transition-colors duration-150 cursor-pointer select-none',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        mode === 'single'
                          ? 'text-foreground font-bold'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {mode === 'single' && (
                        <motion.span
                          layoutId="titlebar-mode-indicator"
                          className="absolute inset-0 bg-background dark:bg-card border border-border/70 dark:border-white/10 rounded-md shadow-xs -z-10"
                          transition={{ duration: 0.12, ease: 'easeOut' }}
                        />
                      )}
                      <Image
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 transition-colors',
                          mode === 'single' ? 'text-foreground' : 'text-muted-foreground',
                        )}
                        weight={mode === 'single' ? 'fill' : 'regular'}
                      />
                      <span>تعديل حر</span>
                    </button>
                  </div>
                </div>

                <div
                  className="flex items-center gap-1.5 h-full title-bar-controls"
                  onDoubleClick={(e) => e.stopPropagation()}
                >
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
                        {user?.plan === 'trial' && (
                          <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse ring-2 ring-background" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="font-cairo text-xs font-semibold py-1 px-2.5"
                    >
                      الحساب والتراخيص
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleTheme}
                        className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted/80 rounded-md"
                        aria-label={
                          themeMode === 'system'
                            ? 'مظهر النظام تلقائي'
                            : themeMode === 'dark'
                              ? 'الوضع الداكن'
                              : 'الوضع المضيء'
                        }
                      >
                        {themeMode === 'system' ? (
                          <Desktop className="w-4 h-4 text-primary" weight="duotone" />
                        ) : themeMode === 'dark' ? (
                          <Moon className="w-4 h-4" />
                        ) : (
                          <Sun className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="font-cairo text-xs font-semibold py-1 px-2.5"
                    >
                      {themeMode === 'system'
                        ? `مظهر النظام تلقائي (${theme === 'dark' ? 'داكن' : 'مضيء'})`
                        : themeMode === 'dark'
                          ? 'الوضع الداكن (يدوي)'
                          : 'الوضع المضيء (يدوي)'}
                    </TooltipContent>
                  </Tooltip>

                  {/* أزرار طي وتوسيع الألواح الجانبية لسطح المكتب */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => panelsHook.togglePanel('templates')}
                        className={cn(
                          'hidden lg:flex h-8 w-8 p-0 items-center justify-center rounded-md cursor-pointer transition-all',
                          isTemplatesOpen
                            ? 'text-primary bg-primary/10 hover:bg-primary/20 font-bold'
                            : 'text-muted-foreground hover:bg-muted/80',
                        )}
                        aria-label={
                          isTemplatesOpen
                            ? mode === 'collage'
                              ? 'إخفاء لوحة القوالب'
                              : 'إخفاء استوديو التصميم'
                            : mode === 'collage'
                              ? 'إظهار لوحة القوالب'
                              : 'إظهار استوديو التصميم'
                        }
                      >
                        <SidebarSimple
                          className="w-4 h-4"
                          weight={isTemplatesOpen ? 'fill' : 'regular'}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="font-cairo text-xs font-semibold py-1 px-2.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>
                          {isTemplatesOpen
                            ? mode === 'collage'
                              ? 'إخفاء لوحة القوالب'
                              : 'إخفاء استوديو التصميم'
                            : mode === 'collage'
                              ? 'إظهار لوحة القوالب'
                              : 'إظهار استوديو التصميم'}
                        </span>
                        <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">
                          Ctrl+B
                        </kbd>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => panelsHook.togglePanel('properties')}
                        className={cn(
                          'hidden lg:flex h-8 w-8 p-0 items-center justify-center rounded-md cursor-pointer transition-all',
                          isPropertiesOpen
                            ? 'text-primary bg-primary/10 hover:bg-primary/20 font-bold'
                            : 'text-muted-foreground hover:bg-muted/80',
                        )}
                        aria-label={isPropertiesOpen ? 'إخفاء لوحة الخصائص' : 'إظهار لوحة الخصائص'}
                      >
                        <SlidersHorizontal
                          className="w-4 h-4"
                          weight={isPropertiesOpen ? 'fill' : 'regular'}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="font-cairo text-xs font-semibold py-1 px-2.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>
                          {isPropertiesOpen ? 'إخفاء لوحة الخصائص' : 'إظهار لوحة الخصائص'}
                        </span>
                        <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">
                          Ctrl+Shift+B
                        </kbd>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden gap-1.5 h-8 px-2.5 rounded-md"
                    onClick={() => panelsHook.openPanel('templates')}
                  >
                    <SidebarSimple className="w-4 h-4" />
                    <span className="text-xs font-semibold">
                      {mode === 'collage' ? 'القوالب' : 'التصميم'}
                    </span>
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
            onPrint={() => window.dispatchEvent(new CustomEvent('grido:open-print-dialog'))}
            onExport={() => window.dispatchEvent(new CustomEvent('grido:open-export-dialog'))}
            onSave={() =>
              window.dispatchEvent(
                new CustomEvent('grido:open-projects-dialog', { detail: { tab: 'save' } }),
              )
            }
          />

          {/* المحتوى الرئيسي للمساحة بتصميم Fluent 2 المستقر */}
          <WorkspaceLayout
            panelsHook={panelsHook}
            templatesContent={
              <ErrorBoundary>
                <TemplatePanel
                  onCollapse={() => panelsHook.togglePanel('templates')}
                  activeStudioTab={panelsHook.activeStudioTab}
                  onActiveStudioTabChange={panelsHook.setActiveStudioTab}
                  activeCollageTab={panelsHook.activeCollageTab}
                  onActiveCollageTabChange={panelsHook.setActiveCollageTab}
                  showInternalCollageTabs={panelsHook.breakpoint === 'compact'}
                />
              </ErrorBoundary>
            }
            propertiesContent={
              <ErrorBoundary>
                <PropertiesPanel onCollapse={() => panelsHook.togglePanel('properties')} />
              </ErrorBoundary>
            }
            canvasContent={
              <ErrorBoundary>
                <EditorCanvas
                  onOpenFile={() => window.dispatchEvent(new CustomEvent('grido:open-file-dialog'))}
                  onOpenTemplates={() => panelsHook.openPanel('templates')}
                />
              </ErrorBoundary>
            }
            floatingFeedback={
              activeOperation ? (
                <div className="absolute top-4 end-4 z-(--z-quick-bar) font-cairo animate-in fade-in slide-in-from-top-2 duration-200 no-print flex items-center gap-2 bg-card/95 backdrop-blur-xl h-8 ps-3 pe-1.5 rounded-lg border border-border/80 shadow-fluent-8 fluent-specular pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-foreground truncate max-w-xs">
                    {activeOperation.title}
                  </span>
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
                <div className="absolute top-4 end-4 z-(--z-quick-bar) font-cairo animate-in fade-in slide-in-from-top-2 duration-200 no-print flex items-center gap-2 bg-card/95 backdrop-blur-xl h-8 px-3 rounded-lg border border-border/80 shadow-fluent-8 fluent-specular pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-foreground">جاري الترميم ...</span>
                </div>
              ) : null
            }
            footerContent={<CanvasViewportDeck />}
          />

          {/* استضافة الحوارات الكسولة والمودال والإشعارات */}
          <AppDialogsHost
            exportOpen={exportOpen}
            onExportOpenChange={setExportOpen}
            printOpen={printOpen}
            onPrintOpenChange={setPrintOpen}
            crashReport={crashReport}
            onRecoverCrash={handleRecoverCrash}
            onDismissCrash={handleDismissCrash}
          />
        </div>
      </TooltipProvider>
    </FluentIconProvider>
  );
}
