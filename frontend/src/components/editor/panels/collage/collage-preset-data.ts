export type CollagePresetCategory = 'saved';

export interface StudioPreset {
  id: string;
  title: string;
  spec: string;
  badge: string;
  slots: number;
  category?: CollagePresetCategory;
  tag?: string;
}

/** تم إلغاء القوالب الثابتة لصالح قوالب المستخدم المحفوظة بالكامل لتفادي هدر الورق */
export const STUDIO_COMBO_PRESETS: StudioPreset[] = [];
export const STUDIO_KEEPSAKE_PRESETS: StudioPreset[] = [];
export const ALL_STUDIO_PRESETS: StudioPreset[] = [];
