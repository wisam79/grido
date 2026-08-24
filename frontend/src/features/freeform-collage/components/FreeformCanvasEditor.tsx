import React, { useRef, useCallback, useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import type { FreeformSlot, SnapLine } from "../types";
import { resizeSlot, moveSlot, type ResizeHandle } from "../lib/freeform-math";
import { FreeformSlotCard } from "./FreeformSlotCard";

interface FreeformCanvasEditorProps {
  paperWidthMM: number;
  paperHeightMM: number;
  slots: FreeformSlot[];
  selectedSlotId: string | null;
  showCutLines?: boolean;
  enableSnapping?: boolean;
  onSelectSlot: (slotId: string | null) => void;
  onSlotsChange: (slots: FreeformSlot[]) => void;
  onDragStart?: () => void;
  onDragEnd?: (slots: FreeformSlot[]) => void;
}

interface DragState {
  mode: "resize" | "move";
  handle?: ResizeHandle;
  slotId: string;
  startClientX: number;
  startClientY: number;
  lastClientX: number;
  lastClientY: number;
  paperW: number;
  paperH: number;
  origSlots: FreeformSlot[];
  lastSlots: FreeformSlot[];
  hasMoved: boolean;
  pendingFrame: boolean;
  captureEl: HTMLElement | null;
}

export const FreeformCanvasEditor: React.FC<FreeformCanvasEditorProps> = memo(function FreeformCanvasEditor({
  paperWidthMM,
  paperHeightMM,
  slots,
  selectedSlotId,
  showCutLines = false,
  enableSnapping = true,
  onSelectSlot,
  onSlotsChange,
  onDragStart,
  onDragEnd,
}) {
  const paperRef = useRef<HTMLDivElement>(null);
  const [activeSnapLines, setActiveSnapLines] = useState<SnapLine[]>([]);
  const rafId = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const dragState = useRef<DragState | null>(null);

  const paperAspect = paperWidthMM / paperHeightMM;

  const applyDrag = useCallback(
    (st: DragState, clientX: number, clientY: number) => {
      const dx = (clientX - st.startClientX) / st.paperW;
      const dy = (clientY - st.startClientY) / st.paperH;

      let next: FreeformSlot[] = st.origSlots;
      let snapLines: SnapLine[] = [];

      if (st.mode === "resize" && st.handle) {
        const targetSlot = st.origSlots.find((s) => s.id === st.slotId);
        const aspect = targetSlot?.lockAspect && targetSlot.w > 0
          ? (targetSlot.w * paperWidthMM) / (targetSlot.h * paperHeightMM)
          : undefined;

        next = resizeSlot(st.origSlots, st.slotId, st.handle, dx, dy, aspect);
      } else if (st.mode === "move") {
        if (enableSnapping) {
          const res = moveSlot(st.origSlots, st.slotId, dx, dy);
          next = res.slots;
          snapLines = res.snapLines;
        } else {
          const idx = st.origSlots.findIndex((s) => s.id === st.slotId);
          if (idx !== -1) {
            const s = st.origSlots[idx];
            const nx = Math.min(1 - s.w, Math.max(0, s.x + dx));
            const ny = Math.min(1 - s.h, Math.max(0, s.y + dy));
            next = st.origSlots.map((item, i) => (i === idx ? { ...item, x: nx, y: ny } : item));
          }
        }
      }

      st.lastSlots = next;
      st.hasMoved = true;
      st.pendingFrame = false;
      onSlotsChange(next);
      if (mountedRef.current) setActiveSnapLines(snapLines);
    },
    [onSlotsChange, enableSnapping, paperWidthMM, paperHeightMM]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, []);

  const beginDrag = useCallback(
    (mode: "resize" | "move", slotId: string, handle: ResizeHandle | undefined, e: React.PointerEvent, captureEl: HTMLElement | null) => {
      const paper = paperRef.current;
      if (!paper) return;
      const rect = paper.getBoundingClientRect();
      dragState.current = {
        mode,
        handle,
        slotId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        lastClientX: e.clientX,
        lastClientY: e.clientY,
        paperW: rect.width,
        paperH: rect.height,
        origSlots: slots,
        lastSlots: slots,
        hasMoved: false,
        pendingFrame: false,
        captureEl,
      };
      onDragStart?.();
      try {
        captureEl?.setPointerCapture?.(e.pointerId);
      } catch {
        dragState.current.captureEl = null;
      }
    },
    [slots, onDragStart]
  );

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent, slotId: string, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();
      beginDrag("resize", slotId, handle, e, e.currentTarget as HTMLElement);
    },
    [beginDrag]
  );

  const onBodyPointerDown = useCallback(
    (e: React.PointerEvent, slotId: string) => {
      onSelectSlot(slotId);
      e.stopPropagation();
      beginDrag("move", slotId, undefined, e, e.currentTarget as HTMLElement);
    },
    [onSelectSlot, beginDrag]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const st = dragState.current;
      if (!st) return;

      st.lastClientX = e.clientX;
      st.lastClientY = e.clientY;
      st.pendingFrame = true;

      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        const current = dragState.current;
        if (!current || !current.pendingFrame) return;
        applyDrag(current, current.lastClientX, current.lastClientY);
      });
    },
    [applyDrag]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }

      const st = dragState.current;
      if (!st) return;

      const captureEl = st.captureEl;
      st.captureEl = null;
      if (captureEl) {
        try {
          captureEl.releasePointerCapture?.(e.pointerId);
        } catch {
          // ignore
        }
      }

      if (st.pendingFrame) {
        applyDrag(st, st.lastClientX, st.lastClientY);
      }

      if (st.hasMoved) {
        onDragEnd?.(st.lastSlots);
      }
      dragState.current = null;
      if (mountedRef.current) setActiveSnapLines([]);
    },
    [applyDrag, onDragEnd]
  );

  const onPaperPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (dragState.current) return;
      onSelectSlot(null);
      e.stopPropagation();
    },
    [onSelectSlot]
  );

  const onCellKeyDown = useCallback(
    (e: React.KeyboardEvent, slotId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectSlot(slotId);
      }
    },
    [onSelectSlot]
  );

  // استخراج خطوط القص الفريدة بين الخلايا
  const cutLinesHorizontal = Array.from(
    new Set(slots.flatMap((s) => [s.y, s.y + s.h]))
  ).filter((pos) => pos > 0.005 && pos < 0.995);

  const cutLinesVertical = Array.from(
    new Set(slots.flatMap((s) => [s.x, s.x + s.w]))
  ).filter((pos) => pos > 0.005 && pos < 0.995);

  return (
    <div className="w-full flex items-center justify-center bg-muted/20 dark:bg-zinc-950/60 rounded-2xl relative flex-1 min-h-0 overflow-hidden p-2 border border-border/40 font-cairo select-none">
      <div
        ref={paperRef}
        className="relative bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700/80 shadow-md shadow-black/15 rounded-lg transition-colors overflow-hidden touch-none"
        style={{
          width: paperAspect >= 1 ? "98%" : "auto",
          height: paperAspect < 1 ? "98%" : "auto",
          maxWidth: "100%",
          maxHeight: "100%",
          aspectRatio: `${paperWidthMM} / ${paperHeightMM}`,
        }}
        onPointerDown={onPaperPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* خطوط الشبكة المساعدة الخفيفة */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_0.6px,transparent_0.6px)] dark:bg-[radial-gradient(#444_0.6px,transparent_0.6px)] [background-size:14px_14px] opacity-40 pointer-events-none" />

        {/* خطوط القص الإرشادية عند التفعيل */}
        {showCutLines && (
          <div className="absolute inset-0 pointer-events-none z-25 opacity-70">
            {cutLinesHorizontal.map((pos, i) => (
              <div
                key={`cut-h-${i}`}
                className="absolute left-0 right-0 border-t border-dashed border-red-500/80"
                style={{ top: `${pos * 100}%` }}
              />
            ))}
            {cutLinesVertical.map((pos, i) => (
              <div
                key={`cut-v-${i}`}
                className="absolute top-0 bottom-0 border-l border-dashed border-red-500/80"
                style={{ left: `${pos * 100}%` }}
              />
            ))}
          </div>
        )}

        {/* خطوط المحاذاة الذكية الإرشادية */}
        {activeSnapLines.map((line) => (
          <div
            key={line.id}
            className={cn(
              "absolute bg-pink-500 dark:bg-pink-400 z-30 pointer-events-none shadow-xs transition-opacity duration-75",
              line.axis === "x" ? "w-0.5 top-0 bottom-0" : "h-0.5 left-0 right-0"
            )}
            style={{
              [line.axis === "x" ? "left" : "top"]: `${line.position * 100}%`,
            }}
          />
        ))}

        {/* شارة أبعاد الورقة المليمترية مع عدد الخلايا */}
        <div className="absolute bottom-1.5 left-1.5 bg-slate-900/90 dark:bg-zinc-800/90 text-white text-[9px] px-2 py-0.5 rounded-md font-mono z-30 pointer-events-none tracking-wide shadow-xs border border-white/10 flex items-center gap-1.5" dir="ltr">
          <span>{paperWidthMM} × {paperHeightMM} mm</span>
          <span className="opacity-40">|</span>
          <span>{slots.length} صور</span>
        </div>

        {/* بطاقات خلايا الكولاج التفاعلية */}
        {slots.map((slot, index) => (
          <FreeformSlotCard
            key={slot.id}
            slot={slot}
            index={index}
            isSelected={slot.id === selectedSlotId}
            paperWidthMM={paperWidthMM}
            paperHeightMM={paperHeightMM}
            onBodyPointerDown={onBodyPointerDown}
            onHandlePointerDown={onHandlePointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onCellKeyDown}
          />
        ))}
      </div>
    </div>
  );
});
