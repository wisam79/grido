import type Konva from 'konva';
import { createLogger } from '@/lib/logger';
import { getDisplaySource } from './display-image';

const logger = createLogger('konva-export-utils');

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
}

/**
 * يستبدل نسخ العرض المخفّضة (2048px) بالصور الأصلية قبل الالتقاط.
 * بدون ذلك كان الطباعة/التصدير يكبّرون نسخة العرض فينخفض الحساب الفعلي
 * تحت 300DPI رغم طلب نسبة عالية. يعيد قائمة الاستعادة.
 */
function upgradeImagesToFullResolution(
  stage: Konva.Stage,
): { node: KonvaImageNodeLike; image: CanvasImageSource }[] {
  const restored: { node: KonvaImageNodeLike; image: CanvasImageSource }[] = [];
  try {
    const nodes = stage.find('Image') as unknown as KonvaImageNodeLike[];
    for (const node of nodes) {
      const current = node.image();
      const source = getDisplaySource(current as HTMLCanvasElement | null);
      if (source && current !== source) {
        restored.push({ node, image: current as CanvasImageSource });
        node.image(source);
      }
    }
    if (restored.length > 0) stage.batchDraw();
  } catch (err) {
    logger.warn('Failed to upgrade image nodes to full resolution', err);
  }
  return restored;
}

function restoreImageNodes(
  restored: { node: KonvaImageNodeLike; image: CanvasImageSource }[],
): void {
  for (const item of restored) {
    try {
      item.node.image(item.image);
    } catch {
      // تجاهل عقدة دُمّرت أثناء الالتقاط
    }
  }
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
  // 📄 ظل الورقة المخصص لشاشة التحرير — يُخفى تماماً عند التصدير لتبقى الصورة نقية
  const paperShadows = stage.find('.paper-shadow-rect') as unknown as KonvaNodeLike[];
  // 🛠️ طبقة الأدوات والمحوّل ومستطيل التحديد — تُخفى كاملة بنقرة واحدة
  const overlayTools = stage.find('.overlay-tools-layer') as unknown as KonvaNodeLike[];

  try {
    for (const tr of transformers) tr.hide();
    for (const gl of gridLayers) gl.hide();
    for (const cl of columnsLayers) cl.hide();
    for (const ph of slotPlaceholders) ph.hide();
    for (const ps of paperShadows) ps.hide();
    for (const ot of overlayTools) ot.hide();

    stage.batchDraw();

    return await callback();
  } finally {
    for (const tr of transformers) tr.show();
    for (const gl of gridLayers) gl.show();
    for (const cl of columnsLayers) cl.show();
    for (const ph of slotPlaceholders) ph.show();
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
      if (node && typeof node.isCached === 'function' && node.isCached()) {
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
  const cachedNodes = upgradeCachesForExport(stage, targetPixelRatio);
  const upgradedImages = options?.useFullResolution ? upgradeImagesToFullResolution(stage) : [];

  // 🧭 في معمارية Viewport Canvas: الـ Stage يحمل إزاحة وزوم مؤقتين.
  // نحفظ الموضع والمقياس ونعيدهما إلى (0,0) و scale=1 لحظياً أثناء الالتقاط لضمان
  // التقاط الورقة بأبعادها المنطقية الأصلية بالضبط 1:1 وبلا أي انحراف عن المركز.
  const prevPos = { x: stage.x(), y: stage.y() };
  const prevScale = { x: stage.scaleX(), y: stage.scaleY() };
  stage.position({ x: 0, y: 0 });
  stage.scale({ x: 1, y: 1 });
  stage.batchDraw();

  try {
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
    stage.position(prevPos);
    stage.scale(prevScale);
    stage.batchDraw();
    // إعادة كاش العناصر للعرض العادي على الشاشة للحفاظ على سلاسة الأداء وخفة الذاكرة
    restoreScreenCache(cachedNodes);
    restoreImageNodes(upgradedImages);
    if (upgradedImages.length > 0) stage.batchDraw();
  }
}
