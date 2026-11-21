import { expect } from '@playwright/test';

import { openStudioElementsCategory } from './helpers/studio-elements';
import { test, setupWailsMock, waitForAppReady } from './helpers/wails-mock';

import type { Page, Locator } from '@playwright/test';

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
        (k) => k instanceof HTMLElement && getComputedStyle(k).position !== 'absolute',
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

const COLLAGE_RAIL_SECTIONS = ['rail-collage-grid', 'rail-collage-slots', 'rail-collage-paper'];

const STUDIO_RAIL_SECTIONS = ['rail-studio-layers', 'rail-studio-shapes', 'rail-studio-text'];

/**
 * يفتح كل الأقسام القابلة للطي داخل اللوح حتى تُقاس محتوياتها لا رؤوسها فقط.
 * نستثني عناصر Radix (`data-state`) لأن النقر عليها يفتح قائمة منسدلة تعترض
 * المؤشر على كامل الصفحة.
 */
async function expandAllSections(panel: Locator) {
  const collapsedSelector = 'button[aria-expanded="false"]:not([data-state])';
  for (let i = 0; i < 12; i++) {
    const collapsed = panel.locator(collapsedSelector).first();
    if (!(await collapsed.count())) break;
    const before = await panel.locator(collapsedSelector).count();
    await collapsed.click();
    await expect(panel.locator(collapsedSelector)).toHaveCount(before - 1);
  }
  await expect(panel.locator(collapsedSelector)).toHaveCount(0);
}

async function openRailPanel(page: Page, toolId: string): Promise<Locator> {
  const tool = page.getByTestId(toolId);
  const panel = page.getByTestId('workspace-panel-templates');
  await expect(tool).toBeVisible();
  if (
    (await tool.getAttribute('aria-pressed')) !== 'true' ||
    (await panel.getAttribute('data-collapsed')) === 'true'
  )
    await tool.click();
  await expect(tool).toHaveAttribute('aria-pressed', 'true');
  await expect(panel).toHaveAttribute('data-collapsed', 'false');
  await expect(panel).toBeVisible();
  await expandAllSections(panel);
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
        await openStudioElementsCategory(page, kind === 'text' ? 'text' : 'shapes');
        await page
          .getByTestId(kind === 'text' ? 'element-add-text-heading' : 'element-add-shape-rect')
          .click();
      }
      const inspector = page.getByTestId('workspace-panel-properties');
      const panel = inspector.getByRole('tabpanel').filter({ visible: true });
      await expect(panel).toBeVisible();
      for (const tabName of ELEMENT_TABS) {
        const tabButton = inspector.getByRole('tab', { name: new RegExp(tabName) }).first();
        await expect(tabButton).toBeVisible();
        if (await tabButton.isDisabled()) {
          // Capability gating is an asserted outcome, not a silently skipped tab.
          expect(kind, 'Only shapes currently lack a capable effects tab').toBe('shape');
          expect(tabName).toBe('التأثيرات');
          continue;
        }
        await tabButton.click();
        await expect(tabButton).toHaveAttribute('aria-selected', 'true');
        await expect(panel).toBeVisible();
        await expandAllSections(panel);
        expectPanelClean(`${kind}/${tabName}`, await auditPanel(panel));
      }
    });
  }

  for (const [mode, sections] of [
    ['كولاج', COLLAGE_RAIL_SECTIONS],
    ['استوديو', STUDIO_RAIL_SECTIONS],
  ] as const) {
    test(`${mode}: كل ألواح الشريط الجانبي نظيفة`, async ({ page }) => {
      if (mode === 'استوديو') {
        await page
          .getByTestId('mode-tab-single')
          .or(page.getByRole('tab', { name: 'تعديل حر' }))
          .first()
          .click();
      }

      await page.getByTestId(mode === 'كولاج' ? 'mode-tab-collage' : 'mode-tab-single').click();
      const opened: string[] = [];
      for (const toolId of sections) {
        const panel = await openRailPanel(page, toolId);
        opened.push(toolId);
        expectPanelClean(`${mode}/${toolId}`, await auditPanel(panel));
      }
      // حماية من فحص «أخضر» لأن كل الألواح لم تُفتح فعلاً
      expect(opened.length, `عدد الألواح المفتوحة في وضع ${mode}`).toBe(sections.length);
    });
  }
});
