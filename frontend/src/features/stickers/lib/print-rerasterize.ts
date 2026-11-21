/**
 * print-rerasterize.ts — ترقية دقة الملصقات لحظة الطباعة.
 *
 * راستر الملصق يُبنى مرة واحدة عند الإدراج على مقاس القالب الافتراضي
 * (stickerRasterSize بـ 300DPI). أي تكبير لاحق للعنصر على الكانفس يخفض
 * الدقة الفعالة بصمت. هنا نعالج السبب لا العَرَض: قبل بناء حمولة الطباعة،
 * كل عنصر يحمل stickerSource ويكون ممتداً فوق قدرة مصدره يُعاد تصييره
 * من SVG المتجه المحفوظ (أو من قالب+معاملاته) على المقاس المطبوع الفعلي
 * بـ targetDpi، ويُرفع كأصل طباعة مؤقت — **دون لمس عنصر الكانفس أو الستور**.
 *
 * يُطبَّق على مسار التركيب السريع فقط (CanvasComposition). مسار الالتقاط
 * (عناصر بدوران/ظل/تدرج) يُصيّر الكانفس كما هو، فتبقى تحذيرات preflight
 * هي الغلاف الأمين هناك.
 */
import { MM_PER_INCH } from '@/lib/canvas/units';
import { computeSlotCrop } from '@/lib/export/export-primitives';
import { createLogger } from '@/lib/logger';

import { getStickerTemplateById } from '../templates';

import { assertRasterBudget, MAX_RASTER_PIXELS, MAX_RASTER_SIDE } from './export-limits';
import { buildStickerSvg } from './sticker-design/build-svg';
import { mmToPx } from './sticker-text';
import { renderSvgToPngBlob } from './svg-rasterizer';

import type { CanvasElement, ImageElement, StickerElementSource } from '@/lib/store/types';
import type Konva from 'konva';

const logger = createLogger('print-rerasterize');

export interface StickerReRasterOptions {
  /** الحجم الفيزيائي لورقة الكانفس كاملة بالمم */
  canvasWidthMM: number;
  canvasHeightMM: number;
  /** دقة الطباعة المستهدفة (printDpi) */
  targetDpi: number;
  /** أصغر دقة تبرّر إعادة التصيير (افتراضي 250 — نفس عقد preflight) */
  minDpi?: number;
  /** أبعاد المصادر (من resolveFreeformImageDimensions) — الغياب يعني تخطي العنصر */
  imageDimensions?: ReadonlyMap<string, { width: number; height: number }>;
  /** رفع الأصل الجديد وإرجاع مسار /local-image/ — يُحقن من المستدعي (uploadPrintImage) */
  upload: (blob: Blob) => Promise<string>;
}

export interface StickerReRasterResult {
  /** استبدال المصادر: القديم → الجديد المرفوع */
  srcMap: Map<string, string>;
  /** أبعاد المصادر الجديدة مفتاحية بالمصدر القديم — لتغذية preflight بعد الترقية */
  newDimensions: Map<string, { width: number; height: number }>;
  /** ملاحظات تُعرض للمستخدم مع تحذيرات preflight */
  notes: string[];
}

/** مصدر ملصق قابل للمعالجة من عنصر صورة */
function stickerSourceOf(el: CanvasElement): StickerElementSource | null {
  if (el.type !== 'image' || el.visible === false || !el.imageSrc) return null;
  const source = (el as ImageElement).stickerSource;
  return source && source.templateId ? source : null;
}

/**
 * البكسلات اللازمة لتغطية مقاس مطبعي بـ targetDpi — نقي للاختبار.
 * يعيد null إذا تجاوز الطلب ميزانية الراستر (50MP).
 */
export function computeTargetRasterPx(
  widthMM: number,
  heightMM: number,
  dpi: number,
): { width: number; height: number } | null {
  if (!(widthMM > 0) || !(heightMM > 0) || !Number.isFinite(dpi) || dpi <= 0) return null;
  const width = mmToPx(widthMM, dpi);
  const height = mmToPx(heightMM, dpi);
  try {
    assertRasterBudget(width, height);
  } catch {
    return null;
  }
  return { width, height };
}

/**
 * إعادة راسترة كل ملصق انخفضت دقته الفعالة عن `minDpi` على مقاسه المطبوع.
 * العناصر المتشابهة (نفس المصدر) تُجمَّع على أكبر مقاس مطلوب فيُصيَّر مرة واحدة.
 */
