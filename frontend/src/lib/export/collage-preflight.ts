import { computeSlotCrop } from './export-primitives';

import type { useEditorStore } from '@/lib/editor-store';

/* ═══════════════════════════════════════════════════════════════
   فحص محتوى الكولاج قبل الطباعة والتصدير — مصدر واحد للتحذيرات.

   التصنيف:
   - blocking: مصدر غير مقروء — الناتج سيكون ناقصاً بصمت.
   - warnings: خانات فارغة مقصودة، أو دقة فعالة منخفضة بعد القص.
   ═══════════════════════════════════════════════════════════════ */

type StoreState = ReturnType<typeof useEditorStore.getState>;

export interface CollagePreflightInput {
  slots: StoreState['slots'];
  canvasWidth: number;
  canvasHeight: number;
  /** أبعاد المصدر الفعلية بعد EXIF — من GetImageDimensions أو الكاش */
  imageDimensions: Map<string, { width: number; height: number }>;
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

const MM_PER_INCH = 25.4;

export function runCollagePreflight(input: CollagePreflightInput): CollagePreflightResult {
  const {
    slots,
    canvasWidth,
    canvasHeight,
    imageDimensions,
    failedSlotIds = [],
    minDpi = 250,
  } = input;
  const blocking: CollagePreflightIssue[] = [];
  const warnings: CollagePreflightIssue[] = [];
  const failedSet = new Set(failedSlotIds);

  for (const slot of slots) {
    const widthMM = slot.w * canvasWidth;
    const heightMM = slot.h * canvasHeight;
    if (!(widthMM > 0) || !(heightMM > 0)) continue;

    if (!slot.imageSrc) {
      warnings.push({
        slotId: slot.id,
        kind: 'empty',
        message: `خانة ${slot.cellIndex + 1} فارغة`,
      });
      continue;
    }

    if (failedSet.has(slot.id)) {
      blocking.push({
        slotId: slot.id,
        kind: 'unreadable',
        message: `تعذر قراءة صورة الخانة ${slot.cellIndex + 1}`,
      });
      continue;
    }

    const dims = imageDimensions.get(slot.imageSrc);
    if (!dims || !(dims.width > 0) || !(dims.height > 0)) continue;

    // الدقة الفعلية: أبعاد المصدر بعد منطقة القص (zoom/drag) مقابل المقاس الفيزيائي.
    // نستخدم نفس هندسة القص في التصدير (computeSlotCrop) عبر SlotTransform المكافئ.
    const mockImg = { width: dims.width, height: dims.height } as HTMLImageElement;
    const crop = computeSlotCrop(mockImg, widthMM, heightMM, {
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
