import { z } from 'zod';

import { sanitizeText } from './canvas/text-helpers';
import { DEFAULT_COLLAGE_GAP_PX, DEFAULT_COLLAGE_MARGIN_PX } from './templates/constants';
import { sanitizeSvgMarkup } from './utils';

export const AUTOFILL_IMAGE_LIMIT = 500;
export const MAX_BLEED_MM = 20;
const MAX_STICKER_FIELD_LENGTH = 500;
const MAX_SVG_MARKUP_LENGTH = 500_000;
const MAX_SVG_PATH_LENGTH = 500_000;
const DANGEROUS_JSON_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const UNSAFE_URI_PATTERN = /^(?:javascript|vbscript):|^data:\s*text\/html\b/i;

function isSafeImageUri(value: string): boolean {
  // تجميع بداية المسار بعد تجاهل محارف التحكم والمسافات لمنع الالتفاف (مثل java\tscript:)
  let prefix = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) continue;
    prefix += value[i];
    if (prefix.length >= 24) break;
  }
  return !UNSAFE_URI_PATTERN.test(prefix);
}

/**
 * يعيد بناء شجرة JSON دون مفاتيح تلويث النموذج الأولي (`__proto__` ونحوها)
 * قبل تمريرها إلى Zod (`z.record` يكتب المفاتيح مباشرةً أثناء `safeParse`).
 */
export function stripDangerousJsonKeys(input: unknown, depth = 10): unknown {
  if (depth <= 0 || !input || typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => stripDangerousJsonKeys(item, depth - 1));
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (DANGEROUS_JSON_KEYS.has(key)) continue;
    clean[key] = stripDangerousJsonKeys(value, depth - 1);
  }
  return clean;
}

const safeUriStringSchema = z.string().refine(isSafeImageUri, {
  message: 'Unsafe URI scheme',
});

const StickerSourceLayoutOverrideSchema = z.object({
  dxMm: z.number().finite().min(-500).max(500),
  dyMm: z.number().finite().min(-500).max(500),
  scale: z.number().finite().min(0.2).max(5),
  rotationDeg: z.number().finite().min(-180).max(180),
  visible: z.boolean(),
});

const StickerSourceParamsSchema = z.object({
  version: z.literal(2).optional(),
  fields: z
    .record(
      z.string().max(120),
      z
        .string()
        .max(10_000)
        .transform((val) => sanitizeText(val, MAX_STICKER_FIELD_LENGTH)),
    )
    .optional(),
  primaryColor: z
    .string()
    .max(120)
    .transform((val) => sanitizeText(val, 120))
    .optional(),
  secondaryColor: z
    .string()
    .max(120)
    .transform((val) => sanitizeText(val, 120))
    .optional(),
  backgroundColor: z
    .string()
    .max(120)
    .transform((val) => sanitizeText(val, 120))
    .optional(),
  isTransparent: z.boolean().optional(),
  fontFamily: z
    .string()
    .max(120)
    .transform((val) => sanitizeText(val, 120))
    .optional(),
  fontScale: z.number().finite().min(0.5).max(3).optional(),
  finish: z.enum(['standard', 'glossy', 'matte', 'holographic']).optional(),
  dieCutBorder: z.boolean().optional(),
  sizeMm: z
    .object({
      width: z.number().finite().positive().max(2000),
      height: z.number().finite().positive().max(2000),
    })
    .optional(),
  bleedMm: z.number().finite().min(0).max(50).optional(),
  safeMm: z.number().finite().min(0).max(50).optional(),
  overrides: z.record(z.string().max(120), StickerSourceLayoutOverrideSchema).optional(),
});

// Queues contain durable local paths or existing image data, never session-only Blob URLs.
const queuedImageSchema = z
  .string()
  .min(1)
  .refine((src) => !/^blob:/i.test(src), {
    message: 'Queued images must use durable sources',
  });