export async function ensureStickerPrintResolution(
  elements: CanvasElement[],
  options: StickerReRasterOptions,
): Promise<StickerReRasterResult> {
  const srcMap = new Map<string, string>();
  const newDimensions = new Map<string, { width: number; height: number }>();
  const notes: string[] = [];
  const minDpi = options.minDpi ?? 250;

  if (
    !(options.canvasWidthMM > 0) ||
    !(options.canvasHeightMM > 0) ||
    !Number.isFinite(options.targetDpi) ||
    options.targetDpi <= 0
  ) {
    return { srcMap, newDimensions, notes };
  }

  // 1) جمع المقاس المطلوب لكل مصدر مع الحفاظ على نسبة المصدر الأصلية (cover)
  interface Needed {
    widthMM: number;
    heightMM: number;
    sourceAspect: number;
    source: StickerElementSource;
  }
  const neededBySrc = new Map<string, Needed>();

  for (const el of elements) {
    const source = stickerSourceOf(el);
    if (!source) continue;
    const src = (el as ImageElement).imageSrc!;

    const widthMM = el.width * options.canvasWidthMM;
    const heightMM = el.height * options.canvasHeightMM;
    if (!(widthMM > 0) || !(heightMM > 0)) continue;

    const dims = options.imageDimensions?.get(src);
    if (!dims || !(dims.width > 0) || !(dims.height > 0)) continue;

    const crop = computeSlotCrop(dims, widthMM, heightMM, {});
    const dpiX = crop.sw / (widthMM / MM_PER_INCH);
    const dpiY = crop.sh / (heightMM / MM_PER_INCH);
    const effectiveDpi = Math.min(dpiX, dpiY);
    if (!Number.isFinite(effectiveDpi) || effectiveDpi >= minDpi) continue;

    const existing = neededBySrc.get(src);
    if (!existing) {
      neededBySrc.set(src, {
        widthMM,
        heightMM,
        sourceAspect: dims.width / dims.height,
        source,
      });
    } else {
      neededBySrc.set(src, {
        widthMM: Math.max(existing.widthMM, widthMM),
        heightMM: Math.max(existing.heightMM, heightMM),
        sourceAspect: existing.sourceAspect,
        source: existing.source,
      });
    }
  }

  if (neededBySrc.size === 0) {
    return { srcMap, newDimensions, notes };
  }

  // 2) إعادة التصيير والرفع — مصدر واحد مرة واحدة مع حفظ نسبة أبعاد المصدر الأصلية
  let upgraded = 0;
  for (const [oldSrc, need] of neededBySrc) {
    try {
      const svg = await resolveStickerSvg(need.source);
      if (!svg) {
        notes.push('ملصق بلا مصدر متجه قابل لإعادة التصيير — تُطبع دقته الحالية');
        continue;
      }

      const rawTarget = computeTargetRasterPx(need.widthMM, need.heightMM, options.targetDpi);
      if (!rawTarget) {
        notes.push('مقاس طباعة الملصق يتجاوز ميزانية الراستر — تُطبع دقته الحالية');
        continue;
      }
      const rawAspect = rawTarget.width / rawTarget.height;
      const target =
        Math.abs(need.sourceAspect - rawAspect) > 0.01
          ? computeStickerCoverRasterSize(rawTarget.width, rawTarget.height, need.sourceAspect)
          : rawTarget;
      if (!target) {
        notes.push('مقاس طباعة الملصق يتجاوز ميزانية الراستر — تُطبع دقته الحالية');
        continue;
      }

      const fontFamily = need.source.params?.fontFamily || 'Cairo';
      const blob = await renderSvgToPngBlob(svg, target.width, target.height, [fontFamily]);
      const newSrc = await options.upload(blob);

      srcMap.set(oldSrc, newSrc);
      newDimensions.set(oldSrc, target);
      upgraded++;
    } catch (err) {
      // فشل ترقية ملصق لا يُسقط الطباعة — يبقى على مصدره مع بقاء تحذير preflight
      logger.error('Sticker re-rasterization failed:', oldSrc, err);
    }
  }

  if (upgraded > 0) {
    notes.push(
      upgraded === 1
        ? 'أُعيدت راسترة ملصق واحد بدقة الطباعة الكاملة'
        : `أُعيدت راسترة ${upgraded} ملصقات بدقة الطباعة الكاملة`,
    );
  }

  return { srcMap, newDimensions, notes };
}

/** SVG الجاهز من الإدراج أولاً، وإلا إعادة التوليد من القالب والمعاملات المحفوظة (تزامني) */
export function resolveStickerSvgSync(source: StickerElementSource): string | null {
  if (source.svg) return source.svg;
  const template = getStickerTemplateById(source.templateId);
  if (!template) return null;
  try {
    return buildStickerSvg(template, source.params);
  } catch (err) {
    logger.error('Sticker SVG rebuild failed:', source.templateId, err);
    return null;
  }
}

async function resolveStickerSvg(source: StickerElementSource): Promise<string | null> {
  return resolveStickerSvgSync(source);
}

/**
 * يحسب أبعاد الراستر اللازمة لتغطية صندوق العرض (boxW × boxH) دون مطّ أو تكبير
 * مع احترام نسبة أبعاد المصدر وسقف البعد والميزانية الكلية (50MP).
 */
