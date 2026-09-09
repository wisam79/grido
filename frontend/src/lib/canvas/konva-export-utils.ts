import type Konva from "konva";

interface CachedImageNode {
  clearCache: () => void;
  cache: (opts: { pixelRatio: number }) => void;
  isCached: () => boolean;
  getStage: () => Pick<Konva.Stage, "scaleX"> | null;
}

interface KonvaNodeLike {
  hide: () => void;
  show: () => void;
}

function getScreenPixelRatio(node: CachedImageNode): number {
  const screenRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const stageScale = node.getStage()?.scaleX() || 1;
  return Math.max(0.75, Math.min(2.5, stageScale * screenRatio * 1.2));
}

function restoreScreenCache(previouslyCached: CachedImageNode[]): void {
  for (const img of previouslyCached) {
    try {
      if (img && typeof img.clearCache === "function") {
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
  const transformers = stage.find("Transformer") as unknown as KonvaNodeLike[];
  const gridLayers = stage.find(".grid-layer") as unknown as KonvaNodeLike[];
  const columnsLayers = stage.find(".columns-layer") as unknown as KonvaNodeLike[];

  try {
    for (const tr of transformers) tr.hide();
    for (const gl of gridLayers) gl.hide();
    for (const cl of columnsLayers) cl.hide();

    stage.batchDraw();

    return await callback();
  } finally {
    for (const tr of transformers) tr.show();
    for (const gl of gridLayers) gl.show();
    for (const cl of columnsLayers) cl.show();

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
function upgradeCachesForExport(
  stage: Konva.Stage,
  targetPixelRatio: number,
): CachedImageNode[] {
  const cachedNodes: CachedImageNode[] = [];
  try {
    stage.find((node: Konva.Node) => {
      if (node && typeof node.isCached === "function" && node.isCached()) {
        cachedNodes.push(node as unknown as CachedImageNode);
      }
    });
  } catch (err) {
    console.warn("Failed to query cached nodes before export", err);
    return cachedNodes;
  }

  if (cachedNodes.length === 0) return cachedNodes;

  // تقدير الاستهلاك: width×height×4 بايت × النسبة² لكل عقدة
  const estimateFor = (ratio: number) => {
    let total = 0;
    for (const node of cachedNodes) {
      const n = node as unknown as { width?: () => number; height?: () => number };
      const w = typeof n.width === "function" ? n.width() : 0;
      const h = typeof n.height === "function" ? n.height() : 0;
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
      console.warn("Failed to upgrade node cache for export", e);
    }
  }
  return cachedNodes;
}

/**
 * يلتقط canvas من Stage ويحوله إلى Blob مباشرة — مسار Blob-to-Blob بلا
 * تمرير وسيط بـ Base64/DataURL (يوفر 33% من الحجم + حلقة فك ترميز كاملة).
 * يعيد Blob أو null عند الفشل.
 */
export async function captureStageBlob(
  stage: Konva.Stage,
  targetPixelRatio: number,
  mimeType: string = "image/png",
  quality?: number,
): Promise<Blob | null> {
  const cachedNodes = upgradeCachesForExport(stage, targetPixelRatio);

  try {
    const blob = await withHiddenOverlays(stage, targetPixelRatio, async () => {
      // 🛡️ حاجز الأمان الحقيقي هو حد الميجابكسل الكلي (assertExportablePixels
      // في export-image.ts) الذي يمنع OOM — سقف النسبة هنا يحمي العرض
      // المؤقت فقط. أوراق 300DPI كبيرة (A4/A3) تحتاج نسبة 6×+ مع معاينة 400px،
      // وقسرها على 4× كان يلتقط الكانفاس بدقة مصغرة تُرسم مشوهة عند التسطيح.
      const MAX_EXPORT_RATIO = 8;
      const safePixelRatio = Math.min(MAX_EXPORT_RATIO, Math.max(1, targetPixelRatio));
      const exportCanvas = stage.toCanvas({ pixelRatio: safePixelRatio });
      return await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(resolve, mimeType, quality);
      });
    });

    return blob;
  } finally {
    // إعادة كاش العناصر للعرض العادي على الشاشة للحفاظ على سلاسة الأداء وخفة الذاكرة
    restoreScreenCache(cachedNodes);
  }
}
