/**
 * دمج الطبقات وتسطيحها — عمليتان تُنتجان طبقة واحدة من تحديد متعدد.
 *
 * الدمج المنطقي (اتحاد/طرح/تقاطع/استثناء) يعمل على الأشكال المتجهة فقط
 * ويُنتج عنصراً واحداً shape='path' يرسمه ويصدّره المحرّك القائم بلا أي
 * تغيير، فيبقى الشكل الناتج قابلاً للتحرير المتجهي والتصدير عالي الدقة.
 *
 * التسطيح يعمل على أي تحديد مختلط (صور/نصوص/أشكال) ويلتقطه من محرّك Konva
 * بدقة الورقة الكاملة، فيُنتج عنصر صورة واحد — وهو الطريق الوحيد لدمج ما لا
 * يمكن تمثيله متجهياً (نص بخطوطه، صورة بمرشّحاتها).
 *
 * حدود معلنة: حدود الأشكال (stroke) لا تُحوَّل إلى تعبئة قبل الدمج، فتُطبَّق
 * على المحيط الخارجي للنتيجة — وهي نفس النتيجة التي يتوقعها المستخدم من شكل واحد.
 */
import {
  computeStickerCoverRasterSize,
  prepareStickerExportOverrides,
} from '@/features/stickers/lib/print-rerasterize';
import { blobToDataUrl } from '@/lib/canvas/canvas-blob';
import { getDisplayImageOriginalSrc, getDisplaySource } from '@/lib/canvas/display-image';
import { getElementVisualBox } from '@/lib/canvas/element-geometry';
import {
  buildShapeImageFillPatch,
  getImageShapePair,
  isFillableImageShape,
} from '@/lib/canvas/image-shape-fill';
import { captureStageBlob } from '@/lib/canvas/konva-export-utils';
import { mergePaths } from '@/lib/canvas/path-boolean';
import { shapeElementToSegments } from '@/lib/canvas/shape-to-path';
import { isSvgImageSource } from '@/lib/canvas/svg-logo';
import { assertExportablePixels } from '@/lib/export/export-limits';
import { getDocumentSession } from '@/lib/io/document-session';
import { uploadMediaBlob } from '@/lib/io/media-upload';
import { createLogger } from '@/lib/logger';
import { CanvasElementSchema } from '@/lib/schema';
import { canArrangeSelection } from '@/lib/selection-properties';

import { normalizeSelection } from './types';
import { uid } from '../../../utils';

import type {
  ElementCross,
  ElementSlice,
  ImageShapeMaskResult,
  MergeResult,
  RasterizeResult,
  ShapeImageFillResult,
} from './types';
import type { CanvasElement, ImageElement, ShapeElement } from '../../types';
import type { BooleanOp } from '@/lib/canvas/path-boolean';
import type { CubicSeg } from '@/lib/canvas/path-geometry';
import type Konva from 'konva';
import type { StateCreator } from 'zustand';

const logger = createLogger('element-merge');

/**
 * يرفع ناتج التسطيح إلى مسار الوسائط المحلي ليُخزَّن في العنصر وlastEditedImage
 * رابطاً مستقراً بدل Data URL ضخم يتكرر في كل لقطة تاريخ لاحقة — والارتداد إلى
 * Data URL عند تعذر الرفع (خادم الوسائط والاحتياطي معاً) كما يفعل مسار إدراج
 * الملصقات، فلا يضيع عمل المستخدم.
 */
async function uploadRasterBlob(blob: Blob): Promise<string> {
  try {
    const uploaded = await uploadMediaBlob(blob, 'rasterized-selection.png');
    return uploaded.imageSrc;
  } catch (err) {
    logger.warn('Media upload failed for rasterized layer — falling back to data URL', err);
    return blobToDataUrl(blob);
  }
}

