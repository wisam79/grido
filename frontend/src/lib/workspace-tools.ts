import type { Icon } from "@phosphor-icons/react";
import type { WorkflowMode } from "@/lib/store/slices/workflow-slice";
import type { EditorMode } from "@/lib/store/types";
import {
  Stack,
  Sticker,
  Shapes,
  TextT,
  FrameCorners,
  GridFour,
  SquaresFour,
  MagicWand,
  Ruler,
  Images,
  PaintRoller,
  Shuffle,
  TextAa,
  Swatches,
  GridNine,
  BookmarkSimple,
} from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import {
  ZOOM_DEFAULT,
  canZoomIn,
  canZoomOut,
  isDefaultZoom,
  stepZoom,
} from "@/lib/canvas/zoom";

/* ═══════════════════════════════════════════════════════════════
   سجل أدوات الشريط الجانبي — مصدر حقيقة واحد للأوضاع الثلاثة:
   الشريط (rail)، تبويبات اللوحة، عنوان الترويسة ووصفها، والمجموعات.
   كانت هذه البيانات مكرّرة يدوياً في 3 ملفات (شريط + ترويسة + أنواع).
   ═══════════════════════════════════════════════════════════════ */

export type CollageTab =
  | "custom"
  | "presets"
  | "freeform"
  | "paper"
  | "autofill"
  | "backdrop"
  | "arrange"
  | "layers";

export type FreeformTab =
  | "layers"
  | "stickers"
  | "shapes"
  | "text"
  | "presets"
  | "fonts"
  | "palette"
  | "backdrops"
  | "library";

/** شارات الحالة الديناميكية على زر الأداة */
export type ToolBadge = "elements" | "collage-grid" | "collage-freeform";

export interface WorkspaceTool<T extends string> {
  id: T;
  /** اسم مختصر للـ Alt+الرقم والتلميح */
  label: string;
  /** عنوان ترويسة اللوحة */
  title: string;
  /** وصف ترويسة اللوحة */
  subtitle: string;
  /** مجموعة الأداة — تفصل الشريط إلى أقسام وتُنظّم لوحة الأدوات */
  group: string;
  icon: Icon;
  testId: string;
  badge?: ToolBadge;
}

export const COLLAGE_TOOLS: WorkspaceTool<CollageTab>[] = [
  {
    id: "custom",
    label: "شبكة الكولاج",
    title: "شبكة الكولاج",
    subtitle: "الصفوف والأعمدة والمقاسات",
    group: "بناء الشبكة",
    icon: GridFour,
    testId: "rail-collage-grid",
    badge: "collage-grid",
  },
  {
    id: "presets",
    label: "قوالب الكولاج",
    title: "قوالب الكولاج",
    subtitle: "نماذج وتشكيلات جاهزة",
    group: "بناء الشبكة",
    icon: SquaresFour,
    testId: "rail-collage-presets",
  },
  {
    id: "freeform",
    label: "كولاج حر بالملم",
    title: "كولاج حر بالملم",
    subtitle: "شبكات مخصصة بالملم",
    group: "بناء الشبكة",
    icon: MagicWand,
    testId: "rail-collage-freeform",
    badge: "collage-freeform",
  },
  {
    id: "paper",
    label: "الورق والقص",
    title: "الورق والقص",
    subtitle: "النزيف وعلامات القص والنسخ",
    group: "جاهزية الطباعة",
    icon: Ruler,
    testId: "rail-collage-paper",
  },
  {
    id: "autofill",
    label: "تعبئة تلقائية",
    title: "تعبئة تلقائية",
    subtitle: "توزيع الصور على الخانات",
    group: "جاهزية الطباعة",
    icon: Images,
    testId: "rail-collage-autofill",
  },
  {
    id: "backdrop",
    label: "خلفية وحدود",
    title: "خلفية وحدود الشبكة",
    subtitle: "اللون والمسافات والإطار",
    group: "تنسيق الخانات",
    icon: PaintRoller,
    testId: "rail-collage-backdrop",
  },
  {
    id: "arrange",
    label: "فرز وترتيب",
    title: "فرز وترتيب الخانات",
    subtitle: "قلب وخلط وتوزيع الصور",
    group: "تنسيق الخانات",
    icon: Shuffle,
    testId: "rail-collage-arrange",
  },
  // في نهاية القائمة عمداً — إلحاقه يحافظ على اختصارات Alt+الأرقام
  // القائمة للأدوات السابقة دون إزاحة
  {
    id: "layers",
    label: "طبقات الخانات",
    title: "طبقات الخانات",
    subtitle: "تحديد وإفراغ الخانات",
    group: "تنسيق الخانات",
    icon: Stack,
    testId: "rail-collage-layers",
  },
];

