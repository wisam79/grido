import { randomUUID } from 'node:crypto';
import { test, expect, fixture, loginAdmin, adminToken, profile, rest, userToken } from './local-fixture';

test('[A01] real admin GUI login, search/edit, create key, revoke cancel/confirm, logout', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'fixture', description: 'actual-local-supabase; unchanged migrations and real auth/REST/RLS; no service-role in browser' });
  await loginAdmin(page);
  const row = page.getByRole('row').filter({ hasText: fixture.targetEmail });
  await expect(row).toBeVisible();
  const token = await adminToken(page);
  const before = await profile(token);
  expect(before.status).toBe('active');
  expect(new Date(before.expires_at).getTime()).toBeGreaterThan(Date.now());

  await page.getByLabel('ابحث بالاسم أو البريد الإلكتروني أو مفتاح الترخيص').fill(`missing-${fixture.runId}`);
  await expect(page.getByText('لا توجد نتائج تطابق خيارات البحث الحالية.')).toBeVisible();
  await page.getByLabel('ابحث بالاسم أو البريد الإلكتروني أو مفتاح الترخيص').fill(fixture.targetEmail);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'تعديل', exact: true }).click();
  const edit = page.getByRole('dialog', { name: `تعديل حساب: ${fixture.targetEmail}` });
  await expect(edit).toBeVisible();
  await edit.getByLabel('الاسم الكامل').fill(`Edited ${fixture.runId}`);
  await edit.getByLabel('الباقة المستهدفة').selectOption('enterprise');
  await edit.getByLabel('حالة الحساب').selectOption('active');
  const expiry = new Date(Date.now() + 120 * 86400_000).toISOString().split('T')[0];
  await edit.getByLabel('تاريخ انتهاء الصلاحية').fill(expiry);
  await edit.getByRole('button', { name: 'حفظ التعديلات' }).click();
  await expect(edit).not.toBeVisible();
  await expect(row).toContainText(`Edited ${fixture.runId}`);
  const saved = await profile(token);
  expect(saved.name).toBe(`Edited ${fixture.runId}`);
  expect(saved.plan).toBe('enterprise');
  expect(saved.expires_at.slice(0, 10)).toBe(expiry);

  await row.getByRole('button', { name: '+شهر', exact: true }).click();
  await expect(page.getByText('تم تمديد صلاحية الحساب بمقدار 1 شهر بنجاح.')).toBeVisible();
  const extended = await profile(token);
  expect(new Date(extended.expires_at).getTime()).toBeGreaterThan(new Date(saved.expires_at).getTime());

  await page.getByRole('button', { name: /مفاتيح التراخيص/ }).click();
  await page.getByLabel('بادئة مخصصة').fill(`E2E-${fixture.runId}`);
  await page.getByLabel('الباقة', { exact: true }).selectOption('pro');
  await page.getByLabel('مدة الصلاحية', { exact: true }).selectOption('1');
  const createResponse = page.waitForResponse(response => response.url().endsWith('/rest/v1/rpc/admin_create_license_key') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'توليد المفتاح', exact: true }).click();
  const created = await createResponse;
  expect(created.ok()).toBe(true);
  const keyResult = await created.json() as { key: string };
  expect(keyResult.key).toContain(`E2E-${fixture.runId}`.toUpperCase());
  await expect(page.getByRole('row').filter({ hasText: keyResult.key })).toBeVisible();
  const keys = await rest(token, `/rest/v1/license_keys?select=key,plan,duration_months,status&key=eq.${encodeURIComponent(keyResult.key)}`);
  expect(keys.ok).toBe(true);
  expect(keys.data).toEqual([{ key: keyResult.key, plan: 'pro', duration_months: 1, status: 'unused' }]);

  await page.getByRole('button', { name: /إدارة المشتركين/ }).click();
  await expect(row).toBeVisible();
  let revokes = 0;
  page.on('request', request => { if (request.url().endsWith('/rest/v1/rpc/admin_revoke_license')) revokes += 1; });
  await row.getByRole('button', { name: 'سحب', exact: true }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await expect(confirm).not.toBeVisible();
  expect(revokes, 'Cancel never sends mutation').toBe(0);
  expect(await profile(token)).toEqual(extended);
  await row.getByRole('button', { name: 'سحب', exact: true }).click();
  await confirm.getByRole('button', { name: 'سحب الترخيص', exact: true }).click();
  await expect(confirm).not.toBeVisible();
  await expect(page.getByText('تم إلغاء الترخيص بنجاح.')).toBeVisible();
  expect(revokes).toBe(1);
  const revoked = await profile(token);
  expect(revoked.plan).toBe('free');
  expect(revoked.status).toBe('expired');

  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).filter({ visible: true }).click();
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'إلغاء', exact: true }).click();
  await expect(row).toBeVisible();
  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).filter({ visible: true }).click();
  await confirm.getByRole('button', { name: 'خروج', exact: true }).click();
  await expect(page.getByLabel('البريد الإلكتروني للمسؤول')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('البريد الإلكتروني للمسؤول')).toBeVisible();
  await expect(row).toHaveCount(0);
  // JWT revocation is not asserted: access tokens survive logout until expiry.
});

