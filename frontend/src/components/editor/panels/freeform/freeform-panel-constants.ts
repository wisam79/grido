import type { TextPresetType } from "@/lib/templates";
import {
  SHAPE_PATH_TRIANGLE,
  SHAPE_PATH_HEART,
  SHAPE_PATH_DIAMOND,
  SHAPE_PATH_HEXAGON,
  SHAPE_PATH_SHIELD,
  SHAPE_PATH_ARROW,
} from "@/lib/io/svg-paths";

export type FreeformTab = "layers" | "elements" | "stickers" | "shapes" | "text" | "presets";

export interface ElementCategoryItem {
  id: "badges" | "shapes" | "text";
  label: string;
}

export const ELEMENT_CATEGORIES: ElementCategoryItem[] = [
  { id: "badges", label: "شارات وأختام" },
  { id: "shapes", label: "أشكال وتصاميم" },
  { id: "text", label: "نصوص جاهزة" },
];

export interface QuickShapeItem {
  id: string;
  label: string;
  shape: "rect" | "ellipse" | "star" | "line" | "path";
  svgPath?: string;
  color?: string;
}

export const QUICK_SHAPES: QuickShapeItem[] = [
  { id: "rect", label: "مستطيل", shape: "rect", color: "#2563eb" },
  { id: "circle", label: "دائرة", shape: "ellipse", color: "#7c3aed" },
  { id: "star", label: "نجمة", shape: "star", color: "#d97706" },
  { id: "line", label: "خط فاصل", shape: "line", color: "#059669" },
  { id: "triangle", label: "مثلث", shape: "path", svgPath: SHAPE_PATH_TRIANGLE, color: "#dc2626" },
  { id: "heart", label: "قلب", shape: "path", svgPath: SHAPE_PATH_HEART, color: "#e11d48" },
  { id: "shield", label: "درع", shape: "path", svgPath: SHAPE_PATH_SHIELD, color: "#0284c7" },
  { id: "diamond", label: "معين", shape: "path", svgPath: SHAPE_PATH_DIAMOND, color: "#4f46e5" },
  { id: "hexagon", label: "مسدس", shape: "path", svgPath: SHAPE_PATH_HEXAGON, color: "#0d9488" },
  { id: "arrow", label: "سهم", shape: "path", svgPath: SHAPE_PATH_ARROW, color: "#ea580c" },
];

export type TextPresetCategory = "all" | "titles" | "effects" | "badges" | "phrases";

export interface TextFilterOption {
  id: string;
  label: string;
}

export const TEXT_FILTER_OPTIONS: TextFilterOption[] = [
  { id: "all", label: "الكل" },
  { id: "effects", label: "تأثيرات" },
  { id: "badges", label: "شارات" },
  { id: "phrases", label: "عبارات" },
];

export interface QuickTextItem {
  id: TextPresetType;
  label: string;
  description: string;
  category: "titles" | "effects" | "badges" | "phrases";
  previewColor: string;
  sampleText?: string;
}