export const STUDIO_TOOLS: WorkspaceTool<FreeformTab>[] = [
  {
    id: "layers",
    label: "الطبقات",
    title: "الطبقات",
    subtitle: "ترتيب عناصر الكانفاس",
    group: "بناء التصميم",
    icon: Stack,
    testId: "rail-studio-layers",
    badge: "elements",
  },
  {
    id: "stickers",
    label: "الملصقات والشارات",
    title: "الملصقات والشارات",
    subtitle: "أختام وشارات جاهزة",
    group: "بناء التصميم",
    icon: Sticker,
    testId: "rail-studio-stickers",
  },
  {
    id: "shapes",
    label: "الأشكال والتصاميم",
    title: "الأشكال والتصاميم",
    subtitle: "أشكال هندسية متنوعة",
    group: "بناء التصميم",
    icon: Shapes,
    testId: "rail-studio-shapes",
  },
  {
    id: "text",
    label: "النصوص الجاهزة",
    title: "النصوص الجاهزة",
    subtitle: "عناوين وتأثيرات جاهزة",
    group: "بناء التصميم",
    icon: TextT,
    testId: "rail-studio-text",
  },
  {
    id: "presets",
    label: "المقاسات والورق",
    title: "المقاسات والورق",
    subtitle: "نماذج ومقاسات مخصصة",
    group: "المقاسات والهوية",
    icon: FrameCorners,
    testId: "rail-studio-presets",
  },
  {
    id: "fonts",
    label: "مكتبة الخطوط",
    title: "مكتبة الخطوط",
    subtitle: "عائلات عربية ومعاينة حية",
    group: "المقاسات والهوية",
    icon: TextAa,
    testId: "rail-studio-fonts",
  },
  {
    id: "palette",
    label: "الألوان والهوية",
    title: "الألوان والهوية",
    subtitle: "بالِتة وألوان مستخرجة",
    group: "المقاسات والهوية",
    icon: Swatches,
    testId: "rail-studio-palette",
  },
  {
    id: "backdrops",
    label: "الخلفيات والأنماط",
    title: "الخلفيات والأنماط",
    subtitle: "تدرجات وأنماط متكررة",
    group: "المقاسات والهوية",
    icon: GridNine,
    testId: "rail-studio-backdrops",
  },
  {
    id: "library",
    label: "المفضلة",
    title: "المفضلة وآخر استخدام",
    subtitle: "وصول سريع لما تستخدمه",
    group: "الوصول السريع",
    icon: BookmarkSimple,
    testId: "rail-studio-library",
  },
];

/* ═══════════════════════════════════════════════════════════════
   أدوات مسار الإنتاج السريع — فرعية من COLLAGE_TOOLS بدون الأدوات
   المتقدمة غير الضرورية لإنتاج صور الهوية الفوري.
   ═══════════════════════════════════════════════════════════════ */

/** أدوات "فرز وترتيب" و "كولاج حر بالملم" و "طبقات الخانات" لا يحتاجها مسار الإنتاج السريع */
const QUICK_EXCLUDED_IDS: ReadonlySet<string> = new Set(["freeform", "arrange", "layers"]);

