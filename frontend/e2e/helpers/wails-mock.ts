import { Page } from '@playwright/test';
import { setupWailsV3Bridge, waitForAppReady } from './wails-v3-bridge';

export { setupWailsV3Bridge, waitForAppReady };

/**
 * دالة التهيئة الموحدة لمحاكي Wails في بيئة Playwright E2E
 * تدعم كلاً من معمارية Wails v3 الحالية وتوافقية واجهات v2
 */
export async function setupWailsMock(page: Page) {
  await setupWailsV3Bridge(page);
}
