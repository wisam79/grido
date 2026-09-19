import React, { useEffect, useState } from 'react';
import { ArrowsOutSimple, ArrowsInSimple, SquaresFour } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandSeparator,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { WorkspacePanel } from '@/hooks/use-workspace-panels';
import type { CollageTab, FreeformTab, WorkspaceTool } from '@/lib/workspace-tools';
import {
  COLLAGE_TOOLS,
  STUDIO_TOOLS,
  WORKSPACE_COMMANDS,
  WORKSPACE_STATE_COMMANDS,
  dispatchWorkspaceCommand,
  groupTools,
  toolShortcut,
} from '@/lib/workspace-tools';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';

interface WorkspacePanelRailProps {
  activePanel: WorkspacePanel;
  activeStudioTab?: FreeformTab;
  activeCollageTab?: CollageTab;
  isTemplatesDrawerOpen?: boolean;
  isZenMode: boolean;
  onTogglePanel: (panel: 'templates' | 'properties') => void;
  onSelectStudioTab?: (tab: FreeformTab) => void;
  onSelectCollageTab?: (tab: CollageTab) => void;
  onToggleZenMode: () => void;
  className?: string;
}

/* ═══════════════════════════════════════════════════════════════
   الشريط الجانبي — أزرار الأدوات في مجموعات منطقية + «لوحة الأدوات»
   المثبّتة في الأسفل.

   السبب: عدد الأدوات صار يصل إلى 9، فالشريط يحتاج تمريراً طولياً في
   النوافذ القصيرة، ويضيع المستخدم بين أيقونات بلا أسماء. اللوحة
   المثبّتة لا تمرّ أبداً وتعرض كل أداة باسمها ووصفها واختصارها.
   ═══════════════════════════════════════════════════════════════ */

