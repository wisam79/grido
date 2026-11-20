import { canvasSnapshot, expectElementCount } from './helpers/canvas-readonly';
import {
  ensureSingle,
  exportCanvasFile,
  importImages,
  openScanner,
  saveProject,
} from './helpers/gui';
import { test, expect } from './helpers/real-app';

test('[J06] Scanner manual corners warp insert and export', async ({ journey }) => {
  const page = journey.page;
  await ensureSingle(page);
  await importImages(journey, [journey.inputs.document]);
  await expectElementCount(page, 1);
  const before = (await canvasSnapshot(page)).elements[0];
  const scanner = await openScanner(page, before.id);
  const reset = scanner.getByRole('button', { name: 'إعادة الضبط', exact: true });
  await expect(reset).toBeEnabled({ timeout: 90_000 });
  await reset.click();
  // Explicit manual outcome, independent of any detector confidence/model output.
  const corner = scanner.getByRole('button', { name: 'الركن العلوي الأيسر', exact: true });
  await corner.click();
  await corner.press('Shift+ArrowRight');
  await corner.press('Shift+ArrowDown');
  await scanner.getByRole('button', { name: 'A4 طولي', exact: true }).click();
  await scanner.getByRole('button', { name: 'أصلي', exact: true }).click();
  await scanner.getByRole('button', { name: 'معاينة', exact: true }).click();
  const preview = scanner.getByRole('img', { name: 'المستند المستعدل', exact: true });
  await expect(preview).toBeVisible({ timeout: 60_000 });
  const size = await preview.evaluate((node: HTMLImageElement) => ({
    width: node.naturalWidth,
    height: node.naturalHeight,
    source: node.src,
  }));
  expect(size.width).toBeGreaterThan(500);
  expect(size.height).toBeGreaterThan(size.width);
  expect(size.width / size.height).toBeCloseTo(210 / 297, 2);
  await journey.checkpoint('scanner-real-warp-preview');
  await scanner.getByRole('button', { name: 'إدراج', exact: true }).click();
  await expect(scanner).not.toBeVisible({ timeout: 60_000 });
  await expect
    .poll(
      async () => (await canvasSnapshot(page)).elements.find((el) => el.id === before.id)?.imageSrc,
    )
    .not.toBe(before.imageSrc);
  await expectElementCount(page, 1);
  const after = (await canvasSnapshot(page)).elements[0];
  expect(after.id).toBe(before.id);
  expect(after.imageSrc).toMatch(/local-image\//);
  const decoded = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  }, after.imageSrc!);
  expect(decoded.width / decoded.height).toBeCloseTo(210 / 297, 2);
  await saveProject(page, journey.name);
  await exportCanvasFile(journey, 'scanned-document.png', 'png', { alpha: 'opaque' });
  journey.record('scanner-real-go-warp-manual-corners', {
    originalId: before.id,
    sameIdAfterInsert: after.id,
    replacedImage: after.imageSrc,
    preview: size,
    decoded,
    expectedAspect: 'A4 210/297',
    excludes: 'No detector golden/model fake, no physical scanner or accuracy certification',
  });
  await journey.checkpoint('scanner-applied');
});