export const CanvasElementSchema = z.object({
  id: z.string().max(256),
  type: z.enum(['image', 'text', 'shape']),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  rotation: z.number().finite(),
  opacity: z.number().finite().min(0).max(1),
  zIndex: z.number().finite(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),

  imageSrc: safeUriStringSchema.optional(),
  originalImageSrc: safeUriStringSchema.optional(),
  filter: z.string().optional(),
  brightness: z.number().finite().optional(),
  contrast: z.number().finite().optional(),
  saturation: z.number().finite().optional(),
  blur: z.number().finite().optional(),
  // خلفية عنصر الصورة (تُستخدم خلف الصور الشفافة) — كانت تُسقط سابقاً عند الحفظ (إصلاح Bug#3)
  bgColor: z.string().optional(),
  // مصدر الملصق (قالب + تخصيصات) لإتاحة إعادة التحرير من استوديو الملصقات — اختياري للتوافق مع الملفات القديمة
  stickerSource: z
    .object({
      templateId: z.string().min(1).max(120),
      params: StickerSourceParamsSchema,
      svg: z
        .string()
        .max(MAX_SVG_MARKUP_LENGTH)
        .transform((val) => {
          const clean = sanitizeSvgMarkup(val);
          return clean || undefined;
        })
        .optional(),
    })
    .optional(),

  text: z
    .string()
    .transform((val) => sanitizeText(val))
    .optional(),
  fontSize: z.number().optional(),
  fontWeight: z.number().optional(),
  color: z.string().optional(),
  fontFamily: z.string().optional(),
  textAlign: z.enum(['right', 'center', 'left']).optional(),
  // مهجور: يُقبل من الملفات القديمة فقط ويُهمَل عند الرندر (الارتفاع يتبع المحتوى)
  textVerticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  textBgColor: z.string().optional(),
  textBgRadius: z.number().optional(),
  textBgPadding: z.number().optional(),
  textBgPaddingX: z.number().optional(),
  textBgPaddingY: z.number().optional(),
  textBgBorderColor: z.string().optional(),
  textBgBorderWidth: z.number().optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  wordSpacing: z.number().optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through']).optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
  wrap: z.enum(['word', 'char', 'none']).optional(),
  textSizing: z.enum(['auto', 'fixed']).optional(),
  // ركن ثابت بعد تحجيم زاوية — يوجّه إعادة الملاءمة التلقائية اللاحقة
  textResizeAnchor: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).optional(),
  shadowGlow: z.boolean().optional(),
  curve: z.number().optional(),
  curveRadius: z.number().optional(),
  curveDirection: z.enum(['up', 'down']).optional(),
  arabicNumerals: z.boolean().optional(),

  shape: z
    .enum(['rect', 'ellipse', 'line', 'star', 'path', 'polygon', 'arrow', 'ring', 'arc', 'wedge'])
    .optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  radius: z.number().optional(),
  // استدارة الزوايا المستقلة [أعلى-يسار، أعلى-يمين، أسفل-يمين، أسفل-يسار]
  radiusCorners: z.array(z.number()).length(4).optional(),
  sides: z.number().optional(),
  pointerLength: z.number().optional(),
  pointerWidth: z.number().optional(),
  pointerAtBeginning: z.boolean().optional(),
  innerRadius: z.number().optional(),
  // زاوية القوس/القطاع (arc/wedge) بالدرجات
  arcAngle: z.number().optional(),
  // رؤوس النجمة وعمقها — كانتا غير معلنتين فيُسقطهما zod عند الحفظ (نفس صنف Bug#3)
  starPoints: z.number().optional(),
  starInnerRatio: z.number().optional(),
  // نمط الحد وطرفه — خصائص Konva أصلية (dash + lineCap)
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
  lineCap: z.enum(['butt', 'round', 'square']).optional(),
  maskShape: z.enum(['none', 'circle', 'heart', 'star']).optional(),

  // gradient properties
  fillType: z.enum(['solid', 'linear', 'radial', 'image']).optional(),
  fillLinearGradientStartPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  fillLinearGradientEndPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  fillLinearGradientColorStops: z.array(z.union([z.number(), z.string()])).optional(),
  fillRadialGradientStartPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  fillRadialGradientStartRadius: z.number().optional(),
  fillRadialGradientEndPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  fillRadialGradientEndRadius: z.number().optional(),
  fillRadialGradientColorStops: z.array(z.union([z.number(), z.string()])).optional(),

  // تعبئة صور الأشكال (fillType='image') — تُسقط عند الحفظ دون إعلانها هنا
  fillImageSrc: safeUriStringSchema.optional(),
  fillImageFit: z.enum(['stretch', 'cover', 'contain', 'tile']).optional(),
  fillImageScale: z.number().finite().optional(),
  fillImageRotation: z.number().finite().optional(),
  fillImageOffsetX: z.number().finite().optional(),
  fillImageOffsetY: z.number().finite().optional(),

  // خصائص متقدمة
  shadowColor: z.string().optional(),
  shadowBlur: z.number().finite().optional(),
  shadowOffsetX: z.number().finite().optional(),
  shadowOffsetY: z.number().finite().optional(),
  shadowOpacity: z.number().finite().min(0).max(1).optional(),
  cornerRadius: z.number().finite().optional(),
  globalCompositeOperation: z.string().optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  svgPath: z.string().max(MAX_SVG_PATH_LENGTH).optional(),
  groupId: z.string().optional(),
  // اسم الطبقة المخصص — يَسقط عند الحفظ إن لم يُصرَّح هنا (Zod يحذف المجهول)
  name: z
    .string()
    .transform((val) => sanitizeText(val, 200))
    .optional(),
});

