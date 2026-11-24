import { assertExportablePixels } from '@/lib/export/export-limits';
import { createLogger } from '@/lib/logger';

import {
  createCaptureOriginalLease,
  getCapturedOriginal,
  getDisplaySource,
  getOriginalForDisplayedElement,
  registerDisplayOwnership,
} from './display-image';

import type { CaptureOriginalLease } from './display-image';

import type Konva from 'konva';

const logger = createLogger('konva-export-utils');
const activeStageCaptures = new WeakMap<object, number>();
const stageCaptureTails = new WeakMap<object, Promise<void>>();

export class CaptureStageTimeoutError extends Error {
  constructor(
    readonly phase: 'queue' | 'readiness' | 'toBlob',
    timeoutMs: number,
  ) {
    super(`Stage capture ${phase} timed out after ${timeoutMs}ms`);
    this.name = 'CaptureStageTimeoutError';
  }
}

function abortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason;
  return new DOMException('Stage capture aborted', 'AbortError');
}

function raceDeadline<T>(
  work: Promise<T>,
  phase: 'queue' | 'readiness' | 'toBlob',
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) return Promise.reject(abortError(signal));
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      fn();
    };
    const onAbort = () => finish(() => reject(abortError(signal)));
    const timer = setTimeout(
      () => finish(() => reject(new CaptureStageTimeoutError(phase, timeoutMs))),
      timeoutMs,
    );
    signal?.addEventListener('abort', onAbort, { once: true });
    work.then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error)),
    );
  });
}

async function withSerializedStageCapture<T>(
  stage: object,
  capture: () => Promise<T>,
  options: { signal?: AbortSignal; queueTimeoutMs: number },
): Promise<T> {
  const previous = stageCaptureTails.get(stage) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.catch(() => {}).then(() => current);
  stageCaptureTails.set(stage, tail);

  try {
    await raceDeadline(
      previous.catch(() => {}),
      'queue',
      options.queueTimeoutMs,
      options.signal,
    );
  } catch (error) {
    release();
    void tail.finally(() => {
      if (stageCaptureTails.get(stage) === tail) stageCaptureTails.delete(stage);
    });
    throw error;
  }
  try {
    return await capture();
  } finally {
    release();
    if (stageCaptureTails.get(stage) === tail) stageCaptureTails.delete(stage);
  }
}

/** يحمي كاش الالتقاط من مؤقتات التحرير وتغييرات القص المؤقتة. */
export function isStageCaptureActive(stage: object | null | undefined): boolean {
  return Boolean(stage && activeStageCaptures.has(stage));
}

interface CachedImageNode {
  clearCache: () => void;
  cache: (opts: { pixelRatio: number }) => void;
  isCached: () => boolean;
  getStage: () => Pick<Konva.Stage, 'scaleX'> | null;
}

interface KonvaNodeLike {
  hide: () => void;
  show: () => void;
  visible?: () => boolean;
}

interface KonvaImageNodeLike {
  image: {
    (): CanvasImageSource | undefined;
    (image: CanvasImageSource): void;
  };
  cropX?: {
    (): number;
    (val: number): void;
  };
  cropY?: {
    (): number;
    (val: number): void;
  };
  cropWidth?: {
    (): number;
    (val: number): void;
  };
  cropHeight?: {
    (): number;
    (val: number): void;
  };
}

export interface UpgradedImageRecord {
  node: KonvaImageNodeLike;
  image: CanvasImageSource;
  crop?: CropRect;
}

function getSourceDimensions(src: CanvasImageSource): { width: number; height: number } {
  const img = src as HTMLImageElement & { width?: number; height?: number };
  return {
    width: img.naturalWidth || img.width || 0,
    height: img.naturalHeight || img.height || 0,
  };
}

interface RequiredCaptureImage {
  root: Konva.Node;
  node: Konva.Image;
}

