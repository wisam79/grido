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