test('[A02] real non-admin GUI login and anon/user REST authorization are denied', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'fixture', description: 'actual auth sessions + RLS; non-admin app_metadata remains empty' });
  await loginAdmin(page, fixture.userEmail, fixture.userPassword);
  await expect(page.getByText('الدخول مرفوض: هذا الحساب لا يملك صلاحيات مسؤول النظام.')).toBeVisible();
  await expect(page.getByLabel('البريد الإلكتروني للمسؤول')).toBeVisible();
  await expect(page.getByRole('button', { name: /إدارة المشتركين/ })).toHaveCount(0);
  const token = await userToken();
  try {
    const adminCheck = await rest(token, '/rest/v1/rpc/is_admin', 'POST', {});
    expect(adminCheck.data).toBe(false);
    expect(await profile(token, fixture.userId)).toMatchObject({ id: fixture.userId, plan: 'pro', status: 'active' });
    const other = await rest(token, `/rest/v1/profiles?select=id&id=eq.${fixture.adminId}`);
    expect(other.ok).toBe(true);
    expect(other.data).toEqual([]);
    const before = await profile(token, fixture.userId);
    const selfUpgrade = await rest(token, `/rest/v1/profiles?id=eq.${fixture.userId}`, 'PATCH', { plan: 'enterprise', status: 'active' });
    expect(selfUpgrade.status).toBe(403);
    expect(selfUpgrade.data.code).toBe('42501');
    expect(await profile(token, fixture.userId)).toEqual(before);
    const safeName = await rest(token, `/rest/v1/profiles?id=eq.${fixture.userId}`, 'PATCH', { name: `Safe ${fixture.runId}` });
    expect(safeName.ok).toBe(true);
    expect((await profile(token, fixture.userId)).name).toBe(`Safe ${fixture.runId}`);
    for (const roleToken of [fixture.key, token]) {
      for (const [rpc, body] of [
        ['admin_create_license_key', { p_plan: 'pro', p_duration_months: 1, p_custom_key: `FORBIDDEN-${randomUUID()}` }],
        ['admin_extend_license', { p_user_id: fixture.targetId, p_additional_months: 1 }],
        ['admin_revoke_license', { p_user_id: fixture.targetId }],
      ] as const) {
        const result = await rest(roleToken, `/rest/v1/rpc/${rpc}`, 'POST', body);
        expect(result.ok, `${rpc} denied for anon/ordinary user`).toBe(false);
        expect(['42501', 'P0001']).toContain(result.data.code);
      }
    }
    const anonProfiles = await rest(fixture.key, '/rest/v1/profiles?select=id');
    expect(anonProfiles.status).toBe(401);
    expect(anonProfiles.data.code).toBe('42501');
    const userKeys = await rest(token, '/rest/v1/license_keys?select=key');
    expect(userKeys.ok).toBe(true);
    expect(userKeys.data).toEqual([]);
    const grants = await rest(token, '/rest/v1/admin_users?select=user_id');
    expect(grants.ok).toBe(true);
    expect(grants.data).toEqual([]);
  } finally {
    const logout = await rest(token, '/auth/v1/logout', 'POST');
    expect(logout.ok).toBe(true);
  }
});
