import type { FreeformSlot, PhotoPresetType, AutoPackStrategy } from '../../types';
import { clamp } from '@/lib/clamp';
import { MIN_SIZE } from './constants';
import { newSlotId } from './slot-ids';
import { PHOTO_PRESET_DIMENSIONS_MM, PHOTO_PRESET_LABELS } from './photo-presets';

/**
 * البحث عن أول مساحة شاغرة على الورقة لإدراج خلية جديدة دون تداخل
 */
export function findFirstEmptySpace(
  slots: FreeformSlot[],
  wRel: number,
  hRel: number,
  marginRel: number = 0,
): { x: number; y: number } {
  const step = 0.02; // دقة مسح 2%
  const EPS = 1e-4;

  const overlaps = (x: number, y: number): boolean => {
    const r = x + wRel;
    const b = y + hRel;
    return slots.some(
      (s) => x + EPS < s.x + s.w && s.x + EPS < r && y + EPS < s.y + s.h && s.y + EPS < b,
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
  paperHeightMM: number,
): FreeformSlot[] {
  const dims = PHOTO_PRESET_DIMENSIONS_MM[presetType] || { w: 35, h: 45 };
  const wRel = clamp(dims.w / paperWidthMM, MIN_SIZE, 1);
  const hRel = clamp(dims.h / paperHeightMM, MIN_SIZE, 1);

  const pos = findFirstEmptySpace(slots, wRel, hRel, 0);

  const newSlot: FreeformSlot = {
    id: newSlotId('slot_' + presetType),
    x: pos.x,
    y: pos.y,
    w: Number(wRel.toFixed(4)),
    h: Number(hRel.toFixed(4)),
    presetType,
    label: PHOTO_PRESET_LABELS[presetType] || 'خلية',
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
  marginMM: number = 0,
): FreeformSlot[] {
  const availWMM = Math.max(10, paperWidthMM - 2 * marginMM);
  const availHMM = Math.max(10, paperHeightMM - 2 * marginMM);

  const slots: FreeformSlot[] = [];

  const packUniform = (
    wMM: number,
    hMM: number,
    type: PhotoPresetType,
    label: string,
  ): FreeformSlot[] => {
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
          id: newSlotId('slot_pack'),
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

  if (strategy === 'id-max') {
    return packUniform(35, 45, 'iq-national-id', 'بطاقة');
  }

  if (strategy === 'passport-max') {
    return packUniform(35, 45, 'passport', 'جواز');
  }

  if (strategy === 'transactions-max') {
    return packUniform(30, 40, 'iq-transactions', 'معاملة');
  }

  if (strategy === 'wallet-max') {
    return packUniform(54, 86, 'wallet', 'محفظة');
  }

  if (strategy === 'combo-standard') {
    const pW = 35;
    const pH = 45;
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
        id: newSlotId('combo_p'),
        x: Number((c * (pWRel + gapXRel)).toFixed(4)),
        y: 0,
        w: Number(pWRel.toFixed(4)),
        h: Number(pHRel.toFixed(4)),
        presetType: 'passport',
        label: `جواز 3.5×4.5 (${c + 1})`,
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
            id: newSlotId('combo_id'),
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
            w: Number(iWRel.toFixed(4)),
            h: Number(iHRel.toFixed(4)),
            presetType: 'iq-national-id',
            label: `بطاقة (${slots.length + 1})`,
          });
        }
      }
    }
    return slots;
  }

  if (strategy === 'combo-family') {
    const bigW = paperWidthMM >= 180 ? 100 : 60;
    const bigH = paperWidthMM >= 180 ? 150 : 90;
    const bigWRel = bigW / paperWidthMM;
    const bigHRel = bigH / paperHeightMM;

    slots.push({
      id: newSlotId('family_big'),
      x: 0,
      y: 0,
      w: Number(bigWRel.toFixed(4)),
      h: Number(bigHRel.toFixed(4)),
      presetType: 'portrait-4x6',
      label: 'صورة بورتريه رئيسية',
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
            id: newSlotId('family_side'),
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
            w: Number((35 / paperWidthMM).toFixed(4)),
            h: Number((45 / paperHeightMM).toFixed(4)),
            presetType: 'iq-national-id',
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
            id: newSlotId('family_bottom'),
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
            w: Number((35 / paperWidthMM).toFixed(4)),
            h: Number((45 / paperHeightMM).toFixed(4)),
            presetType: 'iq-national-id',
            label: `بطاقة (${slots.length + 1})`,
          });
        }
      }
    }

    return slots;
  }

  return packUniform(35, 45, 'iq-national-id', 'بطاقة');
}

export function splitSlot(
  slots: FreeformSlot[],
  targetSlotId: string,
  direction: 'horizontal' | 'vertical',
): FreeformSlot[] {
  const targetIndex = slots.findIndex((s) => s.id === targetSlotId);
  if (targetIndex === -1) return slots;

  const target = slots[targetIndex];
  const newSlots = [...slots];

  if (direction === 'horizontal') {
    const halfW = target.w / 2;
    const slotA: FreeformSlot = { ...target, w: halfW };
    const slotB: FreeformSlot = {
      ...target,
      id: newSlotId('slot_split'),
      x: target.x + halfW,
      w: halfW,
    };
    newSlots.splice(targetIndex, 1, slotA, slotB);
  } else {
    const halfH = target.h / 2;
    const slotA: FreeformSlot = { ...target, h: halfH };
    const slotB: FreeformSlot = {
      ...target,
      id: newSlotId('slot_split'),
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
    id: newSlotId('slot_new'),
    x: pos.x,
    y: pos.y,
    w: 0.35,
    h: 0.3,
    presetType: 'id',
    label: 'خلية جديدة',
  };
  return [...slots, newSlot];
}