/** زر أداة في الشريط — يُبنى من سجل الأدوات بدل تكرار العلامات لكل أداة */
function RailToolButton({
  tool,
  index,
  isActive,
  isPanelOpen,
  badgeCount,
  isInUse,
  onSelect,
}: {
  tool: WorkspaceTool<string>;
  index: number;
  isActive: boolean;
  isPanelOpen: boolean;
  /** شارة رقمية (عدد الطبقات) */
  badgeCount?: number;
  /** نقطة نبض تعني «هذه الميزة مطبّقة على الكانفاس فعلاً» */
  isInUse?: boolean;
  onSelect: () => void;
}) {
  const showActivePill = isPanelOpen && isActive;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSelect}
          data-testid={tool.testId}
          aria-label={tool.label}
          aria-current={showActivePill ? 'page' : undefined}
          className={cn(
            'h-8 w-8 rounded-md transition-colors duration-150 cursor-pointer relative',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
            showActivePill
              ? 'text-primary font-bold shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          {showActivePill && (
            <motion.span
              layoutId="rail-active-pill"
              className="absolute inset-0 bg-primary/15 dark:bg-primary/20 rounded-md border border-primary/25 -z-10 shadow-inner"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}

          <tool.icon className="w-5 h-5" weight={showActivePill ? 'fill' : 'regular'} />

          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-full bg-primary text-primary-foreground text-2xs font-mono font-bold flex items-center justify-center leading-none pointer-events-none shadow-xs">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}

          {isInUse && (
            <span
              className="absolute end-1 top-1 w-2 h-2 rounded-full bg-primary ring-2 ring-background animate-pulse pointer-events-none"
              aria-hidden="true"
            />
          )}

          {showActivePill && (
            <span
              className="absolute -start-1.5 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary rounded-e-full shadow-xs"
              aria-hidden="true"
            />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="font-cairo text-xs font-semibold py-1 px-2.5 flex items-center gap-2"
      >
        <span>{badgeCount !== undefined ? `${tool.label} (${badgeCount})` : tool.label}</span>
        <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">
          {toolShortcut(index)}
        </kbd>
      </TooltipContent>
    </Tooltip>
  );
}

export const WorkspacePanelRail = React.memo(function WorkspacePanelRail({
  activePanel,
  activeStudioTab = 'layers',
  activeCollageTab = 'custom',
  isTemplatesDrawerOpen,
  isZenMode,
  onTogglePanel,
  onSelectStudioTab,
  onSelectCollageTab,
  onToggleZenMode,
  className,
}: WorkspacePanelRailProps) {
  const { mode, elementsCount, collageTemplate } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      elementsCount: state.elements.length,
      collageTemplate: state.collageTemplate,
    }))
  );

  const [isLauncherOpen, setIsLauncherOpen] = useState(false);

  // Ctrl+K يفتح لوحة الأدوات — وصول من لوحة المفاتيح بلا لمس الشريط
  useEffect(() => {
    const openLauncher = () => setIsLauncherOpen(true);
    window.addEventListener('grido:open-tool-launcher', openLauncher);
    return () => window.removeEventListener('grido:open-tool-launcher', openLauncher);
  }, []);

  const isTemplatesActive = activePanel === 'templates' || Boolean(isTemplatesDrawerOpen);
  const isCustomGridInUse = collageTemplate?.id === 'collage-custom';
  const isFreeformInUse =
    typeof collageTemplate?.id === 'string' && collageTemplate.id.startsWith('freeform-');

  const isCollage = mode === 'collage';
  const activeTab = isCollage ? activeCollageTab : activeStudioTab;
  const groups = groupTools(isCollage ? COLLAGE_TOOLS : STUDIO_TOOLS);
  // ترتيب الأداة في سجلها الكامل — يُستخدم لحساب Alt+الرقم في الشريط واللوحة معاً
  const toolIndex = (tool: WorkspaceTool<string>) =>
    (isCollage ? COLLAGE_TOOLS : STUDIO_TOOLS).findIndex((item) => item.id === tool.id);

  const isToolInUse = (tool: WorkspaceTool<string>) =>
    tool.badge === 'collage-grid' ? isCustomGridInUse : tool.badge === 'collage-freeform' ? isFreeformInUse : undefined;

  const selectTool = (tool: WorkspaceTool<string>) => {
    if (isCollage) onSelectCollageTab?.(tool.id as CollageTab);
    else onSelectStudioTab?.(tool.id as FreeformTab);
    setIsLauncherOpen(false);
  };

  return (
    <aside
      data-testid="workspace-panel-rail"
      aria-label="شريط الأدوات والألواح"
      className={cn(
        'w-12 shrink-0 h-full flex flex-col items-center justify-between py-2 border-r border-border/80 bg-sidebar/95 backdrop-blur-xl z-20 select-none font-cairo shadow-2xs fluent-specular',
        className
      )}
    >
      {/* أدوات الوضع الحالي (كولاج / تعديل حر) — مقسّمة إلى مجموعات بفواصل رقيقة */}
      <nav
        aria-label={isCollage ? 'أدوات الكولاج' : 'أدوات التعديل الحر'}
        className="flex flex-col items-center gap-1 w-full px-1.5 overflow-y-auto scrollbar-none"
      >
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group.name}>
            {groupIndex > 0 && <Separator className="w-5 bg-border/60 my-0.5" />}
            {group.tools.map((tool, index) => (
              <RailToolButton
                key={tool.id}
                tool={tool}
                index={toolIndex(tool) >= 0 ? toolIndex(tool) : group.offset + index}
                isActive={activeTab === tool.id}
                isPanelOpen={isTemplatesActive}
                isInUse={isToolInUse(tool)}
                badgeCount={tool.badge === 'elements' ? elementsCount : undefined}
                onSelect={() => selectTool(tool)}
              />
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* أسفل الشريط: لوحة كل الأدوات + وضع التركيز (لا تمرّ هاتان أبداً) */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5">
        <Separator className="w-5 bg-border/60 my-0.5" />

        <Popover open={isLauncherOpen} onOpenChange={setIsLauncherOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="rail-tool-launcher"
                  aria-label="كل الأدوات"
                  className={cn(
                    'h-8 w-8 rounded-md transition-colors duration-150 cursor-pointer',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                    isLauncherOpen
                      ? 'text-primary bg-primary/15 font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <SquaresFour className="w-5 h-5" weight={isLauncherOpen ? 'fill' : 'regular'} />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="font-cairo text-xs font-semibold py-1 px-2.5 flex items-center gap-2"
            >
              <span>كل الأدوات</span>
              <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">
                Ctrl+K
              </kbd>
            </TooltipContent>
          </Tooltip>

          <PopoverContent
            side="right"
            align="end"
            sideOffset={10}
            dir="rtl"
            className="w-[380px] p-0 rounded-2xl border fluent-specular font-cairo overflow-hidden"
          >
            <Command
              data-testid="command-palette"
              loop
            >
              <CommandInput placeholder="ابحث عن أداة أو أمر ..." aria-label="البحث في لوحة الأوامر" />
              <CommandList className="max-h-[60vh]">
                <CommandEmpty>لا توجد نتائج مطابقة</CommandEmpty>

                {/* الأدوات — نفس بنية السجل الموحد ورقم Alt المتسق مع الشريط */}
                <CommandGroup heading={isCollage ? 'أدوات الكولاج' : 'أدوات التعديل الحر'}>
                  {(isCollage ? COLLAGE_TOOLS : STUDIO_TOOLS).map((tool, index) => (
                    <CommandItem
                      key={tool.id}
                      value={`${tool.title} ${tool.subtitle} ${tool.label} ${toolShortcut(index)}`}
                      onSelect={() => selectTool(tool)}
                      data-testid={`launcher-${tool.id}`}
                    >
                      <span
                        className={cn(
                          'w-7 h-7 shrink-0 rounded-lg flex items-center justify-center',
                          isTemplatesActive && activeTab === tool.id
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted/70 text-muted-foreground'
                        )}
                      >
                        <tool.icon className="w-4 h-4" weight="duotone" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold truncate">{tool.title}</span>
                        <span className="block text-mini text-muted-foreground truncate">
                          {tool.subtitle}
                        </span>
                      </span>
                      <CommandShortcut>{toolShortcut(index)}</CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>

                {/* أوامر الحالة الحية — تراجع/إعادة تتعطل تلقائياً، والعرض يظهر الحالة الحالية */}
                <CommandSeparator />
                <CommandGroup heading="تحرير وعرض">
                  {WORKSPACE_STATE_COMMANDS.map((command) => {
                    const { subtitle, disabled, run } = command.getSnapshot();
                    return (
                      <CommandItem
                        key={command.id}
                        value={`${command.title} ${subtitle} ${command.shortcut ?? ''}`}
                        disabled={disabled}
                        onSelect={() => {
                          run();
                          setIsLauncherOpen(false);
                        }}
                        data-testid={`command-${command.id}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold truncate">{command.title}</span>
                          <span className="block text-mini text-muted-foreground truncate">{subtitle}</span>
                        </span>
                        {command.shortcut && <CommandShortcut>{command.shortcut}</CommandShortcut>}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {/* الأوامر العالمية — نفس أحداث grido:* ونفس اختصارات use-keyboard-shortcuts */}
                <CommandSeparator />
                <CommandGroup heading="أوامر">
                  {WORKSPACE_COMMANDS.map((command) => (
                    <CommandItem
                      key={command.id}
                      value={`${command.title} ${command.subtitle} ${command.shortcut ?? ''}`}
                      onSelect={() => {
                        dispatchWorkspaceCommand(command);
                        setIsLauncherOpen(false);
                      }}
                      data-testid={`command-${command.id}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold truncate">{command.title}</span>
                        <span className="block text-mini text-muted-foreground truncate">
                          {command.subtitle}
                        </span>
                      </span>
                      {command.shortcut && <CommandShortcut>{command.shortcut}</CommandShortcut>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleZenMode}
              data-testid="rail-zen-mode"
              aria-label={isZenMode ? 'استعادة الألواح' : 'وضع التركيز'}
              className={cn(
                'h-8 w-8 rounded-md transition-colors duration-150 cursor-pointer',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                isZenMode
                  ? 'text-primary bg-primary/15 font-bold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              {isZenMode ? (
                <ArrowsInSimple className="w-5 h-5 text-primary" />
              ) : (
                <ArrowsOutSimple className="w-5 h-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="font-cairo text-xs font-semibold py-1 px-2.5 flex items-center gap-2"
          >
            <span>{isZenMode ? 'استعادة الألواح' : 'وضع التركيز'}</span>
            <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">
              Ctrl+.
            </kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
});
