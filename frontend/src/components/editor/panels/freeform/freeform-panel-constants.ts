import type { ShapeElement } from '@/lib/editor-store';
import type { TextPresetType } from '@/lib/templates';
import {
  SHAPE_PATH_TRIANGLE,
  SHAPE_PATH_HEART,
  SHAPE_PATH_DIAMOND,
  SHAPE_PATH_HEXAGON,
  SHAPE_PATH_SHIELD,
} from '@/lib/io/svg-paths';

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

export interface QuickShapeItem {
  id: string;
  label: string;
  shape: ShapeElement['shape'];
  svgPath?: string;
  color?: string;
}

export const QUICK_SHAPES: QuickShapeItem[] = [
  { id: 'rect', label: 'مستطيل', shape: 'rect', color: '#2563eb' },
  { id: 'circle', label: 'دائرة', shape: 'ellipse', color: '#7c3aed' },
  { id: 'ring', label: 'حلقة دائرية', shape: 'ring', color: '#06b6d4' },
  { id: 'polygon', label: 'مضلع سداسي', shape: 'polygon', color: '#8b5cf6' },
  { id: 'star', label: 'نجمة', shape: 'star', color: '#d97706' },
  { id: 'line', label: 'خط فاصل', shape: 'line', color: '#059669' },
  { id: 'arrow-native', label: 'سهم متجه', shape: 'arrow', color: '#ea580c' },
  { id: 'triangle', label: 'مثلث', shape: 'path', svgPath: SHAPE_PATH_TRIANGLE, color: '#dc2626' },
  { id: 'heart', label: 'قلب', shape: 'path', svgPath: SHAPE_PATH_HEART, color: '#e11d48' },
  { id: 'shield', label: 'درع', shape: 'path', svgPath: SHAPE_PATH_SHIELD, color: '#0284c7' },
  { id: 'diamond', label: 'معين', shape: 'path', svgPath: SHAPE_PATH_DIAMOND, color: '#4f46e5' },
  { id: 'hexagon', label: 'مسدس', shape: 'path', svgPath: SHAPE_PATH_HEXAGON, color: '#0d9488' },
];

export type TextPresetCategory = 'all' | 'titles' | 'effects' | 'badges' | 'phrases';

export interface TextFilterOption {
  id: string;
  label: string;
}

export const TEXT_FILTER_OPTIONS: TextFilterOption[] = [
  { id: 'all', label: 'الكل' },
  { id: 'effects', label: 'تأثيرات' },
  { id: 'badges', label: 'شارات' },
  { id: 'phrases', label: 'عبارات' },
];

export interface QuickTextItem {
  id: TextPresetType;
  label: string;
  description: string;
  category: 'titles' | 'effects' | 'badges' | 'phrases';
  previewColor: string;
  sampleText?: string;
}

