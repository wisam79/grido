import React from 'react';
import { 
  Stack, 
  FrameCorners, 
  GridFour, 
  Faders, 
  ArrowsOutSimple, 
  ArrowsInSimple,
  Stamp,
  Shapes,
  TextT,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { WorkspacePanel, FreeformTab } from '@/hooks/use-workspace-panels';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';

interface WorkspacePanelRailProps {
  activePanel: WorkspacePanel;
  activeStudioTab?: FreeformTab;
  isTemplatesDrawerOpen?: boolean;
  isZenMode: boolean;
  onTogglePanel: (panel: 'templates' | 'properties') => void;
  onSelectStudioTab?: (tab: FreeformTab) => void;
  onToggleZenMode: () => void;
  className?: string;
}

export const WorkspacePanelRail = React.memo(function WorkspacePanelRail({
  activePanel,
  activeStudioTab = 'layers',
  isTemplatesDrawerOpen,
  isZenMode,
  onTogglePanel,
  onSelectStudioTab,
  onToggleZenMode,
  className,
}: WorkspacePanelRailProps) {
  const { mode, elementsCount } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      elementsCount: state.elements.length,
    }))
  );

  const isTemplatesActive = activePanel === 'templates' || isTemplatesDrawerOpen;
  const isPropertiesActive = activePanel === 'properties';

  return (
    <aside
      data-testid="workspace-panel-rail"
      aria-label="شريط الأدوات والألواح السريع"
      className={cn(
        'w-12 shrink-0 h-full flex flex-col items-center justify-between py-2.5 border-r border-border bg-sidebar/95 backdrop-blur-xl z-20 select-none font-cairo',
        className
      )}
    >
      {/* 1. أدوات استوديو التصميم / الكولاج */}
      <div className="flex flex-col items-center gap-1.5">
        {mode === 'collage' ? (
          /* وضع الكولاج: أداة القوالب والشبكات */
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onTogglePanel('templates')}
                aria-label="قوالب الكولاج والشبكة"
                className={cn(
                  'h-8 w-8 rounded-md transition-all cursor-pointer relative',
                  isTemplatesActive
                    ? 'bg-primary/15 text-primary hover:bg-primary/20 shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                )}
              >
                <GridFour className="w-4.5 h-4.5" weight={isTemplatesActive ? 'fill' : 'regular'} />
                {isTemplatesActive && (
                  <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary rounded-full" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-cairo text-xs font-semibold">
              قوالب الكولاج والشبكة (Alt+1)
            </TooltipContent>
          </Tooltip>
        ) : (
          /* وضع التعديل الحر: استخراج التبويبات الثلاثة مباشرة للشريط */
          <>
            {/* 1. أداة الطبقات */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onSelectStudioTab
                      ? onSelectStudioTab('layers')
                      : onTogglePanel('templates')
                  }
                  aria-label="الطبقات"
                  className={cn(
                    'h-8 w-8 rounded-md transition-all cursor-pointer relative',
                    isTemplatesActive && activeStudioTab === 'layers'
                      ? 'bg-primary/15 text-primary hover:bg-primary/20 shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <Stack
                    className="w-4.5 h-4.5"
                    weight={isTemplatesActive && activeStudioTab === 'layers' ? 'fill' : 'regular'}
                  />
                  {elementsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-mono font-bold flex items-center justify-center leading-none pointer-events-none">
                      {elementsCount > 99 ? '99+' : elementsCount}
                    </span>
                  )}
                  {isTemplatesActive && activeStudioTab === 'layers' && (
                    <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary rounded-full" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-cairo text-xs font-semibold">
                الطبقات ({elementsCount}) (Alt+1)
              </TooltipContent>
            </Tooltip>

            {/* 2. أداة الملصقات والشارات */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onSelectStudioTab
                      ? onSelectStudioTab('stickers')
                      : onTogglePanel('templates')
                  }
                  aria-label="الملصقات والشارات"
                  className={cn(
                    'h-8 w-8 rounded-md transition-all cursor-pointer relative',
                    isTemplatesActive && activeStudioTab === 'stickers'
                      ? 'bg-primary/15 text-primary hover:bg-primary/20 shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <Stamp
                    className="w-4.5 h-4.5"
                    weight={isTemplatesActive && activeStudioTab === 'stickers' ? 'fill' : 'regular'}
                  />
                  {isTemplatesActive && activeStudioTab === 'stickers' && (
                    <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary rounded-full" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-cairo text-xs font-semibold">
                الملصقات والشارات (Alt+2)
              </TooltipContent>
            </Tooltip>

            {/* 3. أداة الأشكال والتصاميم */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onSelectStudioTab
                      ? onSelectStudioTab('shapes')
                      : onTogglePanel('templates')
                  }
                  aria-label="الأشكال والتصاميم"
                  className={cn(
                    'h-8 w-8 rounded-md transition-all cursor-pointer relative',
                    isTemplatesActive && activeStudioTab === 'shapes'
                      ? 'bg-primary/15 text-primary hover:bg-primary/20 shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <Shapes
                    className="w-4.5 h-4.5"
                    weight={isTemplatesActive && activeStudioTab === 'shapes' ? 'fill' : 'regular'}
                  />
                  {isTemplatesActive && activeStudioTab === 'shapes' && (
                    <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary rounded-full" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-cairo text-xs font-semibold">
                الأشكال والتصاميم (Alt+3)
              </TooltipContent>
            </Tooltip>

            {/* 4. أداة النصوص الجاهزة */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onSelectStudioTab
                      ? onSelectStudioTab('text')
                      : onTogglePanel('templates')
                  }
                  aria-label="النصوص الجاهزة"
                  className={cn(
                    'h-8 w-8 rounded-md transition-all cursor-pointer relative',
                    isTemplatesActive && activeStudioTab === 'text'
                      ? 'bg-primary/15 text-primary hover:bg-primary/20 shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <TextT
                    className="w-4.5 h-4.5"
                    weight={isTemplatesActive && activeStudioTab === 'text' ? 'fill' : 'regular'}
                  />
                  {isTemplatesActive && activeStudioTab === 'text' && (
                    <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary rounded-full" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-cairo text-xs font-semibold">
                النصوص الجاهزة (Alt+4)
              </TooltipContent>
            </Tooltip>

            {/* 5. أداة المقاسات والورق */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onSelectStudioTab
                      ? onSelectStudioTab('presets')
                      : onTogglePanel('templates')
                  }
                  aria-label="المقاسات والورق"
                  className={cn(
                    'h-8 w-8 rounded-md transition-all cursor-pointer relative',
                    isTemplatesActive && activeStudioTab === 'presets'
                      ? 'bg-primary/15 text-primary hover:bg-primary/20 shadow-2xs font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <FrameCorners
                    className="w-4.5 h-4.5"
                    weight={isTemplatesActive && activeStudioTab === 'presets' ? 'fill' : 'regular'}
                  />
                  {isTemplatesActive && activeStudioTab === 'presets' && (
                    <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary rounded-full" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-cairo text-xs font-semibold">
                المقاسات والورق (Alt+5)
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {/* فاصل ناعم بين أدوات الاستوديو وأدوات التعديل */}
        <div className="w-5 h-px bg-border/60 my-0.5" />

        {/* أداة الخصائص والمفتش */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onTogglePanel('properties')}
              aria-label="لوحة الخصائص"
              className={cn(
                'h-8 w-8 rounded-md transition-all cursor-pointer relative',
                isPropertiesActive
                  ? 'bg-primary/15 text-primary hover:bg-primary/20 shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              <Faders className="w-4.5 h-4.5" weight={isPropertiesActive ? 'fill' : 'regular'} />
              {isPropertiesActive && (
                <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary rounded-full" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-cairo text-xs font-semibold">
            لوحة الخصائص (Ctrl+Shift+B)
          </TooltipContent>
        </Tooltip>
      </div>

      {/* 2. زر وضع التركيز (Zen Mode) في الأسفل */}
      <div className="flex flex-col items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleZenMode}
              aria-label={isZenMode ? 'استعادة الألواح' : 'وضع التركيز الكامل'}
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all cursor-pointer"
            >
              {isZenMode ? (
                <ArrowsInSimple className="w-4.5 h-4.5" />
              ) : (
                <ArrowsOutSimple className="w-4.5 h-4.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-cairo text-xs font-semibold">
            {isZenMode ? 'استعادة الألواح' : 'وضع التركيز (Ctrl+.)'}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
});
