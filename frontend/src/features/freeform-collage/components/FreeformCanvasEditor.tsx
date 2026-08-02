import React, { useRef, useCallback, useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import type { FreeformSlot, SnapLine } from "../types";
import { resizeSlot, moveSlot, type ResizeHandle } from "../lib/freeform-math";

interface FreeformCanvasEditorProps {
  paperWidthMM: number;
  paperHeightMM: number;
  slots: FreeformSlot[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string | null) => void;
  onSlotsChange: (slots: FreeformSlot[]) => void;
  onDragStart?: () => void;
  onDragEnd?: (slots: FreeformSlot[]) => void;
}

const BORDER_BY_HANDLE: Record<ResizeHandle, React.CSSProperties> = {
  n: { cursor: "ns-resize" },
  s: { cursor: "ns-resize" },
  e: { cursor: "ew-resize" },
  w: { cursor: "ew-resize" },
  ne: { cursor: "nesw-resize" },
  sw: { cursor: "nesw-resize" },
  nw: { cursor: "nwse-resize" },
  se: { cursor: "nwse-resize" },
};

const HANDLES: { dir: ResizeHandle; pos: React.CSSProperties }[] = [
  { dir: "n", pos: { left: "50%", top: 0, transform: "translate(-50%,-50%)" } },
  { dir: "s", pos: { left: "50%", bottom: 0, transform: "translate(-50%,50%)" } },
  { dir: "e", pos: { right: 0, top: "50%", transform: "translate(50%,-50%)" } },
  { dir: "w", pos: { left: 0, top: "50%", transform: "translate(-50%,-50%)" } },
  { dir: "ne", pos: { right: 0, top: 0, transform: "translate(50%,-50%)" } },
  { dir: "nw", pos: { left: 0, top: 0, transform: "translate(-50%,-50%)" } },
  { dir: "se", pos: { right: 0, bottom: 0, transform: "translate(50%,50%)" } },
  { dir: "sw", pos: { left: 0, bottom: 0, transform: "translate(-50%,50%)" } },
];

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
  /** عنصر الالتقاط — لازم يكون نفسه عند الإفلات وإلا يرمي InvalidPointerId */
  captureEl: HTMLElement | null;
}

interface SlotCellProps {
  slot: FreeformSlot;
  index: number;
  isSelected: boolean;
  paperWidthMM: number;
  paperHeightMM: number;
  onBodyPointerDown: (e: React.PointerEvent, slotId: string) => void;
  onHandlePointerDown: (e: React.PointerEvent, slotId: string, handle: ResizeHandle) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onKeyDown: (e: React.KeyboardEvent, slotId: string) => void;
}

const FreeformSlotCell = memo(function FreeformSlotCell({
  slot,
  index,
  isSelected,
  paperWidthMM,
  paperHeightMM,
  onBodyPointerDown,
  onHandlePointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
}: SlotCellProps) {
  const slotWidthMM = Math.round(slot.w * paperWidthMM);
  const slotHeightMM = Math.round(slot.h * paperHeightMM);

  return (
    <div
      data-slot-id={slot.id}
      role="button"
      tabIndex={0}
      onPointerDown={(e) => onBodyPointerDown(e, slot.id)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => onKeyDown(e, slot.id)}
      className={cn(
        "absolute border transition-[background-color,border-color,box-shadow] cursor-move flex flex-col items-center justify-center group select-none overflow-hidden touch-none p-1",
        isSelected
          ? "border-2 border-primary bg-primary/20 ring-2 ring-primary/40 z-20 shadow-lg text-primary"
          : "border-slate-300 dark:border-zinc-700 bg-slate-100/90 dark:bg-zinc-800/90 hover:bg-slate-200/90 dark:hover:bg-zinc-800 text-foreground/90 z-10"
      )}
      style={{
        left: `${slot.x * 100}%`,
        top: `${slot.y * 100}%`,
        width: `${slot.w * 100}%`,
        height: `${slot.h * 100}%`,
      }}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shadow-xs mb-0.5 shrink-0 pointer-events-none",
          isSelected ? "bg-primary text-primary-foreground" : "bg-slate-700 text-white dark:bg-zinc-600"
        )}
      >
        {index + 1}
      </div>

      <span className={cn(
        "text-[9.5px] font-bold truncate max-w-[90%] leading-tight pointer-events-none text-center",
        isSelected ? "text-primary font-black" : "text-foreground/90"
      )}>
        {slot.label || `خلية ${index + 1}`}
      </span>

      <span className="text-[8px] font-mono font-extrabold opacity-75 leading-tight pointer-events-none mt-0.5" dir="ltr">
        {slotWidthMM}×{slotHeightMM} mm
      </span>

      {isSelected &&
        HANDLES.map(({ dir, pos }) => (
          <div
            key={dir}
            onPointerDown={(e) => onHandlePointerDown(e, slot.id, dir)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            className="absolute w-2.5 h-2.5 bg-primary border-2 border-white dark:border-zinc-900 rounded-xs shadow-sm hover:scale-125 transition-transform touch-none z-40"
            style={{ ...pos, ...BORDER_BY_HANDLE[dir] }}
          />
        ))}
    </div>
  );
});

export const FreeformCanvasEditor: React.FC<FreeformCanvasEditorProps> = memo(function FreeformCanvasEditor({
  paperWidthMM,
  paperHeightMM,
  slots,
  selectedSlotId,
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
        next = resizeSlot(st.origSlots, st.slotId, st.handle, dx, dy);
      } else if (st.mode === "move") {
        const res = moveSlot(st.origSlots, st.slotId, dx, dy);
        next = res.slots;
        snapLines = res.snapLines;
      }

      st.lastSlots = next;
      st.hasMoved = true;
      st.pendingFrame = false;
      onSlotsChange(next);
      if (mountedRef.current) setActiveSnapLines(snapLines);
    },
    [onSlotsChange]
  );

  // تنظيف مؤقت الإطارات عند إلغاء التركيب لمنع setState بعد الإزالة
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

      // الإفلات يجب أن يتم على عنصر الالتقاط نفسه وإلا يرمي InvalidPointerId
      const captureEl = st.captureEl;
      st.captureEl = null;
      if (captureEl) {
        try {
          captureEl.releasePointerCapture?.(e.pointerId);
        } catch (err) {
          void err;
        }
      }

      // تصفية آخر إطار معلّق حتى لا تضيع آخر حركة قبل رفع المؤشر
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

  return (
    <div className="w-full flex items-center justify-center bg-muted/20 dark:bg-zinc-950/60 rounded-2xl relative flex-1 min-h-0 overflow-hidden p-1.5 border border-border/40">
      <div
        ref={paperRef}
        className="relative bg-white dark:bg-zinc-900 border-2 border-slate-300 dark:border-zinc-700/80 shadow-2xl rounded-lg transition-colors overflow-hidden touch-none"
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
        {/* خطوط الشبكة المساعدة */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_0.6px,transparent_0.6px)] dark:bg-[radial-gradient(#444_0.6px,transparent_0.6px)] [background-size:14px_14px] opacity-40 pointer-events-none" />

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

        {/* شارة أبعاد الورقة */}
        <div className="absolute bottom-1.5 left-1.5 bg-slate-900/90 dark:bg-zinc-800/90 text-white text-[9px] px-2 py-0.5 rounded-md font-mono z-30 pointer-events-none tracking-wide shadow-xs border border-white/10" dir="ltr">
          {paperWidthMM} × {paperHeightMM} mm
        </div>

        {/* خلايا الكولاج التفاعلية */}
        {slots.map((slot, index) => (
          <FreeformSlotCell
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