/** حارس طزاجة التسطيح بعد انتهاء العمليات غير المتزامنة لمنع تلويث مستند أو حالة أحدث */
function isRasterizeStale(
  state: ElementCross,
  initialSession: number,
  initialProjectId: string | null,
  expectedWidth: number,
  expectedHeight: number,
  sourceRefs: ReadonlyMap<string, CanvasElement>,
): boolean {
  if (getDocumentSession() !== initialSession) return true;
  const currentProjectId = (state as { projectId?: string | null }).projectId ?? null;
  if (currentProjectId !== initialProjectId) return true;
  if (state.mode !== 'single') return true;
  if (state.canvasWidth !== expectedWidth || state.canvasHeight !== expectedHeight) return true;

  let survivingCount = 0;
  for (const el of state.elements) {
    if (!sourceRefs.has(el.id)) continue;
    // الستور immutable: تغير مرجع مصدر واحد يكشف المحتوى والهندسة والرؤية والترتيب،
    // بينما تعديلات العناصر غير المشاركة لا تُبطل نتيجة التحديد.
    if (el !== sourceRefs.get(el.id) || el.locked) return true;
    survivingCount += 1;
  }
  return survivingCount !== sourceRefs.size;
}

/** Shared URI schema, with the additional nonempty requirement for an actual fill. */
function isValidFillSource(src: string): boolean {
  return (
    typeof src === 'string' &&
    !!src.trim() &&
    CanvasElementSchema.shape.fillImageSrc.safeParse(src).success
  );
}

function hasLockedParticipant(elements: readonly CanvasElement[], ids: readonly string[]): boolean {
  const groups = new Set(
    elements.filter((el) => ids.includes(el.id) && el.groupId).map((el) => el.groupId),
  );
  return elements.some(
    (el) => el.locked && (ids.includes(el.id) || (!!el.groupId && groups.has(el.groupId))),
  );
}

/** Resolve the rendered photo itself, not an empty frame/group that could capture blank pixels. */
function liveImageNode(stage: Konva.Stage, id: string): Konva.Image | null {
  const root = stage.findOne(`#${id}`);
  if (!root || root.getStage() !== stage || !root.isVisible()) return null;
  const node = root.getClassName() === 'Image' ? root : (root as Konva.Group).findOne?.('Image');
  if (!node || node.getClassName() !== 'Image' || node.getStage() !== stage || !node.isVisible())
    return null;
  const image = (node as Konva.Image).image();
  if (image instanceof HTMLImageElement)
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
      ? (node as Konva.Image)
      : null;
  return image instanceof HTMLCanvasElement && image.width > 0 && image.height > 0
    ? (node as Konva.Image)
    : null;
}

function hasVectorSvgRender(element: ImageElement): boolean {
  return Boolean(element.stickerSource || isSvgImageSource(element.imageSrc));
}

/** Compare the bitmap's actual original URI, not a desired-src attr refreshed during render. */
function imageSourceMatchesElement(node: Konva.Image, element: ImageElement): boolean {
  const source = node.image();
  if (!(source instanceof HTMLImageElement) && !(source instanceof HTMLCanvasElement)) return false;
  const matches = (src: string | null): boolean => {
    if (!src) return false;
    try {
      return (
        new URL(src, document.baseURI).href === new URL(element.imageSrc, document.baseURI).href
      );
    } catch {
      return false;
    }
  };
  const originalSrc = getDisplayImageOriginalSrc(source);
  if (originalSrc) return matches(originalSrc);
  if (!hasVectorSvgRender(element) || !(source instanceof HTMLCanvasElement)) return false;
  // Generated sticker canvases deliberately are not displayOwnership entries: capture must
  // not swap their vector-generated pixels back to the low-resolution insertion PNG.
  const witness: unknown = node.getAttr?.('gridoStickerRenderSource');
  if (
    !witness ||
    typeof witness !== 'object' ||
    !('source' in witness) ||
    !('baseImage' in witness) ||
    witness.source !== source
  )
    return false;
  const base = witness.baseImage;
  return (
    base instanceof HTMLImageElement &&
    base.complete &&
    base.naturalWidth > 0 &&
    base.naturalHeight > 0 &&
    matches(getDisplayImageOriginalSrc(base))
  );
}