export const QUICK_TEXT_PRESETS: QuickTextItem[] = [
  // 🏷️ 1. هرمية العناوين الأساسية
  {
    id: "heading",
    label: "عنوان رئيسي",
    description: "خط عريض وبارز",
    category: "titles",
    previewColor: "#0f172a",
    sampleText: "عنوان رئيسي",
  },
  {
    id: "subheading",
    label: "عنوان فرعي",
    description: "خط متوسط أنيق",
    category: "titles",
    previewColor: "#334155",
    sampleText: "عنوان فرعي",
  },
  {
    id: "body",
    label: "نص فقرة",
    description: "نص توضيحي وشرح مريح",
    category: "titles",
    previewColor: "#475569",
    sampleText: "اكتب وصفاً أو تفاصيل...",
  },

  // ✨ 2. تأثيرات فنية واحترافية
  {
    id: "gold-luxury",
    label: "ذهبي فاخر",
    description: "تدرج ذهبي ملكي متوهج",
    category: "effects",
    previewColor: "#d97706",
    sampleText: "استوديو الفخامة",
  },
  {
    id: "neon-glow",
    label: "نيون متوهج",
    description: "إشعاع سيبراني أزرق",
    category: "effects",
    previewColor: "#00f0ff",
    sampleText: "NEON GLOW",
  },
  {
    id: "3d-title",
    label: "ثلاثي الأبعاد",
    description: "ظل 3D مجسم وعميق",
    category: "effects",
    previewColor: "#6366f1",
    sampleText: "إصدار مجسم 3D",
  },
  {
    id: "outline-modern",
    label: "حدود عصرية",
    description: "نص مفرغ مع إطار دقيق",
    category: "effects",
    previewColor: "#059669",
    sampleText: "MODERN DESIGN",
  },

  // 🛡️ 3. شارات وتوثيق
  {
    id: "badge",
    label: "شارة كبسولة",
    description: "نص داخل خلفية كبسولة",
    category: "badges",
    previewColor: "#2563eb",
    sampleText: "استوديو احترافي",
  },
  {
    id: "studio-date",
    label: "تاريخ الاستوديو",
    description: "تاريخ وبصمة تصوير اليوم",
    category: "badges",
    previewColor: "#64748b",
    sampleText: "تاريخ الاستوديو",
  },
  {
    id: "photographer-tag",
    label: "بصمة المصور",
    description: "توثيق حقوق الاستوديو والمصور",
    category: "badges",
    previewColor: "#475569",
    sampleText: "تصوير: الاستوديو",
  },
  {
    id: "watermark",
    label: "علامة مائية",
    description: "نص مائل شبه شفاف للحماية",
    category: "badges",
    previewColor: "#94a3b8",
    sampleText: "مسودة غير معتمدة",
  },
  {
    id: "caption-card",
    label: "بطاقة وصف",
    description: "إطار كرت مع حواف ناعمة",
    category: "badges",
    previewColor: "#1e293b",
    sampleText: "بطاقة توثيق مؤطرة",
  },

  // 💬 4. عبارات ومناسبات
  {
    id: "congrats",
    label: "تهنئة وتخرج",
    description: "ألف مبروك التخرج والنجاح",
    category: "phrases",
    previewColor: "#047857",
    sampleText: "ألف مبروك النجاح",
  },
  {
    id: "sale-offer",
    label: "عروض وخصومات",
    description: "عروض كبرى · خصم 50%",
    category: "phrases",
    previewColor: "#dc2626",
    sampleText: "عروض كبرى 50%",
  },
  {
    id: "certificate",
    label: "شهادة تقدير",
    description: "شهادة شكر وتقدير رسمية",
    category: "phrases",
    previewColor: "#1e3a8a",
    sampleText: "شهادة شكر وتقدير",
  },
  {
    id: "stamp-circle",
    label: "ختم مقوّس",
    description: "نص مقوّس رسمي بحبر قرمزي",
    category: "phrases",
    previewColor: "#dc2626",
    sampleText: "معتمد وموثق رسمي",
  },
  {
    id: "special-price",
    label: "شارة تسعير",
    description: "السعر: 25,000 د.ع فقط",
    category: "phrases",
    previewColor: "#0284c7",
    sampleText: "السعر: 25,000 د.ع",
  },
];

export interface CanvasSizePreset {
  id: string;
  name: string;
  category: "id" | "print" | "social";
  widthMM?: number;
  heightMM?: number;
  widthPx: number;
  heightPx: number;
  dpi: number;
  tag: string;
}

