import { clamp } from '@/lib/clamp';

import type { FreeformSlot, SlotAlignment, DistributionAxis } from '../../types';

/**
 * محاذاة الخلية المحددة
 */
export function alignSlot(
  slots: FreeformSlot[],
  targetId: string,
  alignment: SlotAlignment,
): FreeformSlot[] {
  return slots.map((s) => {
    if (s.id !== targetId) return s;
    const { w, h } = s;
    let nx = s.x;
    let ny = s.y;
    if (alignment === 'top-left') {
      nx = 0;
      ny = 0;
    } else if (alignment === 'center-h') {
      nx = (1 - w) / 2;
    } else if (alignment === 'center-v') {
      ny = (1 - h) / 2;
    } else if (alignment === 'top') {
      ny = 0;
    } else if (alignment === 'bottom') {
      ny = 1 - h;
    } else if (alignment === 'left') {
      nx = 0;
    } else if (alignment === 'right') {
      nx = 1 - w;
    }
    return { ...s, x: Number(nx.toFixed(4)), y: Number(ny.toFixed(4)) };
  });
}

/**
 * توزيع الخلايا بالتساوي على المحور المحدد
 */
export function distributeSlots(slots: FreeformSlot[], axis: DistributionAxis): FreeformSlot[] {
  if (slots.length <= 2) return slots;

  const sorted = [...slots].sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (axis === 'horizontal') {
    const totalSpan = last.x + last.w - first.x;
    const totalSlotsWidth = sorted.reduce((acc, s) => acc + s.w, 0);
    const availableGap = (totalSpan - totalSlotsWidth) / (sorted.length - 1);

    let currentX = first.x;
    const newPositions = new Map<string, number>();

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      newPositions.set(s.id, Number(currentX.toFixed(4)));
      currentX += s.w + Math.max(0, availableGap);
    }

    return slots.map((s) => ({
      ...s,
      x: newPositions.has(s.id) ? clamp(newPositions.get(s.id)!, 0, 1 - s.w) : s.x,
    }));
  } else {
    const totalSpan = last.y + last.h - first.y;
    const totalSlotsHeight = sorted.reduce((acc, s) => acc + s.h, 0);
    const availableGap = (totalSpan - totalSlotsHeight) / (sorted.length - 1);

    let currentY = first.y;
    const newPositions = new Map<string, number>();

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      newPositions.set(s.id, Number(currentY.toFixed(4)));
      currentY += s.h + Math.max(0, availableGap);
    }

    return slots.map((s) => ({
      ...s,
      y: newPositions.has(s.id) ? clamp(newPositions.get(s.id)!, 0, 1 - s.h) : s.y,
    }));
  }
}

/** محاذاة مجموعة خلايا فيما بينها (وليس مع الورقة) — محاذاة الأطراف والمراكز */
export function alignSlotsToEachOther(
  slots: FreeformSlot[],
  ids: string[],
  alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v' | 'same-size',
): FreeformSlot[] {
  const targets = slots.filter((s) => ids.includes(s.id));
  if (targets.length < 2) return slots;

  if (alignment === 'same-size') {
    // توحيد المقاس على أكبر خلية
    let maxW = 0;
    let maxH = 0;
    for (const s of targets) {
      if (s.w > maxW) maxW = s.w;
      if (s.h > maxH) maxH = s.h;
    }
    return slots.map((s) =>
      ids.includes(s.id)
        ? {
            ...s,
            w: Math.min(maxW, 1 - s.x),
            h: Math.min(maxH, 1 - s.y),
          }
        : s,
    );
  }

  const refX = Math.min(...targets.map((s) => s.x));
  const refRight = Math.max(...targets.map((s) => s.x + s.w));
  const refY = Math.min(...targets.map((s) => s.y));
  const refBottom = Math.max(...targets.map((s) => s.y + s.h));

  return slots.map((s) => {
    if (!ids.includes(s.id)) return s;
    let nx = s.x;
    let ny = s.y;
    if (alignment === 'left') nx = refX;
    else if (alignment === 'right') nx = refRight - s.w;
    else if (alignment === 'top') ny = refY;
    else if (alignment === 'bottom') ny = refBottom - s.h;
    else if (alignment === 'center-h') {
      const cx = targets.reduce((acc, t) => acc + t.x + t.w / 2, 0) / targets.length;
      nx = cx - s.w / 2;
    } else if (alignment === 'center-v') {
      const cy = targets.reduce((acc, t) => acc + t.y + t.h / 2, 0) / targets.length;
      ny = cy - s.h / 2;
    }
    return {
      ...s,
      x: clamp(nx, 0, 1 - s.w),
      y: clamp(ny, 0, 1 - s.h),
    };
  });
}

const OVERLAP_EPS = 1e-4;
const SEPARATION_GAP = 0.002;

function separateAlongAxis(
  slotA: FreeformSlot,
  slotB: FreeformSlot,
  axis: 'x' | 'y',
  gap: number,
): boolean {
  const sizeKey = axis === 'x' ? 'w' : 'h';
  const [first, second] = slotA[axis] <= slotB[axis] ? [slotA, slotB] : [slotB, slotA];
  const targetSeparation = first[axis] + first[sizeKey] - second[axis] + gap;
  if (targetSeparation <= 0) return false;

  const firstMax = Math.max(0, 1 - first[sizeKey]);
  const secondMax = Math.max(0, 1 - second[sizeKey]);
  const oldFirst = first[axis];
  const oldSecond = second[axis];

  // ندفع الثانية للأمام أولاً، وعند بلوغ حافة الورقة ندفع الأولى للخلف بالمسافة المتبقية.
  const forwardShift = Math.min(targetSeparation, Math.max(0, secondMax - oldSecond));
  second[axis] = clamp(oldSecond + forwardShift, 0, secondMax);

  const remaining = targetSeparation - forwardShift;
  if (remaining > 0) {
    first[axis] = clamp(oldFirst - remaining, 0, firstMax);
  }

  return Math.abs(first[axis] - oldFirst) > 1e-9 || Math.abs(second[axis] - oldSecond) > 1e-9;
}

function pickResolutionAxis(
  a: FreeformSlot,
  b: FreeformSlot,
  overlapX: number,
  overlapY: number,
): 'x' | 'y' {
  const fitsX = a.w + b.w <= 1 + 1e-9;
  const fitsY = a.h + b.h <= 1 + 1e-9;
  if (fitsX !== fitsY) return fitsX ? 'x' : 'y';
  return overlapX < overlapY ? 'x' : 'y';
}

/** إزالة كافة التداخلات بين الخلايا — دفع لطيف متتالٍ حتى الاستقرار */
export function resolveOverlaps(slots: FreeformSlot[]): FreeformSlot[] {
  const current = slots.map((s) => ({ ...s }));
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 30) {
    changed = false;
    iterations += 1;

    for (let i = 0; i < current.length; i++) {
      for (let j = i + 1; j < current.length; j++) {
        const a = current[i];
        const b = current[j];
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (overlapX > OVERLAP_EPS && overlapY > OVERLAP_EPS) {
          const axis = pickResolutionAxis(a, b, overlapX, overlapY);
          if (separateAlongAxis(a, b, axis, SEPARATION_GAP)) {
            changed = true;
          }
        }
      }
    }
  }

  return current.map((s) => ({ ...s, x: Number(s.x.toFixed(4)), y: Number(s.y.toFixed(4)) }));
}
