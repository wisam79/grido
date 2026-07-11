import { test, expect } from '@playwright/test';

test.describe('Collage Mode and Filters E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Inject mock Wails backend and runtime bindings before the app loads
    await page.addInitScript(() => {
      (window as any).go = {
        main: {
          App: {
            OpenFile: async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            LoadAutoSave: async () => '',
            SaveAutoSave: async () => {},
            ClearAutoSave: async () => {},
            SaveFileDialog: async () => 'success',
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

  test('Switch to collage mode and apply an official template', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
    await page.getByTitle('وضع الكولاج').click();

    // Toggle open official print templates
    const toggleBtn = page.getByRole('button', { name: 'قوالب الكولاج والطباعة' });
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    // Select the mixed template
    const mixedTemplateCard = page.getByText('طقم هوية ومعاملات عراقية (مختلط)').first();
    await expect(mixedTemplateCard).toBeVisible();
    await mixedTemplateCard.click();
  });

});
