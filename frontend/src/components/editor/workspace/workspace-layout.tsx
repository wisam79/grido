import React from 'react';
import { cn } from '@/lib/utils';
import { WorkspacePanelRail } from './workspace-panel-rail';
import { MobilePanelsSheet } from './mobile-panels-sheet';
import { CanvasOverlayHost } from '@/components/editor/canvas/canvas-overlay-host';
import { useWorkspacePanels } from '@/hooks/use-workspace-panels';

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
    activePanel,
    isTemplatesDrawerOpen,
    isMobileSheetOpen,
    mobileActiveTab,
    isZenMode,
    toggleZenMode,
    setIsMobileSheetOpen,
    setMobileActiveTab,
    closeActivePanel,
    setIsTemplatesDrawerOpen,
  } = panelsHook;

  const isCompact = breakpoint === 'compact';
  const isStandard = breakpoint === 'standard';
  const isWide = breakpoint === 'wide';

  // In Standard mode: right container hosts either templates or properties
  const isRightPanelOpen = !isCompact && (
    isStandard ? activePanel !== null : (activePanel === 'properties' || panelsHook.isInspectorPinned)
  );

  // In Wide mode: templates acts as a left-side drawer
  const isLeftDrawerOpen = isWide && isTemplatesDrawerOpen;

  return (
    <main
      data-testid="workspace-layout"
      dir="ltr"
      className="flex-1 flex h-full w-full overflow-hidden relative select-none"
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
        />
      )}

      {/* 2. درج القوالب الأيسر في الشاشات العريضة (Wide Drawer - 296px) */}
      {isWide && (
        <aside
          aria-label="لوحة القوالب"
          data-testid="workspace-panel-templates"
          data-collapsed={!isLeftDrawerOpen}
          className={cn(
            'h-full border-r border-border bg-sidebar/95 backdrop-blur-xl z-20 overflow-hidden fluent-panel-motion transition-all duration-200',
            isLeftDrawerOpen
              ? 'w-[296px] min-w-[296px] max-w-[296px] opacity-100 shadow-fluent-8'
              : 'w-0 min-w-0 max-w-0 opacity-0 pointer-events-none border-r-0 shadow-none'
          )}
        >
          <div dir="rtl" className="h-full w-[296px] flex flex-col overflow-hidden">
            {templatesContent}
          </div>
        </aside>
      )}

      {/* 3. منطقة الكانفس الرئيسية (الوسط - مضمونة بأقصى مساحة ممكنة) */}
      <section
        data-testid="workspace-canvas-shell"
        className="flex-1 flex flex-col min-w-0 bg-background relative z-10 overflow-hidden h-full"
      >
        {/* حاوية العناصر العائمة داخل الكانفاس: `overflow-hidden` هنا هو ما يمنع
            شريط التحديد السريع من الطفو على الشريط الجانبي/الأدوات */}
        <div className="flex-1 relative h-full w-full overflow-hidden">
          <CanvasOverlayHost>
            {canvasContent}
            {floatingFeedback}
          </CanvasOverlayHost>
        </div>

        {/* الشريط السفلي المثبت */}
        {footerContent && (
          <footer className="h-10 shrink-0 border-t border-border bg-sidebar px-3 flex items-center justify-center relative z-20 no-print select-none">
            {footerContent}
          </footer>
        )}
      </section>

      {/* 4. لوحة المفتش / اللوح النشط الأيمن (Right Inspector - 296px) */}
      {!isCompact && (
        <aside
          aria-label={isStandard && activePanel === 'templates' ? 'لوحة القوالب' : 'لوحة خصائص العنصر'}
          data-testid={
            isStandard && activePanel === 'templates'
              ? 'workspace-panel-templates'
              : 'workspace-panel-properties'
          }
          data-collapsed={!isRightPanelOpen}
          className={cn(
            'h-full border-l border-border bg-sidebar/95 backdrop-blur-xl z-20 overflow-hidden fluent-panel-motion transition-all duration-200',
            isRightPanelOpen
              ? 'w-[296px] min-w-[296px] max-w-[296px] opacity-100 shadow-fluent-8'
              : 'w-0 min-w-0 max-w-0 opacity-0 pointer-events-none border-l-0 shadow-none'
          )}
        >
          <div dir="rtl" className="h-full w-[296px] flex flex-col overflow-hidden">
            {isStandard ? (
              activePanel === 'templates' ? templatesContent : propertiesContent
            ) : (
              propertiesContent
            )}
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
