import type { Icon } from "@/components/ui/icons";
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
} from "@/components/ui/icons";
import { useEditorStore } from "@/lib/editor-store";
import { canZoomIn, canZoomOut, isDefaultZoom } from "@/lib/canvas/zoom";
import {
  autoFitZoomStore,
  fitWidthZoomStore,
  fitZoomStore,
  resetZoomStore,
  zoomInStore,
  zoomOutStore,
} from "@/hooks/use-canvas-zoom";
import { CANVAS_FIT_LABELS, type CanvasFitMode } from "@/lib/canvas/fit";

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
  | "arrange";

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
    subtitle: "لون الورقة والتدرجات الجاهزة",
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
   أدوات وضع الكانفاس الموحّدة:
   مصدر الحقيقة هو `mode` وحده ("collage" أو "single") — نفس القيمة
   التي يرسم بها الكانفاس وتعتمدها اختصارات Alt+الرقم.
   ═══════════════════════════════════════════════════════════════ */

/** أدوات الكولاج المتاحة بالكامل */
export function getCollageTools(): WorkspaceTool<CollageTab>[] {
  return COLLAGE_TOOLS;
}

/** أدوات الكولاج — اسم بديل للتوافقية */
export const getCollageToolsForWorkflow = getCollageTools;

/** ترجع مصفوفة الأدوات المناسبة لوضع الكانفاس الحالي */
export function getToolsForMode(mode: EditorMode): WorkspaceTool<string>[] {
  return mode === "collage" ? COLLAGE_TOOLS : STUDIO_TOOLS;
}

/** اسم بديل للتوافقية مع أي استيرادات سابقة */
export function getToolsForWorkflow(
  mode: EditorMode,
  _workflowMode?: unknown
): WorkspaceTool<string>[] {
  return getToolsForMode(mode);
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
  {
    id: "projects-library",
    title: "مكتبة المشاريع",
    subtitle: "تصفّح المشاريع المحفوظة",
    group: "الملف",
    event: "grido:open-projects-dialog",
    detail: { tab: "list" },
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
  {
    id: "toggle-theme",
    title: "تبديل المظهر",
    subtitle: "بين الوضع الداكن والمضيء",
    group: "النظام",
    // مصدر الثيم الوحيد هو useTheme داخل App.tsx (صنف .dark + التفضيل المحفوظ)،
    // فاللوحة تُطلق الحدث ولا تملك نسخة ثانية من حالة الثيم.
    event: "grido:toggle-theme",
  },
  {
    id: "account",
    title: "الحساب والتراخيص",
    subtitle: "المفتاح والاشتراك والاستخدام",
    group: "النظام",
    event: "grido:open-account",
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
}

/** مُحدِّد (selector) لقيم الحالة — يُستخدم مع useShallow في الشريط */
export function selectStateCommandInput(
  state: ReturnType<typeof useEditorStore.getState>
): StateCommandInput {
  return {
    historyIndex: state.historyIndex,
    historyLength: state.history.length,
    canvasZoom: state.canvasZoom,
    canvasFitMode: state.canvasFitMode,
    showRuler: state.showRuler,
    showGrid: state.showGrid,
    mode: state.mode,
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
      return {
        subtitle: `الحالي ${percent(input.canvasZoom)}`,
        disabled: !canZoomIn(input.canvasZoom),
        run: zoomInStore,
      };
    },
  },
  {
    id: "zoom-out",
    title: "تصغير",
    group: "عرض الكانفاس",
    shortcut: "Ctrl+-",
    getSnapshot: (input = readStateCommandInput()) => {
      return {
        subtitle: `الحالي ${percent(input.canvasZoom)}`,
        disabled: !canZoomOut(input.canvasZoom),
        run: zoomOutStore,
      };
    },
  },
  {
    id: "zoom-reset",
    title: "إعادة الضبط إلى 100%",
    group: "عرض الكانفاس",
    shortcut: "Ctrl+1",
    getSnapshot: (input = readStateCommandInput()) => {
      const isAt100 = isDefaultZoom(input.canvasZoom);
      return {
        subtitle: isAt100 ? "أنت عند 100%" : `الحالي ${percent(input.canvasZoom)}`,
        disabled: isAt100,
        run: resetZoomStore,
      };
    },
  },
  {
    id: "zoom-fit",
    title: "ملاءمة الكل",
    group: "عرض الكانفاس",
    shortcut: "Ctrl+0",
    getSnapshot: (input = readStateCommandInput()) => ({
      subtitle: input.canvasFitMode === "height" ? "الورقة كاملة على الشاشة" : "الورقة كاملة بلا تمرير",
      disabled: false,
      run: fitZoomStore,
    }),
  },
  {
    id: "zoom-fit-width",
    title: "ملاءمة العرض",
    group: "عرض الكانفاس",
    shortcut: "Ctrl+Shift+0",
    getSnapshot: (input = readStateCommandInput()) => ({
      subtitle: "تملأ عرض منطقة العمل ويُمرَّر الباقي",
      disabled: input.canvasFitMode === "width",
      run: fitWidthZoomStore,
    }),
  },
  {
    id: "zoom-fit-auto",
    title: CANVAS_FIT_LABELS.auto,
    group: "عرض الكانفاس",
    shortcut: "Ctrl+Alt+0",
    getSnapshot: (input = readStateCommandInput()) => ({
      subtitle: "يختار الوضع الأنسب لهندسة النافذة",
      disabled: input.canvasFitMode === "auto",
      run: autoFitZoomStore,
    }),
  },
  {
    id: "insert-text",
    title: "إضافة نص",
    group: "إدراج",
    // بلا اختصار: لا يوجد مفتاح مسجّل لإدراج النص في use-keyboard-shortcuts.ts،
    // وإعلان اختصار غير مسجّل يجعل اللوحة توعد بما لا يحدث.
    getSnapshot: () => {
      const { addTextElement } = useEditorStore.getState();
      return {
        subtitle: "نص جديد قابل للتحرير",
        run: () => addTextElement(),
      };
    },
  },
  {
    id: "insert-rect",
    title: "إضافة مستطيل",
    group: "إدراج",
    getSnapshot: () => {
      const { addShapeElement } = useEditorStore.getState();
      return {
        subtitle: "شكل هندسي قابل للتحجيم",
        run: () => addShapeElement("rect"),
      };
    },
  },
  {
    id: "insert-ellipse",
    title: "إضافة دائرة",
    group: "إدراج",
    getSnapshot: () => {
      const { addShapeElement } = useEditorStore.getState();
      return {
        subtitle: "شكل بيضاوي قابل للتحجيم",
        run: () => addShapeElement("ellipse"),
      };
    },
  },
  {
    id: "mode-collage",
    title: "وضع الكولاج",
    group: "وضع الكانفاس",
    shortcut: "Ctrl+Alt+1",
    getSnapshot: (input = readStateCommandInput()) => {
      const { setMode } = useEditorStore.getState();
      const isActive = input.mode === "collage";
      return {
        subtitle: isActive ? "هو الوضع الحالي" : "تحويل الكانفاس إلى شبكة كولاج",
        disabled: isActive,
        run: () => setMode("collage"),
      };
    },
  },
  {
    id: "mode-single",
    title: "وضع التعديل الحر",
    group: "وضع الكانفاس",
    shortcut: "Ctrl+Alt+2",
    getSnapshot: (input = readStateCommandInput()) => {
      const { setMode } = useEditorStore.getState();
      const isActive = input.mode === "single";
      return {
        subtitle: isActive ? "هو الوضع الحالي" : "تحرير حر بلا شبكة كولاج",
        disabled: isActive,
        run: () => setMode("single"),
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
