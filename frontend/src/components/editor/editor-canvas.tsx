"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { IMAGE_FILTERS } from "@/lib/templates";
import { X, RefreshCw } from "lucide-react";
import { OpenFile } from "../../../wailsjs/go/main/App";

// حساب مرشح CSS لعنصر
function getFilterCSS(el: CanvasElement): string {
  const parts: string[] = [];
  const filterDef = IMAGE_FILTERS.find((f) => f.id === el.filter);
  if (filterDef && filterDef.css) parts.push(filterDef.css);
  if (el.brightness !== undefined && el.brightness !== 100)
    parts.push(`brightness(${el.brightness}%)`);
  if (el.contrast !== undefined && el.contrast !== 100)
    parts.push(`contrast(${el.contrast}%)`);
  if (el.saturation !== undefined && el.saturation !== 100)
    parts.push(`saturate(${el.saturation}%)`);
  if (el.blur && el.blur > 0) parts.push(`blur(${el.blur}px)`);
  return parts.join(" ");
}

function getSlotFilterCSS(slot: {
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}): string {
  const parts: string[] = [];
  const filterDef = IMAGE_FILTERS.find((f) => f.id === slot.filter);
  if (filterDef && filterDef.css) parts.push(filterDef.css);
  if (slot.brightness !== undefined && slot.brightness !== 100)
    parts.push(`brightness(${slot.brightness}%)`);
  if (slot.contrast !== undefined && slot.contrast !== 100)
    parts.push(`contrast(${slot.contrast}%)`);
  if (slot.saturation !== undefined && slot.saturation !== 100)
    parts.push(`saturate(${slot.saturation}%)`);
  return parts.join(" ");
}

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
  } = useEditorStore();

  // قياس حجم الحاوية لتحجيم الكانفس
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
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
    const dx = (e.clientX - drag.startX) / displayW;
    const dy = (e.clientY - drag.startY) / displayH;
    if (drag.kind === "move") {
      const newX = Math.max(-0.5, Math.min(1, drag.origX + dx));
      const newY = Math.max(-0.5, Math.min(1, drag.origY + dy));
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
      updateElement(drag.id, { x, y, width: w, height: h });
    }
  };

  const handlePointerUp = () => {
    if (drag) {
      pushHistory();
      setDrag(null);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (mode === "collage") {
        const slotId = (e.target as HTMLElement).closest("[data-slot-id]")?.getAttribute("data-slot-id");
        if (slotId) {
          setSlotImage(slotId, reader.result as string);
        } else {
          const emptySlot = slots.find((s) => !s.imageSrc);
          if (emptySlot) {
            setSlotImage(emptySlot.id, reader.result as string);
          } else if (slots[0]) {
            setSlotImage(slots[0].id, reader.result as string);
          }
        }
      } else {
        addImageElement(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const sortedElements = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={(node) => {
        (containerRef as any).current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as any).current = node;
      }}
      className="relative flex items-center justify-center w-full h-full overflow-hidden p-4"
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
            {slots.map((slot) => (
              <div
                key={slot.id}
                data-slot-id={slot.id}
                className={`absolute overflow-hidden cursor-pointer transition-all ${
                  selectedId === slot.id
                    ? "ring-2 ring-primary z-20"
                    : "ring-1 ring-black/10 z-10"
                }`}
                style={{
                  left: `${slot.x * 100}%`,
                  top: `${slot.y * 100}%`,
                  width: `${slot.w * 100}%`,
                  height: `${slot.h * 100}%`,
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
                      style={{ filter: getSlotFilterCSS(slot) }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.onchange = (ev) => {
                            const file = (ev.target as HTMLInputElement).files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              setSlotImage(slot.id, reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          };
                          input.click();
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
            ))}
            {/* خطوط فاصلة للكولاج */}
            {!printMode && (
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-primary/30" />
            )}
          </>
        )}

        {/* العناصر: صور ونصوص وأشكال */}
        {mode === "single" &&
          sortedElements.map((el) => (
            <div
              key={el.id}
              className={`absolute cursor-move ${
                selectedId === el.id
                  ? "ring-2 ring-primary"
                  : "ring-1 ring-transparent hover:ring-primary/40"
              }`}
              style={{
                left: `${el.x * 100}%`,
                top: `${el.y * 100}%`,
                width: `${el.width * 100}%`,
                height: `${el.height * 100}%`,
                transform: `rotate(${el.rotation}deg)`,
                opacity: el.opacity,
                zIndex: el.zIndex,
              }}
              onPointerDown={(e) => handlePointerDown(e, el)}
              onDoubleClick={() => handleDoubleClick(el)}
            >
              {el.type === "image" && el.imageSrc && (
                <img
                  src={el.imageSrc}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none select-none"
                  style={{ filter: getFilterCSS(el) }}
                  draggable={false}
                />
              )}
              {el.type === "text" && (
                <div
                  className="w-full h-full flex items-center justify-center overflow-hidden"
                  style={{
                    color: el.color,
                    fontSize: `calc(${el.fontSize}px * ${displayW / 600})`,
                    fontWeight: el.fontWeight,
                    fontFamily: el.fontFamily,
                    textAlign: el.textAlign,
                    direction: "rtl",
                    lineHeight: 1.2,
                  }}
                >
                  {el.text || ""}
                </div>
              )}
              {el.type === "shape" && (
                <svg
                  className="w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {el.shape === "rect" && (
                    <rect
                      x="0"
                      y="0"
                      width="100"
                      height="100"
                      rx={el.radius}
                      fill={el.fill}
                      stroke={el.strokeWidth ? el.stroke : "none"}
                      strokeWidth={el.strokeWidth}
                    />
                  )}
                  {el.shape === "ellipse" && (
                    <ellipse
                      cx="50"
                      cy="50"
                      rx="50"
                      ry="50"
                      fill={el.fill}
                      stroke={el.strokeWidth ? el.stroke : "none"}
                      strokeWidth={el.strokeWidth}
                    />
                  )}
                  {el.shape === "line" && (
                    <line
                      x1="0"
                      y1="50"
                      x2="100"
                      y2="50"
                      stroke={el.fill}
                      strokeWidth={Math.max(1, el.strokeWidth || 4)}
                    />
                  )}
                  {el.shape === "star" && (
                    <polygon
                      points="50,5 61,38 95,38 67,58 78,91 50,70 22,91 33,58 5,38 39,38"
                      fill={el.fill}
                      stroke={el.strokeWidth ? el.stroke : "none"}
                      strokeWidth={el.strokeWidth}
                    />
                  )}
                </svg>
              )}

              {/* مقابض التحجيم */}
              {selectedId === el.id && !printMode && (
                <>
                  {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((h) => {
                    const pos: Record<string, React.CSSProperties> = {
                      nw: { top: "-6px", left: "-6px", cursor: "nw-resize" },
                      n: { top: "-6px", left: "calc(50% - 6px)", cursor: "n-resize" },
                      ne: { top: "-6px", right: "-6px", cursor: "ne-resize" },
                      e: { top: "calc(50% - 6px)", right: "-6px", cursor: "e-resize" },
                      se: { bottom: "-6px", right: "-6px", cursor: "se-resize" },
                      s: { bottom: "-6px", left: "calc(50% - 6px)", cursor: "s-resize" },
                      sw: { bottom: "-6px", left: "-6px", cursor: "sw-resize" },
                      w: { top: "calc(50% - 6px)", left: "-6px", cursor: "w-resize" },
                    };
                    return (
                      <div
                        key={h}
                        className="absolute w-3 h-3 bg-primary border-2 border-white rounded-sm shadow-md"
                        style={pos[h]}
                        onPointerDown={(e) => handleResizeStart(e, el, h)}
                      />
                    );
                  })}
                </>
              )}
            </div>
          ))}

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
      </div>
    </div>
  );
});
