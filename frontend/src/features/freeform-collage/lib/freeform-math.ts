import type { FreeformSlot, FreeformLayout, SnapLine, PhotoPresetType } from "../types";
import type { CollageTemplate } from "@/lib/templates/types";
import { LayoutGrid } from "lucide-react";

export type ResizeHandle =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

const MIN_SIZE = 0.04; // 4% الحد الأدنى للخلية
const SNAP_STEP = 0.025; // 2.5% المغناطيس
const SNAP_TOLERANCE = SNAP_STEP / 2; // 1.25% — نصف الخطوة
const CENTER_SNAP_TOLERANCE = 0.02; // منتصف الورقة (أوسع قليلاً ليسهل الالتقاط)

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

let fallbackIdCounter = 0;

/**
 * توليد معرّف فريد للخلايا الجديدة (UUID آمن مع بديل محلي)
 */
export function newSlotId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return "slot_" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  }
  fallbackIdCounter += 1;
  const randomPart = Math.random().toString(36).slice(2, 10);
  return "slot_" + Date.now().toString(36) + fallbackIdCounter.toString(36) + randomPart;
}

/**
 * نقل الخلية بـ Center Drag مع المغناطيس والتصادم
 *
 * الاستراتيجية:
 * 1. جمع كل مرشحات الالتصاق (منتصف الورقة + حواف الخلايا المجاورة)
 * 2. اختيار أقرب مرشح لكل محور (يمنع تعارض محاذاة خليتين في نفس اللحظة)
 * 3. إعادة فرض الحدود بعد الالتصاق — والتصاق أُلغِي بالحدود لا يُرسم خطه الإرشادي
 */
export function moveSlot(
  slots: FreeformSlot[],
  targetId: string,
  dx: number,
  dy: number
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

  // منتصف الورقة
  if (Math.abs(newX + slot.w / 2 - 0.5) <= CENTER_SNAP_TOLERANCE) {
    xCandidates.push({ pos: 0.5 - slot.w / 2, linePos: 0.5, id: "center-x" });
  }
  if (Math.abs(newY + slot.h / 2 - 0.5) <= CENTER_SNAP_TOLERANCE) {
    yCandidates.push({ pos: 0.5 - slot.h / 2, linePos: 0.5, id: "center-y" });
  }

  // حواف الخلايا المجاورة
  for (const o of slots) {
    if (o.id === targetId) continue;
    if (Math.abs(newX - o.x) <= SNAP_TOLERANCE) {
      xCandidates.push({ pos: o.x, linePos: o.x, id: `snap-x-${o.id}-left` });
    }
    if (Math.abs(newX + slot.w - (o.x + o.w)) <= SNAP_TOLERANCE) {
      xCandidates.push({ pos: o.x + o.w - slot.w, linePos: o.x + o.w, id: `snap-x-${o.id}-right` });
    }
    if (Math.abs(newY - o.y) <= SNAP_TOLERANCE) {
      yCandidates.push({ pos: o.y, linePos: o.y, id: `snap-y-${o.id}-top` });
    }
    if (Math.abs(newY + slot.h - (o.y + o.h)) <= SNAP_TOLERANCE) {
      yCandidates.push({ pos: o.y + o.h - slot.h, linePos: o.y + o.h, id: `snap-y-${o.id}-bottom` });
    }
  }

  // اختيار أقرب مرشح لكل محور
  const pickClosest = (candidates: { pos: number; linePos: number; id: string }[], current: number): { pos: number; candidate?: { pos: number; linePos: number; id: string } } => {
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
    return { pos: best.pos, candidate: best };
  };

  const xRes = pickClosest(xCandidates, newX);
  const yRes = pickClosest(yCandidates, newY);
  const snappedX = xRes.pos;
  const snappedY = yRes.pos;

  // إعادة فرض الحدود بعد الالتصاق — الالتصاق قد يدفع الخلية خارج الورقة
  const finalX = clamp(snappedX, 0, maxX);
  const finalY = clamp(snappedY, 0, maxY);

  // رسم خطوط الالتصاق الفعّالة فقط (الالتصاق الذي أُلغي بالحدود لا يُرسم)
  const activeSnapLines: SnapLine[] = [];
  for (const c of xCandidates) {
    if (c.pos === finalX) activeSnapLines.push({ id: c.id, axis: "x", position: c.linePos });
  }
  for (const c of yCandidates) {
    if (c.pos === finalY) activeSnapLines.push({ id: c.id, axis: "y", position: c.linePos });
  }

  // دمج الخطوط المتطابقة في الموضع نفسه (خلتان بنفس الحافة تُرسمان مرة واحدة)
  const uniqueSnapLinesMap = new Map<string, SnapLine>();
  for (const line of activeSnapLines) {
    uniqueSnapLinesMap.set(`${line.axis}:${line.position}`, line);
  }

  const updatedSlots = slots.map((s, i) => (i === idx ? { ...s, x: finalX, y: finalY } : s));
  return { slots: updatedSlots, snapLines: Array.from(uniqueSnapLinesMap.values()) };
}

