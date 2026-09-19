import { test, expect } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

test.describe('Projects Manager & Backup Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Open projects modal, switch tabs, and inspect save/list/backup sections', async ({ page }) => {
    // Open projects dialog from toolbar
    const projectsBtn = page.getByTestId('toolbar-projects').or(page.getByRole('button', { name: /مشاريع/ })).first();
    await expect(projectsBtn).toBeVisible();
    await projectsBtn.click();

    const dialog = page.getByRole('dialog').filter({ hasText: /مشاريع|المشاريع/ });
    await expect(dialog).toBeVisible();

    // Verify segmented control tabs
    const saveTab = dialog.getByRole('tab', { name: /حفظ/ }).first();
    const listTab = dialog.getByRole('tab', { name: /المشاريع/ }).first();
    const backupTab = dialog.getByRole('tab', { name: /النسخ/ }).first();

    await expect(saveTab).toBeVisible();
    await expect(listTab).toBeVisible();
    await expect(backupTab).toBeVisible();

    // 1. Test Save tab
    await saveTab.click();
    const nameInput = dialog.getByPlaceholder(/اسم المشروع/);
    await expect(nameInput).toBeVisible();
    await nameInput.fill('مشروع اختباري جديد');

    const saveSubmitBtn = dialog.getByRole('button', { name: /حفظ المشروع/ }).first();
    await expect(saveSubmitBtn).toBeVisible();
    await saveSubmitBtn.click();

    // 2. Test List tab & Search
    await listTab.click();
    const searchInput = dialog.getByPlaceholder(/بحث في المشاريع/);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('اختباري');

    // 3. Test Backup tab
    await backupTab.click();
    const exportBackupBtn = dialog.getByRole('button', { name: /تصدير JSON/ }).first();
    await expect(exportBackupBtn).toBeVisible();

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
