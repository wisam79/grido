import React, { useCallback, useId, useMemo } from 'react';
import { Eye, EyeSlash, Faders } from '@/components/ui/icons';
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
import type {
  CollageTab,
  CommandGroupView,
  FreeformTab,
  WorkspaceCommand,
  WorkspaceTool,
} from '@/lib/workspace-tools';
import {
  WORKSPACE_COMMANDS,
  dispatchWorkspaceCommand,
  getStateCommandGroups,
  getToolsForWorkflow,
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
  /** حالة اللوحة مرفوعة لـ useWorkspacePanels (مشتركة مع زر الجوال) */
  isLauncherOpen: boolean;
  onLauncherOpenChange: (open: boolean) => void;
}

/**
 * محتوى لوحة الأوامر الوحيد (Single Palette) — يُعرض داخل Popover الشريط
 * (سطح المكتب) أو Popover زر الجوال (compact) بنفس الحالة والحدث.
 * يُمنع إنشاء لوحة ثانية: أي trigger جديد يستخدم هذا المكوّن حصراً.
 */
export function ToolLauncherContent({
  tools,
  activeTab,
  toolsHeading,
  getShortcut,
  onSelectTool,
  onAfterRun,
  onRunCommand,
  commandGroups,
}: {
  tools: WorkspaceTool<string>[];
  activeTab: string;
  toolsHeading: string;
  getShortcut: (tool: WorkspaceTool<string>) => string;
  onSelectTool: (tool: WorkspaceTool<string>) => void;
  onAfterRun: () => void;
  onRunCommand: (command: WorkspaceCommand) => void;
  commandGroups: CommandGroupView<WorkspaceCommand>[];
}) {
  return (
    <Command data-testid="command-palette" loop>
      <CommandInput placeholder="ابحث عن أداة أو أمر ..." aria-label="البحث في لوحة الأوامر" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>لا توجد نتائج مطابقة</CommandEmpty>

        {/* الأدوات — نفس قائمة الشريط (وتتقلّص في مسار الإنتاج السريع) */}
        <CommandGroup heading={toolsHeading}>
          {tools.map((tool) => (
            <PaletteToolItem
              key={tool.id}
              tool={tool}
              shortcut={getShortcut(tool)}
              isActive={activeTab === tool.id}
              onSelectTool={onSelectTool}
            />
          ))}
        </CommandGroup>

        {/* أوامر الحالة الحية — تراجع/إعادة تتعطل تلقائياً، والعرض يظهر الحالة الحالية */}
        <PaletteStateCommands onAfterRun={onAfterRun} />

        {/* الأوامر العالمية — نفس أحداث grido:* ونفس اختصارات use-keyboard-shortcuts،
            ومجمّعة بعناوين مجموعاتها المخزّنة في السجل */}
        {commandGroups.map((group) => (
          <React.Fragment key={group.name}>
            <CommandSeparator />
            <CommandGroup heading={group.name}>
              {group.items.map((command) => (
                <PaletteGlobalCommandItem
                  key={command.id}
                  command={command}
                  onRunCommand={onRunCommand}
                />
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </Command>
  );
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

/** زر أداة في الشريط — يُبنى من سجل الأدوات بدل تكرار العلامات لكل أداة.
    مذكّرة (memo): خاصيات الأب مستقرّة (سجل ثابت + useCallback) فلا يعيد
    التصيير مع كل تغيّر زوم/سجل ما لم تتبدّل حالته هو. */
const RailToolButton = React.memo(function RailToolButton({
  tool,
  index,
  isActive,
  badgeCount,
  isInUse,
  pillLayoutId,
  onSelectTool,
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
  onSelectTool: (tool: WorkspaceTool<string>) => void;
}) {
  const shortcut = toolShortcut(index);
  const showBadge = badgeCount !== undefined && badgeCount > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSelectTool(tool)}
          data-testid={tool.testId}
          aria-label={tool.label}
          aria-pressed={isActive}
          className={cn(
            'group h-9 w-9 rounded-lg transition-colors duration-150 cursor-pointer relative',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
            isActive
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
          )}
        >
          {/* حبة النشط — محايدة مثل ويندوز 11: بطاقة فاتحة بحد رقيق بلا أي لون،
              فالأزرق محجوز للأوامر التعبوية لا لحالة التبويب */}
          {isActive && (
            <motion.span
              layoutId={pillLayoutId}
              className="absolute inset-0 bg-accent-active rounded-lg border border-border/80 shadow-2xs"
              transition={{ duration: 0.12, ease: 'easeOut' }}
            />
          )}

          {/* الأيقونة فوق الإطار بلا z-index سالب — يرتفع فوق الشرائح بقيمته الصريحة.
              المقاس 20px (size-5) شبكة Fluent الأصلية، فلا تُصغَّر الأيقونة بلا داعٍ. */}
          <tool.icon className="size-5 relative z-10" weight={isActive ? 'duotone' : 'regular'} />

          {showBadge && (
            <span
              className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-2xs font-bold tabular-nums flex items-center justify-center leading-none pointer-events-none ring-2 ring-sidebar z-20"
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
});

/**
 * صف أمر حالة واحد — مذكّر حتى لا يعيد التصيير مع كل تصيير للأب
 * (اللقطة تُبنى من جديد فقط عند تغيّر stateInput فعلياً عبر useShallow).
 */
const PaletteStateItem = React.memo(function PaletteStateItem({
  commandId,
  title,
  subtitle,
  shortcut,
  disabled,
  value,
  onRun,
  onAfterRun,
}: {
  commandId: string;
  title: string;
  subtitle: string;
  shortcut?: string;
  disabled?: boolean;
  value: string;
  onRun: () => void;
  onAfterRun: () => void;
}) {
  const handleSelect = useCallback(() => {
    onRun();
    onAfterRun();
  }, [onRun, onAfterRun]);
  return (
    <CommandItem
      value={value}
      disabled={disabled}
      onSelect={handleSelect}
      data-testid={`command-${commandId}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold truncate">{title}</span>
        <span className="block text-mini text-muted-foreground truncate">{subtitle}</span>
      </span>
      {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
    </CommandItem>
  );
});

/**
 * أوامر الحالة الحية — مكوّن منفصل يشترك في قيم الحالة التي تظهر في
 * اللقطات (تراجع/إعادة/زوم/مساطر/شبكة)، فتُبنى النصوص من جديد مع كل
 * تغيّر حقيقي، وبلا إعادة تصيير للشريط مع كل تغيير زوم واللوحة مغلقة
 * (المكوّن لا يُركَّب إلا واللوحة مفتوحة).
 */
const PaletteStateCommands = React.memo(function PaletteStateCommands({
  onAfterRun,
}: {
  onAfterRun: () => void;
}) {
  const stateInput = useEditorStore(useShallow(selectStateCommandInput));
  const groups = useMemo(() => getStateCommandGroups(stateInput), [stateInput]);

  return (
    <>
      {groups.map((group) => (
        <React.Fragment key={group.name}>
          <CommandSeparator />
          <CommandGroup heading={group.name}>
            {group.items.map(({ command, snapshot }) => (
              <PaletteStateItem
                key={command.id}
                commandId={command.id}
                title={command.title}
                subtitle={snapshot.subtitle}
                shortcut={command.shortcut}
                disabled={snapshot.disabled}
                value={`${command.title} ${snapshot.subtitle} ${command.shortcut ?? ''}`}
                onRun={snapshot.run}
                onAfterRun={onAfterRun}
              />
            ))}
          </CommandGroup>
        </React.Fragment>
      ))}
    </>
  );
});

/** صف أداة في اللوحة — مذكّر؛ التحديد عبر useCallback مستقر من الأب. */
const PaletteToolItem = React.memo(function PaletteToolItem({
  tool,
  shortcut,
  isActive,
  onSelectTool,
}: {
  tool: WorkspaceTool<string>;
  shortcut: string;
  isActive: boolean;
  onSelectTool: (tool: WorkspaceTool<string>) => void;
}) {
  const handleSelect = useCallback(() => onSelectTool(tool), [onSelectTool, tool]);
  const ToolIcon = tool.icon;
  return (
    <CommandItem
      value={`${tool.title} ${tool.subtitle} ${tool.label} ${shortcut}`}
      onSelect={handleSelect}
      data-testid={`launcher-${tool.id}`}
    >
      <span
        className={cn(
          'w-7 h-7 shrink-0 rounded-lg flex items-center justify-center',
          isActive ? 'bg-accent-active text-foreground' : 'bg-muted/70 text-muted-foreground',
        )}
      >
        <ToolIcon className="w-4 h-4" weight="duotone" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold truncate">{tool.title}</span>
        <span className="block text-mini text-muted-foreground truncate">{tool.subtitle}</span>
      </span>
      {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
    </CommandItem>
  );
});

/** صف أمر عام في اللوحة — مذكّر؛ التنفيذ عبر useCallback مستقر من الأب. */
const PaletteGlobalCommandItem = React.memo(function PaletteGlobalCommandItem({
  command,
  onRunCommand,
}: {
  command: WorkspaceCommand;
  onRunCommand: (command: WorkspaceCommand) => void;
}) {
  const handleSelect = useCallback(() => onRunCommand(command), [onRunCommand, command]);
  return (
    <CommandItem
      value={`${command.title} ${command.subtitle} ${command.shortcut ?? ''}`}
      onSelect={handleSelect}
      data-testid={`command-${command.id}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold truncate">{command.title}</span>
        <span className="block text-mini text-muted-foreground truncate">{command.subtitle}</span>
      </span>
      {command.shortcut && <CommandShortcut>{command.shortcut}</CommandShortcut>}
    </CommandItem>
  );
});

export const WorkspacePanelRail = React.memo(function WorkspacePanelRail({
  activeStudioTab = 'layers',
  activeCollageTab = 'custom',
  isZenMode,
  onSelectStudioTab,
  onSelectCollageTab,
  onToggleZenMode,
  className,
  isLauncherOpen,
  onLauncherOpenChange,
}: WorkspacePanelRailProps) {
  const { mode, workflow, elementsCount, collageTemplate } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      workflow: state.workflow,
      elementsCount: state.elements.length,
      collageTemplate: state.collageTemplate,
    })),
  );

  // معرّف الإطار المتحرك فريد لكل نسخة شريط — فنسختان (إن ظهرتا) لا تتنافسان على نفس layoutId
  const pillLayoutId = `rail-active-pill-${useId()}`;
  // حالة اللوحة ومستمع Ctrl+K مرفوعان لـ useWorkspacePanels (يعيش في App
  // دائماً) — بقاؤهما هنا كان يُميت Ctrl+K في compact حيث الشريط غائب.

  // قائمة الأدوات تتبع وضع الكانفاس (`mode`) ومسار العمل (`workflow`) معاً —
  // مسار الإنتاج السريع يخفي تبويب العناصر (شريحة workflow-slice)
  const isCollage = mode === 'collage';
  const tools = useMemo(() => getToolsForWorkflow(mode, workflow), [mode, workflow]);

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
    [tools],
  );
  const toolIndex = (tool: WorkspaceTool<string>) => toolIndexById.get(tool.id) ?? 0;

  const isToolInUse = (tool: WorkspaceTool<string>) =>
    tool.badge === 'collage-grid'
      ? isCustomGridInUse
      : tool.badge === 'collage-freeform'
        ? isFreeformInUse
        : undefined;

  // مذكّرات مستقرّة — تُمرَّر لصفوف memo فلا يعاد بناؤها مع كل تصيير للأب
  const closeLauncher = useCallback(() => onLauncherOpenChange(false), [onLauncherOpenChange]);
  const runGlobalCommand = useCallback(
    (command: WorkspaceCommand) => {
      dispatchWorkspaceCommand(command);
      onLauncherOpenChange(false);
    },
    [onLauncherOpenChange],
  );

  const selectTool = useCallback(
    (tool: WorkspaceTool<string>) => {
      if (isCollage) {
        if (isCollageTab(tool.id)) onSelectCollageTab?.(tool.id);
      } else if (isStudioTab(tool.id)) {
        onSelectStudioTab?.(tool.id);
      }
      onLauncherOpenChange(false);
    },
    [isCollage, onSelectCollageTab, onSelectStudioTab, onLauncherOpenChange],
  );
  // 🛡️ يقرأ الخريطة مباشرة من التبعية — تمرير toolIndex (غير مذكّرة) كان
  // سيغلق على خريطة قديمة بعد تغيّر مسار العمل.
  const getShortcut = useCallback(
    (tool: WorkspaceTool<string>) => toolShortcut(toolIndexById.get(tool.id) ?? 0),
    [toolIndexById],
  );

  return (
    <aside
      data-testid="workspace-panel-rail"
      aria-label="شريط الأدوات والألواح"
      className={cn(
        // عقد الاتجاه: Rail ثابت يساراً فيزيائياً (جزيرة ltr في main بـ dir=ltr) —
        // border-e منطقي = يميناً داخل LTR فيحافظ على الفاصل الحالي ويتبع أي
        // تغيير مستقبلي للاتجاه. side="right" للـ Tooltip/Popover فيزيائي عمداً
        // لنفس السبب (يفتح نحو الكانفس).
        'w-12 shrink-0 h-full flex flex-col items-center justify-between py-2 border-e border-border/80 bg-sidebar/95 backdrop-blur-xl z-20 select-none font-cairo shadow-2xs fluent-specular overflow-hidden relative',
        className,
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
                onSelectTool={selectTool}
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

        <Popover open={isLauncherOpen} onOpenChange={onLauncherOpenChange}>
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
                      ? 'text-foreground bg-accent-active border border-border/80'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
                  )}
                >
                  {/* لوحة التحكم الكاملة (أدوات + أوامر) — شرائح تحكم بدل مربعات منقّشة
                      كي لا تتكرر أيقونة «قوالب الكولاج» في نفس الشريط */}
                  <Faders className="size-5" weight={isLauncherOpen ? 'duotone' : 'regular'} />
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
            <ToolLauncherContent
              tools={tools}
              activeTab={activeTab}
              toolsHeading={toolsHeading}
              getShortcut={getShortcut}
              onSelectTool={selectTool}
              onAfterRun={closeLauncher}
              onRunCommand={runGlobalCommand}
              commandGroups={commandGroups}
            />
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
                  ? 'text-foreground bg-accent-active border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
              )}
            >
              {/* زر «وضع التركيز» الحصري: عين مفتوحة/مغلقة لإخفاء أو استعادة الألواح الجانبية (Ctrl+.) */}
              {isZenMode ? (
                <EyeSlash className="size-5" weight="fill" />
              ) : (
                <Eye className="size-5" weight="regular" />
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

/* ═══════════════════════════════════════════════════════════════
   زر لوحة الأوامر للشاشات المدمجة (compact): نفس اللوحة الوحيدة
   (ToolLauncherContent) ونفس الحالة المرفوعة — مشغّل ثانٍ، لا لوحة ثانية.
   ═══════════════════════════════════════════════════════════════ */

interface CompactToolLauncherProps {
  activeStudioTab?: FreeformTab;
  activeCollageTab?: CollageTab;
  onSelectStudioTab?: (tab: FreeformTab) => void;
  onSelectCollageTab?: (tab: CollageTab) => void;
  isLauncherOpen: boolean;
  onLauncherOpenChange: (open: boolean) => void;
}

export function CompactToolLauncher({
  activeStudioTab = 'layers',
  activeCollageTab = 'custom',
  onSelectStudioTab,
  onSelectCollageTab,
  isLauncherOpen,
  onLauncherOpenChange,
}: CompactToolLauncherProps) {
  const { mode, workflow } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      workflow: state.workflow,
    })),
  );

  const isCollage = mode === 'collage';
  const tools = useMemo(() => getToolsForWorkflow(mode, workflow), [mode, workflow]);
  const activeTab = isCollage ? activeCollageTab : activeStudioTab;
  const toolsHeading = isCollage ? 'أدوات الكولاج' : 'أدوات التعديل الحر';
  const commandGroups = useMemo(() => groupCommands(WORKSPACE_COMMANDS), []);
  const toolIndexById = useMemo(
    () => new Map<string, number>(tools.map((tool, index): [string, number] => [tool.id, index])),
    [tools],
  );
  const getShortcut = useCallback(
    (tool: WorkspaceTool<string>) => toolShortcut(toolIndexById.get(tool.id) ?? 0),
    [toolIndexById],
  );
  const closeLauncher = useCallback(() => onLauncherOpenChange(false), [onLauncherOpenChange]);
  const runGlobalCommand = useCallback(
    (command: WorkspaceCommand) => {
      dispatchWorkspaceCommand(command);
      onLauncherOpenChange(false);
    },
    [onLauncherOpenChange],
  );
  const selectTool = useCallback(
    (tool: WorkspaceTool<string>) => {
      if (isCollage) {
        if (isCollageTab(tool.id)) onSelectCollageTab?.(tool.id);
      } else if (isStudioTab(tool.id)) {
        onSelectStudioTab?.(tool.id);
      }
      onLauncherOpenChange(false);
    },
    [isCollage, onSelectCollageTab, onSelectStudioTab, onLauncherOpenChange],
  );

  return (
    <Popover open={isLauncherOpen} onOpenChange={onLauncherOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="default"
              size="icon"
              data-testid="compact-tool-launcher"
              aria-label="كل الأدوات"
              className={cn(
                'h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-fluent-16 cursor-pointer',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
                'active:scale-95 transition-transform duration-100',
              )}
            >
              <Faders className="size-5" weight={isLauncherOpen ? 'duotone' : 'regular'} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="font-cairo text-xs font-semibold py-1 px-2.5 flex items-center gap-2"
        >
          <span>كل الأدوات</span>
          <kbd className="px-1 py-0.5 text-micro font-mono bg-muted/80 rounded border border-border">
            Ctrl+K
          </kbd>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={10}
        dir="rtl"
        className="w-[calc(100vw-2rem)] max-w-[380px] p-0 rounded-2xl border fluent-specular font-cairo overflow-hidden"
      >
        <ToolLauncherContent
          tools={tools}
          activeTab={activeTab}
          toolsHeading={toolsHeading}
          getShortcut={getShortcut}
          onSelectTool={selectTool}
          onAfterRun={closeLauncher}
          onRunCommand={runGlobalCommand}
          commandGroups={commandGroups}
        />
      </PopoverContent>
    </Popover>
  );
}