export type ParsedCanvasElement = z.infer<typeof CanvasElementSchema>;

/**
 * يتحقق من مصفوفة عناصر مفسّرة من حافظة `GRIDO_ELEMENTS:` ويعقّمها
 * (تنظيف مفاتيح `__proto__` ثم التحقق الكامل عبر `CanvasElementSchema`).
 */
export function parseSanitizedCanvasElements(raw: unknown): ParsedCanvasElement[] | null {
  const cleaned = stripDangerousJsonKeys(raw);
  const result = z.array(CanvasElementSchema).safeParse(cleaned);
  if (!result.success || result.data.length === 0) return null;
  return result.data;
}

/**
 * يعقّم مصفوفة عناصر مُمرّرة إلى `pasteCopiedElements` ويسقط أي عنصر غير صالح.
 */
export function sanitizeCanvasElementArray(rawItems: readonly unknown[]): ParsedCanvasElement[] {
  const valid: ParsedCanvasElement[] = [];
  for (const item of rawItems) {
    const cleaned = stripDangerousJsonKeys(item);
    const parsed = CanvasElementSchema.safeParse(cleaned);
    if (parsed.success) {
      valid.push(parsed.data);
    }
  }
  return valid;
}

export const CanvasSlotSchema = z.object({
  id: z.string(),
  cellIndex: z.number(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  presetType: z.string().optional(),
  label: z.string().optional(),
  imageSrc: z.string().optional(),
  // كانت تُسقط سابقاً عند الحفظ/التحميل فيتعطل "استعادة الأصل" ويختفي لون الخلية (إصلاح Bug#3)
  originalImageSrc: z.string().optional(),
  bgColor: z.string().optional(),
  filter: z.string().optional(),
  brightness: z.number().optional(),
  contrast: z.number().optional(),
  saturation: z.number().optional(),
  zoom: z.number().optional(),
  dragX: z.number().optional(),
  dragY: z.number().optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
  rotation: z.number().optional(),
});

export const PrintSettingsSchema = z.object({
  paperId: z.string(),
  paperWidthMM: z.number(),
  paperHeightMM: z.number(),
  marginMM: z.number(),
  gapMM: z.number().optional(),
  dpi: z.number(),
  copiesPerSheet: z.number(),
  showCutLines: z.boolean(),
  showEndCutLine: z.boolean().optional(),
  orientation: z.enum(['portrait', 'landscape']),
  fitToPage: z.boolean().optional(),
  repeatMode: z.enum(['all', 'row', 'column']).optional(),
  // كانتا تُسقطان عند الحفظ/الفتح (zod يحذف المفاتيح غير المعلنة) فيضيع
  // نمط خط القص ومحاذاة الشبكة المختاران ويعودان للافتراضي — إصلاح فقدان إعداد.
  cutLineStyle: z.enum(['dashed', 'dotted', 'solid', 'cropmarks']).optional(),
  colorSpace: z.enum(['sRGB', 'CMYK']).optional(),
  outputFormat: z.enum(['jpeg', 'png']).optional(),
  gridAlign: z
    .enum([
      'top-left',
      'top-center',
      'top-right',
      'center',
      'center-left',
      'center-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ])
    .optional(),
});

export const PhotoTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['id', 'passport', 'visa', 'personal', 'collage']),
  width: z.number(),
  height: z.number(),
  widthMM: z.number(),
  heightMM: z.number(),
  dpi: z.number(),
  headHeightMin: z.number().optional(),
  headHeightMax: z.number().optional(),
  background: z.string(),
  backgroundHint: z.string(),
  notes: z.string().optional(),
});

