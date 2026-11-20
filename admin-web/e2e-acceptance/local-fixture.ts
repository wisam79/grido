import { test as base, expect, type Page } from '@playwright/test';

export const fixture = {
  url: required('SUPABASE_URL'), key: required('SUPABASE_ANON_KEY'), runId: required('E2E_RUN_ID'),
  adminEmail: required('E2E_ADMIN_EMAIL'), adminPassword: required('E2E_ADMIN_PASSWORD'), adminId: required('E2E_ADMIN_ID'),
  userEmail: required('E2E_USER_EMAIL'), userPassword: required('E2E_USER_PASSWORD'), userId: required('E2E_USER_ID'),
  // Dedicated mutation target avoids revoking the Go/frontend login principal.
  targetEmail: required('E2E_TARGET_EMAIL'), targetId: required('E2E_TARGET_ID'),
};
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing disposable fixture variable ${name}`);
  return value;
}

export const test = base.extend<{ localOnly: void }>({
  localOnly: [async ({ context, baseURL }, use) => {
    const unexpected: string[] = [];
    const allowed = new Set([new URL(baseURL!).origin, new URL(fixture.url).origin, 'http://127.0.0.1:9348']);
    // Only deny external egress. Every local auth/REST/storage response is real;
    // no fulfill, fake sessions, mock APIs or scripted success paths.
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (allowed.has(url.origin)) { await route.continue(); return; }
      if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
        unexpected.push(`${route.request().method()} ${url.origin}${url.pathname}`);
      }
      await route.abort('blockedbyclient');
    });
    await context.routeWebSocket('**/*', socket => {
      const url = new URL(socket.url());
      url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
      if (allowed.has(url.origin)) socket.connectToServer();
      else {
        unexpected.push(`WS ${url.origin}${url.pathname}`);
        socket.close({ code: 1008, reason: 'External connections forbidden in disposable acceptance' });
      }
    });
    await use();
    expect(unexpected, 'No cloud/external service was used').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function loginAdmin(page: Page, email = fixture.adminEmail, password = fixture.adminPassword) {
  await page.goto('/admin');
  await expect(page.getByLabel('البريد الإلكتروني للمسؤول')).toBeVisible();
  await page.getByLabel('البريد الإلكتروني للمسؤول').fill(email);
  await page.getByLabel('كلمة المرور', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'تسجيل الدخول كمسؤول', exact: true }).click();
}

export async function adminToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('grido_admin_auth') || 'null');
    return session?.access_token as string | undefined;
  });
  if (!token) throw new Error('GUI login did not establish a real session');
  return token;
}

// Server-side assertions use only anon + individual real auth token. No bypass
// key, database connection, service-role API or policy changes in test code.
export async function rest(token: string, endpoint: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${fixture.url}${endpoint}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { apikey: fixture.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { status: response.status, ok: response.ok, data };
}

export async function userToken(): Promise<string> {
  const result = await rest(fixture.key, '/auth/v1/token?grant_type=password', 'POST', {
    email: fixture.userEmail, password: fixture.userPassword,
  });
  if (!result.ok || !result.data?.access_token) throw new Error('Disposable user login failed');
  return result.data.access_token;
}

export async function profile(token: string, id = fixture.targetId) {
  const result = await rest(token, `/rest/v1/profiles?select=id,name,email,plan,status,expires_at,license_key&id=eq.${id}`);
  expect(result.ok, 'Real profile REST read succeeds').toBe(true);
  expect(result.data, 'Exactly one authorized target profile').toHaveLength(1);
  return result.data[0] as { id: string; name: string; email: string; plan: string; status: string; expires_at: string; license_key: string | null };
}
