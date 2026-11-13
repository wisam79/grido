import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { computeSlotCrop } from '../src/lib/export/export-primitives';
import {
  applyPrintFilterOperation,
  createOrderedPrintFilter,
} from '../src/lib/filters/custom-filters';
import { composePixelFilters, type ComposedPixelFilter } from '../src/lib/filters/konva-filters';
import {
  getOrderedPrintFilterOperations,
  type PrintFilterOperation,
} from '../src/lib/filters/print-filter-contract';
import type { FilterFunction } from 'konva/lib/Node';

interface FixtureFile {
  path: string;
  width: number;
  height: number;
  stride: number;
  byteLength: number;
  sha256: string;
}

interface ComparisonPolicy {
  maxAbsoluteErrorByChannel: Record<'R' | 'G' | 'B' | 'A', number>;
}

interface CoverCase {
  id: string;
  source: string;
  expected: string;
  parameters: {
    targetWidth: number;
    targetHeight: number;
    crop: { x: number; y: number; width: number; height: number };
    flipX: boolean;
    flipY: boolean;
  };
  comparisonPolicy: string;
}

interface FilterCase {
  id: string;
  source: string;
  expected: string;
  operation: PrintFilterOperation['kind'] | 'identity';
  parameters: Record<string, unknown>;
  comparisonPolicy: string;
}

interface FixtureManifest {
  files: FixtureFile[];
  comparisonPolicies: Record<string, ComparisonPolicy>;
  suites: {
    cover: { cases: CoverCase[] };
    filters: { cases: FilterCase[] };
  };
}

interface RGBAImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const FIXTURE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../test-fixtures/print-rgba',
);
const manifest = JSON.parse(
  readFileSync(resolve(FIXTURE_ROOT, 'manifest.json'), 'utf8'),
) as FixtureManifest;
const fileByPath = new Map(manifest.files.map((file) => [file.path, file]));

function fixtureImage(path: string): RGBAImage {
  const record = fileByPath.get(path);
  if (!record) throw new Error(`unmanifested fixture: ${path}`);
  const bytes = readFileSync(resolve(FIXTURE_ROOT, path));
  expect(bytes).toHaveLength(record.byteLength);
  expect(record.stride).toBe(record.width * 4);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
  return {
    width: record.width,
    height: record.height,
    data: new Uint8ClampedArray(bytes),
  };
}

function expectRGBAParity(
  actual: Uint8ClampedArray,
  expected: Uint8ClampedArray,
  policyName: string,
  ignoredPixels: ReadonlySet<number> = new Set(),
): void {
  const policy = manifest.comparisonPolicies[policyName];
  if (!policy) throw new Error(`unknown comparison policy: ${policyName}`);
  expect(actual).toHaveLength(expected.length);

  let squaredRgbError = 0;
  let comparedRgbChannels = 0;
  let mismatchedBytes = 0;
  for (let index = 0; index < actual.length; index += 1) {
    const pixel = Math.floor(index / 4);
    if (ignoredPixels.has(pixel)) continue;
    const channel = (['R', 'G', 'B', 'A'] as const)[index % 4];
    const delta = Math.abs(actual[index] - expected[index]);
    if (delta !== 0) mismatchedBytes += 1;
    expect(delta, `byte ${index} (${channel})`).toBeLessThanOrEqual(
      policy.maxAbsoluteErrorByChannel[channel],
    );
    if (channel !== 'A') {
      squaredRgbError += delta * delta;
      comparedRgbChannels += 1;
    }
  }

  const rmse = Math.sqrt(squaredRgbError / Math.max(1, comparedRgbChannels));
  expect(rmse).toBeLessThan(2);
  if (policyName === 'exact-rgba') expect(mismatchedBytes).toBe(0);
}

function renderIntegralCoverFixture(testCase: CoverCase): RGBAImage {
  const source = fixtureImage(testCase.source);
  const { targetWidth, targetHeight, flipX, flipY } = testCase.parameters;
  const crop = computeSlotCrop(source, targetWidth, targetHeight, {});
  expect(crop).toEqual({
    sx: testCase.parameters.crop.x,
    sy: testCase.parameters.crop.y,
    sw: testCase.parameters.crop.width,
    sh: testCase.parameters.crop.height,
  });

  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      // Canonical operation order is crop first, then flip the output axes.
      const sourceX = crop.sx + (flipX ? targetWidth - 1 - x : x);
      const sourceY = crop.sy + (flipY ? targetHeight - 1 - y : y);
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = (y * targetWidth + x) * 4;
      output.set(source.data.subarray(sourceIndex, sourceIndex + 4), targetIndex);
    }
  }
  return { width: targetWidth, height: targetHeight, data: output };
}

