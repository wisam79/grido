export type CollagePresetCategory = "all" | "combo" | "keepsake" | "saved";

export interface StudioPreset {
  id: string;
  title: string;
  spec: string;
  badge: string;
  slots: number;
  category?: CollagePresetCategory;
  tag?: string;
}

/** 🌟 أطقم الاستوديو التجارية المركبة (Studio Combos) — تجمع مقاسات متعددة لا توفرها الشبكة العادية */
export const STUDIO_COMBO_PRESETS: StudioPreset[] = [
  {
    id: "collage-combo-traveler",
    title: "طقم سفر",
    spec: "2 جواز (50×50) + 4 فيزا (35×45 مم)",
    badge: "سفر وفيزا",
    slots: 6,
    category: "combo",
    tag: "الأكثر طلباً",
  },
  {
    id: "collage-combo-student",
    title: "طقم تقديم",
    spec: "معاملات (40×60) + هوية (35×45 مم)",
    badge: "تقديم وجامعات",
    slots: 7,
    category: "combo",
    tag: "شامل",
  },
  {
    id: "collage-combo-family",
    title: "طقم عائلي",
    spec: "بورتريه كبير (90×130) + 6 شخصية",
    badge: "عائلي",
    slots: 7,
    category: "combo",
    tag: "عائلي",
  },
  {
    id: "collage-iq-mixed",
    title: "طقم هجين",
    spec: "2 معاملات (40×60) + 4 بطاقة (35×45 مم)",
    badge: "مختلط",
    slots: 6,
    category: "combo",
    tag: "معاملات",
  },
  {
    id: "collage-iq-national-corner",
    title: "طقم زاوية",
    spec: "8 صور (35×45 مم) • اقتصادي",
    badge: "توفير الورق",
    slots: 8,
    category: "combo",
    tag: "حفظ الورقة",
  },
  {
    id: "collage-flush-cut-8",
    title: "شيت متلاصق",
    spec: "8 صور (35×45 مم) • قص فوري",
    badge: "صفر هدر",
    slots: 8,
    category: "combo",
    tag: "قص فوري",
  },
];

/** 🎁 قوالب المحفظة والتذكارات الإبداعية (Keepsakes & Creative) */
export const STUDIO_KEEPSAKE_PRESETS: StudioPreset[] = [
  {
    id: "collage-wallet-cards",
    title: "كروت محفظة",
    spec: "2 بطاقة (54×86) + 4 مصغرة",
    badge: "محفظة جيب",
    slots: 6,
    category: "keepsake",
    tag: "محفظة",
  },
  {
    id: "collage-photobooth-strip",
    title: "فوتوبوث ستوديو",
    spec: "شريطان تذكاريان × 3 لقطات",
    badge: "فوتوبوث",
    slots: 6,
    category: "keepsake",
    tag: "تذكار",
  },
];

/** 🌐 كافة قوالب الاستوديو الرسمية للتصفح الشامل والبحث */
export const ALL_STUDIO_PRESETS: StudioPreset[] = [
  ...STUDIO_COMBO_PRESETS,
  ...STUDIO_KEEPSAKE_PRESETS,
];

