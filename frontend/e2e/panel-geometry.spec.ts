import { test, expect, Page, Locator } from '@playwright/test';
import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

/**
 * 🛡️ حارس هندسة الألواح (Panel Geometry Guard)
 *
 * يحوّل قاعدة «لا نصَّ مقتطعاً ولا زرّاً بلا اسم» من تفضيل بصري إلى فحص قابل
 * للقياس على الواجهة الحيّة:
 *   1. لا اقتطاع أفقي: أي عنصر `overflow-x: hidden` يحتوي نصّاً و`scrollWidth`
 *      أكبر من `clientWidth` (أي نص يُبتر بصمت في لوح بعرض ~296px).
 *   2. كل زر له اسم برمجي (نص ظاهر أو `aria-label` أو `title`) — لا أزرار
 *      أيقونية تعتمد على Tooltip وحده.
 *   3. كل صف شبكة متساوي عرض الأعمدة (±1px).
 *
 * النطاق: تبويبات العنصر الأربعة (نص/شكل/صورة) + كل ألواح الشريط الجانبي في
 * الوضعين (ستة ألواح كولاج + ستة ألواح استوديو).
 */

export interface PanelAudit {
  clipped: string[];
  unnamed: string[];
  uneven: string[];
}

export async function auditPanel(root: Locator): Promise<PanelAudit> {
  return root.evaluate((node: HTMLElement) => {
    const clipped: string[] = [];
    const unnamed: string[] = [];
    const uneven: string[] = [];

    for (const el of Array.from(node.querySelectorAll<HTMLElement>('*'))) {
      const style = getComputedStyle(el);
      const clipsHorizontally =
        (style.overflowX === 'hidden' || style.overflowX === 'clip') &&
        style.textOverflow !== 'clip';
      if (
        clipsHorizontally &&
        el.scrollWidth > el.clientWidth + 1 &&
        (el.textContent || '').trim()
      ) {
        clipped.push(
          `${el.tagName}.${el.className.slice(0, 70)} :: ${(el.textContent || '').trim().slice(0, 30)}`,
        );
      }
    }

    for (const btn of Array.from(node.querySelectorAll<HTMLElement>('button'))) {
      const name = (
        btn.getAttribute('aria-label') ||
        btn.getAttribute('title') ||
        btn.textContent ||
        ''
      ).trim();
      if (!name) unnamed.push(btn.className.slice(0, 90));
    }

    for (const grid of Array.from(node.querySelectorAll<HTMLElement>('div.grid'))) {
      const cells = Array.from(grid.children).filter(
        (k) => k instanceof HTMLElement,
      ) as HTMLElement[];
      const rows = new Map<number, HTMLElement[]>();
      for (const cell of cells) {
        const top = Math.round(cell.getBoundingClientRect().top);
        rows.set(top, [...(rows.get(top) || []), cell]);
      }
      for (const [, rowCells] of rows) {
        if (rowCells.length < 2) continue;
        const widths = rowCells.map((c) => c.getBoundingClientRect().width);
        if (Math.max(...widths) - Math.min(...widths) > 1) {
          uneven.push(
            `${grid.className.slice(0, 50)} -> ${widths.map((w) => w.toFixed(1)).join(',')}`,
          );
        }
      }
    }

    return { clipped, unnamed, uneven };
  });
}

export function expectPanelClean(label: string, result: PanelAudit) {
  expect(result.clipped, `نص مقتطع في ${label}`).toEqual([]);
  expect(result.unnamed, `أزرار بلا اسم برمجي في ${label}`).toEqual([]);
  expect(result.uneven, `صفوف شبكة غير متساوية في ${label}`).toEqual([]);
}

const ELEMENT_TABS = ['التنسيق', 'الألوان', 'التأثيرات', 'الترتيب'];

const RAIL_TOOLS = [
  'rail-collage-grid',
  'rail-collage-presets',
  'rail-collage-freeform',
  'rail-collage-paper',
  'rail-collage-autofill',
  'rail-collage-arrange',
  'rail-studio-layers',
  'rail-studio-elements',
  'rail-studio-presets',
  'rail-studio-fonts',
  'rail-studio-palette',
  'rail-studio-backdrops',
];