/**
 * تحجيم الخلية بمقابض 8 اتجاهات
 */
export function resizeSlot(
  slots: FreeformSlot[],
  targetId: string,
  handle: ResizeHandle,
  dx: number,
  dy: number
): FreeformSlot[] {
  const idx = slots.findIndex((s) => s.id === targetId);
  if (idx === -1) return slots;
  const slot = slots[idx];

  let left = slot.x;
  let top = slot.y;
  let right = slot.x + slot.w;
  let bottom = slot.y + slot.h;

  if (handle.includes("w")) left = clamp(slot.x + dx, 0, right - MIN_SIZE);
  if (handle.includes("e")) right = clamp(slot.x + slot.w + dx, left + MIN_SIZE, 1);
  if (handle.includes("n")) top = clamp(slot.y + dy, 0, bottom - MIN_SIZE);
  if (handle.includes("s")) bottom = clamp(slot.y + slot.h + dy, top + MIN_SIZE, 1);

  const newRect = { x: left, y: top, w: right - left, h: bottom - top };
  const adjusted = pushOutOfOthers(slots, idx, handle, newRect);

  return slots.map((s, i) => (i === idx ? { ...s, x: adjusted.x, y: adjusted.y, w: adjusted.w, h: adjusted.h } : s));
}

/**
 * دفع الإطار خارج الخلايا المتداخلة — حلقة تكرارية حتى الاستقرار
 * لأن المرور الواحد قد يترك تداخلاً عند وجود عدة خلايا متجاورة
 */
function pushOutOfOthers(
  slots: FreeformSlot[],
  editingIdx: number,
  handle: ResizeHandle,
  rect: { x: number; y: number; w: number; h: number }
): { x: number; y: number; w: number; h: number } {
  const others = slots.filter((_, i) => i !== editingIdx);
  let { x, y, w, h } = rect;

  const EPS = 1e-6;
  const overlaps = (o: FreeformSlot): boolean =>
    x + EPS < o.x + o.w &&
    o.x + EPS < x + w &&
    y + EPS < o.y + o.h &&
    o.y + EPS < y + h;

  const enforceBounds = () => {
    w = Math.max(MIN_SIZE, Math.min(w, 1 - x));
    h = Math.max(MIN_SIZE, Math.min(h, 1 - y));
  };

  for (let iter = 0; iter < 10; iter++) {
    let changed = false;

    for (const o of others) {
      if (!overlaps(o)) continue;

      // إيقاف عند الحافة الأقرب لاتجاه السحب فقط (المقابض لا تجمع w مع e ولا n مع s)
      if (handle.includes("w") && x < o.x + o.w) {
        const nx = o.x + o.w;
        if (Math.abs(nx - x) > EPS) {
          x = nx;
          changed = true;
        }
      } else if (handle.includes("e") && x + w > o.x) {
        const nw = o.x - x;
        if (Math.abs(nw - w) > EPS) {
          w = nw;
          changed = true;
        }
      }

      if (handle.includes("n") && y < o.y + o.h) {
        const ny = o.y + o.h;
        if (Math.abs(ny - y) > EPS) {
          y = ny;
          changed = true;
        }
      } else if (handle.includes("s") && y + h > o.y) {
        const nh = o.y - y;
        if (Math.abs(nh - h) > EPS) {
          h = nh;
          changed = true;
        }
      }

      enforceBounds();
    }

    if (!changed) break;
  }

  enforceBounds();
  return { x, y, w, h };
}

/**
 * خريطة أبعاد المقاسات القياسية بالمليمتر
 */
export const PHOTO_PRESET_DIMENSIONS_MM: Record<PhotoPresetType, { w: number; h: number }> = {
  passport: { w: 50, h: 50 },
  id: { w: 35, h: 45 },
  visa: { w: 35, h: 45 },
  "iq-national-id": { w: 35, h: 45 },
  "iq-civil-id": { w: 35, h: 45 },
  "iq-transactions": { w: 30, h: 40 },
  custom: { w: 35, h: 45 },
};

/**
 * تدوير الخلية 90 درجة مع مراعاة نسبة أبعاد الورقة (التحويل بين الأبعاد الفيزيائية والنسبية)
 */
