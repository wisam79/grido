import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export interface StableViewportSize {
  w: number;
  h: number;
}

export const PANEL_TRANSITION_EVENT = 'grido:panel-transition';

export function notifyPanelTransition() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PANEL_TRANSITION_EVENT));
  }
}

export function readLocalViewportSize(node: HTMLElement): StableViewportSize {
  // clientWidth/Height are unzoomed CSS pixels. A bounding rect includes CSS
  // zoom (and transforms), which would multiply the camera scale a second time.
  return { w: node.clientWidth, h: node.clientHeight };
}

const DEFAULT_VIEWPORT_SIZE: StableViewportSize = { w: 800, h: 600 };
const PANEL_TRANSITION_SETTLE_MS = 220;

/**
 * يحافظ على مقاس حاوية العرض ثابتاً أثناء حركة وانزلاق الألواح الجانبية.
 * القياس الأولي يُطبَّق فوراً، وتُؤجَّل إعادة التخصيص حتى هدوء الحركة واستقرار
 * الأبعاد (عبر transitionend أو مهلة أمان 220ms)، بدلاً من حلقة إطارات مستمرة
 * تعيد تخصيص مخازن الـ GPU Textures للكانفاس مع كل بكسل وتسبب ثقلاً كبيراً.
 */
export function useStableViewportSize(
  containerRef: RefObject<HTMLElement | null>,
  _settleMs = 0,
): StableViewportSize {
  const [size, setSize] = useState<StableViewportSize>(DEFAULT_VIEWPORT_SIZE);
  const committedRef = useRef<StableViewportSize>(DEFAULT_VIEWPORT_SIZE);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let isTransitioning = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeRafId: number | null = null;

    const commit = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;

      const next = { w: Math.round(w), h: Math.round(h) };
      const prev = committedRef.current;
      if (Math.abs(prev.w - next.w) < 0.5 && Math.abs(prev.h - next.h) < 0.5) return;

      committedRef.current = next;
      setSize(next);
    };

    const commitCurrentSize = () => {
      const { w, h } = readLocalViewportSize(node);
      commit(w, h);
    };

    const cancelResizeFrame = () => {
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      resizeRafId = null;
    };

    const clearFallbackTimer = () => {
      if (fallbackTimer !== null) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
    };

    const settleTransition = () => {
      isTransitioning = false;
      clearFallbackTimer();
      cancelResizeFrame();
      commitCurrentSize();
    };

    const startTransition = () => {
      isTransitioning = true;
      cancelResizeFrame();
      clearFallbackTimer();
      fallbackTimer = setTimeout(settleTransition, PANEL_TRANSITION_SETTLE_MS);
    };

    const handleTransitionEvent = (e: Event) => {
      const target = (e as TransitionEvent).target as HTMLElement | null;
      if (
        e.type === PANEL_TRANSITION_EVENT ||
        target?.classList?.contains('fluent-panel-motion') ||
        target?.closest?.('.fluent-panel-motion')
      ) {
        startTransition();
      }
    };

    const handleTransitionEnd = (e: TransitionEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.classList?.contains('fluent-panel-motion') ||
        target?.closest?.('.fluent-panel-motion')
      ) {
        settleTransition();
      }
    };

    const ro = new ResizeObserver((entries) => {
      if (isTransitioning) return;
      const entry = entries.find((item) => item.target === node);
      // RO content boxes are also local CSS pixels, including fractional layout.
      const next = entry
        ? { w: entry.contentRect.width, h: entry.contentRect.height }
        : readLocalViewportSize(node);
      cancelResizeFrame();
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = null;
        if (!isTransitioning) commit(next.w, next.h);
      });
    });

    ro.observe(node);
    commitCurrentSize();

    window.addEventListener(PANEL_TRANSITION_EVENT, handleTransitionEvent);
    window.addEventListener('transitionrun', handleTransitionEvent);
    window.addEventListener('transitionstart', handleTransitionEvent);
    window.addEventListener('transitionend', handleTransitionEnd);
    window.addEventListener('transitioncancel', handleTransitionEnd);

    return () => {
      ro.disconnect();
      clearFallbackTimer();
      if (resizeRafId !== null) cancelAnimationFrame(resizeRafId);
      window.removeEventListener(PANEL_TRANSITION_EVENT, handleTransitionEvent);
      window.removeEventListener('transitionrun', handleTransitionEvent);
      window.removeEventListener('transitionstart', handleTransitionEvent);
      window.removeEventListener('transitionend', handleTransitionEnd);
      window.removeEventListener('transitioncancel', handleTransitionEnd);
    };
  }, [containerRef]);

  return size;
}