function assertCaptureImageSource(
  source: CanvasImageSource | undefined | null,
  nodeId: string,
): asserts source is CanvasImageSource {
  const dimensions = source
    ? source instanceof HTMLImageElement
      ? { width: source.naturalWidth, height: source.naturalHeight }
      : source instanceof HTMLVideoElement
        ? { width: source.videoWidth, height: source.videoHeight }
        : getSourceDimensions(source)
    : { width: 0, height: 0 };
  if (
    !Number.isFinite(dimensions.width) ||
    !Number.isFinite(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    (source instanceof HTMLImageElement && !source.complete) ||
    (source instanceof HTMLVideoElement && source.readyState < 2)
  ) {
    throw new Error(`Required capture image "${nodeId}" is not ready`);
  }
}

function resolveRequiredCaptureImages(
  stage: Konva.Stage,
  nodeIds?: Iterable<string>,
): Map<string, RequiredCaptureImage> {
  const images = new Map<string, RequiredCaptureImage>();
  for (const nodeId of nodeIds ?? []) {
    const root = nodeId ? stage.findOne<Konva.Node>(`#${nodeId}`) : undefined;
    const node =
      root?.getClassName() === 'Image'
        ? (root as Konva.Image)
        : root && 'findOne' in root
          ? (root as Konva.Group).findOne<Konva.Image>('Image')
          : undefined;
    if (!root || !node || node.getClassName() !== 'Image' || node.getStage() !== stage) {
      throw new Error(`Required capture image "${nodeId}" is missing`);
    }
    if (!node.isVisible()) {
      throw new Error(`Required capture image "${nodeId}" is not visible`);
    }
    assertCaptureImageSource(node.image(), nodeId);
    images.set(nodeId, { root, node });
  }
  return images;
}

function recheckRequiredCaptureImages(
  stage: Konva.Stage,
  required: Map<string, RequiredCaptureImage>,
): void {
  const current = resolveRequiredCaptureImages(stage, required.keys());
  for (const [nodeId, image] of required) {
    const found = current.get(nodeId)!;
    if (found.root !== image.root || found.node !== image.node) {
      throw new Error(`Required capture image "${nodeId}" changed during capture`);
    }
  }
}

async function decodeCaptureImage(source: CanvasImageSource, nodeId: string): Promise<void> {
  if (source instanceof HTMLImageElement && typeof source.decode === 'function') {
    await source.decode();
  }
  assertCaptureImageSource(source, nodeId);
}

/** Preloads through the existing ownership/lease cache; required images never fall back. */
export async function preloadImagesForFullResolution(
  stage: Konva.Stage,
  lease: CaptureOriginalLease,
  requireImageNodeIds?: Iterable<string>,
): Promise<void> {
  const preload = async () => {
    const required = resolveRequiredCaptureImages(stage, requireImageNodeIds);
    const requiredNodes = new Map(Array.from(required, ([id, { node }]) => [node, id]));
    const nodes = stage.find('Image') as unknown as KonvaImageNodeLike[];
    const jobs: Promise<unknown>[] = [];
    for (const node of nodes) {
      const nodeId = requiredNodes.get(node as Konva.Image);
      const current = node.image();
      const source =
        nodeId === undefined
          ? current
          : (getDisplaySource(current as HTMLCanvasElement) ?? current);
      if (source instanceof HTMLImageElement) {
        const load = async () => {
          if (nodeId !== undefined) {
            // Idempotent: a derivative keeps its registered original URL. Ordinary
            // originals gain self-ownership so null means a real preload failure.
            registerDisplayOwnership(source, source.currentSrc || source.src);
          }
          const original = await getOriginalForDisplayedElement(source, lease);
          if (nodeId !== undefined) {
            assertCaptureImageSource(original, nodeId);
            await decodeCaptureImage(original, nodeId);
          }
        };
        jobs.push(
          nodeId !== undefined || requireImageNodeIds === undefined
            ? load()
            : load().catch((err) => logger.warn('Failed to preload full resolution source', err)),
        );
      }
    }
    await Promise.all(jobs);
  };
  if (requireImageNodeIds !== undefined) {
    await preload();
  } else {
    try {
      await preload();
    } catch (err) {
      logger.warn('Failed to preload full resolution sources for capture', err);
    }
  }
}

/**
 * يستبدل نسخ العرض المخفّضة (2048px) بالصور الأصلية قبل الالتقاط،
 * مع تحجيم إحداثيات القص (cropX/Y/Width/Height) بالتناسب مع أبعاد الأصل.
 * بدون ذلك كان الطباعة/التصدير يكبّرون نسخة العرض أو يقصّون الزاوية العلوية
 * فقط من الصورة الكاملة. يعيد قائمة الاستعادة.
 *
 * المصدران المدعومان:
 * 1. بروكسي كانفس له أصل في الخريطة الضعيفة (مصادر غير محلية، أو fallback
 *    الأصل عندما يفشل مشتق Go) — متزامن كما كان.
 * 2. عنصر عرض مشتق من Go (2048px): الأصل الحقيقي في جسر الالتقاط العابر
 *    المعبأ عبر preloadImagesForFullResolution — قراءة متزامنة لا تنتظر.
 */
export function upgradeImagesToFullResolution(
  stage: Konva.Stage,
  lease: CaptureOriginalLease,
  requireImageNodeIds?: Iterable<string>,
): UpgradedImageRecord[] {
  const restored: UpgradedImageRecord[] = [];
  const required = resolveRequiredCaptureImages(stage, requireImageNodeIds);
  const requiredNodes = new Map(Array.from(required, ([id, { node }]) => [node, id]));
  let completed = false;
  try {
    const nodes = stage.find('Image') as unknown as KonvaImageNodeLike[];
    for (const node of nodes) {
      const nodeId = requiredNodes.get(node as Konva.Image);
      try {
        const current = node.image();
        let source = getDisplaySource(current as HTMLCanvasElement | null);
        if (nodeId !== undefined && source) {
          source = getCapturedOriginal(source, lease) ?? source;
        }
        if ((!source || source === current) && current instanceof HTMLImageElement) {
          source = getCapturedOriginal(current, lease);
        }
        if (nodeId !== undefined) {
          if (current instanceof HTMLImageElement && !source) {
            throw new Error(`Required capture image "${nodeId}" original is missing`);
          }
          assertCaptureImageSource(source ?? current, nodeId);
        }
        if (source && current !== source) {
          const record: UpgradedImageRecord = { node, image: current as CanvasImageSource };
          // Register restoration before the first crop/image setter can throw.
          restored.push(record);
          const curDims = getSourceDimensions(current as CanvasImageSource);
          const srcDims = getSourceDimensions(source);
          const cw = typeof node.cropWidth === 'function' ? node.cropWidth() : 0;
          const ch = typeof node.cropHeight === 'function' ? node.cropHeight() : 0;
          if (
            cw > 0 &&
            ch > 0 &&
            curDims.width > 0 &&
            curDims.height > 0 &&
            srcDims.width > 0 &&
            srcDims.height > 0 &&
            typeof node.cropX === 'function' &&
            typeof node.cropY === 'function' &&
            typeof node.cropWidth === 'function' &&
            typeof node.cropHeight === 'function'
          ) {
            const cx = node.cropX();
            const cy = node.cropY();
            record.crop = { x: cx, y: cy, width: cw, height: ch };
            const sx = srcDims.width / curDims.width;
            const sy = srcDims.height / curDims.height;
            node.cropX(Math.round(cx * sx));
            node.cropY(Math.round(cy * sy));
            node.cropWidth(Math.round(cw * sx));
            node.cropHeight(Math.round(ch * sy));
          }
          node.image(source);
        }
      } catch (err) {
        if (nodeId !== undefined || requireImageNodeIds === undefined) throw err;
        logger.warn('Failed to upgrade image node to full resolution', err);
      }
    }
    if (restored.length > 0) stage.batchDraw();
    completed = true;
  } catch (err) {
    if (required.size > 0) throw err;
    logger.warn('Failed to upgrade image nodes to full resolution', err);
  } finally {
    // On strict rejection the outer transaction never receives these records.
    if (!completed && required.size > 0) restoreImageNodes(restored);
  }
  return restored;
}

export function restoreImageNodes(restored: UpgradedImageRecord[]): void {
  for (const item of restored) {
    const restorations: Array<() => void> = [() => item.node.image(item.image)];
    if (item.crop) {
      const crop = item.crop;
      restorations.push(
        () => {
          item.node.cropX?.(crop.x);
        },
        () => {
          item.node.cropY?.(crop.y);
        },
        () => {
          item.node.cropWidth?.(crop.width);
        },
        () => {
          item.node.cropHeight?.(crop.height);
        },
      );
    }
    for (const restore of restorations) {
      try {
        restore();
      } catch {
        // A destroyed node/setter must not skip other image/crop restorations.
      }
    }
  }
}

/** محمّل صورة خام محلي — بلا اعتماد على طبقة lib/export (اتجاه الطبقات) */
function loadImageElement(src: string, signal?: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError(signal));
      return;
    }
    const img = new Image();
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const onAbort = () => {
      cleanup();
      img.onload = null;
      img.onerror = null;
      reject(abortError(signal));
    };
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = (e) => {
      cleanup();
      reject(e);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    img.src = src;
  });
}

