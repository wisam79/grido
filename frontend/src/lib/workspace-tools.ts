import {
  Layer,
  Shapes,
  Stamp,
  TextT,
  GridFour,
  SquaresFour,
  DotsSixVertical,
  Scissors,
  Images,
  Columns,
} from '@/components/ui/icons';
import {
  actualSizeZoomStore,
  autoFitZoomStore,
  fitWidthZoomStore,
  fitZoomStore,
  resetZoomStore,
  zoomInStore,
  zoomOutStore,
} from '@/hooks/use-canvas-zoom';
import { CANVAS_FIT_LABELS, type CanvasFitMode } from '@/lib/canvas/fit';
import { canZoomIn, canZoomOut, isDefaultZoom } from '@/lib/canvas/zoom';
import { useEditorStore } from '@/lib/editor-store';

import type { Icon } from '@/components/ui/icons';
import type { WorkflowMode } from '@/lib/store/slices/workflow-slice';
import type { EditorMode } from '@/lib/store/types';

/* ═══════════════════════════════════════════════════════════════
   سجل أدوات الشريط الجانبي — مصدر حقيقة واحد للأوضاع الثلاثة:
   الشريط (rail)، تبويبات اللوحة، عنوان الترويسة ووصفها، والمجموعات.
   كانت هذه البيانات مكرّرة يدوياً في 3 ملفات (شريط + ترويسة + أنواع).
   ═══════════════════════════════════════════════════════════════ */

export type CollageTab = 'custom' | 'presets' | 'freeform' | 'paper' | 'autofill' | 'arrange';

export type FreeformTab = 'stickers' | 'shapes' | 'text' | 'layers';

/** وجهات الشريط الجانبي — كل وجهة سطح واحد يضم تبويبات مترابطة، لا زر لكل تبويب */
export type CollageSection = 'grid' | 'slots' | 'paper';
/** أدوات الإدراج الأربع أزرار مستقلة في الشريط كما طلب المالك */
export type StudioSection = 'stickers' | 'shapes' | 'text' | 'layers';

/** ترحيل تبويبات النسخ السابقة: الوجهة الموحّدة والمقاسات المحذوفة → الملصقات */
export function migrateLegacyStudioTab(value: unknown): FreeformTab | null {
  if (value === 'elements' || value === 'presets') return 'stickers';
  return null;
}

/** شارات الحالة الديناميكية على وجهة الشريط */
export type ToolBadge = 'elements';

/** تبويب داخل وجهة — يظهر في الشريط المصغّر أعلى اللوح */
export interface WorkspaceTool<T extends string> {
  id: T;
  /** اسم مختصر للتبويب والتلميح */
  label: string;
  /** العنوان الوصفي الكامل */
  title: string;
  /** وصف مختصر */
  subtitle: string;
  icon: Icon;
  testId: string;
  badge?: ToolBadge;
}

/** وجهة دائمة في الشريط الجانبي — سطح واحد وتبويباته الداخلية */
export interface WorkspaceSection<S extends string, T extends string> {
  id: S;
  /** اسم الوجهة المختصر (Alt+الرقم والتلميح) */
  label: string;
  /** عنوان ترويسة اللوح */
  title: string;
  /** وصف ترويسة اللوح */
  subtitle: string;
  icon: Icon;
  testId: string;
  /** التبويب الذي يُفتح عند اختيار الوجهة من الشريط */
  defaultTab: T;
  tabs: WorkspaceTool<T>[];
  badge?: ToolBadge;
  /** نقطة «مطبَّق على الكانفاس» على وجهة الكولاج */
  inUse?: 'collage-template';
}

export type WorkspaceModeSection =
  WorkspaceSection<CollageSection, CollageTab> | WorkspaceSection<StudioSection, FreeformTab>;

