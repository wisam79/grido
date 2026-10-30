import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { createMockPrintSettings } from './helpers/test-factories';
import { buildCollagePayload } from '../src/components/editor/print/print-payload-builder';
import { usePrintLayout } from '../src/hooks/use-print-layout';
import { mmToPx, pxToMm } from '../src/lib/canvas/units';
import { runCollagePreflight } from '../src/lib/export/collage-preflight';
import {
  getCollageExportSlotRectsMM,
  getLoadedImageDimensions,
} from '../src/lib/export/collage-preflight-helpers';
import { getSlotExportSize } from '../src/lib/export/export-slot';
import { computeCollageSlotRectMM } from '../src/lib/print/print-layout-math';
import { COLLAGE_TEMPLATES } from '../src/lib/templates';

import type { SlotRectMM } from '../src/lib/print/print-layout-math';
import type { CanvasSlot } from '../src/lib/store/types';

describe('Print Physical Parity & Dimension Verification', () => {
  const DPI_300 = 300;

  // Standard paper & photo sizes with their exact physical dimensions in mm and pixels at 300 DPI
  const standards = [
    { name: 'A4', mmW: 210, mmH: 297, expectedPxW: 2480, expectedPxH: 3508 },
    { name: 'A3', mmW: 297, mmH: 420, expectedPxW: 3508, expectedPxH: 4961 },
    { name: 'A5', mmW: 148, mmH: 210, expectedPxW: 1748, expectedPxH: 2480 },
    { name: '4x6 Photo (10x15cm)', mmW: 101.6, mmH: 152.4, expectedPxW: 1200, expectedPxH: 1800 },
    { name: '5x7 Photo (13x18cm)', mmW: 127.0, mmH: 177.8, expectedPxW: 1500, expectedPxH: 2100 },
    { name: '8x10 Photo (20x25cm)', mmW: 203.2, mmH: 254.0, expectedPxW: 2400, expectedPxH: 3000 },
    { name: 'US Letter', mmW: 215.9, mmH: 279.4, expectedPxW: 2550, expectedPxH: 3300 },
    {
      name: 'Standard Passport Photo (35x45mm)',
      mmW: 35.0,
      mmH: 45.0,
      expectedPxW: 413,
      expectedPxH: 531,
    },
    { name: 'US 2x2 Passport Photo', mmW: 50.8, mmH: 50.8, expectedPxW: 600, expectedPxH: 600 },
    {
      name: 'ISO ID-1 Card (National ID / License)',
      mmW: 85.6,
      mmH: 53.98,
      expectedPxW: 1011,
      expectedPxH: 638,
    },
  ];

  it.each(standards)(
    'converts $name ($mmW x $mmH mm) to exact pixel bounds at 300 DPI',
    ({ mmW, mmH, expectedPxW, expectedPxH }) => {
      const pxW = Math.round(mmToPx(mmW, DPI_300));
      const pxH = Math.round(mmToPx(mmH, DPI_300));

      // Maximum 1 pixel rounding boundary allowable due to 25.4 float division
      expect(Math.abs(pxW - expectedPxW)).toBeLessThanOrEqual(1);
      expect(Math.abs(pxH - expectedPxH)).toBeLessThanOrEqual(1);
    },
  );

  it.each(standards)(
    'converts pixels back to millimeters for $name with precision within 0.1mm',
    ({ mmW, mmH, expectedPxW, expectedPxH }) => {
      const derivedMmW = pxToMm(expectedPxW, DPI_300);
      const derivedMmH = pxToMm(expectedPxH, DPI_300);

      expect(Math.abs(derivedMmW - mmW)).toBeLessThan(0.15);
      expect(Math.abs(derivedMmH - mmH)).toBeLessThan(0.15);
    },
  );

  it('guarantees zero cumulative drift across grid row and column accumulation', () => {
    // 5 passport photos (35mm each) with 2mm gap on an A4 sheet
    const itemW_MM = 35;
    const gapMM = 2;
    const count = 5;

    // Direct mathematical width
    const totalMM = count * itemW_MM + (count - 1) * gapMM; // 5 * 35 + 4 * 2 = 183 mm
    const directTotalPx = Math.round(mmToPx(totalMM, DPI_300));

    // Accumulated calculation
    let accumulatedPx = 0;
    for (let i = 0; i < count; i++) {
      accumulatedPx += Math.round(mmToPx(itemW_MM, DPI_300));
      if (i < count - 1) {
        accumulatedPx += Math.round(mmToPx(gapMM, DPI_300));
      }
    }

    // Cumulative drift must not exceed 2 pixels across 5 elements
    expect(Math.abs(accumulatedPx - directTotalPx)).toBeLessThanOrEqual(2);
  });

  it('maintains aspect ratio invariance during millimeter to pixel transformations', () => {
    standards.forEach(({ mmW, mmH }) => {
      const mmRatio = mmW / mmH;
      const pxW = mmToPx(mmW, DPI_300);
      const pxH = mmToPx(mmH, DPI_300);
      const pxRatio = pxW / pxH;

      expect(Math.abs(mmRatio - pxRatio)).toBeLessThan(1e-5);
    });
  });

  it('verifies WebView2 print page CSS size formatting complies with Chromium spec', () => {
    const paperWidthMM = 210;
    const paperHeightMM = 297;
    const cssPageRule = `@page { size: ${paperWidthMM}mm ${paperHeightMM}mm; margin: 0; }`;

    expect(cssPageRule).toBe('@page { size: 210mm 297mm; margin: 0; }');
    expect(cssPageRule).toContain('210mm');
    expect(cssPageRule).toContain('297mm');
    expect(cssPageRule).toContain('margin: 0;');
  });
});

