import { useEffect, useCallback, useRef } from 'react';
import { useEditorStore } from '@/lib/editor-store';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { createLogger } from '@/lib/logger';

const logger = createLogger('use-filter-cache');

export interface CacheableKonvaNode {
  getStage?: () => { width: () => number } | null;
  width?: () => number;
  height?: () => number;
  isCached?: () => boolean;
  clearCache?: () => void;
  cache?: (opts: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    pixelRatio: number;
  }) => void;
}

interface UseFilterCacheOptions {
  nodeRef: React.RefObject<CacheableKonvaNode | null>;
  image: HTMLImageElement | null | undefined;
  hasFilters: boolean;
  canvasWidth: number;
  filterKey?: string | number;
}

const ZOOM_DEBOUNCE_MS = 120;

export function useFilterCache({
  nodeRef,
  image,
  hasFilters,
  canvasWidth,
  filterKey,
}: UseFilterCacheOptions) {
  const isDraggingFilter = useRenderQuality((s) => s.isDraggingFilter);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const recache = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    const stage = node.getStage?.();
    const stageW = stage && typeof stage.width === 'function' ? stage.width() : 0;
    // 🛡️ M15: الـ Stage أصبح قياساً ثابتاً (zoom=1) والزوم يُطبَّق بـ CSS
    // transform فوقه. بدون ضرب مضاعف الزوم هنا تكون الكاش مبنية على مقياس
    // العرض عند 100% فتبدو الصورة المفلترة ضبابية بعد التكبير والخبز.
    const cssZoom = useEditorStore.getState().canvasZoom;
    const zoom = cssZoom > 0 ? cssZoom : 1;
    const displayScale = stageW > 0 ? (stageW * zoom) / Math.max(1, canvasWidth) : 1;
    const deviceRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const ratio = isDraggingFilter
      ? Math.max(0.25, Math.min(0.5, displayScale * deviceRatio * 0.3))
      : Math.max(0.75, Math.min(2.5, displayScale * deviceRatio * 1.2));

    const nodeW = typeof node.width === 'function' ? node.width() : 0;
    const nodeH = typeof node.height === 'function' ? node.height() : 0;

    try {
      node.clearCache?.();
      if (nodeW > 0 && nodeH > 0) {
        node.cache?.({ x: 0, y: 0, width: nodeW, height: nodeH, pixelRatio: ratio });
      } else {
        node.cache?.({ pixelRatio: ratio });
      }
    } catch (err) {
      logger.warn('Failed to cache Konva image', err);
    }
  }, [nodeRef, canvasWidth, isDraggingFilter]);

  // إعادة الكاش فوراً عند تغيّر الصورة/الفلاتر/مفتاح الفلتر/سحب شريط الفلتر
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (!hasFilters) {
      if (typeof node.isCached === 'function' && node.isCached()) {
        try {
          node.clearCache?.();
        } catch {
          // Ignore
        }
      }
      return;
    }

    recache();
  }, [hasFilters, filterKey, image, recache, nodeRef]);

  // إعادة الكاش بعد استقرار التكبير (Debounce) — الاشتراك المباشر في الستور
  // يمنع إعادة تصيير كل العناصر عند كل خطوة تكبير
  useEffect(() => {
    if (!hasFilters) return;

    const unsubscribe = useEditorStore.subscribe((state, prevState) => {
      if (state.canvasZoom === prevState.canvasZoom) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(recache, ZOOM_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasFilters, recache]);

  // يُعاد للمستدعي لإعادة الكاش صراحةً بعد استقرار التحجيم (onTransformEnd)
  // بدل تضمين الأبعاد في filterKey الذي كان يعيد الكاش المكلف أثناء كل تحجيم
  return recache;
}
