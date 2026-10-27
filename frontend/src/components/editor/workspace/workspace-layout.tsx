import React, { useEffect, useRef } from 'react';

import { CanvasOverlayHost } from '@/components/editor/canvas/canvas-overlay-host';
import { notifyPanelTransition } from '@/components/editor/canvas/use-stable-viewport-size';
import { cn } from '@/lib/utils';

import { MobilePanelsSheet } from './mobile-panels-sheet';
import { WorkspacePanelRail, CompactToolLauncher } from './workspace-panel-rail';

import type { useWorkspacePanels } from '@/hooks/use-workspace-panels';

interface WorkspaceLayoutProps {
  templatesContent: React.ReactNode;
  propertiesContent: React.ReactNode;
  canvasContent: React.ReactNode;
  footerContent?: React.ReactNode;
  floatingFeedback?: React.ReactNode;
  panelsHook: ReturnType<typeof useWorkspacePanels>;
}

export const WorkspaceLayout = React.memo(function WorkspaceLayout({
  templatesContent,
  propertiesContent,
  canvasContent,
  footerContent,
  floatingFeedback,
  panelsHook,
}: WorkspaceLayoutProps) {
  const {
    breakpoint,
    isTemplatesDrawerOpen,
    isMobileSheetOpen,
    mobileActiveTab,
    isZenMode,
    toggleZenMode,
    setIsMobileSheetOpen,
    setMobileActiveTab,
  } = panelsHook;

  const isCompact = breakpoint === 'compact';

  // Desktop sidebars (>= 1024px): Left tools drawer and Right inspector are independent and docked
  const isLeftDrawerOpen = !isCompact && isTemplatesDrawerOpen;
  const isRightPanelOpen = !isCompact && panelsHook.isInspectorPinned;

  // 🧭 تتبع تغير حالة ظهور الألواح الجانبية لبدء حلقة المزامنة النشطة للكانفاس فوراً بـ 60fps
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    notifyPanelTransition();
  }, [isRightPanelOpen, isLeftDrawerOpen]);

  // ltr-island موثقة (عقد الاتجاه R37): main ثابت LTR فيزيائياً — Rail
  // يساراً والمفتش يميناً دائماً لاستقرار الكانفس. المحتوى الداخلي لكل
  // لوحة معزول بـ dir="rtl". الفواصل border-e/border-s منطقية لتتبع الاتجاه.
  return (
    <main
      data-testid="workspace-layout"
      dir="ltr"
      className="flex-1 flex h-full w-full min-w-0 overflow-hidden relative select-none"
    >
      {/* 1. الشريط الأيقوني الجانبي الأيسر (Rail - 48px) يظهر في Standard و Wide */}
      {!isCompact && (
        <WorkspacePanelRail
          activeStudioTab={panelsHook.activeStudioTab}
          activeCollageTab={panelsHook.activeCollageTab}
          isZenMode={isZenMode}
          onSelectStudioTab={panelsHook.selectStudioTab}
          onSelectCollageTab={panelsHook.selectCollageTab}
          onToggleZenMode={toggleZenMode}
          isLauncherOpen={panelsHook.isLauncherOpen}
          onLauncherOpenChange={panelsHook.setIsLauncherOpen}
        />
      )}

      {/* 2. درج الأدوات والقوالب الأيسر (Left Drawer - 288px) — يظهر في كل شاشات سطح المكتب */}
      {!isCompact && (
        <aside
          aria-label="لوحة القوالب"
          data-testid="workspace-panel-templates"
          data-collapsed={!isLeftDrawerOpen}
          className={cn(
            'h-full shrink-0 border-e border-border bg-sidebar z-(--z-panel) overflow-hidden fluent-panel-motion',
            isLeftDrawerOpen
              ? 'w-[288px] min-w-[288px] max-w-[288px]'
              : 'w-0 min-w-0 max-w-0 pointer-events-none',
          )}
        >
          <div
            dir="rtl"
            className={cn(
              'h-full w-[288px] flex flex-col overflow-hidden fluent-panel-content-motion',
              isLeftDrawerOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            {templatesContent}
          </div>
        </aside>
      )}

      {/* 3. منطقة الكانفس الرئيسية (الوسط - مضمونة بأقصى مساحة ممكنة) */}
      <section
        data-testid="workspace-canvas-shell"
        data-layout="canvas-center"
        className="flex-1 flex flex-col min-w-0 bg-background relative z-(--z-canvas-overlay) overflow-hidden h-full"
      >
        {/* حاوية العناصر العائمة داخل الكانفاس: `overflow-hidden` هنا هو ما يمنع
            شريط التحديد السريع من الطفو على الشريط الجانبي/الأدوات */}
        <div className="flex-1 relative w-full min-h-0 overflow-hidden">
          <CanvasOverlayHost>
            {canvasContent}
            {floatingFeedback}
          </CanvasOverlayHost>
          {/* زر لوحة الأوامر للشاشات المدمجة — نفس اللوحة الوحيدة بنفس الحالة؛
              مخفي في وضع التركيز (كروم إضافي) */}
          {isCompact && !isZenMode && (
            <div className="absolute bottom-4 start-4 z-(--z-quick-bar) no-print">
              <CompactToolLauncher
                activeStudioTab={panelsHook.activeStudioTab}
                activeCollageTab={panelsHook.activeCollageTab}
                onSelectStudioTab={panelsHook.selectStudioTab}
                onSelectCollageTab={panelsHook.selectCollageTab}
                isLauncherOpen={panelsHook.isLauncherOpen}
                onLauncherOpenChange={panelsHook.setIsLauncherOpen}
              />
            </div>
          )}
        </div>

        {/* الشريط السفلي المثبت */}
        {footerContent && (
          <footer className="h-8 shrink-0 border-t border-border bg-sidebar px-2 flex items-center justify-center relative z-(--z-panel) no-print select-none">
            {footerContent}
          </footer>
        )}
      </section>

      {/* 4. لوحة المفتش والخصائص اليمنى (Right Inspector - 288px) — مثبتة ومستقرة يميناً دائماً */}
      {!isCompact && (
        <aside
          aria-label="لوحة خصائص العنصر"
          data-testid="workspace-panel-properties"
          data-collapsed={!isRightPanelOpen}
          className={cn(
            'h-full shrink-0 border-s border-border bg-sidebar z-(--z-panel) overflow-hidden fluent-panel-motion',
            isRightPanelOpen
              ? 'w-[288px] min-w-[288px] max-w-[288px]'
              : 'w-0 min-w-0 max-w-0 pointer-events-none',
          )}
        >
          <div dir="rtl" className="h-full w-[288px] flex flex-col overflow-hidden">
            {propertiesContent}
          </div>
        </aside>
      )}

      {/* 5. ورقة اللوحات للجوال والشاشات المدمجة (< 1024px) */}
      <MobilePanelsSheet
        open={isMobileSheetOpen}
        onOpenChange={setIsMobileSheetOpen}
        activeTab={mobileActiveTab}
        onActiveTabChange={setMobileActiveTab}
        templatesContent={templatesContent}
        propertiesContent={propertiesContent}
      />
    </main>
  );
});
