import { clamp } from '@/lib/clamp';

import { SNAP_TOLERANCE, CENTER_SNAP_TOLERANCE } from './constants';

import type { FreeformSlot, SnapLine } from '../../types';

/**
 * نقل الخلية بـ Center Drag مع المغناطيس الذكي والتصادم
 */
export function moveSlot(
  slots: FreeformSlot[],
  targetId: string,
  dx: number,
  dy: number,
): { slots: FreeformSlot[]; snapLines: SnapLine[] } {
  const idx = slots.findIndex((s) => s.id === targetId);
  if (idx === -1) return { slots, snapLines: [] };

  const slot = slots[idx];
  const maxX = 1 - slot.w;
  const maxY = 1 - slot.h;

  const newX = clamp(slot.x + dx, 0, maxX);
  const newY = clamp(slot.y + dy, 0, maxY);

  const xCandidates: { pos: number; linePos: number; id: string }[] = [];
  const yCandidates: { pos: number; linePos: number; id: string }[] = [];

  // حواف الورقة الخارجية
  if (Math.abs(newX) <= SNAP_TOLERANCE) {
    xCandidates.push({ pos: 0, linePos: 0, id: 'edge-left' });
  }
  if (Math.abs(newX - maxX) <= SNAP_TOLERANCE) {
    xCandidates.push({ pos: maxX, linePos: 1, id: 'edge-right' });
  }
  if (Math.abs(newY) <= SNAP_TOLERANCE) {
    yCandidates.push({ pos: 0, linePos: 0, id: 'edge-top' });
  }
  if (Math.abs(newY - maxY) <= SNAP_TOLERANCE) {
    yCandidates.push({ pos: maxY, linePos: 1, id: 'edge-bottom' });
  }

  // منتصف الورقة
  if (Math.abs(newX + slot.w / 2 - 0.5) <= CENTER_SNAP_TOLERANCE) {
    xCandidates.push({ pos: 0.5 - slot.w / 2, linePos: 0.5, id: 'center-x' });
  }
  if (Math.abs(newY + slot.h / 2 - 0.5) <= CENTER_SNAP_TOLERANCE) {
    yCandidates.push({ pos: 0.5 - slot.h / 2, linePos: 0.5, id: 'center-y' });
  }

  // حواف ومراكز الخلايا المجاورة
  for (const o of slots) {
    if (o.id === targetId) continue;
    if (Math.abs(newX - o.x) <= SNAP_TOLERANCE) {
      xCandidates.push({ pos: o.x, linePos: o.x, id: `snap-x-${o.id}-left` });
    }
    if (Math.abs(newX + slot.w - (o.x + o.w)) <= SNAP_TOLERANCE) {
      xCandidates.push({ pos: o.x + o.w - slot.w, linePos: o.x + o.w, id: `snap-x-${o.id}-right` });
    }
    if (Math.abs(newX - (o.x + o.w)) <= SNAP_TOLERANCE) {
      xCandidates.push({ pos: o.x + o.w, linePos: o.x + o.w, id: `snap-x-${o.id}-adjacent-right` });
    }
    if (Math.abs(newX + slot.w - o.x) <= SNAP_TOLERANCE) {
      xCandidates.push({ pos: o.x - slot.w, linePos: o.x, id: `snap-x-${o.id}-adjacent-left` });
    }

    if (Math.abs(newY - o.y) <= SNAP_TOLERANCE) {
      yCandidates.push({ pos: o.y, linePos: o.y, id: `snap-y-${o.id}-top` });
    }
    if (Math.abs(newY + slot.h - (o.y + o.h)) <= SNAP_TOLERANCE) {
      yCandidates.push({
        pos: o.y + o.h - slot.h,
        linePos: o.y + o.h,
        id: `snap-y-${o.id}-bottom`,
      });
    }
    if (Math.abs(newY - (o.y + o.h)) <= SNAP_TOLERANCE) {
      yCandidates.push({
        pos: o.y + o.h,
        linePos: o.y + o.h,
        id: `snap-y-${o.id}-adjacent-bottom`,
      });
    }
    if (Math.abs(newY + slot.h - o.y) <= SNAP_TOLERANCE) {
      yCandidates.push({ pos: o.y - slot.h, linePos: o.y, id: `snap-y-${o.id}-adjacent-top` });
    }
  }

  // اختيار أقرب مرشح لكل محور
  const pickClosest = (
    candidates: { pos: number; linePos: number; id: string }[],
    current: number,
  ): { pos: number } => {
    if (candidates.length === 0) return { pos: current };
    let best = candidates[0];
    let bestDelta = Math.abs(best.pos - current);
    for (let i = 1; i < candidates.length; i++) {
      const delta = Math.abs(candidates[i].pos - current);
      if (delta < bestDelta) {
        best = candidates[i];
        bestDelta = delta;
      }
    }
    return { pos: best.pos };
  };

  const xRes = pickClosest(xCandidates, newX);
  const yRes = pickClosest(yCandidates, newY);
  const finalX = clamp(xRes.pos, 0, maxX);
  const finalY = clamp(yRes.pos, 0, maxY);

  const activeSnapLines: SnapLine[] = [];
  for (const c of xCandidates) {
    if (Math.abs(c.pos - finalX) < 1e-4)
      activeSnapLines.push({ id: c.id, axis: 'x', position: c.linePos });
  }
  for (const c of yCandidates) {
    if (Math.abs(c.pos - finalY) < 1e-4)
      activeSnapLines.push({ id: c.id, axis: 'y', position: c.linePos });
  }

  const uniqueSnapLinesMap = new Map<string, SnapLine>();
  for (const line of activeSnapLines) {
    uniqueSnapLinesMap.set(`${line.axis}:${line.position.toFixed(4)}`, line);
  }

  const updatedSlots = slots.map((s, i) => (i === idx ? { ...s, x: finalX, y: finalY } : s));
  return { slots: updatedSlots, snapLines: Array.from(uniqueSnapLinesMap.values()) };
}

