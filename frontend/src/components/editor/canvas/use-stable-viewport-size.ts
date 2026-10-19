import { useEffect, useRef, useState, type RefObject } from 'react';

export interface StableViewportSize {
  w: number;
  h: number;
}

const DEFAULT_VIEWPORT_SIZE: StableViewportSize = { w: 800, h: 600 };

/**
 * يحافظ على مقاس حاوية العرض مستقراً أثناء أنيميشن الألواح الجانبية.
 * القياس الأولي يُطبَّق فوراً، ثم تُجمَّع تغييرات ResizeObserver وتُلتزم
 * مرة واحدة بعد هدوء التخطيط (settleMs) بدل إعادة تخصيص Stage كل إطار.
 */
export function useStableViewportSize(
  containerRef: RefObject<HTMLElement | null>,
  settleMs = 140,
): StableViewportSize {
  const [size, setSize] = useState<StableViewportSize>(DEFAULT_VIEWPORT_SIZE);
  const committedRef = useRef<StableViewportSize>(DEFAULT_VIEWPORT_SIZE);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let settleTimer: ReturnType<typeof setTimeout> | null = null;

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

    const ro = new ResizeObserver(() => {
      if (settleTimer !== null) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        settleTimer = null;
        commitCurrentRect();
      }, settleMs);
    });

    ro.observe(node);
    commitCurrentRect();

    return () => {
      ro.disconnect();
      if (settleTimer !== null) clearTimeout(settleTimer);
    };
  }, [containerRef, settleMs]);

  return size;
}
