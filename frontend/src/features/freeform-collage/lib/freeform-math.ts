import type {
  FreeformSlot,
  FreeformLayout,
  SnapLine,
  PhotoPresetType,
  SlotAlignment,
  DistributionAxis,
  AutoPackStrategy,
} from "../types";
import type { CollageTemplate } from "@/lib/templates/types";
import { LayoutGrid } from "lucide-react";
import { PHOTO_PRESET_LABELS } from "./mixed-presets";

export type ResizeHandle =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

export { type SlotAlignment, type DistributionAxis, type AutoPackStrategy };

const MIN_SIZE = 0.04; // 4% الحد الأدنى للخلية
const SNAP_STEP = 0.025; // 2.5% المغناطيس
const SNAP_TOLERANCE = SNAP_STEP / 2; // 1.25% — نصف الخطوة
const CENTER_SNAP_TOLERANCE = 0.02; // منتصف الورقة

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

let fallbackIdCounter = 0;

/**
 * توليد معرّف فريد للخلايا الجديدة (UUID آمن مع بديل محلي)
 */
export function newSlotId(prefix: string = "slot"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_` + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  }
  fallbackIdCounter += 1;
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}_` + Date.now().toString(36) + fallbackIdCounter.toString(36) + randomPart;
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
  "portrait-4x6": { w: 40, h: 60 },
  "photo-10x15": { w: 100, h: 150 },
  custom: { w: 35, h: 45 },
};

/**
 * نقل الخلية بـ Center Drag مع المغناطيس الذكي والتصادم
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

  // حواف الورقة الخارجية
  if (Math.abs(newX) <= SNAP_TOLERANCE) {
    xCandidates.push({ pos: 0, linePos: 0, id: "edge-left" });
  }
  if (Math.abs(newX - maxX) <= SNAP_TOLERANCE) {
    xCandidates.push({ pos: maxX, linePos: 1, id: "edge-right" });
  }
  if (Math.abs(newY) <= SNAP_TOLERANCE) {
    yCandidates.push({ pos: 0, linePos: 0, id: "edge-top" });
  }
  if (Math.abs(newY - maxY) <= SNAP_TOLERANCE) {
    yCandidates.push({ pos: maxY, linePos: 1, id: "edge-bottom" });
  }

  // منتصف الورقة
  if (Math.abs(newX + slot.w / 2 - 0.5) <= CENTER_SNAP_TOLERANCE) {
    xCandidates.push({ pos: 0.5 - slot.w / 2, linePos: 0.5, id: "center-x" });
  }
  if (Math.abs(newY + slot.h / 2 - 0.5) <= CENTER_SNAP_TOLERANCE) {
    yCandidates.push({ pos: 0.5 - slot.h / 2, linePos: 0.5, id: "center-y" });
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
      yCandidates.push({ pos: o.y + o.h - slot.h, linePos: o.y + o.h, id: `snap-y-${o.id}-bottom` });
    }
    if (Math.abs(newY - (o.y + o.h)) <= SNAP_TOLERANCE) {
      yCandidates.push({ pos: o.y + o.h, linePos: o.y + o.h, id: `snap-y-${o.id}-adjacent-bottom` });
    }
    if (Math.abs(newY + slot.h - o.y) <= SNAP_TOLERANCE) {
      yCandidates.push({ pos: o.y - slot.h, linePos: o.y, id: `snap-y-${o.id}-adjacent-top` });
    }
  }

  // اختيار أقرب مرشح لكل محور
  const pickClosest = (candidates: { pos: number; linePos: number; id: string }[], current: number): { pos: number } => {
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
    if (Math.abs(c.pos - finalX) < 1e-4) activeSnapLines.push({ id: c.id, axis: "x", position: c.linePos });
  }
  for (const c of yCandidates) {
    if (Math.abs(c.pos - finalY) < 1e-4) activeSnapLines.push({ id: c.id, axis: "y", position: c.linePos });
  }

  const uniqueSnapLinesMap = new Map<string, SnapLine>();
  for (const line of activeSnapLines) {
    uniqueSnapLinesMap.set(`${line.axis}:${line.position.toFixed(4)}`, line);
  }

  const updatedSlots = slots.map((s, i) => (i === idx ? { ...s, x: finalX, y: finalY } : s));
  return { slots: updatedSlots, snapLines: Array.from(uniqueSnapLinesMap.values()) };
}

/**
 * تحجيم الخلية بمقابض 8 اتجاهات مع قفل اختياري لنسبة الأبعاد
 */
