import { canvasSnapshot, clickCanvasNode, dragCanvasNode } from './helpers/canvas-readonly';
import { exportCanvasFile, importImages, reopenProject, saveProject } from './helpers/gui';
import { test, expect } from './helpers/real-app';

test('[J03] Collage layout import transforms and lossless export', async ({ journey }) => {
  const page = journey.page;
  await page.getByTestId('mode-tab-collage').click();
  await page.getByTestId('rail-collage-grid').click();
  for (const [label, target] of [
    ['الصفوف', 1],
    ['الأعمدة', 2],
  ] as const) {
    const counter = page.getByRole('group', { name: `عدد ${label}`, exact: true });
    for (let steps = 0; steps < 30; steps++) {
      const current = Number(await counter.locator('[aria-live="polite"]').innerText());
      if (current === target) break;
      await counter
        .getByRole('button', {
          name: `${current > target ? 'تقليل' : 'زيادة'} عدد ${label}`,
          exact: true,
        })
        .click();
    }
    await expect(counter.locator('[aria-live="polite"]')).toHaveText(String(target));
  }
  await page.getByRole('button', { name: 'تطبيق الشبكة', exact: true }).click();
  await expect.poll(async () => (await canvasSnapshot(page)).slots.length).toBe(2);
  await importImages(journey, [journey.inputs.landscape, journey.inputs.portrait]);
  await expect
    .poll(async () => {
      const snap = await canvasSnapshot(page);
      const readySlots = snap.slots.filter((slot) => slot.imageSrc);
      return readySlots.filter((slot) => {
        const rendered = snap.nodes.find((candidate) => candidate.id === slot.id);
        return Boolean(rendered?.src && rendered.box.width > 10 && rendered.box.height > 10);
      }).length;
    })
    .toBe(2);
  const initial = (await canvasSnapshot(page)).slots;
  await clickCanvasNode(page, initial[0].id);
  const node = (await canvasSnapshot(page)).nodes.find(
    (candidate) => candidate.id === initial[0].id,
  )!;
  await page.mouse.move(node.box.x + node.box.width / 2, node.box.y + node.box.height / 2);
  await page.mouse.wheel(0, -220);
  await expect.poll(async () => (await canvasSnapshot(page)).slots[0].zoom ?? 1).toBeGreaterThan(1);
  await dragCanvasNode(page, initial[0].id, 20, 15);
  const edited = await canvasSnapshot(page);
  expect(edited.slots[0].imageSrc).toBe(initial[0].imageSrc);
  expect(edited.slots[1].imageSrc).toBe(initial[1].imageSrc);
  await exportCanvasFile(journey, 'collage.png', 'png', { alpha: 'opaque' });
  await saveProject(page, journey.name);
  journey.record('collage-gui-layout-import-transform', {
    slotCount: 2,
    distinctImages: initial.map((slot) => slot.imageSrc),
    edited: edited.slots,
  });
  await journey.checkpoint('collage-edited');
});

test('[J04] Freeform collage manual cell edit apply and restart', async ({ journey }) => {
  let page = journey.page;
  await page.getByTestId('mode-tab-collage').click();
  await page.getByTestId('rail-collage-freeform').click();
  await page.getByRole('button', { name: /فتح المحرر|تحرير التخطيط/, exact: true }).click();
  const dialog = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('textbox', { name: 'اسم التخطيط', exact: true }) });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole('textbox', { name: 'اسم التخطيط', exact: true })
    .fill(`${journey.name}-layout`);
  await dialog.getByRole('button', { name: 'إضافة خلية فارغة', exact: true }).click();
  await dialog.getByRole('tab', { name: 'خصائص', exact: true }).click();
  const width = dialog
    .getByRole('spinbutton', { name: /^العرض(?:\s+مم)?$/ })
    .or(dialog.getByRole('textbox', { name: /^العرض(?:\s+مم)?$/ }));
  await width.fill('40');
  await width.press('Enter');
  const height = dialog
    .getByRole('spinbutton', { name: /^الارتفاع(?:\s+مم)?$/ })
    .or(dialog.getByRole('textbox', { name: /^الارتفاع(?:\s+مم)?$/ }));
  await height.fill('60');
  await height.press('Enter');
  await dialog.getByRole('button', { name: 'تكرار (Ctrl+D)', exact: true }).click();
  await dialog.getByRole('button', { name: 'تدوير 90°', exact: true }).click();
  await dialog.getByRole('button', { name: 'تطبيق الكولاج', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect.poll(async () => (await canvasSnapshot(page)).slots.length).toBe(10);
  const applied = await canvasSnapshot(page);
  expect(applied.slots.some((slot) => slot.rotation === 90)).toBe(true);
  await importImages(journey, [journey.inputs.landscape, journey.inputs.portrait]);
  await expect
    .poll(async () => (await canvasSnapshot(page)).slots.filter((slot) => slot.imageSrc).length)
    .toBe(2);
  await saveProject(page, journey.name);
  const before = await canvasSnapshot(page);
  page = await journey.restart();
  await reopenProject(page, journey.name);
  await expect.poll(async () => (await canvasSnapshot(page)).slots).toEqual(before.slots);
  await exportCanvasFile(journey, 'freeform-collage.png', 'png', { alpha: 'opaque' });
  journey.record('freeform-collage-apply-and-persist', {
    cells: before.slots,
    paper: [before.width, before.height],
    restartGeometryExact: true,
  });
  await journey.checkpoint('manual-layout-reopened');
});