export const COLLAGE_TOOLS: WorkspaceTool<CollageTab>[] = [
  {
    id: 'custom',
    label: 'مخصص',
    title: 'شبكة مخصصة',
    subtitle: 'الصفوف والأعمدة والمقاسات',
    icon: GridFour,
    testId: 'tab-collage-custom',
  },
  {
    id: 'presets',
    label: 'قوالب',
    title: 'قوالب جاهزة',
    subtitle: 'تشكيلات جاهزة',
    icon: SquaresFour,
    testId: 'tab-collage-presets',
  },
  {
    id: 'freeform',
    label: 'حر',
    title: 'شبكة حرة بالملم',
    subtitle: 'شبكات مخصصة بالملم',
    // شبكة نُقَط حرّة = خانات مخصّصة بالملم بلا شبكة صُلبة مفروضة،
    // وهي تتعاكس بصريًا مع مربعات «شبكة الكولاج» الثابتة
    icon: DotsSixVertical,
    testId: 'tab-collage-freeform',
  },
  {
    id: 'paper',
    label: 'القص',
    title: 'الورق والقص',
    subtitle: 'نزيف وقص ونسخ',
    icon: Scissors,
    testId: 'tab-collage-paper',
  },
  {
    id: 'autofill',
    label: 'تعبئة',
    title: 'تعبئة الخانات',
    subtitle: 'توزيع الصور',
    icon: Images,
    testId: 'tab-collage-autofill',
  },
  {
    id: 'arrange',
    label: 'فرز',
    title: 'فرز وترتيب الخانات',
    subtitle: 'قلب وخلط وتوزيع',
    // أعمدة مرتبة = فرز وترتيب الخانات بدل سهمي التقاطع المشوّشين
    icon: Columns,
    testId: 'tab-collage-arrange',
  },
];

export const STUDIO_TOOLS: WorkspaceTool<FreeformTab>[] = [
  {
    id: 'stickers',
    label: 'الملصقات',
    title: 'الملصقات والأختام',
    subtitle: 'أختام وإطارات وعروض وتهاني',
    icon: Stamp,
    testId: 'tab-studio-stickers',
  },
  {
    id: 'shapes',
    label: 'الأشكال',
    title: 'الأشكال',
    subtitle: 'كتالوج الأشكال المتجهة',
    icon: Shapes,
    testId: 'tab-studio-shapes',
  },
  {
    id: 'text',
    label: 'النصوص',
    title: 'النصوص',
    subtitle: 'عناوين وأسطر وأنماط جاهزة',
    icon: TextT,
    testId: 'tab-studio-text',
  },
  {
    id: 'layers',
    label: 'الطبقات',
    title: 'الطبقات',
    subtitle: 'ترتيب عناصر الكانفاس',
    icon: Layer,
    testId: 'tab-studio-layers',
  },
];

/* ═══════════════════════════════════════════════════════════════
   وجهات الشريط الجانبي — الكولاج بثلاث وجهات والاستوديو بأربع:
   الطبقات، الملصقات، الأشكال، النصوص. كل أداة إدراج زر مستقل في
   الشريط الجانبي، فلا شريط تبويبات داخلي فوق اللوح. ترتيب الوجهات
   هو نفسه المستخدم في اختصارات Alt+1..4.
   ═══════════════════════════════════════════════════════════════ */

function pickTools<T extends string>(tools: WorkspaceTool<T>[], ids: T[]): WorkspaceTool<T>[] {
  const byId = new Map(tools.map((tool) => [tool.id, tool]));
  return ids.flatMap((id) => {
    const tool = byId.get(id);
    return tool ? [tool] : [];
  });
}

export const COLLAGE_SECTIONS: WorkspaceSection<CollageSection, CollageTab>[] = [
  {
    id: 'grid',
    label: 'الشبكة',
    title: 'شبكة الكولاج',
    subtitle: 'مخصصة أو قالب جاهز أو حرة',
    icon: GridFour,
    testId: 'rail-collage-grid',
    defaultTab: 'custom',
    tabs: pickTools(COLLAGE_TOOLS, ['custom', 'presets', 'freeform']),
    inUse: 'collage-template',
  },
  {
    id: 'slots',
    label: 'الخانات',
    title: 'تعبئة وفرز الخانات',
    subtitle: 'توزيع الصور وترتيبها',
    icon: Images,
    testId: 'rail-collage-slots',
    defaultTab: 'autofill',
    tabs: pickTools(COLLAGE_TOOLS, ['autofill', 'arrange']),
  },
  {
    id: 'paper',
    label: 'القص',
    title: 'الورق والقص',
    subtitle: 'نزيف وقص ونسخ',
    icon: Scissors,
    testId: 'rail-collage-paper',
    defaultTab: 'paper',
    tabs: pickTools(COLLAGE_TOOLS, ['paper']),
  },
];

