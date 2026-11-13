import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  applyPrintFilterOperation,
  createOrderedPrintFilter,
} from '../src/lib/filters/custom-filters';
import {
  composePixelFilters,
  getKonvaFilters,
  type ComposedPixelFilter,
} from '../src/lib/filters/konva-filters';
import {
  getOrderedPrintFilterOperations,
  PRINT_FILTER_IDS,
  printFilterRecipeToCSS,
  type PrintFilterId,
  type PrintFilterOperation,
} from '../src/lib/filters/print-filter-contract';
import { IMAGE_FILTERS } from '../src/lib/templates/constants';
import type { FilterFunction } from 'konva/lib/Node';

interface TestImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const imageData = (bytes: Iterable<number>, width = 1, height = 1): TestImageData => ({
  width,
  height,
  data: new Uint8ClampedArray(bytes),
});

function runOperations(
  bytes: Iterable<number>,
  operations: readonly PrintFilterOperation[],
): Uint8ClampedArray {
  const output = imageData(bytes);
  for (const operation of operations) {
    applyPrintFilterOperation(output as ImageData, operation);
  }
  return output.data;
}

const FILTER_FIXTURE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../test-fixtures/print-rgba/filters',
);

function fixtureBytes(name: string): Uint8ClampedArray {
  return new Uint8ClampedArray(readFileSync(resolve(FILTER_FIXTURE_DIR, name)));
}

function expectFixtureParity(
  actual: Uint8ClampedArray,
  expected: Uint8ClampedArray,
  rgbTolerance: number,
): void {
  expect(actual).toHaveLength(expected.length);
  for (let index = 0; index < actual.length; index += 1) {
    const tolerance = index % 4 === 3 ? 0 : rgbTolerance;
    expect(Math.abs(actual[index] - expected[index]), `byte ${index}`).toBeLessThanOrEqual(
      tolerance,
    );
  }
}

describe('canonical print-filter contract', () => {
  it('derives the CSS catalog from the complete ordered recipe set', () => {
    expect(IMAGE_FILTERS.map(({ id }) => id)).toEqual(PRINT_FILTER_IDS);
    for (const entry of IMAGE_FILTERS) {
      expect(entry.css).toBe(printFilterRecipeToCSS(entry.id as PrintFilterId));
      expect(entry.preview).toBe(entry.css);
    }

    expect(printFilterRecipeToCSS('enhance')).toBe(
      'contrast(1.08) saturate(1.12) brightness(1.02)',
    );
    expect(printFilterRecipeToCSS('skinGlow')).toBe(
      'brightness(1.06) contrast(0.94) saturate(1.08) sepia(10%)',
    );
    expect(printFilterRecipeToCSS('cinematic')).toBe(
      'contrast(1.1) saturate(1.15) sepia(5%) brightness(1.02)',
    );
  });

  it('keeps base operations before user adjustments without normalization', () => {
    const operations = getOrderedPrintFilterOperations('skinGlow', {
      brightness: 120,
      contrast: 80,
      saturation: 140,
    });

    expect(operations).toEqual([
      { kind: 'brightness', factor: 1.06 },
      { kind: 'contrast', factor: 0.94 },
      { kind: 'saturation', factor: 1.08 },
      { kind: 'sepia', amount: 0.1 },
      { kind: 'brightness', factor: 1.2 },
      { kind: 'contrast', factor: 0.8 },
      { kind: 'saturation', factor: 1.4 },
    ]);

    const result = getKonvaFilters({
      filter: 'skinGlow',
      brightness: 120,
      contrast: 80,
      saturation: 140,
    });
    expect(result.operations).toEqual(operations);
    const composed = result.filters[0] as ComposedPixelFilter;
    expect(composed.composedFrom).toHaveLength(operations.length);
  });

  it('is mutation-sensitive to operation order and preserves transparent RGB plus alpha', () => {
    const canonical = getOrderedPrintFilterOperations('skinGlow', {
      brightness: 120,
      contrast: 80,
      saturation: 140,
    });
    const reordered = [canonical[3], ...canonical.slice(0, 3), ...canonical.slice(4)];

    const source = [240, 80, 30, 0];
    expect([...runOperations(source, canonical)]).toEqual([255, 107, 37, 0]);
    expect([...runOperations(source, reordered)]).toEqual([255, 104, 34, 0]);
  });

  it('executes the composed Konva callback in the same exact operation order', () => {
    const operations = getOrderedPrintFilterOperations('cinematic', { contrast: 80 });
    const filters = operations.map(createOrderedPrintFilter);
    const composed = composePixelFilters(filters);
    const sequential = imageData([23, 117, 241, 37]);
    const optimized = imageData([23, 117, 241, 37]);

    for (const filter of filters) {
      (filter as FilterFunction).call({} as never, sequential as ImageData);
    }
    composed!.call({} as never, optimized as ImageData);

    expect(optimized.data).toEqual(sequential.data);
    expect(optimized.data[3]).toBe(37);
  });

  it.each([
    ['brightness', { kind: 'brightness', factor: 1.2 }, 1],
    ['contrast', { kind: 'contrast', factor: 1.25 }, 1],
    ['saturation', { kind: 'saturation', factor: 1.4 }, 1],
    ['sepia', { kind: 'sepia', amount: 1 }, 1],
    ['grayscale', { kind: 'grayscale', amount: 1 }, 1],
    ['invert', { kind: 'invert', amount: 1 }, 0],
    ['threshold', { kind: 'threshold', level: 0.5 }, 0],
    ['pixelate', { kind: 'pixelate', blockSize: 10 }, 0],
  ] as const)('matches the independent %s RGBA fixture', (name, operation, rgbTolerance) => {
    const source = fixtureBytes('source-21x21.rgba');
    const output = imageData(source, 21, 21);
    applyPrintFilterOperation(output as ImageData, operation);

    expectFixtureParity(output.data, fixtureBytes(`expected-${name}.rgba`), rgbTolerance);
  });
});
