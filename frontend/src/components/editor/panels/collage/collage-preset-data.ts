export type CollagePresetCategory = "all" | "combo" | "full" | "row" | "keepsake" | "saved";

export interface StudioPreset {
  id: string;
  title: string;
  spec: string;
  badge: string;
  slots: number;
  category?: CollagePresetCategory;
  tag?: string;
}

/** 🌟 أطقم الاستوديو التجارية المركبة (Studio Combos) */
export const STUDIO_COMBO_PRESETS: StudioPreset[] = [
  {
    id: "collage-combo-traveler",
    title: "طقم سفر",
    spec: "50×50 • 35×45 مم",
    badge: "سفر",
    slots: 6,
    category: "combo",
    tag: "سفر",
  },
  {
    id: "collage-combo-student",
    title: "طقم تقديم",
    spec: "35×45 • 40×60 مم",
    badge: "شامل",
    slots: 7,
    category: "combo",
    tag: "شامل",
  },
  {
    id: "collage-combo-family",
    title: "طقم عائلي",
    spec: "90×130 • 35×45 مم",
    badge: "عائلي",
    slots: 7,
    category: "combo",
    tag: "عائلي",
  },
  {
    id: "collage-iq-mixed",
    title: "طقم هجين",
    spec: "35×45 • 40×60 مم",
    badge: "مختلط",
    slots: 6,
    category: "combo",
  },
];

/** 🎴 قوالب الشيت الكامل (Full Sheet) */
export const STUDIO_FULL_SHEET_PRESETS: StudioPreset[] = [
  {
    id: "collage-iq-national-full-a4",
    title: "شيت A4 جواز",
    spec: "35 × 45 مم • 30 صورة",
    badge: "5×6",
    slots: 30,
    category: "full",
    tag: "أقصى عدد",
  },
  {
    id: "collage-iq-national",
    title: "شيت 10×15",
    spec: "35 × 45 مم • ستوديو",
    badge: "2×4",
    slots: 8,
    category: "full",
    tag: "شائع",
  },
  {
    id: "collage-iq-national-corner",
    title: "طقم زاوية",
    spec: "35 × 45 مم • اقتصادي",
    badge: "توفير",
    slots: 8,
    category: "full",
    tag: "حفظ الورقة",
  },
  {
    id: "collage-iq-general-full-a4",
    title: "شيت معاملات",
    spec: "40 × 60 مم • 16 صورة",
    badge: "4×4",
    slots: 16,
    category: "full",
  },
  {
    id: "collage-flush-cut-8",
    title: "شيت متلاصق",
    spec: "نصف الورقة × 2 • قص فوري",
    badge: "قص فوري",
    slots: 8,
    category: "full",
    tag: "صفر هدر",
  },
];

/** 📏 قوالب الأشرطة السريعة (Single Row Strips) */
export const STUDIO_SINGLE_ROW_PRESETS: StudioPreset[] = [
  {
    id: "collage-iq-national-row4",
    title: "شريط جواز",
    spec: "35 × 45 مم",
    badge: "1×4",
    slots: 4,
    category: "row",
    tag: "سريع",
  },
  {
    id: "collage-iq-general-row2",
    title: "شريط معاملات",
    spec: "40 × 60 مم",
    badge: "1×2",
    slots: 2,
    category: "row",
  },
];

/** 🎁 قوالب المحفظة والتذكار (Keepsakes) */
export const STUDIO_KEEPSAKE_PRESETS: StudioPreset[] = [
  {
    id: "collage-wallet-cards",
    title: "كروت محفظة",
    spec: "54 × 86 مم",
    badge: "محفظة",
    slots: 6,
    category: "keepsake",
    tag: "محفظة",
  },
  {
    id: "collage-photobooth-strip",
    title: "فوتوبوث",
    spec: "شريطان • 3 لقطات",
    badge: "فوتوبوث",
    slots: 6,
    category: "keepsake",
    tag: "تذكار",
  },
];

/** 🌐 كافة قوالب الاستوديو الرسمية للتصفح الشامل والبحث */
export const ALL_STUDIO_PRESETS: StudioPreset[] = [
  ...STUDIO_COMBO_PRESETS,
  ...STUDIO_FULL_SHEET_PRESETS,
  ...STUDIO_SINGLE_ROW_PRESETS,
  ...STUDIO_KEEPSAKE_PRESETS,
];

