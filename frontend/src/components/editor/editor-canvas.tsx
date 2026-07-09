import React, { useRef, useState, useEffect, useMemo } from "react";
import { useEditorStore, CanvasElement } from "@/lib/editor-store";
import { X, RefreshCw } from "lucide-react";
import { OpenFile, SaveImageFromBase64 } from "../../../wailsjs/go/main/App";
import { SnapGuide } from "@/lib/snap-utils";
import { KonvaCanvas } from "./konva/konva-canvas";
import { useShallow } from "zustand/react/shallow";
import { HorizontalRuler, VerticalRuler } from "./ruler";

export const EditorCanvas = React.forwardRef<
  HTMLDivElement,
  { printMode?: boolean }
>(function EditorCanvas({ printMode = false }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 600, h: 800 });
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const {
    mode,
    elements,
    slots,
    selectedId,
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
    template,
    printSettings,
    showRuler,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    elements: state.elements,
    slots: state.slots,
    selectedId: state.selectedId,
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
    template: state.template,
    printSettings: state.printSettings,
    showRuler: state.showRuler,
  })));

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

  // حساب الأبعاد الفيزيائية بالمليمتر
  const widthMM = useMemo(() => {
    if (template) return template.widthMM;
    return (canvasWidth / (printSettings?.dpi || 300)) * 25.4;
  }, [template, canvasWidth, printSettings]);

  const heightMM = useMemo(() => {
    if (template) return template.heightMM;
    return (canvasHeight / (printSettings?.dpi || 300)) * 25.4;
  }, [template, canvasHeight, printSettings]);

  // تتبع الفأرة بالنسبة للكانفاس
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (printMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCanvasMouseLeave = () => {
    setCursorPos(null);
  };

  // النقر المزدوج لاستبدال الصورة أو تعديل النص
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
    } else if (el.type === "text") {
      setEditingTextId(el.id);
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
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    try {
      // قراءة الملف المسحوب وتحويله إلى Base64
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      // حفظ الصورة محلياً في مجلد Media (نفس آلية OpenFile)
      const src = await SaveImageFromBase64(dataUrl);
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
        const img = new Image();
        img.onload = () => {
          const aspect = img.width / img.height;
          addImageElement(src, aspect);
        };
        img.onerror = () => {
          console.warn("Failed to load dropped image for aspect ratio, using default 1:1");
          addImageElement(src, 1);
        };
        img.src = src;
      }
    } catch (err) {
      console.error("Drop file error:", err);
    }
  };

  const sortedElements = useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements]
  );

  const canvasArea = (
    <div
      ref={innerRef}
      id="canvas-area"
      className="relative rounded-sm overflow-hidden border border-white/5 transition-all duration-300 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55)] hover:shadow-[0_30px_70px_-10px_rgba(0,0,0,0.7)]"
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
      {/* Render KonvaCanvas for collage or single modes */}
      {(mode === "collage" || (mode === "single" && elements.length > 0)) && (
        <KonvaCanvas
          displayW={displayW}
          displayH={displayH}
          sortedElements={sortedElements}
          handleDoubleClick={handleDoubleClick}
          setActiveGuides={setActiveGuides}
          handleSlotClick={handleSlotClick}
        />
      )}

      {/* Overlay buttons for Selected Slot in Collage mode */}
      {mode === "collage" && !printMode && (() => {
        const selectedSlot = slots.find((s) => s.id === selectedId);
        if (!selectedSlot || !selectedSlot.imageSrc) return null;

        const scale = displayW / canvasWidth;
        const margin = collageMargin * scale;
        const gap = collageGap * scale;

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
                try {
                  const src = await OpenFile();
                  if (src) {
                    setSlotImage(selectedSlot.id, src);
                  }
                } catch (err) {
                  console.error("Replace image error:", err);
                }
              }}
              title="استبدال"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

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

      {/* التعديل المباشر للنصوص (In-place Text Editing) */}
      {!printMode && editingTextId && (() => {
        const textEl = elements.find(e => e.id === editingTextId);
        if (!textEl || textEl.type !== "text") return null;

        return (
          <textarea
            autoFocus
            className="absolute z-50 bg-transparent resize-none outline-none border-2 border-primary ring-0 m-0 p-0"
            style={{
              left: `${textEl.x * displayW}px`,
              top: `${textEl.y * displayH}px`,
              width: `${textEl.width * displayW}px`,
              height: `${textEl.height * displayH}px`,
              transform: `rotate(${textEl.rotation || 0}deg)`,
              transformOrigin: "top left",
              fontSize: `${(textEl.fontSize || 20) * Math.min(displayW / canvasWidth, displayH / canvasHeight)}px`,
              fontFamily: textEl.fontFamily || "Arial",
              fontWeight: textEl.fontWeight || 400,
              color: textEl.color || "#000000",
              textAlign: textEl.textAlign || "center",
              lineHeight: textEl.lineHeight || 1.2,
              letterSpacing: `${textEl.letterSpacing || 0}px`,
              padding: "2px", // للتعويض البصري البسيط عن حدود Canvas
            }}
            defaultValue={textEl.text}
            onFocus={(e) => {
              e.target.select();
            }}
            onBlur={(e) => {
              updateElement(textEl.id, { text: e.target.value });
              pushHistory();
              setEditingTextId(null);
            }}
            onKeyDown={(e) => {
              // حفظ عند ضغط Enter (بدون Shift)
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                updateElement(textEl.id, { text: e.currentTarget.value });
                pushHistory();
                setEditingTextId(null);
              }
              // الخروج بدون حفظ عند ضغط Escape
              if (e.key === "Escape") {
                e.preventDefault();
                setEditingTextId(null);
              }
            }}
          />
        );
      })()}
    </div>
  );

  return (
    <div
      ref={(node) => {
        (containerRef as any).current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as any).current = node;
      }}
      className="absolute inset-0 flex items-center justify-center overflow-hidden p-4 workspace-grid bg-muted/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) selectElement(null);
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {showRuler && !printMode ? (
        <div className="relative flex flex-col items-start select-none">
          {/* Top Row: Unit corner + Horizontal Ruler */}
          <div className="flex flex-row items-end">
            <div className="w-6 h-6 bg-card border-b border-l border-border flex items-center justify-center text-[9px] text-muted-foreground/75 font-mono select-none">
              mm
            </div>
            <HorizontalRuler 
              width={displayW} 
              mmWidth={widthMM} 
              cursorX={cursorPos ? cursorPos.x : null} 
            />
          </div>

          {/* Bottom Row: Vertical Ruler + Canvas area */}
          <div className="flex flex-row items-start">
            <VerticalRuler 
              height={displayH} 
              mmHeight={heightMM} 
              cursorY={cursorPos ? cursorPos.y : null} 
            />
            {canvasArea}
          </div>
        </div>
      ) : (
        canvasArea
      )}
    </div>
  );
});
