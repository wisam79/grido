export interface PaperSize {
  id: string;
  name: string;
  shortName?: string;
  widthMM: number;
  heightMM: number;
  inchLabel?: string;
}

export const PAPER_SIZES: PaperSize[] = [
  { id: 'a4', name: 'A4 (210×297 مم)', shortName: 'A4', widthMM: 210, heightMM: 297 },
  {
    id: '4x6',
    name: '10×15 سم (4×6 بوصة)',
    shortName: '10×15 سم',
    inchLabel: '4×6″',
    widthMM: 102,
    heightMM: 152,
  },
  {
    id: '5x7',
    name: '13×18 سم (5×7 بوصة)',
    shortName: '13×18 سم',
    inchLabel: '5×7″',
    widthMM: 127,
    heightMM: 178,
  },
  {
    id: '6x8',
    name: '15×20 سم (6×8 بوصة)',
    shortName: '15×20 سم',
    inchLabel: '6×8″',
    widthMM: 152,
    heightMM: 203,
  },
  { id: 'a5', name: 'A5 (148×210 مم)', shortName: 'A5', widthMM: 148, heightMM: 210 },
  { id: 'a6', name: 'A6 (105×148 مم)', shortName: 'A6', widthMM: 105, heightMM: 148 },
  { id: 'a3', name: 'A3 (297×420 مم)', shortName: 'A3', widthMM: 297, heightMM: 420 },
  { id: 'biz-card', name: 'كارت شخصي (85×55 مم)', shortName: '85×55', widthMM: 85, heightMM: 55 },
];

// مقاس أمريكي متقدم — مخفي افتراضياً عن مسار صور الهوية
export const ADVANCED_PAPER_SIZES: PaperSize[] = [
  {
    id: 'letter',
    name: 'Letter (8.5×11 بوصة)',
    shortName: 'Letter',
    inchLabel: '8.5×11″',
    widthMM: 216,
    heightMM: 279,
  },
];

// كل المقاسات المعروضة في قوائم تغيير المقاس والطباعة — يشمل «Letter» حتى
// يُتعرَّف عليه كمقاس قياسي بعد اختياره بدل اعتباره مقاساً مخصصاً.
export const ALL_PAPER_SIZES: PaperSize[] = [...PAPER_SIZES, ...ADVANCED_PAPER_SIZES];

export interface CardAndLabelSize {
  id: string;
  name: string;
  category: 'card' | 'tag';
  widthMM: number;
  heightMM: number;
  shape?: 'rectangle' | 'rounded-rect';
  defaultBleedMM?: number;
}

export const CARD_AND_LABEL_SIZES: CardAndLabelSize[] = [
  // كروت وبطاقات العمل والهويات
  {
    id: 'biz-card-ar',
    name: 'كارت عمل قياسي (85×55 مم)',
    category: 'card',
    widthMM: 85,
    heightMM: 55,
    shape: 'rectangle',
    defaultBleedMM: 2,
  },
  {
    id: 'biz-card-90x50',
    name: 'كارت عمل (90×50 مم)',
    category: 'card',
    widthMM: 90,
    heightMM: 50,
    shape: 'rectangle',
    defaultBleedMM: 2,
  },
  {
    id: 'id-badge-cr80',
    name: 'بطاقة هوية / شارة CR80 (86×54 مم)',
    category: 'card',
    widthMM: 85.6,
    heightMM: 54,
    shape: 'rounded-rect',
    defaultBleedMM: 2,
  },

  // ملصقات الشحن والباركود
  {
    id: 'label-barcode-40x20',
    name: 'ملصق باركود وتسميات (40×20 مم)',
    category: 'tag',
    widthMM: 40,
    heightMM: 20,
    shape: 'rectangle',
    defaultBleedMM: 1.5,
  },
  {
    id: 'label-shipping-100x150',
    name: 'ملصق بوليصة شحن (100×150 مم)',
    category: 'tag',
    widthMM: 100,
    heightMM: 150,
    shape: 'rectangle',
    defaultBleedMM: 2,
  },
];

// مرشحات الصور
export interface ImageFilter {
  id: string;
  name: string;
  css: string;
  preview: string;
}

export const IMAGE_FILTERS: ImageFilter[] = [
  { id: 'none', name: 'الأصلي', css: '', preview: '' },
  {
    id: 'enhance',
    name: 'تحسين تلقائي',
    css: 'contrast(1.08) saturate(1.12) brightness(1.02)',
    preview: 'contrast(1.08) saturate(1.12) brightness(1.02)',
  },
  {
    id: 'skinGlow',
    name: 'نضارة البشرة',
    css: 'brightness(1.06) contrast(0.94) saturate(1.08) sepia(10%)',
    preview: 'brightness(1.06) contrast(0.94) saturate(1.08) sepia(10%)',
  },
  {
    id: 'clarity',
    name: 'تفاصيل فائقة',
    css: 'contrast(1.22) saturate(1.2) brightness(0.98)',
    preview: 'contrast(1.22) saturate(1.2) brightness(0.98)',
  },
  {
    id: 'lowlight',
    name: 'معالجة الظلال',
    css: 'brightness(1.16) contrast(0.9) saturate(1.05)',
    preview: 'brightness(1.16) contrast(0.9) saturate(1.05)',
  },
  {
    id: 'cinematic',
    name: 'ألوان سينمائية — غير رسمي',
    css: 'contrast(1.1) saturate(1.15) sepia(5%) brightness(1.02)',
    preview: 'contrast(1.1) saturate(1.15) sepia(5%) brightness(1.02)',
  },
  {
    id: 'monoPro',
    name: 'أحادي فاخر',
    css: 'grayscale(100%) contrast(1.25) brightness(1.02)',
    preview: 'grayscale(100%) contrast(1.25) brightness(1.02)',
  },
  {
    id: 'pixelate',
    name: 'تعتيم بكسلي — للخصوصية',
    css: 'blur(3px)',
    preview: 'blur(3px)',
  },
  {
    id: 'threshold',
    name: 'أبيض وأسود — ختم مطبعة',
    css: 'grayscale(100%) contrast(200%)',
    preview: 'grayscale(100%) contrast(200%)',
  },
];

/**
 * الاسم المختصر للمرشح — الجزء قبل الشرح بعد الشرطة الطويلة.
 * شبكة المرشحات بأربعة أعمدة داخل لوح بعرض ~272px لا تتسع للاسم الكامل،
 * فيُعرض المختصر في الشبكة ويبقى الاسم الكامل في التلميح والاسم البرمجي.
 */
export const filterShortName = (name: string) => name.split('—')[0].trim();

// ─────────────────────────────────────────────────────────────────────────────
// ثوابت المسافات والهوامش الافتراضية لوضع الكولاج
// ─────────────────────────────────────────────────────────────────────────────

/** التباعد الافتراضي بين خلايا الكولاج بالمليمتر (2 مم) */
export const DEFAULT_COLLAGE_GAP_MM = 2;

/** الهامش الافتراضي لحدود الكولاج بالمليمتر (3 مم) */
export const DEFAULT_COLLAGE_MARGIN_MM = 3;

/** التباعد الافتراضي بين خلايا الكولاج بالبكسل بدقة 300 DPI (24 بكسل ≈ 2 مم) */
export const DEFAULT_COLLAGE_GAP_PX = 24;

/** الهامش الافتراضي لحدود الكولاج بالبكسل بدقة 300 DPI (35 بكسل ≈ 3 مم) */
export const DEFAULT_COLLAGE_MARGIN_PX = 35;