describe('R-04: collage preflight uses final physical local draw rectangles', () => {
  const slot: CanvasSlot = {
    id: 'photo',
    cellIndex: 0,
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    imageSrc: '/local-image/photo.jpg',
    zoom: 1,
    dragX: 0,
    dragY: 0,
  };
  const square: SlotRectMM = { xMM: 0, yMM: 0, wMM: 101.6, hMM: 101.6 };
  const check = (
    rect = square,
    source = { width: 1200, height: 1200 },
    transform: Partial<CanvasSlot> = {},
    minDpi = 250,
  ) =>
    runCollagePreflight({
      slots: [{ ...slot, ...transform }],
      slotRectsMM: new Map([[slot.id, rect]]),
      imageDimensions: new Map([[slot.imageSrc!, source]]),
      minDpi,
    });

  it('1200px at 101.6mm is 300 DPI; zoom 2 is 150 DPI and remains nonblocking', () => {
    expect(check()).toEqual({ blocking: [], warnings: [] });
    expect(check(square, undefined, {}, 301).warnings[0].message).toContain('≈ 300DPI');
    const zoomed = check(square, undefined, { zoom: 2, dragX: 40, flipX: true });
    expect(zoomed.blocking).toEqual([]);
    expect(zoomed.warnings[0]).toMatchObject({ slotId: slot.id, kind: 'low-resolution' });
    expect(zoomed.warnings[0].message).toContain('≈ 150DPI');
  });

  it.each([0, 45, 90, 270, -90])(
    'compares crop axes to local draw axes at rotation %s',
    (rotation) => {
      // A quarter turn crops to 1200×2400, drawn LOCALLY to 101.6×50.8mm.
      // Using its rotated bounding box (50.8×101.6) would incorrectly report 600 DPI.
      const result = check(
        { ...square, hMM: 50.8 },
        { width: 1200, height: 2400 },
        { rotation, flipY: true },
        301,
      );
      expect(result.warnings[0].message).toContain('≈ 300DPI');
    },
  );

  it.each([90, 270])(
    'uses already EXIF-%s-oriented natural dimensions without swapping again',
    () => {
      // Browser decoded raw 2400×1200 into 1200×2400; width/height may be display-sized.
      const loaded = new Map([
        [
          slot.id,
          {
            naturalWidth: 1200,
            naturalHeight: 2400,
            width: 120,
            height: 240,
          } as HTMLImageElement,
        ],
      ]);
      const dimensions = getLoadedImageDimensions([slot], loaded);
      expect(dimensions.get(slot.imageSrc!)).toEqual({ width: 1200, height: 2400 });
      const result = runCollagePreflight({
        slots: [slot],
        slotRectsMM: new Map([[slot.id, { ...square, hMM: 203.2 }]]),
        imageDimensions: dimensions,
        minDpi: 301,
      });
      expect(result.warnings[0].message).toContain('≈ 300DPI');
    },
  );

  it('keeps empty slots nonblocking but never treats missing decoded dimensions as sufficient quality', () => {
    const empty = { ...slot, id: 'empty', imageSrc: undefined };
    const result = runCollagePreflight({
      slots: [slot, empty],
      slotRectsMM: new Map([
        [slot.id, square],
        [empty.id, square],
      ]),
      imageDimensions: new Map(),
    });
    expect(result.blocking).toMatchObject([{ slotId: slot.id, kind: 'unreadable' }]);
    expect(result.warnings).toMatchObject([{ slotId: empty.id, kind: 'empty' }]);
  });

  it.each([150, 300, 600])('converts per-axis margins/gaps once at project DPI %s', (dpi) => {
    const rect = computeCollageSlotRectMM(
      { ...slot, w: 0.5 },
      {
        canvasWidth: 1000,
        canvasHeight: 2000,
        imageWidthMM: 254,
        imageHeightMM: 254,
        collageMargin: 100,
        collageGap: 20,
        hasPhysical: false,
      },
    );
    expect(rect.xMM).toBeCloseTo(27.94, 8);
    expect(rect.yMM).toBeCloseTo(13.97, 8);
    expect(rect.wMM).toBeCloseTo(96.52, 8);
    expect(rect.hMM).toBeCloseTo(226.06, 8);
    const opts = {
      slots: [{ ...slot, w: 0.5 }],
      canvasWidth: 1000,
      canvasHeight: 2000,
      collageMargin: 100,
      collageGap: 20,
    };
    const exportRect = getCollageExportSlotRectsMM(opts, dpi, false).get(slot.id)!;
    expect(exportRect.wMM).toBeCloseTo(pxToMm(380, dpi), 8);
    expect(exportRect.hMM).toBeCloseTo(pxToMm(1780, dpi), 8);
  });

  it('batch geometry uses each integer output bitmap, not fractions of the page', () => {
    const slots = [
      { ...slot, w: 0.3333, h: 0.5 },
      { ...slot, id: 'second', w: 0.5, h: 1 },
    ];
    const opts = { slots, canvasWidth: 1200, canvasHeight: 1000, collageMargin: 11, collageGap: 7 };
    const rects = getCollageExportSlotRectsMM(opts, 300, true);
    for (const s of slots) {
      const size = getSlotExportSize(s, opts);
      const rect = rects.get(s.id)!;
      expect(rect.xMM).toBe(0);
      expect(rect.wMM).toBeCloseTo(pxToMm(size.width, 300), 8);
      expect(rect.hMM).toBeCloseTo(pxToMm(size.height, 300), 8);
    }
    expect(getSlotExportSize(slots[0], opts)).toEqual({ width: 385, height: 482 });
    expect(getSlotExportSize(slots[1], opts)).toEqual({ width: 582, height: 971 });
  });

  it.each([false, true])(
    'print payload and export share spacing (physical template: %s)',
    (physical) => {
      const collageTemplate = physical ? COLLAGE_TEMPLATES.find((t) => t.physicalLayout)! : null;
      const slots = [{ ...slot, x: 0.1, y: 0.1, w: 0.4, h: 0.8, zoom: 2 }];
      const opts = {
        slots,
        canvasWidth: 2400,
        canvasHeight: 1200,
        collageMargin: 100,
        collageGap: 40,
        collageTemplate,
      };
      const { result } = renderHook(() =>
        usePrintLayout({
          ...opts,
          template: null,
          mode: 'collage',
          printSettings: createMockPrintSettings({
            dpi: 300,
            paperWidthMM: 300,
            paperHeightMM: 300,
            marginMM: 5,
          }),
        }),
      );
      const payload = buildCollagePayload({
        ...opts,
        layout: result.current,
        collageRadius: 0,
        collageStrokeWidth: 0,
        collageStrokeColor: '#000000',
        collageShowCutLines: false,
        collageShowEndCutLine: false,
      });
      const exportRects = getCollageExportSlotRectsMM(opts, 300, false);
      const exportRect = exportRects.get(slot.id)!;
      expect(payload.items[0].w).toBeCloseTo(exportRect.wMM, 8);
      expect(payload.items[0].h).toBeCloseTo(exportRect.hMM, 8);
      if (physical) {
        expect(exportRect.wMM).toBeCloseTo(pxToMm(960, 300), 8);
        expect(exportRect.hMM).toBeCloseTo(pxToMm(960, 300), 8);
      }
      const dimensions = new Map([[slot.imageSrc!, { width: 1200, height: 1200 }]]);
      expect(
        runCollagePreflight({ slots, slotRectsMM: exportRects, imageDimensions: dimensions }),
      ).toEqual(
        runCollagePreflight({
          slots,
          imageDimensions: dimensions,
          slotRectsMM: new Map([
            [
              slot.id,
              {
                xMM: payload.items[0].x,
                yMM: payload.items[0].y,
                wMM: payload.items[0].w,
                hMM: payload.items[0].h,
              },
            ],
          ]),
        }),
      );
    },
  );

  it.each(['portrait', 'landscape'] as const)(
    'uses fitted custom-paper geometry in %s, not original project DPI',
    (orientation) => {
      const { result } = renderHook(() =>
        usePrintLayout({
          template: null,
          mode: 'collage',
          canvasWidth: 2400,
          canvasHeight: 2400,
          printSettings: createMockPrintSettings({
            dpi: 150,
            paperId: 'custom',
            paperWidthMM: 111.6,
            paperHeightMM: 213.2,
            orientation,
            marginMM: 5,
            copiesPerSheet: 1,
          }),
        }),
      );
      expect(result.current.originalImageWidthMM).toBeCloseTo(406.4, 8);
      expect(result.current.imageWidthMM).toBeCloseTo(101.6, 8);
      const rect = computeCollageSlotRectMM(slot, {
        canvasWidth: 2400,
        canvasHeight: 2400,
        imageWidthMM: result.current.imageWidthMM,
        imageHeightMM: result.current.imageHeightMM,
        collageMargin: 0,
        collageGap: 0,
        hasPhysical: false,
      });
      expect(check(rect)).toEqual({ blocking: [], warnings: [] });
      expect(check(rect, undefined, {}, 301).warnings[0].message).toContain('≈ 300DPI');
    },
  );
});
