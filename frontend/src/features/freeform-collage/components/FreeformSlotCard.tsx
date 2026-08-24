import React, { memo } from "react";
import { cn } from "@/lib/utils";
import type { FreeformSlot } from "../types";
import type { ResizeHandle } from "../lib/freeform-math";

export interface FreeformSlotCardProps {
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

/**
 * بطاقة خلية الكولاج التفاعلية المتوافقة مع معايير Fluent 2
 */
export const FreeformSlotCard: React.FC<FreeformSlotCardProps> = memo(function FreeformSlotCard({
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
}) {
  const slotWidthMM = Math.round(slot.w * paperWidthMM * 10) / 10;
  const slotHeightMM = Math.round(slot.h * paperHeightMM * 10) / 10;

  return (
    <div
      data-slot-id={slot.id}
      role="button"
      tabIndex={0}
      aria-label={slot.label || `خلية ${index + 1}`}
      aria-pressed={isSelected}
      onPointerDown={(e) => onBodyPointerDown(e, slot.id)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => onKeyDown(e, slot.id)}
      className={cn(
        "absolute rounded-md border transition-[background-color,border-color,box-shadow] cursor-move flex flex-col items-center justify-center group select-none overflow-hidden touch-none p-1",
        isSelected
          ? "border-2 border-primary bg-primary/15 ring-2 ring-primary/30 z-20 shadow-md text-primary"
          : "border-slate-300/80 dark:border-slate-700/80 bg-slate-50/95 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-100 z-10 shadow-2xs fluent-specular"
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
          "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shadow-xs mb-0.5 shrink-0 pointer-events-none transition-colors",
          isSelected ? "bg-primary text-primary-foreground" : "bg-slate-700 text-white dark:bg-zinc-600"
        )}
      >
        {index + 1}
      </div>

      <span
        className={cn(
          "text-[9.5px] font-bold truncate max-w-[90%] leading-tight pointer-events-none text-center",
          isSelected ? "text-primary font-black" : "text-foreground/90"
        )}
      >
        {slot.label || `خلية ${index + 1}`}
      </span>

      <span className="text-[8.5px] font-mono font-bold opacity-80 leading-tight pointer-events-none mt-0.5" dir="ltr">
        {slotWidthMM}×{slotHeightMM} mm
      </span>

      {isSelected &&
        HANDLES.map(({ dir, pos }) => (
          <div
            key={dir}
            role="presentation"
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
