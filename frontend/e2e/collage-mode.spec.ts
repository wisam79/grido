import { test, expect } from '@playwright/test';

test.describe('Collage Mode and Filters E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Inject mock Wails backend and runtime bindings before the app loads
    await page.addInitScript(() => {
      (window as any).go = {
        main: {
          App: {
            OpenFile: async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            ClearAutoSave: async () => {},
          }
        },
        handlers: {
          ProjectHandler: {
            SaveProject: async () => 'success',
            GetAllProjects: async () => [],
            GetProject: async () => null,
            DeleteProject: async () => 'success',
          }
        }
      };
      (window as any).runtime = {
        WindowMinimise: () => {},
        WindowToggleMaximise: () => {},
        Quit: () => {},
      };
    });
  });

  test('Switch to collage mode, add image, and apply filter', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');

    // 2. Switch to collage mode tab
    const collageTab = page.getByRole('button', { name: 'كولاج', exact: true });
    await expect(collageTab).toBeVisible();
    await collageTab.click();

    // Verify template panel shows collage templates
    const collageTemplate = page.locator('button:has-text("ثلاث صور")').first();
    await expect(collageTemplate).toBeVisible();
    await collageTemplate.click();

    // Verify slots are rendered
    const slots = page.locator('[data-slot-id]');
    await expect(slots).toHaveCount(3); // "ثلاث صور" has 3 slots

    // 3. Click the first slot to add an image (mocked via OpenFile)
    await slots.first().click();

    // Verify image was added (image element inside slot)
    const slotImage = slots.first().locator('img');
    await expect(slotImage).toBeVisible();

    // 4. Apply a filter to the first slot
    // In collage mode, after selecting a slot with an image, slot properties should be visible
    // Wait for the properties panel to show "المرشحات الجاهزة"
    const filtersHeader = page.locator('label:has-text("المرشحات الجاهزة")');
    await expect(filtersHeader).toBeVisible();

    // Click on the "أبيض وأسود" (Grayscale) filter
    const grayscaleFilter = page.locator('button:has-text("أبيض وأسود")');
    await grayscaleFilter.click();

    // Verify that the filter is applied to the image (we can check the style property)
    // The image should have a style attribute containing "grayscale"
    const styleAttribute = await slotImage.getAttribute('style');
    expect(styleAttribute).toContain('grayscale');
  });

});
