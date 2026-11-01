import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

/**
 * مساعد تطبيق قالب جاهز في وضع الكولاج — مصدر واحد لتدفقه في المواصفات الثلاث
 * (collage-mode / grid-collage / workflows) بدل ثلاث نسخ متقادمة تحمل محدد
 * `[data-tab="presets"]` الميت (انتقلت الواجهة إلى وجهة الشبكة وتبويباتها
 * الداخلية segmented-*).
 *
 * التدفق الإلزامي: وجهة «الشبكة» في الشريط الجانبي → تبويب «قوالب» → بطاقة
 * القالب. كل خطوة مؤكدة بـ toBeVisible — فشل أي عنصر فشل صريح للاختبار،
 * لا تخطٍّ صامت على عنصر غير ظاهر (نمط ملغى في الدفعة 4).
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

  const presetsSeg = page.getByTestId('segmented-presets');
  await presetsSeg.click();
  await expect(presetsSeg).toHaveAttribute('aria-selected', 'true');
}

/**
 * يفتح تبويب القوالب الجاهزة ويطبّق قالباً بعنوانه، ويؤكد تطبيقه فعلاً
 * بحالة البطاقة النشطة (aria-pressed=true من activeTemplateId).
 */
export async function applyCollagePreset(page: Page, presetTitle: string): Promise<void> {
  await openCollageGridSection(page);

  // بطاقات القوالب تحمل aria-label بالشكل «العنوان - المواصفة»
  const card = page.getByRole('button', { name: new RegExp(`^${presetTitle}`) }).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
}
