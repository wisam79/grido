import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { Spinner } from "@/components/ui/huge-icon";
import { ArrowClockwise, X } from "@phosphor-icons/react";
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
import { useCanvasViewport } from "./use-canvas-viewport";
import { useUserGuides } from "./use-user-guides";
import { useImageDrop } from "./use-image-drop";

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
          {isLoading ? <Spinner className="w-3.5 h-3.5" size={14} /> : <ArrowClockwise className="w-3.5 h-3.5 text-primary" weight="bold" />}
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
          <X className="w-3.5 h-3.5" weight="regular" />
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

  const lastDblClickRef = useRef<number>(0);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 800 });
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

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
    clearUserGuides,
    setShowUserGuides,
    setLockUserGuides,
  } = useEditorStore(
    useShallow((state) => ({
      rulerUnit: state.rulerUnit,
      setRulerUnit: state.setRulerUnit,
      userGuides: state.userGuides,
      showUserGuides: state.showUserGuides,
      lockUserGuides: state.lockUserGuides,
      clearUserGuides: state.clearUserGuides,
      setShowUserGuides: state.setShowUserGuides,
      setLockUserGuides: state.setLockUserGuides,
    }))
  );

  // 🛡️ تقسيم الاشتراك: الدوال (هويات ثابتة أبداً) منفصلة عن الحالة
  const {
    selectElement,
    setEditingTextId,
    updateElement,
    pushHistory,
    setCanvasZoom,
  } = useEditorStore(useShallow((state) => ({
    selectElement: state.selectElement,
    setEditingTextId: state.setEditingTextId,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
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

  // 🧭 منطق الزوم والتحريك (كان مضمّناً في هذا الملف)
  useCanvasViewport(containerRef, innerRef);

  const aspect = canvasWidth / canvasHeight;
  const maxW = (containerSize.w - 32) * canvasZoom;
  const maxH = (containerSize.h - 32) * canvasZoom;
  let displayW = maxW;
  let displayH = displayW / aspect;
  if (displayH > maxH) {
    displayH = maxH;
    displayW = displayH * aspect;
  }
  displayW = Math.round(Math.max(100 * canvasZoom, displayW));
  displayH = Math.round(Math.max(100 * canvasZoom, displayH));

  // 🧭 الخطوط الإرشادية (كانت مضمّنة في هذا الملف)
  const {
    dragGuideState,
    setDragGuideState,
    handleStartDragHGuide,
    handleStartDragVGuide,
  } = useUserGuides(innerRef, displayW, displayH, printMode, elements);

  // 🧭 منطق إسقاط الصور (كان مضمّناً في هذا الملف)
  const {
    isLoading,
    setIsLoading,
    handleDragOver,
    handleDrop,
  } = useImageDrop(innerRef);

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
  }, [printMode, isLoading, updateElement, pushHistory, setEditingTextId, setIsLoading]);

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
  }, [printMode, isLoading, setIsLoading]);

  const handleCanvasContextMenu = useCallback((e: KonvaEventObject<MouseEvent>) => {
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
        const elNode = typeof node.findAncestor === 'function' ? (node.findAncestor((n: Konva.Node) => !!n.id(), true)) : null;
        const id = elNode?.id() || node.id() || (node.attrs as { id?: string } | undefined)?.id;
        if (id) {
          targetType = "element";
          targetId = id;
          if (!selectedIds.includes(id)) {
            selectElement(id);
          }
        }
      } else if (mode === "collage") {
        const parentGroup = typeof node.findAncestor === 'function' ? node.findAncestor((n: Konva.Node) => !!n.id() && n.id().startsWith("slot-"), true) : null;
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
              useEditorStore.getState().removeUserGuide(guide.id);
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
            (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref && "current" in ref) {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }
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
