import { canvasSnapshot } from './helpers/canvas-readonly';
import { addText, ensureSingle, reopenProject, runCommand, saveProject } from './helpers/gui';
import { test, expect } from './helpers/real-app';

async function settingsAction(page: import('@playwright/test').Page, name: string): Promise<void> {
  await page.getByTestId('rail-settings-menu-trigger').click();
  await page.getByRole('menuitem', { name: new RegExp(name) }).click();
}

test('[J07] Settings theme canvas zoom menu outcomes survive restart', async ({ journey }) => {
  let page = journey.page;
  await ensureSingle(page);
  await addText(page, `Settings ${journey.name}`);
  const before = await canvasSnapshot(page);
  const initiallyDark = await page
    .locator('html')
    .evaluate((html) => html.classList.contains('dark'));
  // Theme is tri-state (system -> light -> dark); choose opposite actual visual state.
  for (let clicks = 0; clicks < 3; clicks++) {
    await page.getByTestId('rail-settings-menu-trigger').click();
    await page.getByTestId('rail-theme-toggle-item').click();
    const dark = await page.locator('html').evaluate((html) => html.classList.contains('dark'));
    if (dark !== initiallyDark) break;
  }
  const dark = await page.locator('html').evaluate((html) => html.classList.contains('dark'));
  expect(dark).not.toBe(initiallyDark);
  const uiScale = () =>
    page
      .locator('html')
      .evaluate((html) =>
        Number((html as HTMLElement).style.getPropertyValue('--grido-ui-zoom') || '1'),
      );
  const originalUiScale = await uiScale();
  await settingsAction(page, 'تكبير حجم الواجهة');
  await expect.poll(uiScale).toBeGreaterThan(originalUiScale);
  const selectedUiScale = await uiScale();
  await runCommand(page, 'zoom-in');
  const zoomed = await canvasSnapshot(page);
  expect(zoomed.width).toBe(before.width);
  expect(zoomed.height).toBe(before.height);
  expect(zoomed.nodes[0].box.width).toBeGreaterThan(before.nodes[0].box.width);
  await runCommand(page, 'zoom-fit');
  await expect(page.getByTestId('canvas-fit-status')).toBeVisible();
  // A real menu action collapses/expands the properties panel (w-0 + data-collapsed), then restores it.
  const properties = page.getByTestId('workspace-panel-properties');
  const wasCollapsed = (await properties.getAttribute('data-collapsed')) === 'true';
  await settingsAction(page, 'لوحة الخصائص والمفتش');
  await expect(properties).toHaveAttribute('data-collapsed', String(!wasCollapsed));
  await settingsAction(page, 'لوحة الخصائص والمفتش');
  await expect(properties).toHaveAttribute('data-collapsed', String(wasCollapsed));
  await saveProject(page, journey.name);
  const selectedText = (await canvasSnapshot(page)).elements.find((el) => el.type === 'text')?.text;
  page = await journey.restart();
  await reopenProject(page, journey.name);
  await expect
    .poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark')))
    .toBe(dark);
  await expect.poll(uiScale).toBe(selectedUiScale);
  expect((await canvasSnapshot(page)).elements.some((el) => el.text === selectedText)).toBe(true);
  journey.record('settings-gui-outcomes', {
    themeDark: dark,
    uiScale: selectedUiScale,
    persistedAcrossRestart: true,
    canvasZoomChangedRenderedBox: true,
    paperDimensionsUnchanged: true,
    menuChangedPanelVisibility: true,
  });
  journey.record(
    'B01-PDF-export',
    'OPEN: no supported GUI PDF export route in current frontend; no direct Go service invocation substituted',
    'blocked',
  );
  journey.record(
    'B02-physical-hardware',
    'No live physical printer, camera, hardware scanner or paper measurements in CI; not simulated as acceptance',
    'blocked',
  );
  journey.record(
    'B03-production-cloud-AI-OAuth',
    'Production cloud inference and third-party OAuth are not provisioned; sandbox password GUI login is separately scoped',
    'blocked',
  );
  journey.record(
    'outside-bounded-suite',
    [
      'AI restoration/background/refine live services',
      'phone bridge pairing/hardware',
      'ICC/soft-proof and physical CMYK',
      'backup/reset/update installation',
      'every inspector/filter/control variant',
    ],
    'not-covered',
  );
  await journey.checkpoint('settings-restarted');
});
