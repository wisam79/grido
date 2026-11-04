import { useEffect, useCallback, useRef } from 'react';

import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import { isStageCaptureActive } from '@/lib/canvas/konva-export-utils';
import { useRenderQuality } from '@/lib/canvas/render-quality';
import { useEditorStore } from '@/lib/editor-store';
import { createLogger } from '@/lib/logger';

const logger = createLogger('use-filter-cache');

export interface CacheableKonvaNode {
  getStage?: () => { width: () => number; scaleX?: () => number } | null;
  width?: () => number;
  height?: () => number;
  isDragging?: () => boolean;
  getLayer?: () => { batchDraw: () => void } | null;
  on?: (events: string, callback: () => void) => unknown;
  off?: (events: string) => unknown;
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
  targetId?: string;
  nodeRef: React.RefObject<CacheableKonvaNode | null>;
  image: HTMLImageElement | null | undefined;
  hasFilters: boolean;
  canvasWidth: number;
  filterKey?: string | number;
  /** إبطال قصّ الصورة بأحداث العقدة، دون ربط الكاش بإحداثيات كل إطار. */
  observeCropChanges?: boolean;
}

const ZOOM_DEBOUNCE_MS = 120;
const CROP_DEBOUNCE_MS = 500;
const CROP_EVENTS =
  'cropXChange.filterCache cropYChange.filterCache cropWidthChange.filterCache cropHeightChange.filterCache widthChange.filterCache heightChange.filterCache';
// سقف بكسلات كاش العقدة الواحدة: عقدة 2480×3508 بنسبة 2.5 تعني 218 MiB —
// تكفي وحدها لإغراق VRAM. 24MP (≈96 MiB) تحافظ على حِدّة العرض بلا انفجار.
// H2b: القيمة هي الميزانية الإجمالية لأسطح الكاش الثلاثة (انظر pixelCapRatio
// أدناه) لا لمسح المشهد وحده.
const MAX_CACHE_PIXELS = 24_000_000;
// أرضية نسبة الكاش عند تجاوز العقدة نفسها الميزانية (حتى لا تنزل للصفر).
const MIN_CACHE_RATIO = 0.25;
// لا نعيد الكاش للتكبير إلا إذا زادت الحاجة عنه فعلياً بهامش 5%؛ التكبير
// الطفيف أو التصغير لا يستدعي إعادة خبز (النسخة الأكبر تخدم التصغير بأمان).
const ZOOM_UPGRADE_MARGIN = 1.05;

