import { test, expect } from '@playwright/test';

test.describe('Professional E2E & Visual Testing Suite', () => {

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
          },
          LicenseHandler: {
            GetLicenseStatus: async () => ({
              id: "mock-user",
              email: "e2e-test@grido.app",
              name: "E2E Tester",
              plan: "pro",
              status: "active",
              expiresAt: "2030-01-01T00:00:00Z",
              token: "mock-token"
            })
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

  test('Open app, upload image, and save project', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Grido Studio | استوديو الهوية')).toBeVisible();

    await page.getByTitle('وضع التعديل الحر').click();
    await page.getByTitle('رفع صورة جديدة').click();

    await expect(page.getByText('خصائص الصورة')).toBeVisible();

    await page.getByTitle('مكتبة المشاريع المحلية').click();
    await expect(page.getByRole('dialog', { name: 'مكتبة المشاريع المحلية' })).toBeVisible();

    await page.fill('#proj-name', 'مشروع اختباري');

    await page.getByRole('button', { name: 'حفظ في قاعدة البيانات' }).click();

    await expect(page.getByText('تم حفظ المشروع بنجاح في قاعدة البيانات المحلية')).toBeVisible();
  });

});
