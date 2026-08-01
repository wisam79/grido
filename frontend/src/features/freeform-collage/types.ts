export type PhotoPresetType =
  | "passport"        // 50x50 mm (جواز سفر)
  | "id"              // 35x45 mm (هوية / جنسية)
  | "visa"            // 35x45 mm (فيزا شنغن)
  | "iq-national-id" // 35x45 mm (بطاقة موحدة)
  | "iq-civil-id"    // 35x45 mm (هوية الأحوال)
  | "iq-transactions"// 30x40 mm (معاملات سريعة)
  | "custom";

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