/** إطار القص بفضاء مصدر الصورة الحالي — نفس شكل crop في UpgradedImageRecord. */
interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 🖨️ استبدال مؤقت لصور عقد Konva بمصادر مُرقّاة قبل التقاط الطباعة/التصدير —
 * الند التلو لعذر `upgradeImagesToFullResolution`: نسخ العرض تكفي الشاشة
 * لكن ملصقاً أُعيد راسترته بدقة الطباعة لا يصل للالتقاط عبر srcMap وحده،
 * فكان يُرسم من راستر إدراجه الصغير مهما بلغت ترقيته.
 * مع كل استبدال تُعاد قياس قصّة العقدة (cropX/Y/Width/Height) بنسبة أبعاد
 * الراستر الجديد إلى القديم — القصّة محسوبة بفضاء نسخة العرض القديمة،
 * وبلا إعادة قياس يبقى الإطار الصغير عالقاً في الزاوية العلوية فيُطبع مكبَّراً مقطعاً.
 * يعيد دالة استعادة تُرجع كل عقدة لصورتها وقصّتها السابقتين (استدعِها في finally).
 */
export async function swapNodeImagesForCapture(
  stage: Konva.Stage,
  overrides: Array<{ nodeId: string; src: string }>,
  timeoutMs = 8000,
  signal?: AbortSignal,
  requireImageNodeIds?: Iterable<string>,
): Promise<() => void> {
  const applied: UpgradedImageRecord[] = [];
  const loaded = new Map<string, HTMLImageElement>();
  const required = resolveRequiredCaptureImages(stage, requireImageNodeIds);
  const requiredNodes = new Set(Array.from(required.values(), ({ node }) => node));
  const findImage = (nodeId: string) => {
    const found = stage.findOne(`#${nodeId}`) as unknown as
      (KonvaImageNodeLike & { findOne?: (sel: string) => unknown }) | null;
    return (
      found && typeof found.image !== 'function' && typeof found.findOne === 'function'
        ? found.findOne('Image')
        : found
    ) as KonvaImageNodeLike | null;
  };
  const isRequiredOverride = (nodeId: string) =>
    required.size > 0 &&
    (required.has(nodeId) || requiredNodes.has(findImage(nodeId) as Konva.Image));
  const jobs = new Map<string, Promise<HTMLImageElement>>();

  await Promise.all(
    overrides.map(async ({ nodeId, src }) => {
      const requiredOverride = isRequiredOverride(nodeId);
      if (!nodeId || !src) {
        if (requiredOverride)
          throw new Error(`Required capture image "${nodeId}" override is missing`);
        return;
      }
      const load = async () => {
        let job = jobs.get(src);
        if (!job) {
          job = raceDeadline(loadImageElement(src, signal), 'readiness', timeoutMs, signal);
          jobs.set(src, job);
        }
        const img = await job;
        if (requiredOverride) {
          await raceDeadline(decodeCaptureImage(img, nodeId), 'readiness', timeoutMs, signal);
        }
        loaded.set(src, img);
      };
      if (requiredOverride) {
        await load();
      } else {
        try {
          await load();
        } catch (e) {
          if (signal?.aborted || e instanceof CaptureStageTimeoutError) throw e;
          // Default callers retain their current source after an optional failure.
          logger.warn('Failed to preload upgraded print image:', src, e);
        }
      }
    }),
  );
  if (signal?.aborted) throw abortError(signal);
  recheckRequiredCaptureImages(stage, required);

  const restore = () => {
    restoreImageNodes([...applied].reverse());
    if (applied.length > 0) stage.batchDraw();
  };
  let completed = false;
  try {
    for (const { nodeId, src } of overrides) {
      const requiredOverride = isRequiredOverride(nodeId);
      const image = loaded.get(src);
      if (!image) continue;
      try {
        const node = findImage(nodeId);
        if (!node || typeof node.image !== 'function') {
          if (requiredOverride) throw new Error(`Required capture image "${nodeId}" is missing`);
          continue;
        }
        const current = node.image() as CanvasImageSource;
        if (requiredOverride) assertCaptureImageSource(image, nodeId);
        const record: UpgradedImageRecord = { node, image: current };
        // Keep rollback reachable even if a crop/image setter throws midway.
        applied.push(record);
        const oldDims = getSourceDimensions(current);
        const newDims = getSourceDimensions(image);
        const cw = typeof node.cropWidth === 'function' ? node.cropWidth() : 0;
        const ch = typeof node.cropHeight === 'function' ? node.cropHeight() : 0;
        if (
          cw > 0 &&
          ch > 0 &&
          oldDims.width > 0 &&
          oldDims.height > 0 &&
          newDims.width > 0 &&
          newDims.height > 0 &&
          typeof node.cropX === 'function' &&
          typeof node.cropY === 'function' &&
          typeof node.cropWidth === 'function' &&
          typeof node.cropHeight === 'function'
        ) {
          const cx = node.cropX();
          const cy = node.cropY();
          record.crop = { x: cx, y: cy, width: cw, height: ch };
          const sx = newDims.width / oldDims.width;
          const sy = newDims.height / oldDims.height;
          node.cropX(Math.round(cx * sx));
          node.cropY(Math.round(cy * sy));
          node.cropWidth(Math.round(cw * sx));
          node.cropHeight(Math.round(ch * sy));
        }
        node.image(image);
      } catch (e) {
        if (requiredOverride) throw e;
        logger.warn('Failed to swap node image for capture:', nodeId, e);
      }
    }
    if (applied.length > 0) stage.batchDraw();
    completed = true;
    return restore;
  } finally {
    // A rejected helper cannot return its restore closure to the outer transaction.
    if (!completed) restore();
  }
}

