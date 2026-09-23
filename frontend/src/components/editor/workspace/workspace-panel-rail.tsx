import React, { useEffect, useId, useMemo, useState } from 'react';
import { ArrowsOutSimple, ArrowsInSimple, SquaresFour } from '@/components/ui/icons';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import type { CollageTab, FreeformTab, WorkspaceTool } from '@/lib/workspace-tools';
import {
  WORKSPACE_COMMANDS,
  dispatchWorkspaceCommand,
  getStateCommandGroups,
  getToolsForMode,
  groupCommands,
  groupTools,
  isCollageTab,
  isStudioTab,
  selectStateCommandInput,
  toolShortcut,
} from '@/lib/workspace-tools';
import { useEditorStore } from '@/lib/editor-store';
import { useShallow } from 'zustand/react/shallow';

interface WorkspacePanelRailProps {
  activeStudioTab?: FreeformTab;
  activeCollageTab?: CollageTab;
  isZenMode: boolean;
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
   قائمة الأدوات تأتي من getToolsForWorkflow — نفس المصدر المستخدم
   في اختصارات Alt+الرقم ولوحة القوالب، فلا تختلف القائمة عن الاختصار.
   ═══════════════════════════════════════════════════════════════ */

/** زر أداة في الشريط — يُبنى من سجل الأدوات بدل تكرار العلامات لكل أداة */
function RailToolButton({
  tool,
  index,
  isActive,
  badgeCount,
  isInUse,
  pillLayoutId,
  onSelect,
}: {
  tool: WorkspaceTool<string>;
  index: number;
  isActive: boolean;
  /** شارة رقمية (عدد الطبقات) */
  badgeCount?: number;
  /** نقطة نبض تعني «هذه الميزة مطبّقة على الكانفاس فعلاً» */
  isInUse?: boolean;
  /** معرّف مشترك بين أزرار الشريط نفسه لتحريك الإطار بينها بلا تسرّب لشريط آخر */
  pillLayoutId: string;
  onSelect: () => void;
}) {
  const shortcut = toolShortcut(index);
  const showBadge = badgeCount !== undefined && badgeCount > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSelect}
          data-testid={tool.testId}
          aria-label={tool.label}
          aria-pressed={isActive}
          className={cn(
            'group h-9 w-9 rounded-lg transition-colors duration-150 cursor-pointer relative',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
            isActive
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
          )}
        >
          {/* حبة النشط — Fluent 2 مسطحة: تعبئة زرقاء هادئة وحدود رقيقة بلا تدرج */}
          {            isActive && (
            <motion.span
              layoutId={pillLayoutId}
              className="absolute inset-0 bg-primary/10 dark:bg-primary/15 rounded-lg border border-primary/25"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}

          {/* الأيقونة فوق الإطار بلا z-index سالب — يرتفع فوق الشرائح بقيمته الصريحة */}
          <tool.icon className="size-[18px] relative z-10" weight={isActive ? 'duotone' : 'regular'} />

          {showBadge && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-2xs font-bold tabular-nums flex items-center justify-center leading-none pointer-events-none ring-2 ring-sidebar z-20"
              aria-hidden="true"
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}

          {/* نقطة «مطبَّق على الكانفاس» — أسفل يمين الزر */}
          {isInUse && (
            <span
              className="absolute bottom-1 end-1 w-1.5 h-1.5 rounded-full bg-success ring-2 ring-sidebar pointer-events-none z-20"
              aria-hidden="true"
            />
          )}

          {/* المؤشر الجانبي النشط — شريط رقيق ينتقل بسلاسة بين التبويبات */}
          {isActive && (
            <motion.span
              layoutId={`${pillLayoutId}-bar`}
              className="absolute -start-1.5 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-e-full z-10"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              aria-hidden="true"
            />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="font-cairo text-xs font-semibold py-1 px-2.5 flex items-center gap-2"
      >
        <span>{showBadge ? `${tool.label} (${badgeCount})` : tool.label}</span>
        {shortcut && (
          <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * أوامر الحالة الحية — مكوّن منفصل يشترك في قيم الحالة التي تظهر في
 * اللقطات (تراجع/إعادة/زوم/مساطر/شبكة)، فتُبنى النصوص من جديد مع كل
 * تغيّر حقيقي، وبلا إعادة تصيير للشريط مع كل تغيير زوم واللوحة مغلقة
 * (المكوّن لا يُركَّب إلا واللوحة مفتوحة).
 */
function PaletteStateCommands({ onAfterRun }: { onAfterRun: () => void }) {
  const stateInput = useEditorStore(useShallow(selectStateCommandInput));
  const groups = useMemo(() => getStateCommandGroups(stateInput), [stateInput]);

  return (
    <>
      {groups.map((group) => (
        <React.Fragment key={group.name}>
          <CommandSeparator />
          <CommandGroup heading={group.name}>
            {group.items.map(({ command, snapshot }) => (
              <CommandItem
                key={command.id}
                value={`${command.title} ${snapshot.subtitle} ${command.shortcut ?? ''}`}
                disabled={snapshot.disabled}
                onSelect={() => {
                  snapshot.run();
                  onAfterRun();
                }}
                data-testid={`command-${command.id}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold truncate">{command.title}</span>
                  <span className="block text-mini text-muted-foreground truncate">
                    {snapshot.subtitle}
                  </span>
                </span>
                {command.shortcut && <CommandShortcut>{command.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        </React.Fragment>
      ))}
    </>
  );
}

export const WorkspacePanelRail = React.memo(function WorkspacePanelRail({
  activeStudioTab = 'layers',
  activeCollageTab = 'custom',
  isZenMode,
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
  // معرّف الإطار المتحرك فريد لكل نسخة شريط — فنسختان (إن ظهرتا) لا تتنافسان على نفس layoutId
  const pillLayoutId = `rail-active-pill-${useId()}`;

  // Ctrl+K يفتح لوحة الأدوات — وصول من لوحة المفاتيح بلا لمس الشريط
  useEffect(() => {
    const openLauncher = () => setIsLauncherOpen(true);
    window.addEventListener('grido:open-tool-launcher', openLauncher);
    return () => window.removeEventListener('grido:open-tool-launcher', openLauncher);
  }, []);

  // قائمة الأدوات تتبع وضع الكانفاس (`mode`) مباشرة
  const isCollage = mode === 'collage';
  const tools = useMemo(() => getToolsForMode(mode), [mode]);


  const isCustomGridInUse = collageTemplate?.id === 'collage-custom';
  const isFreeformInUse =
    typeof collageTemplate?.id === 'string' && collageTemplate.id.startsWith('freeform-');

  const activeTab = isCollage ? activeCollageTab : activeStudioTab;
  const toolsHeading = isCollage ? 'أدوات الكولاج' : 'أدوات التعديل الحر';
  const groups = useMemo(() => groupTools(tools), [tools]);
  const commandGroups = useMemo(() => groupCommands(WORKSPACE_COMMANDS), []);
  // ترتيب الأداة في قائمتها الظاهرة — هو نفسه المستخدم في Alt+الرقم في الشريط واللوحة معاً
  const toolIndexById = useMemo(
    () => new Map<string, number>(tools.map((tool, index): [string, number] => [tool.id, index])),
    [tools]
  );
  const toolIndex = (tool: WorkspaceTool<string>) => toolIndexById.get(tool.id) ?? 0;

  const isToolInUse = (tool: WorkspaceTool<string>) =>
    tool.badge === 'collage-grid' ? isCustomGridInUse : tool.badge === 'collage-freeform' ? isFreeformInUse : undefined;

  const selectTool = (tool: WorkspaceTool<string>) => {
    if (isCollage) {
      if (isCollageTab(tool.id)) onSelectCollageTab?.(tool.id);
    } else if (isStudioTab(tool.id)) {
      onSelectStudioTab?.(tool.id);
    }
    setIsLauncherOpen(false);
  };

  return (
    <aside
      data-testid="workspace-panel-rail"
      aria-label="شريط الأدوات والألواح"
      className={cn(
        'w-12 shrink-0 h-full flex flex-col items-center justify-between py-2 border-r border-border/80 bg-sidebar/95 backdrop-blur-xl z-20 select-none font-cairo shadow-2xs fluent-specular overflow-hidden relative',
        className
      )}
    >
      {/* خط ضوئي رقيق على الحافة اليمنى — لمسة Fluent عميقة */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 end-0 w-px bg-gradient-to-b from-transparent via-border/60 to-transparent"
      />
      {/* أدوات الوضع الحالي (كولاج / تعديل حر) — مقسّمة إلى مجموعات بفواصل رقيقة.
          min-h-0 ضروري ليصبح التمرير فعلياً داخل flex column بدل أن يتجاوز
          المحتوى ارتفاع الشريط ويدفع الأزرار المثبّتة خارجه. */}
      <nav
        aria-label={toolsHeading}
        className="flex flex-col items-center gap-1.5 w-full px-1.5 py-1 flex-1 min-h-0 overflow-y-auto scrollbar-none"
      >
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group.name}>
            {groupIndex > 0 && (
              <div
                role="separator"
                aria-orientation="horizontal"
                className="w-7 h-px my-1.5 shrink-0 bg-gradient-to-l from-transparent via-border to-transparent"
              />
            )}
            {group.tools.map((tool) => (
              <RailToolButton
                key={tool.id}
                tool={tool}
                index={toolIndex(tool)}
                isActive={activeTab === tool.id}
                isInUse={isToolInUse(tool)}
                badgeCount={tool.badge === 'elements' ? elementsCount : undefined}
                pillLayoutId={pillLayoutId}
                onSelect={() => selectTool(tool)}
              />
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* أسفل الشريط: لوحة كل الأدوات + وضع التركيز (لا تمرّ هاتان أبداً) */}
      <div className="flex flex-col items-center gap-1.5 w-full px-1.5 shrink-0">
        <div
          role="separator"
          aria-orientation="horizontal"
          className="w-7 h-px my-1.5 bg-gradient-to-l from-transparent via-border to-transparent"
        />

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
                    'h-9 w-9 rounded-lg transition-colors duration-150 cursor-pointer',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                    isLauncherOpen
                      ? 'text-primary bg-primary/10 border border-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                  )}
                >
                  <SquaresFour
                    className="size-[18px]"
                    weight={isLauncherOpen ? 'duotone' : 'regular'}
                  />
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

                {/* الأدوات — نفس قائمة الشريط (وتتقلّص في مسار الإنتاج السريع) */}
                <CommandGroup heading={toolsHeading}>
                  {tools.map((tool, index) => {
                    const shortcut = toolShortcut(index);
                    return (
                      <CommandItem
                        key={tool.id}
                        value={`${tool.title} ${tool.subtitle} ${tool.label} ${shortcut}`}
                        onSelect={() => selectTool(tool)}
                        data-testid={`launcher-${tool.id}`}
                      >
                        <span
                          className={cn(
                            'w-7 h-7 shrink-0 rounded-lg flex items-center justify-center',
                            activeTab === tool.id
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
                        {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>

                {/* أوامر الحالة الحية — تراجع/إعادة تتعطل تلقائياً، والعرض يظهر الحالة الحالية */}
                <PaletteStateCommands onAfterRun={() => setIsLauncherOpen(false)} />

                {/* الأوامر العالمية — نفس أحداث grido:* ونفس اختصارات use-keyboard-shortcuts،
                    ومجمّعة بعناوين مجموعاتها المخزّنة في السجل */}
                {commandGroups.map((group) => (
                  <React.Fragment key={group.name}>
                    <CommandSeparator />
                    <CommandGroup heading={group.name}>
                      {group.items.map((command) => (
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
                  </React.Fragment>
                ))}
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
                'h-9 w-9 rounded-lg transition-colors duration-150 cursor-pointer',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                isZenMode
                  ? 'text-primary bg-primary/10 border border-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              )}
            >
              {isZenMode ? (
                <ArrowsInSimple className="size-[18px] text-primary" weight="duotone" />
              ) : (
                <ArrowsOutSimple className="size-[18px]" />
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
