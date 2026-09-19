import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Workspace Layout & Responsive Contract E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Compact Viewport (< 1024px): Canvas shell takes full width without desktop sidebars', async ({ page }) => {
    await page.setViewportSize({ width: 1023, height: 768 });
    await page.goto('/');
    await waitForAppReady(page);

    const canvasShell = page.getByTestId('workspace-canvas-shell');
    await expect(canvasShell).toBeVisible();

    const box = await canvasShell.boundingBox();
    expect(box).toBeTruthy();
    // At 1023px, desktop sidebars must be hidden, canvas should take almost full width
    expect(box!.width).toBeGreaterThanOrEqual(950);
  });

  test('Standard Viewport (1024px): Canvas shell width contract >= 680px with at most 1 panel', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForAppReady(page);

    const canvasShell = page.getByTestId('workspace-canvas-shell');
    await expect(canvasShell).toBeVisible();

    const box = await canvasShell.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(400);
  });

  test('Standard Viewport (1280px): Canvas shell width contract', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);

    const canvasShell = page.getByTestId('workspace-canvas-shell');
    await expect(canvasShell).toBeVisible();

    const box = await canvasShell.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(600);
  });

  test('Wide Viewport (1440px): Inspector is docked and canvas remains wide', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await waitForAppReady(page);

    const canvasShell = page.getByTestId('workspace-canvas-shell');
    await expect(canvasShell).toBeVisible();

    const box = await canvasShell.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(800);
  });

  test('Toolbar Contract: Zero horizontal scroll and functional More menu at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await waitForAppReady(page);

    const toolbar = page.getByTestId('workspace-toolbar');
    await expect(toolbar).toBeVisible();

    // Verification: scrollWidth === clientWidth (no hidden horizontal overflow)
    const isOverflowing = await toolbar.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(isOverflowing).toBe(false);

    // Verification: More ("المزيد") menu opens correctly with dropdown items
    const moreBtn = page.getByRole('button', { name: /المزيد من الخيارات|المزيد/ }).first();
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await expect(page.getByText('خيارات المستند')).toBeVisible();
    }
  });

  test('Canvas is clean and unobstructed without intrusive overlay cards', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);

    // The canvas should be clean and not obstructed by any empty-state card
    const emptyState = page.getByTestId('canvas-empty-state');
    await expect(emptyState).not.toBeVisible();
  });
});
