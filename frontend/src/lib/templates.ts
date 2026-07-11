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
  // === الوثائق الرسمية العراقية ===
  {
    id: "iq-national-id",
    name: "البطاقة الوطنية الموحدة العراقية · 35×45 ملم",
    category: "id",
    width: 413,
    height: 531,
    widthMM: 35,
    heightMM: 45,
    dpi: 300,
    headHeightMin: 70,
    headHeightMax: 80,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء صلبة، الرأس يشغل 70-80%",
    icon: IdCard,
    notes: "المواصفات الرسمية لمديرية الأحوال المدنية والجوازات والإقامة العراقية",
  },
  {
    id: "iq-passport",
    name: "جواز السفر العراقي / الإلكتروني · 35×45 ملم",
    category: "passport",
    width: 413,
    height: 531,
    widthMM: 35,
    heightMM: 45,
    dpi: 300,
    headHeightMin: 70,
    headHeightMax: 80,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء صلبة، الرأس يشغل 70-80%",
    icon: BookUser,
    notes: "المقاس الرسمي لجواز السفر العراقي المقروء آلياً والبيومتري الجديد",
  },
  {
    id: "iq-civil-id",
    name: "هوية الأحوال / الجنسية العراقية · 32×40 ملم",
    category: "id",
    width: 378,
    height: 472,
    widthMM: 32,
    heightMM: 40,
    dpi: 300,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: IdCard,
    notes: "المقاس التقليدي لهوية الأحوال المدنية وشهادة الجنسية العراقية",
  },
  {
    id: "iq-general-id",
    name: "المعاملات العراقية / هوية النقابة · 40×60 ملم",
    category: "id",
    width: 472,
    height: 709,
    widthMM: 40,
    heightMM: 60,
    dpi: 300,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: IdCard,
    notes: "مقاس صورة المعاملات الرسمية العامة، والجامعات، ونقابات المهن العراقية",
  },
  {
    id: "iq-pension",
    name: "معاملات المتقاعدين والدوائر · 30×40 ملم",
    category: "id",
    width: 354,
    height: 472,
    widthMM: 30,
    heightMM: 40,
    dpi: 300,
    background: "#FFFFFF",
    backgroundHint: "خلفية بيضاء",
    icon: IdCard,
    notes: "المقاس المستخدم لهوية المتقاعدين وبطاقات الرعاية الاجتماعية والدوائر العامة في العراق",
  },

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
  physicalLayout?: {
    type: string;
    rows: number;
    cols: number;
    align?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };
}