export const STUDIO_SECTIONS: WorkspaceSection<StudioSection, FreeformTab>[] = [
  {
    id: 'layers',
    label: 'الطبقات',
    title: 'الطبقات',
    subtitle: 'ترتيب عناصر الكانفاس',
    icon: Layer,
    testId: 'rail-studio-layers',
    defaultTab: 'layers',
    tabs: pickTools(STUDIO_TOOLS, ['layers']),
    badge: 'elements',
  },
  {
    id: 'stickers',
    label: 'الملصقات',
    title: 'الملصقات',
    subtitle: 'أختام وإطارات وعروض وتهاني',
    icon: Stamp,
    testId: 'rail-studio-stickers',
    defaultTab: 'stickers',
    tabs: pickTools(STUDIO_TOOLS, ['stickers']),
  },
  {
    id: 'shapes',
    label: 'الأشكال',
    title: 'الأشكال',
    subtitle: 'كتالوج الأشكال المتجهة',
    icon: Shapes,
    testId: 'rail-studio-shapes',
    defaultTab: 'shapes',
    tabs: pickTools(STUDIO_TOOLS, ['shapes']),
  },
  {
    id: 'text',
    label: 'النصوص',
    title: 'النصوص',
    subtitle: 'عناوين وأسطر وأنماط جاهزة',
    icon: TextT,
    testId: 'rail-studio-text',
    defaultTab: 'text',
    tabs: pickTools(STUDIO_TOOLS, ['text']),
  },
];

/** اسم بديل للتوافقية مع أي استيرادات سابقة */
export type { WorkflowMode } from '@/lib/store/slices/workflow-slice';

/**
 * وجهات الاستوديو لا تتغيّر بمسار العمل: الأربع تبقى ظاهرة دائماً،
 * وإخفاء أي تبويب يقطع مدخل أداة إدراج كلياً. المسار السريع يغيّر
 * التبويب الافتراضي فقط عبر getDefaultStudioTab.
 */
export function getStudioSectionsForWorkflow(
  _workflow: WorkflowMode = 'studio',
): WorkspaceSection<StudioSection, FreeformTab>[] {
  return STUDIO_SECTIONS;
}

/** وجهات الوضع الحالي — مصدر الشريط ولوحة الأوامر واختصارات Alt+الرقم */
export function getSectionsForWorkflow(
  mode: EditorMode,
  workflow: WorkflowMode = 'studio',
): WorkspaceModeSection[] {
  return mode === 'collage' ? COLLAGE_SECTIONS : getStudioSectionsForWorkflow(workflow);
}

/** التبويب الافتراضي للاستوديو — «الملصقات» أولاً، والطبقات في المسار السريع */
export function getDefaultStudioTab(workflow: WorkflowMode = 'studio'): FreeformTab {
  return workflow === 'quick' ? 'layers' : 'stickers';
}

/** وجهة التبويب النشط — تُبقي زر الشريط مضاءً أياً كان التبويب الداخلي */
export function getCollageSectionForTab(
  tab: CollageTab,
): WorkspaceSection<CollageSection, CollageTab> {
  return (
    COLLAGE_SECTIONS.find((section) => section.tabs.some((item) => item.id === tab)) ??
    COLLAGE_SECTIONS[0]
  );
}

export function getStudioSectionForTab(
  tab: FreeformTab,
  workflow: WorkflowMode = 'studio',
): WorkspaceSection<StudioSection, FreeformTab> {
  const sections = getStudioSectionsForWorkflow(workflow);
  return sections.find((section) => section.tabs.some((item) => item.id === tab)) ?? sections[0];
}

