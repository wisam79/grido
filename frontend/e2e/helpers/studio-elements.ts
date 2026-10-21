import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

export type StudioElementsCategory = 'stickers' | 'shapes' | 'text';

/**
 * يفتح أداة الإدراج من زرها المستقل في شريط الأيقونات (الملصقات/الأشكال/النصوص).
 * النقر على وجهة نشطة يطوي لوحها، فالنقرة الثانية تضمن الفتح.
 */
export async function openStudioElementsCategory(
  page: Page,
  category: StudioElementsCategory,
): Promise<void> {
  const railBtn = page.getByTestId(`rail-studio-${category}`);
  const panel = page.getByTestId(`studio-elements-${category}`);

  if ((await railBtn.count()) > 0) {
    if (!(await panel.isVisible())) {
      await railBtn.click();
    }
    if (!(await panel.isVisible())) {
      await railBtn.click();
    }
  }

  await expect(panel).toBeVisible();
  await expect(railBtn).toHaveAttribute('aria-pressed', 'true');
}
