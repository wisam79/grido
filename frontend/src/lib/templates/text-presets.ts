export type TextPresetType =
  | 'heading'
  | 'subheading'
  | 'body'
  | 'caption'
  | 'studio-date'
  | 'photographer-tag'
  | 'watermark'
  | 'badge'
  | 'stamp-circle';

/** مجموعات الإدراج في تبويب النصوص — الطباعة أولاً ثم توثيق الاستوديو. */
export const TEXT_INSERT_GROUPS = [
  { id: 'typography', label: 'أنماط النص' },
  { id: 'studio', label: 'توثيق الاستوديو' },
] as const;

export type TextInsertGroup = (typeof TEXT_INSERT_GROUPS)[number]['id'];
/** كل نمط ينتمي لمجموعة إدراج؛ الشارة والختم كتلتا توثيق استوديو منذ جلسة 1.45. */
export type TextPresetGroup = TextInsertGroup;

export interface TextPresetConfig {
  getText: () => string;
  /** الاسم الموحّد الظاهر في القوائم — لا تُكرَّر في مكوّنات الواجهة */
  label: string;
  group: TextPresetGroup;
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
    group: 'typography',
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
    group: 'typography',
    lineHeight: 1.2,
    fontSize: 28,
    fontWeight: 600,
    fontFamily: 'Almarai, sans-serif',
    color: '#334155',
    height: 0.05,
  },
  body: {
    getText: () => 'اكتب هنا وصفاً أو ملاحظات إضافية للتصميم...',
    label: 'فقرة نصية',
    group: 'typography',
    lineHeight: 1.35,
    fontSize: 18,
    fontWeight: 400,
    fontFamily: '"IBM Plex Sans Arabic", sans-serif',
    color: '#475569',
    height: 0.04,
  },
  caption: {
    getText: () => 'استوديو التصوير · 2026',
    label: 'تسمية',
    group: 'typography',
    lineHeight: 1.2,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: 'Tajawal, sans-serif',
    color: '#334155',
    height: 0.04,
  },
  'studio-date': {
    getText: () =>
      new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
    label: 'تاريخ اليوم',
    group: 'studio',
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
  'photographer-tag': {
    getText: () => 'تصوير: استوديو الإبداع',
    label: 'حقوق المصور',
    group: 'studio',
    lineHeight: 1.2,
    fontSize: 22,
    fontWeight: 600,
    fontFamily: '"IBM Plex Sans Arabic", sans-serif',
    color: '#475569',
    opacity: 0.9,
    height: 0.045,
  },
  watermark: {
    getText: () => 'GRIDO STUDIO · مسودة',
    label: 'علامة مائية',
    group: 'studio',
    lineHeight: 1.2,
    fontSize: 36,
    fontWeight: 800,
    fontFamily: 'Alexandria, sans-serif',
    color: '#94a3b8',
    opacity: 0.25,
    rotation: -35,
    height: 0.06,
  },
  badge: {
    getText: () => 'استوديو احترافي',
    label: 'شارة',
    group: 'studio',
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
  'stamp-circle': {
    getText: () => 'استوديو التصوير المعتمد · 2026',
    label: 'ختم',
    group: 'studio',
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
};

/** عنصر كتالوج إدراج — تُشتق منه صفوف تبويب النصوص حصراً. */
export interface TextPresetCatalogItem {
  id: TextPresetType;
  label: string;
  group: TextInsertGroup;
  config: TextPresetConfig;
}

/**
 * المصدر الوحيد لصفوف الإدراج بترتيب `TEXT_PRESETS`: الأنماط الطباعية
 * ثم كتل الاستوديو (تاريخ/حقوق/علامة مائية/شارة/ختم).
 * التأثيرات المنفردة (ظل/خلفية/تقويس) لا تُدرج هنا — مكانها `text-effects.ts`.
 */
export const INSERT_TEXT_PRESETS: readonly TextPresetCatalogItem[] = (
  Object.keys(TEXT_PRESETS) as TextPresetType[]
).map((id) => {
  const config = TEXT_PRESETS[id];
  return { id, label: config.label, group: config.group, config };
});

/**
 * حجم معاينة تسمية النمط في التبويب (px): يحفظ هرمية الأحجام الحقيقية
 * مضغوطةً بين 12 و20 كي يبقى ارتفاع الصف موحّداً.
 */
export function textPresetPreviewSize(config: Pick<TextPresetConfig, 'fontSize'>): number {
  return Math.round(Math.min(20, Math.max(12, 8 + config.fontSize * 0.26)));
}
