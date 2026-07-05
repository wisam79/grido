// قاعدة بيانات قوالب الصور الرسمية القياسية
// مصدر الأبعاد: المعايير القياسية ICAO 9303 ومتطلبات الأحوال المدنية

import type { LucideIcon } from "lucide-react";
import {
  IdCard,
  BookUser,
  Plane,
  Image,
  Camera,
  Briefcase,
  LayoutGrid,
  LayoutPanelTop,
  Grid2x2,
  Grid3x3,
  Grid3x2,
  Columns4,
  ClipboardList,
} from "lucide-react";

export type TemplateCategory =
  | "id"
  | "passport"
  | "visa"
  | "personal"
  | "collage";

export interface PhotoTemplate {
  id: string;
  name: string; // الاسم القياسي (قياس + نوع)
  category: TemplateCategory;
  width: number; // البكسل عند DPI المحدد
  height: number;
  widthMM: number; // المليمتر
  heightMM: number;
  dpi: number;
  headHeightMin?: number; // الحد الأدنى لارتفاع الرأس %
  headHeightMax?: number;
  background: string; // اللون الموصى به للخلفية
  backgroundHint: string;
  notes?: string;
  icon: LucideIcon;
}

export const PHOTO_TEMPLATES: PhotoTemplate[] = [
  // === بطاقة الهوية المدنية ===
  {
    id: "id-30x40",
    name: "هوية مدنية · 30×40 ملم",
    category: "id",
    width: 354,
    height: 472,
    widthMM: 30,
    heightMM: 40,
    dpi: 300,
    headHeightMin: 50,
    headHeightMax: 70,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: IdCard,
    notes: "المقاس القياسي للبطاقة الوطنية الموحدة",
  },
  {
    id: "id-35x45",
    name: "هوية مدنية · 35×45 ملم",
    category: "id",
    width: 413,
    height: 531,
    widthMM: 35,
    heightMM: 45,
    dpi: 300,
    headHeightMin: 50,
    headHeightMax: 70,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: IdCard,
    notes: "المقاس القياسي البديل للهوية",
  },
  {
    id: "id-33x48",
    name: "هوية مدنية · 33×48 ملم",
    category: "id",
    width: 390,
    height: 567,
    widthMM: 33,
    heightMM: 48,
    dpi: 300,
    headHeightMin: 50,
    headHeightMax: 70,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: IdCard,
  },

  // === جواز السفر ===
  {
    id: "passport-35x45",
    name: "جواز سفر · 35×45 ملم",
    category: "passport",
    width: 413,
    height: 531,
    widthMM: 35,
    heightMM: 45,
    dpi: 300,
    headHeightMin: 50,
    headHeightMax: 70,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: BookUser,
    notes: "المعيار الدولي ICAO 9303",
  },
  {
    id: "passport-33x48",
    name: "جواز سفر · 33×48 ملم",
    category: "passport",
    width: 390,
    height: 567,
    widthMM: 33,
    heightMM: 48,
    dpi: 300,
    headHeightMin: 50,
    headHeightMax: 70,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: BookUser,
  },
  {
    id: "passport-2x2",
    name: "جواز سفر · 2×2 بوصة (51×51)",
    category: "passport",
    width: 600,
    height: 600,
    widthMM: 51,
    heightMM: 51,
    dpi: 300,
    headHeightMin: 50,
    headHeightMax: 69,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: BookUser,
  },

  // === التأشيرات ===
  {
    id: "visa-35x45",
    name: "تأشيرة · 35×45 ملم",
    category: "visa",
    width: 413,
    height: 531,
    widthMM: 35,
    heightMM: 45,
    dpi: 300,
    headHeightMin: 70,
    headHeightMax: 80,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء فاتحة",
    icon: Plane,
  },
  {
    id: "visa-2x2",
    name: "تأشيرة · 2×2 بوصة (51×51)",
    category: "visa",
    width: 600,
    height: 600,
    widthMM: 51,
    heightMM: 51,
    dpi: 300,
    headHeightMin: 50,
    headHeightMax: 70,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: Plane,
  },
  {
    id: "visa-37x37",
    name: "تأشيرة · 37×37 ملم",
    category: "visa",
    width: 437,
    height: 437,
    widthMM: 37,
    heightMM: 37,
    dpi: 300,
    headHeightMin: 50,
    headHeightMax: 70,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: Plane,
  },

  // === صور شخصية عامة ===
  {
    id: "personal-square-50",
    name: "صورة شخصية · 50×50 ملم",
    category: "personal",
    width: 591,
    height: 591,
    widthMM: 50,
    heightMM: 50,
    dpi: 300,
    background: "#FFFFFF",
    backgroundHint: "أي خلفية",
    icon: Image,
  },
  {
    id: "personal-4x6",
    name: "صورة · 4×6 بوصة (102×152)",
    category: "personal",
    width: 1200,
    height: 1800,
    widthMM: 102,
    heightMM: 152,
    dpi: 300,
    background: "#FFFFFF",
    backgroundHint: "أي خلفية",
    icon: Camera,
  },
  {
    id: "personal-5x7",
    name: "صورة · 5×7 بوصة (127×178)",
    category: "personal",
    width: 1500,
    height: 2100,
    widthMM: 127,
    heightMM: 178,
    dpi: 300,
    background: "#FFFFFF",
    backgroundHint: "أي خلفية",
    icon: Image,
  },
  {
    id: "personal-profile",
    name: "صورة بروفايل · 8×8 سم",
    category: "personal",
    width: 945,
    height: 945,
    widthMM: 80,
    heightMM: 80,
    dpi: 300,
    background: "#FFFFFF",
    backgroundHint: "خلفية محايدة",
    icon: Briefcase,
  },
];

