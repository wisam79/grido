import type { Icon } from "@phosphor-icons/react";
import {
  Stack,
  Stamp,
  Shapes,
  TextT,
  FrameCorners,
  GridFour,
  SquaresFour,
  MagicWand,
  Scissors,
  Images,
  PaintBucket,
  ArrowsDownUp,
  TextAa,
  Palette,
  GridNine,
  Star,
} from "@phosphor-icons/react";

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
  | "elements"
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
    icon: Scissors,
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
    icon: PaintBucket,
    testId: "rail-collage-backdrop",
  },
  {
    id: "arrange",
    label: "فرز وترتيب",
    title: "فرز وترتيب الخانات",
    subtitle: "قلب وخلط وتوزيع الصور",
    group: "تنسيق الخانات",
    icon: ArrowsDownUp,
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
    icon: Stamp,
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
    icon: Palette,
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
    icon: Star,
    testId: "rail-studio-library",
  },
];

/** اختصار Alt+الرقم يتكوّن من ترتيب الأداة في شريطها (الحد الأقصى 9) */
export function toolShortcut(index: number): string {
  return `Alt+${index + 1}`;
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
