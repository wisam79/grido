import { setupWailsV3Bridge, waitForAppReady } from './wails-v3-bridge';

import type { Page } from '@playwright/test';

export { setupWailsV3Bridge, waitForAppReady };

/**
 * دالة التهيئة الموحدة لمحاكي Wails في بيئة Playwright E2E
 * تدعم كلاً من معمارية Wails v3 الحالية وتوافقية واجهات v2
 * - تتخطى شاشة الترحيب بضبط grido_workflow_mode='studio' في localStorage
 */
export async function setupWailsMock(page: Page) {
  await setupWailsV3Bridge(page);
}
