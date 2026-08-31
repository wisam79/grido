import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { Spinner } from "@/components/ui/huge-icon";
import { ArrowRotateClockwise20Regular, Dismiss20Regular } from "@fluentui/react-icons";
import { OpenFile, SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { wailsIsDesktop } from "@/lib/wails-env";
import { SnapGuide } from "@/lib/canvas/snap-utils";
import { KonvaCanvas } from "../konva/konva-canvas";
import { useShallow } from "zustand/react/shallow";
import { ContextMenuPosition, ContextMenuTarget } from "./context-menu";
import { ViewportFixedRulersHeader, ViewportFixedRulersSidebar } from "./canvas-rulers";
import { RulerUnit } from "./ruler";
import { TextEditingOverlay } from "./text-editing-overlay";
import { CanvasContextMenu } from "./canvas-context-menu";
import { checkerColor, guideCenter, guideEdge } from "@/lib/canvas/canvas-colors";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";

/**
 * شريط الأدوات السريع للخانة المحددة (إزالة/استبدال الصورة).
 * 🛡️ فصل الأداء: كان هذا الكتلة مضمّنة في EditorCanvas تسببت بتحميل مصفوفة
 * slots كاملة على قشرة الكانفس — أي تعديل طفيف على خانة (مثل زوم العجلة)
 * كان يعيد رسم المحرر بأكمله. الآن يُشترك بنفسه بمفاتيحه فقط.
 */
const SelectedSlotQuickBar = React.memo(function SelectedSlotQuickBar({
  displayW,
  displayH,
  printMode,
  isLoading,
  setIsLoading,
}: {
  displayW: number;
  displayH: number;
  printMode: boolean;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}) {
  const slots = useEditorStore((s) => s.slots);
  const selectedId = useEditorStore((s) => s.selectedId);
  const updateSlot = useEditorStore((s) => s.updateSlot);
  const setSlotImage = useEditorStore((s) => s.setSlotImage);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const mode = useEditorStore((s) => s.mode);
  const collageGap = useEditorStore((s) => s.collageGap);
  const collageMargin = useEditorStore((s) => s.collageMargin);
  const collageTemplate = useEditorStore((s) => s.collageTemplate);

  if (mode !== "collage" || printMode) return null;

  const selectedSlot = slots.find((s) => s.id === selectedId);
  if (!selectedSlot || !selectedSlot.imageSrc) return null;

  const scale = displayW / canvasWidth;
  const hasPhysical = collageTemplate?.physicalLayout;
  const margin = hasPhysical ? 0 : collageMargin * scale;
  const gap = hasPhysical ? 0 : collageGap * scale;

  const availW = displayW - 2 * margin;
  const availH = displayH - 2 * margin;

  const left = margin + selectedSlot.x * availW + gap / 2;
  const top = margin + selectedSlot.y * availH + gap / 2;
  const width = selectedSlot.w * availW - gap;
  const height = selectedSlot.h * availH - gap;

  return (
    <div
      className="absolute pointer-events-none z-30"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* شريط الإجراءات السريعة العائم فوق الخلية المحددة */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-card/90 dark:bg-sidebar/90 backdrop-blur-md p-0.5 rounded-lg border border-border/80 shadow-md pointer-events-auto transition-all select-none fluent-specular">
        <button
          className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
          onClick={async (e) => {
            e.stopPropagation();
            if (isLoading) return;
            try {
              setIsLoading(true);
              const b64 = await OpenFile();
              if (b64) {
                const isWailsDesktop = wailsIsDesktop();
                let srcToUse = b64;
                if (isWailsDesktop && b64.startsWith("data:image/")) {
                  try {
                    const localPath = await SaveImageFromBase64(b64);
                    if (localPath) srcToUse = localPath;
                  } catch (e) {
                    console.error("Failed to save image locally:", e);
                  }
                }
                setSlotImage(selectedSlot.id, srcToUse);
              }
            } catch (err) {
              console.error("Replace image error:", err);
            } finally {
              setIsLoading(false);
            }
          }}
          title="استبدال الصورة"
        >
          {isLoading ? <Spinner className="w-3.5 h-3.5" size={14} /> : <ArrowRotateClockwise20Regular className="w-3.5 h-3.5 text-primary" />}
        </button>

        <div className="w-px h-3 bg-border/60 mx-0.5" />

        <button
          className="w-6 h-6 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            updateSlot(selectedSlot.id, { imageSrc: undefined });
            useEditorStore.getState().pushHistory();
          }}
          title="إزالة الصورة"
        >
          <Dismiss20Regular className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});

