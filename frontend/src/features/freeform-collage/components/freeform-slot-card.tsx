import React, { memo } from 'react';

import { cn } from '@/lib/utils';

import type { ResizeHandle } from '../lib/freeform-math';
import type { FreeformSlot } from '../types';

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
  n: { cursor: 'ns-resize' },
  s: { cursor: 'ns-resize' },
  e: { cursor: 'ew-resize' },
  w: { cursor: 'ew-resize' },
  ne: { cursor: 'nesw-resize' },
  sw: { cursor: 'nesw-resize' },
  nw: { cursor: 'nwse-resize' },
  se: { cursor: 'nwse-resize' },
};

const HANDLES: { dir: ResizeHandle; pos: React.CSSProperties }[] = [
  { dir: 'n', pos: { left: '50%', top: 0, transform: 'translate(-50%,-50%)' } },
  { dir: 's', pos: { left: '50%', bottom: 0, transform: 'translate(-50%,50%)' } },
  { dir: 'e', pos: { right: 0, top: '50%', transform: 'translate(50%,-50%)' } },
  { dir: 'w', pos: { left: 0, top: '50%', transform: 'translate(-50%,-50%)' } },
  { dir: 'ne', pos: { right: 0, top: 0, transform: 'translate(50%,-50%)' } },
  { dir: 'nw', pos: { left: 0, top: 0, transform: 'translate(-50%,-50%)' } },
  { dir: 'se', pos: { right: 0, bottom: 0, transform: 'translate(50%,50%)' } },
  { dir: 'sw', pos: { left: 0, bottom: 0, transform: 'translate(-50%,50%)' } },
];

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
      aria-label={`${slot.label || `خلية ${index + 1}`} — ${slotWidthMM}×${slotHeightMM} مم`}
      aria-pressed={isSelected || isMultiSelected}
      onPointerDown={(e) => onBodyPointerDown(e, slot.id)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(e) => onKeyDown(e, slot.id)}
      className={cn(
        'absolute cursor-move select-none touch-none border transition-colors duration-150 group/slot',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
        isSelected
          ? 'border-primary bg-primary/10 z-20 ring-1 ring-primary'
          : isMultiSelected
            ? 'border-primary bg-primary/5 z-10'
            : 'border-foreground/25 bg-muted/60 hover:border-primary/60 hover:bg-muted z-0',
      )}
      style={{
        left: `${slot.x * 100}%`,
        top: `${slot.y * 100}%`,
        width: `${slot.w * 100}%`,
        height: `${slot.h * 100}%`,
      }}
    >
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden pointer-events-none @container"
        aria-hidden="true"
      >
        <span
          className={cn(
            'font-mono text-xs tabular-nums',
            isSelected || isMultiSelected ? 'text-primary font-semibold' : 'text-muted-foreground',
          )}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <span
          className="hidden @min-[90px]:block text-micro font-mono text-muted-foreground whitespace-nowrap"
          dir="ltr"
        >
          {slotWidthMM} × {slotHeightMM}
        </span>
      </div>
      {isSelected &&
        HANDLES.map(({ dir, pos }) => (
          <div
            key={dir}
            role="presentation"
            onPointerDown={(e) => onHandlePointerDown(e, slot.id, dir)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            className="absolute w-2.5 h-2.5 bg-background border border-primary rounded-xs touch-none z-30 before:absolute before:-inset-1"
            style={{ ...pos, ...BORDER_BY_HANDLE[dir] }}
          />
        ))}
    </div>
  );
});
