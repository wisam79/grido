import { SquaresFour, GridFour } from "@phosphor-icons/react";
import type { CollageTemplate } from './types';

export const COLLAGE_TEMPLATES: CollageTemplate[] = [
  // --- 🎴 قوالب الاستوديو الرسمية (شيت كامل) ---
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
    icon: SquaresFour,
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
    icon: SquaresFour,
    physicalLayout: { type: "iq-civil-id", rows: 2, cols: 4, align: "center" }
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
    icon: SquaresFour,
    physicalLayout: { type: "iq-general-id", rows: 2, cols: 2, align: "center" }
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
    icon: SquaresFour,
    physicalLayout: { type: "iq-mixed", rows: 2, cols: 3, align: "center" }
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
    icon: SquaresFour,
    physicalLayout: { type: "iq-transactions", rows: 2, cols: 4, align: "center" }
  },
  {
    id: "collage-iq-national-full-a4",
    name: "شيت A4 كامل - بطاقة وجواز (30 صورة)",
    slots: 30,
    cells: Array.from({ length: 30 }, (_, i) => ({
      x: (i % 5) / 5,
      y: Math.floor(i / 5) / 6,
      w: 1 / 5,
      h: 1 / 6,
    })),
    icon: SquaresFour,
    physicalLayout: { type: "iq-national-id", rows: 6, cols: 5, align: "center" }
  },
  {
    id: "collage-iq-general-full-a4",
    name: "شيت A4 كامل - معاملات عامة (16 صورة)",
    slots: 16,
    cells: Array.from({ length: 16 }, (_, i) => ({
      x: (i % 4) / 4,
      y: Math.floor(i / 4) / 4,
      w: 1 / 4,
      h: 1 / 4,
    })),
    icon: SquaresFour,
    physicalLayout: { type: "iq-general-id", rows: 4, cols: 4, align: "center" }
  },
  {
    id: "collage-iq-national-corner",
    name: "طقم زاوية اقتصادي - جواز (8 صور)",
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
    physicalLayout: { type: "iq-national-id", rows: 2, cols: 4, align: "top-left" }
  },

  // --- 📏 قوالب الاستوديو الرسمية (صف واحد / شريط للاستخدام السريع والقص من أقصى اليسار) ---
  {
    id: "collage-iq-national-row4",
    name: "شريط بطاقة وجواز (صف واحد - 4 صور)",
    slots: 4,
    cells: [
      { x: 0, y: 0, w: 0.2365, h: 0.4286 },
      { x: 0.2365, y: 0, w: 0.2365, h: 0.4286 },
      { x: 0.4730, y: 0, w: 0.2365, h: 0.4286 },
      { x: 0.7095, y: 0, w: 0.2365, h: 0.4286 },
    ],
    icon: GridFour,
    physicalLayout: { type: "iq-national-id", rows: 1, cols: 4, align: "top-left" }
  },
  {
    id: "collage-iq-civil-row4",
    name: "شريط أحوال وجنسية (صف واحد - 4 صور)",
    slots: 4,
    cells: [
      { x: 0, y: 0, w: 0.2162, h: 0.3810 },
      { x: 0.2162, y: 0, w: 0.2162, h: 0.3810 },
      { x: 0.4324, y: 0, w: 0.2162, h: 0.3810 },
      { x: 0.6486, y: 0, w: 0.2162, h: 0.3810 },
    ],
    icon: GridFour,
    physicalLayout: { type: "iq-civil-id", rows: 1, cols: 4, align: "top-left" }
  },
  {
    id: "collage-iq-general-row2",
    name: "شريط معاملات عامة (صف واحد - صورتان)",
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 0.4054, h: 0.3810 },
      { x: 0.4054, y: 0, w: 0.4054, h: 0.3810 },
    ],
    icon: GridFour,
    physicalLayout: { type: "iq-general-id", rows: 1, cols: 2, align: "top-left" }
  },
  {
    id: "collage-iq-pension-row4",
    name: "شريط متقاعدين ومعاملات (صف واحد - 4 صور)",
    slots: 4,
    cells: [
      { x: 0, y: 0, w: 0.2027, h: 0.3810 },
      { x: 0.2027, y: 0, w: 0.2027, h: 0.3810 },
      { x: 0.4054, y: 0, w: 0.2027, h: 0.3810 },
      { x: 0.6081, y: 0, w: 0.2027, h: 0.3810 },
    ],
    icon: GridFour,
    physicalLayout: { type: "iq-transactions", rows: 1, cols: 4, align: "top-left" }
  },

  // --- 📐 قوالب شبكية عامة وتمدد حر ---
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
    icon: GridFour,
  },
  {
    id: "collage-1x4-row",
    name: "أربع صور سطر واحد (1×4)",
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
    id: "collage-6v-row",
    name: "ست صور سطر واحد (1×6)",
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
    id: "collage-1x3-row",
    name: "ثلاث صور سطر واحد (1×3)",
    slots: 3,
    cells: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
    icon: GridFour,
  },
  {
    id: "collage-2h",
    name: "صورتان أفقي سطر واحد (1×2)",
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
    icon: GridFour,
  },
  {
    id: "collage-2v",
    name: "صورتان عمودي (2×1)",
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
    icon: GridFour,
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
    icon: GridFour,
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
    icon: GridFour,
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
    icon: GridFour,
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
    icon: GridFour,
  },

  // --- 🌟 أطقم الاستوديو التجارية المركبة (Studio Combos) ---
  {
    id: "collage-combo-traveler",
    name: "طقم المسافر المزدوج (جوازات + فيزا)",
    slots: 6,
    cells: [
      { x: 0.025, y: 0.025, w: 0.465, h: 0.32, presetType: "passport", label: "جواز 5×5" },
      { x: 0.51, y: 0.025, w: 0.465, h: 0.32, presetType: "passport", label: "جواز 5×5" },
      { x: 0.025, y: 0.365, w: 0.465, h: 0.29, presetType: "visa", label: "فيزا 3.5×4.5" },
      { x: 0.51, y: 0.365, w: 0.465, h: 0.29, presetType: "visa", label: "فيزا 3.5×4.5" },
      { x: 0.025, y: 0.675, w: 0.465, h: 0.29, presetType: "visa", label: "فيزا 3.5×4.5" },
      { x: 0.51, y: 0.675, w: 0.465, h: 0.29, presetType: "visa", label: "فيزا 3.5×4.5" },
    ],
    icon: SquaresFour,
  },
  {
    id: "collage-combo-student",
    name: "طقم التقديم والجامعات (بطاقة + معاملات + بورتريه)",
    slots: 7,
    cells: [
      { x: 0.025, y: 0.025, w: 0.465, h: 0.30, presetType: "iq-national-id", label: "بطاقة 3.5×4.5" },
      { x: 0.51, y: 0.025, w: 0.465, h: 0.30, presetType: "iq-national-id", label: "بطاقة 3.5×4.5" },
      { x: 0.025, y: 0.345, w: 0.465, h: 0.30, presetType: "iq-national-id", label: "بطاقة 3.5×4.5" },
      { x: 0.51, y: 0.345, w: 0.465, h: 0.30, presetType: "iq-national-id", label: "بطاقة 3.5×4.5" },
      { x: 0.025, y: 0.665, w: 0.465, h: 0.31, presetType: "portrait-4x6", label: "بورتريه 4×6" },
      { x: 0.51, y: 0.665, w: 0.465, h: 0.145, presetType: "iq-transactions", label: "معاملة 3×4" },
      { x: 0.51, y: 0.83, w: 0.465, h: 0.145, presetType: "iq-transactions", label: "معاملة 3×4" },
    ],
    icon: SquaresFour,
  },
  {
    id: "collage-combo-family",
    name: "طقم الاستوديو العائلي (صورة رئيسية + شخصية)",
    slots: 7,
    cells: [
      { x: 0.025, y: 0.025, w: 0.68, h: 0.655, presetType: "photo-10x15", label: "صورة عائلية" },
      { x: 0.725, y: 0.025, w: 0.25, h: 0.3175, presetType: "id", label: "شخصية 1" },
      { x: 0.725, y: 0.3625, w: 0.25, h: 0.3175, presetType: "id", label: "شخصية 2" },
      { x: 0.025, y: 0.70, w: 0.226, h: 0.275, presetType: "id", label: "شخصية 3" },
      { x: 0.266, y: 0.70, w: 0.226, h: 0.275, presetType: "id", label: "شخصية 4" },
      { x: 0.507, y: 0.70, w: 0.226, h: 0.275, presetType: "id", label: "شخصية 5" },
      { x: 0.749, y: 0.70, w: 0.226, h: 0.275, presetType: "id", label: "شخصية 6" },
    ],
    icon: SquaresFour,
  },

  // --- 🎁 قوالب المحفظة والتذكارات (Keepsakes & Wallet) ---
  {
    id: "collage-wallet-cards",
    name: "طبعة بطاقات المحفظة (بطاقتان + 4 شخصية)",
    slots: 6,
    cells: [
      { x: 0.025, y: 0.025, w: 0.465, h: 0.64, presetType: "wallet", label: "بطاقة محفظة 1" },
      { x: 0.51, y: 0.025, w: 0.465, h: 0.64, presetType: "wallet", label: "بطاقة محفظة 2" },
      { x: 0.025, y: 0.685, w: 0.226, h: 0.29, presetType: "id", label: "مصغرة 1" },
      { x: 0.266, y: 0.685, w: 0.226, h: 0.29, presetType: "id", label: "مصغرة 2" },
      { x: 0.507, y: 0.685, w: 0.226, h: 0.29, presetType: "id", label: "مصغرة 3" },
      { x: 0.749, y: 0.685, w: 0.226, h: 0.29, presetType: "id", label: "مصغرة 4" },
    ],
    icon: SquaresFour,
  },
  {
    id: "collage-photobooth-strip",
    name: "شريط فوتوبوث ستوديو (شريطان × 3 لقطات)",
    slots: 6,
    cells: [
      { x: 0.025, y: 0.025, w: 0.465, h: 0.30, presetType: "custom", label: "فوتوبوث 1A" },
      { x: 0.025, y: 0.345, w: 0.465, h: 0.30, presetType: "custom", label: "فوتوبوث 1B" },
      { x: 0.025, y: 0.665, w: 0.465, h: 0.30, presetType: "custom", label: "فوتوبوث 1C" },
      { x: 0.51, y: 0.025, w: 0.465, h: 0.30, presetType: "custom", label: "فوتوبوث 2A" },
      { x: 0.51, y: 0.345, w: 0.465, h: 0.30, presetType: "custom", label: "فوتوبوث 2B" },
      { x: 0.51, y: 0.665, w: 0.465, h: 0.30, presetType: "custom", label: "فوتوبوث 2C" },
    ],
    icon: GridFour,
  },
  {
    id: "collage-flush-cut-8",
    name: "شبكة متلاصقة للقص الفوري (8 صور - صفر هدر)",
    slots: 8,
    cells: [
      { x: 0, y: 0, w: 0.25, h: 0.50, presetType: "iq-national-id", label: "1" },
      { x: 0.25, y: 0, w: 0.25, h: 0.50, presetType: "iq-national-id", label: "2" },
      { x: 0.50, y: 0, w: 0.25, h: 0.50, presetType: "iq-national-id", label: "3" },
      { x: 0.75, y: 0, w: 0.25, h: 0.50, presetType: "iq-national-id", label: "4" },
      { x: 0, y: 0.50, w: 0.25, h: 0.50, presetType: "iq-national-id", label: "5" },
      { x: 0.25, y: 0.50, w: 0.25, h: 0.50, presetType: "iq-national-id", label: "6" },
      { x: 0.50, y: 0.50, w: 0.25, h: 0.50, presetType: "iq-national-id", label: "7" },
      { x: 0.75, y: 0.50, w: 0.25, h: 0.50, presetType: "iq-national-id", label: "8" },
    ],
    icon: GridFour,
  },
];