function getScreenPixelRatio(node: CachedImageNode): number {
  const screenRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const stageScale = node.getStage()?.scaleX() || 1;
  return Math.max(0.75, Math.min(2.5, stageScale * screenRatio * 1.2));
}

/** عقدة كاش التصدير مع إعدادات كاش الشاشة المحفوظة قبل الترقية. */
interface ExportCacheNode {
  node: CachedImageNode;
  /** نسبة كاش الشاشة المقاسة قبل الترقية — تُستعاد حرفياً بدل الاشتقاق. */
  screenPixelRatio?: number;
}

/**
 * يقيس نسبة كاش الشاشة الحالي من سطح المشهد المخزَّن مقابل أبعاد العقدة —
 * نفس المقام الذي بنى كاش use-filter-cache منطقته ({x:0,y:0,width:nodeW,
 * height:nodeH,pixelRatio:ratio})، فالقسمة تعيد النسبة الحرفية المدورة
 * (±1 بكسل تقريب سطح) بدل اشتقاقها من getScreenPixelRatio الذي قد يعيد
 * قيمة أكبر مما كُبِي به فعلاً.
 */
function readScreenCachePixelRatio(node: CachedImageNode): number | undefined {
  try {
    const cache = (
      node as unknown as {
        _cache?: Map<string, { scene?: { width?: () => number; height?: () => number } }>;
      }
    )._cache;
    const scene = cache?.get?.('canvas')?.scene;
    if (!scene || typeof scene.width !== 'function' || typeof scene.height !== 'function') {
      return undefined;
    }
    const sw = scene.width();
    const sh = scene.height();
    if (!(sw > 0) || !(sh > 0)) return undefined;
    const n = node as unknown as { width?: () => number; height?: () => number };
    const nw = typeof n.width === 'function' ? n.width() : 0;
    const nh = typeof n.height === 'function' ? n.height() : 0;
    const pick = (r: number) => (r > 0 && Number.isFinite(r) ? r : undefined);
    if (nw > 0 && nh > 0) {
      const rw = sw / nw;
      const rh = sh / nh;
      // تقريب سطح الكانفس قد يفصل النسبتين جزرياً — التطابق يعتمد العرض
      return pick(Math.abs(rw - rh) <= 0.01 ? rw : Math.max(rw, rh));
    }
    if (nw > 0) return pick(sw / nw);
    if (nh > 0) return pick(sh / nh);
    return undefined;
  } catch {
    return undefined;
  }
}