export function computeStickerCoverRasterSize(
  boxW: number,
  boxH: number,
  sourceAspect: number,
  maxDim: number = MAX_RASTER_SIDE,
): { width: number; height: number } | null {
  if (!Number.isFinite(boxW) || !Number.isFinite(boxH) || boxW <= 0 || boxH <= 0) {
    return null;
  }
  const aspect = Number.isFinite(sourceAspect) && sourceAspect > 0 ? sourceAspect : boxW / boxH;
  // cover math: أصغر مستطيل بنسبته يحوي boxW × boxH بالكامل على المحورين
  let needH = Math.max(boxH, boxW / aspect);
  let needW = needH * aspect;

  const sideCap = Math.min(MAX_RASTER_SIDE, maxDim > 0 ? maxDim : MAX_RASTER_SIDE);
  const longest = Math.max(needW, needH);
  if (longest > sideCap) {
    const scale = sideCap / longest;
    needW *= scale;
    needH *= scale;
  }

  let width = Math.max(1, Math.round(needW));
  let height = Math.max(1, Math.round(needH));
  const pixels = width * height;
  if (pixels > MAX_RASTER_PIXELS) {
    const areaScale = Math.sqrt(MAX_RASTER_PIXELS / pixels);
    width = Math.max(1, Math.floor(width * areaScale));
    height = Math.max(1, Math.floor(height * areaScale));
  }
  return { width, height };
}

function readCanvasSourceDims(src: unknown): { width: number; height: number } {
  if (!src || typeof src !== 'object') return { width: 0, height: 0 };
  const s = src as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number;
    height?: number;
  };
  const width = s.naturalWidth && s.naturalWidth > 0 ? s.naturalWidth : s.width || 0;
  const height = s.naturalHeight && s.naturalHeight > 0 ? s.naturalHeight : s.height || 0;
  return { width, height };
}

function findNodeImageSource(stage: Konva.Stage | null | undefined, nodeId: string): unknown {
  if (!stage || typeof stage.findOne !== 'function') return undefined;
  const found = stage.findOne(`#${nodeId}`);
  if (!found) return undefined;
  const direct = found as unknown as { image?: () => unknown; findOne?: (sel: string) => unknown };
  const imgNode =
    typeof direct.image === 'function'
      ? direct
      : typeof direct.findOne === 'function'
        ? (direct.findOne('Image') as unknown as { image?: () => unknown } | null)
        : null;
  return imgNode && typeof imgNode.image === 'function' ? imgNode.image() : undefined;
}

export interface StickerExportOverridesResult {
  imageOverrides: Array<{ nodeId: string; src: string }>;
  srcOverrides: Map<string, string>;
  dispose: () => void;
}

/**
 * ترقية الملصقات المكبّرة عند التصدير كصورة (PNG/JPG) إذا لم يغطّ الراستر
 * الحالي على المسرح (أو المصدر عند غياب المسرح) دقة الكانفس المطلوبة.
 */
export async function prepareStickerExportOverrides(options: {
  elements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  stageRef?: Konva.Stage | null;
}): Promise<StickerExportOverridesResult> {
  const { elements, canvasWidth, canvasHeight, stageRef } = options;
  const imageOverrides: Array<{ nodeId: string; src: string }> = [];
  const srcOverrides = new Map<string, string>();
  const createdUrls: string[] = [];

  for (const el of elements) {
    const source = stickerSourceOf(el);
    if (!source) continue;

    const boxW = el.width * canvasWidth;
    const boxH = el.height * canvasHeight;
    if (boxW <= 0 || boxH <= 0) continue;

    const currentSource = findNodeImageSource(stageRef, el.id);
    const curDims = readCanvasSourceDims(currentSource);
    const aspect =
      curDims.width > 0 && curDims.height > 0 ? curDims.width / curDims.height : boxW / boxH;
    const target = computeStickerCoverRasterSize(boxW, boxH, aspect);
    if (!target) continue;

    // إن كان المسرح يحمل أصلاً راستر ملصق يغطي الحجم المطلوب بهامش 5% فلا داعي لإعادة البناء
    if (curDims.width >= target.width * 0.95 && curDims.height >= target.height * 0.95) {
      continue;
    }

    const svg = resolveStickerSvgSync(source);
    if (!svg) continue;

    try {
      const fontFamily =
        typeof source.params?.fontFamily === 'string' && source.params.fontFamily.trim()
          ? [source.params.fontFamily.trim()]
          : undefined;
      const blob = await renderSvgToPngBlob(svg, target.width, target.height, fontFamily);
      const blobUrl = URL.createObjectURL(blob);
      createdUrls.push(blobUrl);
      imageOverrides.push({ nodeId: el.id, src: blobUrl });
      srcOverrides.set(el.id, blobUrl);
    } catch (err) {
      logger.warn('Failed to re-rasterize enlarged sticker for canvas export:', el.id, err);
    }
  }

  return {
    imageOverrides,
    srcOverrides,
    dispose: () => {
      for (const url of createdUrls) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore cleanup failure
        }
      }
    },
  };
}
