import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

/** Open exactly once from persistent GUI state, never race visibility with a
 * second click (which can collapse the drawer during its first render). */
export async function openCollageGridSection(page: Page): Promise<void> {
  const grid = page.getByTestId('rail-collage-grid');
  await expect(grid).toBeVisible();
  const drawer = page.getByTestId('workspace-panel-templates');
  if (
    (await grid.getAttribute('aria-pressed')) !== 'true' ||
    (await drawer.getAttribute('data-collapsed')) === 'true'
  )
    await grid.click();
  await expect(drawer).toHaveAttribute('data-collapsed', 'false');
  await expect(grid).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('segmented-custom')).toBeVisible();
}

/** No name preserves the existing custom-grid behavior. A name means the
 * actual saved-template GUI, not an ignored argument/default custom grid.
 * Built-in combo presets were removed; named mock fixtures are saved users'
 * templates, and the test ledger discloses that integration boundary. */
export async function applyCollagePreset(page: Page, presetTitle?: string): Promise<void> {
  await openCollageGridSection(page);
  if (presetTitle) {
    const presets = page.getByTestId('segmented-presets');
    await presets.click();
    await expect(presets).toHaveAttribute('aria-selected', 'true');
    const card = page.getByRole('button', { name: new RegExp(`^${presetTitle} \\d+ صور$`) });
    await expect(card).toBeVisible();
    const name = await card.getAttribute('aria-label');
    const count = Number(name!.match(/ (\d+) صور$/)![1]);
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    // Read-only output observation; application itself is exclusively GUI-driven.
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const storePath = '/src/lib/editor-store.ts';
          const { useEditorStore } = await import(/* @vite-ignore */ storePath);
          const { collageTemplate, slots } = useEditorStore.getState();
          return {
            name: collageTemplate?.name,
            cells: collageTemplate?.cells.length,
            slots: slots.length,
          };
        }),
      )
      .toEqual({ name: presetTitle, cells: count, slots: count });
  } else {
    const custom = page.getByTestId('segmented-custom');
    await custom.click();
    await expect(custom).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: 'تطبيق الشبكة', exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const storePath = '/src/lib/editor-store.ts';
          const { useEditorStore } = await import(/* @vite-ignore */ storePath);
          const state = useEditorStore.getState();
          return (
            state.collageTemplate?.id === 'collage-custom' &&
            state.slots.length === state.collageTemplate.cells.length
          );
        }),
      )
      .toBe(true);
  }
}
