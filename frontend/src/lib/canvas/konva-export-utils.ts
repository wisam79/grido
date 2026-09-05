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
 * يلتقط canvas من Stage مع إخفاء الطبقات المؤقتة وإعادة بناء الكاش على الدقة العالية لضمان نقاء الطباعة.
 * يعيد data URL أو null عند الفشل.
 */
export async function captureStageDataUrl(
  stage: Konva.Stage,
  targetPixelRatio: number,
  mimeType: string = "image/png",
  quality?: number,
): Promise<string | null> {
  // حصر العناصر المحفوظة في الكاش وتكبير الكاش بدقة التصدير العالية لمنع فقدان تفاصيل الفلاتر
  const cachedNodes: CachedImageNode[] = [];
  try {
    stage.find((node: Konva.Node) => {
      if (node && typeof node.isCached === "function" && node.isCached()) {
        cachedNodes.push(node as unknown as CachedImageNode);
      }
    });

    const exportRatio = Math.min(4, Math.max(1, targetPixelRatio));
    for (const node of cachedNodes) {
      try {
        node.clearCache();
        node.cache({ pixelRatio: exportRatio });
      } catch (e) {
        console.warn("Failed to upgrade node cache for export", e);
      }
    }
  } catch (err) {
    console.warn("Failed to query cached nodes before export", err);
  }

  try {
    const dataUrl = await withHiddenOverlays(stage, targetPixelRatio, async () => {
      // 🛡️ إصلاح: تحديد targetPixelRatio بحد أقصى 4 لمنع انهيار الذاكرة
      // كان يستخدم القيمة غير المحددة مباشرة في toCanvas مما يسبب OOM عند DPI عالي
      const safePixelRatio = Math.min(4, Math.max(1, targetPixelRatio));
      const exportCanvas = stage.toCanvas({ pixelRatio: safePixelRatio });
      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(resolve, mimeType, quality);
      });

      if (!blob) return null;

      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    });

    return dataUrl;
  } finally {
    // إعادة كاش العناصر للعرض العادي على الشاشة للحفاظ على سلاسة الأداء وخفة الذاكرة
    restoreScreenCache(cachedNodes);
  }
}
