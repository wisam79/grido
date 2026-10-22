export type TextPresetType =
  | 'heading'
  | 'subheading'
  | 'body'
  | 'badge'
  | 'watermark'
  | 'studio-date'
  | 'gold-luxury'
  | 'neon-glow'
  | 'stamp-circle'
  | '3d-title'
  | 'outline-modern'
  | 'photographer-tag'
  | 'caption-card'
  | 'congrats'
  | 'sale-offer'
  | 'certificate'
  | 'special-price';

export type TextPresetCategory = 'titles' | 'effects' | 'badges' | 'phrases';
/** تجميع قائمة «إضافة نص» في الشريط — عرض فقط، لا يغيّر الفئة السريعة */
export type TextPresetMenuGroup = 'standard' | 'documentation' | 'effects';

export interface TextPresetConfig {
  getText: () => string;
  /** الاسم الموحّد الظاهر في القائمة والبطاقات — لا تُكرَّر في مكوّنات الواجهة */
  label: string;
  description: string;
  category: TextPresetCategory;
  menuGroup: TextPresetMenuGroup;
  /** نص بطاقة المعاينة السريعة (قد يختلف عن getText الديناميكي) */
  sampleText: string;
  /** لون بطاقة المعاينة عندما يكون color شفافاً (نص مفرغ) */
  previewColor?: string;
  lineHeight?: number;
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
  color: string;
  height: number;
  opacity?: number;
  rotation?: number;
  textBgColor?: string;
  textBgRadius?: number;
  textBgPadding?: number;
  textBgPaddingX?: number;
  textBgPaddingY?: number;
  textBgBorderColor?: string;
  textBgBorderWidth?: number;
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowGlow?: boolean;
  curve?: number;
  fillType?: 'solid' | 'linear' | 'radial';
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?: { x: number; y: number };
  fillLinearGradientColorStops?: Array<number | string>;
}

