import { useEffect, useRef, useState, type RefObject } from 'react';

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

const DEFAULT_VIEWPORT_SIZE: StableViewportSize = { w: 800, h: 600 };

/**
 * يحافظ على مقاس حاوية العرض متزامناً وسلساً أثناء انزلاق الألواح الجانبية.
 * القياس الأولي يُطبَّق فوراً، وتُشغَّل حلقة requestAnimationFrame نشطة بـ 60fps
 * أثناء حركة الألواح (عبر أحداث transitionrun/start و grido:panel-transition)
 * لتحديث موضع المسرح والمساطر بسلاسة فائقة دون ارتعاش أو تأخير زمني ميت.
 */
export function useStableViewportSize(
  containerRef: RefObject<HTMLElement | null>,
  _settleMs = 0,
): StableViewportSize {
  const [size, setSize] = useState<StableViewportSize>(DEFAULT_VIEWPORT_SIZE);
  const committedRef = useRef<StableViewportSize>(DEFAULT_VIEWPORT_SIZE);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let isTransitioning = false;
    let transitionRafId: number | null = null;
    let transitionStartTime = 0;

    const commit = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;

      const next = { w: Math.round(w), h: Math.round(h) };
      const prev = committedRef.current;
      if (Math.abs(prev.w - next.w) < 0.5 && Math.abs(prev.h - next.h) < 0.5) return;

      committedRef.current = next;
      setSize(next);
    };

    const commitCurrentRect = () => {
      const rect = node.getBoundingClientRect();
      commit(rect.width, rect.height);
    };

    const tickTransition = (now: number) => {
      commitCurrentRect();
      // سقف أمان 320ms لحركة ألواح الـ 200ms
      if (isTransitioning && now - transitionStartTime < 320) {
        transitionRafId = requestAnimationFrame(tickTransition);
      } else {
        isTransitioning = false;
        transitionRafId = null;
        commitCurrentRect();
      }
    };

    const startTransitionLoop = () => {
      isTransitioning = true;
      transitionStartTime = performance.now();
      if (transitionRafId !== null) {
        cancelAnimationFrame(transitionRafId);
      }
      transitionRafId = requestAnimationFrame(tickTransition);
    };

    const handleTransitionEvent = (e: Event) => {
      const target = (e as TransitionEvent).target as HTMLElement | null;
      if (
        e.type === PANEL_TRANSITION_EVENT ||
        target?.classList?.contains('fluent-panel-motion') ||
        target?.closest?.('.fluent-panel-motion')
      ) {
        startTransitionLoop();
      }
    };

    const handleTransitionEnd = (e: TransitionEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.classList?.contains('fluent-panel-motion') ||
        target?.closest?.('.fluent-panel-motion')
      ) {
        isTransitioning = false;
        if (transitionRafId !== null) {
          cancelAnimationFrame(transitionRafId);
          transitionRafId = null;
        }
        commitCurrentRect();
      }
    };

    const ro = new ResizeObserver(() => {
      if (!isTransitioning) {
        startTransitionLoop();
      }
    });

    ro.observe(node);
    commitCurrentRect();

    window.addEventListener(PANEL_TRANSITION_EVENT, handleTransitionEvent);
    window.addEventListener('transitionrun', handleTransitionEvent);
    window.addEventListener('transitionstart', handleTransitionEvent);
    window.addEventListener('transitionend', handleTransitionEnd);
    window.addEventListener('transitioncancel', handleTransitionEnd);

    return () => {
      ro.disconnect();
      window.removeEventListener(PANEL_TRANSITION_EVENT, handleTransitionEvent);
      window.removeEventListener('transitionrun', handleTransitionEvent);
      window.removeEventListener('transitionstart', handleTransitionEvent);
      window.removeEventListener('transitionend', handleTransitionEnd);
      window.removeEventListener('transitioncancel', handleTransitionEnd);
      if (transitionRafId !== null) cancelAnimationFrame(transitionRafId);
    };
  }, [containerRef]);

  return size;
}
