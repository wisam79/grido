import { createLogger } from '@/lib/logger';

import { getDisplaySource } from './display-image';

import type Konva from 'konva';

const logger = createLogger('konva-export-utils');
const activeStageCaptures = new WeakMap<object, number>();

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

interface UpgradedImageRecord {
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
 * يستبدل نسخ العرض المخفّضة (2048px) بالصور الأصلية قبل الالتقاط،
 * مع تحجيم إحداثيات القص (cropX/Y/Width/Height) بالتناسب مع أبعاد الأصل.
 * بدون ذلك كان الطباعة/التصدير يكبّرون نسخة العرض أو يقصّون الزاوية العلوية
 * فقط من الصورة الكاملة. يعيد قائمة الاستعادة.
 */
function upgradeImagesToFullResolution(stage: Konva.Stage): UpgradedImageRecord[] {
  const restored: UpgradedImageRecord[] = [];
  try {
    const nodes = stage.find('Image') as unknown as KonvaImageNodeLike[];
    for (const node of nodes) {
      const current = node.image();
      const source = getDisplaySource(current as HTMLCanvasElement | null);
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

function restoreImageNodes(restored: UpgradedImageRecord[]): void {
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
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * 🖨️ استبدال مؤقت لصور عقد Konva بمصادر مُرقّاة قبل التقاط الطباعة/التصدير —
 * الند التلو لعذر `upgradeImagesToFullResolution`: نسخ العرض تكفي الشاشة
 * لكن ملصقاً أُعيد راسترته بدقة الطباعة لا يصل للالتقاط عبر srcMap وحده،
 * فكان يُرسم من راستر إدراجه الصغير مهما بلغت ترقيته.
 * يعيد دالة استعادة تُرجع كل عقدة لصورتها السابقة (استدعِها في finally).
 */
export async function swapNodeImagesForCapture(
  stage: Konva.Stage,
  overrides: Array<{ nodeId: string; src: string }>,
  timeoutMs = 8000,
): Promise<() => void> {
  const applied: Array<{ node: KonvaImageNodeLike; image: CanvasImageSource }> = [];
  const loaded = new Map<string, HTMLImageElement>();

  await Promise.all(
    overrides.map(async ({ nodeId, src }) => {
      if (!nodeId || !src || loaded.has(src)) return;
      try {
        const img = await Promise.race([
          loadImageElement(src),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('image load timeout')), timeoutMs),
          ),
        ]);
        loaded.set(src, img);
      } catch (e) {
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
      applied.push({ node, image: node.image() as CanvasImageSource });
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

function restoreScreenCache(previouslyCached: CachedImageNode[]): void {
  for (const img of previouslyCached) {
    try {
      if (img && typeof img.clearCache === 'function') {
        img.clearCache();
        img.cache({ pixelRatio: getScreenPixelRatio(img) });
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
  // 📄 ظل الورقة المخصص لشاشة التحرير — يُخفى تماماً عند التصدير لتبقى الصورة نقية
  const paperShadows = stage.find('.paper-shadow-rect') as unknown as KonvaNodeLike[];
  // 🛠️ طبقة الأدوات والمحوّل ومستطيل التحديد — تُخفى كاملة بنقرة واحدة
  const overlayTools = stage.find('.overlay-tools-layer') as unknown as KonvaNodeLike[];

  try {
    for (const tr of transformers) tr.hide();
    for (const gl of gridLayers) gl.hide();
    for (const cl of columnsLayers) cl.hide();
    for (const ph of slotPlaceholders) ph.hide();
    for (const ah of slotAddHandles) ah.hide();
    for (const ps of paperShadows) ps.hide();
    for (const ot of overlayTools) ot.hide();

    stage.batchDraw();

    return await callback();
  } finally {
    for (const tr of transformers) tr.show();
    for (const gl of gridLayers) gl.show();
    for (const cl of columnsLayers) cl.show();
    for (const ph of slotPlaceholders) ph.show();
    for (const ah of slotAddHandles) ah.show();
    for (const ps of paperShadows) ps.show();
    for (const ot of overlayTools) ot.show();

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
function upgradeCachesForExport(stage: Konva.Stage, targetPixelRatio: number): CachedImageNode[] {
  const cachedNodes: CachedImageNode[] = [];
  try {
    stage.find((node: Konva.Node) => {
      const filteredImage =
        node.getClassName?.() === 'Image' && ((node as Konva.Image).filters()?.length ?? 0) > 0;
      if (node && typeof node.isCached === 'function' && (node.isCached() || filteredImage)) {
        cachedNodes.push(node as unknown as CachedImageNode);
      }
    });
  } catch (err) {
    logger.warn('Failed to query cached nodes before export', err);
    return cachedNodes;
  }

  if (cachedNodes.length === 0) return cachedNodes;

  // تقدير الاستهلاك: width×height×4 بايت × النسبة² لكل عقدة
  const estimateFor = (ratio: number) => {
    let total = 0;
    for (const node of cachedNodes) {
      const n = node as unknown as { width?: () => number; height?: () => number };
      const w = typeof n.width === 'function' ? n.width() : 0;
      const h = typeof n.height === 'function' ? n.height() : 0;
      total += w * h * 4 * ratio * ratio;
    }
    return total;
  };

  const MAX_NODE_RATIO = Math.min(4, Math.max(1, targetPixelRatio));
  let exportRatio = MAX_NODE_RATIO;
  // تنازل تدريجي (خطوة 0.5) حتى الدخول في الميزانية — 1× دائماً ضمن الحد
  while (exportRatio > 1 && estimateFor(exportRatio) > EXPORT_CACHE_BUDGET_BYTES) {
    exportRatio = Math.max(1, exportRatio - 0.5);
  }

  for (const node of cachedNodes) {
    try {
      node.clearCache();
      node.cache({ pixelRatio: exportRatio });
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
}

export async function captureStageBlob(
  stage: Konva.Stage,
  targetPixelRatio: number,
  mimeType: string = 'image/png',
  quality?: number,
  /** أبعاد الورقة بالإحداثيات المنطقية — تصدير مستقل عن الزوم الحالي */
  captureRect?: { x: number; y: number; width: number; height: number },
  options?: CaptureStageOptions,
): Promise<Blob | null> {
  const captureCount = activeStageCaptures.get(stage) ?? 0;
  activeStageCaptures.set(stage, captureCount + 1);
  const prevPos = { x: stage.x(), y: stage.y() };
  const prevScale = { x: stage.scaleX(), y: stage.scaleY() };
  let upgradedImages: UpgradedImageRecord[] = [];
  let cachedNodes: CachedImageNode[] = [];

  try {
    // تُرقّى المصادر والقص قبل الكاش، بما فيه كاش أُبطل قبل اكتمال إيماءة التحرير.
    upgradedImages = options?.useFullResolution ? upgradeImagesToFullResolution(stage) : [];
    cachedNodes = upgradeCachesForExport(stage, targetPixelRatio);
    stage.position({ x: 0, y: 0 });
    stage.scale({ x: 1, y: 1 });
    stage.batchDraw();

    const blob = await withHiddenOverlays(stage, targetPixelRatio, async () => {
      // 🛡️ حاجز الأمان الحقيقي هو حد الميجابكسل الكلي (assertExportablePixels
      // في export-image.ts) الذي يمنع OOM — سقف النسبة هنا يحمي العرض
      // المؤقت فقط. أوراق 300DPI كبيرة (A4/A3) تحتاج نسبة 6×+ مع معاينة 400px،
      // وقسرها على 4× كان يلتقط الكانفاس بدقة مصغرة تُرسم مشوهة عند التسطيح.
      const MAX_EXPORT_RATIO = 8;
      const safePixelRatio = Math.min(MAX_EXPORT_RATIO, Math.max(1, targetPixelRatio));
      // 🛡️ M15: التقاط منطقة الورقة بإحداثياتها المنطقية يجعل دقة التصدير
      // ثابتة مهما كان مستوى التكبير على الشاشة.
      const exportCanvas = captureRect
        ? stage.toCanvas({ ...captureRect, pixelRatio: safePixelRatio })
        : stage.toCanvas({ pixelRatio: safePixelRatio });
      return await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(resolve, mimeType, quality);
      });
    });

    return blob;
  } finally {
    try {
      stage.position(prevPos);
      stage.scale(prevScale);
      restoreImageNodes(upgradedImages);
      restoreScreenCache(cachedNodes);
      stage.batchDraw();
    } finally {
      const remaining = (activeStageCaptures.get(stage) ?? 1) - 1;
      if (remaining > 0) activeStageCaptures.set(stage, remaining);
      else activeStageCaptures.delete(stage);
    }
  }
}