function activePanel(page: Page): Locator {
  return page
    .locator(
      '[data-testid="workspace-panel-inspector"]:visible, [data-testid="workspace-panel-properties"]:visible',
    )
    .first();
}

/**
 * يفتح كل الأقسام القابلة للطي داخل اللوح حتى تُقاس محتوياتها لا رؤوسها فقط.
 * نستثني عناصر Radix (`data-state`) لأن النقر عليها يفتح قائمة منسدلة تعترض
 * المؤشر على كامل الصفحة.
 */
async function expandAllSections(panel: Locator, page: Page) {
  const collapsedSelector = 'button[aria-expanded="false"]:not([data-state])';
  for (let i = 0; i < 12; i++) {
    const collapsed = panel.locator(collapsedSelector).first();
    if (!(await collapsed.count())) break;
    const clicked = await collapsed
      .click({ timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) break;
    await page.waitForTimeout(60);
  }
}

async function openRailPanel(page: Page, toolId: string): Promise<Locator | null> {
  const tool = page.getByTestId(toolId);
  if (!(await tool.count())) return null;
  await tool.click();
  await page.waitForTimeout(300);
  // النقر على أداة مفتوحة أصلاً يغلق لوحها — نقرتان تفتحانه دائماً
  if (!(await activePanel(page).count())) {
    await tool.click();
    await page.waitForTimeout(300);
  }
  const panel = activePanel(page);
  if (!(await panel.count())) return null;
  await expandAllSections(panel, page);
  await page.keyboard.press('Escape');
  return panel;
}

test.describe('Panel geometry guard', () => {
  test.beforeEach(async ({ page }) => {
    await setupWailsMock(page);
    await page.goto('/');
    await waitForAppReady(page);
  });

  for (const kind of ['text', 'shape', 'image'] as const) {
    test(`${kind}: تبويبات العنصر الأربعة بلا اقتطاع وبأسماء كاملة`, async ({ page }) => {
      await page
        .getByTestId('mode-tab-single')
        .or(page.getByRole('tab', { name: 'تعديل حر' }))
        .first()
        .click();

      if (kind === 'image') {
        await page.getByTestId('toolbar-insert').first().click();
      } else {
        await page.getByTestId(kind === 'text' ? 'toolbar-add-text' : 'toolbar-add-shape').click();
        await page.getByRole('menuitem').first().click();
      }
      await expect(page.getByRole('tabpanel')).toBeVisible();

      const panel = page.getByRole('tabpanel');
      for (const tabName of ELEMENT_TABS) {
        const tabButton = page.getByRole('tab', { name: new RegExp(tabName) }).first();
        if (await tabButton.count()) await tabButton.click();
        await page.waitForTimeout(150);
        expectPanelClean(`${kind}/${tabName}`, await auditPanel(panel));
      }
    });
  }

  for (const [mode, tools] of [
    ['كولاج', RAIL_TOOLS.slice(0, 6)],
    ['استوديو', RAIL_TOOLS.slice(6)],
  ] as const) {
    test(`${mode}: كل ألواح الشريط الجانبي نظيفة`, async ({ page }) => {
      if (mode === 'استوديو') {
        await page
          .getByTestId('mode-tab-single')
          .or(page.getByRole('tab', { name: 'تعديل حر' }))
          .first()
          .click();
      }

      const opened: string[] = [];
      for (const toolId of tools) {
        const panel = await openRailPanel(page, toolId);
        if (!panel) continue;
        opened.push(toolId);
        expectPanelClean(`${mode}/${toolId}`, await auditPanel(panel));
      }
      // حماية من فحص «أخضر» لأن كل الألواح لم تُفتح فعلاً
      expect(opened.length, `عدد الألواح المفتوحة في وضع ${mode}`).toBeGreaterThanOrEqual(5);
    });
  }
});