const CollageTemplateMetadataSchema = z.object({
  version: z.literal(1),
  kind: z.enum(['freeform', 'grid']),
  paperWidthMM: z.number().positive().max(1000),
  paperHeightMM: z.number().positive().max(1000),
  dpi: z.number().positive().max(2400).optional(),
  gapMM: z.number().min(0).max(100).optional(),
  marginMM: z.number().min(0).max(500).optional(),
  showCutLines: z.boolean().optional(),
  enableSnapping: z.boolean().optional(),
  packGapMM: z.number().min(0).max(100).optional(),
  packMarginMM: z.number().min(0).max(500).optional(),
  slotOptions: z
    .array(z.object({ color: z.string().optional(), lockAspect: z.boolean().optional() }))
    .max(200)
    .optional(),
  physicalLayout: z
    .object({
      type: z.string(),
      rows: z.number().int().positive(),
      cols: z.number().int().positive(),
      align: z.string().optional(),
    })
    .optional(),
});

export const CollageTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  slots: z.number(),
  cells: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
      presetType: z.string().optional(),
      label: z.string().optional(),
      rotation: z.number().optional(),
    }),
  ),
  physicalLayout: z
    .object({
      type: z.string(),
      rows: z.number(),
      cols: z.number(),
      align: z
        .enum([
          'center',
          'top-left',
          'top-center',
          'top-right',
          'center-left',
          'center-right',
          'bottom-left',
          'bottom-center',
          'bottom-right',
        ])
        .optional(),
    })
    .optional(),
  isBaked: z.boolean().optional(),
  isManual: z.boolean().optional(),
  metadata: CollageTemplateMetadataSchema.optional(),
});

export const UserGuideSchema = z.object({
  id: z.string(),
  type: z.enum(['h', 'v']),
  pos: z.number().min(0).max(1),
});
export type UserGuideData = z.infer<typeof UserGuideSchema>;

