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

  test('Switch to collage mode and apply a ready-made template', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();
    await page.getByTitle('وضع الكولاج').click();

    await page.getByRole('button', { name: 'قوالب كولاج جاهزة...' }).click();

    const dialog = page.getByRole('dialog', { name: 'اختيار قالب كولاج جاهز' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'ثلاث صور' }).click();

    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'قوالب كولاج جاهزة...' }).click();
    const reopenedDialog = page.getByRole('dialog', { name: 'اختيار قالب كولاج جاهز' });
    await expect(reopenedDialog).toBeVisible();
    await expect(reopenedDialog.getByRole('button', { name: 'ثلاث صور' })).toHaveClass(/border-primary/);
  });

});
