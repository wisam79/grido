import type { CanvasSlot } from '@/lib/store/types';

/**
 * محتوى الصورة القابل للنقل بين الخانات. هندسة الخانة وهويتها ولونها
 * خصائص للتخطيط، لذلك لا تنتقل مع الصورة عند الفرز أو التبديل.
 */
export interface CollageSlotImageContent {
  imageSrc?: string;
  originalImageSrc?: string;
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  zoom: number;
  dragX: number;
  dragY: number;
  flipX: boolean;
  flipY: boolean;
  rotation: number;
}

export function readCollageSlotImageContent(slot: CanvasSlot): CollageSlotImageContent {
  return {
    imageSrc: slot.imageSrc,
    originalImageSrc: slot.originalImageSrc,
    filter: slot.filter ?? 'none',
    brightness: slot.brightness ?? 100,
    contrast: slot.contrast ?? 100,
    saturation: slot.saturation ?? 100,
    zoom: slot.zoom ?? 1,
    dragX: slot.dragX ?? 0,
    dragY: slot.dragY ?? 0,
    flipX: slot.flipX ?? false,
    flipY: slot.flipY ?? false,
    rotation: slot.rotation ?? 0,
  };
}

export function applyCollageSlotImageContent(
  slot: CanvasSlot,
  content: CollageSlotImageContent | undefined,
): CanvasSlot {
  const normalized = content ?? {
    imageSrc: undefined,
    originalImageSrc: undefined,
    filter: 'none',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    zoom: 1,
    dragX: 0,
    dragY: 0,
    flipX: false,
    flipY: false,
    rotation: 0,
  };
  return { ...slot, ...normalized };
}

export function collageSlotImageContentEqual(
  a: CollageSlotImageContent | undefined,
  b: CollageSlotImageContent | undefined,
): boolean {
  if (!a || !b) return a === b;
  return (
    a.imageSrc === b.imageSrc &&
    a.originalImageSrc === b.originalImageSrc &&
    a.filter === b.filter &&
    a.brightness === b.brightness &&
    a.contrast === b.contrast &&
    a.saturation === b.saturation &&
    a.zoom === b.zoom &&
    a.dragX === b.dragX &&
    a.dragY === b.dragY &&
    a.flipX === b.flipX &&
    a.flipY === b.flipY &&
    a.rotation === b.rotation
  );
}