export const QUICK_COLLAGE_TOOLS: WorkspaceTool<CollageTab>[] =
  COLLAGE_TOOLS.filter((tool) => !QUICK_EXCLUDED_IDS.has(tool.id));

/** أدوات الكولاج المناسبة لمسار العمل — مبسطة في مسار الإنتاج السريع */
export function getCollageToolsForWorkflow(
  workflowMode: WorkflowMode | null
): WorkspaceTool<CollageTab>[] {
  return workflowMode === "quick" ? QUICK_COLLAGE_TOOLS : COLLAGE_TOOLS;
}

/**
 * ترجع مصفوفة الأدوات المناسبة لوضع الكانفاس الحالي.
 *
 * مصدر الحقيقة هو `mode` وحده — نفس القيمة التي يرسم بها الكانفاس — ومسار
 * الإنتاج السريع يبسّط قائمة أدوات الكولاج فقط. أي مكان يعرض قائمة أدوات
 * (الشريط، لوحة الأوامر، تبويبات الشاشات المدمجة، اختصارات Alt+الرقم) يجب
 * أن يمرّ من هنا وإلا اختلفت الأداة المعروضة عن الاختصار المسجّل فعلاً.
 */
export function getToolsForWorkflow(
  mode: EditorMode,
  workflowMode: WorkflowMode | null
): WorkspaceTool<string>[] {
  return mode === "collage" ? getCollageToolsForWorkflow(workflowMode) : STUDIO_TOOLS;
}

/** الحد الأقصى لاختصارات Alt+1..Alt+9 — لا يوجد اختصار Alt+10 */
export const MAX_TOOL_SHORTCUTS = 9;

/** اختصار Alt+الرقم يتكوّن من ترتيب الأداة في شريطها (بحد أقصى 9 أدوات) */
export function toolShortcut(index: number): string {
  if (index < 0 || index >= MAX_TOOL_SHORTCUTS) return "";
  return `Alt+${index + 1}`;
}

/** هل القيمة تبويب كولاج صالح؟ — تحمي التخزين المحلي من تبويبات قديمة محذوفة */
export function isCollageTab(value: unknown): value is CollageTab {
  return typeof value === "string" && COLLAGE_TOOLS.some((tool) => tool.id === value);
}

/** هل القيمة تبويب تعديل حر صالح؟ */
export function isStudioTab(value: unknown): value is FreeformTab {
  return typeof value === "string" && STUDIO_TOOLS.some((tool) => tool.id === value);
}

/** استخراج عنوان/وصف الترويسة من السجل بدل سلاسل الشروط الثلاثية */
export function getCollageTool(tab: CollageTab): WorkspaceTool<CollageTab> {
  return COLLAGE_TOOLS.find((tool) => tool.id === tab) ?? COLLAGE_TOOLS[0];
}

export function getStudioTool(tab: FreeformTab): WorkspaceTool<FreeformTab> {
  return STUDIO_TOOLS.find((tool) => tool.id === tab) ?? STUDIO_TOOLS[0];
}

export interface ToolGroup<T extends string> {
  name: string;
  /** رقم الأداة الأول في السجل — يُستخدم لحساب اختصار Alt بلا فقدان الترتيب */
  offset: number;
  tools: WorkspaceTool<T>[];
}

/**
 * تقسيم الأدوات إلى مجموعات مع الحفاظ على ترتيب السجل.
 * الترتيب هو نفسه المستخدم في اختصارات Alt+الرقم، فلا يتغيّر رقم أي أداة
 * بسبب التجميع (وهو ما كان سيحدث لو أُعيد ترتيب السجل بصرياً).
 */
