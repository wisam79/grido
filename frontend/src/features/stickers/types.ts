export type StickerCategory =
  | "badges"
  | "shipping"
  | "packaging"
  | "barcodes"
  | "retail"
  | "safety"
  | "social"
  | "greeting"
  | "cafe"
  | "beauty"
  | "kids"
  | "seasonal";

export type StickerCategoryGroupId =
  | "all"
  | "commercial"
  | "packaging"
  | "codes"
  | "stores"
  | "occasions"
  | "safety";

export type StickerShape = "circle" | "rect" | "square";

export interface StickerCategoryInfo {
  id: StickerCategory;
  title: string;
  titleEn: string;
  iconName: string;
  description: string;
}

export type StickerFieldType = "text" | "number" | "select" | "color" | "boolean";

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

export type StickerFinish = "standard" | "glossy" | "matte" | "holographic";

export interface StickerParams {
  fields: Record<string, string>;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  isTransparent: boolean;
  fontFamily?: string;
  fontScale?: number; // 0.8 to 1.3
  finish?: StickerFinish;
  dieCutBorder?: boolean;
}

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
  defaultColors: StickerColors;
  fields: StickerField[];
  generateSvg: (params: StickerParams) => string;
}

export interface SheetGridConfig {
  rows: number;
  cols: number;
  spacingMm: number;
}

export type MockupBackground = "checker" | "white" | "cardboard" | "dark";
