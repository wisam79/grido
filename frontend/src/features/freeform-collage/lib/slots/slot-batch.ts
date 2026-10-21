import { clamp } from '@/lib/clamp';

import { MIN_SIZE } from './constants';
import { newSlotId } from './slot-ids';

import type { FreeformSlot } from '../../types';

/* ========================================================================== */
/*  عمليات التحديد المتعدد والتحرير الجماعي (Multi-Select & Batch Editing)      */
/* ========================================================================== */

/** حذف مجموعة خلايا محددة — يُبقي خلية واحدة على الأقل دائماً */
export function removeSlotsByIds(slots: FreeformSlot[], ids: string[]): FreeformSlot[] {
  if (slots.length <= ids.length) return slots.length > 1 ? slots.slice(0, 1) : slots;
  return slots.filter((s) => !ids.includes(s.id));
}

/** مضاعفة مجموعة خلايا بإزاحة تلقائية دون تداخل مع الأصل */
export function duplicateSlotsByIds(
  slots: FreeformSlot[],
  ids: string[],
): { slots: FreeformSlot[]; newIds: string[] } {
  const targets = slots.filter((s) => ids.includes(s.id));
  if (targets.length === 0) return { slots, newIds: [] };

  const newIds: string[] = [];
  // نحاول أولاً بمساحة فارغة تحت كتلة النسخ كاملة، وإلا بإزاحة بسيطة
  const minX = Math.min(...targets.map((s) => s.x));
  const minY = Math.min(...targets.map((s) => s.y));
  const blockW = Math.max(...targets.map((s) => s.x + s.w)) - minX;
  const blockH = Math.max(...targets.map((s) => s.y + s.h)) - minY;

  let baseX = minX + 0.03;
  let baseY = minY + 0.03;
  if (baseX + blockW > 1 - 1e-4 && baseY + blockH > 1 - 1e-4) {
    baseX = Math.max(0, Math.min(minX, 1 - blockW));
    baseY = Math.max(0, Math.min(minY, 1 - blockH));
  } else if (baseX + blockW > 1 - 1e-4) {
    baseX = Math.max(0, 1 - blockW);
  } else if (baseY + blockH > 1 - 1e-4) {
    baseY = Math.max(0, 1 - blockH);
  }

  const copies = targets.map((t) => {
    const id = newSlotId('slot_copy');
    newIds.push(id);
    return {
      ...t,
      id,
      x: clamp(t.x - minX + baseX, 0, 1 - t.w),
      y: clamp(t.y - minY + baseY, 0, 1 - t.h),
      label: t.label ? `${t.label} (نسخة)` : undefined,
    };
  });

  return { slots: [...slots, ...copies], newIds };
}

/** تكبير/تصغير جماعي لمجموعة خلايا حول مركزها المشترك مع بقاء النِسَب */
export function scaleSlotsByIds(
  slots: FreeformSlot[],
  ids: string[],
  factor: number,
  paperWidthMM?: number,
  paperHeightMM?: number,
): FreeformSlot[] {
  const targets = slots.filter((s) => ids.includes(s.id));
  if (targets.length === 0 || factor <= 0) return slots;

  const aspect =
    paperWidthMM && paperHeightMM && paperWidthMM > 0 && paperHeightMM > 0
      ? paperHeightMM / paperWidthMM
      : 1;

  const cx = targets.reduce((acc, s) => acc + s.x + s.w / 2, 0) / targets.length;
  const cy = targets.reduce((acc, s) => acc + s.y + s.h / 2, 0) / targets.length;

  return slots.map((s) => {
    if (!ids.includes(s.id)) return s;
    const nw = clamp(s.w * factor, MIN_SIZE, 1);
    const nh = clamp(s.h * factor, MIN_SIZE, 1);
    const nx = clamp(cx - (cx - s.x) * factor, 0, 1 - nw);
    const ny = clamp(cy - (cy - s.y) * factor, 0, 1 - nh);
    void aspect;
    return {
      ...s,
      x: Number(nx.toFixed(4)),
      y: Number(ny.toFixed(4)),
      w: Number(nw.toFixed(4)),
      h: Number(nh.toFixed(4)),
    };
  });
}
