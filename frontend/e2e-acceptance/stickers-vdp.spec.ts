import { readFile } from 'node:fs/promises';
import { canvasSnapshot, expectElementCount } from './helpers/canvas-readonly';
import { ensureSingle, exportCanvasFile, saveProject } from './helpers/gui';
import { test, expect } from './helpers/real-app';
// @ts-expect-error Independent verifier is an ESM Node helper.
import { verifyOutput } from '../../scripts/e2e/verify-output.mjs';

// Sticker catalog, fields, row mapping and insertion all use real GUI input.
test('[J05] Sticker QR customization VDP rows real PNG and decode', async ({
  journey,
}, testInfo) => {
  const page = journey.page;
  await ensureSingle(page);
  await page.getByTestId('rail-studio-stickers').click();
  const studio = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('searchbox', { name: 'بحث في الملصقات', exact: true }) });
  await studio.getByRole('searchbox', { name: 'بحث في الملصقات', exact: true }).fill('QR Code');
  await studio.getByRole('button', { name: /^ملصق رمز استجابة \(QR Code\)/ }).click();
  const custom = page.getByRole('dialog').filter({ has: page.locator('#sticker-field-qrUrl') });
  const qrText = `https://example.invalid/acceptance/${journey.name}`;
  await custom.locator('#sticker-field-qrUrl').fill(qrText);
  await custom.locator('#sticker-field-scanTitle').fill('قبول QR حقيقي');
  await custom.locator('#sticker-field-scanSub').fill('GUI-ENTERED');
  await expect(custom.locator('svg [data-field-id="scanTitle"]').first()).toContainText(
    'قبول QR حقيقي',
  );
  // This production control exports via an actual browser download, not Wails save.
  const downloadPromise = page.waitForEvent('download');
  await custom.getByRole('button', { name: 'تصدير', exact: true }).click();
  await page.getByRole('menuitem', { name: 'صورة PNG (300 DPI)', exact: true }).click();
  const download = await downloadPromise;
  const pngPath = journey.outputPath('qr-sticker.png');
  await download.saveAs(pngPath);
  const png = await verifyOutput(pngPath, {
    format: 'png',
    width: Math.round((88 * 300) / 25.4),
    height: Math.round((96 * 300) / 25.4),
    dpi: 300,
    alpha: 'transparent',
    nonUniform: true,
    qrText,
    requireQr: process.env.GRIDO_REQUIRE_QR === '1',
  });
  journey.record('sticker-png-download', { path: pngPath, ...png, requestedDpi: 300 });
  if (png.qr?.status === 'blocked')
    journey.record('independent-qr-decode', png.qr.reason, 'blocked');
  await testInfo.attach('exported-qr-png', { path: pngPath, contentType: 'image/png' });
  await custom.getByRole('button', { name: 'من جدول', exact: true }).click();
  const vdp = page
    .getByRole('dialog')
    .filter({ has: page.locator('input[type="file"][accept*=".csv"]') });
  await vdp.locator('input[type="file"]').setInputFiles(journey.inputs.vdp);
  await vdp
    .getByRole('combobox', { name: 'عمود حقل العنوان أعلى الرمز', exact: true })
    .selectOption('Title');
  await vdp
    .getByRole('combobox', { name: 'عمود حقل الرابط أو النص (URL)', exact: true })
    .selectOption('URL');
  await vdp
    .getByRole('combobox', { name: 'عمود حقل العبارة السفلية', exact: true })
    .selectOption('Footer');
  await expect(vdp).toContainText('Journey One');
  await vdp.getByRole('button', { name: 'توليد (2)', exact: true }).click();
  await expect(vdp).not.toBeVisible();
  if (await custom.isVisible()) await page.keyboard.press('Escape');
  await expectElementCount(page, 2);
  const inserted = (await canvasSnapshot(page)).elements;
  expect(inserted.every((el) => el.type === 'image' && !!el.imageSrc)).toBe(true);
  expect(new Set(inserted.map((el) => el.imageSrc)).size).toBe(2);
  expect(inserted.map((el) => el.stickerSource?.params?.fields?.scanTitle)).toEqual([
    'Journey One',
    'Journey Two',
  ]);
  expect(inserted.map((el) => el.stickerSource?.params?.fields?.qrUrl)).toEqual([
    'https://example.invalid/acceptance/one',
    'https://example.invalid/acceptance/two',
  ]);
  expect(inserted.map((el) => el.stickerSource?.params?.fields?.scanSub)).toEqual([
    'ROW-001',
    'ROW-002',
  ]);
  // Rendered files, not just a dialog summary: each row's raster URL must decode.
  const imageHealth = await page.evaluate(
    async (sources) =>
      Promise.all(
        sources.map(async (src) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          return [img.naturalWidth, img.naturalHeight];
        }),
      ),
    inserted.map((el) => el.imageSrc!),
  );
  expect(imageHealth.every(([width, height]) => width > 100 && height > 100)).toBe(true);
  await saveProject(page, journey.name);
  await exportCanvasFile(journey, 'vdp-sheet.png', 'png', { alpha: 'opaque' });
  journey.record('vdp-two-real-row-rasters', {
    csvBytes: (await readFile(journey.inputs.vdp)).length,
    rows: ['Journey One/ROW-001', 'Journey Two/ROW-002'],
    insertedIds: inserted.map((el) => el.id),
    imageHealth,
    distinctImages: true,
  });
  await journey.checkpoint('vdp-inserted');
});
