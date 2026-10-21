import {
  TEXT_PRESET_CATALOG,
  TEXT_PRESET_CATEGORY_LABELS,
  type TextPresetCategory,
  type TextPresetType,
} from '@/lib/templates';

// نوع تبويبات وضع التعديل الحر — مصدره سجل الأدوات الموحّد فلا يتكرّر تعريفه
export type { FreeformTab } from '@/lib/workspace-tools';

// أشكال الإدراج السريع انتقلت إلى كتالوج الأشكال الموحّد مباشرة في تبويب العناصر

export type { TextPresetCategory };

export interface TextFilterOption {
  id: string;
  label: string;
}

// فئات التصفية مشتقة من كتالوج النصوص الموحّد — لا قائمة تسميات ثانية
export const TEXT_FILTER_OPTIONS: TextFilterOption[] = [
  { id: 'all', label: 'الكل' },
  ...(Object.keys(TEXT_PRESET_CATEGORY_LABELS) as TextPresetCategory[]).map((id) => ({
    id,
    label: TEXT_PRESET_CATEGORY_LABELS[id],
  })),
];

export interface QuickTextItem {
  id: TextPresetType;
  label: string;
  description: string;
  category: TextPresetCategory;
  previewColor: string;
  sampleText: string;
}

// بطاقات النصوص الجاهزة تُشتق من الكتالوج نفسه (الاسم/الوصف/اللون/النص)
export const QUICK_TEXT_PRESETS: QuickTextItem[] = TEXT_PRESET_CATALOG.map((preset) => ({
  id: preset.id,
  label: preset.label,
  description: preset.description,
  category: preset.category,
  previewColor: preset.previewColor,
  sampleText: preset.sampleText,
}));