/** الحد الأقصى لاختصارات Alt+1..Alt+9 — لا يوجد اختصار Alt+10 */
export const MAX_TOOL_SHORTCUTS = 9;

/** اختصار Alt+الرقم يتكوّن من ترتيب الوجهة في شريطها (بحد أقصى 9 وجهات) */
export function toolShortcut(index: number): string {
  if (index < 0 || index >= MAX_TOOL_SHORTCUTS) return '';
  return `Alt+${index + 1}`;
}

/** هل القيمة تبويب كولاج صالح؟ — تحمي التخزين المحلي من تبويبات قديمة محذوفة */
export function isCollageTab(value: unknown): value is CollageTab {
  return typeof value === 'string' && COLLAGE_TOOLS.some((tool) => tool.id === value);
}

/** هل القيمة تبويب تعديل حر صالح؟ */
export function isStudioTab(value: unknown): value is FreeformTab {
  return typeof value === 'string' && STUDIO_TOOLS.some((tool) => tool.id === value);
}

/** استخراج عنوان/وصف التبويب من السجل بدل سلاسل الشروط الثلاثية */
export function getCollageTool(tab: CollageTab): WorkspaceTool<CollageTab> {
  return COLLAGE_TOOLS.find((tool) => tool.id === tab) ?? COLLAGE_TOOLS[0];
}

export function getStudioTool(tab: FreeformTab): WorkspaceTool<FreeformTab> {
  return STUDIO_TOOLS.find((tool) => tool.id === tab) ?? STUDIO_TOOLS[0];
}

/**
 * تقسيم الأوامر إلى مجموعات بعناوينها المخزّنة في السجل.
 * كانت لوحة الأوامر تتجاهل حقل group وتعرض كل الأوامر تحت عنوان
 * واحد ثابت، فبقيت المجموعات المعلنة في السجل بلا أثر في الواجهة.
 */
export interface CommandGroupView<T> {
  name: string;
  items: T[];
}

export function groupCommands<T extends { group: string }>(commands: T[]): CommandGroupView<T>[] {
  const groups: CommandGroupView<T>[] = [];
  for (const command of commands) {
    const last = groups[groups.length - 1];
    if (last && last.name === command.group) last.items.push(command);
    else groups.push({ name: command.group, items: [command] });
  }
  return groups;
}

/* ═══════════════════════════════════════════════════════════════
   سجل أوامر لوحة الأدوات (Ctrl+K) — الأوامر العالمية خارج أدوات
   الألواح (ملف، تصدير، طباعة، إدراج دفعي، تحديثات، اختصارات...).
   التنفيذ يمر عبر ناقل أحداث grido:* الحالي، فلا تكرار منطق،
   واختصارات كل أمر هي نفسها المسجلة في use-keyboard-shortcuts.ts.

   ⛔ قاعدة حاكمة: أي أمر جديد للوحة يُضاف هنا أو إلى
   WORKSPACE_STATE_COMMANDS فقط. يُمنع إنشاء لوحة أوامر ثانية
   بقائمة أوامر مكتوبة يدوياً (ثابت «حظر ازدواجية الميزات» في
   .agents/AGENTS.md)، ويُمنع إعلان اختصار في حقل shortcut بلا
   تسجيل مقابل له في use-keyboard-shortcuts.ts.
   ═══════════════════════════════════════════════════════════════ */

export interface WorkspaceCommand {
  id: string;
  title: string;
  subtitle: string;
  group: string;
  shortcut?: string;
  /** اسم حدث grido:* المُطلق عند التنفيذ (بلا detail ما عدا المشاريع) */
  event: string;
  detail?: Record<string, unknown>;
}