export function resizeSlot(
  slots: FreeformSlot[],
  targetId: string,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  aspectRatio?: number
): FreeformSlot[] {
  const idx = slots.findIndex((s) => s.id === targetId);
  if (idx === -1) return slots;
  const slot = slots[idx];

  let left = slot.x;
  let top = slot.y;
  let right = slot.x + slot.w;
  let bottom = slot.y + slot.h;

  if (handle.includes("w")) {
    left = clamp(slot.x + dx, 0, right - MIN_SIZE);
  }
  if (handle.includes("e")) {
    right = clamp(slot.x + slot.w + dx, left + MIN_SIZE, 1);
  }
  if (handle.includes("n")) {
    top = clamp(slot.y + dy, 0, bottom - MIN_SIZE);
  }
  if (handle.includes("s")) {
    bottom = clamp(slot.y + slot.h + dy, top + MIN_SIZE, 1);
  }

  let w = right - left;
  let h = bottom - top;

  if (aspectRatio && aspectRatio > 0) {
    if (handle.includes("e") || handle.includes("w")) {
      h = clamp(w / aspectRatio, MIN_SIZE, 1 - top);
    } else {
      w = clamp(h * aspectRatio, MIN_SIZE, 1 - left);
    }
  }

  const newRect = { x: left, y: top, w, h };
  const adjusted = pushOutOfOthers(slots, idx, handle, newRect);

  return slots.map((s, i) =>
    i === idx
      ? {
          ...s,
          x: adjusted.x,
          y: adjusted.y,
          w: adjusted.w,
          h: adjusted.h,
        }
      : s
  );
}

