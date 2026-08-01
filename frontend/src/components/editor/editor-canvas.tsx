import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { X, RefreshCw } from "lucide-react";
import { OpenFile, SaveImageFromBase64, GetImageDimensions } from "../../../wailsjs/go/main/App";
import { SnapGuide } from "@/lib/snap-utils";
import { KonvaCanvas } from "./konva/konva-canvas";
import { useShallow } from "zustand/react/shallow";
import { ContextMenuPosition, ContextMenuTarget } from "./context-menu";
import { ViewportFixedRulersHeader, ViewportFixedRulersSidebar } from "./canvas/canvas-rulers";
import type { RulerUnit } from "./ruler";
import { TextEditingOverlay } from "./canvas/text-editing-overlay";
import { CanvasContextMenu } from "./canvas/canvas-context-menu";

export const EditorCanvas = React.memo(React.forwardRef<
  HTMLDivElement,
  { printMode?: boolean }
>(function EditorCanvas({ printMode = false }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const hRulerWrapperRef = useRef<HTMLDivElement>(null);
  const vRulerWrapperRef = useRef<HTMLDivElement>(null);

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

  // وحدة المساطر — تفضيل واجهة خفيف يُحفظ محلياً (AGENTS.md #68)
  const [rulerUnit, setRulerUnit] = useState<RulerUnit>(() =>
    typeof localStorage !== "undefined" && localStorage.getItem("grido_ruler_unit") === "px" ? "px" : "mm"
  );
  const toggleRulerUnit = useCallback(() => {
    setRulerUnit((prev) => {
      const next = prev === "mm" ? "px" : "mm";
      try { localStorage.setItem("grido_ruler_unit", next); } catch { /* تجاهل قيود التخزين */ }
      return next;
    });
  }, []);

  const {
    mode,
    elements,
    slots,
    selectedId,
    selectedIds,
    editingTextId,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    selectElement,
    setEditingTextId,
    updateElement,
    pushHistory,
    addImageElement,
    setSlotImage,
    updateSlot,
    collageGap,
    collageMargin,
    collageTemplate,
    template,
    printSettings,
    showRuler,
    canvasZoom,
    setCanvasZoom,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    elements: state.elements,
    slots: state.slots,
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    editingTextId: state.editingTextId,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    backgroundColor: state.backgroundColor,
    selectElement: state.selectElement,
    setEditingTextId: state.setEditingTextId,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
    addImageElement: state.addImageElement,
    setSlotImage: state.setSlotImage,
    updateSlot: state.updateSlot,
    collageGap: state.collageGap,
    collageMargin: state.collageMargin,
    collageTemplate: state.collageTemplate,
    template: state.template,
    printSettings: state.printSettings,
    showRuler: state.showRuler,
    canvasZoom: state.canvasZoom,
    setCanvasZoom: state.setCanvasZoom,
  })));

  useEffect(() => {
    if (!containerRef.current) return;
    let rafId: number | null = null;
    const ro = new ResizeObserver(() => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width, h: rect.height });
      });
    });
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

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

  const updateRulerPositions = useCallback(() => {
    if (!showRuler || printMode) return;
    if (!containerRef.current || !innerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const canvasRect = innerRef.current.getBoundingClientRect();

    const relX = canvasRect.left - containerRect.left;
    const relY = canvasRect.top - containerRect.top;

    if (hRulerWrapperRef.current) {
      hRulerWrapperRef.current.style.transform = `translateX(${relX}px)`;
    }
    if (vRulerWrapperRef.current) {
      vRulerWrapperRef.current.style.transform = `translateY(${relY}px)`;
    }
  }, [showRuler, printMode]);

  useEffect(() => {
    updateRulerPositions();
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

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (printMode) return;
    if (mouseMoveRafId.current !== null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseMoveRafId.current = requestAnimationFrame(() => {
      mouseMoveRafId.current = null;

      // إعادة استعلام العناصر كل إطار — المراجع المتخزنة تموت عند تبديل المساطر
      // (تعاد بنية الـ SVG من جديد فتترك العناصر القديمة مفصولة عن الـ DOM)
      hRulerCursorRef.current = document.getElementById("h-ruler-cursor") as SVGLineElement | null;
      vRulerCursorRef.current = document.getElementById("v-ruler-cursor") as SVGLineElement | null;

      const hCursor = hRulerCursorRef.current;
      if (hCursor) {
        hCursor.setAttribute("x1", x.toString());
        hCursor.setAttribute("x2", x.toString());
        hCursor.style.display = "block";
      }
      const vCursor = vRulerCursorRef.current;
      if (vCursor) {
        vCursor.setAttribute("y1", y.toString());
        vCursor.setAttribute("y2", y.toString());
        vCursor.style.display = "block";
      }
    });
  };

  const handleCanvasMouseLeave = () => {
    if (mouseMoveRafId.current !== null) {
      cancelAnimationFrame(mouseMoveRafId.current);
      mouseMoveRafId.current = null;
    }
    const hCursor = hRulerCursorRef.current;
    if (hCursor) hCursor.style.display = "none";
    const vCursor = vRulerCursorRef.current;
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
           const isWailsDesktop = typeof (window as any).go?.main?.App !== "undefined";
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
         const isWailsDesktop = typeof (window as any).go?.main?.App !== "undefined";
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

      if (freshMode === "collage" || freshSlots.length > 0) {
        if (freshMode !== "collage") {
          freshState.setMode("collage");
        }

        let targetSlotId: string | null = null;
        if (innerRef.current) {
          const rect = innerRef.current.getBoundingClientRect();
          // إحداثيات منطقية بمساحة الكانفس (مثل konva-collage-layer) بدل نسبة عرض الشاشة —
          // القانون يشمل هوامش الكولاج وفجواته: margin + slot.x * availW + gap/2
          const scale = rect.width / canvasWidth;
          const logicalX = (e.clientX - rect.left) / scale;
          const logicalY = (e.clientY - rect.top) / scale;
          const hasPhysical = freshCollageTemplate?.physicalLayout;
          const margin = hasPhysical ? 0 : collageMargin;
          const gap = hasPhysical ? 0 : collageGap;
          const availW = canvasWidth - 2 * margin;
          const availH = canvasHeight - 2 * margin;

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
         for (const src of uploadedSrcs) {
           let aspect = 1;
           try {
             if (typeof GetImageDimensions === "function") {
               const dims = await GetImageDimensions(src);
               if (dims && dims.width > 0 && dims.height > 0) {
                 aspect = dims.width / dims.height;
               }
             }
           } catch {
             // Fallback if GetImageDimensions fails or in dev web mode
             try {
               const res = await fetch(src);
               const blob = await res.blob();
               const bitmap = await createImageBitmap(blob);
               aspect = bitmap.width / bitmap.height;
               bitmap.close();
             } catch {
               aspect = 1;
             }
           }
           addImageElement(src, aspect);
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

    if (targetType === "canvas") {
      setContextMenu(null);
      return;
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
      className="relative rounded-sm overflow-hidden border border-white/5 transition-shadow duration-300 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.7)]"
      style={{
        width: displayW,
        height: displayH,
        backgroundColor,
        backgroundImage:
          backgroundColor === "transparent"
            ? "linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)"
            : undefined,
        backgroundSize: backgroundColor === "transparent" ? "20px 20px" : undefined,
        backgroundPosition: backgroundColor === "transparent" ? "0 0, 0 10px, 10px -10px, -10px 0px" : undefined,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) selectElement(null);
      }}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={handleCanvasMouseLeave}
    >
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-sm">
          <RefreshCw className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {(mode === "collage" || (mode === "single" && elements.length > 0)) && (
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

      {mode === "collage" && !printMode && (() => {
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
            <button
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 z-30 pointer-events-auto shadow-md cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                updateSlot(selectedSlot.id, { imageSrc: undefined });
              }}
              title="إزالة"
            >
              <X className="w-3.5 h-3.5" />
            </button>
             <button
               className="absolute top-1 left-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 z-30 pointer-events-auto shadow-md cursor-pointer"
               onClick={async (e) => {
                 e.stopPropagation();
                 if (isLoading) return;
                 try {
                   setIsLoading(true);
                   const b64 = await OpenFile();
                   if (b64) {
                     const isWailsDesktop = typeof (window as any).go?.main?.App !== "undefined";
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
               title="استبدال"
             >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}



      {!printMode && activeGuides.map((guide, idx) => (
        <div
          key={idx}
          className="absolute pointer-events-none z-50"
          style={{
            left: guide.type === "v" ? `${guide.coord * 100}%` : 0,
            top: guide.type === "h" ? `${guide.coord * 100}%` : 0,
            width: guide.type === "v" ? "1.5px" : "100%",
            height: guide.type === "h" ? "1.5px" : "100%",
            borderStyle: "dashed",
            borderWidth: guide.type === "v" ? "0 0 0 1.5px" : "1.5px 0 0 0",
            borderColor: "#ec4899",
          }}
        />
      ))}

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
    <div className="absolute inset-0 flex flex-col bg-muted/40 overflow-hidden select-none">
      <ViewportFixedRulersHeader
        showRuler={showRuler}
        printMode={printMode}
        displayW={displayW}
        widthMM={widthMM}
        canvasPxW={canvasWidth}
        rulerUnit={rulerUnit}
        onToggleRulerUnit={toggleRulerUnit}
        hRulerWrapperRef={hRulerWrapperRef}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <ViewportFixedRulersSidebar
          showRuler={showRuler}
          printMode={printMode}
          displayH={displayH}
          heightMM={heightMM}
          canvasPxH={canvasHeight}
          rulerUnit={rulerUnit}
          vRulerWrapperRef={vRulerWrapperRef}
        />

        <div
          ref={(node) => {
            (containerRef as any).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as any).current = node;
          }}
          className="flex-1 overflow-auto workspace-grid relative"
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
