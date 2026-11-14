import { clamp } from '@/lib/clamp';

import { MIN_SIZE } from './constants';
import { newSlotId } from './slot-ids';

import type { ResizeHandle } from './constants';
import type { FreeformSlot, SnapLine } from '../../types';

/**
 * Fits a locked pair with one scale. Each axis's request, minimum and maximum
 * must use the same units (normalized canvas coordinates or millimetres).
 * Incompatible minima/bounds are a no-op, never two independent clamps.
 */
export function fitLockedDimensions(
  width: number,
  height: number,
  minWidth: number,
  minHeight: number,
  maxWidth: number,
  maxHeight: number,
): { w: number; h: number } | null {
  if (
    ![width, height, minWidth, minHeight, maxWidth, maxHeight].every(Number.isFinite) ||
    Math.min(width, height, minWidth, minHeight, maxWidth, maxHeight) <= 0
  ) {
    return null;
  }
  const lower = Math.max(minWidth / width, minHeight / height);
  const upper = Math.min(maxWidth / width, maxHeight / height);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) return null;
  const scale = clamp(1, lower, upper);
  const w = width * scale;
  const h = height * scale;
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { w, h } : null;
}

/**
 * تحجيم الخلية بمقابض 8 اتجاهات مع قفل اختياري لنسبة الأبعاد والمحاذاة المغناطيسية
 */
