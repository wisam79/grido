import {
  TEXT_PRESET_CATALOG,
  TEXT_PRESET_CATEGORY_LABELS,
  type TextPresetCategory,
  type TextPresetType,
} from '@/lib/templates';

// نوع تبويبات وضع التعديل الحر — مصدره سجل الأدوات الموحّد فلا يتكرّر تعريفه
export type { FreeformTab } from '@/lib/workspace-tools';

export interface ElementCategoryItem {
  id: 'badges' | 'shapes' | 'text';
  label: string;
}

export const ELEMENT_CATEGORIES: ElementCategoryItem[] = [
  { id: 'badges', label: 'شارات وأختام' },
  { id: 'shapes', label: 'أشكال وتصاميم' },
  { id: 'text', label: 'نصوص جاهزة' },
];

// أشكال الإدراج السريع — إعادة تصدير من الكتالوج الموحّد (لا قائمة ثانية
// تُصان يدوياً؛ أي شكل يُضاف للكتالوج يظهر هنا بوسم quickAccess)
export { QUICK_SHAPES } from '@/lib/io/shape-catalog';

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

export interface CanvasSizePreset {
  id: string;
  name: string;
  category: 'photo' | 'standard' | 'cards';
  widthMM: number;
  heightMM: number;
  widthPx: number;
  heightPx: number;
  dpi: number;
  tag: string;
}

export const CANVAS_SIZE_PRESETS: CanvasSizePreset[] = [
  // 📸 ورق صور فوتوغرافية (Photo Paper)
  {
    id: 'preset-photo-4x6',
    name: '10×15 سم (4×6 بوصة)',
    category: 'photo',
    widthMM: 102,
    heightMM: 152,
    widthPx: Math.round((102 / 25.4) * 300),
    heightPx: Math.round((152 / 25.4) * 300),
    dpi: 300,
    tag: '102 × 152 مم',
  },
  {
    id: 'preset-photo-5x7',
    name: '13×18 سم (5×7 بوصة)',
    category: 'photo',
    widthMM: 127,
    heightMM: 178,
    widthPx: Math.round((127 / 25.4) * 300),
    heightPx: Math.round((178 / 25.4) * 300),
    dpi: 300,
    tag: '127 × 178 مم',
  },
  {
    id: 'preset-paper-a6',
    name: 'ورقة A6 (كروت صور)',
    category: 'photo',
    widthMM: 105,
    heightMM: 148,
    widthPx: Math.round((105 / 25.4) * 300),
    heightPx: Math.round((148 / 25.4) * 300),
    dpi: 300,
    tag: '105 × 148 مم',
  },
  {
    id: 'preset-photo-6x8',
    name: '15×20 سم (6×8 بوصة)',
    category: 'photo',
    widthMM: 152,
    heightMM: 203,
    widthPx: Math.round((152 / 25.4) * 300),
    heightPx: Math.round((203 / 25.4) * 300),
    dpi: 300,
    tag: '152 × 203 مم',
  },

  // 📄 ورق قياسي ومكتبي (Standard Commercial Paper)
  {
    id: 'preset-paper-a4',
    name: 'ورقة A4 القياسية',
    category: 'standard',
    widthMM: 210,
    heightMM: 297,
    widthPx: Math.round((210 / 25.4) * 300),
    heightPx: Math.round((297 / 25.4) * 300),
    dpi: 300,
    tag: '210 × 297 مم',
  },
  {
    id: 'preset-paper-a5',
    name: 'ورقة A5 (نصف A4)',
    category: 'standard',
    widthMM: 148,
    heightMM: 210,
    widthPx: Math.round((148 / 25.4) * 300),
    heightPx: Math.round((210 / 25.4) * 300),
    dpi: 300,
    tag: '148 × 210 مم',
  },
  {
    id: 'preset-paper-a3',
    name: 'ورقة A3 عريضة',
    category: 'standard',
    widthMM: 297,
    heightMM: 420,
    widthPx: Math.round((297 / 25.4) * 300),
    heightPx: Math.round((420 / 25.4) * 300),
    dpi: 300,
    tag: '297 × 420 مم',
  },
  {
    id: 'preset-paper-letter',
    name: 'ورقة Letter (8.5×11″)',
    category: 'standard',
    widthMM: 216,
    heightMM: 279,
    widthPx: Math.round((216 / 25.4) * 300),
    heightPx: Math.round((279 / 25.4) * 300),
    dpi: 300,
    tag: '216 × 279 مم',
  },

  // 📇 كروت وبطاقات مطبوعة (Printed Cards)
  {
    id: 'preset-card-cr80',
    name: 'بطاقة قياسية CR-80',
    category: 'cards',
    widthMM: 85,
    heightMM: 55,
    widthPx: Math.round((85 / 25.4) * 300),
    heightPx: Math.round((55 / 25.4) * 300),
    dpi: 300,
    tag: '85 × 55 مم',
  },
  {
    id: 'preset-card-business',
    name: 'كارت عمل (90×50 مم)',
    category: 'cards',
    widthMM: 90,
    heightMM: 50,
    widthPx: Math.round((90 / 25.4) * 300),
    heightPx: Math.round((50 / 25.4) * 300),
    dpi: 300,
    tag: '90 × 50 مم',
  },
];

