// import type فقط: الأنواع تُبعَّد وقت الترجمة فلا تُنشأ حلقة استيراد وقت التشغيل
// (grid-slice يعتمد بالمثل على أنواع الستور)
import type { ShapeFillImageFit } from '../canvas/shape-pattern';
import type { ProjectFileV1 } from '../io/project-serializer';
import type { PhotoTemplate, CollageTemplate } from '../templates';
import type { UserGuide } from './slices/grid-slice';
import type { StickerParams } from '@/features/stickers';

export interface ProjectStateData {
  mode: EditorMode;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  /** لون نهاية تدرج خلفية الورقة — غيابه يعني تعبئة مصمتة */
  backgroundGradientColor2?: string | null;
  /** زاوية التدرج الخطي بالدرجات */
  backgroundGradientAngle?: number;
  elements?: CanvasElement[];
  slots?: CanvasSlot[];
  template?: PhotoTemplate | null;
  collageTemplate?: CollageTemplate | null;
  printSettings?: PrintSettings;
}

export type ElementType = 'image' | 'text' | 'shape';

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

  fillType?: 'solid' | 'linear' | 'radial' | 'image';
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?: { x: number; y: number };
  fillLinearGradientColorStops?: Array<number | string>;
  fillRadialGradientStartPoint?: { x: number; y: number };
  fillRadialGradientStartRadius?: number;
  fillRadialGradientEndPoint?: { x: number; y: number };
  fillRadialGradientEndRadius?: number;
  fillRadialGradientColorStops?: Array<number | string>;

  /** تعبئة بصورة (fillType='image') — الصورة تُرسم كنقش fillPattern في Konva */
  fillImageSrc?: string;
  /** طريقة ملاءمة الصورة داخل صندوق العنصر (شكل أو نص) */
  fillImageFit?: ShapeFillImageFit;
  /** مضاعف حجم النقش في وضع التكرار (1 = البكسل الطبيعي) */
  fillImageScale?: number;
  /** دوران النقش بالدرجات حول مركز العنصر */
  fillImageRotation?: number;
  /** إزاحة مركز النقش كنسبة من أبعاد العنصر (-0.5..0.5) */
  fillImageOffsetX?: number;
  fillImageOffsetY?: number;

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

/** مصدر الملصق على العنصر — يسمح بإعادة فتح استوديو الملصقات للتعديل على نفس العنصر */
export interface StickerElementSource {
  templateId: string;
  params: StickerParams;
  /** نسخة SVG المتجهة لحظة الإدراج — تصدير متجه لاحقاً بلا إعادة توليد */
  svg?: string;
}

export interface ImageElement extends BaseCanvasElement {
  type: 'image';
  imageSrc: string;
  originalImageSrc?: string;
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  bgColor?: string;
  /** مصدر قالب الملصق إن كان العنصر أُدرج من استوديو الملصقات */
  stickerSource?: StickerElementSource;
  /** قناع قص متجهات للصورة */
  maskShape?: 'none' | 'circle' | 'heart' | 'star';
}

export interface TextElement extends BaseCanvasElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontWeight?: number;
  color?: string;
  fontFamily?: string;
  textAlign?: 'right' | 'center' | 'left';
  /** المحاذاة العمودية داخل صندوق النص (P1) — تُمرَّر لـ Konva verticalAlign */
  textVerticalAlign?: 'top' | 'middle' | 'bottom';
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
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  wrap?: 'word' | 'char' | 'none';
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowGlow?: boolean;
  curve?: number; // -100 to 100 percentage of curvature
  curveRadius?: number;
  curveDirection?: 'up' | 'down';
  arabicNumerals?: boolean; // true to convert digits to Arabic-Indic ٠-٩
}

export interface ShapeElement extends BaseCanvasElement {
  type: 'shape';
  shape:
    'rect' | 'ellipse' | 'line' | 'star' | 'path' | 'polygon' | 'arrow' | 'ring' | 'arc' | 'wedge';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  /** استدارة زوايا مستقلة [أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار] — تتقدم على radius */
  radiusCorners?: number[];
  svgPath?: string;
  sides?: number;
  pointerLength?: number;
  pointerWidth?: number;
  /** رأس في بداية السهم أيضاً (سهم مزدوج الرأسين) */
  pointerAtBeginning?: boolean;
  innerRadius?: number;
  /** زاوية القوس/القطاع بالدرجات — للنوعين arc و wedge */
  arcAngle?: number;
  /** عدد رؤوس النجمة (star) */
  starPoints?: number;
  /** نسبة عمق رؤوس النجمة من نصف القطر الخارجي 0..1 (star) */
  starInnerRatio?: number;
  /** نمط الحد: متصل / متقطع / منقّط */
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  lineCap?: 'butt' | 'round' | 'square';
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

export type EditorMode = 'single' | 'collage';

export interface HistoryEntry {
  elements: CanvasElement[];
  slots: CanvasSlot[];
  // إعدادات بصرية مؤثرة على الناتج — التراجع عنها يجب أن يستعيدها فعلاً (إصلاح E-4)
  mode?: EditorMode;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  // القالبان يؤثران على الناتج والمعاينة — بدونهما كان التراجع بعد setTemplate
  // يستعيد العناصر والأبعاد ويُبقي القالب الجديد (حالة متناقضة)
  template?: PhotoTemplate | null;
  collageTemplate?: CollageTemplate | null;
  backgroundGradientColor2?: string | null;
  backgroundGradientAngle?: number;
  collageGap?: number;
  collageMargin?: number;
  collageRadius?: number;
  collageShowCutLines?: boolean;
  collageShowEndCutLine?: boolean;
  collageStrokeWidth?: number;
  collageStrokeColor?: string;
  // حقول شبكة الإرشاد والأدلة — التراجع كان يستعيد الخانات ويُبقي الشبكة
  // الجديدة (نفس صنف إصلاح E-4/H4: الناتج يتغير بلا إمكانية عكس التغيير)
  showGrid?: boolean;
  gridSize?: number;
  gridColor?: string;
  gridOpacity?: number;
  gridSubdivisions?: number;
  gridType?: 'lines' | 'dots';
  /** الأدلة اليدوية — تُقارن بالمرجع (الستور immutable) مثل القالبين */
  userGuides?: UserGuide[];
  // حالة الصورة المحررة الأخيرة — تُستعاد مع التراجع لمنع "شبح" صورة قديمة
  lastEditedImage?: string | null;
  lastEditedImageAspect?: number | null;
  // 🛡️ إعدادات الطباعة (H4 من تدقيق 2026-10-08): تغيير الـ DPI يعيد بناء
  // هندسة الخانات، وكان التراجع يستعيد الخانات ويُبقي الـ DPI الجديد —
  // حالتان تتباعدان بلا إمكانية عكس التغيير نهائياً.
  printSettings?: PrintSettings;
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
  cutLineStyle?: 'dashed' | 'dotted' | 'solid' | 'cropmarks';
  orientation: 'portrait' | 'landscape';
  /** فضاء الألوان: sRGB للطباعة الرقمية، CMYK للمطابع — يحدد صيغة الملف تلقائياً (jpeg/tiff) */
  colorSpace?: 'sRGB' | 'CMYK';
  fitToPage?: boolean;
  repeatMode?: 'all' | 'row' | 'column';
  gridAlign?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center'
    | 'center-left'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
}

export type { PhotoTemplate, CollageTemplate, ProjectFileV1 };
