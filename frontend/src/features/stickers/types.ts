export type StickerCategory =
  | 'badges'
  | 'shipping'
  | 'packaging'
  | 'barcodes'
  | 'retail'
  | 'safety'
  | 'social'
  | 'greeting'
  | 'cafe'
  | 'beauty'
  | 'kids'
  | 'seasonal'
  | 'frames';

export type StickerCategoryGroupId =
  'all' | 'commercial' | 'packaging' | 'codes' | 'stores' | 'occasions' | 'safety' | 'frames';

export type StickerShape = 'circle' | 'rect' | 'square';

export interface StickerCategoryInfo {
  id: StickerCategory;
  title: string;
  titleEn: string;
  iconName: string;
  description: string;
}

export type StickerFieldType = 'text' | 'number' | 'select' | 'color' | 'boolean';

export interface StickerFieldOption {
  label: string;
  value: string;
}

export interface StickerField {
  id: string;
  label: string;
  type: StickerFieldType;
  defaultValue: string;
  placeholder?: string;
  options?: StickerFieldOption[];
}

export interface StickerColors {
  primary: string;
  secondary: string;
  background: string;
}

export type StickerFinish = 'standard' | 'glossy' | 'matte' | 'holographic';

export interface StickerSizeMm {
  width: number;
  height: number;
}

/** تحريك/تحجيم/تدوير حقل نصي داخل القالب — يُطبَّق كتحويل SVG آمن. */
export interface StickerLayoutOverride {
  dxMm: number;
  dyMm: number;
  scale: number;
  rotationDeg: number;
  visible: boolean;
}

export interface StickerParams {
  /** إصدار مخطط التخصيص — غيابه يعني بيانات v1 قديمة. */
  version?: 2;
  fields: Record<string, string>;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  isTransparent: boolean;
  fontFamily?: string;
  fontScale?: number; // 0.8 to 1.3
  finish?: StickerFinish;
  dieCutBorder?: boolean;
  /** المقاس الفيزيائي الفعلي — يتجاوز defaultMm عند التحرير. */
  sizeMm?: StickerSizeMm;
  bleedMm?: number;
  safeMm?: number;
  overrides?: Record<string, StickerLayoutOverride>;
}

/**
 * شكل خط القص المعلن صراحةً من القالب (بوحدات viewBox) — جلسة 1.67.
 * يعلنه القالب نفسه ولا يُستدل عليه من بنية العمل الفني إطلاقاً (القرار
 * المحمي B-7 يمنع الاستدلال بعد عيب قصٍّ في موضع خاطئ). غيابه يعني سلوك
 * المستطيل المشتق من viewBox كما هو.
 */
export type StickerCutShape =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'roundedRect'; x: number; y: number; width: number; height: number; rx: number }
  | { kind: 'path'; d: string };

export interface StickerTemplate {
  id: string;
  name: string;
  nameEn: string;
  category: StickerCategory;
  shape?: StickerShape;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  aspectRatio: number;
  defaultMm?: { width: number; height: number };
  /** هندسة القص المعلنة — تمكّن مقصّات الفينيل من متابعة الشكل بدل المستطيل */
  cutShape?: StickerCutShape;
  defaultColors: StickerColors;
  fields: StickerField[];
  generateSvg: (params: StickerParams) => string;
}

export interface SheetGridConfig {
  rows: number;
  cols: number;
  spacingMm: number;
}

export type MockupBackground = 'checker' | 'white' | 'cardboard' | 'dark';

export interface StickerUserPreset {
  id: string;
  name: string;
  templateId: string;
  params: StickerParams;
  createdAt: number;
}
