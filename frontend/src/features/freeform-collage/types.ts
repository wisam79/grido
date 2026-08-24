export type PhotoPresetType =
  | "passport"        // 50x50 mm (جواز سفر)
  | "id"              // 35x45 mm (هوية / جنسية)
  | "visa"            // 35x45 mm (فيزا شنغن)
  | "iq-national-id" // 35x45 mm (بطاقة موحدة)
  | "iq-civil-id"    // 35x45 mm (هوية الأحوال)
  | "iq-transactions"// 30x40 mm (معاملات سريعة)
  | "portrait-4x6"   // 40x60 mm (بورتريه شخصي)
  | "photo-10x15"    // 100x150 mm (صورة استوديو كلاسيكية)
  | "custom";

export type SlotAlignment =
  | "top-left"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "center-h"
  | "center-v";

export type DistributionAxis = "horizontal" | "vertical";

export type AutoPackStrategy =
  | "id-max"            // أقصى عدد لصور الهوية والبطاقة (35×45 مم)
  | "passport-max"      // أقصى عدد لصور الجواز (50×50 مم)
  | "transactions-max"  // أقصى عدد لصور المعاملات (30×40 مم)
  | "combo-standard"    // خليط قياسي (جوازات + بطاقات)
  | "combo-family";     // خليط عائلي (صورة كبيرة + صور شخصية)

export interface FreeformSlot {
  id: string;
  x: number; // 0 to 1 relative
  y: number; // 0 to 1 relative
  w: number; // 0 to 1 relative
  h: number; // 0 to 1 relative
  label?: string;
  presetType?: PhotoPresetType;
  color?: string;
  rotation?: 0 | 90 | 180 | 270; // درجة تدوير الخلية
  lockAspect?: boolean;
}

export interface FreeformLayout {
  id: string;
  name: string;
  description?: string;
  paperWidthMM: number;
  paperHeightMM: number;
  slots: FreeformSlot[];
}

export interface MixedPreset {
  id: string;
  name: string;
  nameAr: string;
  category?: "10x15" | "13x18" | "a4" | "custom";
  paperWidthMM: number;
  paperHeightMM: number;
  description: string;
  iconName: string;
  slots: FreeformSlot[];
}

export interface SnapLine {
  id: string;
  axis: "x" | "y";
  position: number; // 0 to 1 relative
}
