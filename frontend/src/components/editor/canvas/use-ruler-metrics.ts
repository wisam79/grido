import { useState, useRef, useEffect, useCallback } from "react";

/**
 * useRulerMetrics — قياسات المساطر الثابتة وحركة مؤشر الفأرة عليها
 * 🧭 كان هذا المنطق مضمّناً في editor-canvas (كان الملف 726 سطراً):
 * يقيس موضع الورقة داخل مساحة العمل (origin/viewport) عبر ResizeObserver
 * و scroll listener مع rAF batching، ويحرّك مؤشرات المسطرة الأفقية/الرأسية.
 */
export function useRulerMetricsPreview(
  containerRef: React.RefObject<HTMLDivElement | null>,
  innerRef: React.RefObject<HTMLDivElement | null>,
  opts: { showRuler: boolean; printMode: boolean },
  deps: { canvasZoom: number; mode: string; aspect: number }
) {
  const { showRuler, printMode } = opts;
  const { canvasZoom, mode } = deps;

  const [rulerMetrics, setRulerMetrics] = useState({
    originX: 0,
    originY: 0,
    viewportWidth: 0,
    viewportHeight: 0,
  });
  const [containerSize, setContainerSize] = useState({ w: 600, h: 800 });
  const mouseMoveRafId = useRef<number | null>(null);

  const updateRulerPositions = useCallback(() => {
    if (!showRuler || printMode) return;
    if (!containerRef.current || !innerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const canvasRect = innerRef.current.getBoundingClientRect();

    const originX = canvasRect.left - containerRect.left;
    const originY = canvasRect.top - containerRect.top;
    const viewportWidth = containerRect.width;
    const viewportHeight = containerRect.height;

    setRulerMetrics((prev) => {
      if (
        Math.abs(prev.originX - originX) < 0.5 &&
        Math.abs(prev.originY - originY) < 0.5 &&
        Math.abs(prev.viewportWidth - viewportWidth) < 0.5 &&
        Math.abs(prev.viewportHeight - viewportHeight) < 0.5
      ) {
        return prev;
      }
      return { originX, originY, viewportWidth, viewportHeight };
    });
  }, [showRuler, printMode, containerRef, innerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number | null = null;
    const handleLayout = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width, h: rect.height });
        updateRulerPositions();
      });
    };

    const ro = new ResizeObserver(handleLayout);
    ro.observe(container);
    if (innerRef.current) {
      ro.observe(innerRef.current);
    }

    window.addEventListener("resize", handleLayout);
    container.addEventListener("scroll", handleLayout, { passive: true });

    handleLayout();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", handleLayout);
      container.removeEventListener("scroll", handleLayout);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [updateRulerPositions, containerRef, innerRef]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const id1 = requestAnimationFrame(() => {
      updateRulerPositions();
      const id2 = requestAnimationFrame(() => {
        updateRulerPositions();
      });
      timerId = setTimeout(updateRulerPositions, 40);
      return () => cancelAnimationFrame(id2);
    });
    return () => {
      cancelAnimationFrame(id1);
      if (timerId) clearTimeout(timerId);
    };
  }, [updateRulerPositions, canvasZoom, mode, containerSize]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      updateRulerPositions();
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [updateRulerPositions, containerRef]);

  const handleWorkspaceMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!showRuler || printMode) return;
    if (mouseMoveRafId.current !== null) return;
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    mouseMoveRafId.current = requestAnimationFrame(() => {
      mouseMoveRafId.current = null;

      const hCursor = document.getElementById("h-ruler-cursor") as SVGLineElement | null;
      const vCursor = document.getElementById("v-ruler-cursor") as SVGLineElement | null;

      if (hCursor) {
        hCursor.setAttribute("x1", x.toString());
        hCursor.setAttribute("x2", x.toString());
        hCursor.style.display = "block";
      }
      if (vCursor) {
        vCursor.setAttribute("y1", y.toString());
        vCursor.setAttribute("y2", y.toString());
        vCursor.style.display = "block";
      }
    });
  }, [showRuler, printMode, containerRef]);

  const handleWorkspaceMouseLeave = useCallback(() => {
    if (mouseMoveRafId.current !== null) {
      cancelAnimationFrame(mouseMoveRafId.current);
      mouseMoveRafId.current = null;
    }
    const hCursor = document.getElementById("h-ruler-cursor");
    const vCursor = document.getElementById("v-ruler-cursor");
    if (hCursor) hCursor.style.display = "none";
    if (vCursor) vCursor.style.display = "none";
  }, []);

  return {
    rulerMetrics,
    containerSize,
    handleWorkspaceMouseMove,
    handleWorkspaceMouseLeave,
  };
}