function restoreScreenCache(previouslyCached: ExportCacheNode[]): void {
  for (const entry of previouslyCached) {
    const img = entry?.node;
    try {
      if (img && typeof img.clearCache === 'function') {
        img.clearCache();
        // 🛡️ الاستعادة الحرفية: النسبة المحفوظة قبل الترقية لا الاشتقاق من
        // getScreenPixelRatio — حتى لا يعود كاش الشاشة أكبر من قبله بعد
        // التصدير. الإحداثيات (x:0,y:0,width,height) تُعاد من صندوق العقدة
        // نفسه كما بناها use-filter-cache، فالنسبة هي المقاس الحاكم.
        img.cache({ pixelRatio: entry.screenPixelRatio ?? getScreenPixelRatio(img) });
      }
    } catch {
      // الإبقاء على سلامة التطبيق في حال تم حظر كاش العناصر التي ألغي تثبيتها
    }
  }
}

/**
 * يخفي مؤقتاً مقابض التحكم (Transformer) وطبقات الشبكة والأعمدة أثناء التصدير،
 * ثم يستعيدها فوراً بعد التقاط الكانفاس لتفادي إرهاق الذاكرة VRAM.
 */
export async function withHiddenOverlays<T>(
  stage: Konva.Stage,
  _targetPixelRatio: number,
  callback: () => Promise<T> | T,
  extraNodeIds?: Iterable<string>,
  includeNodeIds?: Iterable<string>,
): Promise<T> {
  const transformers = stage.find('Transformer') as unknown as KonvaNodeLike[];
  const gridLayers = stage.find('.grid-layer') as unknown as KonvaNodeLike[];
  const columnsLayers = stage.find('.columns-layer') as unknown as KonvaNodeLike[];
  // 🔲 لبنات الخلايا الفارغة إشارة واجهة لا محتوى مطبوع/مصدَّر: إخفاؤها يجعل
  // التقاط الطباعة يطابق مسار التصدير (الذي لا يرسم أي بديل للخلايا الفارغة)
  const slotPlaceholders = stage.find('.slot-placeholder') as unknown as KonvaNodeLike[];
  // ➕ أزرار إضافة الخلية المجاورة إشارة واجهة تحريرية — تُخفى عند الالتقاط والطباعة
  const slotAddHandles = stage.find('.slot-add-handles') as unknown as KonvaNodeLike[];
  // 🔵 حلقة تحديد الخلية إشارة تحرير — كانت تتسرّب إلى الصورة المصدَّرة
  const collageSelectionRings = stage.find('.collage-selection-ring') as unknown as KonvaNodeLike[];
  // 📄 ظل الورقة المخصص لشاشة التحرير — يُخفى تماماً عند التصدير لتبقى الصورة نقية
  const paperShadows = stage.find('.paper-shadow-rect') as unknown as KonvaNodeLike[];
  // 🛠️ طبقة الأدوات والمحوّل ومستطيل التحديد — تُخفى كاملة بنقرة واحدة
  const overlayTools = stage.find('.overlay-tools-layer') as unknown as KonvaNodeLike[];
  const magicAiScanners = stage.find('.magic-ai-scanner') as unknown as KonvaNodeLike[];

  const uniqueNodes = new Set<KonvaNodeLike>([
    ...transformers,
    ...gridLayers,
    ...columnsLayers,
    ...slotPlaceholders,
    ...slotAddHandles,
    ...collageSelectionRings,
    ...paperShadows,
    ...overlayTools,
    ...magicAiScanners,
  ]);
  if (extraNodeIds && typeof stage.findOne === 'function') {
    for (const id of extraNodeIds) {
      const node = stage.findOne<Konva.Node>(`#${id}`) as unknown as KonvaNodeLike | undefined;
      if (node) uniqueNodes.add(node);
    }
  }
  if (includeNodeIds) {
    // حل العقد من المسرح الحالي داخل معاملة الالتقاط، لا من قائمة استبعاد
    // سبقت انتظار الطابور. أبقِ أسلاف المحدد وأبناءه (خلفيات/نصوص/صور المجموعة).
    const includedNodes = new Set<Konva.Node>();
    const includedAncestors = new Set<Konva.Node>();
    for (const id of includeNodeIds) {
      const node = stage.findOne<Konva.Node>(`#${id}`);
      if (!node) continue;
      includedNodes.add(node);
      includedAncestors.add(node);
      for (const ancestor of node.getAncestors()) includedAncestors.add(ancestor);
    }
    stage.find((node: Konva.Node) => {
      if (
        !includedAncestors.has(node) &&
        !node.getAncestors().some((ancestor) => includedNodes.has(ancestor))
      ) {
        uniqueNodes.add(node);
      }
      return false;
    });
  }
  const hiddenNodes = Array.from(uniqueNodes, (node) => ({
    node,
    visible: node.visible?.() ?? true,
  }));

  try {
    for (const { node } of hiddenNodes) node.hide();

    stage.batchDraw();

    return await callback();
  } finally {
    for (const { node, visible } of hiddenNodes) {
      try {
        if (visible) node.show();
        else node.hide();
      } catch {
        // عقدة أُزيلت أثناء الالتقاط — لا شيء لاستعادته
      }
    }

    stage.batchDraw();
  }
}

