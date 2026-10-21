import { describe, it, expect } from 'vitest';

import { calculateAlignmentPatches, calculateDistributionPatches } from './element-alignment';

import type { CanvasElement } from '../store/types';

function createMockElement(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides?: Partial<CanvasElement>,
): CanvasElement {
  return {
    id,
    type: 'shape',
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    ...overrides,
  } as CanvasElement;
}

describe('element-alignment', () => {
  const canvasWidth = 1000;
  const canvasHeight = 1000;

  describe('calculateAlignmentPatches', () => {
    it('returns empty array when targetIds is empty or no matching elements', () => {
      const el1 = createMockElement('1', 0.1, 0.1, 0.2, 0.2);
      expect(calculateAlignmentPatches([el1], [], 'left', canvasWidth, canvasHeight)).toEqual([]);
      expect(
        calculateAlignmentPatches([el1], ['non-existent'], 'left', canvasWidth, canvasHeight),
      ).toEqual([]);
    });

    it('ignores locked elements', () => {
      const el1 = createMockElement('1', 0.1, 0.1, 0.2, 0.2, { locked: true });
      expect(calculateAlignmentPatches([el1], ['1'], 'left', canvasWidth, canvasHeight)).toEqual(
        [],
      );
    });

    it('aligns multiple elements to the left (overallMinX)', () => {
      // el1 at x=0.2, el2 at x=0.5
      const el1 = createMockElement('1', 0.2, 0.1, 0.2, 0.2);
      const el2 = createMockElement('2', 0.5, 0.3, 0.2, 0.2);

      const patches = calculateAlignmentPatches(
        [el1, el2],
        ['1', '2'],
        'left',
        canvasWidth,
        canvasHeight,
      );
      expect(patches).toHaveLength(2);

      const p1 = patches.find((p) => p.id === '1');
      const p2 = patches.find((p) => p.id === '2');

      expect(p1?.patch.x).toBeCloseTo(0.2);
      expect(p2?.patch.x).toBeCloseTo(0.2);
    });

    it('aligns multiple elements to center', () => {
      // el1 from 0.1 to 0.3 (width 0.2), el2 from 0.7 to 0.9 (width 0.2)
      // overallMinX = 0.1, overallMaxX = 0.9 -> overallCenter = 0.5
      // for width 0.2, center aligns to 0.5 - 0.1 = 0.4
      const el1 = createMockElement('1', 0.1, 0.1, 0.2, 0.2);
      const el2 = createMockElement('2', 0.7, 0.3, 0.2, 0.2);

      const patches = calculateAlignmentPatches(
        [el1, el2],
        ['1', '2'],
        'center',
        canvasWidth,
        canvasHeight,
      );
      expect(patches).toHaveLength(2);

      const p1 = patches.find((p) => p.id === '1');
      const p2 = patches.find((p) => p.id === '2');

      expect(p1?.patch.x).toBeCloseTo(0.4);
      expect(p2?.patch.x).toBeCloseTo(0.4);
    });

    it('aligns a single unit relative to canvas boundaries (0..1)', () => {
      // Single element width 0.2 at x=0.1
      // Canvas center = 0.5 -> new x = 0.5 - 0.2/2 = 0.4
      const el1 = createMockElement('1', 0.1, 0.1, 0.2, 0.2);
      const patches = calculateAlignmentPatches([el1], ['1'], 'center', canvasWidth, canvasHeight);

      expect(patches).toHaveLength(1);
      expect(patches[0].patch.x).toBeCloseTo(0.4);
    });

    it('aligns elements to top, middle, and bottom', () => {
      const el1 = createMockElement('1', 0.2, 0.2, 0.2, 0.2);
      const el2 = createMockElement('2', 0.5, 0.6, 0.2, 0.2);

      const topPatches = calculateAlignmentPatches(
        [el1, el2],
        ['1', '2'],
        'top',
        canvasWidth,
        canvasHeight,
      );
      expect(topPatches.find((p) => p.id === '2')?.patch.y).toBeCloseTo(0.2);

      const bottomPatches = calculateAlignmentPatches(
        [el1, el2],
        ['1', '2'],
        'bottom',
        canvasWidth,
        canvasHeight,
      );
      // el2 maxY = 0.8 -> new y for el1 = 0.8 - 0.2 = 0.6
      expect(bottomPatches.find((p) => p.id === '1')?.patch.y).toBeCloseTo(0.6);
    });
  });

  describe('calculateDistributionPatches', () => {
    it('returns empty if fewer than 3 elements are selected', () => {
      const el1 = createMockElement('1', 0.1, 0.1, 0.1, 0.1);
      const el2 = createMockElement('2', 0.5, 0.1, 0.1, 0.1);

      expect(
        calculateDistributionPatches(
          [el1, el2],
          ['1', '2'],
          'horizontal',
          canvasWidth,
          canvasHeight,
        ),
      ).toEqual([]);
    });

    it('distributes 3 elements horizontally with equal gaps', () => {
      // 3 elements of width 0.1
      // el1 at x=0.1 (width 0.1, maxX 0.2)
      // el2 at x=0.3 (width 0.1, maxX 0.4)
      // el3 at x=0.9 (width 0.1, maxX 1.0)
      // totalSpan = 1.0 - 0.1 = 0.9. totalWidths = 0.3. remaining = 0.6. gap = 0.6 / 2 = 0.3.
      // Expected:
      // first remains at 0.1
      // middle moves to 0.1 + 0.1 + 0.3 = 0.5
      // last remains at 0.9
      const el1 = createMockElement('1', 0.1, 0.1, 0.1, 0.1);
      const el2 = createMockElement('2', 0.3, 0.1, 0.1, 0.1);
      const el3 = createMockElement('3', 0.9, 0.1, 0.1, 0.1);

      const patches = calculateDistributionPatches(
        [el1, el2, el3],
        ['1', '2', '3'],
        'horizontal',
        canvasWidth,
        canvasHeight,
      );
      expect(patches).toHaveLength(1); // only middle element moved
      expect(patches[0].id).toBe('2');
      expect(patches[0].patch.x).toBeCloseTo(0.5);
    });

    it('distributes 3 elements vertically with equal gaps', () => {
      const el1 = createMockElement('1', 0.1, 0.1, 0.1, 0.1);
      const el2 = createMockElement('2', 0.1, 0.3, 0.1, 0.1);
      const el3 = createMockElement('3', 0.1, 0.9, 0.1, 0.1);

      const patches = calculateDistributionPatches(
        [el1, el2, el3],
        ['1', '2', '3'],
        'vertical',
        canvasWidth,
        canvasHeight,
      );
      expect(patches).toHaveLength(1);
      expect(patches[0].id).toBe('2');
      expect(patches[0].patch.y).toBeCloseTo(0.5);
    });
  });
});
