import { access, readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { canvasSnapshot, clickCanvasNode } from './canvas-readonly';
// @ts-expect-error Independent Node artifact reader has no generated declarations.
import { verifyOutput } from '../../../scripts/e2e/verify-output.mjs';
import type { Journey } from './real-app';
import type { Locator, Page } from '@playwright/test';

export async function runCommand(page: Page, id: string): Promise<void> {
  await page.keyboard.press('Control+k');
  const palette = page.getByTestId('command-palette');
  await expect(palette).toBeVisible();
  const item = page.getByTestId(`command-${id}`);
  await expect(item).toBeEnabled();
  await item.click();
  await expect(palette).not.toBeVisible();
}

export async function ensureSingle(page: Page): Promise<void> {
  await page.getByTestId('mode-tab-single').click();
  await expect(page.getByTestId('mode-tab-single')).toHaveAttribute('aria-selected', 'true');
}

export async function openPanel(page: Page, id: string, visibleTarget: Locator): Promise<void> {
  if (!(await visibleTarget.isVisible())) await page.getByTestId(id).click();
  await expect(visibleTarget).toBeVisible();
}

export async function importImages(journey: Journey, paths: string[]): Promise<void> {
  // Real Wails app/server has native-runtime signals. Only the backend-owned
  // e2e dialog adapter supplies a file choice; OpenMultipleFiles still executes Go.
  await journey.runtime.enqueueDialog({ kind: 'open-files', paths });
  await journey.page.getByTestId('toolbar-insert').click();
}

export async function addText(page: Page, text: string): Promise<string> {
  await runCommand(page, 'insert-text');
  const textarea = page.getByTestId('text-editing-textarea');
  await expect(textarea).toBeVisible();
  await textarea.fill(text);
  await page.keyboard.press('Control+Enter');
  if (await textarea.isVisible()) await page.keyboard.press('Escape');
  await expect(textarea).not.toBeVisible();
  await expect
    .poll(async () =>
      (await canvasSnapshot(page)).elements.some((el) => el.type === 'text' && el.text === text),
    )
    .toBe(true);
  return (await canvasSnapshot(page)).elements.find((el) => el.type === 'text' && el.text === text)!
    .id;
}

export async function renameSelectedLayer(page: Page, name: string): Promise<Locator> {
  const list = page.getByRole('list', { name: 'قائمة الطبقات' });
  await openPanel(page, 'rail-studio-layers', list);
  const selected = list.locator('button[aria-current="true"]');
  await expect(selected).toHaveCount(1);
  await selected.dblclick();
  const input = list.getByRole('textbox', { name: 'اسم الطبقة', exact: true });
  await input.fill(name);
  await input.press('Enter');
  const row = list
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name, exact: true }) });
  await expect(row).toHaveCount(1);
  return row;
}

export async function saveProject(page: Page, name: string): Promise<void> {
  await page.getByTestId('toolbar-save').click();
  const dialog = page.getByRole('dialog', { name: 'مكتبة المشاريع', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.locator('#proj-name').fill(name);
  await dialog.getByRole('button', { name: 'حفظ المشروع', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: `فتح المشروع ${name}`, exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
}

export async function reopenProject(page: Page, name: string): Promise<void> {
  await page.getByTestId('toolbar-projects').click();
  const open = page.getByRole('button', { name: `فتح المشروع ${name}`, exact: true });
  await expect(open).toBeVisible();
  await open.click();
  const replace = page.getByRole('alertdialog');
  await Promise.race([
    open.waitFor({ state: 'hidden' }).catch(() => {}),
    replace.waitFor({ state: 'visible' }).catch(() => {}),
  ]);
  if (await replace.isVisible())
    await replace.getByRole('button', { name: /تحميل|فتح|استبدال/ }).click();
  await expect(open).not.toBeVisible();
}

export async function waitForFile(path: string): Promise<void> {
  await expect
    .poll(
      async () => {
        try {
          await access(path);
          return (await readFile(path)).length > 0;
        } catch {
          return false;
        }
      },
      { timeout: 60_000 },
    )
    .toBe(true);
}

export async function exportCanvasFile(
  journey: Journey,
  name: string,
  format: 'png' | 'jpeg' | 'tiff',
  extra: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const page = journey.page;
  const snapshot = await canvasSnapshot(page);
  const path = journey.outputPath(name);
  await page.getByTestId('toolbar-export').click();
  const dialog = page.getByRole('dialog', { name: 'تصدير الصورة', exact: true });
  await expect(dialog).toBeVisible();
  if (format === 'tiff') {
    await dialog.getByRole('button', { name: /^CMYK/ }).click();
    await expect(dialog.getByRole('button', { name: /^TIFF/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  } else {
    await dialog.getByRole('button', { name: /^RGB/ }).click();
    await dialog.getByRole('button', { name: format === 'png' ? /^PNG/ : /^JPG/ }).click();
  }
  await journey.runtime.enqueueDialog({ kind: 'save-file', path });
  await dialog.getByRole('button', { name: 'تصدير', exact: true }).click();
  await waitForFile(path);
  const report = (await verifyOutput(path, {
    format,
    width: snapshot.width,
    height: snapshot.height,
    dpi: 300,
    nonUniform: true,
    ...extra,
  })) as Record<string, unknown>;
  if (format === 'jpeg' || format === 'png') {
    // Real browser decoding checks the output beyond its metadata/header. Detached
    // image/data URL reading has no application side effects or editing dispatch.
    const bytes = await readFile(path);
    const decoded = await page.evaluate(
      async ({ data, mime }) => {
        const image = new Image();
        image.src = `data:${mime};base64,${data}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
        let nonUniform = false;
        for (let i = 4; i < pixels.length; i += 4)
          if (
            pixels[i] !== pixels[0] ||
            pixels[i + 1] !== pixels[1] ||
            pixels[i + 2] !== pixels[2]
          ) {
            nonUniform = true;
            break;
          }
        return { width: image.width, height: image.height, nonUniform };
      },
      { data: bytes.toString('base64'), mime: format === 'jpeg' ? 'image/jpeg' : 'image/png' },
    );
    expect(decoded).toEqual({ width: snapshot.width, height: snapshot.height, nonUniform: true });
    report.browserDecoded = decoded;
  }
  journey.record(`${format}-real-file-export`, { path, ...report });
  await journey.checkpoint(`export-${format}`);
  if (await dialog.isVisible()) await page.keyboard.press('Escape');
  return report;
}

export async function openScanner(page: Page, imageId: string): Promise<Locator> {
  await clickCanvasNode(page, imageId);
  await page.getByRole('button', { name: 'مسح المستند', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'ماسح المستندات والبطاقات', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}