export const TEXT_PRESETS: Record<TextPresetType, TextPresetConfig> = {
  heading: {
    getText: () => 'عنوان رئيسي',
    label: 'عنوان رئيسي',
    description: 'خط عريض وبارز',
    category: 'titles',
    menuGroup: 'standard',
    sampleText: 'عنوان رئيسي',
    previewColor: '#0f172a',
    lineHeight: 1.1,
    fontSize: 48,
    fontWeight: 800,
    fontFamily: 'Cairo, sans-serif',
    color: '#0f172a',
    height: 0.07,
  },
  subheading: {
    getText: () => 'عنوان فرعي للتصميم',
    label: 'عنوان فرعي',
    description: 'خط متوسط أنيق',
    category: 'titles',
    menuGroup: 'standard',
    sampleText: 'عنوان فرعي',
    previewColor: '#334155',
    lineHeight: 1.2,
    fontSize: 28,
    fontWeight: 600,
    fontFamily: 'Almarai, sans-serif',
    color: '#334155',
    height: 0.05,
  },
  body: {
    getText: () => 'اكتب هنا وصفاً أو ملاحظات إضافية للتصميم...',
    label: 'نص فقرة',
    description: 'نص توضيحي مريح',
    category: 'titles',
    menuGroup: 'standard',
    sampleText: 'اكتب وصفاً أو تفاصيل...',
    previewColor: '#475569',
    lineHeight: 1.35,
    fontSize: 18,
    fontWeight: 400,
    fontFamily: '"IBM Plex Sans Arabic", sans-serif',
    color: '#475569',
    height: 0.04,
  },
  badge: {
    getText: () => 'استوديو احترافي',
    label: 'شارة كبسولة',
    description: 'نص داخل كبسولة',
    category: 'badges',
    menuGroup: 'documentation',
    sampleText: 'استوديو احترافي',
    previewColor: '#2563eb',
    lineHeight: 1.1,
    fontSize: 20,
    fontWeight: 700,
    fontFamily: 'Tajawal, sans-serif',
    color: '#ffffff',
    textBgColor: '#2563eb',
    textBgRadius: 999,
    textBgPadding: 10,
    textBgPaddingX: 12,
    textBgPaddingY: 6,
    height: 0.045,
  },
  watermark: {
    getText: () => 'GRIDO STUDIO · مسودة',
    label: 'علامة مائية',
    description: 'نص مائل شفاف',
    category: 'badges',
    menuGroup: 'documentation',
    sampleText: 'مسودة غير معتمدة',
    previewColor: '#94a3b8',
    lineHeight: 1.2,
    fontSize: 36,
    fontWeight: 800,
    fontFamily: 'Alexandria, sans-serif',
    color: '#94a3b8',
    opacity: 0.25,
    rotation: -35,
    height: 0.06,
  },
  'studio-date': {
    getText: () =>
      new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
    label: 'تاريخ الاستوديو',
    description: 'تاريخ وبصمة اليوم',
    category: 'badges',
    menuGroup: 'documentation',
    sampleText: 'تاريخ الاستوديو',
    previewColor: '#64748b',
    lineHeight: 1.2,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'Cairo, sans-serif',
    color: '#1e293b',
    textBgColor: 'rgba(241, 245, 249, 0.95)',
    textBgRadius: 8,
    textBgPadding: 8,
    height: 0.04,
  },
  'gold-luxury': {
    getText: () => 'استوديو الفخامة للتصوير',
    label: 'ذهبي فاخر',
    description: 'تدرج ذهبي متوهج',
    category: 'effects',
    menuGroup: 'effects',
    sampleText: 'استوديو الفخامة',
    previewColor: '#d97706',
    lineHeight: 1.15,
    fontSize: 42,
    fontWeight: 800,
    fontFamily: 'Cairo, sans-serif',
    color: '#d97706',
    fillType: 'linear',
    fillLinearGradientStartPoint: { x: 0, y: 0 },
    fillLinearGradientEndPoint: { x: 1, y: 1 },
    fillLinearGradientColorStops: [0, '#f59e0b', 0.5, '#fbbf24', 1, '#b45309'],
    shadowColor: 'rgba(180, 83, 9, 0.45)',
    shadowBlur: 14,
    shadowOffsetY: 4,
    shadowOpacity: 0.6,
    height: 0.065,
  },
  'neon-glow': {
    getText: () => 'GRIDO STUDIO',
    label: 'نيون متوهج',
    description: 'إشعاع سيبراني أزرق',
    category: 'effects',
    menuGroup: 'effects',
    sampleText: 'NEON GLOW',
    previewColor: '#00f0ff',
    lineHeight: 1.1,
    fontSize: 38,
    fontWeight: 800,
    fontFamily: 'Alexandria, sans-serif',
    color: '#38bdf8',
    shadowColor: '#0284c7',
    shadowBlur: 20,
    shadowGlow: true,
    shadowOpacity: 0.9,
    stroke: '#0284c7',
    strokeWidth: 1.5,
    height: 0.06,
  },
  'stamp-circle': {
    getText: () => 'استوديو التصوير المعتمد · 2026',
    label: 'ختم مقوّس',
    description: 'نص مقوّس أحمر',
    category: 'phrases',
    menuGroup: 'effects',
    sampleText: 'معتمد وموثق رسمي',
    previewColor: '#dc2626',
    lineHeight: 1.1,
    fontSize: 26,
    fontWeight: 700,
    fontFamily: 'Reem Kufi, sans-serif',
    color: '#dc2626',
    curve: 60,
    stroke: '#dc2626',
    strokeWidth: 0.8,
    height: 0.08,
  },
  '3d-title': {
    getText: () => 'إصدار خاص وحصري',
    label: 'ثلاثي الأبعاد',
    description: 'ظل 3D مجسم',
    category: 'effects',
    menuGroup: 'effects',
    sampleText: 'إصدار مجسم 3D',
    previewColor: '#6366f1',
    lineHeight: 1.1,
    fontSize: 36,
    fontWeight: 900,
    fontFamily: 'Changa, sans-serif',
    color: '#6366f1',
    shadowColor: '#312e81',
    shadowBlur: 0,
    shadowOffsetX: 4,
    shadowOffsetY: 4,
    shadowOpacity: 1,
    stroke: '#1e1b4b',
    strokeWidth: 1.2,
    height: 0.06,
  },
  'outline-modern': {
    getText: () => 'MODERN DESIGN',
    label: 'حدود عصرية',
    description: 'نص مفرغ بإطار',
    category: 'effects',
    menuGroup: 'effects',
    sampleText: 'MODERN DESIGN',
    previewColor: '#059669',
    lineHeight: 1.1,
    fontSize: 44,
    fontWeight: 900,
    fontFamily: 'Montserrat, sans-serif',
    color: 'transparent',
    stroke: '#0f172a',
    strokeWidth: 2.5,
    height: 0.065,
  },
  'photographer-tag': {
    getText: () => 'تصوير: استوديو الإبداع',
    label: 'بصمة المصور',
    description: 'توثيق حقوق المصور',
    category: 'badges',
    menuGroup: 'documentation',
    sampleText: 'تصوير: الاستوديو',
    previewColor: '#475569',
    lineHeight: 1.2,
    fontSize: 22,
    fontWeight: 600,
    fontFamily: '"IBM Plex Sans Arabic", sans-serif',
    color: '#475569',
    opacity: 0.9,
    height: 0.045,
  },
  'caption-card': {
    getText: () => 'استوديو التصوير · 2026',
    label: 'بطاقة وصف',
    description: 'إطار بحواف ناعمة',
    category: 'badges',
    menuGroup: 'effects',
    sampleText: 'بطاقة توثيق مؤطرة',
    previewColor: '#1e293b',
    lineHeight: 1.2,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'Tajawal, sans-serif',
    color: '#1e293b',
    textBgColor: '#f8fafc',
    textBgRadius: 8,
    textBgPadding: 8,
    textBgBorderColor: '#cbd5e1',
    textBgBorderWidth: 1.5,
    height: 0.04,
  },
  congrats: {
    getText: () => 'ألف مبروك التخرج والنجاح',
    label: 'تهنئة ملكية',
    description: 'خط عريض للمناسبات والنجاح',
    category: 'phrases',
    menuGroup: 'effects',
    sampleText: 'ألف مبروك التخرج',
    previewColor: '#047857',
    lineHeight: 1.2,
    fontSize: 38,
    fontWeight: 800,
    fontFamily: 'Cairo, sans-serif',
    color: '#047857',
    shadowColor: 'rgba(4, 120, 87, 0.35)',
    shadowBlur: 10,
    shadowOffsetY: 3,
    shadowOpacity: 0.5,
    height: 0.065,
  },
  'sale-offer': {
    getText: () => 'عروض الموسم الحصرية',
    label: 'عرض استوديو',
    description: 'شارة عروض وحسومات رصينة',
    category: 'phrases',
    menuGroup: 'effects',
    sampleText: 'عروض الموسم الحصرية',
    previewColor: '#dc2626',
    lineHeight: 1.15,
    fontSize: 38,
    fontWeight: 900,
    fontFamily: 'Changa, sans-serif',
    color: '#ffffff',
    textBgColor: '#dc2626',
    textBgRadius: 10,
    textBgPadding: 12,
    shadowColor: 'rgba(220, 38, 38, 0.4)',
    shadowBlur: 12,
    shadowOffsetY: 4,
    shadowOpacity: 0.6,
    height: 0.07,
  },
  certificate: {
    getText: () => 'شهادة شكر وتقدير رسمية',
    label: 'شهادة تقدير',
    description: 'ترويسة اعتماد وشهادات',
    category: 'phrases',
    menuGroup: 'effects',
    sampleText: 'شهادة شكر وتقدير',
    previewColor: '#1e3a8a',
    lineHeight: 1.15,
    fontSize: 40,
    fontWeight: 800,
    fontFamily: 'Reem Kufi, sans-serif',
    color: '#1e3a8a',
    stroke: '#1e3a8a',
    strokeWidth: 0.5,
    shadowColor: 'rgba(30, 58, 138, 0.25)',
    shadowBlur: 8,
    shadowOffsetY: 2,
    shadowOpacity: 0.4,
    height: 0.07,
  },
  'special-price': {
    getText: () => 'السعر: باقة التصوير الخاصة',
    label: 'باقة تسعير',
    description: 'تسعير جلسة وباقة استوديو',
    category: 'phrases',
    menuGroup: 'effects',
    sampleText: 'السعر: باقة التصوير',
    previewColor: '#0284c7',
    lineHeight: 1.1,
    fontSize: 24,
    fontWeight: 800,
    fontFamily: 'Tajawal, sans-serif',
    color: '#ffffff',
    textBgColor: '#0284c7',
    textBgRadius: 8,
    textBgPadding: 10,
    height: 0.05,
  },
};

