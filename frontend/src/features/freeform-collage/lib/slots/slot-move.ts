import type { FreeformSlot, SnapLine } from '../../types';
import { clamp } from '@/lib/clamp';
import { SNAP_TOLERANCE, CENTER_SNAP_TOLERANCE } from './constants';

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

/**
 * نقل مجموعة خلايا معاً (سحب جماعي) — الخلية القائدة تلتقط المغناطيس والباقي يتبعها
 */
export function moveSlots(
  slots: FreeformSlot[],
  targetIds: string[],
  dx: number,
  dy: number,
): { slots: FreeformSlot[]; snapLines: SnapLine[] } {
  if (targetIds.length === 0) return { slots, snapLines: [] };
  if (targetIds.length === 1) return moveSlot(slots, targetIds[0], dx, dy);

  // نحرك القائدة عبر moveSlot للحصول على المغناطيس ثم نطبق نفس الإزاحة على البقية
  const leadId = targetIds[0];
  const before = slots.find((s) => s.id === leadId);
  const res = moveSlot(slots, leadId, dx, dy);
  const after = res.slots.find((s) => s.id === leadId);
  if (!before || !after) return { slots, snapLines: [] };

  const shiftX = after.x - before.x;
  const shiftY = after.y - before.y;

  const movedSet = new Set(targetIds);
  const nextSlots = res.slots.map((s) => {
    if (s.id === leadId || !movedSet.has(s.id)) return s;
    return {
      ...s,
      x: clamp(s.x + shiftX, 0, 1 - s.w),
      y: clamp(s.y + shiftY, 0, 1 - s.h),
    };
  });

  return { slots: nextSlots, snapLines: res.snapLines };
}
