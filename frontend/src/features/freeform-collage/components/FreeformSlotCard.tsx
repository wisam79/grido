import React, { memo } from "react";
import { cn } from "@/lib/utils";
import type { FreeformSlot } from "../types";
import type { ResizeHandle } from "../lib/freeform-math";

export interface FreeformSlotCardProps {
  slot: FreeformSlot;
  index: number;
  isSelected: boolean;
  isMultiSelected?: boolean;
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
 * خيال بورتريه واقعي داخل الخلية — كما تُطبع فعلاً في الاستوديو
 */
function PortraitSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* الرأس */}
      <circle cx="50" cy="36" r="16" />
      {/* الكتفان */}
      <path d="M 18 100 C 18 74, 30 60, 50 60 C 70 60, 82 74, 82 100 Z" />
    </svg>
  );
}

/**
 * بطاقة خلية الكولاج بمظهر ورقة طباعة فوتوغرافية حقيقية (Fluent 2)
 */
export const FreeformSlotCard: React.FC<FreeformSlotCardProps> = memo(function FreeformSlotCard({
  slot,
  index,
  isSelected,
  isMultiSelected = false,
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
      aria-label={slot.label || `خلية ${index + 1} — ${slotWidthMM}×${slotHeightMM} مم`}
      aria-pressed={isSelected}
      onPointerDown={(e) => onBodyPointerDown(e, slot.id)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => onKeyDown(e, slot.id)}
      className={cn(
        "absolute rounded-[3px] cursor-move select-none overflow-hidden touch-none",
        "transition-[border-color,background-color,box-shadow] duration-150",
        isSelected
          ? "border-2 border-primary bg-primary/10 ring-2 ring-primary/25 z-20 shadow-md"
          : isMultiSelected
          ? "border-2 border-primary/60 bg-primary/[0.06] ring-1 ring-primary/20 z-[15] shadow-xs"
          : "border border-border/70 bg-muted/80 hover:border-primary/40 hover:bg-background z-10 shadow-2xs fluent-specular group/slot"
      )}
      style={{
        left: `${slot.x * 100}%`,
        top: `${slot.y * 100}%`,
        width: `${slot.w * 100}%`,
        height: `${slot.h * 100}%`,
      }}
    >
      {/* خيال البورتريه الفوتوغرافي — ملء الخلية */}
      <div
        className={cn(
          "absolute inset-[10%] flex items-center justify-center pointer-events-none transition-opacity duration-150",
          isSelected
            ? "text-primary/60"
            : isMultiSelected
            ? "text-primary/50"
            : "text-muted-foreground/50 group-hover/slot:text-primary/40"
        )}
      >
        <PortraitSilhouette />
      </div>

      {/* شارة الرقم — تظهر عند التحديد أو التحويم فقط */}
      <div
        className={cn(
          "absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-[3px] text-[8.5px] font-black flex items-center justify-center pointer-events-none transition-all duration-150 leading-none",
          isSelected
            ? "bg-primary text-primary-foreground opacity-100 shadow-xs"
            : isMultiSelected
            ? "bg-primary/70 text-primary-foreground opacity-100"
            : "bg-foreground/70 text-background opacity-0 group-hover/slot:opacity-100"
        )}
      >
        {index + 1}
      </div>

      {/* شارة الأبعاد بالمليمتر — أسفل الخلية عند التحويم أو التحديد */}
      <div
        className={cn(
          "absolute bottom-0.5 left-0.5 right-0.5 flex justify-center pointer-events-none transition-opacity duration-150",
          isSelected || isMultiSelected ? "opacity-100" : "opacity-0 group-hover/slot:opacity-100"
        )}
      >
        <span
          className={cn(
            "text-[8px] font-mono font-bold px-1 py-px rounded-[3px] leading-none whitespace-nowrap",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-foreground/80 text-background"
          )}
          dir="ltr"
        >
          {slotWidthMM}×{slotHeightMM}
        </span>
      </div>

      {/* مقابض التحجيم الثمانية — تظهر للخلية الأساسية */}
      {isSelected &&
        HANDLES.map(({ dir, pos }) => (
          <div
            key={dir}
            role="presentation"
            onPointerDown={(e) => onHandlePointerDown(e, slot.id, dir)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            className="absolute w-2.5 h-2.5 bg-primary border-2 border-background rounded-xs shadow-sm hover:scale-125 transition-transform touch-none z-40"
            style={{ ...pos, ...BORDER_BY_HANDLE[dir] }}
          />
        ))}
    </div>
  );
});