/** عنصر كتالوج موحّد — تُشتق منه قائمة الإضافة السريعة وبطاقات النصوص */
export interface TextPresetCatalogItem {
  id: TextPresetType;
  label: string;
  description: string;
  category: TextPresetCategory;
  menuGroup: TextPresetMenuGroup;
  sampleText: string;
  previewColor: string;
  config: TextPresetConfig;
}

export const TEXT_PRESET_CATEGORY_LABELS: Record<TextPresetCategory, string> = {
  titles: 'عناوين',
  badges: 'توثيق',
  effects: 'تأثيرات',
  phrases: 'تراكيب',
};

/**
 * المصدر الوحيد لبيانات النصوص الجاهزة: الشريط العلوي، لوحة العناصر الحرة،
 * وأزرار الأنماط السريعة كلها تقرأ من هنا بدل قوائم يدوية متوازية.
 */
export const TEXT_PRESET_CATALOG: readonly TextPresetCatalogItem[] = (
  Object.keys(TEXT_PRESETS) as TextPresetType[]
).map((id) => {
  const config = TEXT_PRESETS[id];
  return {
    id,
    label: config.label,
    description: config.description,
    category: config.category,
    menuGroup: config.menuGroup,
    sampleText: config.sampleText,
    previewColor: config.previewColor ?? config.color,
    config,
  };
});
