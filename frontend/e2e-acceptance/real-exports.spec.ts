import { canvasSnapshot, expectElementCount } from './helpers/canvas-readonly';
import { ensureSingle, exportCanvasFile, importImages } from './helpers/gui';
import { test, expect } from './helpers/real-app';

test('[J02] Real PNG JPEG CMYK TIFF export bytes DPI pixels', async ({ journey }) => {
  const page = journey.page;
  await ensureSingle(page);
  // 1200x800 source has manually specified red/green/blue/yellow quadrants.
  // Make a 3:2 paper through real controls so imported image is not cropped.
  const width = page.getByRole('textbox', { name: 'العرض', exact: true });
  // Paper properties live in the right inspector panel (open by default on desktop);
  // toggle via settings menu if collapsed.
  if (!(await width.isVisible())) {
    await page.getByTestId('rail-settings-menu-trigger').click();
    await page.getByRole('menuitem', { name: /لوحة الخصائص والمفتش/ }).click();
  }
  await expect(width).toBeVisible();
  await width.fill('101.6');
  await width.press('Enter');
  const height = page.getByRole('textbox', { name: 'الارتفاع', exact: true });
  await height.fill('67.7');
  await height.press('Enter');
  await importImages(journey, [journey.inputs.landscape]);
  await expectElementCount(page, 1);
  const image = (await canvasSnapshot(page)).elements[0];
  const sample = (u: number, v: number, rgba: number[]) => ({
    x: image.x + image.width * u,
    y: image.y + image.height * v,
    rgba,
    tolerance: 12,
  });
  const png = await exportCanvasFile(journey, 'quadrants.png', 'png', {
    alpha: 'opaque',
    samples: [
      sample(0.25, 0.25, [231, 40, 46, 255]),
      sample(0.75, 0.25, [25, 180, 87, 255]),
      sample(0.25, 0.75, [30, 85, 220, 255]),
      sample(0.75, 0.75, [250, 210, 32, 255]),
    ],
  });
  const jpeg = await exportCanvasFile(journey, 'quadrants.jpg', 'jpeg', { alpha: 'opaque' });
  const tiff = await exportCanvasFile(journey, 'quadrants.tiff', 'tiff');
  expect(png.sha256).not.toBe(jpeg.sha256);
  expect(tiff.photometric).toBe(5);
  expect(tiff.inkSet).toBe(1);
  expect(tiff.bitsPerSample).toEqual([8, 8, 8, 8]);
  journey.record('independent-export-oracle', {
    pngQuadrantSamples: 'hand-specified input RGBA; no production expected renderer',
    rasterHashes: [png.pixelSha256, tiff.pixelSha256],
    byteHashes: [png.sha256, jpeg.sha256, tiff.sha256],
    limitations:
      'CMYK flags/raster validity verified; not ICC/colorimetric or physical print acceptance',
  });
});
