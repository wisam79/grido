import { PIXELATE_BLOCK_PX, THRESHOLD_LEVEL } from './pixel-filters';

/**
 * Ordered image-filter contract shared by DOM/CSS previews and the Konva raster path.
 *
 * CSS filter functions are applied from left to right. Keep each recipe in the exact
 * visible order below; user adjustments are appended in brightness → contrast →
 * saturation order, matching buildCSSFilter/buildAdjustmentCSS.
 */
export const PRINT_FILTER_IDS = [
  'none',
  'enhance',
  'skinGlow',
  'clarity',
  'lowlight',
  'cinematic',
  'monoPro',
  'grayscale',
  'invert',
  'sepia',
  'pixelate',
  'threshold',
] as const;

export type PrintFilterId = (typeof PRINT_FILTER_IDS)[number];

export type PrintFilterOperation =
  | Readonly<{ kind: 'brightness'; factor: number }>
  | Readonly<{ kind: 'contrast'; factor: number }>
  | Readonly<{ kind: 'saturation'; factor: number }>
  | Readonly<{ kind: 'sepia'; amount: number }>
  | Readonly<{ kind: 'grayscale'; amount: number }>
  | Readonly<{ kind: 'invert'; amount: number }>
  | Readonly<{ kind: 'pixelate'; blockSize: number }>
  | Readonly<{ kind: 'threshold'; level: number }>;

export interface PrintFilterAdjustments {
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

const operation = <T extends PrintFilterOperation>(value: T): T => Object.freeze(value);
const recipe = (...operations: PrintFilterOperation[]): readonly PrintFilterOperation[] =>
  Object.freeze(operations);

/** Canonical base recipes in CSS/W3C execution order. */
export const PRINT_FILTER_RECIPES: Readonly<
  Record<PrintFilterId, readonly PrintFilterOperation[]>
> = Object.freeze({
  none: recipe(),
  enhance: recipe(
    operation({ kind: 'contrast', factor: 1.08 }),
    operation({ kind: 'saturation', factor: 1.12 }),
    operation({ kind: 'brightness', factor: 1.02 }),
  ),
  skinGlow: recipe(
    operation({ kind: 'brightness', factor: 1.06 }),
    operation({ kind: 'contrast', factor: 0.94 }),
    operation({ kind: 'saturation', factor: 1.08 }),
    operation({ kind: 'sepia', amount: 0.1 }),
  ),
  clarity: recipe(
    operation({ kind: 'contrast', factor: 1.22 }),
    operation({ kind: 'saturation', factor: 1.2 }),
    operation({ kind: 'brightness', factor: 0.98 }),
  ),
  lowlight: recipe(
    operation({ kind: 'brightness', factor: 1.16 }),
    operation({ kind: 'contrast', factor: 0.9 }),
    operation({ kind: 'saturation', factor: 1.05 }),
  ),
  cinematic: recipe(
    operation({ kind: 'contrast', factor: 1.1 }),
    operation({ kind: 'saturation', factor: 1.15 }),
    operation({ kind: 'sepia', amount: 0.05 }),
    operation({ kind: 'brightness', factor: 1.02 }),
  ),
  monoPro: recipe(
    operation({ kind: 'grayscale', amount: 1 }),
    operation({ kind: 'contrast', factor: 1.25 }),
    operation({ kind: 'brightness', factor: 1.02 }),
  ),
  grayscale: recipe(operation({ kind: 'grayscale', amount: 1 })),
  invert: recipe(operation({ kind: 'invert', amount: 1 })),
  sepia: recipe(operation({ kind: 'sepia', amount: 1 })),
  pixelate: recipe(operation({ kind: 'pixelate', blockSize: PIXELATE_BLOCK_PX })),
  threshold: recipe(operation({ kind: 'threshold', level: THRESHOLD_LEVEL })),
});

export function isPrintFilterId(value: string | undefined): value is PrintFilterId {
  return PRINT_FILTER_IDS.includes(value as PrintFilterId);
}

export function getPrintFilterRecipe(filter: string | undefined): readonly PrintFilterOperation[] {
  return isPrintFilterId(filter) ? PRINT_FILTER_RECIPES[filter] : PRINT_FILTER_RECIPES.none;
}

/**
 * Base recipe first, then user controls in the same order emitted by
 * buildAdjustmentCSS. Values are percentages in persisted editor state.
 */
export function getOrderedPrintFilterOperations(
  filter: string | undefined,
  adjustments: PrintFilterAdjustments = {},
): readonly PrintFilterOperation[] {
  const operations = [...getPrintFilterRecipe(filter)];

  if (adjustments.brightness !== undefined && adjustments.brightness !== 100) {
    operations.push(operation({ kind: 'brightness', factor: adjustments.brightness / 100 }));
  }
  if (adjustments.contrast !== undefined && adjustments.contrast !== 100) {
    operations.push(operation({ kind: 'contrast', factor: adjustments.contrast / 100 }));
  }
  if (adjustments.saturation !== undefined && adjustments.saturation !== 100) {
    operations.push(operation({ kind: 'saturation', factor: adjustments.saturation / 100 }));
  }

  return operations;
}

function percentage(amount: number): string {
  return `${amount * 100}%`;
}

/**
 * CSS representation used by IMAGE_FILTERS. Pixelate and threshold have no exact
 * CSS primitive, so their long-standing DOM-preview fallbacks remain explicit.
 * Konva/print use the canonical pixel operations above instead.
 */
export function printFilterRecipeToCSS(filter: PrintFilterId): string {
  const parts: string[] = [];

  for (const item of PRINT_FILTER_RECIPES[filter]) {
    switch (item.kind) {
      case 'brightness':
        parts.push(`brightness(${item.factor})`);
        break;
      case 'contrast':
        parts.push(`contrast(${item.factor})`);
        break;
      case 'saturation':
        parts.push(`saturate(${item.factor})`);
        break;
      case 'sepia':
        parts.push(`sepia(${percentage(item.amount)})`);
        break;
      case 'grayscale':
        parts.push(`grayscale(${percentage(item.amount)})`);
        break;
      case 'invert':
        parts.push(`invert(${percentage(item.amount)})`);
        break;
      case 'pixelate':
        parts.push('blur(3px)');
        break;
      case 'threshold':
        parts.push('grayscale(100%)', 'contrast(200%)');
        break;
    }
  }

  return parts.join(' ');
}
