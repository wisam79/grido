import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

const coverFixture = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../test-fixtures/print-rgba/cover/source-landscape-7x5.rgba',
  ),
).toString('base64');

interface ParityResult {
  width: number;
  height: number;
  comparedPixels: number;
  maxRgbDelta: number;
  maxAlphaDelta: number;
  rmse: number;
  previewSignature: number[];
  manualSignature: number[];
}

/**
 * Browser-only parity guard for the real Konva cache/capture path and the real
 * manual collage exporter. The literal RGBA source comes from the immutable,
 * independently authored fixture package; no browser output is blessed here.
 *
 * Comparison uses a 5x5 integral center crop from the 7x5 source, so there are no
 * resample edges. Alpha is exact, RGB is ±1 per channel, and aggregate RGB RMSE
 * must remain below 2.
 */
test.describe('Wave 4J browser print RGBA parity', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('real Konva capture matches manual export for fixture cover and filter order', async ({
    page,
  }) => {
    const result = await page.evaluate(async (fixtureBase64): Promise<ParityResult> => {
      const fixture = Uint8Array.from(atob(fixtureBase64), (char) => char.charCodeAt(0));
      const source = document.createElement('canvas');
      source.width = 7;
      source.height = 5;
      const sourceContext = source.getContext('2d');
      if (!sourceContext) throw new Error('fixture canvas has no 2D context');
      sourceContext.putImageData(
        new ImageData(new Uint8ClampedArray(fixture), source.width, source.height),
        0,
        0,
      );
      const fixtureURL = source.toDataURL('image/png');

      const storePath = '/src/lib/editor-store.ts';
      const storeModule = (await import(/* @vite-ignore */ storePath)) as {
        useEditorStore: {
          getState: () => Record<string, unknown>;
          setState: (state: Record<string, unknown>) => void;
        };
      };
      const store = storeModule.useEditorStore;
      store.setState({
        mode: 'collage',
        canvasWidth: 5,
        canvasHeight: 5,
        backgroundColor: '#ffffff',
        backgroundGradientColor2: null,
        selectedId: null,
        selectedIds: [],
        collageTemplate: {
          id: 'wave4j-fixture',
          name: 'Wave 4J fixture',
          slots: 1,
          isManual: true,
          cells: [{ x: 0, y: 0, w: 1, h: 1 }],
        },
        collageGap: 0,
        collageMargin: 0,
        collageRadius: 0,
        collageStrokeWidth: 0,
        collageStrokeColor: '#112233',
        collageShowCutLines: false,
        collageShowEndCutLine: false,
        slots: [
          {
            id: 'wave4j-slot',
            cellIndex: 0,
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            imageSrc: fixtureURL,
            filter: 'cinematic',
            brightness: 105,
            contrast: 95,
            saturation: 110,
            zoom: 1,
            dragX: 0,
            dragY: 0,
            bgColor: '#445566',
          },
        ],
      });

      const stage = (
        window as unknown as {
          __gridoStage?: {
            find: (selector: string) => Array<{ image?: () => CanvasImageSource | undefined }>;
          };
        }
      ).__gridoStage;
      if (!stage) throw new Error('Konva stage is unavailable');

      for (let attempt = 0; attempt < 80; attempt += 1) {
        const loaded = stage.find('Image').some((node) => Boolean(node.image?.()));
        if (loaded) break;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));

      const exportPath = '/src/lib/export/export-canvas.ts';
      const { exportCanvas } = (await import(/* @vite-ignore */ exportPath)) as {
        exportCanvas: (format: 'png', quality: number, stageRef: unknown) => Promise<Blob | null>;
      };
      const previewBlob = await exportCanvas('png', 1, stage);
      const manualBlob = await exportCanvas('png', 1, null);
      if (!previewBlob || !manualBlob) throw new Error('one of the export paths returned null');

      const [previewBitmap, manualBitmap] = await Promise.all([
        createImageBitmap(previewBlob),
        createImageBitmap(manualBlob),
      ]);
      const readBitmap = (bitmap: ImageBitmap) => {
        const canvas = document.createElement('canvas');
        canvas.width = 5;
        canvas.height = 5;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('comparison canvas has no 2D context');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const preview = readBitmap(previewBitmap);
      const manual = readBitmap(manualBitmap);
      previewBitmap.close();
      manualBitmap.close();

      let squaredError = 0;
      let comparedChannels = 0;
      let comparedPixels = 0;
      let maxRgbDelta = 0;
      let maxAlphaDelta = 0;
      // The 5x5 target is an integral center-cover crop from the 7x5 fixture.
      // No resampling edge exists, so all four channels must match exactly.
      for (let y = 0; y < 5; y += 1) {
        for (let x = 0; x < 5; x += 1) {
          const index = (y * 5 + x) * 4;
          comparedPixels += 1;
          for (let channel = 0; channel < 3; channel += 1) {
            const delta = Math.abs(preview[index + channel] - manual[index + channel]);
            maxRgbDelta = Math.max(maxRgbDelta, delta);
            squaredError += delta * delta;
            comparedChannels += 1;
          }
          maxAlphaDelta = Math.max(maxAlphaDelta, Math.abs(preview[index + 3] - manual[index + 3]));
        }
      }

      const signatureAt = (data: Uint8ClampedArray) =>
        [
          [0, 0],
          [2, 2],
          [4, 4],
        ].flatMap(([x, y]) => [...data.slice((y * 5 + x) * 4, (y * 5 + x) * 4 + 4)]);
      return {
        width: 5,
        height: 5,
        comparedPixels,
        maxRgbDelta,
        maxAlphaDelta,
        rmse: Math.sqrt(squaredError / Math.max(1, comparedChannels)),
        previewSignature: signatureAt(preview),
        manualSignature: signatureAt(manual),
      };
    }, coverFixture);

    expect(result.width).toBe(5);
    expect(result.height).toBe(5);
    expect(result.comparedPixels).toBe(25);
    expect(result.maxAlphaDelta).toBe(0);
    expect(result.maxRgbDelta).toBeLessThanOrEqual(1);
    expect(result.rmse).toBeLessThan(2);
    expect(result.previewSignature).toEqual(result.manualSignature);
    expect(new Set(result.previewSignature)).not.toEqual(new Set([0, 255]));
  });
});