export const TEMPLATES_BY_CATEGORY = (
  (["id", "passport", "visa", "personal", "collage"] as TemplateCategory[]).reduce(
    (acc, cat) => {
      acc[cat] = PHOTO_TEMPLATES.filter((t) => t.category === cat);
      return acc;
    },
    {} as Record<TemplateCategory, PhotoTemplate[]>
  )
) as Record<TemplateCategory, PhotoTemplate[]>;

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  id: "بطاقة الهوية",
  passport: "جواز السفر",
  visa: "التأشيرة",
  personal: "صور شخصية",
  collage: "كولاج",
};

export const CATEGORY_ICONS: Record<TemplateCategory, LucideIcon> = {
  id: IdCard,
  passport: BookUser,
  visa: Plane,
  personal: Image,
  collage: LayoutGrid,
};

// قوالب الكولاج الجاهزة
export interface CollageTemplate {
  id: string;
  name: string;
  slots: number;
  // نسب الخلايا: x, y, w, h (بالكسر من 0 إلى 1)
  cells: { x: number; y: number; w: number; h: number }[];
  icon: LucideIcon;
}

export const COLLAGE_TEMPLATES: CollageTemplate[] = [
  {
    id: "collage-2v",
    name: "صورتان عمودي",
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
    icon: LayoutPanelTop,
  },
  {
    id: "collage-2h",
    name: "صورتان أفقي",
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
    icon: LayoutPanelTop,
  },
  {
    id: "collage-3",
    name: "ثلاث صور",
    slots: 3,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
    icon: LayoutGrid,
  },
  {
    id: "collage-4",
    name: "أربع صور (2×2)",
    slots: 4,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
    icon: Grid2x2,
  },
  {
    id: "collage-6",
    name: "ست صور (3×2)",
    slots: 6,
    cells: Array.from({ length: 6 }, (_, i) => ({
      x: (i % 3) / 3,
      y: Math.floor(i / 3) / 2,
      w: 1 / 3,
      h: 1 / 2,
    })),
    icon: Grid3x2,
  },
  {
    id: "collage-8",
    name: "ثماني صور (4×2)",
    slots: 8,
    cells: Array.from({ length: 8 }, (_, i) => ({
      x: (i % 4) / 4,
      y: Math.floor(i / 4) / 2,
      w: 1 / 4,
      h: 1 / 2,
    })),
    icon: Columns4,
  },
  {
    id: "collage-9",
    name: "تسع صور (3×3)",
    slots: 9,
    cells: Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) / 3,
      y: Math.floor(i / 3) / 3,
      w: 1 / 3,
      h: 1 / 3,
    })),
    icon: Grid3x3,
  },
  {
    id: "collage-passport-sheet",
    name: "ورقة صور هوية (8 صور)",
    slots: 8,
    cells: Array.from({ length: 8 }, (_, i) => ({
      x: (i % 4) / 4,
      y: Math.floor(i / 4) / 2,
      w: 1 / 4,
      h: 1 / 2,
    })),
    icon: ClipboardList,
  },
];