/**
 * 🛡️ سقف ميزانية الذاكرة لكاش عقد التصدير (بالبايت، منطقة بكسلات RGBA).
 * node.cache({ pixelRatio }) يضخم مساحة البكسل بنسبة² — نسبة 8× تعني 64× مساحة
 * العنصر الواحد. بدون سقف، عقدة 500×500 تستهلك ~64MB، ومجموعة عقد تسبب OOM.
 */
const EXPORT_CACHE_BUDGET_BYTES = 256 * 1024 * 1024;

/**
 * يجمع كاش العقد على نسبة التصدير ضمن ميزانية ذاكرة إجمالية، وتنازل تدريجي
 * للنسبة عند تجاوزها (كل العقد تخفض معاً لتفادي خلط جودات داخل لقطة واحدة).
 */
function upgradeCachesForExport(stage: Konva.Stage, targetPixelRatio: number): ExportCacheNode[] {
  const cachedNodes: ExportCacheNode[] = [];
  try {
    stage.find((node: Konva.Node) => {
      const filteredImage =
        node.getClassName?.() === 'Image' && ((node as Konva.Image).filters()?.length ?? 0) > 0;
      if (node && typeof node.isCached === 'function' && (node.isCached() || filteredImage)) {
        const img = node as unknown as CachedImageNode;
        // 📸 حفظ إعدادات كاش الشاشة قبل الترقية (النسبة المقاسة من سطح المشهد
        // الفعلي) — استعادتها حرفياً في restoreScreenCache بدل الاشتقاق.
        cachedNodes.push({ node: img, screenPixelRatio: readScreenCachePixelRatio(img) });
      }
    });
  } catch (err) {
    logger.warn('Failed to query cached nodes before export', err);
    return cachedNodes;
  }

  if (cachedNodes.length === 0) return cachedNodes;

  // تقدير الاستهلاك بالأسطح الفعلية الثلاث لكل عقدة مخزَّنة (فحص مصدر Konva):
  // مشهد عند r (4WH·r²) + فلتر عند r (4WH·r²) + إصابة عند 1 (4WH) أي
  // 4WH·(2r²+1) بايت — نفس صيغة H2b في use-filter-cache. التقدير القديم
  // 4WH·r² كان يحسب مشهد المشهد وحده فترك كانفسي الفلتر والإصابة خارج
  // الميزانية فسمح بنسب تتجاوز السقف الفعلي بالذروة.
  const estimateFor = (ratio: number) => {
    let total = 0;
    for (const entry of cachedNodes) {
      const n = entry.node as unknown as { width?: () => number; height?: () => number };
      const w = typeof n.width === 'function' ? n.width() : 0;
      const h = typeof n.height === 'function' ? n.height() : 0;
      if (w > 0 && h > 0) total += w * h * 4 * (2 * ratio * ratio + 1);
    }
    return total;
  };

  const MAX_NODE_RATIO = Math.min(4, Math.max(1, targetPixelRatio));
  let exportRatio = MAX_NODE_RATIO;
  // تنازل تدريجي (خطوة 0.5) حتى الدخول في الميزانية — 1× أرضية النزول
  while (exportRatio > 1 && estimateFor(exportRatio) > EXPORT_CACHE_BUDGET_BYTES) {
    exportRatio = Math.max(1, exportRatio - 0.5);
  }
  // ⚠️ تحذير الميزانية: بقاء المجموع فوق السقف حتى عند 1× يعني أرضية ثابتة
  // لا يخفضها التنازل (عدد عقد مخبأة ضخم) — يُسجل بدل الصمت لتشخيص الورقة.
  if (exportRatio <= 1 && estimateFor(1) > EXPORT_CACHE_BUDGET_BYTES) {
    logger.warn(
      'Export cache budget exceeded even at pixelRatio 1 —',
      `nodes=${cachedNodes.length}`,
      `estimated=${Math.round(estimateFor(1) / (1024 * 1024))}MiB`,
      `budget=${Math.round(EXPORT_CACHE_BUDGET_BYTES / (1024 * 1024))}MiB`,
    );
  }

  for (const entry of cachedNodes) {
    try {
      entry.node.clearCache();
      entry.node.cache({ pixelRatio: exportRatio });
    } catch (e) {
      logger.warn('Failed to upgrade node cache for export', e);
    }
  }
  return cachedNodes;
}

