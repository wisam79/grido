import React, { useRef, useCallback, useState, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import type { FreeformSlot, SnapLine } from "../types";
import { resizeSlot, moveSlot, moveSlots, type ResizeHandle } from "../lib/freeform-math";
import { FreeformSlotCard } from "./FreeformSlotCard";

interface FreeformCanvasEditorProps {
  paperWidthMM: number;
  paperHeightMM: number;
  slots: FreeformSlot[];
  selectedSlotId: string | null;
  multiSelectedIds?: string[];
  showCutLines?: boolean;
  enableSnapping?: boolean;
  onSelectSlot: (slotId: string | null) => void;
  /** إضافة/إزالة خلية من التحديد المتعدد (Shift+Click) */
  onToggleMultiSelect?: (slotId: string) => void;
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
  multiSelectedIds = [],
  showCutLines = false,
  enableSnapping = true,
  onSelectSlot,
  onToggleMultiSelect,
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
        // سحب جماعي: الخلية الأساسية + التحديد المتعدد يتحركون ككتلة واحدة
        const groupIds = multiSelectedIds.length > 0 && multiSelectedIds.includes(st.slotId)
          ? [st.slotId, ...multiSelectedIds.filter((id) => id !== st.slotId)]
          : [st.slotId];

        if (enableSnapping) {
          const res = groupIds.length > 1
            ? moveSlots(st.origSlots, groupIds, dx, dy)
            : moveSlot(st.origSlots, st.slotId, dx, dy);
          next = res.slots;
          snapLines = res.snapLines;
        } else {
          const moveSet = new Set(groupIds);
          next = st.origSlots.map((item) => {
            if (!moveSet.has(item.id)) return item;
            const nx = Math.min(1 - item.w, Math.max(0, item.x + dx));
            const ny = Math.min(1 - item.h, Math.max(0, item.y + dy));
            return { ...item, x: nx, y: ny };
          });
        }
      }

      st.lastSlots = next;
      st.hasMoved = true;
      st.pendingFrame = false;
      onSlotsChange(next);
      if (mountedRef.current) setActiveSnapLines(snapLines);
    },
    [onSlotsChange, enableSnapping, paperWidthMM, paperHeightMM, multiSelectedIds]
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
      // Shift + نقرة = تبديل عضوية الخلية في التحديد المتعدد
      if (e.shiftKey && onToggleMultiSelect) {
        e.stopPropagation();
        e.preventDefault();
        onToggleMultiSelect(slotId);
        return;
      }
      onSelectSlot(slotId);
      e.stopPropagation();
      beginDrag("move", slotId, undefined, e, e.currentTarget as HTMLElement);
    },
    [onSelectSlot, onToggleMultiSelect, beginDrag]
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

  // 📊 نسبة استغلال مساحة الورقة (Coverage %) — كم من الورقة تغطيه الصور فعلياً
  const coverage = slots.length > 0
    ? Math.round(slots.reduce((acc, s) => acc + s.w * s.h, 0) * 100)
    : 0;

  // 📏 المؤشر الحي: أبعاد الخلية الأساسية بالمليمتر أثناء السحب أو التحجيم
  const isDragging = dragState.current !== null;
  const liveSlot = slots.find((s) => s.id === selectedSlotId);
  const liveBadge =
    isDragging && liveSlot
      ? `${Math.round(liveSlot.w * paperWidthMM * 10) / 10}×${Math.round(liveSlot.h * paperHeightMM * 10) / 10} مم @ ${Math.round(liveSlot.x * paperWidthMM * 10) / 10},${Math.round(liveSlot.y * paperHeightMM * 10) / 10}`
      : null;

  return (
    <div className="w-full flex items-center justify-center bg-muted/30 dark:bg-[#0a0e17] rounded-2xl relative flex-1 min-h-0 overflow-hidden p-3 border border-border/40 font-cairo select-none">
      {/* ظل خلفي ناعم يحاكي طاولة الاستوديو */}
      <div
        ref={paperRef}
        className="relative bg-white dark:bg-zinc-900 rounded-[6px] transition-shadow overflow-hidden touch-none"
        style={{
          width: paperAspect >= 1 ? "97%" : "auto",
          height: paperAspect < 1 ? "97%" : "auto",
          maxWidth: "100%",
          maxHeight: "100%",
          aspectRatio: `${paperWidthMM} / ${paperHeightMM}`,
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.08), 0 6.4px 14.4px 0 rgba(0,0,0,0.13), 0 1.2px 3.6px 0 rgba(0,0,0,0.10)",
        }}
        onPointerDown={onPaperPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* شبكة نقاط خفيفة جداً داخل الورقة */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(120,130,150,0.35)_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(rgba(255,255,255,0.12)_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        {/* خطوط القص الإرشادية عند التفعيل */}
        {showCutLines && (
          <div className="absolute inset-0 pointer-events-none z-25 opacity-60">
            {cutLinesHorizontal.map((pos, i) => (
              <div
                key={`cut-h-${i}`}
                className="absolute left-0 right-0 border-t border-dashed border-rose-500/70"
                style={{ top: `${pos * 100}%` }}
              />
            ))}
            {cutLinesVertical.map((pos, i) => (
              <div
                key={`cut-v-${i}`}
                className="absolute top-0 bottom-0 border-l border-dashed border-rose-500/70"
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
              "absolute bg-fuchsia-500 dark:bg-fuchsia-400 z-30 pointer-events-none transition-opacity duration-75",
              line.axis === "x" ? "w-px top-0 bottom-0" : "h-px left-0 right-0"
            )}
            style={{
              [line.axis === "x" ? "left" : "top"]: `${line.position * 100}%`,
            }}
          />
        ))}

        {/* شارة أبعاد الورقة المليمترية مع عدد الخلايا ونسبة الاستغلال */}
        <div className="absolute bottom-1.5 left-1.5 bg-foreground/85 backdrop-blur-sm text-background text-[9.5px] px-2 py-0.5 rounded-md font-mono z-30 pointer-events-none tracking-wide shadow-xs flex items-center gap-1.5" dir="ltr">
          <span className="font-bold">{paperWidthMM}×{paperHeightMM}mm</span>
          <span className="opacity-40">|</span>
          <span>{slots.length} photos</span>
          <span className="opacity-40">|</span>
          <span className="font-bold">{coverage}%</span>
        </div>

        {/* المؤشر الحي بالمليمتر أثناء السحب أو التحجيم */}
        {liveBadge && (
          <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9.5px] px-2 py-0.5 rounded-md font-mono z-40 pointer-events-none shadow-md animate-in fade-in duration-75" dir="ltr">
            {liveBadge}
          </div>
        )}

        {/* بطاقات خلايا الكولاج التفاعلية */}
        {slots.map((slot, index) => (
          <FreeformSlotCard
            key={slot.id}
            slot={slot}
            index={index}
            isSelected={slot.id === selectedSlotId}
            isMultiSelected={multiSelectedIds.includes(slot.id)}
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