function operationFromFixture(testCase: FilterCase): PrintFilterOperation | null {
  const params = testCase.parameters;
  switch (testCase.operation) {
    case 'identity':
      return null;
    case 'brightness':
    case 'contrast':
    case 'saturation':
      return { kind: testCase.operation, factor: params.factor as number };
    case 'sepia':
    case 'grayscale':
    case 'invert':
      return { kind: testCase.operation, amount: params.amount as number };
    case 'threshold':
      return { kind: 'threshold', level: params.level as number };
    case 'pixelate':
      return { kind: 'pixelate', blockSize: params.blockSize as number };
  }
}

function runOperation(source: RGBAImage, operation: PrintFilterOperation | null): RGBAImage {
  const output = {
    width: source.width,
    height: source.height,
    data: new Uint8ClampedArray(source.data),
  };
  if (operation) applyPrintFilterOperation(output as ImageData, operation);
  return output;
}

function stretchNearest(source: RGBAImage, width: number, height: number): RGBAImage {
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor(((y + 0.5) * source.height) / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(((x + 0.5) * source.width) / width));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const targetIndex = (y * width + x) * 4;
      output.set(source.data.subarray(sourceIndex, sourceIndex + 4), targetIndex);
    }
  }
  return { width, height, data: output };
}

describe('Wave 4J independent print RGBA parity', () => {
  it('consumes every manifest cover vector through production computeSlotCrop', () => {
    expect(manifest.suites.cover.cases).toHaveLength(6);
    for (const testCase of manifest.suites.cover.cases) {
      const actual = renderIntegralCoverFixture(testCase);
      const expected = fixtureImage(testCase.expected);
      expect(actual.width).toBe(expected.width);
      expect(actual.height).toBe(expected.height);
      expectRGBAParity(actual.data, expected.data, testCase.comparisonPolicy);
    }
  });

  it('is mutation-sensitive to replacing cover with stretch', () => {
    const testCase = manifest.suites.cover.cases.find(
      ({ id }) => id === 'landscape-to-portrait-3x5',
    );
    if (!testCase) throw new Error('missing landscape-to-portrait cover fixture');
    const expected = fixtureImage(testCase.expected);
    const stretched = stretchNearest(
      fixtureImage(testCase.source),
      testCase.parameters.targetWidth,
      testCase.parameters.targetHeight,
    );

    expect([...stretched.data]).not.toEqual([...expected.data]);
    expect([...stretched.data.slice(0, 4)]).toEqual([224, 96, 48, 224]);
    expect([...expected.data.slice(0, 4)]).toEqual([240, 176, 32, 192]);
  });

  it('consumes every manifest filter vector through canonical production operations', () => {
    expect(manifest.suites.filters.cases).toHaveLength(9);
    for (const testCase of manifest.suites.filters.cases) {
      const source = fixtureImage(testCase.source);
      const expected = fixtureImage(testCase.expected);
      const actual = runOperation(source, operationFromFixture(testCase));
      expectRGBAParity(actual.data, expected.data, testCase.comparisonPolicy);
    }
  });

  it('keeps canonical filter order observable in the composed Konva callback', () => {
    const operations = getOrderedPrintFilterOperations('cinematic', {
      brightness: 75,
      contrast: 140,
      saturation: 60,
    });
    const expectedOrder = [
      'contrast',
      'saturation',
      'sepia',
      'brightness',
      'brightness',
      'contrast',
      'saturation',
    ];
    expect(operations.map(({ kind }) => kind)).toEqual(expectedOrder);

    const source = fixtureImage('filters/source-21x21.rgba');
    const canonical = {
      width: source.width,
      height: source.height,
      data: new Uint8ClampedArray(source.data),
    };
    const filters = operations.map(createOrderedPrintFilter);
    const composed = composePixelFilters(filters) as ComposedPixelFilter;
    composed.call({} as never, canonical as ImageData);

    const mutatedOperations = [...operations].reverse();
    const mutated = {
      width: source.width,
      height: source.height,
      data: new Uint8ClampedArray(source.data),
    };
    for (const operation of mutatedOperations) {
      (createOrderedPrintFilter(operation) as FilterFunction).call(
        {} as never,
        mutated as ImageData,
      );
    }

    expect([...canonical.data]).not.toEqual([...mutated.data]);
    expect(composed.composedFrom).toHaveLength(operations.length);
    // Alpha is discrete and invariant for this color-only recipe, including alpha=0 pixels.
    for (let index = 3; index < canonical.data.length; index += 4) {
      expect(canonical.data[index]).toBe(source.data[index]);
    }
  });
});
