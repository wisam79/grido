import { LayoutGrid, LayoutPanelTop, Grid2x2, Grid3x3, Grid3x2, Columns4, ClipboardList } from 'lucide-react';
import type { CollageTemplate } from './types';

export const COLLAGE_TEMPLATES: CollageTemplate[] = [
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