/** Native, unedited photos need no re-encoding; a framed/edited photo must bake the rendered recipe. */
function needsImageCapture(
  image: ImageElement,
  source: CanvasImageSource,
  width: number,
  height: number,
): boolean {
  const full = getDisplaySource(source as HTMLCanvasElement) ?? source;
  const size = full as HTMLImageElement | HTMLCanvasElement;
  const sw = 'naturalWidth' in size ? size.naturalWidth : size.width;
  const sh = 'naturalHeight' in size ? size.naturalHeight : size.height;
  const framed = Math.abs((image.width * width) / (image.height * height) / (sw / sh) - 1) > 0.001;
  return (
    framed ||
    hasVectorSvgRender(image) ||
    (image.maskShape !== undefined && image.maskShape !== 'none') ||
    (image.cropZoom ?? 1) !== 1 ||
    (image.cropPanX ?? 0) !== 0 ||
    (image.cropPanY ?? 0) !== 0 ||
    (image.filter ?? 'none') !== 'none' ||
    (image.brightness ?? 100) !== 100 ||
    (image.contrast ?? 100) !== 100 ||
    (image.saturation ?? 100) !== 100 ||
    (image.blur ?? 0) !== 0 ||
    !!image.flipX ||
    !!image.flipY ||
    image.rotation !== 0 ||
    image.opacity !== 1 ||
    !!image.bgColor ||
    (image.cornerRadius ?? 0) !== 0 ||
    ((image.shadowOpacity ?? 0) > 0 &&
      (!!image.shadowColor ||
        (image.shadowBlur ?? 0) !== 0 ||
        (image.shadowOffsetX ?? 0) !== 0 ||
        (image.shadowOffsetY ?? 0) !== 0)) ||
    (!!image.globalCompositeOperation && image.globalCompositeOperation !== 'source-over')
  );
}

/** خصائص الطلاء والمؤثرات التي تنتقل من الطبقة الأمامية إلى الشكل المدموج */
function inheritPaint(front: ShapeElement): Partial<ShapeElement> {
  return {
    fill: front.fill,
    stroke: front.stroke,
    strokeWidth: front.strokeWidth ?? 0,
    strokeStyle: front.strokeStyle,
    lineCap: front.lineCap,
    fillType: front.fillType,
    fillLinearGradientStartPoint: front.fillLinearGradientStartPoint,
    fillLinearGradientEndPoint: front.fillLinearGradientEndPoint,
    fillLinearGradientColorStops: front.fillLinearGradientColorStops,
    fillRadialGradientStartPoint: front.fillRadialGradientStartPoint,
    fillRadialGradientStartRadius: front.fillRadialGradientStartRadius,
    fillRadialGradientEndPoint: front.fillRadialGradientEndPoint,
    fillRadialGradientEndRadius: front.fillRadialGradientEndRadius,
    fillRadialGradientColorStops: front.fillRadialGradientColorStops,
    fillImageSrc: front.fillImageSrc,
    fillImageFit: front.fillImageFit,
    fillImageScale: front.fillImageScale,
    fillImageRotation: front.fillImageRotation,
    fillImageOffsetX: front.fillImageOffsetX,
    fillImageOffsetY: front.fillImageOffsetY,
    shadowColor: front.shadowColor,
    shadowBlur: front.shadowBlur,
    shadowOffsetX: front.shadowOffsetX,
    shadowOffsetY: front.shadowOffsetY,
    shadowOpacity: front.shadowOpacity,
    globalCompositeOperation: front.globalCompositeOperation,
    name: front.name,
  };
}

/**
 * يجمع مصادر الدمج بترتيب zIndex تصاعدي — الأخير هو الطبقة الأمامية التي
 * تعمل قاطعاً في عملية الطرح. الطبقات المخفية تُستبعد كما في كل أدوات الدمج.
 */
function collectSources(elements: CanvasElement[], selectedIds: string[]): CanvasElement[] {
  const wanted = new Set(selectedIds);
  return elements
    .filter((el) => wanted.has(el.id) && el.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex);
}

export const createElementMergeSlice: StateCreator<
  ElementCross,
  [],
  [],
  Pick<
    ElementSlice,
    | 'mergeSelectedShapes'
    | 'rasterizeSelected'
    | 'fillShapeWithImage'
    | 'maskSelectedImageWithShape'
  >
