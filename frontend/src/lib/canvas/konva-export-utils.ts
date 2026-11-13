import { assertExportablePixels } from '@/lib/export/export-limits';
import { createLogger } from '@/lib/logger';

import {
  createCaptureOriginalLease,
  getCapturedOriginal,
  getDisplaySource,
  getOriginalForDisplayedElement,
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
  crop?: { x: number; y: number; width: number; height: number };
}

function getSourceDimensions(src: CanvasImageSource): { width: number; height: number } {
  const img = src as HTMLImageElement & { width?: number; height?: number };
  return {
    width: img.naturalWidth || img.width || 0,
    height: img.naturalHeight || img.height || 0,
  };
}

/**
 * يجلب الأصول الكاملة الغائبة عن الخريطة قبل الترقية المتزامنة — عناصر العرض
 * المشتقة (2048px من Go، ملكية الصور) لا تحمل أصلها في الخريطة الضعيفة، فيُجلب
 * هنا انتظاراً عبر getOriginalForDisplayedElement (كاش وعد ومنع تكرار داخل
 * display-image). captureStageBlob غير متزامنة أصلاً فالانتظار ممكن؛ الفشل
 * الفردي لا يوقف الالتقاط — العقدة تبقى على مشتقها (fallback كامل).
 */
export async function preloadImagesForFullResolution(
  stage: Konva.Stage,
  lease: CaptureOriginalLease,
): Promise<void> {
  try {
    const nodes = stage.find('Image') as unknown as KonvaImageNodeLike[];
    const jobs: Promise<HTMLImageElement | null>[] = [];
    for (const node of nodes) {
      const current = node.image();
      if (current instanceof HTMLImageElement) {
        jobs.push(getOriginalForDisplayedElement(current, lease));
      }
    }
    await Promise.all(jobs);
  } catch (err) {
    logger.warn('Failed to preload full resolution sources for capture', err);
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
): UpgradedImageRecord[] {
  const restored: UpgradedImageRecord[] = [];
  try {
    const nodes = stage.find('Image') as unknown as KonvaImageNodeLike[];
    for (const node of nodes) {
      const current = node.image();
      let source = getDisplaySource(current as HTMLCanvasElement | null);
      if ((!source || source === current) && current instanceof HTMLImageElement) {
        source = getCapturedOriginal(current, lease);
      }
      if (source && current !== source) {
        const record: UpgradedImageRecord = { node, image: current as CanvasImageSource };
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
        restored.push(record);
        node.image(source);
      }
    }
    if (restored.length > 0) stage.batchDraw();
  } catch (err) {
    logger.warn('Failed to upgrade image nodes to full resolution', err);
  }
  return restored;
}

export function restoreImageNodes(restored: UpgradedImageRecord[]): void {
  for (const item of restored) {
    try {
      item.node.image(item.image);
      if (
        item.crop &&
        typeof item.node.cropX === 'function' &&
        typeof item.node.cropY === 'function' &&
        typeof item.node.cropWidth === 'function' &&
        typeof item.node.cropHeight === 'function'
      ) {
        item.node.cropX(item.crop.x);
        item.node.cropY(item.crop.y);
        item.node.cropWidth(item.crop.width);
        item.node.cropHeight(item.crop.height);
      }
    } catch {
      // تجاهل عقدة دُمّرت أثناء الالتقاط
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
): Promise<() => void> {
  const applied: Array<{ node: KonvaImageNodeLike; image: CanvasImageSource; crop?: CropRect }> =
    [];
  const loaded = new Map<string, HTMLImageElement>();

  await Promise.all(
    overrides.map(async ({ nodeId, src }) => {
      if (!nodeId || !src || loaded.has(src)) return;
      try {
        const img = await raceDeadline(
          loadImageElement(src, signal),
          'readiness',
          timeoutMs,
          signal,
        );
        loaded.set(src, img);
      } catch (e) {
        if (signal?.aborted || e instanceof CaptureStageTimeoutError) throw e;
        // فشل تحميل بديل واحد لا يوقف الالتقاط — تبقى العقدة على مصدرها
        logger.warn('Failed to preload upgraded print image:', src, e);
      }
    }),
  );

  for (const { nodeId, src } of overrides) {
    const image = loaded.get(src);
    if (!image) continue;
    try {
      const node = stage.findOne(`#${nodeId}`) as unknown as KonvaImageNodeLike | null;
      if (!node || typeof node.image !== 'function') continue;
      const current = node.image() as CanvasImageSource;
      const record: { node: KonvaImageNodeLike; image: CanvasImageSource; crop?: CropRect } = {
        node,
        image: current,
      };
      // إعادة قياس القصّة بنسبة newDims/oldDims تماماً كمنطق
      // upgradeImagesToFullResolution أعلاه — راستر الطباعة أكبر من المصدر
      // الذي حُسبت عليه قصّة coverCrop بفضاء نسخة العرض، وبلا ذلك يظل
      // إطار القص القديم عالقاً في الزاوية العلوية للمكبَّر.
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
      applied.push(record);
      node.image(image);
    } catch (e) {
      logger.warn('Failed to swap node image for capture:', nodeId, e);
    }
  }
  if (applied.length > 0) stage.batchDraw();

  return () => {
    for (const item of applied) {
      try {
        item.node.image(item.image);
        if (
          item.crop &&
          typeof item.node.cropX === 'function' &&
          typeof item.node.cropY === 'function' &&
          typeof item.node.cropWidth === 'function' &&
          typeof item.node.cropHeight === 'function'
        ) {
          item.node.cropX(item.crop.x);
          item.node.cropY(item.crop.y);
          item.node.cropWidth(item.crop.width);
          item.node.cropHeight(item.crop.height);
        }
      } catch {
        // تجاهل عقدة دُمّرت أثناء الالتقاط
      }
    }
    if (applied.length > 0) stage.batchDraw();
  };
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
  const hiddenNodes = [
    ...transformers,
    ...gridLayers,
    ...columnsLayers,
    ...slotPlaceholders,
    ...slotAddHandles,
    ...collageSelectionRings,
    ...paperShadows,
    ...overlayTools,
    ...magicAiScanners,
  ].map((node) => ({ node, visible: node.visible?.() ?? true }));

  try {
    for (const { node } of hiddenNodes) node.hide();

    stage.batchDraw();

    return await callback();
  } finally {
    for (const { node, visible } of hiddenNodes) {
      if (visible) node.show();
      else node.hide();
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
): Promise<void> {
  const jobs: Promise<unknown>[] = [];
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
        await raceDeadline(
          waitForCaptureReadiness(stage, options.readiness),
          'readiness',
          readinessTimeoutMs,
          options.signal,
        );
        if (options.useFullResolution) {
          await raceDeadline(
            preloadImagesForFullResolution(stage, lease),
            'readiness',
            readinessTimeoutMs,
            options.signal,
          );
        }
        upgradedImages = options.useFullResolution
          ? upgradeImagesToFullResolution(stage, lease)
          : [];
        if (options.imageOverrides?.length) {
          restoreOverrides = await swapNodeImagesForCapture(
            stage,
            options.imageOverrides,
            readinessTimeoutMs,
            options.signal,
          );
        }
        cachedNodes = upgradeCachesForExport(stage, targetPixelRatio);
        stage.position({ x: 0, y: 0 });
        stage.scale({ x: 1, y: 1 });
        stage.batchDraw();

        return await withHiddenOverlays(stage, targetPixelRatio, async () => {
          const width = captureRect?.width ?? stage.width();
          const height = captureRect?.height ?? stage.height();
          const outputWidth = Math.ceil(width * targetPixelRatio);
          const outputHeight = Math.ceil(height * targetPixelRatio);
          assertExportablePixels(outputWidth, outputHeight);
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
        });
      } finally {
        try {
          stage.position(prevPos);
          stage.scale(prevScale);
          restoreOverrides?.();
          restoreImageNodes(upgradedImages);
          restoreScreenCache(cachedNodes);
          stage.batchDraw();
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