export const COLLAGE_TEMPLATES: CollageTemplate[] = [
  {
    id: "collage-6v-row",
    name: "ست صور سطر واحد (1×6)",
    slots: 6,
    cells: Array.from({ length: 6 }, (_, i) => ({
      x: i / 6,
      y: 0,
      w: 1 / 6,
      h: 1,
    })),
    icon: Columns4,
  },
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
    id: "collage-3v",
    name: "ثلاث صور عمودية",
    slots: 3,
    cells: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
    icon: Columns4,
  },
  {
    id: "collage-3h",
    name: "ثلاث صور أفقية",
    slots: 3,
    cells: [
      { x: 0, y: 0, w: 1, h: 1 / 3 },
      { x: 0, y: 1 / 3, w: 1, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 1, h: 1 / 3 },
    ],
    icon: LayoutPanelTop,
  },
  {
    id: "collage-5",
    name: "خمس صور (2×3 مختلط)",
    slots: 5,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
    ],
    icon: LayoutGrid,
  },
  {
    id: "collage-12",
    name: "١٢ صورة (4×3)",
    slots: 12,
    cells: Array.from({ length: 12 }, (_, i) => ({
      x: (i % 4) / 4,
      y: Math.floor(i / 4) / 3,
      w: 1 / 4,
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
  {
    id: "collage-iq-mixed",
    name: "طقم هوية ومعاملات عراقية (مختلط)",
    slots: 6,
    cells: [
      // 4 صور 35×45 ملم (يسار)
      { x: 0.0473, y: 0.0714, w: 0.2365, h: 0.4286 },
      { x: 0.2973, y: 0.0714, w: 0.2365, h: 0.4286 },
      { x: 0.0473, y: 0.5190, w: 0.2365, h: 0.4286 },
      { x: 0.2973, y: 0.5190, w: 0.2365, h: 0.4286 },
      // 2 صورة 60×40 ملم (يمين)
      { x: 0.5473, y: 0.1095, w: 0.4054, h: 0.3810 },
      { x: 0.5473, y: 0.5350, w: 0.4054, h: 0.3810 },
    ],
    icon: ClipboardList,
    physicalLayout: { type: "iq-mixed", rows: 2, cols: 3, align: "center" }
  },
  {
    id: "collage-iq-national",
    name: "ورقة البطاقة الوطنية وجواز السفر (8 صور)",
    slots: 8,
    cells: [
      { x: 0.0068, y: 0.0619, w: 0.2365, h: 0.4286 },
      { x: 0.2568, y: 0.0619, w: 0.2365, h: 0.4286 },
      { x: 0.5068, y: 0.0619, w: 0.2365, h: 0.4286 },
      { x: 0.7568, y: 0.0619, w: 0.2365, h: 0.4286 },
      { x: 0.0068, y: 0.5095, w: 0.2365, h: 0.4286 },
      { x: 0.2568, y: 0.5095, w: 0.2365, h: 0.4286 },
      { x: 0.5068, y: 0.5095, w: 0.2365, h: 0.4286 },
      { x: 0.7568, y: 0.5095, w: 0.2365, h: 0.4286 },
    ],
    icon: ClipboardList,
    physicalLayout: { type: "iq-national-id", rows: 2, cols: 4, align: "center" }
  },
  {
    id: "collage-iq-civil",
    name: "ورقة الأحوال والجنسية العراقية (8 صور)",
    slots: 8,
    cells: [
      { x: 0.0473, y: 0.1095, w: 0.2162, h: 0.3810 },
      { x: 0.2770, y: 0.1095, w: 0.2162, h: 0.3810 },
      { x: 0.5068, y: 0.1095, w: 0.2162, h: 0.3810 },
      { x: 0.7365, y: 0.1095, w: 0.2162, h: 0.3810 },
      { x: 0.0473, y: 0.5095, w: 0.2162, h: 0.3810 },
      { x: 0.2770, y: 0.5095, w: 0.2162, h: 0.3810 },
      { x: 0.5068, y: 0.5095, w: 0.2162, h: 0.3810 },
      { x: 0.7365, y: 0.5095, w: 0.2162, h: 0.3810 },
    ],
    icon: ClipboardList,
    physicalLayout: { type: "iq-civil-id", rows: 2, cols: 4, align: "center" }
  },
  {
    id: "collage-iq-pension",
    name: "ورقة معاملات المتقاعدين والدوائر (8 صور)",
    slots: 8,
    cells: [
      { x: 0.0743, y: 0.1095, w: 0.2027, h: 0.3810 },
      { x: 0.2905, y: 0.1095, w: 0.2027, h: 0.3810 },
      { x: 0.5068, y: 0.1095, w: 0.2027, h: 0.3810 },
      { x: 0.7230, y: 0.1095, w: 0.2027, h: 0.3810 },
      { x: 0.0743, y: 0.5095, w: 0.2027, h: 0.3810 },
      { x: 0.2905, y: 0.5095, w: 0.2027, h: 0.3810 },
      { x: 0.5068, y: 0.5095, w: 0.2027, h: 0.3810 },
      { x: 0.7230, y: 0.5095, w: 0.2027, h: 0.3810 },
    ],
    icon: ClipboardList,
    physicalLayout: { type: "iq-transactions", rows: 2, cols: 4, align: "center" }
  },
  {
    id: "collage-iq-general",
    name: "ورقة المعاملات العامة والجامعات (4 صور)",
    slots: 4,
    cells: [
      { x: 0.0878, y: 0.1095, w: 0.4054, h: 0.3810 },
      { x: 0.5068, y: 0.1095, w: 0.4054, h: 0.3810 },
      { x: 0.0878, y: 0.5095, w: 0.4054, h: 0.3810 },
      { x: 0.5068, y: 0.5095, w: 0.4054, h: 0.3810 },
    ],
    icon: ClipboardList,
    physicalLayout: { type: "iq-general-id", rows: 2, cols: 2, align: "center" }
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
  { id: "enhance", name: "تحسين تلقائي", css: "contrast(1.08) saturate(1.12) brightness(1.02)", preview: "contrast(1.08) saturate(1.12) brightness(1.02)" },
  { id: "skinGlow", name: "نضارة البشرة", css: "brightness(1.06) contrast(0.94) saturate(1.08) sepia(10%)", preview: "brightness(1.06) contrast(0.94) saturate(1.08) sepia(10%)" },
  { id: "clarity", name: "تفاصيل فائقة", css: "contrast(1.22) saturate(1.2) brightness(0.98)", preview: "contrast(1.22) saturate(1.2) brightness(0.98)" },
  { id: "lowlight", name: "معالجة الظلال", css: "brightness(1.16) contrast(0.9) saturate(1.05)", preview: "brightness(1.16) contrast(0.9) saturate(1.05)" },
  { id: "cinematic", name: "ألوان سينمائية", css: "contrast(1.1) saturate(1.15) sepia(5%) brightness(1.02)", preview: "contrast(1.1) saturate(1.15) sepia(5%) brightness(1.02)" },
  { id: "monoPro", name: "أحادي فاخر", css: "grayscale(100%) contrast(1.25) brightness(1.02)", preview: "grayscale(100%) contrast(1.25) brightness(1.02)" },
];

// ألوان خلفية جاهزة
export const BACKGROUND_COLORS: { name: string; value: string }[] = [
  { name: "أبيض", value: "#FFFFFF" },
  { name: "أزرق فاتح", value: "#E8F0FE" },
  { name: "أحمر", value: "#E53E3E" },
  { name: "سماوي", value: "#00B5D8" },
  { name: "أخضر", value: "#38A169" },
  { name: "قرمزي", value: "#D53F8C" },
  { name: "أزرق", value: "#3182CE" },
  { name: "برتقالي", value: "#DD6B20" },
];

export function getEffectiveDpi(W: number, H: number, storedDpi: number = 300): number {
  let dpi = storedDpi;
  outerLoop:
  for (const paper of PAPER_SIZES) {
    for (const [pW, pH] of [
      [paper.widthMM, paper.heightMM],
      [paper.heightMM, paper.widthMM],
    ] as [number, number][]) {
      const expectedW = (pW * storedDpi) / 25.4;
      const expectedH = (pH * storedDpi) / 25.4;
      if (
        Math.abs(W - expectedW) / expectedW < 0.02 &&
        Math.abs(H - expectedH) / expectedH < 0.02
      ) {
        const dpiFromW = (W * 25.4) / pW;
        const dpiFromH = (H * 25.4) / pH;
        dpi = (dpiFromW + dpiFromH) / 2;
        break outerLoop;
      }
    }
  }
  return dpi;
}

function getGridCells(
  cols: number,
  rows: number,
  wMM: number,
  hMM: number,
  gapMM: number,
  paperW: number,
  paperH: number,
  align: string = "center",
  marginMM: number = 4
) {
  const marginX = marginMM;
  const marginY = marginMM;
  const availW = paperW - 2 * marginX;
  const availH = paperH - 2 * marginY;

  const gridW_raw = cols * wMM + (cols - 1) * gapMM;
  const gridH_raw = rows * hMM + (rows - 1) * gapMM;

  let scale = 1;
  const tolerance = 0.15; // 0.15 mm tolerance for floating point rounding
  if (gridW_raw > availW + tolerance || gridH_raw > availH + tolerance) {
    scale = Math.min(availW / gridW_raw, availH / gridH_raw);
  }

  const finalCellW = wMM * scale;
  const finalCellH = hMM * scale;
  const finalGap = gapMM * scale;

  const gridW = cols * finalCellW + (cols - 1) * finalGap;
  const gridH = rows * finalCellH + (rows - 1) * finalGap;

  let startX = (paperW - gridW) / 2;
  let startY = (paperH - gridH) / 2;

  if (align === "top-left") {
    startX = marginX;
    startY = marginY;
  } else if (align === "top-right") {
    startX = paperW - marginX - gridW;
    startY = marginY;
  } else if (align === "bottom-left") {
    startX = marginX;
    startY = paperH - marginY - gridH;
  } else if (align === "bottom-right") {
    startX = paperW - marginX - gridW;
    startY = paperH - marginY - gridH;
  }

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: (startX + c * (finalCellW + finalGap)) / paperW,
        y: (startY + r * (finalCellH + finalGap)) / paperH,
        w: finalCellW / paperW,
        h: finalCellH / paperH,
      });
    }
  }
  return cells;
}