> = (set, get, api) => ({
  fillShapeWithImage: (id, src, expected, options): ShapeImageFillResult => {
    const state = get();
    if (state.mode !== 'single') return 'wrong-mode';
    if (!isValidFillSource(src)) return 'invalid-source';
    const shape = state.elements.find((element) => element.id === id);
    if (expected && shape !== expected) return 'stale';
    if (hasLockedParticipant(state.elements, [id])) return 'locked';
    if (!isFillableImageShape(shape) || !canArrangeSelection(state.elements, [id]))
      return 'unsupported';
    const patch = buildShapeImageFillPatch(src);
    if (
      Object.entries(patch).every(([key, value]) =>
        Object.is(shape[key as keyof ShapeElement], value),
      )
    )
      return 'unchanged';
    set({
      elements: state.elements.map((element) =>
        element === shape ? { ...shape, ...patch } : element,
      ),
    });
    if (!options?.skipHistory) get().pushHistory();
    return 'ok';
  },

  maskSelectedImageWithShape: async (stage): Promise<ImageShapeMaskResult> => {
    const state = get();
    const { elements, selectedIds, canvasWidth, canvasHeight } = state;
    if (state.mode !== 'single') return 'wrong-mode';
    if (selectedIds.length !== 2 || selectedIds[0] === selectedIds[1])
      return 'need-image-and-shape';
    if (hasLockedParticipant(elements, selectedIds)) return 'locked';
    const pair = getImageShapePair(elements, selectedIds);
    if (!pair) return 'need-image-and-shape';
    const { image, shape } = pair;
    if (!isValidFillSource(image.imageSrc)) return 'invalid-source';
    if (!stage) return 'no-stage';
    if (![canvasWidth, canvasHeight].every((size) => Number.isFinite(size) && size > 0))
      return 'failed';

    const initialSession = getDocumentSession();
    const initialProjectId = (state as { projectId?: string | null }).projectId ?? null;
    const sourceRefs = new Map<string, CanvasElement>([
      [image.id, image],
      [shape.id, shape],
    ]);
    let node: Konva.Image | null;
    try {
      node = liveImageNode(stage, image.id);
      if (node && !imageSourceMatchesElement(node, image)) return 'failed';
    } catch {
      return 'failed';
    }
    if (!node) return 'failed';
    const source = node.image()!;
    let invalidated = false;
    const stateIsStale = (latest: ElementCross) =>
      isRasterizeStale(
        latest,
        initialSession,
        initialProjectId,
        canvasWidth,
        canvasHeight,
        sourceRefs,
      ) || !canArrangeSelection(latest.elements, [...sourceRefs.keys()]);
    const stale = () => invalidated || stateIsStale(get());
    const sourceStillReady = () =>
      liveImageNode(stage, image.id) === node &&
      node.image() === source &&
      imageSourceMatchesElement(node, image);
    // Endpoint comparisons alone miss single→collage→single and size→old-size roundtrips.
    // Latch every invalidating store transition until this operation finishes.
    const unsubscribe = api.subscribe((latest, previous) => {
      // Previous also detects a transition reverted synchronously by an earlier listener.
      if (!invalidated && (stateIsStale(latest) || stateIsStale(previous))) invalidated = true;
    });
    try {
      let imageSrc = image.imageSrc;

      try {
        if (needsImageCapture(image, source, canvasWidth, canvasHeight)) {
          const root = stage.findOne(`#${image.id}`)!;
          // Include frame/mask/background/shadow, but no other element or paper background.
          // World bounds remain independent of the editor's current pan/zoom.
          const rect = root.getClientRect({ relativeTo: stage });
          if (
            ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
            rect.width <= 0 ||
            rect.height <= 0
          )
            return 'failed';
          const targetRatio = Math.max(
            1,
            (shape.width * canvasWidth) / rect.width,
            (shape.height * canvasHeight) / rect.height,
          );
          try {
            assertExportablePixels(
              Math.ceil(rect.width * targetRatio),
              Math.ceil(rect.height * targetRatio),
            );
          } catch {
            return 'too-large';
          }
          const overrides = hasVectorSvgRender(image)
            ? await prepareStickerExportOverrides({
                elements: [image],
                canvasWidth: canvasWidth * targetRatio,
                canvasHeight: canvasHeight * targetRatio,
                stageRef: stage,
              })
            : null;
          let blob: Blob | null;
          try {
            if (stale()) return 'stale';
            if (!sourceStillReady()) return 'failed';
            if (
              hasVectorSvgRender(image) &&
              !overrides?.imageOverrides.some((item) => item.nodeId === image.id)
            ) {
              const current = source as HTMLImageElement | HTMLCanvasElement;
              const sw = 'naturalWidth' in current ? current.naturalWidth : current.width;
              const sh = 'naturalHeight' in current ? current.naturalHeight : current.height;
              const target = computeStickerCoverRasterSize(
                image.width * canvasWidth * targetRatio,
                image.height * canvasHeight * targetRatio,
                sw / sh,
              );
              // Preparation is deliberately tolerant for other export callers. Masking is not:
              // consuming an undersized sticker when its rerasterization failed loses its source.
              if (!target || sw < target.width * 0.95 || sh < target.height * 0.95) return 'failed';
            }
            blob = await captureStageBlob(stage, targetRatio, 'image/png', undefined, rect, {
              useFullResolution: true,
              includeNodeIds: [image.id],
              requireImageNodeIds: [image.id],
              readiness: { images: true },
              imageOverrides: overrides?.imageOverrides,
            });
          } finally {
            overrides?.dispose();
          }
          if (stale()) return 'stale';
          if (!blob || blob.size === 0 || !sourceStillReady()) return 'failed';
          imageSrc = await uploadRasterBlob(blob);
        }
        if (stale()) return 'stale';
        if (!sourceStillReady()) return 'failed';
        if (!isValidFillSource(imageSrc)) return 'invalid-source';
      } catch (error) {
        if (stale()) return 'stale';
        logger.error('Image/shape mask capture failed', error);
        return 'failed';
      }

      // Preserve every target property except its image fill. Consume the source atomically,
      // never its local file; history retains the complete ImageElement and previous shape.
      const latest = get();
      const patch = buildShapeImageFillPatch(imageSrc);
      set({
        elements: latest.elements
          .filter((element) => element.id !== image.id)
          .map((element) => (element === shape ? { ...shape, ...patch } : element)),
        ...normalizeSelection(shape.id),
      });
      get().pushHistory();
      return 'ok';
    } finally {
      unsubscribe();
    }
  },

  mergeSelectedShapes: (op: BooleanOp): MergeResult => {
    const { selectedIds, elements, canvasWidth, canvasHeight } = get();
    if (selectedIds.length < 2) return 'need-two-shapes';

    const sources = collectSources(elements, selectedIds);
    if (sources.length < 2) return 'need-two-shapes';
    if (sources.some((el) => el.locked)) return 'locked';
    if (sources.some((el) => el.type !== 'shape')) return 'unsupported';

    const inputs: CubicSeg[][] = [];
    for (const el of sources) {
      const segs = shapeElementToSegments(el as ShapeElement, canvasWidth, canvasHeight);
      if (!segs || segs.length === 0) return 'unsupported';
      inputs.push(segs);
    }

    let geometry;
    try {
      geometry = mergePaths(inputs, op);
    } catch (err) {
      logger.error('Boolean merge failed', err);
      return 'failed';
    }
    if (!geometry) return 'empty-result';

    const front = sources[sources.length - 1] as ShapeElement;
    const merged: ShapeElement = {
      ...inheritPaint(front),
      id: uid(),
      type: 'shape',
      shape: 'path',
      svgPath: geometry.svgPath,
      // المسار مخزَّن منسَّباً إلى أصل صندوقه فيكفي وضع الصندوق على الورقة
      x: geometry.minX / canvasWidth,
      y: geometry.minY / canvasHeight,
      width: geometry.w / canvasWidth,
      height: geometry.h / canvasHeight,
      rotation: 0,
      opacity: front.opacity ?? 1,
      zIndex: front.zIndex,
      visible: true,
      locked: false,
    } as ShapeElement;

    const sourceIds = new Set(sources.map((el) => el.id));
    set((s) => ({
      elements: [...s.elements.filter((el: CanvasElement) => !sourceIds.has(el.id)), merged],
      ...normalizeSelection(merged.id),
    }));
    get().pushHistory();
    return 'ok';
  },

  rasterizeSelected: async (stage: Konva.Stage | null): Promise<RasterizeResult> => {
    const { selectedIds, elements, canvasWidth, canvasHeight, mode } = get();
    // العناصر تُرسم في طبقة الوضع الحر وحدها — لا وجود لها على كانفاس الكولاج
    if (mode !== 'single') return 'wrong-mode';
    if (!stage) return 'no-stage';

    const sources = collectSources(elements, selectedIds);
    if (sources.length === 0) return 'empty';
    if (sources.some((el) => el.locked)) return 'locked';

    // صندوق التحديد ببكسلات الورقة (مع مراعاة الدوران) مقصوصاً إلى حدود الورقة
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of sources) {
      const box = getElementVisualBox(el, canvasWidth, canvasHeight);
      minX = Math.min(minX, box.x * canvasWidth);
      minY = Math.min(minY, box.y * canvasHeight);
      maxX = Math.max(maxX, (box.x + box.width) * canvasWidth);
      maxY = Math.max(maxY, (box.y + box.height) * canvasHeight);
    }
    const rect = {
      x: Math.max(0, Math.floor(minX)),
      y: Math.max(0, Math.floor(minY)),
      width: 0,
      height: 0,
    };
    rect.width = Math.min(canvasWidth, Math.ceil(maxX)) - rect.x;
    rect.height = Math.min(canvasHeight, Math.ceil(maxY)) - rect.y;
    if (rect.width <= 0 || rect.height <= 0) return 'empty';

    try {
      assertExportablePixels(rect.width, rect.height);
    } catch (err) {
      logger.warn('Rasterize area too large', err);
      return 'too-large';
    }

    const initialSession = getDocumentSession();
    const initialProjectId = (get() as { projectId?: string | null }).projectId ?? null;
    const sourceRefs = new Map(sources.map((el) => [el.id, el]));
    const keepIds = new Set(sourceRefs.keys());

    let imageSrc: string;
    try {
      // نسبة 1 = بكسلات الورقة المنطقية، فهي الدقة الكاملة المستقلة عن الزوم؛
      // إخفاء العقد غير المحددة واستعادة حالتها المرئية الأصلية يتم ذرياً داخل قفل المسرح
      const blob = await captureStageBlob(stage, 1, 'image/png', undefined, rect, {
        useFullResolution: true,
        includeNodeIds: keepIds,
      });
      if (!blob) return 'failed';
      if (
        isRasterizeStale(
          get(),
          initialSession,
          initialProjectId,
          canvasWidth,
          canvasHeight,
          sourceRefs,
        )
      ) {
        return 'failed';
      }
      imageSrc = await uploadRasterBlob(blob);
    } catch (err) {
      logger.error('Rasterize capture failed', err);
      return 'failed';
    }

    const latestState = get();
    if (
      isRasterizeStale(
        latestState,
        initialSession,
        initialProjectId,
        canvasWidth,
        canvasHeight,
        sourceRefs,
      )
    ) {
      return 'failed';
    }

    const front = sources[sources.length - 1];
    const flat: ImageElement = {
      id: uid(),
      type: 'image',
      x: rect.x / canvasWidth,
      y: rect.y / canvasHeight,
      width: rect.width / canvasWidth,
      height: rect.height / canvasHeight,
      rotation: 0,
      // الشفافية والظلال والمرشّحات خُبزت في البكسلات — إبقاء الشفافية الأصلية
      // كان يضاعفها
      opacity: 1,
      zIndex: front.zIndex,
      visible: true,
      locked: false,
      imageSrc,
      filter: 'none',
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      name: front.name,
    } as ImageElement;

    set((s) => ({
      elements: [...s.elements.filter((el: CanvasElement) => !keepIds.has(el.id)), flat],
      ...normalizeSelection(flat.id),
      lastEditedImage: imageSrc,
      lastEditedImageAspect: rect.width / rect.height,
    }));
    get().pushHistory();
    return 'ok';
  },
});
