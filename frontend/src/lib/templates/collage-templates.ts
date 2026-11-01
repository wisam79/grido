import { SquaresFour, GridFour } from '@/components/ui/icons';

import type { CollageTemplate } from './types';

/** أبعاد A4 بالمليمتر — القوالب المخبوزة أدناه تُقاس عليها ثم تُطبَّع (0..1). */
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * خلية مخبوزة من قياس ملموس على A4. القوالب المخبوزة لا تمرّ على مولّد
 * الشبكة الفيزيائي، لذا يجب أن تحمل إحداثياتها صراحةً بنفس المقاسات التي
 * يعلنها القالب — لا كسوراً اعتباطية تنحرف عن نسب الصور الحقيقية.
 */
function a4Cell(
  xMM: number,
  yMM: number,
  wMM: number,
  hMM: number,
  extra: Pick<CollageTemplate['cells'][number], 'presetType' | 'label' | 'rotation'> = {},
): CollageTemplate['cells'][number] {
  return {
    x: xMM / A4_WIDTH_MM,
    y: yMM / A4_HEIGHT_MM,
    w: wMM / A4_WIDTH_MM,
    h: hMM / A4_HEIGHT_MM,
    ...extra,
  };
}

export const COLLAGE_TEMPLATES: CollageTemplate[] = [
  // --- 🎴 قوالب الاستوديو الرسمية (شيت كامل) ---
  {
    id: 'collage-iq-national',
    name: 'ورقة البطاقة الوطنية وجواز السفر (8 صور)',
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
    icon: SquaresFour,
    physicalLayout: { type: 'iq-national-id', rows: 2, cols: 4, align: 'center' },
  },
  {
    id: 'collage-iq-civil',
    name: 'ورقة الأحوال والجنسية العراقية (8 صور)',
    slots: 8,
    cells: [
      { x: 0.0473, y: 0.1095, w: 0.2162, h: 0.381 },
      { x: 0.277, y: 0.1095, w: 0.2162, h: 0.381 },
      { x: 0.5068, y: 0.1095, w: 0.2162, h: 0.381 },
      { x: 0.7365, y: 0.1095, w: 0.2162, h: 0.381 },
      { x: 0.0473, y: 0.5095, w: 0.2162, h: 0.381 },
      { x: 0.277, y: 0.5095, w: 0.2162, h: 0.381 },
      { x: 0.5068, y: 0.5095, w: 0.2162, h: 0.381 },
      { x: 0.7365, y: 0.5095, w: 0.2162, h: 0.381 },
    ],
    icon: SquaresFour,
    physicalLayout: { type: 'iq-civil-id', rows: 2, cols: 4, align: 'center' },
  },
  {
    id: 'collage-iq-general',
    name: 'ورقة المعاملات العامة والجامعات (4 صور)',
    slots: 4,
    cells: [
      { x: 0.0878, y: 0.1095, w: 0.4054, h: 0.381 },
      { x: 0.5068, y: 0.1095, w: 0.4054, h: 0.381 },
      { x: 0.0878, y: 0.5095, w: 0.4054, h: 0.381 },
      { x: 0.5068, y: 0.5095, w: 0.4054, h: 0.381 },
    ],
    icon: SquaresFour,
    physicalLayout: { type: 'iq-general-id', rows: 2, cols: 2, align: 'center' },
  },
  {
    id: 'collage-iq-mixed',
    name: 'طقم هوية ومعاملات عراقية (مختلط)',
    slots: 6,
    cells: [
      // 4 صور 35×45 ملم (يسار)
      { x: 0.0473, y: 0.0714, w: 0.2365, h: 0.4286 },
      { x: 0.2973, y: 0.0714, w: 0.2365, h: 0.4286 },
      { x: 0.0473, y: 0.519, w: 0.2365, h: 0.4286 },
      { x: 0.2973, y: 0.519, w: 0.2365, h: 0.4286 },
      // 2 صورة 60×40 ملم (يمين)
      { x: 0.5473, y: 0.1095, w: 0.4054, h: 0.381 },
      { x: 0.5473, y: 0.535, w: 0.4054, h: 0.381 },
    ],
    icon: SquaresFour,
    physicalLayout: { type: 'iq-mixed', rows: 2, cols: 3, align: 'center' },
  },
  {
    id: 'collage-iq-pension',
    name: 'ورقة معاملات المتقاعدين والدوائر (8 صور)',
    slots: 8,
    cells: [
      { x: 0.0743, y: 0.1095, w: 0.2027, h: 0.381 },
      { x: 0.2905, y: 0.1095, w: 0.2027, h: 0.381 },
      { x: 0.5068, y: 0.1095, w: 0.2027, h: 0.381 },
      { x: 0.723, y: 0.1095, w: 0.2027, h: 0.381 },
      { x: 0.0743, y: 0.5095, w: 0.2027, h: 0.381 },
      { x: 0.2905, y: 0.5095, w: 0.2027, h: 0.381 },
      { x: 0.5068, y: 0.5095, w: 0.2027, h: 0.381 },
      { x: 0.723, y: 0.5095, w: 0.2027, h: 0.381 },
    ],
    icon: SquaresFour,
    physicalLayout: { type: 'iq-transactions', rows: 2, cols: 4, align: 'center' },
  },
  {
    id: 'collage-iq-national-full-a4',
    name: 'شيت A4 كامل - بطاقة وجواز (30 صورة)',
    slots: 30,
    cells: Array.from({ length: 30 }, (_, i) => ({
      x: (i % 5) / 5,
      y: Math.floor(i / 5) / 6,
      w: 1 / 5,
      h: 1 / 6,
    })),
    icon: SquaresFour,
    physicalLayout: { type: 'iq-national-id', rows: 6, cols: 5, align: 'center' },
  },
  {
    id: 'collage-iq-general-full-a4',
    name: 'شيت A4 كامل - معاملات عامة (16 صورة)',
    slots: 16,
    cells: Array.from({ length: 16 }, (_, i) => ({
      x: (i % 4) / 4,
      y: Math.floor(i / 4) / 4,
      w: 1 / 4,
      h: 1 / 4,
    })),
    icon: SquaresFour,
    physicalLayout: { type: 'iq-general-id', rows: 4, cols: 4, align: 'center' },
  },
  {
    id: 'collage-iq-national-corner',
    name: 'طقم زاوية اقتصادي - جواز (8 صور)',
    slots: 8,
    cells: [
      { x: 0.02, y: 0.02, w: 0.235, h: 0.43 },
      { x: 0.265, y: 0.02, w: 0.235, h: 0.43 },
      { x: 0.51, y: 0.02, w: 0.235, h: 0.43 },
      { x: 0.755, y: 0.02, w: 0.235, h: 0.43 },
      { x: 0.02, y: 0.47, w: 0.235, h: 0.43 },
      { x: 0.265, y: 0.47, w: 0.235, h: 0.43 },
      { x: 0.51, y: 0.47, w: 0.235, h: 0.43 },
      { x: 0.755, y: 0.47, w: 0.235, h: 0.43 },
    ],
    icon: SquaresFour,
    physicalLayout: { type: 'iq-national-id', rows: 2, cols: 4, align: 'top-left' },
  },

  // --- 📏 قوالب الاستوديو الرسمية (صف واحد / شريط للاستخدام السريع والقص من أقصى اليسار) ---
  {
    id: 'collage-iq-national-row4',
    name: 'شريط بطاقة وجواز (صف واحد - 4 صور)',
    slots: 4,
    cells: [
      { x: 0, y: 0, w: 0.2365, h: 0.4286 },
      { x: 0.2365, y: 0, w: 0.2365, h: 0.4286 },
      { x: 0.473, y: 0, w: 0.2365, h: 0.4286 },
      { x: 0.7095, y: 0, w: 0.2365, h: 0.4286 },
    ],
    icon: GridFour,
    physicalLayout: { type: 'iq-national-id', rows: 1, cols: 4, align: 'top-left' },
  },
  {
    id: 'collage-iq-civil-row4',
    name: 'شريط أحوال وجنسية (صف واحد - 4 صور)',
    slots: 4,
    cells: [
      { x: 0, y: 0, w: 0.2162, h: 0.381 },
      { x: 0.2162, y: 0, w: 0.2162, h: 0.381 },
      { x: 0.4324, y: 0, w: 0.2162, h: 0.381 },
      { x: 0.6486, y: 0, w: 0.2162, h: 0.381 },
    ],
    icon: GridFour,
    physicalLayout: { type: 'iq-civil-id', rows: 1, cols: 4, align: 'top-left' },
  },
  {
    id: 'collage-iq-general-row2',
    name: 'شريط معاملات عامة (صف واحد - صورتان)',
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 0.4054, h: 0.381 },
      { x: 0.4054, y: 0, w: 0.4054, h: 0.381 },
    ],
    icon: GridFour,
    physicalLayout: { type: 'iq-general-id', rows: 1, cols: 2, align: 'top-left' },
  },
  {
    id: 'collage-iq-pension-row4',
    name: 'شريط متقاعدين ومعاملات (صف واحد - 4 صور)',
    slots: 4,
    cells: [
      { x: 0, y: 0, w: 0.2027, h: 0.381 },
      { x: 0.2027, y: 0, w: 0.2027, h: 0.381 },
      { x: 0.4054, y: 0, w: 0.2027, h: 0.381 },
      { x: 0.6081, y: 0, w: 0.2027, h: 0.381 },
    ],
    icon: GridFour,
    physicalLayout: { type: 'iq-transactions', rows: 1, cols: 4, align: 'top-left' },
  },

  // --- 📐 قوالب شبكية عامة وتمدد حر ---
  {
    id: 'collage-4',
    name: 'أربع صور (2×2)',
    slots: 4,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
    icon: GridFour,
  },
  {
    id: 'collage-1x4-row',
    name: 'أربع صور سطر واحد (1×4)',
    slots: 4,
    cells: [
      { x: 0, y: 0, w: 0.25, h: 1 },
      { x: 0.25, y: 0, w: 0.25, h: 1 },
      { x: 0.5, y: 0, w: 0.25, h: 1 },
      { x: 0.75, y: 0, w: 0.25, h: 1 },
    ],
    icon: GridFour,
  },
  {
    id: 'collage-6v-row',
    name: 'ست صور سطر واحد (1×6)',
    slots: 6,
    cells: Array.from({ length: 6 }, (_, i) => ({
      x: i / 6,
      y: 0,
      w: 1 / 6,
      h: 1,
    })),
    icon: GridFour,
  },
  {
    id: 'collage-1x3-row',
    name: 'ثلاث صور سطر واحد (1×3)',
    slots: 3,
    cells: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
    icon: GridFour,
  },
  {
    id: 'collage-2h',
    name: 'صورتان أفقي سطر واحد (1×2)',
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
    icon: GridFour,
  },
  {
    id: 'collage-2v',
    name: 'صورتان عمودي (2×1)',
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
    icon: GridFour,
  },
  {
    id: 'collage-6',
    name: 'ست صور (3×2)',
    slots: 6,
    cells: Array.from({ length: 6 }, (_, i) => ({
      x: (i % 3) / 3,
      y: Math.floor(i / 3) / 2,
      w: 1 / 3,
      h: 1 / 2,
    })),
    icon: GridFour,
  },
  {
    id: 'collage-8',
    name: 'ثماني صور (4×2)',
    slots: 8,
    cells: Array.from({ length: 8 }, (_, i) => ({
      x: (i % 4) / 4,
      y: Math.floor(i / 4) / 2,
      w: 1 / 4,
      h: 1 / 2,
    })),
    icon: GridFour,
  },
  {
    id: 'collage-9',
    name: 'تسع صور (3×3)',
    slots: 9,
    cells: Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) / 3,
      y: Math.floor(i / 3) / 3,
      w: 1 / 3,
      h: 1 / 3,
    })),
    icon: GridFour,
  },
  {
    id: 'collage-12',
    name: '١٢ صورة (4×3)',
    slots: 12,
    cells: Array.from({ length: 12 }, (_, i) => ({
      x: (i % 4) / 4,
      y: Math.floor(i / 4) / 3,
      w: 1 / 4,
      h: 1 / 3,
    })),
    icon: GridFour,
  },

  // --- 🌟 أطقم الاستوديو التجارية المركبة (Studio Combos) ---
  {
    id: 'collage-combo-traveler',
    name: 'طقم المسافر المزدوج (جوازات + فيزا)',
    slots: 6,
    cells: [
      { x: 0.025, y: 0.025, w: 0.465, h: 0.32, presetType: 'passport', label: 'جواز 3.5×4.5' },
      { x: 0.51, y: 0.025, w: 0.465, h: 0.32, presetType: 'passport', label: 'جواز 3.5×4.5' },
      { x: 0.025, y: 0.365, w: 0.465, h: 0.29, presetType: 'visa', label: 'فيزا 3.5×4.5' },
      { x: 0.51, y: 0.365, w: 0.465, h: 0.29, presetType: 'visa', label: 'فيزا 3.5×4.5' },
      { x: 0.025, y: 0.675, w: 0.465, h: 0.29, presetType: 'visa', label: 'فيزا 3.5×4.5' },
      { x: 0.51, y: 0.675, w: 0.465, h: 0.29, presetType: 'visa', label: 'فيزا 3.5×4.5' },
    ],
    icon: SquaresFour,
    physicalLayout: { type: 'combo-traveler', rows: 3, cols: 2, align: 'center' },
  },
  {
    id: 'collage-combo-student',
    name: 'طقم التقديم والجامعات (بطاقة + معاملات + بورتريه)',
    slots: 7,
    isBaked: true,
    // 4 هويات 35×45 في صف علوي + بورتريه 4×6″ (101.6×152.4) +
    // معاملا 30×40 مرتّبتان عمودياً بجانبه. القياسات على A4 ثم مطبّعة.
    cells: [
      ...Array.from({ length: 4 }, (_, i) =>
        a4Cell(30.5 + i * 38, 44.8, 35, 45, {
          presetType: 'iq-national-id',
          label: 'بطاقة 3.5×4.5',
        }),
      ),
      a4Cell(36.7, 99.8, 101.6, 152.4, { presetType: 'portrait-4x6', label: 'بورتريه 4×6' }),
      a4Cell(143.3, 99.8, 30, 40, { presetType: 'iq-transactions', label: 'معاملة 3×4' }),
      a4Cell(143.3, 142.8, 30, 40, { presetType: 'iq-transactions', label: 'معاملة 3×4' }),
    ],
    icon: SquaresFour,
  },
  {
    id: 'collage-combo-family',
    name: 'طقم الاستوديو العائلي (صورة رئيسية + شخصية)',
    slots: 7,
    isBaked: true,
    // بورتريه 10×15 سم (100×150) + 6 هويات 35×45 في شبكة 2×3 بجانبه.
    cells: [
      a4Cell(16, 73.5, 100, 150, { presetType: 'photo-10x15', label: 'صورة عائلية' }),
      ...Array.from({ length: 6 }, (_, i) =>
        a4Cell(121 + (i % 2) * 38, 78 + Math.floor(i / 2) * 48, 35, 45, {
          presetType: 'id',
          label: `شخصية ${i + 1}`,
        }),
      ),
    ],
    icon: SquaresFour,
  },

  // --- 🎁 قوالب المحفظة والتذكارات (Keepsakes & Wallet) ---
  {
    id: 'collage-wallet-cards',
    name: 'طبعة بطاقات المحفظة (بطاقتان + 4 شخصية)',
    slots: 6,
    isBaked: true,
    // بطاقتا محفظة 54×86 في الأعلى + 4 هويات 35×45 في صف أسفلهما.
    cells: [
      a4Cell(49.5, 80.5, 54, 86, { presetType: 'wallet', label: 'بطاقة محفظة 1' }),
      a4Cell(106.5, 80.5, 54, 86, { presetType: 'wallet', label: 'بطاقة محفظة 2' }),
      ...Array.from({ length: 4 }, (_, i) =>
        a4Cell(30.5 + i * 38, 171.5, 35, 45, {
          presetType: 'id',
          label: `مصغرة ${i + 1}`,
        }),
      ),
    ],
    icon: SquaresFour,
  },
  {
    id: 'collage-photobooth-strip',
    name: 'شريط فوتوبوث ستوديو (شريطان × 3 لقطات)',
    slots: 6,
    isBaked: true,
    cells: [
      { x: 0.025, y: 0.025, w: 0.465, h: 0.3, presetType: 'custom', label: 'فوتوبوث 1A' },
      { x: 0.025, y: 0.345, w: 0.465, h: 0.3, presetType: 'custom', label: 'فوتوبوث 1B' },
      { x: 0.025, y: 0.665, w: 0.465, h: 0.3, presetType: 'custom', label: 'فوتوبوث 1C' },
      { x: 0.51, y: 0.025, w: 0.465, h: 0.3, presetType: 'custom', label: 'فوتوبوث 2A' },
      { x: 0.51, y: 0.345, w: 0.465, h: 0.3, presetType: 'custom', label: 'فوتوبوث 2B' },
      { x: 0.51, y: 0.665, w: 0.465, h: 0.3, presetType: 'custom', label: 'فوتوبوث 2C' },
    ],
    icon: GridFour,
  },
  {
    id: 'collage-flush-cut-8',
    name: 'شبكة متلاصقة للقص الفوري (8 صور - صفر هدر)',
    slots: 8,
    isBaked: true,
    // 8 خلايا 35×45 مم متلاصقة (4×2) على A4، بلا أي فجوة بينها.
    // كانت سابقاً كسور 0.25×0.5 فتُنتج 52.5×148.5 مم — لا 35×45.
    cells: Array.from({ length: 8 }, (_, i) =>
      a4Cell(35 + (i % 4) * 35, 103.5 + Math.floor(i / 4) * 45, 35, 45, {
        presetType: 'iq-national-id',
        label: String(i + 1),
      }),
    ),
    icon: GridFour,
  },
];
