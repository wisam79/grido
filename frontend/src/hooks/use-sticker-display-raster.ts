import { useEffect, useMemo, useState } from 'react';

import {
  computeStickerCoverRasterSize,
  resolveStickerSvgSync,
} from '@/features/stickers/lib/print-rerasterize';
import { rasterizeSvgToCanvas } from '@/features/stickers/lib/svg-rasterizer';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import { useEditorStore } from '@/lib/editor-store';
import { createLogger } from '@/lib/logger';

import type { StickerElementSource } from '@/lib/store/types';

const logger = createLogger('use-sticker-display-raster');

/** سقف البعد التفاعلي لراستر الملصقات على المسرح — التصدير يرفع فوقه عند الحاجة */
export const MAX_STICKER_DISPLAY_DIM = 3072;
const STICKER_CACHE_MAX_ENTRIES = 24;
const STICKER_CACHE_MAX_BYTES = 128 * 1024 * 1024;
const UPGRADE_HYSTERESIS = 1.05;
const RASTER_DEBOUNCE_MS = 60;
const ZOOM_DEBOUNCE_MS = 120;

interface CacheEntry {
  canvas: HTMLCanvasElement;
  bytes: number;
}

const stickerRasterCache = new Map<string, CacheEntry>();
let totalCacheBytes = 0;

/** دالة هاش سريعة FNV-1a 32-bit لتمييز نص SVG داخل مفتاح الكاش */
function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function cacheBytesFor(canvas: HTMLCanvasElement): number {
  return Math.max(0, canvas.width * canvas.height * 4);
}

function peekCache(key: string): HTMLCanvasElement | null {
  return stickerRasterCache.get(key)?.canvas ?? null;
}

function promoteCache(key: string): HTMLCanvasElement | null {
  const entry = stickerRasterCache.get(key);
  if (!entry) return null;
  stickerRasterCache.delete(key);
  stickerRasterCache.set(key, entry);
  return entry.canvas;
}

function writeCache(key: string, canvas: HTMLCanvasElement): void {
  const existing = stickerRasterCache.get(key);
  if (existing) {
    // ترقية رتيبة: لا نستبدل نسخة أعلى دقة بنسخة أصغر
    if (existing.canvas.width >= canvas.width && existing.canvas.height >= canvas.height) {
      promoteCache(key);
      return;
    }
    totalCacheBytes -= existing.bytes;
    stickerRasterCache.delete(key);
  }

  const bytes = cacheBytesFor(canvas);
  while (
    stickerRasterCache.size > 0 &&
    (stickerRasterCache.size >= STICKER_CACHE_MAX_ENTRIES ||
      totalCacheBytes + bytes > STICKER_CACHE_MAX_BYTES)
  ) {
    const oldestKey = stickerRasterCache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldest = stickerRasterCache.get(oldestKey);
    if (oldest) totalCacheBytes -= oldest.bytes;
    stickerRasterCache.delete(oldestKey);
  }

  stickerRasterCache.set(key, { canvas, bytes });
  totalCacheBytes += bytes;
}

/** تفريغ كاش راستر الملصقات التفاعلي (مفيد للاختبارات وتحرير الذاكرة عند إغلاق المشروع) */
export function clearStickerDisplayCache(): void {
  stickerRasterCache.clear();
  totalCacheBytes = 0;
}

export interface UseStickerDisplayRasterOptions {
  stickerSource?: StickerElementSource;
  nodeW: number;
  nodeH: number;
  baseImage?: HTMLImageElement | null;
}

/**
 * useStickerDisplayRaster — ترقية متجهة حيّة للملصقات على Konva Stage.
 *
 * عند تكبير أي ملصق على الكانفس (أو تكبير العرض فوق دقة الـ PNG الابتدائي)،
 * يعيد تصيير المتجه SVG مباشرةً إلى HTMLCanvasElement بالمقاس المطلوب حتى
 * يظل الملصق حاداً بلا أي بكسلّة، مع كاش LRU رتيب (التصغير لا يعيد الرسم)
 * وحارس ضد التحديثات العرقية والعمل أثناء الإيماءة النشطة.
 */
