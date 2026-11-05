import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

/**
 * مساعد تطبيق شبكة الكولاج في وضع الكولاج — مصدر واحد لتدفقه في المواصفات
 * (collage-mode / grid-collage / workflows).
 *
 * التدفق الإلزامي: وجهة «الشبكة» في الشريط الجانبي → تبويب «مخصص» → تطبيق الشبكة.
 */

/** يضمن فتح لوح «شبكة الكولاج» على تبويبه الافتراضي (مخصص) قبل أي شيء */
export async function openCollageGridSection(page: Page): Promise<void> {
  const gridBtn = page.getByTestId('rail-collage-grid');
  const customSeg = page.getByTestId('segmented-custom');

  if (!(await customSeg.isVisible())) {
    await gridBtn.click();
  }
  if (!(await customSeg.isVisible())) {
    // النقر على وجهة مفتوحة أصلاً يطوي لوحها — نقرة ثانية تضمن الفتح
    await gridBtn.click();
  }
  await expect(customSeg).toBeVisible();
}

/**
 * يفتح تبويب الشبكة ويطبّق الشبكة المخصصة على الكانفس ويؤكد استقراره.
 */
export async function applyCollagePreset(page: Page, _presetTitle?: string): Promise<void> {
  await openCollageGridSection(page);

  const applyBtn = page.getByRole('button', { name: 'تطبيق الشبكة' }).first();
  await expect(applyBtn).toBeVisible();
  await applyBtn.click();
}
