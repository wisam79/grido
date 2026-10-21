import { useEffect, useCallback, useRef } from 'react';

import { useRenderQuality } from '@/lib/canvas/render-quality';
import { useEditorStore } from '@/lib/editor-store';
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
// سقف بكسلات كاش العقدة الواحدة: عقدة 2480×3508 بنسبة 2.5 تعني 218 MiB —
// تكفي وحدها لإغراق VRAM. 24MP (≈96 MiB) تحافظ على حِدّة العرض بلا انفجار.
const MAX_CACHE_PIXELS = 24_000_000;
// لا نعيد الكاش للتكبير إلا إذا زادت الحاجة عنه فعلياً بهامش 5%؛ التكبير
// الطفيف أو التصغير لا يستدعي إعادة خبز (النسخة الأكبر تخدم التصغير بأمان).
const ZOOM_UPGRADE_MARGIN = 1.05;

export function useFilterCache({
  nodeRef,
  image,
  hasFilters,
  canvasWidth,
  filterKey,
}: UseFilterCacheOptions) {
  const isDraggingFilter = useRenderQuality((s) => s.isDraggingFilter);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRatioRef = useRef(0);
  const lastDimsRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const recache = useCallback(
    (force = false) => {
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

      const rawRatio = isDraggingFilter
        ? Math.max(0.25, Math.min(0.5, displayScale * deviceRatio * 0.3))
        : Math.max(0.75, Math.min(2.5, displayScale * deviceRatio * 1.2));

      const nodeW = typeof node.width === 'function' ? node.width() : 0;
      const nodeH = typeof node.height === 'function' ? node.height() : 0;

      // سقف البكسلات لكل عقدة (يشمل التكبير CSS فلا يتضخم الكاش بلا حد)
      const pixelCapRatio =
        nodeW > 0 && nodeH > 0 ? Math.sqrt(MAX_CACHE_PIXELS / (nodeW * nodeH)) : rawRatio;
      const ratio = Math.max(0.25, Math.min(rawRatio, pixelCapRatio));

      // تجنّب إعادة الخبز عند تكبير طفيف: النسخة الحالية كافية بصرياً.
      // تغيّر أبعاد العقدة (تحجيم) يستوجب إعادة خبز مهما كانت النسبة.
      const previous = lastRatioRef.current;
      const dimsChanged = nodeW !== lastDimsRef.current.w || nodeH !== lastDimsRef.current.h;
      const needsUpgrade = ratio > previous * ZOOM_UPGRADE_MARGIN;
      if (!force && previous > 0 && !needsUpgrade && !dimsChanged) {
        return;
      }

      try {
        node.clearCache?.();
        if (nodeW > 0 && nodeH > 0) {
          node.cache?.({ x: 0, y: 0, width: nodeW, height: nodeH, pixelRatio: ratio });
        } else {
          node.cache?.({ pixelRatio: ratio });
        }
        lastRatioRef.current = ratio;
        lastDimsRef.current = { w: nodeW, h: nodeH };
      } catch (err) {
        logger.warn('Failed to cache Konva image', err);
      }
    },
    [nodeRef, canvasWidth, isDraggingFilter],
  );

  // إعادة الكاش فوراً عند تغيّر الصورة/الفلاتر/مفتاح الفلتر/سحب شريط الفلتر
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (!hasFilters) {
      lastRatioRef.current = 0;
      lastDimsRef.current = { w: 0, h: 0 };
      if (typeof node.isCached === 'function' && node.isCached()) {
        try {
          node.clearCache?.();
        } catch {
          // Ignore
        }
      }
      return;
    }

    // تغيّر الصورة/الفلتر/السحب يستلزم خبزاً جديداً بغض النظر عن النسبة السابقة
    recache(true);
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
