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
import {
  applySvgLogoTint,
  isSvgImageSource,
  loadSanitizedSvgMarkup,
  parseSvgAspectRatio,
  sanitizeSvgTintColor,
} from '@/lib/canvas/svg-logo';
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
  /** استبدال المصادر حسب معرف العنصر — يدعم تعدد ألوان صبغة نفس شعار SVG في الورقة الواحدة */
  elementSrcMap: Map<string, string>;
  /** أبعاد المصادر الجديدة مفتاحية بالمصدر القديم — لتغذية preflight بعد الترقية */
  newDimensions: Map<string, { width: number; height: number }>;
  /** ملاحظات تُعرض للمستخدم مع تحذيرات preflight */
  notes: string[];
}

type VectorPrintTarget =
  | { kind: 'sticker'; source: StickerElementSource; imageSrc: string }
  | { kind: 'svg-logo'; imageSrc: string; svgTintColor?: string };

/** مصدر ملصق أو شعار SVG مستورد قابل للترقية المتجهة */
function vectorTargetOf(el: CanvasElement): VectorPrintTarget | null {
  if (el.type !== 'image' || el.visible === false || !el.imageSrc) return null;
  const img = el as ImageElement;
  if (img.stickerSource?.templateId) {
    return { kind: 'sticker', source: img.stickerSource, imageSrc: img.imageSrc };
  }
  if (isSvgImageSource(img.imageSrc)) {
    return {
      kind: 'svg-logo',
      imageSrc: img.imageSrc,
      svgTintColor: sanitizeSvgTintColor(img.svgTintColor),
    };
  }
  return null;
}