export function useStickerDisplayRaster({
  stickerSource,
  nodeW,
  nodeH,
  baseImage,
}: UseStickerDisplayRasterOptions): HTMLCanvasElement | null {
  const resolved = useMemo(() => {
    if (!stickerSource) return null;
    const svg = resolveStickerSvgSync(stickerSource);
    if (!svg) return null;
    const fontFamily =
      typeof stickerSource.params?.fontFamily === 'string' && stickerSource.params.fontFamily.trim()
        ? stickerSource.params.fontFamily.trim()
        : '';
    const key = `${svg.length}:${fnv1a32(svg)}:${fontFamily}`;
    return {
      key,
      svg,
      fontFamilies: fontFamily ? [fontFamily] : undefined,
    };
  }, [stickerSource]);

  const [zoomMultiplier, setZoomMultiplier] = useState<number>(() => {
    const z = useEditorStore.getState()?.canvasZoom ?? 1;
    return z > 1 ? Math.min(2, z) : 1;
  });

  // تتبع الزوم باستقرار (Debounce) لعناصر الملصقات فقط دون إعادة رسم عند كل خطوة عجلة
  useEffect(() => {
    if (!resolved) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useEditorStore.subscribe((state, prev) => {
      if (state.canvasZoom === prev.canvasZoom) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const next = state.canvasZoom > 1 ? Math.min(2, state.canvasZoom) : 1;
        setZoomMultiplier((cur) => (Math.abs(cur - next) > 0.05 ? next : cur));
      }, ZOOM_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [resolved]);

  const [rasterState, setRasterState] = useState<{
    key: string;
    canvas: HTMLCanvasElement;
  } | null>(() => {
    if (!resolved) return null;
    const cached = peekCache(resolved.key);
    return cached ? { key: resolved.key, canvas: cached } : null;
  });

  const cachedForKey = resolved ? peekCache(resolved.key) : null;
  const activeCanvas = resolved
    ? (cachedForKey ?? (rasterState?.key === resolved.key ? rasterState.canvas : null))
    : null;

  const baseW = baseImage ? baseImage.naturalWidth || baseImage.width || 0 : 0;
  const baseH = baseImage ? baseImage.naturalHeight || baseImage.height || 0 : 0;

  const target = useMemo(() => {
    if (!resolved || nodeW <= 0 || nodeH <= 0) return null;
    const aspect = baseW > 0 && baseH > 0 ? baseW / baseH : nodeW / nodeH;
    return computeStickerCoverRasterSize(
      nodeW * zoomMultiplier,
      nodeH * zoomMultiplier,
      aspect,
      MAX_STICKER_DISPLAY_DIM,
    );
  }, [resolved, nodeW, nodeH, zoomMultiplier, baseW, baseH]);

  useEffect(() => {
    if (!resolved || !target) return;

    const currentW = Math.max(baseW, cachedForKey?.width ?? 0);
    const currentH = Math.max(baseH, cachedForKey?.height ?? 0);
    const needsUpgrade =
      target.width > currentW * UPGRADE_HYSTERESIS || target.height > currentH * UPGRADE_HYSTERESIS;

    if (!needsUpgrade) {
      if (cachedForKey) promoteCache(resolved.key);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribeInteraction: (() => void) | null = null;

    const runRasterize = async () => {
      if (cancelled) return;
      try {
        const canvas = await rasterizeSvgToCanvas(
          resolved.svg,
          target.width,
          target.height,
          resolved.fontFamilies,
        );
        if (cancelled) return;
        writeCache(resolved.key, canvas);
        const best = promoteCache(resolved.key) ?? canvas;
        setRasterState({ key: resolved.key, canvas: best });
      } catch (err) {
        if (!cancelled) {
          logger.warn('Live sticker raster upgrade failed:', err);
        }
      }
    };

    const scheduleIfSettled = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      const interaction = useCanvasInteraction.getState();
      if (interaction.isTransforming || interaction.isDragging) {
        return;
      }
      timer = setTimeout(() => {
        void runRasterize();
      }, RASTER_DEBOUNCE_MS);
    };

    const interaction = useCanvasInteraction.getState();
    if (interaction.isTransforming || interaction.isDragging) {
      unsubscribeInteraction = useCanvasInteraction.subscribe((state, prev) => {
        if (
          (prev.isTransforming || prev.isDragging) &&
          !state.isTransforming &&
          !state.isDragging
        ) {
          unsubscribeInteraction?.();
          unsubscribeInteraction = null;
          scheduleIfSettled();
        }
      });
    } else {
      scheduleIfSettled();
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribeInteraction?.();
    };
  }, [resolved, target, baseW, baseH, cachedForKey]);

  if (!resolved) return null;
  if (activeCanvas && baseW > 0 && activeCanvas.width <= baseW && activeCanvas.height <= baseH) {
    return null;
  }
  return activeCanvas;
}
