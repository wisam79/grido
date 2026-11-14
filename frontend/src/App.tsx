// استيرادات مباشرة بدل برميل @/components/editor: البرميل كان يُدخل كل
// اللوحات والحوارات (ومنها print-dialog وprojects-dialog) في الحزمة الرئيسية
// فيُلغي فائدة lazy() تماماً.
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { CanvasViewportDeck } from '@/components/editor/canvas/canvas-viewport-deck';
import { EditorCanvas } from '@/components/editor/canvas/editor-canvas';
import { AccountLicenseModal } from '@/components/editor/dialogs/account-license-modal';
import { PropertiesPanel } from '@/components/editor/panels/properties-panel';
import { TemplatePanel } from '@/components/editor/panels/template-panel';
import { DesktopMenuBar } from '@/components/editor/system/desktop-menu-bar';
import { LicenseLockScreen } from '@/components/editor/system/license-lock-screen';
import { StartupSplash } from '@/components/editor/system/startup-splash';
import { UpdateNotifier } from '@/components/editor/system/update-notifier';
import { usePhoneBridgeListener } from '@/components/editor/system/use-phone-bridge';
import { WindowControls } from '@/components/editor/system/window-controls';
import { WindowResizeHandles } from '@/components/editor/system/window-resize-handles';
import { Toolbar } from '@/components/editor/toolbar/toolbar';
import { AppDialogsHost } from '@/components/editor/workspace/app-dialogs-host';
import { WorkspaceLayout } from '@/components/editor/workspace/workspace-layout';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { FluentIconProvider } from '@/components/ui/fluent-icon-provider';
import { SquaresFour, Image, SidebarSimple } from '@/components/ui/icons';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppBootstrap } from '@/hooks/use-app-bootstrap';
import { flushAutoSave, useAutoSave } from '@/hooks/use-autosave';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useTheme } from '@/hooks/use-theme';
import { useUiZoom } from '@/hooks/use-ui-zoom';
import { useWindowControls } from '@/hooks/use-window-controls';
import {
  useWorkspacePanels,
  type CollageTab,
  type FreeformTab,
} from '@/hooks/use-workspace-panels';
import { useEditorStore } from '@/lib/editor-store';
import { useOperationStatusStore } from '@/lib/ui/operation-status';
import { FOCUS_RING } from '@/lib/ui/ui-compliance';
import { cn } from '@/lib/utils';

import { EventsOn, Quit } from '../wailsjs/runtime/runtime';