export const ProjectSchema = z.object({
  mode: z.enum(['single', 'collage']).default('single'),
  // معرّف المشروع في المكتبة — اختياري (مسودة قديمة بلا معرّف تبدأ مشروعاً جديداً،
  // ووجوده يُبقي الحفظ التالي يحدّث نفس المشروع بدل طبع نسخة مكررة)
  projectId: z.string().nullable().optional(),
  // الافتراضي يطابق DEFAULT_CORE_STATE (2480×3508 ≈ A4@300DPI) — كان 413×531
  // (مقاس جواز) فيُحمَّل ملف قديم بلا أبعاد على كانفاس غير مقصود
  canvasWidth: z.number().default(2480),
  canvasHeight: z.number().default(3508),
  backgroundColor: z.string().default('#FFFFFF'),
  // تدرج خلفية الورقة — اختياريان للتوافق مع الملفات القديمة (المصمت = غياب color2)
  backgroundGradientColor2: z.string().nullable().optional(),
  backgroundGradientAngle: z.number().min(0).max(360).optional(),
  freeformCanvasWidth: z.number().optional().default(2480),
  freeformCanvasHeight: z.number().optional().default(3508),
  freeformBackgroundColor: z.string().optional().default('#FFFFFF'),
  freeformBackgroundGradientColor2: z.string().nullable().optional(),
  freeformBackgroundGradientAngle: z.number().min(0).max(360).optional(),
  collageCanvasWidth: z.number().optional().default(2480),
  collageCanvasHeight: z.number().optional().default(3508),
  collageBackgroundColor: z.string().optional().default('#FFFFFF'),
  collageBackgroundGradientColor2: z.string().nullable().optional(),
  collageBackgroundGradientAngle: z.number().min(0).max(360).optional(),
  collagePendingImages: z.array(queuedImageSchema).optional().default([]),
  autofillImages: z.array(queuedImageSchema).max(AUTOFILL_IMAGE_LIMIT).optional().default([]),
  autofillSettings: z
    .object({
      mode: z.enum(['empty', 'all']).default('empty'),
      order: z.enum(['row', 'column']).default('row'),
      repeat: z.boolean().default(true),
      shuffle: z.boolean().default(false),
      seed: z.number().int().default(1),
    })
    .optional()
    .default({ mode: 'empty', order: 'row', repeat: true, shuffle: false, seed: 1 }),
  elements: z.array(CanvasElementSchema).default([]),
  slots: z.array(CanvasSlotSchema).default([]),
  template: PhotoTemplateSchema.nullable().default(null),
  collageTemplate: CollageTemplateSchema.nullable().default(null),
  printSettings: PrintSettingsSchema.optional(),

  // إعدادات شبكة الإرشاد
  showGrid: z.boolean().optional().default(false),
  gridSize: z.number().optional().default(48),
  gridColor: z.string().optional().default('#000000'),
  gridOpacity: z.number().optional().default(0.15),
  gridSubdivisions: z.number().optional().default(5),
  gridType: z.enum(['lines', 'dots']).optional().default('lines'),
  // يطابق DEFAULT_GRID_STATE.snapToGrid (true) — كان false فينطفئ المغناطيس
  // صامتاً بعد فتح أي مشروع محفوظ
  snapToGrid: z.boolean().optional().default(true),

  // إعدادات أعمدة التخطيط
  showColumns: z.boolean().optional().default(false),
  columnsCount: z.number().optional().default(12),
  columnsColor: z.string().optional().default('rgba(239, 68, 68, 0.08)'),
  columnsMargin: z.number().optional().default(20),
  columnsGutter: z.number().optional().default(12),

  // مساطر وخطوط الإرشاد وهوامش القص
  showRuler: z.boolean().optional().default(true),
  rulerUnit: z.enum(['mm', 'cm', 'in', 'px']).optional().default('mm'),
  userGuides: z.array(UserGuideSchema).optional().default([]),
  showUserGuides: z.boolean().optional().default(true),
  lockUserGuides: z.boolean().optional().default(false),
  showBleedGuides: z.boolean().optional().default(false),
  bleedMarginMM: z.number().finite().min(0).max(MAX_BLEED_MM).optional().default(2),
  safeMarginMM: z.number().optional().default(2),
  cutShapeType: z.enum(['rectangle', 'circle', 'rounded-rect']).optional().default('rectangle'),

  // تخصيصات الكولاج
  collageGap: z.number().optional().default(DEFAULT_COLLAGE_GAP_PX),
  collageMargin: z.number().optional().default(DEFAULT_COLLAGE_MARGIN_PX),
  collageRadius: z.number().optional().default(0),
  collageShowCutLines: z.boolean().optional().default(false),
  // يطابق DEFAULT_COLLAGE_STATE.collageShowEndCutLine (true)
  collageShowEndCutLine: z.boolean().optional().default(true),
  collageStrokeWidth: z.number().optional().default(0),
  collageStrokeColor: z.string().optional().default('#000000'),
  embeddedAssets: z.record(z.string(), z.string()).optional(),
});

export type ProjectData = z.infer<typeof ProjectSchema>;
