import { test, expect } from '@playwright/test';

test.describe('Background Removal Smoke Test', () => {

  test.beforeEach(async ({ page }) => {
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

  test('Upload image and expose background removal controls', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.getByTitle('وضع التعديل الحر').click();
    await page.getByTitle('رفع صورة جديدة').click();

    await expect(page.getByText('خصائص الصورة')).toBeVisible();
    await expect(page.getByText('عزل الخلفية')).toBeVisible();
  });

});