export const CANVAS_SIZE_PRESETS: CanvasSizePreset[] = [
  // 🇮🇶 وثائق وهوية رسمية
  {
    id: "preset-iq-id",
    name: "البطاقة الوطنية الموحدة",
    category: "id",
    widthMM: 35,
    heightMM: 45,
    widthPx: Math.round((35 / 25.4) * 300),
    heightPx: Math.round((45 / 25.4) * 300),
    dpi: 300,
    tag: "35 × 45 ملم",
  },
  {
    id: "preset-iq-passport",
    name: "جواز السفر الإلكتروني",
    category: "id",
    widthMM: 35,
    heightMM: 45,
    widthPx: Math.round((35 / 25.4) * 300),
    heightPx: Math.round((45 / 25.4) * 300),
    dpi: 300,
    tag: "35 × 45 ملم",
  },
  {
    id: "preset-visa-50",
    name: "فيزا عالمية / تركية",
    category: "id",
    widthMM: 50,
    heightMM: 50,
    widthPx: Math.round((50 / 25.4) * 300),
    heightPx: Math.round((50 / 25.4) * 300),
    dpi: 300,
    tag: "50 × 50 ملم",
  },
  {
    id: "preset-driving-license",
    name: "رخصة القيادة / بطاقة ائتمان",
    category: "id",
    widthMM: 85.6,
    heightMM: 54,
    widthPx: Math.round((85.6 / 25.4) * 300),
    heightPx: Math.round((54 / 25.4) * 300),
    dpi: 300,
    tag: "85.6 × 54 ملم",
  },

  // 🖨️ كروت ومطبوعات
  {
    id: "preset-business-card",
    name: "كارت شخصي (Business Card)",
    category: "print",
    widthMM: 90,
    heightMM: 50,
    widthPx: Math.round((90 / 25.4) * 300),
    heightPx: Math.round((50 / 25.4) * 300),
    dpi: 300,
    tag: "90 × 50 ملم",
  },
  {
    id: "preset-photo-4x6cm",
    name: "صورة استوديو كلاسيكية",
    category: "print",
    widthMM: 40,
    heightMM: 60,
    widthPx: Math.round((40 / 25.4) * 300),
    heightPx: Math.round((60 / 25.4) * 300),
    dpi: 300,
    tag: "4 × 6 سم",
  },
  {
    id: "preset-postcard-4x6in",
    name: "كارت بريدي / صورة 4×6 إنش",
    category: "print",
    widthMM: 102,
    heightMM: 152,
    widthPx: Math.round((102 / 25.4) * 300),
    heightPx: Math.round((152 / 25.4) * 300),
    dpi: 300,
    tag: "10 × 15 سم",
  },
  {
    id: "preset-paper-a6",
    name: "ورقة قياسية A6",
    category: "print",
    widthMM: 105,
    heightMM: 148,
    widthPx: Math.round((105 / 25.4) * 300),
    heightPx: Math.round((148 / 25.4) * 300),
    dpi: 300,
    tag: "105 × 148 ملم",
  },
  {
    id: "preset-paper-a5",
    name: "ورقة قياسية A5",
    category: "print",
    widthMM: 148,
    heightMM: 210,
    widthPx: Math.round((148 / 25.4) * 300),
    heightPx: Math.round((210 / 25.4) * 300),
    dpi: 300,
    tag: "148 × 210 ملم",
  },
  {
    id: "preset-paper-a4",
    name: "ورقة طباعة قياسية A4",
    category: "print",
    widthMM: 210,
    heightMM: 297,
    widthPx: Math.round((210 / 25.4) * 300),
    heightPx: Math.round((297 / 25.4) * 300),
    dpi: 300,
    tag: "210 × 297 ملم",
  },

  // 📱 وسائط وشاشات
  {
    id: "preset-social-square",
    name: "منشور مربع (Square 1:1)",
    category: "social",
    widthPx: 1080,
    heightPx: 1080,
    dpi: 72,
    tag: "1080 × 1080 px",
  },
  {
    id: "preset-social-story",
    name: "قصة / ريلز (Story 9:16)",
    category: "social",
    widthPx: 1080,
    heightPx: 1920,
    dpi: 72,
    tag: "1080 × 1920 px",
  },
  {
    id: "preset-social-landscape",
    name: "غلاف عريض (Landscape 16:9)",
    category: "social",
    widthPx: 1920,
    heightPx: 1080,
    dpi: 72,
    tag: "1920 × 1080 px",
  },
];