export function resizeSlotWithSnap(
  slots: FreeformSlot[],
  targetId: string,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  aspectRatio?: number,
  enableSnapping: boolean = false,
): { slots: FreeformSlot[]; snapLines: SnapLine[] } {
  const idx = slots.findIndex((s) => s.id === targetId);
  if (idx === -1) return { slots, snapLines: [] };
  const slot = slots[idx];
  if (
    ![slot.x, slot.y, slot.w, slot.h, dx, dy].every(Number.isFinite) ||
    slot.x < 0 ||
    slot.y < 0 ||
    slot.w <= 0 ||
    slot.h <= 0 ||
    (aspectRatio !== undefined && (!Number.isFinite(aspectRatio) || aspectRatio <= 0))
  )
    return { slots, snapLines: [] };

  const origL = slot.x;
  const origT = slot.y;
  const origR = slot.x + slot.w;
  const origB = slot.y + slot.h;

  let left = origL;
  let top = origT;
  let right = origR;
  let bottom = origB;

  const others = slots.filter((_, i) => i !== idx);
  const snapLines: SnapLine[] = [];
  const SNAP_THRESHOLD = 0.012;

  // 1. معالجة الحواف الأفقية (e و w)
  if (handle.includes('w')) {
    let targetLeft = clamp(origL + dx, 0, origR - MIN_SIZE);

    if (enableSnapping) {
      const candidates = [0, 0.5];
      for (const o of others) {
        candidates.push(o.x, o.x + o.w);
      }
      let best = targetLeft;
      let bestDelta = SNAP_THRESHOLD;
      let snappedLine: number | null = null;
      for (const c of candidates) {
        const delta = Math.abs(c - targetLeft);
        if (delta < bestDelta && c <= origR - MIN_SIZE && c >= 0) {
          best = c;
          bestDelta = delta;
          snappedLine = c;
        }
      }
      targetLeft = best;
      if (snappedLine !== null) {
        snapLines.push({
          id: `snap-w-${snappedLine.toFixed(4)}`,
          axis: 'x',
          position: snappedLine,
        });
      }
    }

    if (targetLeft < origL) {
      // توسع نحو اليسار: نتحقق من العقبات الواقعة إلى يسار الخلية حصراً والتي تتقاطع رأسياً
      const obstacles = others.filter((o) => {
        const isToLeft = o.x + o.w <= origL + 1e-4;
        const yOverlap = Math.max(origT, o.y) < Math.min(origB, o.y + o.h) - 1e-4;
        return isToLeft && yOverlap;
      });

      if (obstacles.length > 0) {
        const maxObstacleRight = Math.max(...obstacles.map((o) => o.x + o.w));
        left = clamp(Math.max(targetLeft, maxObstacleRight), 0, origR - MIN_SIZE);
      } else {
        left = targetLeft;
      }
    } else {
      // تصغير: يتحرك الضلع الأيسر بسلاسة بدون أي قفز أو قيود اصطدامية
      left = targetLeft;
    }
  }

  if (handle.includes('e')) {
    let targetRight = clamp(origR + dx, origL + MIN_SIZE, 1);

    if (enableSnapping) {
      const candidates = [0.5, 1];
      for (const o of others) {
        candidates.push(o.x, o.x + o.w);
      }
      let best = targetRight;
      let bestDelta = SNAP_THRESHOLD;
      let snappedLine: number | null = null;
      for (const c of candidates) {
        const delta = Math.abs(c - targetRight);
        if (delta < bestDelta && c >= origL + MIN_SIZE && c <= 1) {
          best = c;
          bestDelta = delta;
          snappedLine = c;
        }
      }
      targetRight = best;
      if (snappedLine !== null) {
        snapLines.push({
          id: `snap-e-${snappedLine.toFixed(4)}`,
          axis: 'x',
          position: snappedLine,
        });
      }
    }

    if (targetRight > origR) {
      // توسع نحو اليمين: نتحقق من العقبات الواقعة إلى يمين الخلية حصراً وتتقاطع رأسياً
      const obstacles = others.filter((o) => {
        const isToRight = o.x >= origR - 1e-4;
        const yOverlap = Math.max(origT, o.y) < Math.min(origB, o.y + o.h) - 1e-4;
        return isToRight && yOverlap;
      });

      if (obstacles.length > 0) {
        const minObstacleLeft = Math.min(...obstacles.map((o) => o.x));
        right = clamp(Math.min(targetRight, minObstacleLeft), origL + MIN_SIZE, 1);
      } else {
        right = targetRight;
      }
    } else {
      // تصغير: يتحرك الضلع الأيمن بسلاسة بدون أي قفز أو قيود اصطدامية
      right = targetRight;
    }
  }

  // 2. معالجة الحواف الرأسية (n و s)
  if (handle.includes('n')) {
    let targetTop = clamp(origT + dy, 0, origB - MIN_SIZE);

    if (enableSnapping) {
      const candidates = [0, 0.5];
      for (const o of others) {
        candidates.push(o.y, o.y + o.h);
      }
      let best = targetTop;
      let bestDelta = SNAP_THRESHOLD;
      let snappedLine: number | null = null;
      for (const c of candidates) {
        const delta = Math.abs(c - targetTop);
        if (delta < bestDelta && c <= origB - MIN_SIZE && c >= 0) {
          best = c;
          bestDelta = delta;
          snappedLine = c;
        }
      }
      targetTop = best;
      if (snappedLine !== null) {
        snapLines.push({
          id: `snap-n-${snappedLine.toFixed(4)}`,
          axis: 'y',
          position: snappedLine,
        });
      }
    }

    if (targetTop < origT) {
      // توسع نحو الأعلى: نتحقق من العقبات الواقعة فوق الخلية وتتقاطع أفقياً
      const obstacles = others.filter((o) => {
        const isAbove = o.y + o.h <= origT + 1e-4;
        const xOverlap = Math.max(origL, o.x) < Math.min(origR, o.x + o.w) - 1e-4;
        return isAbove && xOverlap;
      });

      if (obstacles.length > 0) {
        const maxObstacleBottom = Math.max(...obstacles.map((o) => o.y + o.h));
        top = clamp(Math.max(targetTop, maxObstacleBottom), 0, origB - MIN_SIZE);
      } else {
        top = targetTop;
      }
    } else {
      // تصغير: يتحرك الضلع العلوي بسلاسة
      top = targetTop;
    }
  }

  if (handle.includes('s')) {
    let targetBottom = clamp(origB + dy, origT + MIN_SIZE, 1);

    if (enableSnapping) {
      const candidates = [0.5, 1];
      for (const o of others) {
        candidates.push(o.y, o.y + o.h);
      }
      let best = targetBottom;
      let bestDelta = SNAP_THRESHOLD;
      let snappedLine: number | null = null;
      for (const c of candidates) {
        const delta = Math.abs(c - targetBottom);
        if (delta < bestDelta && c >= origT + MIN_SIZE && c <= 1) {
          best = c;
          bestDelta = delta;
          snappedLine = c;
        }
      }
      targetBottom = best;
      if (snappedLine !== null) {
        snapLines.push({
          id: `snap-s-${snappedLine.toFixed(4)}`,
          axis: 'y',
          position: snappedLine,
        });
      }
    }

    if (targetBottom > origB) {
      // توسع نحو الأسفل: نتحقق من العقبات الواقعة أسفل الخلية وتتقاطع أفقياً
      const obstacles = others.filter((o) => {
        const isBelow = o.y >= origB - 1e-4;
        const xOverlap = Math.max(origL, o.x) < Math.min(origR, o.x + o.w) - 1e-4;
        return isBelow && xOverlap;
      });

      if (obstacles.length > 0) {
        const minObstacleTop = Math.min(...obstacles.map((o) => o.y));
        bottom = clamp(Math.min(targetBottom, minObstacleTop), origT + MIN_SIZE, 1);
      } else {
        bottom = targetBottom;
      }
    } else {
      // تصغير: يتحرك الضلع السفلي بسلاسة
      bottom = targetBottom;
    }
  }

  let w = right - left;
  let h = bottom - top;

  // 3. قفل النسبة: لا نعيد قص كل محور مستقلاً بعد الملاءمة.
  const locked = aspectRatio !== undefined;
  if (locked) {
    const horizontal = handle.includes('e') || handle.includes('w');
    const vertical = handle.includes('n') || handle.includes('s');
    const maxW = Math.min(
      handle.includes('w') ? right : 1 - left,
      horizontal ? Math.max(slot.w, w) : Infinity,
    );
    const maxH = Math.min(
      handle.includes('n') ? bottom : 1 - top,
      vertical ? Math.max(slot.h, h) : Infinity,
    );
    const fitted = fitLockedDimensions(
      horizontal ? w : h * aspectRatio,
      horizontal ? w / aspectRatio : h,
      MIN_SIZE,
      MIN_SIZE,
      maxW,
      maxH,
    );
    if (!fitted) return { slots, snapLines: [] };
    w = fitted.w;
    h = fitted.h;
    if (handle.includes('w')) left = right - w;
    else right = left + w;
    if (handle.includes('n')) top = bottom - h;
    else bottom = top + h;
  }

  const finalX = locked ? left : clamp(left, 0, 1 - MIN_SIZE);
  const finalY = locked ? top : clamp(top, 0, 1 - MIN_SIZE);
  const finalW = locked ? w : clamp(right - finalX, MIN_SIZE, 1 - finalX);
  const finalH = locked ? h : clamp(bottom - finalY, MIN_SIZE, 1 - finalY);

  const uniqueSnapLinesMap = new Map<string, SnapLine>();
  for (const line of snapLines) {
    uniqueSnapLinesMap.set(`${line.axis}:${line.position.toFixed(4)}`, line);
  }

  const updatedSlots = slots.map((s, i) =>
    i === idx
      ? {
          ...s,
          x: finalX,
          y: finalY,
          w: finalW,
          h: finalH,
        }
      : s,
  );

  return { slots: updatedSlots, snapLines: Array.from(uniqueSnapLinesMap.values()) };
}

