import { DocumentBulletList20Filled, Grid20Filled } from "@fluentui/react-icons";
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
    icon: DocumentBulletList20Filled,
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
    icon: DocumentBulletList20Filled,
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
    icon: DocumentBulletList20Filled,
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
    icon: DocumentBulletList20Filled,
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
    icon: DocumentBulletList20Filled,
    physicalLayout: { type: "iq-transactions", rows: 2, cols: 4, align: "center" }
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
  },
  {
    id: "collage-2h",
    name: "صورتان أفقي سطر واحد (1×2)",
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
    icon: Grid20Filled,
  },
  {
    id: "collage-2v",
    name: "صورتان عمودي (2×1)",
    slots: 2,
    cells: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0.5, y: 0.5, w: 1, h: 0.5 },
    ],
    icon: Grid20Filled,
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
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
    icon: Grid20Filled,
  },
];