/** Clamp the selection's AABB once so every member keeps the same translation. */
export function moveSlotsWithinBounds(
  slots: FreeformSlot[],
  targetIds: readonly string[],
  dx: number,
  dy: number,
): FreeformSlot[] {
  const selected = new Set(targetIds);
  const targets = slots.filter((slot) => selected.has(slot.id));
  if (targets.length === 0) return slots;

  const minX = Math.min(...targets.map((slot) => slot.x));
  const minY = Math.min(...targets.map((slot) => slot.y));
  const maxX = Math.max(...targets.map((slot) => slot.x + slot.w));
  const maxY = Math.max(...targets.map((slot) => slot.y + slot.h));
  const shiftX = clamp(dx, -minX, 1 - maxX);
  const shiftY = clamp(dy, -minY, 1 - maxY);
  if (Math.abs(shiftX) < 1e-12 && Math.abs(shiftY) < 1e-12) return slots;

  return slots.map((slot) =>
    selected.has(slot.id) ? { ...slot, x: slot.x + shiftX, y: slot.y + shiftY } : slot,
  );
}

/** Move and snap the selection's composite bounds, excluding its own members. */
export function moveSlots(
  slots: FreeformSlot[],
  targetIds: string[],
  dx: number,
  dy: number,
): { slots: FreeformSlot[]; snapLines: SnapLine[] } {
  const movedSet = new Set(targetIds);
  const targets = slots.filter((s) => movedSet.has(s.id));
  if (targets.length === 0) return { slots, snapLines: [] };
  if (targets.length === 1) return moveSlot(slots, targets[0].id, dx, dy);

  const minX = Math.min(...targets.map((s) => s.x));
  const minY = Math.min(...targets.map((s) => s.y));
  const maxX = Math.max(...targets.map((s) => s.x + s.w));
  const maxY = Math.max(...targets.map((s) => s.y + s.h));
  const bounds: FreeformSlot = {
    id: targets[0].id,
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
  const res = moveSlot([bounds, ...slots.filter((s) => !movedSet.has(s.id))], bounds.id, dx, dy);
  const movedBounds = res.slots[0];
  const nextSlots = moveSlotsWithinBounds(
    slots,
    targetIds,
    movedBounds.x - minX,
    movedBounds.y - minY,
  );
  return { slots: nextSlots, snapLines: res.snapLines };
}
