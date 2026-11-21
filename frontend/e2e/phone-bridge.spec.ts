import { expect } from '@playwright/test';

import { runWorkspaceCommand } from './helpers/studio-elements';
import { test, setupWailsMock, waitForAppReady } from './helpers/wails-mock';
import { getMockLedger } from './helpers/wails-v3-bridge';

test.describe('Phone bridge GUI — stateful mocked integration, no real phone/server', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Start bridge via GUI, show session QR/address, restart and stop truthfully', async ({
    page,
  }) => {
    await runWorkspaceCommand(page, 'phone-bridge');
    const dialog = page.getByRole('dialog', { name: 'جسر كاميرا الهاتف', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('الجسر متصل ويعمل', { exact: true })).toBeVisible();
    await expect(dialog.getByText('127.0.0.1:8741', { exact: true })).toBeVisible();
    const address = dialog.getByRole('textbox', { name: 'رابط جسر الكاميرا', exact: true });
    await expect(address).toHaveValue('http://127.0.0.1:8741/cam?token=mock-token-1');
    // QR is the actual 190px QR renderer, not the first decorative icon.
    await expect(dialog.locator('svg[width="190"][height="190"]')).toBeVisible();
    const ledger = getMockLedger(page)!;
    expect(
      ledger.rpc.filter((call) => call.name === 'GetPhoneBridgeStatus').at(-1)?.result,
    ).toMatchObject({ isRunning: true });
    const startCallsBeforeRestart = ledger.rpc.filter(
      (call) => call.name === 'StartPhoneBridge',
    ).length;
    expect(startCallsBeforeRestart).toBeGreaterThanOrEqual(1);

    await dialog.getByRole('button', { name: 'إعادة تعيين الجلسة', exact: true }).click();
    await expect(address).toHaveValue('http://127.0.0.1:8741/cam?token=mock-token-2');
    await expect(dialog.getByText('الجسر متصل ويعمل', { exact: true })).toBeVisible();
    await expect(page.getByText('تمت إعادة تشغيل الجسر', { exact: true })).toBeVisible();
    expect(ledger.rpc.filter((call) => call.name === 'StartPhoneBridge')).toHaveLength(
      startCallsBeforeRestart + 1,
    );
    expect(ledger.rpc.filter((call) => call.name === 'StopPhoneBridge')).toHaveLength(1);

    await dialog.getByRole('button', { name: 'إيقاف الجسر', exact: true }).click();
    await expect(dialog.getByText('الجسر متوقف حالياً', { exact: true })).toBeVisible();
    await expect(address).toHaveCount(0);
    await expect(dialog.locator('svg[width="190"][height="190"]')).toHaveCount(0);
    await expect(dialog.getByText('الجسر متصل ويعمل', { exact: true })).toHaveCount(0);
    expect(ledger.rpc.filter((call) => call.name === 'StopPhoneBridge')).toHaveLength(2);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