export function rotateSlot(
  slots: FreeformSlot[],
  targetId: string,
  paperWidthMM?: number,
  paperHeightMM?: number
): FreeformSlot[] {
  const aspect =
    paperWidthMM && paperHeightMM && paperWidthMM > 0 && paperHeightMM > 0
      ? paperHeightMM / paperWidthMM
      : 1;

  return slots.map((s) => {
    if (s.id !== targetId) return s;
    const nextRot = (((s.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270;
    const newW = clamp(s.h * aspect, MIN_SIZE, 1 - s.x);
    const newH = clamp(s.w / aspect, MIN_SIZE, 1 - s.y);
    return {
      ...s,
      w: newW,
      h: newH,
      rotation: nextRot,
    };
  });
}

/**
 * مضاعفة الخلية الحالية مع إزاحة خفيفة
 */
export function duplicateSlot(slots: FreeformSlot[], targetId: string): FreeformSlot[] {
  const target = slots.find((s) => s.id === targetId);
  if (!target) return slots;

  const newX = clamp(target.x + 0.04, 0, 1 - target.w);
  const newY = clamp(target.y + 0.04, 0, 1 - target.h);

  const copy: FreeformSlot = {
    ...target,
    id: newSlotId(),
    x: newX,
    y: newY,
    label: target.label ? `${target.label} (نسخة)` : "خلية جديدة",
  };

  return [...slots, copy];
}

/**
 * أدوات المحاذاة السريعة للخلية المحددة
 */
export type SlotAlignment = "center-h" | "center-v" | "top" | "bottom" | "left" | "right";

export function alignSlot(slots: FreeformSlot[], targetId: string, alignment: SlotAlignment): FreeformSlot[] {
  return slots.map((s) => {
    if (s.id !== targetId) return s;
    const { x, y, w, h } = s;
    let nx = x;
    let ny = y;
    if (alignment === "center-h") nx = (1 - w) / 2;
    if (alignment === "center-v") ny = (1 - h) / 2;
    if (alignment === "top") ny = 0;
    if (alignment === "bottom") ny = 1 - h;
    if (alignment === "left") nx = 0;
    if (alignment === "right") nx = 1 - w;
    return { ...s, x: nx, y: ny };
  });
}

/**
 * تقسيم خلية مستهدفة رأسياً أو أفقياً إلى خليتين متساويتين
 */
export function splitSlot(
  slots: FreeformSlot[],
  targetSlotId: string,
  direction: "horizontal" | "vertical"
): FreeformSlot[] {
  const targetIndex = slots.findIndex((s) => s.id === targetSlotId);
  if (targetIndex === -1) return slots;

  const target = slots[targetIndex];
  const newSlots = [...slots];

  if (direction === "horizontal") {
    const halfW = target.w / 2;
    const slotA: FreeformSlot = { ...target, w: halfW };
    const slotB: FreeformSlot = {
      ...target,
      id: newSlotId(),
      x: target.x + halfW,
      w: halfW,
    };
    newSlots.splice(targetIndex, 1, slotA, slotB);
  } else {
    const halfH = target.h / 2;
    const slotA: FreeformSlot = { ...target, h: halfH };
    const slotB: FreeformSlot = {
      ...target,
      id: newSlotId(),
      y: target.y + halfH,
      h: halfH,
    };
    newSlots.splice(targetIndex, 1, slotA, slotB);
  }

  return newSlots;
}

export function removeSlot(slots: FreeformSlot[], targetSlotId: string): FreeformSlot[] {
  if (slots.length <= 1) return slots;
  return slots.filter((s) => s.id !== targetSlotId);
}

export function addDefaultSlot(slots: FreeformSlot[]): FreeformSlot[] {
  const newSlot: FreeformSlot = {
    id: newSlotId(),
    x: 0.25,
    y: 0.25,
    w: 0.5,
    h: 0.5,
    presetType: "id",
    label: "خلية جديدة",
  };
  return [...slots, newSlot];
}

export function snapToGrid(value: number, step: number = 0.025): number {
  return Math.round(value / step) * step;
}

export function convertToGridoTemplate(layout: FreeformLayout): CollageTemplate {
  return {
    id: "freeform-" + layout.id,
    name: layout.name,
    slots: layout.slots.length,
    cells: layout.slots.map((s) => ({
      x: Number(s.x.toFixed(4)),
      y: Number(s.y.toFixed(4)),
      w: Number(s.w.toFixed(4)),
      h: Number(s.h.toFixed(4)),
      presetType: s.presetType,
      label: s.label,
      rotation: s.rotation ?? 0,
    })),
    icon: LayoutGrid,
  };
}
