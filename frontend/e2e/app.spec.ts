import { test, expect } from '@playwright/test';

test.describe('Professional E2E & Visual Testing Suite', () => {

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
            GetAllProjects: async () => [
              { id: 1, name: 'مشروع اختباري', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), canvas_data: '{}' }
            ],
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

  test('Comprehensive User Journey: Open app, select template, upload image, and save project', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');

    // 2. Verify app loads successfully
    const basicTab = page.locator('text=حر (مفرد)');
    await expect(basicTab).toBeVisible();
    await basicTab.click();

    // 3. Select a category and apply a template
    await page.click('text=جواز السفر');
    const firstTemplate = page.locator('button:has-text("جواز سفر")').first();
    await expect(firstTemplate).toBeVisible();
    await firstTemplate.click();

    // Verify template name is displayed in toolbar
    const toolbarTemplateName = page.locator('span:has-text("جواز سفر · 35×45 ملم")').first();
    await expect(toolbarTemplateName).toBeVisible();

    // 4. Upload an image
    const uploadButton = page.locator('button:has-text("رفع صورة")');
    await expect(uploadButton).toBeVisible();
    await uploadButton.click();

    // Wait for state to update
    await page.waitForTimeout(500); 

    // 5. Open Projects Library
    const libraryButton = page.locator('button:has-text("مكتبة المشاريع")');
    await libraryButton.click();

    // Verify the dialog opens
    const dialogTitle = page.locator('h2:has-text("مكتبة المشاريع المحلية")');
    await expect(dialogTitle).toBeVisible();

    // 6. Save current project
    await page.fill('#proj-name', 'مشروع اختباري');
    
    const saveButton = page.locator('button:has-text("حفظ في قاعدة البيانات")');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // The mock backend returns success, verify the success toast appears
    const successToast = page.locator('text=تم حفظ المشروع بنجاح في قاعدة البيانات المحلية');
    await expect(successToast).toBeVisible();
    
    // 7. Close dialog
    // Dialog closes automatically on save or we can click outside
  });

});