/**
 * تحجيم الخلية بمقابض 8 اتجاهات (توافقية كاملة مع واجهات الاستدعاء السابقة)
 */
export function resizeSlot(
  slots: FreeformSlot[],
  targetId: string,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  aspectRatio?: number,
): FreeformSlot[] {
  return resizeSlotWithSnap(slots, targetId, handle, dx, dy, aspectRatio, false).slots;
}

/**
 * تدوير الخلية 90 درجة مع الحفاظ على المقاييس الفيزيائية
 */
export function rotateSlot(
  slots: FreeformSlot[],
  targetId: string,
  paperWidthMM?: number,
  paperHeightMM?: number,
): FreeformSlot[] {
  const paperAspect =
    paperWidthMM !== undefined &&
    paperHeightMM !== undefined &&
    Number.isFinite(paperWidthMM) &&
    Number.isFinite(paperHeightMM) &&
    paperWidthMM > 0 &&
    paperHeightMM > 0
      ? paperHeightMM / paperWidthMM
      : 1;
  const aspect = Number.isFinite(paperAspect) && paperAspect > 0 ? paperAspect : 1;
  const target = slots.find((s) => s.id === targetId);
  if (!target) return slots;

  const rotation = target.rotation ?? 0;
  if (
    ![target.x, target.y, target.w, target.h, rotation].every(Number.isFinite) ||
    target.x < 0 ||
    target.y < 0 ||
    target.w <= 0 ||
    target.h <= 0
  ) {
    return slots;
  }

  const rotatedW = target.h * aspect;
  const rotatedH = target.w / aspect;
  if (!Number.isFinite(rotatedW) || !Number.isFinite(rotatedH) || rotatedW <= 0 || rotatedH <= 0) {
    return slots;
  }

  // عامل واحد يحفظ النسبة الفيزيائية؛ إن تعارض الحد الأدنى مع المساحة فلا تدوير.
  const minScale = Math.max(MIN_SIZE / rotatedW, MIN_SIZE / rotatedH);
  const maxScale = Math.min((1 - target.x) / rotatedW, (1 - target.y) / rotatedH);
  if (!Number.isFinite(minScale) || !Number.isFinite(maxScale) || minScale > maxScale) {
    return slots;
  }
  const scale = clamp(1, minScale, maxScale);
  const nextRot = ((((rotation + 90) % 360) + 360) % 360) as 0 | 90 | 180 | 270;

  return slots.map((s) =>
    s === target ? { ...s, w: rotatedW * scale, h: rotatedH * scale, rotation: nextRot } : s,
  );
}

/**
 * مضاعفة الخلية الحالية
 */
export function duplicateSlot(slots: FreeformSlot[], targetId: string): FreeformSlot[] {
  const target = slots.find((s) => s.id === targetId);
  if (!target) return slots;

  const newX = clamp(target.x + 0.04, 0, 1 - target.w);
  const newY = clamp(target.y + 0.04, 0, 1 - target.h);

  const copy: FreeformSlot = {
    ...target,
    id: newSlotId('slot_copy'),
    x: newX,
    y: newY,
    label: target.label ? `${target.label} (نسخة)` : 'خلية جديدة',
  };

  return [...slots, copy];
}

export function snapToGrid(value: number, step: number = 0.025): number {
  return Math.round(value / step) * step;
}
