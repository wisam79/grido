import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { IMAGE_FILTERS } from "@/lib/templates";
import { X, RefreshCw } from "lucide-react";
import { OpenFile } from "../../../wailsjs/go/main/App";
import { buildCSSFilter } from "@/lib/utils";
import { getSnapPositions, SnapGuide } from "@/lib/snap-utils";
import { KonvaCanvas } from "./konva/konva-canvas";



type DragState =
  | null
  | {
      kind: "move";
      id: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
    }
  | {
      kind: "resize";
      id: string;
      handle: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
    };

export const EditorCanvas = React.forwardRef<
  HTMLDivElement,
  { printMode?: boolean }
>(function EditorCanvas({ printMode = false }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 800 });
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const requestRef = useRef<number | null>(null);

  const {
    mode,
    elements,
    slots,
    selectedId,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    selectElement,
    updateElement,
    pushHistory,
    addImageElement,
    setSlotImage,
    updateSlot,
    collageGap,
    collageMargin,
    collageRadius,
    collageShowCutLines,
    collageStrokeWidth,
    collageStrokeColor,
  } = useEditorStore();

  // قياس حجم الحاوية لتحجيم الكانفس (مع throttle)
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

  // تنظيف requestAnimationFrame عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // حساب حجم الكانفس المعروض
  const aspect = canvasWidth / canvasHeight;
  const maxW = containerSize.w - 32;
  const maxH = containerSize.h - 32;
  let displayW = maxW;
  let displayH = displayW / aspect;
  if (displayH > maxH) {
    displayH = maxH;
    displayW = displayH * aspect;
  }
  displayW = Math.max(100, displayW);
  displayH = Math.max(100, displayH);

  // تحويل الإحداثيات
  const toRel = useCallback(
    (clientX: number, clientY: number) => {
      if (!innerRef.current) return { x: 0, y: 0 };
      const rect = innerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      return { x, y };
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent, el: CanvasElement) => {
    if (printMode) return;
    e.stopPropagation();
    selectElement(el.id);
    if (el.locked) return; // Block dragging if locked
    setDrag({
      kind: "move",
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeStart = (
    e: React.PointerEvent,
    el: CanvasElement,
    handle: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (el.locked) return; // Block resizing if locked
    setDrag({
      kind: "resize",
      id: el.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag) return;

    const clientX = e.clientX;
    const clientY = e.clientY;
    const altKey = e.altKey;

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    requestRef.current = requestAnimationFrame(() => {
      requestRef.current = null;
      const dx = (clientX - drag.startX) / displayW;
      const dy = (clientY - drag.startY) / displayH;
      const bypassSnap = altKey;

      if (drag.kind === "move") {
        let newX = Math.max(-0.5, Math.min(1, drag.origX + dx));
        let newY = Math.max(-0.5, Math.min(1, drag.origY + dy));

        let guides: SnapGuide[] = [];
        if (!bypassSnap) {
          const thresholdX = 8 / displayW; // 8px snap threshold
          const thresholdY = 8 / displayH;
          const dragEl = elements.find((el) => el.id === drag.id);
          if (dragEl) {
            const snapResult = getSnapPositions(
              drag.id,
              newX,
              newY,
              dragEl.width,
              dragEl.height,
              elements,
              thresholdX,
              thresholdY
            );
            newX = snapResult.x;
            newY = snapResult.y;
            guides = snapResult.guides;
          }
        }
        setActiveGuides(guides);
        updateElement(drag.id, { x: newX, y: newY });
      } else if (drag.kind === "resize") {
        let { origX: x, origY: y, origW: w, origH: h } = drag;
        const h_direction = drag.handle.includes("e") ? 1 : drag.handle.includes("w") ? -1 : 0;
        const v_direction = drag.handle.includes("s") ? 1 : drag.handle.includes("n") ? -1 : 0;
        if (h_direction !== 0) w = Math.max(0.05, drag.origW + h_direction * dx);
        if (v_direction !== 0) h = Math.max(0.05, drag.origH + v_direction * dy);
        // للحفاظ على الموضع عند التمدد لليسار/الأعلى
        if (h_direction === -1) x = drag.origX + (drag.origW - w);
        if (v_direction === -1) y = drag.origY + (drag.origH - h);

        let guides: SnapGuide[] = [];
        if (!bypassSnap) {
          const thresholdX = 8 / displayW;
          const thresholdY = 8 / displayH;
          const snapResult = getSnapPositions(
            drag.id,
            x,
            y,
            w,
            h,
            elements,
            thresholdX,
            thresholdY,
            drag.handle
          );
          x = snapResult.x;
          y = snapResult.y;
          w = snapResult.w;
          h = snapResult.h;
          guides = snapResult.guides;
        }
        setActiveGuides(guides);
        updateElement(drag.id, { x, y, width: w, height: h });
      }
    });
  };

  const handlePointerUp = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (drag) {
      pushHistory();
      setDrag(null);
      setActiveGuides([]);
    }
  };

  // النقر المزدوج لاستبدال الصورة
  const handleDoubleClick = async (el: CanvasElement) => {
    if (printMode) return;
    if (el.type === "image") {
      try {
        const b64 = await OpenFile();
        if (b64) {
          updateElement(el.id, { imageSrc: b64 });
          pushHistory();
        }
      } catch (err) {
        console.error("Open file error:", err);
      }
    }
  };

  // النقر على الخلية (للكولاج)
  const handleSlotClick = async (slotId: string) => {
    if (printMode) return;
    selectElement(slotId);
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    if (!slot.imageSrc) {
      try {
        const b64 = await OpenFile();
        if (b64) {
          setSlotImage(slotId, b64);
        }
      } catch (err) {
        console.error("Open file error:", err);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    // استخدام Wails OpenFile بدلاً من FileReader لتوحيد مصدر الصور (مسارات محلية)
    try {
      const src = await OpenFile();
      if (!src) return;
      if (mode === "collage") {
        const slotId = (e.target as HTMLElement).closest("[data-slot-id]")?.getAttribute("data-slot-id");
        if (slotId) {
          setSlotImage(slotId, src);
        } else {
          const emptySlot = slots.find((s) => !s.imageSrc);
          if (emptySlot) {
            setSlotImage(emptySlot.id, src);
          } else if (slots[0]) {
            setSlotImage(slots[0].id, src);
          }
        }
      } else {
        addImageElement(src);
      }
    } catch (err) {
      console.error("Drop open file error:", err);
    }
  };

  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements]
  );

  return (
    <div
      ref={(node) => {
        (containerRef as any).current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as any).current = node;
      }}
      className="relative flex items-center justify-center w-full h-full overflow-hidden p-4 workspace-grid bg-muted/40"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={(e) => {
        if (e.target === e.currentTarget) selectElement(null);
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        ref={innerRef}
        id="canvas-area"
        className="relative shadow-2xl ring-1 ring-black/10 overflow-hidden"
        style={{
          width: displayW,
          height: displayH,
          backgroundColor,
          backgroundImage:
            backgroundColor === "transparent"
              ? undefined
              : undefined,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) selectElement(null);
        }}
      >
        {/* وضع الكولاج: عرض الخلايا */}
        {mode === "collage" && (
          <>
            {slots.map((slot) => {
              // حساب إحداثيات الخلايا بالبكسل مع الهوامش والمسافات والحدود والزوايا
              const scale = displayW / 1200;
              const margin = collageMargin * scale;
              const gap = collageGap * scale;
              const radius = collageRadius * scale;
              const borderW = collageStrokeWidth * scale;

              const availW = displayW - 2 * margin;
              const availH = displayH - 2 * margin;

              const left = margin + slot.x * availW + gap / 2;
              const top = margin + slot.y * availH + gap / 2;
              const width = slot.w * availW - gap;
              const height = slot.h * availH - gap;

              return (
                <React.Fragment key={slot.id}>
                  {/* خطوط القص بين الصور */}
                  {collageShowCutLines && (
                    <div
                      className="absolute border border-dashed border-muted-foreground/35 pointer-events-none z-5"
                      style={{
                        left: `${left - gap / 2}px`,
                        top: `${top - gap / 2}px`,
                        width: `${width + gap}px`,
                        height: `${height + gap}px`,
                      }}
                    />
                  )}
                  <div
                    data-slot-id={slot.id}
                    className={`absolute overflow-hidden cursor-pointer transition-all ${
                      selectedId === slot.id
                        ? "ring-2 ring-primary z-20"
                        : "ring-1 ring-black/10 z-10"
                    }`}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                      borderRadius: `${radius}px`,
                      border: borderW > 0 ? `${borderW}px solid ${collageStrokeColor}` : undefined,
                      backgroundColor: slot.imageSrc ? undefined : "var(--muted)",
                    }}
                    onClick={() => handleSlotClick(slot.id)}
                  >
                    {slot.imageSrc ? (
                      <>
                        <img
                          src={slot.imageSrc}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ filter: buildCSSFilter(slot) }}
                          draggable={false}
                        />
                        {!printMode && (
                          <button
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 z-30"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSlot(slot.id, { imageSrc: undefined });
                            }}
                            title="إزالة"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!printMode && (
                          <button
                            className="absolute top-1 left-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 z-30"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const src = await OpenFile();
                                if (src) {
                                  setSlotImage(slot.id, src);
                                }
                              } catch (err) {
                                console.error("Replace image error:", err);
                              }
                            }}
                            title="استبدال"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <svg className="w-8 h-8 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 7h18M3 12h18M3 17h18" />
                        </svg>
                        <span className="text-xs">انقر للإضافة</span>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
            {/* إطار الكانفس المخطط */}
            {!printMode && (
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-primary/30" />
            )}
          </>
        )}

        {/* العناصر: صور ونصوص وأشكال باستخدام Konva */}
        {mode === "single" && elements.length > 0 && (
          <KonvaCanvas
            displayW={displayW}
            displayH={displayH}
            sortedElements={sortedElements}
            handleDoubleClick={handleDoubleClick}
          />
        )}

        {/* وضع فارغ: رسالة ترحيب */}
        {mode === "single" && elements.length === 0 && !printMode && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
            <svg className="w-16 h-16 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <p className="text-sm">اختر قالباً من القائمة الجانبية أو أضف صورة للبدء</p>
          </div>
        )}

        {/* خطوط الإرشاد والمحاذاة المغناطيسية */}
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
              borderColor: "#ec4899", // لون زهري لامع لرؤية ممتازة
            }}
          />
        ))}
      </div>
    </div>
  );
});
