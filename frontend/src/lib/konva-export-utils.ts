import type Konva from "konva";

interface CachedImageNode {
  clearCache: () => void;
  cache: (opts: { pixelRatio: number }) => void;
  isCached: () => boolean;
}

interface KonvaNodeLike {
  hide: () => void;
  show: () => void;
}

function getScreenPixelRatio(): number {
  const screenRatio = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  return Math.max(1.5, Math.min(2, screenRatio));
}

function restoreScreenCache(previouslyCached: CachedImageNode[]): void {
  for (const img of previouslyCached) {
    try {
      if (img && typeof img.clearCache === "function") {
        img.clearCache();
        img.cache({ pixelRatio: getScreenPixelRatio() });
      }
    } catch {
      // الإبقاء على سلامة التطبيق في حال تم حظر كاش العناصر التي ألغي تثبيتها
    }
  }
}

/**
 * يخفي مؤقتاً مقابض التحكم (Transformer) وطبقات الشبكة والأعمدة،
 * يعيد بناء كاش الصور بدقة التصدير، ثم ينفذ callback للحصول على النتيجة.
 * في finally يستعيد جميع الطبقات والكاش بدقة الشاشة.
 */
export async function withHiddenOverlays<T>(
  stage: Konva.Stage,
  targetPixelRatio: number,
  callback: () => Promise<T> | T,
): Promise<T> {
  const transformers = stage.find("Transformer") as unknown as KonvaNodeLike[];
  const gridLayers = stage.find(".grid-layer") as unknown as KonvaNodeLike[];
  const columnsLayers = stage.find(".columns-layer") as unknown as KonvaNodeLike[];

  const previouslyCached: CachedImageNode[] = [];

  try {
    for (const tr of transformers) tr.hide();
    for (const gl of gridLayers) gl.hide();
    for (const cl of columnsLayers) cl.hide();

    const images = stage.find("Image") as unknown as CachedImageNode[];
    for (const img of images) {
      if (img.isCached()) {
        previouslyCached.push(img);
        img.clearCache();
        img.cache({ pixelRatio: targetPixelRatio });
      }
    }

    stage.batchDraw();

    return await callback();
  } finally {
    for (const tr of transformers) tr.show();
    for (const gl of gridLayers) gl.show();
    for (const cl of columnsLayers) cl.show();

    restoreScreenCache(previouslyCached);
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
