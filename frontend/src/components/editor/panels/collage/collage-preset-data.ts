export interface StudioPreset {
  id: string;
  title: string;
  spec: string;
  badge: string;
  slots: number;
}

/** 🎴 قوالب الشيت الكامل */
export const STUDIO_FULL_SHEET_PRESETS: StudioPreset[] = [
  { id: "collage-iq-national", title: "8 صور بطاقة وجواز", spec: "35 × 45 mm", badge: "2×4", slots: 8 },
  { id: "collage-iq-civil", title: "8 صور أحوال وجنسية", spec: "32 × 40 mm", badge: "2×4", slots: 8 },
  { id: "collage-iq-general", title: "4 صور معاملات عامة", spec: "40 × 60 mm", badge: "2×2", slots: 4 },
  { id: "collage-iq-mixed", title: "طقم معاملات مختلط", spec: "4 (35×45) + 2 (40×60) mm", badge: "طقم", slots: 6 },
  { id: "collage-4", title: "4 صور متساوية", spec: "2 × 2 شبكة متساوية", badge: "2×2", slots: 4 },
  { id: "collage-8", title: "8 صور متساوية", spec: "4 × 2 شبكة متساوية", badge: "4×2", slots: 8 },
];

/** 📏 قوالب الصف الواحد (Single Row Strip) — الأكثر طلباً للطباعة والقص السريع */
export const STUDIO_SINGLE_ROW_PRESETS: StudioPreset[] = [
  { id: "collage-iq-national-row4", title: "4 صور جواز وبطاقة", spec: "35 × 45 mm", badge: "1×4", slots: 4 },
  { id: "collage-iq-civil-row4", title: "4 صور أحوال وجنسية", spec: "32 × 40 mm", badge: "1×4", slots: 4 },
  { id: "collage-iq-general-row2", title: "صورتان معاملات عامة", spec: "40 × 60 mm", badge: "1×2", slots: 2 },
  { id: "collage-iq-pension-row4", title: "4 صور متقاعدين", spec: "30 × 40 mm", badge: "1×4", slots: 4 },
  { id: "collage-1x4-row", title: "4 صور متساوية", spec: "تمدد حر متساوي", badge: "1×4", slots: 4 },
  { id: "collage-6v-row", title: "6 صور متساوية", spec: "تمدد حر متساوي", badge: "1×6", slots: 6 },
  { id: "collage-1x3-row", title: "3 صور متساوية", spec: "تمدد حر متساوي", badge: "1×3", slots: 3 },
  { id: "collage-2h", title: "صورتان متساويتان", spec: "أفقي متساوي", badge: "1×2", slots: 2 },
];
