import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

export type StudioElementsCategory = 'shapes' | 'text';

/** Open from persistent pressed/collapsed state. Await the first render rather
 * than double-clicking based on an instantaneous isVisible race. */
export async function openStudioElementsCategory(
  page: Page,
  category: StudioElementsCategory,
): Promise<void> {
  const rail = page.getByTestId(`rail-studio-${category}`);
  await expect(rail).toBeVisible();
  const drawer = page.getByTestId('workspace-panel-templates');
  if (
    (await rail.getAttribute('aria-pressed')) !== 'true' ||
    (await drawer.getAttribute('data-collapsed')) === 'true'
  )
    await rail.click();
  await expect(page.getByTestId(`studio-elements-${category}`)).toBeVisible();
  await expect(rail).toHaveAttribute('aria-pressed', 'true');
}

/** Execute the real single Ctrl+K launcher, not its internal custom event. */
export async function runWorkspaceCommand(page: Page, id: string): Promise<void> {
  await page.keyboard.press('Control+k');
  const palette = page.getByTestId('command-palette');
  await expect(palette).toBeVisible();
  const command = palette.getByTestId(`command-${id}`);
  await expect(command).toBeEnabled();
  await command.click();
  await expect(palette).toBeHidden();
}
