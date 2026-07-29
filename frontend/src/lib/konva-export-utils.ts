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
  const screenRatio = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  // مساحة Konva تستخدم إحداثيات الطباعة ثم تُصغّر للعرض. إعادة الكاش
  // بنسبة DPR فقط بعد التصدير كانت تنشئ canvases ضخمة بلا فائدة.
  const stageScale = node.getStage()?.scaleX() || 1;
  return Math.max(0.1, Math.min(2, stageScale * screenRatio));
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
 * يلتقط canvas من Stage مع إخفاء الطبقات المؤقتة وإعادة بناء الكاش.
 * يعيد data URL أو null عند الفشل.
 */
export async function captureStageDataUrl(
  stage: Konva.Stage,
  targetPixelRatio: number,
  mimeType: string = "image/png",
  quality?: number,
): Promise<string | null> {
  const dataUrl = await withHiddenOverlays(stage, targetPixelRatio, async () => {
    const exportCanvas = stage.toCanvas({ pixelRatio: targetPixelRatio });
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
}
