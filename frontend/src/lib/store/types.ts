import { PhotoTemplate, CollageTemplate } from "../templates";
import { ProjectFileV1 } from "../project-serializer";

export interface ProjectStateData {
  mode: EditorMode;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  elements?: CanvasElement[];
  slots?: CanvasSlot[];
  template?: PhotoTemplate | null;
  collageTemplate?: CollageTemplate | null;
  printSettings?: PrintSettings;
}

export type ElementType = "image" | "text" | "shape";

export interface BaseCanvasElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;

  fillType?: "solid" | "linear" | "radial";
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?: { x: number; y: number };
  fillLinearGradientColorStops?: Array<number | string>;
  fillRadialGradientStartPoint?: { x: number; y: number };
  fillRadialGradientStartRadius?: number;
  fillRadialGradientEndPoint?: { x: number; y: number };
  fillRadialGradientEndRadius?: number;
  fillRadialGradientColorStops?: Array<number | string>;

  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  cornerRadius?: number;
  globalCompositeOperation?: string;
  flipX?: boolean;
  /** قلب عمودي — تكافؤ مع CanvasElementSchema في schema.ts (إصلاح عدم تطابق flipY) */
  flipY?: boolean;
  groupId?: string;
}

export interface ImageElement extends BaseCanvasElement {
  type: "image";
  imageSrc: string;
  originalImageSrc?: string;
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  bgColor?: string;
}

export interface TextElement extends BaseCanvasElement {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight?: number;
  color?: string;
  fontFamily?: string;
  textAlign?: "right" | "center" | "left";
  textBgColor?: string;
  textBgRadius?: number;
  textBgPadding?: number;
  textBgPaddingX?: number;
  textBgPaddingY?: number;
  textBgBorderColor?: string;
  textBgBorderWidth?: number;
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
  stroke?: string;
  strokeWidth?: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  wrap?: "word" | "char" | "none";
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowGlow?: boolean;
  curve?: number; // -100 to 100 percentage of curvature
  curveRadius?: number;
  curveDirection?: "up" | "down";
  arabicNumerals?: boolean; // true to convert digits to Arabic-Indic ٠-٩
}

export interface ShapeElement extends BaseCanvasElement {
  type: "shape";
  shape: "rect" | "ellipse" | "line" | "star" | "path";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  svgPath?: string;
}

export type CanvasElement = ImageElement | TextElement | ShapeElement;

export interface CanvasSlot {
  id: string;
  cellIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  presetType?: string;
  label?: string;
  imageSrc?: string;
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  zoom?: number;
  dragX?: number;
  dragY?: number;
  flipX?: boolean;
  flipY?: boolean;
  rotation?: number;
  originalImageSrc?: string;
  bgColor?: string;
}

export type EditorMode = "single" | "collage";

export interface HistoryEntry {
  elements: CanvasElement[];
  slots: CanvasSlot[];
  // إعدادات بصرية مؤثرة على الناتج — التراجع عنها يجب أن يستعيدها فعلاً (إصلاح E-4)
  mode?: EditorMode;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  collageGap?: number;
  collageMargin?: number;
  collageRadius?: number;
  collageShowCutLines?: boolean;
  collageShowEndCutLine?: boolean;
  collageStrokeWidth?: number;
  collageStrokeColor?: string;
  // حالة الصورة المحررة الأخيرة — تُستعاد مع التراجع لمنع "شبح" صورة قديمة
  lastEditedImage?: string | null;
  lastEditedImageAspect?: number | null;
}

export interface PrintSettings {
  paperId: string;
  paperWidthMM: number;
  paperHeightMM: number;
  marginMM: number;
  gapMM?: number;
  dpi: number;
  copiesPerSheet: number;
  showCutLines: boolean;
  showEndCutLine?: boolean;
  cutLineStyle?: "dashed" | "dotted" | "solid" | "cropmarks";
  orientation: "portrait" | "landscape";
  fitToPage?: boolean;
  repeatMode?: "all" | "row" | "column";
}

export type { PhotoTemplate, CollageTemplate, ProjectFileV1 };