/**
 * يلتقط canvas من Stage ويحوله إلى Blob مباشرة — مسار Blob-to-Blob بلا
 * تمرير وسيط بـ Base64/DataURL (يوفر 33% من الحجم + حلقة فك ترميز كاملة).
 * يعيد Blob أو null عند الفشل.
 */
export interface CaptureStageOptions {
  /** استبدال نسخ العرض 2048px بالأصل قبل الالتقاط (دقة طباعة كاملة). */
  useFullResolution?: boolean;
  /** بدائل عقد الصور؛ التحميل والتبديل والاستعادة كلها داخل قفل المسرح. */
  imageOverrides?: Array<{ nodeId: string; src: string }>;
  /** معرفات عقد إضافية تُخفى وتُستعاد حالتها المرئية الأصلية ذرياً داخل قفل المسرح. */
  hiddenNodeIds?: Iterable<string>;
  /** التقاط هذه العقد وأبنائها فقط؛ تُحل العقد وتُعزل وتُستعاد الرؤية داخل قفل المسرح. */
  includeNodeIds?: Iterable<string>;
  /** Opt-in fail-closed Images (or image Group roots); pass element image.id with includeNodeIds. */
  requireImageNodeIds?: Iterable<string>;
  signal?: AbortSignal;
  queueTimeoutMs?: number;
  readinessTimeoutMs?: number;
  toBlobTimeoutMs?: number;
  /** انتظار خطوط المستند وصور عقد Konva المرئية قبل تعديل المسرح. */
  readiness?: { fonts?: boolean; images?: boolean };
}

const DEFAULT_QUEUE_TIMEOUT_MS = 10_000;
const DEFAULT_READINESS_TIMEOUT_MS = 10_000;
const DEFAULT_TO_BLOB_TIMEOUT_MS = 30_000;

async function waitForCaptureReadiness(
  stage: Konva.Stage,
  readiness: CaptureStageOptions['readiness'],
  required: Map<string, RequiredCaptureImage>,
): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  for (const [nodeId, { node }] of required) {
    jobs.push(decodeCaptureImage(node.image()!, nodeId));
  }
  if (readiness?.fonts && typeof document !== 'undefined' && document.fonts?.ready) {
    jobs.push(document.fonts.ready);
  }
  if (readiness?.images) {
    const nodes = stage.find('Image') as unknown as KonvaImageNodeLike[];
    for (const node of nodes) {
      const image = node.image();
      if (!(image instanceof HTMLImageElement) || image.complete) continue;
      jobs.push(
        new Promise<void>((resolve, reject) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => reject(new Error('Capture image failed to load')), {
            once: true,
          });
        }),
      );
    }
  }
  await Promise.all(jobs);
}

