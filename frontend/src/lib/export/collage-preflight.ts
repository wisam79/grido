import { MM_PER_INCH } from '@/lib/canvas/units';

import { computeSlotCrop } from './export-primitives';

import type { useEditorStore } from '@/lib/editor-store';
import type { SlotRectMM } from '@/lib/print/print-layout-math';

/* ═══════════════════════════════════════════════════════════════
   فحص محتوى الكولاج قبل الطباعة والتصدير — مصدر واحد للتحذيرات.

   التصنيف:
   - blocking: مصدر غير مقروء — الناتج سيكون ناقصاً بصمت.
   - warnings: خانات فارغة مقصودة، أو دقة فعالة منخفضة بعد القص.
   ═══════════════════════════════════════════════════════════════ */

type StoreState = ReturnType<typeof useEditorStore.getState>;

export interface CollagePreflightInput {
  slots: StoreState['slots'];
  /** Final physical LOCAL draw rect per slot, not a rotated bounding box or page size. */
  slotRectsMM: ReadonlyMap<string, SlotRectMM>;
  /** Full-resolution decoded dimensions, already oriented by EXIF (never swap again). */
  imageDimensions: ReadonlyMap<string, { width: number; height: number }>;
  /** مصادر فشل تحميلها فعلياً (من loadCollageSlotImages) */
  failedSlotIds?: string[];
  /** أصغر دقة مقبولة للطباعة (افتراضي 250DPI للطباعة الاحترافية) */
  minDpi?: number;
}

export interface CollagePreflightIssue {
  slotId: string;
  kind: 'unreadable' | 'empty' | 'low-resolution';
  message: string;
}

export interface CollagePreflightResult {
  blocking: CollagePreflightIssue[];
  warnings: CollagePreflightIssue[];
}

export function runCollagePreflight(input: CollagePreflightInput): CollagePreflightResult {
  const { slots, slotRectsMM, imageDimensions, failedSlotIds = [], minDpi = 250 } = input;
  const blocking: CollagePreflightIssue[] = [];
  const warnings: CollagePreflightIssue[] = [];
  const failedSet = new Set(failedSlotIds);

  for (const slot of slots) {
    if (!slot.imageSrc) {
      warnings.push({
        slotId: slot.id,
        kind: 'empty',
        message: `خانة ${slot.cellIndex + 1} فارغة`,
      });
      continue;
    }

    const dims = imageDimensions.get(slot.imageSrc);
    if (
      failedSet.has(slot.id) ||
      !dims ||
      !(dims.width > 0 && Number.isFinite(dims.width)) ||
      !(dims.height > 0 && Number.isFinite(dims.height))
    ) {
      blocking.push({
        slotId: slot.id,
        kind: 'unreadable',
        message: `تعذر قراءة صورة الخانة ${slot.cellIndex + 1}`,
      });
      continue;
    }

    const rect = slotRectsMM.get(slot.id);
    if (!rect || !(rect.wMM > 0) || !(rect.hMM > 0)) continue;
    const { wMM: widthMM, hMM: heightMM } = rect;

    // computeSlotCrop handles user rotation; drawSlotImageLocal still draws to w × h.
    // Compare each source crop axis to that LOCAL dimension, not a rotated bounding box.
    const crop = computeSlotCrop(dims, widthMM, heightMM, {
      zoom: slot.zoom,
      dragX: slot.dragX,
      dragY: slot.dragY,
      flipX: slot.flipX,
      flipY: slot.flipY,
      rotation: slot.rotation,
    });
    const dpiX = crop.sw / (widthMM / MM_PER_INCH);
    const dpiY = crop.sh / (heightMM / MM_PER_INCH);
    const effectiveDpi = Math.min(dpiX, dpiY);
    if (Number.isFinite(effectiveDpi) && effectiveDpi < minDpi) {
      warnings.push({
        slotId: slot.id,
        kind: 'low-resolution',
        message: `دقة الخانة ${slot.cellIndex + 1} ≈ ${Math.round(effectiveDpi)}DPI (أقل من ${minDpi})`,
      });
    }
  }

  return { blocking, warnings };
}
