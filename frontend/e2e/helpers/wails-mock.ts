import { Page } from '@playwright/test';
import { setupWailsV3Bridge, waitForAppReady } from './wails-v3-bridge';

export { setupWailsV3Bridge, waitForAppReady };

export interface SetupWailsMockOptions {
  /**
   * تخطي شاشة الترحيب بضبط grido_workflow_mode في localStorage تلقائياً.
   * الافتراضي true لتغطية الاختبارات الموجودة.
   * اضبطه false في اختبارات شاشة الترحيب.
   */
  skipWelcome?: boolean;
}

/**
 * دالة التهيئة الموحدة لمحاكي Wails في بيئة Playwright E2E
 * تدعم كلاً من معمارية Wails v3 الحالية وتوافقية واجهات v2
 */
export async function setupWailsMock(page: Page, options: SetupWailsMockOptions = {}) {
  await setupWailsV3Bridge(page, { skipWelcome: options.skipWelcome ?? true });
}
