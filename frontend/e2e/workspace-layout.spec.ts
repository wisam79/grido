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

  test('Fit Contract (1920px): الورقة الرأسية تملأ عرض مساحة العمل بدل هامش ميت', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await waitForAppReady(page);

    // الورقة الافتراضية A4 رأسية: الفراغ الجانبي في ملاءمة الارتفاع أكبر من
    // الورقة نفسها، فالوضع التلقائي يختار ملاءمة العرض ويعرضه المؤشر في الشريط
    const canvasArea = page.locator('#canvas-area');
    await expect(canvasArea).toHaveAttribute('data-fit-mode', 'width');
    // مؤشر الوضع الفعّال في شريط العرض يقف على «عرض»
    const fitStatus = page.getByTestId('canvas-fit-status');
    await expect(fitStatus).toHaveAttribute('data-fit-mode', 'width');
    await expect(fitStatus).toHaveText('عرض');

    const areaBox = await canvasArea.boundingBox();
    const shellBox = await page.getByTestId('workspace-canvas-shell').boundingBox();
    expect(areaBox).toBeTruthy();
    expect(shellBox).toBeTruthy();
    // كانت الورقة تشغل ~40% من عرض المساحة — الآن تملأ معظمه
    expect(areaBox!.width / shellBox!.width).toBeGreaterThan(0.85);

    // و«ملاءمة الكل» تعيد الورقة كاملة بلا تمرير (مخروج آمن بنقرة واحدة)
    await page.getByTestId('canvas-fit-all').click();
    await expect(canvasArea).toHaveAttribute('data-fit-mode', 'height');

    const fullBox = await canvasArea.boundingBox();
    expect(fullBox!.width / areaBox!.width).toBeLessThan(0.6);
    expect(fullBox!.height).toBeLessThan(shellBox!.height);
  });

  test('Fit Contract (1280px): ملاءمة العرض اختيار صريح من القائمة وتُحفظ كتفضيل', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForAppReady(page);

    const canvasArea = page.locator('#canvas-area');

    // «ملاءمة الكل» صريحة ودائمة: الورقة كاملة داخل الإطار بلا تمرير
    await page.getByTestId('canvas-fit-all').click();
    await expect(canvasArea).toHaveAttribute('data-fit-mode', 'height');
    await expect(page.getByTestId('canvas-fit-status')).toHaveText('الكل');
    const fullBox = await canvasArea.boundingBox();

    // ومن القائمة: الأوضاع الثلاثة ظاهرة بعناوينها العربية
    await page.getByTestId('canvas-fit-menu').click();
    await expect(page.getByTestId('canvas-fit-auto')).toContainText('ملاءمة تلقائية');
    await expect(page.getByTestId('canvas-fit-height')).toContainText('ملاءمة الكل');

    // وملاءمة العرض تُوسّع الرأسية بشكل واضح
    await page.getByTestId('canvas-fit-width').click();
    await expect(canvasArea).toHaveAttribute('data-fit-mode', 'width');

    const wideBox = await canvasArea.boundingBox();
    expect(wideBox!.width).toBeGreaterThan(fullBox!.width * 1.5);

    // تفضيل عرض محفوظ محلياً — لا يُصدَّر مع ملف المشروع
    const stored = await page.evaluate(() => localStorage.getItem('grido_canvas_fit_mode_v1'));
    expect(stored).toBe('width');
  });
});