async function resolveSvgLogoMarkup(
  imageSrc: string,
  svgTintColor?: string,
): Promise<string | null> {
  const raw = await loadSanitizedSvgMarkup(imageSrc);
  if (!raw) return null;
  return svgTintColor ? applySvgLogoTint(raw, svgTintColor) : raw;
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
  const elementSrcMap = new Map<string, string>();
  const newDimensions = new Map<string, { width: number; height: number }>();
  const notes: string[] = [];
  const minDpi = options.minDpi ?? 250;

  if (
    !(options.canvasWidthMM > 0) ||
    !(options.canvasHeightMM > 0) ||
    !Number.isFinite(options.targetDpi) ||
    options.targetDpi <= 0
  ) {
    return { srcMap, elementSrcMap, newDimensions, notes };
  }

  // 1) جمع المقاس المطلوب لكل متجه/لون صبغة مع الحفاظ على نسبة المصدر الأصلية (cover)
  interface Needed {
    oldSrc: string;
    widthMM: number;
    heightMM: number;
    sourceAspect?: number;
    target: VectorPrintTarget;
    elementIds: string[];
  }
  const neededByVariant = new Map<string, Needed>();

  for (const el of elements) {
    const target = vectorTargetOf(el);
    if (!target) continue;
    const src = target.imageSrc;

    const widthMM = el.width * options.canvasWidthMM;
    const heightMM = el.height * options.canvasHeightMM;
    if (!(widthMM > 0) || !(heightMM > 0)) continue;

    const dims = options.imageDimensions?.get(src);
    if (target.kind === 'sticker') {
      if (!dims || !(dims.width > 0) || !(dims.height > 0)) continue;
      const crop = computeSlotCrop(dims, widthMM, heightMM, {});
      const dpiX = crop.sw / (widthMM / MM_PER_INCH);
      const dpiY = crop.sh / (heightMM / MM_PER_INCH);
      const effectiveDpi = Math.min(dpiX, dpiY);
      if (!Number.isFinite(effectiveDpi) || effectiveDpi >= minDpi) continue;
    } else {
      const hasTint = Boolean(target.svgTintColor);
      if (!hasTint) {
        if (!dims || !(dims.width > 0) || !(dims.height > 0)) continue;
        const crop = computeSlotCrop(dims, widthMM, heightMM, {});
        const dpiX = crop.sw / (widthMM / MM_PER_INCH);
        const dpiY = crop.sh / (heightMM / MM_PER_INCH);
        const effectiveDpi = Math.min(dpiX, dpiY);
        if (Number.isFinite(effectiveDpi) && effectiveDpi >= minDpi) continue;
      }
    }

    const variantKey =
      target.kind === 'svg-logo' ? `svg::${src}::${target.svgTintColor ?? ''}` : `sticker::${src}`;
    const sourceAspect =
      dims && dims.width > 0 && dims.height > 0 ? dims.width / dims.height : undefined;
    const existing = neededByVariant.get(variantKey);
    if (!existing) {
      neededByVariant.set(variantKey, {
        oldSrc: src,
        widthMM,
        heightMM,
        sourceAspect,
        target,
        elementIds: [el.id],
      });
    } else {
      existing.widthMM = Math.max(existing.widthMM, widthMM);
      existing.heightMM = Math.max(existing.heightMM, heightMM);
      if (!existing.elementIds.includes(el.id)) {
        existing.elementIds.push(el.id);
      }
    }
  }

  if (neededByVariant.size === 0) {
    return { srcMap, elementSrcMap, newDimensions, notes };
  }

  // 2) إعادة التصيير والرفع — كل صيغة متجهة/صبغة مرة واحدة مع حفظ نسبة أبعاد المصدر الأصلية
  let upgradedStickers = 0;
  let upgradedSvgLogos = 0;
  for (const need of neededByVariant.values()) {
    try {
      const svg =
        need.target.kind === 'sticker'
          ? await resolveStickerSvg(need.target.source)
          : await resolveSvgLogoMarkup(need.target.imageSrc, need.target.svgTintColor);
      if (!svg) {
        if (need.target.kind === 'sticker') {
          notes.push('ملصق بلا مصدر متجه قابل لإعادة التصيير — تُطبع دقته الحالية');
        }
        continue;
      }

      const rawTarget = computeTargetRasterPx(need.widthMM, need.heightMM, options.targetDpi);
      if (!rawTarget) {
        notes.push(
          need.target.kind === 'sticker'
            ? 'مقاس طباعة الملصق يتجاوز ميزانية الراستر — تُطبع دقته الحالية'
            : 'مقاس طباعة الشعار يتجاوز ميزانية الراستر — تُطبع دقته الحالية',
        );
        continue;
      }
      const rawAspect = rawTarget.width / rawTarget.height;
      const resolvedAspect = need.sourceAspect ?? parseSvgAspectRatio(svg) ?? rawAspect;
      const target =
        Math.abs(resolvedAspect - rawAspect) > 0.01
          ? computeStickerCoverRasterSize(rawTarget.width, rawTarget.height, resolvedAspect)
          : rawTarget;
      if (!target) {
        notes.push(
          need.target.kind === 'sticker'
            ? 'مقاس طباعة الملصق يتجاوز ميزانية الراستر — تُطبع دقته الحالية'
            : 'مقاس طباعة الشعار يتجاوز ميزانية الراستر — تُطبع دقته الحالية',
        );
        continue;
      }

      const fontFamilies =
        need.target.kind === 'sticker'
          ? [need.target.source.params?.fontFamily || 'Cairo']
          : undefined;
      const blob = await renderSvgToPngBlob(svg, target.width, target.height, fontFamilies);
      const newSrc = await options.upload(blob);

      for (const elId of need.elementIds) {
        elementSrcMap.set(elId, newSrc);
      }
      if (!srcMap.has(need.oldSrc)) {
        srcMap.set(need.oldSrc, newSrc);
      }
      newDimensions.set(need.oldSrc, target);
      if (need.target.kind === 'sticker') upgradedStickers++;
      else upgradedSvgLogos++;
    } catch (err) {
      // فشل ترقية ملصق/شعار لا يُسقط الطباعة — يبقى على مصدره مع بقاء تحذير preflight
      logger.error('Vector/Sticker re-rasterization failed:', need.oldSrc, err);
    }
  }

  if (upgradedStickers > 0) {
    notes.push(
      upgradedStickers === 1
        ? 'أُعيدت راسترة ملصق واحد بدقة الطباعة الكاملة'
        : `أُعيدت راسترة ${upgradedStickers} ملصقات بدقة الطباعة الكاملة`,
    );
  }
  if (upgradedSvgLogos > 0 && upgradedStickers === 0) {
    notes.push(
      upgradedSvgLogos === 1
        ? 'أُعيدت راسترة شعار SVG واحد بدقة الطباعة الكاملة'
        : `أُعيدت راسترة ${upgradedSvgLogos} شعارات SVG بدقة الطباعة الكاملة`,
    );
  }

  return { srcMap, elementSrcMap, newDimensions, notes };
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
    const targetInfo = vectorTargetOf(el);
    if (!targetInfo) continue;

    const boxW = el.width * canvasWidth;
    const boxH = el.height * canvasHeight;
    if (boxW <= 0 || boxH <= 0) continue;

    const currentSource = findNodeImageSource(stageRef, el.id);
    const curDims = readCanvasSourceDims(currentSource);
    const aspect =
      curDims.width > 0 && curDims.height > 0 ? curDims.width / curDims.height : boxW / boxH;
    const target = computeStickerCoverRasterSize(boxW, boxH, aspect);
    if (!target) continue;

    const requiresFreshTintRender =
      targetInfo.kind === 'svg-logo' && Boolean(targetInfo.svgTintColor);
    // إن كان المسرح يحمل أصلاً راستر ملصق/شعار غير ملوّن يغطي الحجم المطلوب بهامش 5% فلا داعي لإعادة البناء
    if (
      !requiresFreshTintRender &&
      curDims.width >= target.width * 0.95 &&
      curDims.height >= target.height * 0.95
    ) {
      continue;
    }

    const svg =
      targetInfo.kind === 'sticker'
        ? resolveStickerSvgSync(targetInfo.source)
        : await resolveSvgLogoMarkup(targetInfo.imageSrc, targetInfo.svgTintColor);
    if (!svg) continue;

    try {
      const fontFamily =
        targetInfo.kind === 'sticker' &&
        typeof targetInfo.source.params?.fontFamily === 'string' &&
        targetInfo.source.params.fontFamily.trim()
          ? [targetInfo.source.params.fontFamily.trim()]
          : undefined;
      const blob = await renderSvgToPngBlob(svg, target.width, target.height, fontFamily);
      const blobUrl = URL.createObjectURL(blob);
      createdUrls.push(blobUrl);
      imageOverrides.push({ nodeId: el.id, src: blobUrl });
      srcOverrides.set(el.id, blobUrl);
    } catch (err) {
      logger.warn('Failed to re-rasterize enlarged vector/sticker for canvas export:', el.id, err);
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