export default function App() {
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const {
    isInitializing,
    initializationStatus,
    retryInitialization,
    crashReport,
    handleRecoverCrash,
    handleDismissCrash,
  } = useAppBootstrap();

  const panelsHook = useWorkspacePanels();
  const isCompactWorkspace = panelsHook.breakpoint === 'compact';
  const isCompactPropertiesOpen =
    panelsHook.isMobileSheetOpen && panelsHook.mobileActiveTab === 'properties';
  const { theme, toggleTheme } = useTheme();
  const { zoomIn: uiZoomIn, zoomOut: uiZoomOut, resetZoom: uiZoomReset } = useUiZoom();
  const activeOperation = useOperationStatusStore((s) => s.activeOperation);
  const cancelActiveOperation = useOperationStatusStore((s) => s.cancelActiveOperation);
  const isInlineAiOperation =
    activeOperation?.type === 'ai_enhance' ||
    activeOperation?.type === 'bg_removal' ||
    activeOperation?.type === 'face_frame';

  const { togglePanel, toggleZenMode, selectCollageTab, selectStudioTab, openPanel } = panelsHook;

  useEffect(() => {
    const handleOpenProperties = () => {
      useEditorStore.getState().selectElement(null);
      openPanel('properties');
    };
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
    window.addEventListener('grido:toggle-right-sidebar', handleToggleRight);
    window.addEventListener('grido:open-properties-panel', handleOpenProperties);
    window.addEventListener('grido:toggle-left-sidebar', handleToggleLeft);
    window.addEventListener('grido:toggle-zen-mode', handleToggleZen);
    window.addEventListener('grido:select-collage-tab', handleSelectCollageTab);
    window.addEventListener('grido:select-studio-tab', handleSelectStudioTab);

    return () => {
      window.removeEventListener('grido:toggle-right-sidebar', handleToggleRight);
      window.removeEventListener('grido:open-properties-panel', handleOpenProperties);
      window.removeEventListener('grido:toggle-left-sidebar', handleToggleLeft);
      window.removeEventListener('grido:toggle-zen-mode', handleToggleZen);
      window.removeEventListener('grido:select-collage-tab', handleSelectCollageTab);
      window.removeEventListener('grido:select-studio-tab', handleSelectStudioTab);
    };
  }, [togglePanel, toggleZenMode, selectCollageTab, selectStudioTab, openPanel]);

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

  // Desktop visibility belongs to useWorkspacePanels: imperative opening would
  // pin ordinary selections and override explicit Zen/close-all suppression.
  // Compact mode still opens its properties sheet once per new selection.
  const { openPanel: panelsOpenPanel } = panelsHook;

  useEffect(() => {
    if (
      isCompactWorkspace &&
      selectedId &&
      selectedId !== prevSelectedIdRef.current &&
      !isCompactPropertiesOpen
    ) {
      panelsOpenPanel('properties');
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId, panelsOpenPanel, isCompactWorkspace, isCompactPropertiesOpen]);

  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);

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
    window.addEventListener('grido:ui-zoom-in', uiZoomIn);
    window.addEventListener('grido:ui-zoom-out', uiZoomOut);
    window.addEventListener('grido:ui-zoom-reset', uiZoomReset);

    return () => {
      window.removeEventListener('grido:toggle-theme', handleToggleTheme);
      window.removeEventListener('grido:open-account', handleOpenAccount);
      window.removeEventListener('grido:open-export-dialog', openExport);
      window.removeEventListener('grido:open-print-dialog', openPrint);
      window.removeEventListener('grido:ui-zoom-in', uiZoomIn);
      window.removeEventListener('grido:ui-zoom-out', uiZoomOut);
      window.removeEventListener('grido:ui-zoom-reset', uiZoomReset);
    };
  }, [toggleTheme, setAccountModalOpen, uiZoomIn, uiZoomOut, uiZoomReset]);

  if (isInitializing) {
    return (
      <StartupSplash
        status={initializationStatus}
        onRetry={retryInitialization}
        onClose={handleClose}
      />
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
          className={cn(
            'w-full h-full min-w-full min-h-full flex flex-col overflow-hidden font-cairo bg-background',
          )}
          dir="rtl"
        >
          {!isMaximized && <WindowResizeHandles />}
          {/* الرأس الموحد للنافذة بتصميم Fluent 2 صلب وخفيف */}
          <ErrorBoundary>
            <header
              className={cn(
                'border-b border-border bg-sidebar no-print title-bar-draggable select-none transition-opacity duration-200 z-(--z-panel) shadow-2xs',
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
                    <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/20 shrink-0" />
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
                    className="flex md:hidden items-center gap-0.5 p-0.5 rounded-md bg-muted border border-border/70 select-none title-bar-controls"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'collage'}
                      aria-label="وضع الكولاج"
                      title="وضع الكولاج (Ctrl+Alt+1)"
                      onClick={() => setMode('collage')}
                      className={cn(
                        'coarse-touch-target h-7 w-7 flex items-center justify-center rounded-md transition-colors duration-150 cursor-pointer',
                        FOCUS_RING,
                        mode === 'collage'
                          ? 'bg-background dark:bg-card border border-border/70 shadow-xs text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <SquaresFour
                        aria-hidden="true"
                        className="w-3.5 h-3.5 shrink-0"
                        weight={mode === 'collage' ? 'fill' : 'regular'}
                      />
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'single'}
                      aria-label="وضع التعديل الحر"
                      title="وضع التعديل الحر (Ctrl+Alt+2)"
                      onClick={() => setMode('single')}
                      className={cn(
                        'coarse-touch-target h-7 w-7 flex items-center justify-center rounded-md transition-colors duration-150 cursor-pointer',
                        FOCUS_RING,
                        mode === 'single'
                          ? 'bg-background dark:bg-card border border-border/70 shadow-xs text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Image
                        aria-hidden="true"
                        className="w-3.5 h-3.5 shrink-0"
                        weight={mode === 'single' ? 'fill' : 'regular'}
                      />
                    </button>
                  </div>
                </div>

                {/* 🧭 عناصر شريط العنوان — نظيفة تماماً وفق Fluent 2:
                    انتقلت عناصر الثيم والحساب والألواح إلى قائمة الإعدادات الموحدة
                    في أسفل الشريط الجانبي (RailSettingsMenu) لتحرير شريط العنوان */}
                <div
                  className="flex items-center gap-1 h-full title-bar-controls"
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="coarse-touch-target lg:hidden gap-1.5 h-7 px-2.5 rounded-md text-foreground/80 hover:text-foreground"
                    onClick={() => panelsHook.openPanel('templates')}
                  >
                    <SidebarSimple className="w-4 h-4" />
                    <span className="text-xs font-semibold">
                      {mode === 'collage' ? 'القوالب' : 'التصميم'}
                    </span>
                  </Button>

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
                  onCollapse={
                    panelsHook.breakpoint === 'compact'
                      ? undefined
                      : () => panelsHook.togglePanel('templates')
                  }
                  collapseSide="left"
                  hideHeader={panelsHook.breakpoint === 'compact'}
                  activeStudioTab={panelsHook.activeStudioTab}
                  activeCollageTab={panelsHook.activeCollageTab}
                  onActiveCollageTabChange={panelsHook.setActiveCollageTab}
                />
              </ErrorBoundary>
            }
            propertiesContent={
              <ErrorBoundary>
                <PropertiesPanel
                  onCollapse={
                    panelsHook.breakpoint === 'compact'
                      ? undefined
                      : () => panelsHook.togglePanel('properties')
                  }
                  isPinned={panelsHook.isInspectorPinned}
                  onTogglePin={() => panelsHook.setIsInspectorPinned((prev) => !prev)}
                />
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
              activeOperation && (!isInlineAiOperation || panelsHook.isZenMode) ? (
                <div className="absolute top-4 end-4 z-(--z-quick-bar) font-cairo animate-in fade-in slide-in-from-top-2 duration-200 no-print flex items-center gap-2 bg-card h-8 ps-3 pe-1.5 rounded-lg border border-border/80 shadow-fluent-8 pointer-events-auto">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-foreground truncate max-w-xs">
                    {activeOperation.title}
                  </span>
                  {activeOperation.canCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelActiveOperation}
                      className="h-6 px-2 text-mini font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer transition-colors"
                    >
                      إلغاء
                    </Button>
                  )}
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