export const WORKSPACE_COMMANDS: WorkspaceCommand[] = [
  // — الملف والمشاريع —
  {
    id: 'open-file',
    title: 'فتح صورة',
    subtitle: 'اختيار صورة من الجهاز',
    group: 'الملف',
    shortcut: 'Ctrl+O',
    event: 'grido:open-file-dialog',
  },
  {
    id: 'batch-insert',
    title: 'إدراج دفعي',
    subtitle: 'اختيار عدة صور معاً',
    group: 'الملف',
    shortcut: 'Ctrl+Shift+O',
    event: 'grido:open-batch-insert-dialog',
  },
  {
    id: 'projects',
    title: 'المشاريع',
    subtitle: 'الحفظ والتحميل والمكتبة',
    group: 'الملف',
    shortcut: 'Ctrl+S',
    event: 'grido:open-projects-dialog',
    detail: { tab: 'save' },
  },
  {
    id: 'projects-library',
    title: 'مكتبة المشاريع',
    subtitle: 'تصفّح المشاريع المحفوظة',
    group: 'الملف',
    event: 'grido:open-projects-dialog',
    detail: { tab: 'list' },
  },
  // — الإخراج —
  {
    id: 'export',
    title: 'تصدير',
    subtitle: 'حفظ النتيجة بجودة عالية',
    group: 'الإخراج',
    shortcut: 'Ctrl+E',
    event: 'grido:open-export-dialog',
  },
  {
    id: 'print',
    title: 'طباعة',
    subtitle: 'إعداد الورقة وخطوط القص',
    group: 'الإخراج',
    shortcut: 'Ctrl+P',
    event: 'grido:open-print-dialog',
  },
  // — العرض —
  {
    id: 'toggle-right-sidebar',
    title: 'الألواح الجانبية',
    subtitle: 'إظهار أو إخفاء قوالب/طبقات',
    group: 'العرض',
    shortcut: 'Ctrl+B',
    event: 'grido:toggle-right-sidebar',
  },
  {
    id: 'toggle-left-sidebar',
    title: 'خصائص العنصر',
    subtitle: 'إظهار أو إخفاء لوحة الخصائص',
    group: 'العرض',
    shortcut: 'Ctrl+Shift+B',
    event: 'grido:toggle-left-sidebar',
  },
  {
    id: 'zen-mode',
    title: 'وضع التركيز',
    subtitle: 'إخفاء كل الألواح مؤقتاً',
    group: 'العرض',
    shortcut: 'Ctrl+.',
    event: 'grido:toggle-zen-mode',
  },
  // — النظام —
  {
    id: 'shortcuts',
    title: 'الاختصارات',
    subtitle: 'قائمة كاملة بلوحة المفاتيح',
    group: 'النظام',
    event: 'grido:open-shortcuts',
  },
  {
    id: 'stickers',
    title: 'استوديو الملصقات',
    subtitle: 'أختام وشارات قابلة للتخصيص',
    group: 'النظام',
    event: 'grido:open-stickers-dialog',
  },
  {
    id: 'phone-bridge',
    title: 'جسر الهاتف',
    subtitle: 'استقبال صور مباشرة من الجوال',
    group: 'النظام',
    event: 'grido:open-phone-bridge',
  },
  {
    id: 'check-updates',
    title: 'فحص التحديثات',
    subtitle: 'البحث عن إصدار أحدث',
    group: 'النظام',
    event: 'grido:check-updates',
  },
  {
    id: 'toggle-theme',
    title: 'تبديل المظهر',
    subtitle: 'بين الوضع الداكن والمضيء',
    group: 'النظام',
    // مصدر الثيم الوحيد هو useTheme داخل App.tsx (صنف .dark + التفضيل المحفوظ)،
    // فاللوحة تُطلق الحدث ولا تملك نسخة ثانية من حالة الثيم.
    event: 'grido:toggle-theme',
  },
  {
    id: 'account',
    title: 'الحساب والتراخيص',
    subtitle: 'المفتاح والاشتراك والاستخدام',
    group: 'النظام',
    event: 'grido:open-account',
  },
];

/** تنفيذ أمر من السجل عبر ناقل الأحداث الموحد */
export function dispatchWorkspaceCommand(command: WorkspaceCommand): void {
  window.dispatchEvent(new CustomEvent(command.event, { detail: command.detail }));
}