// 🎨 هويات بصرية جاهزة ومصنفة لاستوديوهات التصوير والمصممين
export type PaletteCategory = 'all' | 'official' | 'studio' | 'business' | 'creative';

export interface IdentityPalette {
  id: string;
  name: string;
  category: 'official' | 'studio' | 'business' | 'creative';
  categoryLabel: string;
  colors: string[];
  roles: string[];
}

export const IDENTITY_PALETTES: IdentityPalette[] = [
  // ── وثائق وهوية رسمية ──────────────────────────────────────────
  {
    id: 'official-passport',
    name: 'جوازات دولية',
    category: 'official',
    categoryLabel: 'وثائق',
    colors: ['#0f2942', '#781d22', '#1b4332', '#c59b27', '#f8f6f0'],
    roles: ['كحلي رسمي', 'عنابي دولي', 'أخضر دبلوماسي', 'ذهبي ملكي', 'عاجي ناصع'],
  },
  {
    id: 'official-id',
    name: 'هوية وبطاقات وطنية',
    category: 'official',
    categoryLabel: 'وثائق',
    colors: ['#0c1e38', '#1e3a8a', '#0284c7', '#cbd5e1', '#ffffff'],
    roles: ['كحلي أمني', 'أزرق وطني', 'سماوي بارز', 'رمادي وثائق', 'أبيض ناصع'],
  },
  {
    id: 'official-visa',
    name: 'تأشيرات وإقامات',
    category: 'official',
    categoryLabel: 'وثائق',
    colors: ['#172554', '#2563eb', '#38bdf8', '#e0f2fe', '#ffffff'],
    roles: ['كحلي إداري', 'أزرق تأشيرة', 'سماوي ختم', 'ثلجي خلفية', 'أبيض ناصع'],
  },
  {
    id: 'official-stamp',
    name: 'أختام وتوثيق رسمي',
    category: 'official',
    categoryLabel: 'وثائق',
    colors: ['#831843', '#b45309', '#1e293b', '#fef3c7', '#fefce8'],
    roles: ['ختم شمعي', 'توثيق ذهبي', 'حبر أسود', 'أرشيف كلاسيكي', 'ورق رسمي'],
  },

  // ── استوديو وتصوير فوتوغرافي ─────────────────────────────────
  {
    id: 'studio-portrait',
    name: 'بورتريه كلاسيكي',
    category: 'studio',
    categoryLabel: 'استوديو',
    colors: ['#7c2d12', '#b45309', '#fed7aa', '#78716c', '#fffbeb'],
    roles: ['ترابي عميق', 'كراميل دافئ', 'درجة بشرة', 'رمادي استوديو', 'عاجي ناعم'],
  },
  {
    id: 'studio-noir',
    name: 'سينمائي ونوار',
    category: 'studio',
    categoryLabel: 'استوديو',
    colors: ['#09090b', '#27272a', '#71717a', '#e4e4e7', '#fafafa'],
    roles: ['أسود سينمائي', 'فحمي عميق', 'رمادي متوسط', 'فضي ناعم', 'أبيض بلاتيني'],
  },
  {
    id: 'studio-neon',
    name: 'إضاءة نيون استوديو',
    category: 'studio',
    categoryLabel: 'استوديو',
    colors: ['#581c87', '#06b6d4', '#d946ef', '#0f172a', '#f0fdf4'],
    roles: ['بنفسجي كهربائي', 'سيان متوهج', 'فوشيا نيون', 'أسود خلفية', 'أبيض مشع'],
  },
  {
    id: 'studio-nature',
    name: 'طبيعة وتصوير خارجي',
    category: 'studio',
    categoryLabel: 'استوديو',
    colors: ['#14532d', '#3f6212', '#a16207', '#fde047', '#f0fdf4'],
    roles: ['أخضر غابات', 'زيتوني طبيعي', 'رملي دافئ', 'إشراقة شمس', 'نسيم ناصع'],
  },

  // ── أعمال وفخامة ─────────────────────────────────────────────
  {
    id: 'business-gold',
    name: 'ذهب ملكي وأسود',
    category: 'business',
    categoryLabel: 'أعمال',
    colors: ['#09090b', '#92400e', '#d97706', '#fde68a', '#fffbeb'],
    roles: ['أسود ملكي', 'ذهب معتق', 'ذهب مشرق', 'شمبانيا راقية', 'بيج فاخر'],
  },
  {
    id: 'business-executive',
    name: 'أزرق تنفيذي ومؤسسي',
    category: 'business',
    categoryLabel: 'أعمال',
    colors: ['#0f172a', '#1d4ed8', '#3b82f6', '#e2e8f0', '#ffffff'],
    roles: ['كحلي تنفيذي', 'أزرق ملكي', 'أزرق حيوي', 'رمادي هادئ', 'أبيض ناصع'],
  },
  {
    id: 'business-emerald',
    name: 'زمردي فاخر',
    category: 'business',
    categoryLabel: 'أعمال',
    colors: ['#064e3b', '#047857', '#10b981', '#a7f3d0', '#ecfdf5'],
    roles: ['زمرد داكن', 'ياقوت أخضر', 'نعناع مشرق', 'زمرد فاتح', 'عاجي زمردي'],
  },
  {
    id: 'business-platinum',
    name: 'بلاتيني وتيتانيوم',
    category: 'business',
    categoryLabel: 'أعمال',
    colors: ['#18181b', '#3f3f46', '#a1a1aa', '#e4e4e7', '#fafafa'],
    roles: ['تيتانيوم أسود', 'جرافيت ناعم', 'بلاتيني معدني', 'فولاذي بارد', 'أبيض رخامي'],
  },

  // ── عصري وإبداعي ─────────────────────────────────────────────
  {
    id: 'creative-cyber',
    name: 'تقنية عصرية',
    category: 'creative',
    categoryLabel: 'إبداعي',
    colors: ['#0b0f19', '#2563eb', '#06b6d4', '#8b5cf6', '#f8fafc'],
    roles: ['كحلي تقني', 'أزرق كهربائي', 'سايبر سيان', 'بنفسجي ليزري', 'أبيض جليدي'],
  },
  {
    id: 'creative-pastel',
    name: 'باستيل حديث',
    category: 'creative',
    categoryLabel: 'إبداعي',
    colors: ['#fb7185', '#c084fc', '#38bdf8', '#fef08a', '#fafaf9'],
    roles: ['وردي دراقي', 'لافندر ناعم', 'سماوي مائي', 'أصفر هادئ', 'أبيض قطني'],
  },
  {
    id: 'creative-sunset',
    name: 'شمس الغروب',
    category: 'creative',
    categoryLabel: 'إبداعي',
    colors: ['#881337', '#ea580c', '#f59e0b', '#fed7aa', '#fef3c7'],
    roles: ['قرمزي غارب', 'برتقالي مشرق', 'كهرماني ذهبي', 'خوخي ناعم', 'أصفر عسلي'],
  },
  {
    id: 'creative-mono-accent',
    name: 'أحادي مع توكيد',
    category: 'creative',
    categoryLabel: 'إبداعي',
    colors: ['#000000', '#dc2626', '#525252', '#d4d4d4', '#ffffff'],
    roles: ['أسود حالك', 'أحمر توكيد', 'رمادي عميق', 'رمادي فاتح', 'أبيض ناصع'],
  },
];