function pushOutOfOthers(
  slots: FreeformSlot[],
  editingIdx: number,
  handle: ResizeHandle,
  rect: { x: number; y: number; w: number; h: number }
): { x: number; y: number; w: number; h: number } {
  const others = slots.filter((_, i) => i !== editingIdx);
  let { x, y, w, h } = rect;
  let right = x + w;
  let bottom = y + h;

  const EPS = 1e-6;
  const overlaps = (o: FreeformSlot): boolean =>
    x + EPS < o.x + o.w &&
    o.x + EPS < right &&
    y + EPS < o.y + o.h &&
    o.y + EPS < bottom;

  for (let iter = 0; iter < 5; iter++) {
    let changed = false;

    for (const o of others) {
      if (!overlaps(o)) continue;

      if (handle.includes("w")) {
        const nx = Math.min(o.x + o.w, right - MIN_SIZE);
        if (nx > x + EPS) {
          x = nx;
          w = right - x;
          changed = true;
        }
      } else if (handle.includes("e")) {
        const nr = Math.max(o.x, x + MIN_SIZE);
        if (nr < right - EPS) {
          right = nr;
          w = right - x;
          changed = true;
        }
      }

      if (handle.includes("n")) {
        const ny = Math.min(o.y + o.h, bottom - MIN_SIZE);
        if (ny > y + EPS) {
          y = ny;
          h = bottom - y;
          changed = true;
        }
      } else if (handle.includes("s")) {
        const nb = Math.max(o.y, y + MIN_SIZE);
        if (nb < bottom - EPS) {
          bottom = nb;
          h = bottom - y;
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  x = clamp(x, 0, 1 - MIN_SIZE);
  y = clamp(y, 0, 1 - MIN_SIZE);
  w = clamp(w, MIN_SIZE, 1 - x);
  h = clamp(h, MIN_SIZE, 1 - y);

  return { x, y, w, h };
}

/**
 * تدوير الخلية 90 درجة مع الحفاظ على المقاييس الفيزيائية
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
 * مضاعفة الخلية الحالية
 */
export function duplicateSlot(slots: FreeformSlot[], targetId: string): FreeformSlot[] {
  const target = slots.find((s) => s.id === targetId);
  if (!target) return slots;

  const newX = clamp(target.x + 0.04, 0, 1 - target.w);
  const newY = clamp(target.y + 0.04, 0, 1 - target.h);

  const copy: FreeformSlot = {
    ...target,
    id: newSlotId("slot_copy"),
    x: newX,
    y: newY,
    label: target.label ? `${target.label} (نسخة)` : "خلية جديدة",
  };

  return [...slots, copy];
}

/**
 * محاذاة الخلية المحددة
 */
export function alignSlot(slots: FreeformSlot[], targetId: string, alignment: SlotAlignment): FreeformSlot[] {
  return slots.map((s) => {
    if (s.id !== targetId) return s;
    const { w, h } = s;
    let nx = s.x;
    let ny = s.y;
    if (alignment === "top-left") {
      nx = 0;
      ny = 0;
    } else if (alignment === "center-h") {
      nx = (1 - w) / 2;
    } else if (alignment === "center-v") {
      ny = (1 - h) / 2;
    } else if (alignment === "top") {
      ny = 0;
    } else if (alignment === "bottom") {
      ny = 1 - h;
    } else if (alignment === "left") {
      nx = 0;
    } else if (alignment === "right") {
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

  const sorted = [...slots].sort((a, b) => (axis === "horizontal" ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (axis === "horizontal") {
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

/**
 * البحث عن أول مساحة شاغرة على الورقة لإدراج خلية جديدة دون تداخل
 */
export function findFirstEmptySpace(
  slots: FreeformSlot[],
  wRel: number,
  hRel: number,
  marginRel: number = 0
): { x: number; y: number } {
  const step = 0.02; // دقة مسح 2%
  const EPS = 1e-4;

  const overlaps = (x: number, y: number): boolean => {
    const r = x + wRel;
    const b = y + hRel;
    return slots.some(
      (s) => x + EPS < s.x + s.w && s.x + EPS < r && y + EPS < s.y + s.h && s.y + EPS < b
    );
  };

  const maxY = 1 - hRel - marginRel;
  const maxX = 1 - wRel - marginRel;

  for (let y = marginRel; y <= maxY + EPS; y += step) {
    for (let x = marginRel; x <= maxX + EPS; x += step) {
      if (!overlaps(x, y)) {
        return { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) };
      }
    }
  }

  return { x: 0.05, y: 0.05 };
}

/**
 * إضافة خلية جديدة بمقاس وثيقة معتمد
 */
export function addPresetSlot(
  slots: FreeformSlot[],
  presetType: PhotoPresetType,
  paperWidthMM: number,
  paperHeightMM: number
): FreeformSlot[] {
  const dims = PHOTO_PRESET_DIMENSIONS_MM[presetType] || { w: 35, h: 45 };
  const wRel = clamp(dims.w / paperWidthMM, MIN_SIZE, 1);
  const hRel = clamp(dims.h / paperHeightMM, MIN_SIZE, 1);

  const pos = findFirstEmptySpace(slots, wRel, hRel, 0);

  const newSlot: FreeformSlot = {
    id: newSlotId("slot_" + presetType),
    x: pos.x,
    y: pos.y,
    w: Number(wRel.toFixed(4)),
    h: Number(hRel.toFixed(4)),
    presetType,
    label: PHOTO_PRESET_LABELS[presetType] || "خلية",
    rotation: 0,
  };

  return [...slots, newSlot];
}

/**
 * خوارزمية التعبئة الذكية للورقة (Smart Auto-Pack Engine)
 */
export function autoPackSlots(
  strategy: AutoPackStrategy,
  paperWidthMM: number,
  paperHeightMM: number,
  gapMM: number = 0,
  marginMM: number = 0
): FreeformSlot[] {
  const availWMM = Math.max(10, paperWidthMM - 2 * marginMM);
  const availHMM = Math.max(10, paperHeightMM - 2 * marginMM);

  const slots: FreeformSlot[] = [];

  const packUniform = (wMM: number, hMM: number, type: PhotoPresetType, label: string): FreeformSlot[] => {
    const cols = Math.max(1, Math.floor((availWMM + gapMM) / (wMM + gapMM)));
    const rows = Math.max(1, Math.floor((availHMM + gapMM) / (hMM + gapMM)));

    const result: FreeformSlot[] = [];
    const wRel = wMM / paperWidthMM;
    const hRel = hMM / paperHeightMM;
    const gapXRel = gapMM / paperWidthMM;
    const gapYRel = gapMM / paperHeightMM;
    const marginXRel = marginMM / paperWidthMM;
    const marginYRel = marginMM / paperHeightMM;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = marginXRel + c * (wRel + gapXRel);
        const y = marginYRel + r * (hRel + gapYRel);
        result.push({
          id: newSlotId("slot_pack"),
          x: Number(x.toFixed(4)),
          y: Number(y.toFixed(4)),
          w: Number(wRel.toFixed(4)),
          h: Number(hRel.toFixed(4)),
          presetType: type,
          label: `${label} ${result.length + 1}`,
          rotation: 0,
        });
      }
    }
    return result;
  };

  if (strategy === "id-max") {
    return packUniform(35, 45, "iq-national-id", "بطاقة");
  }

  if (strategy === "passport-max") {
    return packUniform(50, 50, "passport", "جواز");
  }

  if (strategy === "transactions-max") {
    return packUniform(30, 40, "iq-transactions", "معاملة");
  }

  if (strategy === "combo-standard") {
    const pW = 50;
    const pH = 50;
    const iW = 35;
    const iH = 45;

    const pCols = Math.max(1, Math.floor((availWMM + gapMM) / (pW + gapMM)));
    const pWRel = pW / paperWidthMM;
    const pHRel = pH / paperHeightMM;
    const iWRel = iW / paperWidthMM;
    const iHRel = iH / paperHeightMM;
    const gapXRel = gapMM / paperWidthMM;
    const gapYRel = gapMM / paperHeightMM;

    for (let c = 0; c < pCols; c++) {
      slots.push({
        id: newSlotId("combo_p"),
        x: Number((c * (pWRel + gapXRel)).toFixed(4)),
        y: 0,
        w: Number(pWRel.toFixed(4)),
        h: Number(pHRel.toFixed(4)),
        presetType: "passport",
        label: `جواز 5×5 (${c + 1})`,
      });
    }

    const remainingHMM = availHMM - pH - gapMM;
    if (remainingHMM >= iH) {
      const iCols = Math.max(1, Math.floor((availWMM + gapMM) / (iW + gapMM)));
      const iRows = Math.floor((remainingHMM + gapMM) / (iH + gapMM));
      const startYMM = pH + gapMM;

      for (let r = 0; r < iRows; r++) {
        for (let c = 0; c < iCols; c++) {
          const x = c * (iWRel + gapXRel);
          const y = (startYMM + r * (iH + gapMM)) / paperHeightMM;
          slots.push({
            id: newSlotId("combo_id"),
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
            w: Number(iWRel.toFixed(4)),
            h: Number(iHRel.toFixed(4)),
            presetType: "iq-national-id",
            label: `بطاقة (${slots.length + 1})`,
          });
        }
      }
    }
    return slots;
  }

  if (strategy === "combo-family") {
    const bigW = paperWidthMM >= 180 ? 100 : 60;
    const bigH = paperWidthMM >= 180 ? 150 : 90;
    const bigWRel = bigW / paperWidthMM;
    const bigHRel = bigH / paperHeightMM;

    slots.push({
      id: newSlotId("family_big"),
      x: 0,
      y: 0,
      w: Number(bigWRel.toFixed(4)),
      h: Number(bigHRel.toFixed(4)),
      presetType: "portrait-4x6",
      label: "صورة بورتريه رئيسية",
    });

    const sideWMM = availWMM - bigW - gapMM;
    if (sideWMM >= 35) {
      const sideCols = Math.floor((sideWMM + gapMM) / (35 + gapMM));
      const sideRows = Math.floor((bigH + gapMM) / (45 + gapMM));
      for (let r = 0; r < sideRows; r++) {
        for (let c = 0; c < sideCols; c++) {
          const x = (bigW + gapMM + c * (35 + gapMM)) / paperWidthMM;
          const y = (r * (45 + gapMM)) / paperHeightMM;
          slots.push({
            id: newSlotId("family_side"),
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
            w: Number((35 / paperWidthMM).toFixed(4)),
            h: Number((45 / paperHeightMM).toFixed(4)),
            presetType: "iq-national-id",
            label: `بطاقة (${slots.length + 1})`,
          });
        }
      }
    }

    const bottomHMM = availHMM - bigH - gapMM;
    if (bottomHMM >= 45) {
      const bCols = Math.floor((availWMM + gapMM) / (35 + gapMM));
      const bRows = Math.floor((bottomHMM + gapMM) / (45 + gapMM));
      for (let r = 0; r < bRows; r++) {
        for (let c = 0; c < bCols; c++) {
          const x = (c * (35 + gapMM)) / paperWidthMM;
          const y = (bigH + gapMM + r * (45 + gapMM)) / paperHeightMM;
          slots.push({
            id: newSlotId("family_bottom"),
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
            w: Number((35 / paperWidthMM).toFixed(4)),
            h: Number((45 / paperHeightMM).toFixed(4)),
            presetType: "iq-national-id",
            label: `بطاقة (${slots.length + 1})`,
          });
        }
      }
    }

    return slots;
  }

  return packUniform(35, 45, "iq-national-id", "بطاقة");
}

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
      id: newSlotId("slot_split"),
      x: target.x + halfW,
      w: halfW,
    };
    newSlots.splice(targetIndex, 1, slotA, slotB);
  } else {
    const halfH = target.h / 2;
    const slotA: FreeformSlot = { ...target, h: halfH };
    const slotB: FreeformSlot = {
      ...target,
      id: newSlotId("slot_split"),
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
  const pos = findFirstEmptySpace(slots, 0.35, 0.3);
  const newSlot: FreeformSlot = {
    id: newSlotId("slot_new"),
    x: pos.x,
    y: pos.y,
    w: 0.35,
    h: 0.3,
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
