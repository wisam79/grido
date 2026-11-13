import { createOrderedPrintFilter, type OrderedPrintFilterFn } from './custom-filters';
import { PIXELATE_BLOCK_PX, THRESHOLD_LEVEL } from './pixel-filters';
import {
  getOrderedPrintFilterOperations,
  type PrintFilterOperation,
} from './print-filter-contract';
import type Konva from 'konva';
import type { Filter, FilterFunction } from 'konva/lib/Node';

export interface FilterOptions {
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

/** فلتر Konva مركّب يحمل تسلسله المصدر للتحقق والتوثيق. */
export interface ComposedPixelFilter extends FilterFunction {
  /** الفلاتر الأصلية بالترتيب الحرفي الذي يحفظه المركّب. */
  composedFrom: readonly Filter[];
}

/**
 * Compose an ordered chain into the single callback Konva needs for one cache pass.
 * Every callback still runs in source order; no normalization or kind reordering is
 * allowed. Spatial operations therefore remain at their exact position too.
 */
export function composePixelFilters(fns: readonly Filter[]): ComposedPixelFilter | null {
  if (fns.length < 2) return null;

  const composed = function (this: Konva.Node, imageData: ImageData) {
    for (const fn of fns) {
      (fn as FilterFunction).call(this, imageData);
    }
  } as ComposedPixelFilter;
  composed.composedFrom = fns;
  return composed;
}

export interface KonvaFilterResult {
  filters: Filter[];
  /** Canonical base recipe followed by user brightness/contrast/saturation. */
  operations: readonly PrintFilterOperation[];
  brightness: number;
  contrast: number;
  saturation: number;
  sepiaRatio: number;
  pixelSize: number;
  threshold: number;
}

export function getKonvaFilters(options: FilterOptions): KonvaFilterResult {
  const operations = getOrderedPrintFilterOperations(options.filter, options);
  const orderedFilters: OrderedPrintFilterFn[] = operations.map(createOrderedPrintFilter);
  const composed = composePixelFilters(orderedFilters);

  // Compatibility metadata for the existing Konva.Image props. The generated
  // callbacks carry their own immutable parameters, so repeated operations (for
  // example recipe brightness followed by user brightness) cannot overwrite one
  // another through a shared node attribute.
  let brightnessFactor = 1;
  let contrastFactor = 1;
  let saturationFactor = 1;
  let sepiaRatio = 0;
  let pixelSize = PIXELATE_BLOCK_PX;
  let threshold = THRESHOLD_LEVEL;

  for (const item of operations) {
    switch (item.kind) {
      case 'brightness':
        brightnessFactor *= item.factor;
        break;
      case 'contrast':
        contrastFactor *= item.factor;
        break;
      case 'saturation':
        saturationFactor *= item.factor;
        break;
      case 'sepia':
        sepiaRatio = item.amount;
        break;
      case 'pixelate':
        pixelSize = item.blockSize;
        break;
      case 'threshold':
        threshold = item.level;
        break;
      case 'grayscale':
      case 'invert':
        break;
    }
  }

  return {
    filters: composed ? [composed] : orderedFilters,
    operations,
    brightness: brightnessFactor,
    contrast: (contrastFactor - 1) * 100,
    saturation: saturationFactor - 1,
    sepiaRatio,
    pixelSize,
    threshold,
  };
}
