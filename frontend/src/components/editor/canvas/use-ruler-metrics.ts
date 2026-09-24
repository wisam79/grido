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
  const { mode } = deps;

  const [rulerMetrics, setRulerMetrics] = useState({
    originX: 0,
    originY: 0,
    viewportWidth: 0,
    viewportHeight: 0,
  });
  const [containerSize, setContainerSize] = useState({ w: 600, h: 800 });
  const mouseMoveRafId = useRef<number | null>(null);
  // تثبيت مقاس الحاوية: طي اللوحة يحرك العرض تدريجياً 200ms فيطلق
  // ResizeObserver عشرات المرات — وكل التزام يعيد تخصيص Stage كاملاً.
  // نلتزم فوراً عند الاستقرار، ونؤجل الالتزام أثناء الحركة المستمرة.
  const committedSizeRef = useRef({ w: 600, h: 800 });
  const lastCommitAtRef = useRef(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const commitSize = (w: number, h: number) => {
      const prev = committedSizeRef.current;
      if (Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5) return;
      committedSizeRef.current = { w, h };
      lastCommitAtRef.current = Date.now();
      setContainerSize({ w, h });
    };
    const handleLayout = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const prev = committedSizeRef.current;
        // التمرير لا يغيّر المقاس — لا التزام جديد ولا إعادة تصيير لسلسلة الكانفس
        if (Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5) {
          updateRulerPositions();
          return;
        }
        // حركة مستمرة (أنيميشن طي اللوحة 200ms): أجل الالتزام حتى الاستقرار
        // فيلتزم الكانفس مرة واحدة بدل إعادة تخصيص Stage مع كل إطار وسيط
        if (Date.now() - lastCommitAtRef.current < 150) {
          if (settleTimerRef.current !== null) clearTimeout(settleTimerRef.current);
          settleTimerRef.current = setTimeout(() => {
            settleTimerRef.current = null;
            if (!containerRef.current) return;
            const settled = containerRef.current.getBoundingClientRect();
            commitSize(settled.width, settled.height);
            updateRulerPositions();
          }, 120);
          updateRulerPositions();
          return;
        }
        commitSize(rect.width, rect.height);
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
      if (settleTimerRef.current !== null) clearTimeout(settleTimerRef.current);
    };
  }, [updateRulerPositions, containerRef, innerRef]);

  // قياس واحد بعد استقرار التخطيط — كان rAF→rAF→setTimeout(40) زائداً عن الحاجة
  // 🛡️ الأداء: تجنّب الاعتماد على canvasZoom هنا. القياسات تعتمد على
  // تخطيط DOM (origin/viewport)، والزوم لا يغيّر تخطيط الـ inner element
  // (يُطبَّق عبر CSS scale من Konva) — كل getBoundingClientRect هنا كان
  // يتسبب بـ layout-thrashing قسري عند كل ضغطة زوم (270ms hitch).
  // ResizeObserver في الـ effect السابق يلتقط أي تخطيط فعلي.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      updateRulerPositions();
    });
    return () => cancelAnimationFrame(id);
  }, [updateRulerPositions, mode, containerSize]);

  // ملاحظة: مستمع scroll مسجل مرة واحدة مع rAF throttle في الأثر أعلاه (handleLayout)،
  // فلا نسجل مستمعاً ثانياً هنا لتفادي getBoundingClientRect مكرراً لكل scroll.

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
