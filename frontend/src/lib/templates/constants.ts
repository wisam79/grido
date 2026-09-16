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
  { id: "4x6", name: "4×6 بوصة (102×152 ملم)", widthMM: 102, heightMM: 152 },
  { id: "5x7", name: "5×7 بوصة (127×178 ملم)", widthMM: 127, heightMM: 178 },
];

// مقاس أمريكي متقدم — مخفي افتراضياً عن مسار صور الهوية
export const ADVANCED_PAPER_SIZES: PaperSize[] = [
  { id: "letter", name: "Letter (8.5×11 بوصة) — متقدم", widthMM: 216, heightMM: 279 },
];

export interface CardAndLabelSize {
  id: string;
  name: string;
  category: "card" | "sticker" | "tag";
  widthMM: number;
  heightMM: number;
  shape?: "rectangle" | "circle" | "rounded-rect";
  defaultBleedMM?: number;
}

export const CARD_AND_LABEL_SIZES: CardAndLabelSize[] = [
  // كروت وبطاقات العمل
  { id: "biz-card-ar", name: "كارت عمل قياسي (85×55 مم)", category: "card", widthMM: 85, heightMM: 55, shape: "rectangle", defaultBleedMM: 2 },
  { id: "biz-card-us", name: "كارت عمل أمريكي (89×51 مم)", category: "card", widthMM: 89, heightMM: 51, shape: "rectangle", defaultBleedMM: 2 },
  { id: "biz-card-sq", name: "كارت عمل مربع (65×65 مم)", category: "card", widthMM: 65, heightMM: 65, shape: "rectangle", defaultBleedMM: 2 },
  { id: "id-badge-cr80", name: "بطاقة هوية / شارة CR80 (85.6×54 مم)", category: "card", widthMM: 85.6, heightMM: 54, shape: "rounded-rect", defaultBleedMM: 2 },

  // ملصقات دائرية
  { id: "sticker-circle-30", name: "ملصق دائري قطر 30 مم", category: "sticker", widthMM: 30, heightMM: 30, shape: "circle", defaultBleedMM: 2 },
  { id: "sticker-circle-40", name: "ملصق دائري قطر 40 مم", category: "sticker", widthMM: 40, heightMM: 40, shape: "circle", defaultBleedMM: 2 },
  { id: "sticker-circle-50", name: "ملصق دائري قطر 50 مم", category: "sticker", widthMM: 50, heightMM: 50, shape: "circle", defaultBleedMM: 2 },
  { id: "sticker-circle-60", name: "ملصق دائري قطر 60 مم", category: "sticker", widthMM: 60, heightMM: 60, shape: "circle", defaultBleedMM: 2 },

  // ملصقات مستطيلة وشحن وباركود
  { id: "label-barcode-40x20", name: "ملصق باركود صغير (40×20 مم)", category: "tag", widthMM: 40, heightMM: 20, shape: "rectangle", defaultBleedMM: 1.5 },
  { id: "label-product-50x25", name: "ملصق منتج وأسعار (50×25 مم)", category: "tag", widthMM: 50, heightMM: 25, shape: "rectangle", defaultBleedMM: 1.5 },
  { id: "label-shipping-100x150", name: "ملصق بوليصة شحن (100×150 مم)", category: "tag", widthMM: 100, heightMM: 150, shape: "rectangle", defaultBleedMM: 2 },
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
  { id: "cinematic", name: "ألوان سينمائية — غير رسمي", css: "contrast(1.1) saturate(1.15) sepia(5%) brightness(1.02)", preview: "contrast(1.1) saturate(1.15) sepia(5%) brightness(1.02)" },
  { id: "monoPro", name: "أحادي فاخر", css: "grayscale(100%) contrast(1.25) brightness(1.02)", preview: "grayscale(100%) contrast(1.25) brightness(1.02)" },
];

// ألوان خلفية الاستوديو المعتمدة
export const BACKGROUND_COLORS: { name: string; value: string }[] = [
  { name: "أبيض ناصع", value: "#FFFFFF" },
  { name: "رمادي استوديو", value: "#F4F4F5" },
  { name: "رمادي حيادي", value: "#E4E4E7" },
  { name: "أزرق رسمي", value: "#2563EB" },
  { name: "أزرق سماوي", value: "#38BDF8" },
  { name: "رمادي دافئ", value: "#F5F5F4" },
  { name: "كحلي داكن", value: "#1E293B" },
  { name: "فحمي داكن", value: "#18181B" },
];