function getMixedCells(
  paperW: number,
  paperH: number,
  gapMM: number,
  align: string = "center",
  marginMM: number = 4
) {
  const marginX = marginMM;
  const marginY = marginMM;
  const availW = paperW - 2 * marginX;
  const availH = paperH - 2 * marginY;

  const leftW = 2 * 35 + gapMM;
  const leftH = 2 * 45 + gapMM;
  const rightW = 60;
  const rightH = 2 * 40 + gapMM;

  const totalW_raw = leftW + gapMM + rightW;
  const totalH_raw = Math.max(leftH, rightH);

  let scale = 1;
  if (totalW_raw > availW || totalH_raw > availH) {
    scale = Math.min(availW / totalW_raw, availH / totalH_raw);
  }

  const final35 = 35 * scale;
  const final45 = 45 * scale;
  const final60 = 60 * scale;
  const final40 = 40 * scale;
  const finalGap = gapMM * scale;

  const finalLeftW = 2 * final35 + finalGap;
  const finalLeftH = 2 * final45 + finalGap;
  const finalRightW = final60;
  const finalRightH = 2 * final40 + finalGap;

  const gridW = finalLeftW + finalGap + finalRightW;
  const gridH = Math.max(finalLeftH, finalRightH);

  let startX = (paperW - gridW) / 2;
  let startY = (paperH - gridH) / 2;

  if (align === "top-left") {
    startX = marginX;
    startY = marginY;
  } else if (align === "top-right") {
    startX = paperW - marginX - gridW;
    startY = marginY;
  } else if (align === "bottom-left") {
    startX = marginX;
    startY = paperH - marginY - gridH;
  } else if (align === "bottom-right") {
    startX = paperW - marginX - gridW;
    startY = paperH - marginY - gridH;
  }

  const cells = [];

  // Left 2x2 grid of 35x45 mm (4 slots)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      cells.push({
        x: (startX + c * (final35 + finalGap)) / paperW,
        y: (startY + (gridH - finalLeftH) / 2 + r * (final45 + finalGap)) / paperH,
        w: final35 / paperW,
        h: final45 / paperH,
      });
    }
  }

  // Right 1x2 grid of 60x40 mm (2 slots)
  for (let r = 0; r < 2; r++) {
    cells.push({
      x: (startX + finalLeftW + finalGap) / paperW,
      y: (startY + (gridH - finalRightH) / 2 + r * (final40 + finalGap)) / paperH,
      w: final60 / paperW,
      h: final40 / paperH,
    });
  }

  return cells;
}

