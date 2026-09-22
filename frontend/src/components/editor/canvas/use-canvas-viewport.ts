import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { clampZoomRaw } from "@/lib/canvas/zoom";

/**
 * 🧭 منطق إطار عرض المحرر: زوم العجلة المحوري (Ctrl+Wheel) بمحور مؤشر ثابت،
 * والتحريك بزر السحب الأوسط أو مفتاح المسافة (Space-Pan).
 * 🛡️ معدل بالراف: عجلات متتالية تُدمج في إطار رسم واحد — كانت هذه الكتلة
 * مضمّنة في EditorCanvas.
 */
export function useCanvasViewport(
  containerRef: RefObject<HTMLDivElement | null>,
  innerRef: RefObject<HTMLDivElement | null>
) {
  const prevZoomRef = useRef(useEditorStore.getState().canvasZoom);
  const prevCanvasRectRef = useRef<DOMRect | null>(null);
  const zoomPivotRef = useRef<{ pctX: number; pctY: number; screenX: number; screenY: number } | null>(null);

  const canvasZoom = useEditorStore((s) => s.canvasZoom);
  const setCanvasZoom = useEditorStore((s) => s.setCanvasZoom);

  useEffect(() => {
    const spacePressedRef = { current: false };
    const isPanningRef = { current: false };
    const node = containerRef.current;
    if (!node) return;

    let pendingZoom: number | null = null;
    let rafId: number | null = null;

    const applyZoom = () => {
      rafId = null;
      if (pendingZoom === null) return;

      const newZoom = pendingZoom;
      pendingZoom = null;

      if (newZoom !== useEditorStore.getState().canvasZoom) {
        if (innerRef.current) {
          const canvasRect = innerRef.current.getBoundingClientRect();
          prevCanvasRectRef.current = canvasRect;
          zoomPivotRef.current = {
            pctX: (lastWheelClientX - canvasRect.left) / canvasRect.width,
            pctY: (lastWheelClientY - canvasRect.top) / canvasRect.height,
            screenX: lastWheelClientX,
            screenY: lastWheelClientY
          };
        }
        setCanvasZoom(newZoom);
      }
    };

    let lastWheelClientX = 0;
    let lastWheelClientY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        lastWheelClientX = e.clientX;
        lastWheelClientY = e.clientY;

        const baseZoom = pendingZoom !== null ? pendingZoom : useEditorStore.getState().canvasZoom;
        const factor = Math.exp(-e.deltaY * 0.003);
        const newZoom = clampZoomRaw(baseZoom * factor);

        pendingZoom = newZoom;
        if (rafId === null) {
          rafId = requestAnimationFrame(applyZoom);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName;
      if (e.code === "Space" && activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
        if (!spacePressedRef.current) {
          spacePressedRef.current = true;
          node.style.cursor = "grab";
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        node.style.cursor = "";
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && spacePressedRef.current)) {
        e.preventDefault();
        isPanningRef.current = true;
        node.style.cursor = "grabbing";
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp, { once: true });
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPanningRef.current) {
        e.preventDefault();
        node.scrollLeft -= e.movementX;
        node.scrollTop -= e.movementY;
      }
    };

    const handlePointerUp = () => {
      isPanningRef.current = false;
      node.style.cursor = spacePressedRef.current ? "grab" : "";
      window.removeEventListener("pointermove", handlePointerMove);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    node.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // R6: ملاءمة الورقة للشاشة (Fit) — حدث منفصل عن 100% الحقيقي.
    const handleFit = () => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;
      const currentZoom = useEditorStore.getState().canvasZoom;
      const baseW = inner.scrollWidth / Math.max(currentZoom, 0.01);
      const baseH = inner.scrollHeight / Math.max(currentZoom, 0.01);
      if (!baseW || !baseH) return;
      const fit = Math.min(
        (container.clientWidth - 48) / baseW,
        (container.clientHeight - 48) / baseH
      );
      setCanvasZoom(clampZoomRaw(fit));
    };
    window.addEventListener("grido:fit-canvas-to-screen", handleFit);

    return () => {
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("grido:fit-canvas-to-screen", handleFit);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [setCanvasZoom, containerRef, innerRef]);

  // محافظة محور الزوم: تعيد المحور (pivot) لموضعه الشاشي بعد تغيّر الزوم
  useLayoutEffect(() => {
    if (canvasZoom !== prevZoomRef.current) {
      if (containerRef.current && innerRef.current) {
        const container = containerRef.current;
        const canvas = innerRef.current;

        if (zoomPivotRef.current) {
          const { pctX, pctY, screenX, screenY } = zoomPivotRef.current;
          const newCanvasRect = canvas.getBoundingClientRect();

          const currentScreenX = newCanvasRect.left + pctX * newCanvasRect.width;
          const currentScreenY = newCanvasRect.top + pctY * newCanvasRect.height;

          container.scrollLeft += (currentScreenX - screenX);
          container.scrollTop += (currentScreenY - screenY);

          zoomPivotRef.current = null;
        } else {
          const canvasRect = canvas.getBoundingClientRect();
          const newCenterX = canvasRect.left + canvasRect.width / 2;
          const newCenterY = canvasRect.top + canvasRect.height / 2;
          const containerRect = container.getBoundingClientRect();
          const viewportCenterX = containerRect.left + containerRect.width / 2;
          const viewportCenterY = containerRect.top + containerRect.height / 2;
          container.scrollLeft += (newCenterX - viewportCenterX);
          container.scrollTop += (newCenterY - viewportCenterY);
        }
      }
      prevZoomRef.current = canvasZoom;
    }
  }, [canvasZoom, containerRef, innerRef]);
}