// أحجام الورق القياسية للطباعة
export interface PaperSize {
  id: string;
  name: string;
  widthMM: number;
  heightMM: number;
}

export const PAPER_SIZES: PaperSize[] = [
  { id: "a4", name: "A4 (210×297 ملم)", widthMM: 210, heightMM: 297 },
  { id: "a3", name: "A3 (297×420 ملم)", widthMM: 297, heightMM: 420 },
  { id: "a5", name: "A5 (148×210 ملم)", widthMM: 148, heightMM: 210 },
  { id: "a6", name: "A6 (105×148 ملم)", widthMM: 105, heightMM: 148 },
  { id: "letter", name: "Letter (8.5×11 بوصة)", widthMM: 216, heightMM: 279 },
  { id: "4x6", name: "4×6 بوصة (102×152 ملم)", widthMM: 102, heightMM: 152 },
  { id: "5x7", name: "5×7 بوصة (127×178 ملم)", widthMM: 127, heightMM: 178 },
];

// مرشحات الصور
export interface ImageFilter {
  id: string;
  name: string;
  css: string;
  preview: string;
}

export const IMAGE_FILTERS: ImageFilter[] = [
  { id: "none", name: "الأصلي", css: "", preview: "" },
  { id: "grayscale", name: "أبيض وأسود", css: "grayscale(100%)", preview: "grayscale(100%)" },
  { id: "sepia", name: "بني قديم", css: "sepia(80%)", preview: "sepia(80%)" },
  { id: "vivid", name: "نابض", css: "saturate(1.4) contrast(1.1)", preview: "saturate(1.4) contrast(1.1)" },
  { id: "cool", name: "بارد", css: "hue-rotate(180deg) saturate(1.2)", preview: "hue-rotate(180deg) saturate(1.2)" },
  { id: "warm", name: "دافئ", css: "sepia(30%) saturate(1.3) hue-rotate(-10deg)", preview: "sepia(30%) saturate(1.3) hue-rotate(-10deg)" },
  { id: "soft", name: "ناعم", css: "brightness(1.1) contrast(0.9) saturate(0.9)", preview: "brightness(1.1) contrast(0.9) saturate(0.9)" },
  { id: "professional", name: "احترافي", css: "contrast(1.15) saturate(1.1) brightness(1.02)", preview: "contrast(1.15) saturate(1.1) brightness(1.02)" },
];

// ألوان خلفية جاهزة
export const BACKGROUND_COLORS: { name: string; value: string }[] = [
  { name: "أبيض", value: "#FFFFFF" },
  { name: "أزرق فاتح", value: "#E8F0FE" },
  { name: "رمادي فاتح", value: "#F2F2F2" },
  { name: "أحمر", value: "#D32F2F" },
  { name: "أزرق", value: "#1976D2" },
  { name: "أخضر", value: "#388E3C" },
  { name: "بيج", value: "#F5F0E1" },
  { name: "أسود", value: "#000000" },
];