export function computeDynamicCollageCells(
  template: CollageTemplate,
  canvasW: number,
  canvasH: number,
  dpi: number,
  collageGap: number = 0,
  collageMargin: number = 0
): { x: number; y: number; w: number; h: number }[] | null {
  if (!template.physicalLayout) return null;

  const { type, rows, cols, align = "center" } = template.physicalLayout;
  const paperW_mm = (canvasW / dpi) * 25.4;
  const paperH_mm = (canvasH / dpi) * 25.4;

  const gap = collageGap > 0 ? (collageGap / dpi) * 25.4 : 2.0;
  const margin = collageMargin > 0 ? (collageMargin / dpi) * 25.4 : 4.0;

  if (type === "iq-mixed") {
    return getMixedCells(paperW_mm, paperH_mm, gap, align, margin);
  }

  let wMM = 35;
  let hMM = 45;

  if (type === "iq-national-id" || type === "passport") {
    wMM = 35;
    hMM = 45;
  } else if (type === "iq-civil-id") {
    wMM = 32;
    hMM = 40;
  } else if (type === "iq-general-id" || type === "id") {
    if (template.id === "collage-iq-general") {
      wMM = 60;
      hMM = 40;
    } else {
      wMM = 40;
      hMM = 60;
    }
  } else if (type === "iq-transactions") {
    wMM = 30;
    hMM = 40;
  } else if (type === "visa") {
    wMM = 50;
    hMM = 50;
  } else {
    return null;
  }

  return getGridCells(cols, rows, wMM, hMM, gap, paperW_mm, paperH_mm, align, margin);
}