export function useFilterCache({
  targetId,
  nodeRef,
  image,
  hasFilters,
  canvasWidth,
  filterKey,
  observeCropChanges = false,
}: UseFilterCacheOptions) {
  const isDraggingFilter = useRenderQuality((s) => {
    if (!s.isDraggingFilter) return false;
    if (!targetId || !s.draggingFilterId) return s.isDraggingFilter;
    if (s.draggingFilterId === targetId) return true;
    const selectedIds = useEditorStore.getState().selectedIds;
    return (
      selectedIds.length > 1 &&
      selectedIds.includes(targetId) &&
      selectedIds.includes(s.draggingFilterId)
    );
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cropTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cropPendingRef = useRef(false);
  // #16 — جسر يتيح لمسار الرفض المبكر في recache برمجة نفس مؤقّت التسوية
  // (settle) الذي تُبرمه بقية المسارات داخل أثر أحداث القصّ أدناه.
  const scheduleSettleRef = useRef<(() => void) | null>(null);
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
      if (!node || !hasFilters) return;
      const stage = node.getStage?.();
      if (observeCropChanges) {
        const interaction = useCanvasInteraction.getState();
        if (
          cropPendingRef.current ||
          node.isDragging?.() ||
          interaction.isDragging ||
          interaction.isTransforming ||
          isStageCaptureActive(stage)
        ) {
          cropPendingRef.current = true;
          // #16 — كان هذا المسار يعود دون برمجة أي موعد تسوية: لو استُدعي
          // recache أثناء التقاط المسرح (تصدير) بقي العلم عالقاً true للأبد
          // فتُتجاهل كل تغييرات الفلاتر لاحقاً ويبقى الـ bitmap مجمّداً. نفس
          // آلية settle/إعادة المحاولة تضمن إعادة الخبز فور انتهاء الالتقاط.
          scheduleSettleRef.current?.();
          return;
        }
      }
      const stageScaleX = stage && typeof stage.scaleX === 'function' ? stage.scaleX() : 0;
      const stageW = stage && typeof stage.width === 'function' ? stage.width() : 0;
      // 🛡️ في مسرح Konva بملء الحاوية (Option B)، يمثّل stage.scaleX() مقياس الورقة الفعلي
      // (displayW / canvasWidth) شاملاً التكبير. نعتمد عليه مباشرة، ونحتفظ بالمعادلة
      // الاحتياطية فقط للبيئات الوهمية (Mock Stages في الاختبارات).
      const cssZoom = useEditorStore.getState().canvasZoom;
      const zoom = cssZoom > 0 ? cssZoom : 1;
      const displayScale =
        stageScaleX > 0 ? stageScaleX : stageW > 0 ? (stageW * zoom) / Math.max(1, canvasWidth) : 1;
      const deviceRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

      const rawRatio = isDraggingFilter
        ? Math.max(0.25, Math.min(0.5, displayScale * deviceRatio * 0.3))
        : Math.max(0.75, Math.min(2.5, displayScale * deviceRatio * 1.2));

      const nodeW = typeof node.width === 'function' ? node.width() : 0;
      const nodeH = typeof node.height === 'function' ? node.height() : 0;

      // 🧮 H2b — سقف واعٍ بالأسطح: كاش Konva يحتفظ بثلاثة كانفسات دائمة لكل
      // عقدة (فحص node_modules/konva/lib/Node.js → cache() و
      // _getCachedSceneCanvas): مشهد عند pixelRatio r (W·H·r² بكسل)، وكانفس
      // فلتر بنفس نسبة r (W·H·r²)، وكانفس إصابة hit عند نسبة 1 (W·H بكسل).
      // الكلفة التقريبية = 4·W·H·(2r²+1) بايت (4 بايت/بكسل)، والميزانية
      // MAX_CACHE_PIXELS بكسل أي 4·MAX بايت — لذا نحل 4·W·H·(2r²+1) ≤ 4·MAX:
      //   r_max = sqrt((MAX/(W·H) − 1) / 2)
      // (الصيغة القديمة sqrt(MAX/(W·H)) كانت تحسب مسح المشهد وحده فتترك
      // كانفسي الفلتر والإصابة خارج الميزانية — لعقدة 2480×3508 كانت تسمح
      // بنسبة 1.66 بينما الميزانية الإجمالية تشترط ≤ 0.94).
      // العقد الأضخم من الميزانية نفسها تهبط إلى الأرضية MIN_CACHE_RATIO.
      let pixelCapRatio = rawRatio;
      if (nodeW > 0 && nodeH > 0) {
        const surfaceCap = Math.max(0, (MAX_CACHE_PIXELS / (nodeW * nodeH) - 1) / 2);
        pixelCapRatio = Math.max(MIN_CACHE_RATIO, Math.sqrt(surfaceCap));
      }
      const ratio = Math.max(MIN_CACHE_RATIO, Math.min(rawRatio, pixelCapRatio));

      // تجنّب إعادة الخبز عند تكبير طفيف: النسخة الحالية كافية بصرياً.
      // تغيّر أبعاد العقدة (تحجيم) يستوجب إعادة خبز مهما كانت النسبة.
      const previous = lastRatioRef.current;
      const dimsChanged = nodeW !== lastDimsRef.current.w || nodeH !== lastDimsRef.current.h;
      const needsUpgrade = ratio > previous * ZOOM_UPGRADE_MARGIN;
      if (!force && previous > 0 && !needsUpgrade && !dimsChanged && node.isCached?.()) {
        return;
      }

      try {
        // 🔬 H2a — استنتاج مُحقَّق من المصدر (node_modules/konva/lib/Node.js):
        // `cache()` يعيد تخصيص الأسطح الثلاث داخلياً في كل استدعاء بلا شرط
        // (`new SceneCanvas` للمشهد + `new SceneCanvas` 0×0 بـ
        // willReadFrequently للفلتر + `new HitCanvas` للإصابة) ولا يعيد استخدام
        // الأسطح القديمة، بل يحذف مدخل CANVAS منها **دون استدعاء
        // Util.releaseCanvas**. لذلك حذف clearCache() قبل cache() في مسار
        // إعادة الخبز بسبب قيم الفلاتر فقط لا يقلّص التخصيص المزدوج —
        // التخصيص الجديد يحدث في cache() أصلاً — بل يؤجل تحرير الأسطح القديمة
        // إلى جامع القمامة فيرفع ذروة VRAM. الإبقاء على clearCache() أولاً هو
        // الصحيح: يفرغ الأسطح القديمة فوراً قبل تخصيص الجديدة (الذروة =
        // الأكبر لا مجموعهما).
        node.clearCache?.();
        if (nodeW > 0 && nodeH > 0) {
          node.cache?.({ x: 0, y: 0, width: nodeW, height: nodeH, pixelRatio: ratio });
        } else {
          node.cache?.({ pixelRatio: ratio });
        }
        lastRatioRef.current = ratio;
        lastDimsRef.current = { w: nodeW, h: nodeH };
        node.getLayer?.()?.batchDraw();
      } catch (err) {
        logger.warn('Failed to cache Konva image', err);
      }
    },
    [nodeRef, canvasWidth, isDraggingFilter, hasFilters, observeCropChanges],
  );

  // أحداث Konva تلتقط القص البرمجي والتراجع أيضاً؛ لا نخبز الكاش أثناء الإيماءة.
  useEffect(() => {
    const node = nodeRef.current;
    if (!observeCropChanges || !hasFilters || !node?.on) return;

    const settle = () => {
      cropTimerRef.current = null;
      if (!cropPendingRef.current) return;
      const interaction = useCanvasInteraction.getState();
      if (
        node.isDragging?.() ||
        interaction.isDragging ||
        interaction.isTransforming ||
        isStageCaptureActive(node.getStage?.())
      ) {
        cropTimerRef.current = setTimeout(settle, CROP_DEBOUNCE_MS);
        return;
      }
      cropPendingRef.current = false;
      recache(true);
    };
    const schedule = () => {
      if (cropTimerRef.current) clearTimeout(cropTimerRef.current);
      cropTimerRef.current = setTimeout(settle, CROP_DEBOUNCE_MS);
    };
    // #16 — إتاحة نفس آلية التسوية لمسار الرفض المبكر في recache
    scheduleSettleRef.current = schedule;
    const invalidate = () => {
      // التصدير يدير ترقية القص والكاش بنفسه ويستعيدهما في finally.
      if (isStageCaptureActive(node.getStage?.())) return;
      cropPendingRef.current = true;
      if (node.isCached?.()) node.clearCache?.();
      node.getLayer?.()?.batchDraw();
      schedule();
    };

    node.on(CROP_EVENTS, invalidate);
    node.on('dragstart.filterCache dragend.filterCache', invalidate);
    const unsubscribe = useCanvasInteraction.subscribe((state, previous) => {
      if (
        cropPendingRef.current &&
        (state.isDragging !== previous.isDragging ||
          state.isTransforming !== previous.isTransforming)
      ) {
        schedule();
      }
    });
    if (cropPendingRef.current) schedule();

    return () => {
      node.off?.('.filterCache');
      unsubscribe();
      if (cropTimerRef.current) clearTimeout(cropTimerRef.current);
      cropTimerRef.current = null;
      cropPendingRef.current = false;
      scheduleSettleRef.current = null;
    };
  }, [observeCropChanges, hasFilters, image, nodeRef, recache]);

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
          node.getLayer?.()?.batchDraw();
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