export const QUICK_TEXT_PRESETS: QuickTextItem[] = [
  // 🏷️ 1. هرمية العناوين الأساسية
  {
    id: 'heading',
    label: 'عنوان رئيسي',
    description: 'خط عريض وبارز',
    category: 'titles',
    previewColor: '#0f172a',
    sampleText: 'عنوان رئيسي',
  },
  {
    id: 'subheading',
    label: 'عنوان فرعي',
    description: 'خط متوسط أنيق',
    category: 'titles',
    previewColor: '#334155',
    sampleText: 'عنوان فرعي',
  },
  {
    id: 'body',
    label: 'نص فقرة',
    description: 'نص توضيحي مريح',
    category: 'titles',
    previewColor: '#475569',
    sampleText: 'اكتب وصفاً أو تفاصيل...',
  },

  // ✨ 2. تأثيرات فنية واحترافية
  {
    id: 'gold-luxury',
    label: 'ذهبي فاخر',
    description: 'تدرج ذهبي متوهج',
    category: 'effects',
    previewColor: '#d97706',
    sampleText: 'استوديو الفخامة',
  },
  {
    id: 'neon-glow',
    label: 'نيون متوهج',
    description: 'إشعاع سيبراني أزرق',
    category: 'effects',
    previewColor: '#00f0ff',
    sampleText: 'NEON GLOW',
  },
  {
    id: '3d-title',
    label: 'ثلاثي الأبعاد',
    description: 'ظل 3D مجسم',
    category: 'effects',
    previewColor: '#6366f1',
    sampleText: 'إصدار مجسم 3D',
  },
  {
    id: 'outline-modern',
    label: 'حدود عصرية',
    description: 'نص مفرغ بإطار',
    category: 'effects',
    previewColor: '#059669',
    sampleText: 'MODERN DESIGN',
  },

  // 🛡️ 3. شارات وتوثيق
  {
    id: 'badge',
    label: 'شارة كبسولة',
    description: 'نص داخل كبسولة',
    category: 'badges',
    previewColor: '#2563eb',
    sampleText: 'استوديو احترافي',
  },
  {
    id: 'studio-date',
    label: 'تاريخ الاستوديو',
    description: 'تاريخ وبصمة اليوم',
    category: 'badges',
    previewColor: '#64748b',
    sampleText: 'تاريخ الاستوديو',
  },
  {
    id: 'photographer-tag',
    label: 'بصمة المصور',
    description: 'توثيق حقوق المصور',
    category: 'badges',
    previewColor: '#475569',
    sampleText: 'تصوير: الاستوديو',
  },
  {
    id: 'watermark',
    label: 'علامة مائية',
    description: 'نص مائل شفاف',
    category: 'badges',
    previewColor: '#94a3b8',
    sampleText: 'مسودة غير معتمدة',
  },
  {
    id: 'caption-card',
    label: 'بطاقة وصف',
    description: 'إطار بحواف ناعمة',
    category: 'badges',
    previewColor: '#1e293b',
    sampleText: 'بطاقة توثيق مؤطرة',
  },

  // 💬 4. عبارات ومناسبات
  {
    id: 'congrats',
    label: 'تهنئة وتخرج',
    description: 'مبروك التخرج والنجاح',
    category: 'phrases',
    previewColor: '#047857',
    sampleText: 'ألف مبروك النجاح',
  },
  {
    id: 'sale-offer',
    label: 'عروض وخصومات',
    description: 'عروض كبرى · خصم 50%',
    category: 'phrases',
    previewColor: '#dc2626',
    sampleText: 'عروض كبرى 50%',
  },
  {
    id: 'certificate',
    label: 'شهادة تقدير',
    description: 'شهادة شكر وتقدير',
    category: 'phrases',
    previewColor: '#1e3a8a',
    sampleText: 'شهادة شكر وتقدير',
  },
  {
    id: 'stamp-circle',
    label: 'ختم مقوّس',
    description: 'نص مقوّس أحمر',
    category: 'phrases',
    previewColor: '#dc2626',
    sampleText: 'معتمد وموثق رسمي',
  },
  {
    id: 'special-price',
    label: 'شارة تسعير',
    description: 'السعر: 25,000 د.ع',
    category: 'phrases',
    previewColor: '#0284c7',
    sampleText: 'السعر: 25,000 د.ع',
  },
];

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
  description?: string;
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
    description: 'ورق الصور القياسي الأكثر انتشاراً في طابعات الاستوديو',
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
    description: 'ورق صور البورتريه والمناسبات الفاخر',
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
    description: 'كروت بريدية وصور فوتوغرافية مصغرة',
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
    description: 'مقاس البورتريه المكتبي والإطارات المتوسطة',
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
    description: 'المقاس العالمي الأول للطباعة والمستندات وتكرار الهويات',
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
    description: 'كتيبات، مطبوعات صغيرة، وقوائم',
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
    description: 'بوسترات وملصقات ومطبوعات مكبرة',
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
    description: 'الورق المكتبي القياسي الأمريكي والدولي',
  },

  // 📇 كروت وبطاقات مطبوعة (Printed Cards)
  {
    id: 'preset-card-cr80',
    name: 'بطاقة قياسية CR-80 (شخصية)',
    category: 'cards',
    widthMM: 85,
    heightMM: 55,
    widthPx: Math.round((85 / 25.4) * 300),
    heightPx: Math.round((55 / 25.4) * 300),
    dpi: 300,
    tag: '85 × 55 مم',
    description: 'كروت الأعمال وبطاقات الهوية البلاستيكية',
  },
  {
    id: 'preset-card-business',
    name: 'كارت عمل عريض (90×50 مم)',
    category: 'cards',
    widthMM: 90,
    heightMM: 50,
    widthPx: Math.round((90 / 25.4) * 300),
    heightPx: Math.round((50 / 25.4) * 300),
    dpi: 300,
    tag: '90 × 50 مم',
    description: 'كروت الشركات والعمل القياسية',
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
