import { SquaresFour } from '@/components/ui/icons';
import { clamp } from '@/lib/clamp';

import { MIN_SIZE } from './constants';
import { newSlotId } from './slot-ids';

import type { FreeformSlot, FreeformLayout, FreeformLayoutFile } from '../../types';
import type { CollageTemplate } from '@/lib/templates';

export function convertToGridoTemplate(layout: FreeformLayout): CollageTemplate {
  return {
    id: 'freeform-' + layout.id,
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
    icon: SquaresFour,
    metadata: {
      version: 1,
      kind: 'freeform',
      paperWidthMM: layout.paperWidthMM,
      paperHeightMM: layout.paperHeightMM,
      showCutLines: layout.showCutLines,
      enableSnapping: layout.enableSnapping,
      packGapMM: layout.packGapMM,
      packMarginMM: layout.packMarginMM,
      slotOptions: layout.slots.map(({ color, lockAspect }) => ({ color, lockAspect })),
    },
  };
}

/* ========================================================================== */
/*  تصدير واستيراد تخطيط الكولاج الحر (JSON Interchange)                       */
/* ========================================================================== */

/** تحويل التخطيط الحالي إلى صيغة ملف JSON قابلة للمشاركة */
export function exportLayoutFile(
  name: string,
  paperWidthMM: number,
  paperHeightMM: number,
  slots: FreeformSlot[],
  options?: Pick<FreeformLayout, 'showCutLines' | 'enableSnapping' | 'packGapMM' | 'packMarginMM'>,
): FreeformLayoutFile {
  return {
    format: 'grido-freeform',
    version: 1,
    name: name || 'كولاج حر',
    paperWidthMM,
    paperHeightMM,
    slots: slots.map((s) => ({
      x: Number(s.x.toFixed(4)),
      y: Number(s.y.toFixed(4)),
      w: Number(s.w.toFixed(4)),
      h: Number(s.h.toFixed(4)),
      label: s.label,
      presetType: s.presetType,
      rotation: s.rotation ?? 0,
      color: s.color,
      lockAspect: s.lockAspect,
    })),
    showCutLines: options?.showCutLines,
    enableSnapping: options?.enableSnapping,
    gapMM: options?.packGapMM,
    marginMM: options?.packMarginMM,
  };
}

/** التحقق من صحة ملف مستورد وإرجاع بياناته الآمنة — null إن كان الملف غير صالح */
export function parseLayoutFile(raw: string): FreeformLayoutFile | null {
  try {
    const data = JSON.parse(raw) as Partial<FreeformLayoutFile>;
    if (data.format !== 'grido-freeform' || !Array.isArray(data.slots)) return null;
    const pw = Number(data.paperWidthMM);
    const ph = Number(data.paperHeightMM);
    if (
      !Number.isFinite(pw) ||
      !Number.isFinite(ph) ||
      pw < 20 ||
      ph < 20 ||
      pw > 1000 ||
      ph > 1000
    )
      return null;
    if (data.slots.length === 0 || data.slots.length > 200) return null;

    const slots = data.slots
      .map((s) => ({
        x: clamp(Number(s.x) || 0, 0, 1),
        y: clamp(Number(s.y) || 0, 0, 1),
        w: clamp(Number(s.w) || 0.1, MIN_SIZE, 1),
        h: clamp(Number(s.h) || 0.1, MIN_SIZE, 1),
        label: typeof s.label === 'string' ? s.label.slice(0, 60) : undefined,
        presetType: s.presetType,
        rotation: (s.rotation === 90 || s.rotation === 180 || s.rotation === 270
          ? s.rotation
          : 0) as 0 | 90 | 180 | 270,
        color: typeof s.color === 'string' ? s.color.slice(0, 32) : undefined,
        lockAspect: Boolean(s.lockAspect),
      }))
      .map((s) => ({ ...s, x: Math.min(s.x, 1 - s.w), y: Math.min(s.y, 1 - s.h) }));

    return {
      format: 'grido-freeform',
      version: 1,
      name:
        typeof data.name === 'string' && data.name.trim() ? data.name.slice(0, 80) : 'كولاج مستورد',
      paperWidthMM: Math.round(pw),
      paperHeightMM: Math.round(ph),
      gapMM: Number(data.gapMM) || 0,
      marginMM: Number(data.marginMM) || 0,
      showCutLines: Boolean(data.showCutLines),
      enableSnapping: data.enableSnapping !== false,
      slots,
    };
  } catch {
    return null;
  }
}

/** توليد خلايا جديدة بمعرفات فريدة من ملف مستورد */
export function slotsFromFile(file: FreeformLayoutFile): FreeformSlot[] {
  return file.slots.map((s) => ({
    id: newSlotId('slot_imp'),
    x: s.x,
    y: s.y,
    w: s.w,
    h: s.h,
    label: s.label,
    presetType: s.presetType,
    rotation: s.rotation,
    color: s.color,
    lockAspect: s.lockAspect,
  }));
}

export function slotsFromGridoTemplate(template: CollageTemplate): FreeformSlot[] {
  const options = template.metadata?.slotOptions ?? [];
  return template.cells.map((cell, index) => ({
    id: newSlotId('slot_edit'),
    sourceSlotId: undefined,
    x: cell.x,
    y: cell.y,
    w: cell.w,
    h: cell.h,
    label: cell.label,
    presetType: cell.presetType as FreeformSlot['presetType'],
    rotation: (cell.rotation === 90 || cell.rotation === 180 || cell.rotation === 270
      ? cell.rotation
      : 0) as 0 | 90 | 180 | 270,
    color: options[index]?.color,
    lockAspect: options[index]?.lockAspect,
  }));
}