function formatGuideMeasurement(
  relPos: number,
  isH: boolean,
  unit: RulerUnit,
  widthMM: number,
  heightMM: number,
  canvasWidth: number,
  canvasHeight: number
): string {
  const clamped = Math.min(1, Math.max(0, relPos));
  if (unit === "px") {
    const px = Math.round(clamped * (isH ? canvasHeight : canvasWidth));
    return `${px} px`;
  }
  if (unit === "cm") {
    const cm = ((clamped * (isH ? heightMM : widthMM)) / 10).toFixed(2);
    return `${cm} cm`;
  }
  if (unit === "in") {
    const inch = ((clamped * (isH ? heightMM : widthMM)) / 25.4).toFixed(2);
    return `${inch} in`;
  }
  // mm
  const mm = (clamped * (isH ? heightMM : widthMM)).toFixed(1);
  return `${mm} mm`;
}

export const EditorCanvas = React.memo(React.forwardRef<
  HTMLDivElement,
  { printMode?: boolean }
>(function EditorCanvas({ printMode = false }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const [rulerMetrics, setRulerMetrics] = useState({
    viewportWidth: 800,
    viewportHeight: 600,
    originX: 0,
    originY: 0,
  });

  const hRulerCursorRef = useRef<SVGLineElement | null>(null);
  const vRulerCursorRef = useRef<SVGLineElement | null>(null);
  const lastDblClickRef = useRef<number>(0);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 800 });
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const mouseMoveRafId = useRef<number | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    position: ContextMenuPosition;
    target: ContextMenuTarget;
  } | null>(null);

  // وحدة المساطر والخطوط الإرشادية من الـ Store
  const {
    rulerUnit,
    setRulerUnit,
    userGuides,
    showUserGuides,
    lockUserGuides,
    addUserGuide,
    updateUserGuide,
    removeUserGuide,
    clearUserGuides,
    setShowUserGuides,
    setLockUserGuides,
    selectedId,
    slots,
  } = useEditorStore(
    useShallow((state) => ({
      rulerUnit: state.rulerUnit,
      setRulerUnit: state.setRulerUnit,
      userGuides: state.userGuides,
      showUserGuides: state.showUserGuides,
      lockUserGuides: state.lockUserGuides,
      addUserGuide: state.addUserGuide,
      updateUserGuide: state.updateUserGuide,
      removeUserGuide: state.removeUserGuide,
      clearUserGuides: state.clearUserGuides,
      setShowUserGuides: state.setShowUserGuides,
      setLockUserGuides: state.setLockUserGuides,
      selectedId: state.selectedId,
      slots: state.slots,
    }))
  );

  // حالة سحب خط إرشادي جديد من المسطرة أو تحريك خط قائم
  const [dragGuideState, setDragGuideState] = useState<{
    type: "h" | "v";
    pos: number; // 0..1 نسبي إلى الكانفس
    guideId?: string;
  } | null>(null);

  // 🛡️ تقسيم الاشتراك: الدوال (هويات ثابتة أبداً) منفصلة عن الحالة،
  // وحالة الخانة (slots/selectedId) انتقلت إلى SelectedSlotQuickBar —
  // تعديل أي خانة لم يعد يعيد رسم قشرة المحرر.
  const {
    selectElement,
    setEditingTextId,
    updateElement,
    pushHistory,
    addImageElement,
    addImageElementsBatch,
    setCanvasZoom,
  } = useEditorStore(useShallow((state) => ({
    selectElement: state.selectElement,
    setEditingTextId: state.setEditingTextId,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
    addImageElement: state.addImageElement,
    addImageElementsBatch: state.addImageElementsBatch,
    setCanvasZoom: state.setCanvasZoom,
  })));

  const {
    mode,
    elements,
    editingTextId,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    canvasZoom,
    showRuler,
    template,
    printSettings,
    selectedIds,
    collageMargin,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    elements: state.elements,
    editingTextId: state.editingTextId,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    backgroundColor: state.backgroundColor,
    canvasZoom: state.canvasZoom,
    showRuler: state.showRuler,
    template: state.template,
    printSettings: state.printSettings,
    selectedIds: state.selectedIds,
    collageMargin: state.collageMargin,
  })));

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
  }, [showRuler, printMode]);

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
  }, [updateRulerPositions]);

  const aspect = canvasWidth / canvasHeight;
  const maxW = (containerSize.w - 32) * canvasZoom;
  const maxH = (containerSize.h - 32) * canvasZoom;
  let displayW = maxW;
  let displayH = displayW / aspect;
  if (displayH > maxH) {
    displayH = maxH;
    displayW = displayH * aspect;
  }
  displayW = Math.max(100 * canvasZoom, displayW);
  displayH = Math.max(100 * canvasZoom, displayH);

  const prevZoomRef = useRef(canvasZoom);
  const prevCanvasRectRef = useRef<DOMRect | null>(null);
  const zoomPivotRef = useRef<{ pctX: number, pctY: number, screenX: number, screenY: number } | null>(null);

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
        const newZoom = Math.min(Math.max(0.1, baseZoom * factor), 5);

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

    return () => {
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [setCanvasZoom]);

  React.useLayoutEffect(() => {
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
  }, [canvasZoom]);

  const widthMM = useMemo(() => {
    if (template) return template.widthMM;
    return (canvasWidth / (printSettings?.dpi || 300)) * 25.4;
  }, [template, canvasWidth, printSettings]);

  const heightMM = useMemo(() => {
    if (template) return template.heightMM;
    return (canvasHeight / (printSettings?.dpi || 300)) * 25.4;
  }, [template, canvasHeight, printSettings]);

  const marginPxX = useMemo(() => {
    if (mode === "collage" && typeof collageMargin === "number" && collageMargin > 0 && canvasWidth > 0) {
      return (collageMargin / canvasWidth) * displayW;
    }
    if (printSettings?.marginMM && widthMM > 0) {
      return (printSettings.marginMM / widthMM) * displayW;
    }
    return 0;
  }, [mode, collageMargin, canvasWidth, displayW, printSettings?.marginMM, widthMM]);

  const marginPxY = useMemo(() => {
    if (mode === "collage" && typeof collageMargin === "number" && collageMargin > 0 && canvasHeight > 0) {
      return (collageMargin / canvasHeight) * displayH;
    }
    if (printSettings?.marginMM && heightMM > 0) {
      return (printSettings.marginMM / heightMM) * displayH;
    }
    return 0;
  }, [mode, collageMargin, canvasHeight, displayH, printSettings?.marginMM, heightMM]);

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
  }, [updateRulerPositions, displayW, displayH, canvasZoom, mode, containerSize]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      updateRulerPositions();
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [updateRulerPositions]);

  const handleWorkspaceMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
  };

  const handleWorkspaceMouseLeave = () => {
    if (mouseMoveRafId.current !== null) {
      cancelAnimationFrame(mouseMoveRafId.current);
      mouseMoveRafId.current = null;
    }
    const hCursor = document.getElementById("h-ruler-cursor");
    const vCursor = document.getElementById("v-ruler-cursor");
    if (hCursor) hCursor.style.display = "none";
    if (vCursor) vCursor.style.display = "none";
  };

  // محاذاة مغناطيسية ذكية للخطوط الإرشادية أثناء السحب نحو الحواف والمراكز والعناصر
  const snapGuidePos = useCallback((rawPos: number, type: "h" | "v", displayDim: number): number => {
    if (displayDim <= 0) return rawPos;
    const SNAP_THRESHOLD_PX = 6;
    const thresholdNorm = SNAP_THRESHOLD_PX / displayDim;

    // أهداف المغناطيسية: 0 (البداية)، 0.5 (المنتصف)، 1 (النهاية)
    const targets = [0, 0.5, 1];

    // أهداف حواف ومراكز العناصر المضافة على الكانفاس
    for (const el of elements) {
      if (type === "h") {
        targets.push(el.y, el.y + el.height / 2, el.y + el.height);
      } else {
        targets.push(el.x, el.x + el.width / 2, el.x + el.width);
      }
    }

    for (const target of targets) {
      if (Math.abs(rawPos - target) < thresholdNorm) {
        return target;
      }
    }
    return rawPos;
  }, [elements]);

  // بدء سحب خط إرشادي جديد من المسطرة الأفقية
  const handleStartDragHGuide = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (printMode || !innerRef.current || displayH <= 0 || lockUserGuides) return;
    e.preventDefault();
    const paperRect = innerRef.current.getBoundingClientRect();
    const relY = (e.clientY - paperRect.top) / displayH;
    setDragGuideState({
      type: "h",
      pos: snapGuidePos(relY, "h", displayH),
    });
  }, [printMode, displayH, lockUserGuides, snapGuidePos]);

  // بدء سحب خط إرشادي جديد من المسطرة الرأسية
  const handleStartDragVGuide = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (printMode || !innerRef.current || displayW <= 0 || lockUserGuides) return;
    e.preventDefault();
    const paperRect = innerRef.current.getBoundingClientRect();
    const relX = (e.clientX - paperRect.left) / displayW;
    setDragGuideState({
      type: "v",
      pos: snapGuidePos(relX, "v", displayW),
    });
  }, [printMode, displayW, lockUserGuides, snapGuidePos]);

  // متابعة سحب الخط الإرشادي عالمياً
  useEffect(() => {
    if (!dragGuideState) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!innerRef.current) return;
      const paperRect = innerRef.current.getBoundingClientRect();
      if (dragGuideState.type === "h") {
        const h = paperRect.height || 1;
        const rawPos = (e.clientY - paperRect.top) / h;
        const pos = snapGuidePos(rawPos, "h", h);
        setDragGuideState((prev) => (prev ? { ...prev, pos } : null));
      } else {
        const w = paperRect.width || 1;
        const rawPos = (e.clientX - paperRect.left) / w;
        const pos = snapGuidePos(rawPos, "v", w);
        setDragGuideState((prev) => (prev ? { ...prev, pos } : null));
      }
    };

    const handlePointerUp = () => {
      if (dragGuideState) {
        const { type, pos, guideId } = dragGuideState;
        if (pos >= -0.04 && pos <= 1.04) {
          const clamped = Math.min(1, Math.max(0, pos));
          if (guideId) {
            updateUserGuide(guideId, clamped);
          } else {
            addUserGuide({ type, pos: clamped });
          }
        } else if (guideId) {
          // سحبه خارج الكانفس يؤدي إلى حذفه
          removeUserGuide(guideId);
        }
        setDragGuideState(null);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragGuideState, addUserGuide, updateUserGuide, removeUserGuide, snapGuidePos]);

  const handleDoubleClick = useCallback(async (el: CanvasElement) => {
     if (printMode || isLoading) return;
     // العنصر المقفل لا يُحرَّر بالنقر المزدوج — السحب والـ Transformer يحترمان القفل أيضاً
     if (el.locked) return;
     if (el.type === "image") {
       try {
         setIsLoading(true);
         const b64 = await OpenFile();
         if (b64) {
           const isWailsDesktop = wailsIsDesktop();
           let srcToUse = b64;
           if (isWailsDesktop && b64.startsWith("data:image/")) {
             try {
               const localPath = await SaveImageFromBase64(b64);
               if (localPath) srcToUse = localPath;
             } catch (e) {
               console.error("Failed to save image locally:", e);
             }
           }
           updateElement(el.id, { imageSrc: srcToUse });
           pushHistory();
         }
       } catch (err) {
         console.error("Open file error:", err);
       } finally {
         setIsLoading(false);
       }
     } else if (el.type === "text") {
       setEditingTextId(el.id);
     }
   }, [printMode, isLoading, updateElement, pushHistory, setEditingTextId]);

  const handleSlotClick = useCallback((slotId: string) => {
    if (printMode) return;
    selectElement(slotId);
  }, [printMode, selectElement]);

    const handleSlotDblClick = useCallback(async (slotId: string) => {
      if (printMode || isLoading) return;
      const now = Date.now();
      if (now - lastDblClickRef.current < 200) return;
      lastDblClickRef.current = now;
     try {
       setIsLoading(true);
       const b64 = await OpenFile();
       if (b64) {
         const isWailsDesktop = wailsIsDesktop();
         let srcToUse = b64;
         if (isWailsDesktop && b64.startsWith("data:image/")) {
           try {
             const localPath = await SaveImageFromBase64(b64);
             if (localPath) srcToUse = localPath;
           } catch (e) {
             console.error("Failed to save image locally:", e);
           }
         }
         useEditorStore.getState().setSlotImage(slotId, srcToUse);
       }
     } catch (err) {
       console.error("Open file error:", err);
     } finally {
       setIsLoading(false);
     }
   }, [printMode, isLoading]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const CHUNK_SIZE = 3;

    try {
      setIsLoading(true);
      const uploadedSrcs: string[] = [];
      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(chunk.map(async (file) => {
          if (file.size > MAX_FILE_SIZE) {
            console.warn(`Skipping oversized file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
            return null;
          }
          try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(file);
            });
            const src = await SaveImageFromBase64(dataUrl);
            return src || null;
          } catch {
            return null;
          }
        }));
        for (const src of results) {
          if (src) uploadedSrcs.push(src);
        }
        await new Promise((r) => setTimeout(r, 0));
      }

      if (uploadedSrcs.length === 0) return;

      const freshState = useEditorStore.getState();
      const freshMode = freshState.mode;
      const freshSlots = freshState.slots;
      const freshCollageTemplate = freshState.collageTemplate;
      // قراءة الأبعاد من الحالة الطازجة أيضاً — قد تتغير إعدادات الكولاج أثناء
      // رفع الملفات فلا تُطابق خانات محسوبة بقيم قديمة (إصلاح Bug#15)
      const freshCanvasWidth = freshState.canvasWidth;
      const freshCanvasHeight = freshState.canvasHeight;
      const freshCollageMargin = freshState.collageMargin;
      const freshCollageGap = freshState.collageGap;

      if (freshMode === "collage" || freshSlots.length > 0) {
        if (freshMode !== "collage") {
          freshState.setMode("collage");
        }

        let targetSlotId: string | null = null;
        if (innerRef.current) {
          const rect = innerRef.current.getBoundingClientRect();
          // إحداثيات منطقية بمساحة الكانفس (مثل konva-collage-layer) بدل نسبة عرض الشاشة —
          // القانون يشمل هوامش الكولاج وفجواته: margin + slot.x * availW + gap/2
          const scale = rect.width / freshCanvasWidth;
          const logicalX = (e.clientX - rect.left) / scale;
          const logicalY = (e.clientY - rect.top) / scale;
          const hasPhysical = freshCollageTemplate?.physicalLayout;
          const margin = hasPhysical ? 0 : freshCollageMargin;
          const gap = hasPhysical ? 0 : freshCollageGap;
          const availW = freshCanvasWidth - 2 * margin;
          const availH = freshCanvasHeight - 2 * margin;

          const matched = freshSlots.find((s) => {
            const sx = margin + s.x * availW + gap / 2;
            const sy = margin + s.y * availH + gap / 2;
            const sw = s.w * availW - gap;
            const sh = s.h * availH - gap;
            return logicalX >= sx && logicalX <= sx + sw && logicalY >= sy && logicalY <= sy + sh;
          });
          if (matched) {
            targetSlotId = matched.id;
          }
        }

        const assignments: { slotId: string; src: string }[] = [];
        if ((freshCollageTemplate?.physicalLayout || freshSlots.length > 1) && uploadedSrcs.length === 1 && uploadedSrcs[0]) {
          for (const s of freshSlots) {
            assignments.push({ slotId: s.id, src: uploadedSrcs[0] });
          }
        } else if (targetSlotId && uploadedSrcs[0]) {
          assignments.push({ slotId: targetSlotId, src: uploadedSrcs[0] });
          let srcIdx = 1;
          for (const s of freshSlots) {
            if (s.id !== targetSlotId && !s.imageSrc && srcIdx < uploadedSrcs.length) {
              assignments.push({ slotId: s.id, src: uploadedSrcs[srcIdx++] });
            }
          }
        } else {
          let srcIdx = 0;
          for (const s of freshSlots) {
            if (!s.imageSrc && srcIdx < uploadedSrcs.length) {
              assignments.push({ slotId: s.id, src: uploadedSrcs[srcIdx++] });
            }
          }
          if (srcIdx === 0 && freshSlots[0] && uploadedSrcs[0]) {
            assignments.push({ slotId: freshSlots[0].id, src: uploadedSrcs[0] });
          }
        }
        // دفعة واحدة بخطوة تراجع واحدة بدل خطوة لكل صورة (الإسقاط المتعدد)
        freshState.setSlotImagesBatch(assignments, uploadedSrcs[0] || null);
       } else {
         if (uploadedSrcs.length === 1) {
           const aspect = await resolveImageAspectRatio(uploadedSrcs[0]);
           addImageElement(uploadedSrcs[0], aspect);
         } else {
           const items: { src: string; aspectRatio: number }[] = [];
           for (const src of uploadedSrcs) {
             const aspect = await resolveImageAspectRatio(src);
             items.push({ src, aspectRatio: aspect });
           }
           freshState.addImageElementsBatch(items);
         }
       }
    } catch (err) {
      console.error("Drop file error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCanvasContextMenu = useCallback((e: any) => {
    if (printMode) return;
    const evt = e.evt;
    if (!evt) return;

    const x = evt.clientX;
    const y = evt.clientY;

    let targetType: "element" | "slot" | "canvas" = "canvas";
    let targetId: string | null = null;

    const node = e.target;
    const stage = node.getStage();
    const isBackground = node === stage || node.hasName("bg-rect");

    if (!isBackground) {
      if (mode === "single") {
        const elNode = typeof node.findAncestor === 'function' ? (node.findAncestor((n: any) => !!n.id(), true)) : null;
        const id = elNode?.id() || node.id() || node.attrs?.id;
        if (id) {
          targetType = "element";
          targetId = id;
          if (!selectedIds.includes(id)) {
            selectElement(id);
          }
        }
      } else if (mode === "collage") {
        const parentGroup = typeof node.findAncestor === 'function' ? node.findAncestor((n: any) => n.id() && n.id().startsWith("slot-"), true) : null;
        if (parentGroup) {
          targetType = "slot";
          targetId = parentGroup.id().replace("slot-", "");
          selectElement(targetId);
        }
      }
    }

    setContextMenu({
      position: { x, y },
      target: { type: targetType, id: targetId }
    });
  }, [printMode, mode, selectedIds, selectElement]);

  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements]
  );

  const canvasArea = (
    <div
      ref={innerRef}
      id="canvas-area"
      className="relative rounded-sm overflow-hidden border border-black/10 dark:border-white/10 transition-shadow duration-300 shadow-md shadow-black/15 hover:shadow-lg hover:shadow-black/20 fluent-specular"
      style={{
        width: displayW,
        height: displayH,
        backgroundColor,
        backgroundImage:
          backgroundColor === "transparent"
            ? `linear-gradient(45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor()} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor()} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor()} 75%)`
            : undefined,
        backgroundSize: backgroundColor === "transparent" ? "20px 20px" : undefined,
        backgroundPosition: backgroundColor === "transparent" ? "0 0, 0 10px, 10px -10px, -10px 0px" : undefined,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) selectElement(null);
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md rounded-sm gap-2">
          <Spinner className="w-8 h-8 text-primary" size={32} />
          <span className="text-xs font-bold text-white font-cairo">جاري المعالجة ...</span>
        </div>
      )}

      {(mode === "collage" || mode === "single") && (
        <KonvaCanvas
          displayW={displayW}
          displayH={displayH}
          sortedElements={sortedElements}
          handleDoubleClick={handleDoubleClick}
          setActiveGuides={setActiveGuides}
          handleSlotClick={handleSlotClick}
          handleSlotDblClick={handleSlotDblClick}
          onContextMenu={handleCanvasContextMenu}
        />
      )}

      <CanvasContextMenu
        contextMenu={contextMenu}
        printMode={printMode}
        onClose={() => setContextMenu(null)}
      />

      <SelectedSlotQuickBar
        displayW={displayW}
        displayH={displayH}
        printMode={printMode}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />



      {/* 🧭 خطوط المستخدم الإرشادية التفاعلية (User Guidelines) */}
      {!printMode && showUserGuides && userGuides.map((guide) => {
        const isH = guide.type === "h";
        const isCurrentlyDragging = dragGuideState?.guideId === guide.id;
        if (isCurrentlyDragging) return null;

        return (
          <div
            key={guide.id}
            title={lockUserGuides ? "خط إرشادي مقفل (انقر لفتح القفل من قائمة المسطرة)" : "خط إرشادي: اسحب للتحريك أو انقر مرتين للحذف"}
            onPointerDown={(e) => {
              if (lockUserGuides) return;
              e.stopPropagation();
              setDragGuideState({
                type: guide.type,
                pos: guide.pos,
                guideId: guide.id,
              });
            }}
            onDoubleClick={(e) => {
              if (lockUserGuides) return;
              e.stopPropagation();
              removeUserGuide(guide.id);
            }}
            className={`absolute z-[45] group transition-colors select-none ${
              lockUserGuides
                ? "cursor-default"
                : isH
                ? "left-0 right-0 h-4 -mt-2 cursor-ns-resize flex items-center"
                : "top-0 bottom-0 w-4 -ml-2 cursor-ew-resize flex justify-center"
            }`}
            style={{
              [isH ? "top" : "left"]: `${guide.pos * 100}%`,
              ...(lockUserGuides && (isH ? { left: 0, right: 0, height: "16px", marginTop: "-8px", display: "flex", alignItems: "center" } : { top: 0, bottom: 0, width: "16px", marginLeft: "-8px", display: "flex", justifyContent: "center" })),
            }}
          >
            <div
              className={`transition-all ${
                lockUserGuides
                  ? "bg-amber-500/70 shadow-[0_0_2px_rgba(245,158,11,0.3)]"
                  : "bg-sky-500 shadow-[0_0_3px_rgba(14,165,233,0.4)]"
              } ${
                isH ? "w-full h-[1px] group-hover:h-[2px]" : "h-full w-[1px] group-hover:w-[2px]"
              }`}
            />
            {/* شارة القياس عند التحويم */}
            <div
              className={`absolute hidden group-hover:flex items-center px-1.5 py-0.5 rounded ${
                lockUserGuides ? "bg-amber-600" : "bg-sky-600"
              } text-white font-mono text-[9px] font-bold shadow-md z-50 pointer-events-none ${
                isH ? "left-3 -top-5" : "top-3 left-2"
              }`}
            >
              {formatGuideMeasurement(guide.pos, isH, rulerUnit, widthMM, heightMM, canvasWidth, canvasHeight)}
              {lockUserGuides && " (🔒)"}
            </div>
          </div>
        );
      })}

      {/* 🧭 خط السحب الإرشادي المباشر (Live Dragging Guide Line) */}
      {!printMode && dragGuideState && (
        <div
          className={`absolute z-[55] pointer-events-none select-none ${
            dragGuideState.type === "h"
              ? "left-0 right-0 h-[1px] bg-sky-400 shadow-[0_0_3px_rgba(56,189,248,0.5)] flex items-center"
              : "top-0 bottom-0 w-[1px] bg-sky-400 shadow-[0_0_3px_rgba(56,189,248,0.5)] flex justify-center"
          }`}
          style={{
            [dragGuideState.type === "h" ? "top" : "left"]: `${dragGuideState.pos * 100}%`,
          }}
        >
          <div
            className={`absolute flex items-center px-1.5 py-0.5 rounded bg-sky-600 text-white font-mono text-[9px] font-bold shadow-lg ${
              dragGuideState.type === "h" ? "left-3 -top-5" : "top-3 left-2"
            }`}
          >
            {formatGuideMeasurement(dragGuideState.pos, dragGuideState.type === "h", rulerUnit, widthMM, heightMM, canvasWidth, canvasHeight)}
          </div>
        </div>
      )}

      {/* 🧭 خطوط المحاذاة الذكية أثناء التحريك (Smart Snap Alignment Guides) */}
      {!printMode && activeGuides.map((guide, idx) => {
        const isCenter = Math.abs(guide.coord - 0.5) < 0.005;
        const color = isCenter ? guideCenter() : guideEdge();
        return (
          <div
            key={idx}
            className="absolute pointer-events-none z-[60] transition-opacity duration-75"
            style={{
              left: guide.type === "v" ? `${guide.coord * 100}%` : 0,
              top: guide.type === "h" ? `${guide.coord * 100}%` : 0,
              width: guide.type === "v" ? "1px" : "100%",
              height: guide.type === "h" ? "1px" : "100%",
              backgroundColor: color,
            }}
          />
        );
      })}

      <TextEditingOverlay
        printMode={printMode}
        editingTextId={editingTextId}
        elements={elements}
        displayW={displayW}
        displayH={displayH}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        updateElement={updateElement}
        pushHistory={pushHistory}
        setEditingTextId={setEditingTextId}
      />
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col bg-muted/40 overflow-hidden select-none" dir="ltr">
      <ViewportFixedRulersHeader
        showRuler={showRuler}
        printMode={printMode}
        viewportWidth={rulerMetrics.viewportWidth}
        originX={rulerMetrics.originX}
        displayW={displayW}
        widthMM={widthMM}
        canvasPxW={canvasWidth}
        rulerUnit={rulerUnit}
        marginPxX={marginPxX}
        onChangeRulerUnit={setRulerUnit}
        onStartDragHGuide={handleStartDragHGuide}
        onClearGuides={clearUserGuides}
        hasGuides={userGuides.length > 0}
        showUserGuides={showUserGuides}
        onToggleShowGuides={() => setShowUserGuides(!showUserGuides)}
        lockUserGuides={lockUserGuides}
        onToggleLockGuides={() => setLockUserGuides(!lockUserGuides)}
      />

      <div className="flex flex-1 overflow-hidden relative" dir="ltr">
        <ViewportFixedRulersSidebar
          showRuler={showRuler}
          printMode={printMode}
          viewportHeight={rulerMetrics.viewportHeight}
          originY={rulerMetrics.originY}
          displayH={displayH}
          heightMM={heightMM}
          canvasPxH={canvasHeight}
          rulerUnit={rulerUnit}
          marginPxY={marginPxY}
          onStartDragVGuide={handleStartDragVGuide}
        />

        <div
          ref={(node) => {
            (containerRef as any).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as any).current = node;
          }}
          className="flex-1 overflow-auto workspace-grid relative"
          onMouseMove={handleWorkspaceMouseMove}
          onMouseLeave={handleWorkspaceMouseLeave}
        >
          <div
            className="min-w-full min-h-full flex p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) selectElement(null);
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div style={{ margin: "auto" }}>
              {canvasArea}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}));
