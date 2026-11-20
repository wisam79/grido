import { expect } from '@playwright/test';

import { stageImageSources } from './helpers/konva-probes';
import { test, setupWailsMock, waitForAppReady } from './helpers/wails-mock';
import { getMockLedger } from './helpers/wails-v3-bridge';

test.describe('Project save/reload — stateful mocked integration, not real file persistence', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
  });

  test('Import image, save unique project, change canvas and reload that same saved project', async ({
    page,
  }, testInfo) => {
    const projectName = `مشروع حفظ فريد ${testInfo.project.name}-${testInfo.testId}`;
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('mode-tab-single').click();
    await page.getByTestId('toolbar-insert').click();
    await expect.poll(() => stageImageSources(page)).not.toBe('');
    const savedImage = await stageImageSources(page);
    await page.getByTestId('toolbar-projects').click();
    const library = page.getByRole('dialog');
    await library.getByRole('tab', { name: 'حفظ', exact: true }).click();
    await library.getByRole('textbox', { name: 'اسم المشروع', exact: true }).fill(projectName);
    await library.getByRole('button', { name: 'حفظ المشروع', exact: true }).click();
    await expect(page.getByText('تم حفظ المشروع بنجاح في قاعدة البيانات المحلية')).toBeVisible();
    await expect(library.getByRole('tab', { name: 'المشاريع', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const openProject = library.getByRole('button', {
      name: `فتح المشروع ${projectName}`,
      exact: true,
    });
    await expect(openProject).toBeVisible();
    const ledger = getMockLedger(page)!;
    const save = ledger.rpc.find((call) => call.name === 'SaveProject')!;
    const saved = save.args[0] as { id: string; name: string; elements: string };
    expect(saved.name).toBe(projectName);
    expect(saved.id).not.toBe('mock-proj-1');
    expect(JSON.parse(saved.elements)).toHaveLength(1);
    expect(ledger.projects.find((project) => project.id === saved.id)?.elements).toBe(
      saved.elements,
    );

    // Change the real document via GUI so reload must actually restore it.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await expect.poll(() => stageImageSources(page)).toBe('');
    await page.getByTestId('toolbar-projects').click();
    await library.getByRole('tab', { name: 'المشاريع', exact: true }).click();
    await openProject.click();
    const replace = page.getByRole('alertdialog', { name: 'تحميل مشروع آخر' });
    await expect(replace).toBeVisible();
    await replace.getByRole('button', { name: 'تحميل واستبدال', exact: true }).click();
    await expect(library).toBeHidden();
    await expect(page.getByText(`تم تحميل المشروع: ${projectName}`, { exact: true })).toBeVisible();
    await expect.poll(() => stageImageSources(page)).toBe(savedImage);
    const load = ledger.rpc.filter((call) => call.name === 'GetProject').at(-1)!;
    expect(load.args).toEqual([saved.id]);
    expect(load.result).toMatchObject({
      id: saved.id,
      name: projectName,
      elements: saved.elements,
    });
  });
});
