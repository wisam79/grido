/** Shared image/geometry adapters for print and the lazy-loaded export dialog. */
import { pxToMm } from '@/lib/canvas/units';
import { computeCollageSlotRectMM } from '@/lib/print/print-layout-math';

import { getSlotExportSize } from './export-slot';

import type { CollageImageLoadResult, CollageRenderOptions } from './export-canvas-collage';
import type { SlotRectMM } from '@/lib/print/print-layout-math';

export { loadCollageSlotImages } from './export-canvas-collage';
export { runCollagePreflight } from './collage-preflight';

/** Browser-decoded full sources are already EXIF-oriented, unlike raw file headers.
 * Do not rely on the optional metadata cache, or swap width/height a second time.
 */
export function getLoadedImageDimensions(
  slots: CollageRenderOptions['slots'],
  loaded: CollageImageLoadResult['loaded'],
): Map<string, { width: number; height: number }> {
  const dimensions = new Map<string, { width: number; height: number }>();
  for (const slot of slots) {
    const image = loaded.get(slot.id);
    if (slot.imageSrc && image) {
      dimensions.set(slot.imageSrc, {
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    }
  }
  return dimensions;
}

/** RGB/CMYK export at canvas pixel size; batch uses each slot's actual bitmap size.
 * Bleed adds pixels outside the design without scaling its contents.
 */
export function getCollageExportSlotRectsMM(
  opts: CollageRenderOptions,
  dpi: number,
  separateSlots: boolean,
): Map<string, SlotRectMM> {
  return new Map(
    opts.slots.map((slot) => {
      if (separateSlots) {
        const size = getSlotExportSize(slot, opts);
        return [
          slot.id,
          { xMM: 0, yMM: 0, wMM: pxToMm(size.width, dpi), hMM: pxToMm(size.height, dpi) },
        ];
      }
      return [
        slot.id,
        computeCollageSlotRectMM(slot, {
          canvasWidth: opts.canvasWidth,
          canvasHeight: opts.canvasHeight,
          imageWidthMM: pxToMm(opts.canvasWidth, dpi),
          imageHeightMM: pxToMm(opts.canvasHeight, dpi),
          collageMargin: opts.collageMargin ?? 0,
          collageGap: opts.collageGap ?? 0,
          hasPhysical: Boolean(opts.collageTemplate?.physicalLayout),
        }),
      ];
    }),
  );
}