/* ═══════════════════════════════════════════════════════════════
   أوامر الحالة الحية (State Commands) — تقرأ وتعدّل متجر Zustand
   مباشرة (undo/redo، المساطر، الشبكة، الزوم) بدل إطلاق أحداث.
   تُعرض في لوحة الأوامر مع حالتها الحالية كسطر وصفي، وتعطل نفسها
   (disabled) عندما لا معنى لتنفيذها (لا شيء للتراجع عنه مثلاً).
   ═══════════════════════════════════════════════════════════════ */

/**
 * قيم حالة المحرر التي تعتمد عليها لقطات أوامر الحالة.
 * تصل من اشتراك الشريط بالمتجر (useShallow) فيتجدّد النص المعروض مع كل
 * تغيّر فعلي، بدل أن يبقى مجمّداً عند لحظة فتح اللوحة.
 */
export interface StateCommandInput {
  historyIndex: number;
  historyLength: number;
  canvasZoom: number;
  canvasFitMode: CanvasFitMode;
  showRuler: boolean;
  showGrid: boolean;
  /** وضع الكانفاس الحالي — تُعطَّل أوامر التحويل إلى الوضع المفعّل أصلاً */
  mode: EditorMode;
  /** مسار العمل الحالي — يحدّد ظهور تبويب العناصر في الشريط */
  workflow: WorkflowMode;
}

/** مُحدِّد (selector) لقيم الحالة — يُستخدم مع useShallow في الشريط */
export function selectStateCommandInput(
  state: ReturnType<typeof useEditorStore.getState>,
): StateCommandInput {
  return {
    historyIndex: state.historyIndex,
    historyLength: state.history.length,
    canvasZoom: state.canvasZoom,
    canvasFitMode: state.canvasFitMode,
    showRuler: state.showRuler,
    showGrid: state.showGrid,
    mode: state.mode,
    workflow: state.workflow,
  };
}

/** القراءة الافتراضية من المتجر — لأي مستدعٍ لا يشترك في القيم */
function readStateCommandInput(): StateCommandInput {
  return selectStateCommandInput(useEditorStore.getState());
}

export interface StateCommand {
  id: string;
  title: string;
  group: string;
  shortcut?: string;
  /** لقطة تُبنى عند كل تصيير للوحة — الوصف والتعطيل والتنفيذ */
  getSnapshot: (input?: StateCommandInput) => {
    subtitle: string;
    disabled?: boolean;
    run: () => void;
  };
}

const percent = (zoom: number): string => `${Math.round(zoom * 100)}%`;

