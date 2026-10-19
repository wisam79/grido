import { useCallback, useRef, type RefObject } from 'react';

interface RulerPreviewOptions {
  showRuler: boolean;
  printMode: boolean;
}

export function useRulerMetricsPreview(
  containerRef: RefObject<HTMLDivElement | null>,
  { showRuler, printMode }: RulerPreviewOptions,
) {
  const mouseMoveRafId = useRef<number | null>(null);
  const pendingEventRef = useRef<{
    clientX: number;
    clientY: number;
    target: EventTarget | null;
  } | null>(null);

  const handleWorkspaceMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!showRuler || printMode) return;
      pendingEventRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        target: e.target,
      };

      if (mouseMoveRafId.current !== null) return;

      mouseMoveRafId.current = requestAnimationFrame(() => {
        mouseMoveRafId.current = null;
        const pending = pendingEventRef.current;
        if (!pending || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        // تثبيت الإحداثي على حافة بكسل مادية (device pixel) — بدون التثبيت تقع
        // خطوط المؤشر على كسور بكسل فتُوزَّع على بكسلين وتظهر ضبابية بسمك متغير.
        const dpr = window.devicePixelRatio || 1;
        const snapToPixelEdge = (v: number) => Math.round(v * dpr) / dpr;
        const x = snapToPixelEdge(pending.clientX - containerRect.left);
        const y = snapToPixelEdge(pending.clientY - containerRect.top);

        const scope =
          (pending.target as HTMLElement | null)?.closest?.(
            '[data-testid="workspace-canvas-shell"]',
          ) ?? document;

        const hCursor = scope.querySelector('#h-ruler-cursor') as SVGLineElement | null;
        const vCursor = scope.querySelector('#v-ruler-cursor') as SVGLineElement | null;

        if (hCursor) {
          hCursor.setAttribute('x1', x.toString());
          hCursor.setAttribute('x2', x.toString());
          hCursor.style.display = 'block';
        }
        if (vCursor) {
          vCursor.setAttribute('y1', y.toString());
          vCursor.setAttribute('y2', y.toString());
          vCursor.style.display = 'block';
        }
      });
    },
    [showRuler, printMode, containerRef],
  );

  const handleWorkspaceMouseLeave = useCallback((e?: React.MouseEvent<HTMLDivElement>) => {
    if (mouseMoveRafId.current !== null) {
      cancelAnimationFrame(mouseMoveRafId.current);
      mouseMoveRafId.current = null;
    }
    const scope =
      (e?.currentTarget as HTMLElement | null)?.closest?.(
        '[data-testid="workspace-canvas-shell"]',
      ) ?? document;
    const hCursor = scope.querySelector('#h-ruler-cursor');
    const vCursor = scope.querySelector('#v-ruler-cursor');
    if (hCursor) (hCursor as SVGLineElement).style.display = 'none';
    if (vCursor) (vCursor as SVGLineElement).style.display = 'none';
  }, []);

  return {
    handleWorkspaceMouseMove,
    handleWorkspaceMouseLeave,
  };
}