export async function captureStageBlob(
  stage: Konva.Stage,
  targetPixelRatio: number,
  mimeType: string = 'image/png',
  quality?: number,
  /** أبعاد الورقة بالإحداثيات المنطقية — تصدير مستقل عن الزوم الحالي */
  captureRect?: { x: number; y: number; width: number; height: number },
  options: CaptureStageOptions = {},
): Promise<Blob | null> {
  if (!Number.isFinite(targetPixelRatio) || targetPixelRatio <= 0) {
    throw new RangeError('targetPixelRatio must be a finite positive number');
  }
  const queueTimeoutMs = options.queueTimeoutMs ?? DEFAULT_QUEUE_TIMEOUT_MS;
  const readinessTimeoutMs = options.readinessTimeoutMs ?? DEFAULT_READINESS_TIMEOUT_MS;
  const toBlobTimeoutMs = options.toBlobTimeoutMs ?? DEFAULT_TO_BLOB_TIMEOUT_MS;

  return withSerializedStageCapture(
    stage,
    async () => {
      if (options.signal?.aborted) throw abortError(options.signal);
      const captureCount = activeStageCaptures.get(stage) ?? 0;
      activeStageCaptures.set(stage, captureCount + 1);
      const prevPos = { x: stage.x(), y: stage.y() };
      const prevScale = { x: stage.scaleX(), y: stage.scaleY() };
      const lease = createCaptureOriginalLease();
      let upgradedImages: UpgradedImageRecord[] = [];
      let restoreOverrides: (() => void) | undefined;
      let cachedNodes: ExportCacheNode[] = [];

      try {
        // Materialize one-shot iterables only after acquiring the Stage lock.
        const requiredIds = options.requireImageNodeIds
          ? Array.from(options.requireImageNodeIds)
          : undefined;
        const requiredImages = resolveRequiredCaptureImages(stage, requiredIds);
        await raceDeadline(
          waitForCaptureReadiness(stage, options.readiness, requiredImages),
          'readiness',
          readinessTimeoutMs,
          options.signal,
        );
        if (options.useFullResolution) {
          await raceDeadline(
            preloadImagesForFullResolution(stage, lease, requiredIds),
            'readiness',
            readinessTimeoutMs,
            options.signal,
          );
        }
        if (options.signal?.aborted) throw abortError(options.signal);
        recheckRequiredCaptureImages(stage, requiredImages);
        upgradedImages = options.useFullResolution
          ? upgradeImagesToFullResolution(stage, lease, requiredIds)
          : [];
        if (options.imageOverrides?.length) {
          restoreOverrides = await swapNodeImagesForCapture(
            stage,
            options.imageOverrides,
            readinessTimeoutMs,
            options.signal,
            requiredIds,
          );
        }
        cachedNodes = upgradeCachesForExport(stage, targetPixelRatio);
        stage.position({ x: 0, y: 0 });
        stage.scale({ x: 1, y: 1 });
        stage.batchDraw();

        return await withHiddenOverlays(
          stage,
          targetPixelRatio,
          async () => {
            const width = captureRect?.width ?? stage.width();
            const height = captureRect?.height ?? stage.height();
            const outputWidth = Math.ceil(width * targetPixelRatio);
            const outputHeight = Math.ceil(height * targetPixelRatio);
            assertExportablePixels(outputWidth, outputHeight);
            if (options.signal?.aborted) throw abortError(options.signal);
            // React may unmount/replace the required child while originals/overrides load.
            recheckRequiredCaptureImages(stage, requiredImages);
            const exportCanvas = captureRect
              ? stage.toCanvas({ ...captureRect, pixelRatio: targetPixelRatio })
              : stage.toCanvas({ pixelRatio: targetPixelRatio });
            return await raceDeadline(
              new Promise<Blob | null>((resolve) => {
                exportCanvas.toBlob(resolve, mimeType, quality);
              }),
              'toBlob',
              toBlobTimeoutMs,
              options.signal,
            );
          },
          options.hiddenNodeIds,
          options.includeNodeIds,
        );
      } finally {
        try {
          for (const restore of [
            () => stage.position(prevPos),
            () => stage.scale(prevScale),
            () => restoreOverrides?.(),
            () => restoreImageNodes(upgradedImages),
            () => restoreScreenCache(cachedNodes),
            () => stage.batchDraw(),
          ]) {
            try {
              restore();
            } catch (err) {
              // A destroyed Stage/node must not prevent the remaining restorations.
              logger.warn('Failed to restore stage capture state', err);
            }
          }
        } finally {
          lease.release();
          const remaining = (activeStageCaptures.get(stage) ?? 1) - 1;
          if (remaining > 0) activeStageCaptures.set(stage, remaining);
          else activeStageCaptures.delete(stage);
        }
      }
    },
    { signal: options.signal, queueTimeoutMs },
  );
}
