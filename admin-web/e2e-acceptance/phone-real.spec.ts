import { Buffer } from 'node:buffer';
import { test, expect, fixture, rest } from './local-fixture';

test('[P01] actual /cam pairs with second browser peer, uploads real storage and broadcasts real realtime', async ({ context, page }, testInfo) => {
  testInfo.annotations.push({ type: 'fixture', description: 'actual-local-supabase phone transport; explicit test peer, not desktop canvas import or physical camera' });
  const phoneId = process.env.E2E_PHONE_ID!;
  expect(phoneId).toBeTruthy();
  await page.goto('http://127.0.0.1:9348/e2e-acceptance/phone-receiver.html');
  await page.getByLabel('Email', { exact: true }).fill(process.env.E2E_PHONE_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PHONE_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in receiver' }).click();
  await expect(page.getByRole('status')).toHaveText('Receiver subscribed');
  const session = await page.getByLabel('Session capability').inputValue();
  expect(session).toMatch(new RegExp(`^${phoneId}/[a-f0-9]{32}$`));
  const token = await page.evaluate(() => (window as unknown as { __phoneReceiverToken: string }).__phoneReceiverToken);
  const sender = await context.newPage();
  try {
    await sender.goto(`/cam#session=${encodeURIComponent(session)}`);
    await expect(page.locator('#paired')).toHaveText('Received real phone pairing event');
    await expect(sender.getByText('ورد تأكيد سطح المكتب', { exact: true })).toBeVisible();
    await expect(sender.getByText('قناة الإرسال جاهزة', { exact: true })).toBeVisible();
    await expect(sender.getByText('أُرسلت مصافحة التخزين', { exact: true })).toBeVisible();
    // Synthetic file content only. Browser camera is not monkey-patched and no
    // physical camera success is inferred; actual file selection/transport used.
    const photoData = await sender.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 48;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#334155'; ctx.fillRect(0, 0, 64, 48);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(8, 8, 48, 32);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await sender.getByLabel('ملفات الصور', { exact: true }).setInputFiles({
      name: 'synthetic-acceptance.png', mimeType: 'image/png', buffer: Buffer.from(photoData, 'base64'),
    });
    await expect(sender.getByLabel('رُفعت 1 صور إلى التخزين')).toBeVisible();
    await expect(page.locator('#photo-status')).toHaveText('Received real photo-ready event and downloaded owner object');
    await expect(page.getByAltText('Received synthetic photo')).toBeVisible();
    await expect.poll(() => page.getByAltText('Received synthetic photo').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(64);

    const listing = await rest(token, '/storage/v1/object/list/phone-bridge', 'POST', { prefix: session, limit: 100 });
    expect(listing.ok).toBe(true);
    const handshake = listing.data.find((item: { name: string }) => item.name.endsWith('.handshake.json'));
    const upload = listing.data.find((item: { name: string }) => item.name.endsWith('synthetic-acceptance.png'));
    expect(handshake).toBeTruthy();
    expect(upload).toBeTruthy();
    const objectPath = `${session}/${upload.name}`;
    const anonList = await rest(fixture.key, '/storage/v1/object/list/phone-bridge', 'POST', { prefix: session, limit: 100 });
    expect(anonList.ok).toBe(true);
    expect(anonList.data).toEqual([]);
    const nonOwnerAuth = await rest(fixture.key, '/auth/v1/token?grant_type=password', 'POST', {
      email: process.env.E2E_TARGET_EMAIL, password: process.env.E2E_TARGET_PASSWORD,
    });
    expect(nonOwnerAuth.ok).toBe(true);
    const nonOwnerToken = nonOwnerAuth.data.access_token as string;
    try {
      const foreignList = await rest(nonOwnerToken, '/storage/v1/object/list/phone-bridge', 'POST', { prefix: session, limit: 100 });
      expect(foreignList.ok).toBe(true);
      expect(foreignList.data).toEqual([]);
      for (const blockedToken of [fixture.key, nonOwnerToken]) {
        const download = await fetch(`${fixture.url}/storage/v1/object/authenticated/phone-bridge/${objectPath}`, {
          redirect: 'error', signal: AbortSignal.timeout(15_000),
          headers: { apikey: fixture.key, Authorization: `Bearer ${blockedToken}` },
        });
        expect(download.ok, 'Private object cannot be read by anon or another user').toBe(false);
        expect([400, 401, 403, 404]).toContain(download.status);
      }
      const publicDownload = await fetch(`${fixture.url}/storage/v1/object/public/phone-bridge/${objectPath}`, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
      expect(publicDownload.ok, 'Private bucket rejects public object URL').toBe(false);
      await page.getByRole('button', { name: 'Delete consumed photo' }).click();
      await expect(page.locator('#purged')).toHaveText('Consumed photo deleted');
      const remaining = await rest(token, '/storage/v1/object/list/phone-bridge', 'POST', { prefix: session, limit: 100 });
      expect(remaining.ok).toBe(true);
      expect(remaining.data.some((item: { name: string }) => item.name === upload.name)).toBe(false);
    } finally {
      await rest(nonOwnerToken, '/auth/v1/logout', 'POST');
    }
  } finally {
    await sender.close();
    const listing = await rest(token, '/storage/v1/object/list/phone-bridge', 'POST', { prefix: session, limit: 100 });
    if (listing.ok && listing.data.length) {
      const cleanup = await rest(token, '/storage/v1/object/phone-bridge', 'DELETE', {
        prefixes: listing.data.map((item: { name: string }) => `${session}/${item.name}`),
      });
      expect(cleanup.ok).toBe(true);
    }
    await rest(token, '/auth/v1/logout', 'POST');
  }
});