export function groupTools<T extends string>(tools: WorkspaceTool<T>[]): ToolGroup<T>[] {
  const groups: ToolGroup<T>[] = [];
  tools.forEach((tool, index) => {
    const last = groups[groups.length - 1];
    if (last && last.name === tool.group) last.tools.push(tool);
    else groups.push({ name: tool.group, offset: index, tools: [tool] });
  });
  return groups;
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

export function groupCommands<T extends { group: string }>(
  commands: T[]
): CommandGroupView<T>[] {
  const groups: CommandGroupView<T>[] = [];
  for (const command of commands) {
    const last = groups[groups.length - 1];
    if (last && last.name === command.group) last.items.push(command);
    else groups.push({ name: command.group, items: [command] });
  }
  return groups;
}

/* ═══════════════════════════════════════════════════════════════
   سجل أوامر لوحة الأوامر (Ctrl+K) — الأوامر العالمية خارج أدوات
   الألواح (ملف، تصدير، طباعة، إدراج دفعي، تحديثات، اختصارات...).
   التنفيذ يمر عبر ناقل أحداث grido:* الحالي، فلا تكرار منطق،
   واختصارات كل أمر هي نفسها المسجلة في use-keyboard-shortcuts.ts.
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
    id: "open-file",
    title: "فتح صورة",
    subtitle: "اختيار صورة من الجهاز",
    group: "الملف",
    shortcut: "Ctrl+O",
    event: "grido:open-file-dialog",
  },
  {
    id: "batch-insert",
    title: "إدراج دفعي",
    subtitle: "اختيار عدة صور معاً",
    group: "الملف",
    shortcut: "Ctrl+Shift+O",
    event: "grido:open-batch-insert-dialog",
  },
  {
    id: "projects",
    title: "المشاريع",
    subtitle: "الحفظ والتحميل والمكتبة",
    group: "الملف",
    shortcut: "Ctrl+S",
    event: "grido:open-projects-dialog",
    detail: { tab: "save" },
  },
  // — الإخراج —
  {
    id: "export",
    title: "تصدير",
    subtitle: "حفظ النتيجة بجودة عالية",
    group: "الإخراج",
    shortcut: "Ctrl+E",
    event: "grido:open-export-dialog",
  },
  {
    id: "print",
    title: "طباعة",
    subtitle: "إعداد الورقة وخطوط القص",
    group: "الإخراج",
    shortcut: "Ctrl+P",
    event: "grido:open-print-dialog",
  },
  // — العرض —
  {
    id: "toggle-right-sidebar",
    title: "الألواح الجانبية",
    subtitle: "إظهار أو إخفاء قوالب/طبقات",
    group: "العرض",
    shortcut: "Ctrl+B",
    event: "grido:toggle-right-sidebar",
  },
  {
    id: "toggle-left-sidebar",
    title: "خصائص العنصر",
    subtitle: "إظهار أو إخفاء لوحة الخصائص",
    group: "العرض",
    shortcut: "Ctrl+Shift+B",
    event: "grido:toggle-left-sidebar",
  },
  {
    id: "zen-mode",
    title: "وضع التركيز",
    subtitle: "إخفاء كل الألواح مؤقتاً",
    group: "العرض",
    shortcut: "Ctrl+.",
    event: "grido:toggle-zen-mode",
  },
  // — النظام —
  {
    id: "shortcuts",
    title: "الاختصارات",
    subtitle: "قائمة كاملة بلوحة المفاتيح",
    group: "النظام",
    event: "grido:open-shortcuts",
  },
  {
    id: "stickers",
    title: "استوديو الملصقات",
    subtitle: "أختام وشارات قابلة للتخصيص",
    group: "النظام",
    event: "grido:open-stickers-dialog",
  },
  {
    id: "phone-bridge",
    title: "جسر الهاتف",
    subtitle: "استقبال صور مباشرة من الجوال",
    group: "النظام",
    event: "grido:open-phone-bridge",
  },
  {
    id: "check-updates",
    title: "فحص التحديثات",
    subtitle: "البحث عن إصدار أحدث",
    group: "النظام",
    event: "grido:check-updates",
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
  showRuler: boolean;
  showGrid: boolean;
}

/** مُحدِّد (selector) لقيم الحالة — يُستخدم مع useShallow في الشريط */
export function selectStateCommandInput(
  state: ReturnType<typeof useEditorStore.getState>
): StateCommandInput {
  return {
    historyIndex: state.historyIndex,
    historyLength: state.history.length,
    canvasZoom: state.canvasZoom,
    showRuler: state.showRuler,
    showGrid: state.showGrid,
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
    id: "undo",
    title: "تراجع",
    group: "تحرير",
    shortcut: "Ctrl+Z",
    getSnapshot: (input = readStateCommandInput()) => {
      const { undo } = useEditorStore.getState();
      const stepsBack = Math.max(0, input.historyIndex);
      return {
        subtitle:
          stepsBack > 0
            ? stepsBack === 1
              ? "خطوة واحدة محفوظة"
              : `${stepsBack} خطوات محفوظة`
            : "لا شيء للتراجع عنه",
        disabled: stepsBack <= 0,
        run: undo,
      };
    },
  },
  {
    id: "redo",
    title: "إعادة",
    group: "تحرير",
    shortcut: "Ctrl+Shift+Z",
    getSnapshot: (input = readStateCommandInput()) => {
      const { redo } = useEditorStore.getState();
      const stepsForward = Math.max(0, input.historyLength - 1 - input.historyIndex);
      return {
        subtitle:
          stepsForward > 0
            ? stepsForward === 1
              ? "تستعيد خطوة واحدة"
              : `تستعيد ${stepsForward} خطوات`
            : "لا شيء لإعادته",
        disabled: stepsForward <= 0,
        run: redo,
      };
    },
  },
  {
    id: "toggle-rulers",
    title: "المساطر",
    group: "عرض الكانفاس",
    shortcut: "Ctrl+R",
    getSnapshot: (input = readStateCommandInput()) => {
      const { setShowRuler } = useEditorStore.getState();
      return {
        subtitle: input.showRuler ? "ظاهرة الآن — للإخفاء" : "مخفية الآن — للإظهار",
        run: () => setShowRuler(!input.showRuler),
      };
    },
  },
  {
    id: "toggle-grid",
    title: "الشبكة",
    group: "عرض الكانفاس",
    shortcut: "Ctrl+'",
    getSnapshot: (input = readStateCommandInput()) => {
      const { setShowGrid } = useEditorStore.getState();
      return {
        subtitle: input.showGrid ? "ظاهرة الآن — للإخفاء" : "مخفية الآن — للإظهار",
        run: () => setShowGrid(!input.showGrid),
      };
    },
  },
  {
    id: "zoom-in",
    title: "تكبير",
    group: "عرض الكانفاس",
    shortcut: "Ctrl++",
    getSnapshot: (input = readStateCommandInput()) => {
      const { setCanvasZoom } = useEditorStore.getState();
      return {
        subtitle: `الحالي ${percent(input.canvasZoom)}`,
        disabled: !canZoomIn(input.canvasZoom),
        run: () => setCanvasZoom(stepZoom(input.canvasZoom, 1)),
      };
    },
  },
  {
    id: "zoom-out",
    title: "تصغير",
    group: "عرض الكانفاس",
    shortcut: "Ctrl+-",
    getSnapshot: (input = readStateCommandInput()) => {
      const { setCanvasZoom } = useEditorStore.getState();
      return {
        subtitle: `الحالي ${percent(input.canvasZoom)}`,
        disabled: !canZoomOut(input.canvasZoom),
        run: () => setCanvasZoom(stepZoom(input.canvasZoom, -1)),
      };
    },
  },
  {
    id: "zoom-reset",
    title: "إعادة الضبط إلى 100%",
    group: "عرض الكانفاس",
    shortcut: "Ctrl+0",
    getSnapshot: (input = readStateCommandInput()) => {
      const { setCanvasZoom } = useEditorStore.getState();
      const isAt100 = isDefaultZoom(input.canvasZoom);
      return {
        subtitle: isAt100 ? "أنت عند 100%" : `الحالي ${percent(input.canvasZoom)}`,
        disabled: isAt100,
        run: () => setCanvasZoom(ZOOM_DEFAULT),
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
    }))
  );
}