export const WORKSPACE_STATE_COMMANDS: StateCommand[] = [
  {
    id: 'undo',
    title: 'تراجع',
    group: 'تحرير',
    shortcut: 'Ctrl+Z',
    getSnapshot: (input = readStateCommandInput()) => {
      const { undo } = useEditorStore.getState();
      const stepsBack = Math.max(0, input.historyIndex);
      return {
        subtitle:
          stepsBack > 0
            ? stepsBack === 1
              ? 'خطوة واحدة محفوظة'
              : `${stepsBack} خطوات محفوظة`
            : 'لا شيء للتراجع عنه',
        disabled: stepsBack <= 0,
        run: undo,
      };
    },
  },
  {
    id: 'redo',
    title: 'إعادة',
    group: 'تحرير',
    shortcut: 'Ctrl+Shift+Z',
    getSnapshot: (input = readStateCommandInput()) => {
      const { redo } = useEditorStore.getState();
      const stepsForward = Math.max(0, input.historyLength - 1 - input.historyIndex);
      return {
        subtitle:
          stepsForward > 0
            ? stepsForward === 1
              ? 'تستعيد خطوة واحدة'
              : `تستعيد ${stepsForward} خطوات`
            : 'لا شيء لإعادته',
        disabled: stepsForward <= 0,
        run: redo,
      };
    },
  },
  {
    id: 'toggle-rulers',
    title: 'المساطر',
    group: 'عرض الكانفاس',
    shortcut: 'Ctrl+R',
    getSnapshot: (input = readStateCommandInput()) => {
      const { setShowRuler } = useEditorStore.getState();
      return {
        subtitle: input.showRuler ? 'ظاهرة الآن — للإخفاء' : 'مخفية الآن — للإظهار',
        run: () => setShowRuler(!input.showRuler),
      };
    },
  },
  {
    id: 'toggle-grid',
    title: 'الشبكة',
    group: 'عرض الكانفاس',
    shortcut: "Ctrl+'",
    getSnapshot: (input = readStateCommandInput()) => {
      const { setShowGrid } = useEditorStore.getState();
      return {
        subtitle: input.showGrid ? 'ظاهرة الآن — للإخفاء' : 'مخفية الآن — للإظهار',
        run: () => setShowGrid(!input.showGrid),
      };
    },
  },
  {
    id: 'zoom-in',
    title: 'تكبير',
    group: 'عرض الكانفاس',
    shortcut: 'Ctrl++',
    getSnapshot: (input = readStateCommandInput()) => {
      return {
        subtitle: `الحالي ${percent(input.canvasZoom)}`,
        disabled: !canZoomIn(input.canvasZoom),
        run: zoomInStore,
      };
    },
  },
  {
    id: 'zoom-out',
    title: 'تصغير',
    group: 'عرض الكانفاس',
    shortcut: 'Ctrl+-',
    getSnapshot: (input = readStateCommandInput()) => {
      return {
        subtitle: `الحالي ${percent(input.canvasZoom)}`,
        disabled: !canZoomOut(input.canvasZoom),
        run: zoomOutStore,
      };
    },
  },
  {
    id: 'zoom-reset',
    title: 'إعادة الضبط إلى 100%',
    group: 'عرض الكانفاس',
    shortcut: 'Ctrl+1',
    getSnapshot: (input = readStateCommandInput()) => {
      const isAt100 = isDefaultZoom(input.canvasZoom);
      return {
        subtitle: isAt100 ? 'أنت عند 100%' : `الحالي ${percent(input.canvasZoom)}`,
        disabled: isAt100,
        run: resetZoomStore,
      };
    },
  },
  {
    id: 'zoom-fit',
    title: 'ملاءمة الكل',
    group: 'عرض الكانفاس',
    shortcut: 'Ctrl+0',
    getSnapshot: (input = readStateCommandInput()) => ({
      subtitle:
        input.canvasFitMode === 'height' ? 'الورقة كاملة على الشاشة' : 'الورقة كاملة بلا تمرير',
      disabled: false,
      run: fitZoomStore,
    }),
  },
  {
    id: 'zoom-fit-width',
    title: 'ملاءمة العرض',
    group: 'عرض الكانفاس',
    shortcut: 'Ctrl+Shift+0',
    getSnapshot: (input = readStateCommandInput()) => ({
      subtitle: 'تملأ عرض منطقة العمل ويُمرَّر الباقي',
      disabled: input.canvasFitMode === 'width',
      run: fitWidthZoomStore,
    }),
  },
  {
    id: 'zoom-fit-auto',
    title: CANVAS_FIT_LABELS.auto,
    group: 'عرض الكانفاس',
    shortcut: 'Ctrl+Alt+0',
    getSnapshot: (input = readStateCommandInput()) => ({
      subtitle: 'يختار الوضع الأنسب لهندسة النافذة',
      disabled: input.canvasFitMode === 'auto',
      run: autoFitZoomStore,
    }),
  },
  {
    id: 'zoom-actual-size',
    title: CANVAS_FIT_LABELS.actual,
    group: 'عرض الكانفاس',
    // بلا اختصار: لا مفتاح مسجّل لهذا الوضع في use-keyboard-shortcuts.ts،
    // وإعلان اختصار غير مسجّل يجعل اللوحة توعد بما لا يحدث.
    getSnapshot: (input = readStateCommandInput()) => ({
      subtitle: 'بكسل حقيقي 1:1 مع تمرير أفقي ورأسي',
      disabled: input.canvasFitMode === 'actual',
      run: actualSizeZoomStore,
    }),
  },
  {
    id: 'insert-text',
    title: 'إضافة نص',
    group: 'إدراج',
    // بلا اختصار: لا يوجد مفتاح مسجّل لإدراج النص في use-keyboard-shortcuts.ts،
    // وإعلان اختصار غير مسجّل يجعل اللوحة توعد بما لا يحدث.
    getSnapshot: () => {
      const { addTextElement } = useEditorStore.getState();
      return {
        subtitle: 'نص جديد قابل للتحرير',
        run: () => addTextElement(),
      };
    },
  },
  {
    id: 'insert-rect',
    title: 'إضافة مستطيل',
    group: 'إدراج',
    getSnapshot: () => {
      const { addShapeElement } = useEditorStore.getState();
      return {
        subtitle: 'شكل هندسي قابل للتحجيم',
        run: () => addShapeElement('rect'),
      };
    },
  },
  {
    id: 'insert-ellipse',
    title: 'إضافة دائرة',
    group: 'إدراج',
    getSnapshot: () => {
      const { addShapeElement } = useEditorStore.getState();
      return {
        subtitle: 'شكل بيضاوي قابل للتحجيم',
        run: () => addShapeElement('ellipse'),
      };
    },
  },
  {
    id: 'mode-collage',
    title: 'وضع الكولاج',
    group: 'وضع الكانفاس',
    shortcut: 'Ctrl+Alt+1',
    getSnapshot: (input = readStateCommandInput()) => {
      const { setMode } = useEditorStore.getState();
      const isActive = input.mode === 'collage';
      return {
        subtitle: isActive ? 'هو الوضع الحالي' : 'تحويل الكانفاس إلى شبكة كولاج',
        disabled: isActive,
        run: () => setMode('collage'),
      };
    },
  },
  {
    id: 'mode-single',
    title: 'وضع التعديل الحر',
    group: 'وضع الكانفاس',
    shortcut: 'Ctrl+Alt+2',
    getSnapshot: (input = readStateCommandInput()) => {
      const { setMode } = useEditorStore.getState();
      const isActive = input.mode === 'single';
      return {
        subtitle: isActive ? 'هو الوضع الحالي' : 'تحرير حر بلا شبكة كولاج',
        disabled: isActive,
        run: () => setMode('single'),
      };
    },
  },
  {
    id: 'workflow-quick',
    title: 'مسار الإنتاج السريع',
    group: 'مسار العمل',
    getSnapshot: (input = readStateCommandInput()) => {
      const { setWorkflow } = useEditorStore.getState();
      const isActive = input.workflow === 'quick';
      return {
        subtitle: isActive ? 'هو المسار الحالي' : 'كولاج أولاً — يبدأ من الطبقات',
        disabled: isActive,
        run: () => setWorkflow('quick'),
      };
    },
  },
  {
    id: 'workflow-studio',
    title: 'مسار الاستوديو',
    group: 'مسار العمل',
    getSnapshot: (input = readStateCommandInput()) => {
      const { setWorkflow } = useEditorStore.getState();
      const isActive = input.workflow === 'studio';
      return {
        subtitle: isActive ? 'هو المسار الحالي' : 'كل تبويبات التصميم ظاهرة',
        disabled: isActive,
        run: () => setWorkflow('studio'),
      };
    },
  },
];

/**
 * مجموعات أوامر الحالة مع لقطاتها الحالية — جاهزة للعرض في لوحة الأوامر.
 * بناء اللقطات يمرّ من هنا فلا تتكرّر خريطة اللوحة في الشريط، وتمرير
 * input يجعل النصوص تتبع الحالة الحقيقية بلا قراءة مباشرة داخل التصيير.
 */
export function getStateCommandGroups(input?: StateCommandInput) {
  return groupCommands(
    WORKSPACE_STATE_COMMANDS.map((command) => ({
      command,
      snapshot: command.getSnapshot(input),
      group: command.group,
    })),
  );
}
