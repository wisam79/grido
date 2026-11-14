import { test as base, expect, type Page } from '@playwright/test';

import { setupWailsMock, waitForAppReady } from './helpers/wails-mock';

import type { CanvasElement } from '../src/lib/store/types';

type EditorHarness = {
  getState: () => {
    elements: CanvasElement[];
    selectedIds: string[];
    historyIndex: number;
    pushHistory: () => void;
  };
  setState: (state: Record<string, unknown>) => void;
};

const test = base.extend<{ networkGuard: string[] }>({
  networkGuard: [
    async ({ context, baseURL }, provide) => {
      const unexpected: string[] = [];
      const origin = new URL(baseURL!).origin;
      await context.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) {
          // Warmup is unrelated to keyboard UX; do not download model weights.
          if (url.pathname.startsWith('/models/scanic/')) await route.abort('blockedbyclient');
          else await route.continue();
        } else {
          unexpected.push(`${route.request().method()} ${url.origin}${url.pathname}`);
          await route.abort('blockedbyclient');
        }
      });
      await context.routeWebSocket('**/*', (socket) => {
        const url = new URL(socket.url());
        const local = new URL(baseURL!);
        if (url.hostname === local.hostname && url.port === local.port) socket.connectToServer();
        else {
          unexpected.push(`WS ${url.hostname}`);
          socket.close({ code: 1000, reason: 'Offline UX fixture' });
        }
      });
      await provide(unexpected);
      expect(unexpected, 'No external API, cloud or socket traffic').toEqual([]);
    },
    { auto: true },
  ],
});

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await setupWailsMock(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await waitForAppReady(page);
});

// Same Vite store-import fixture seam as print-rgba-parity.spec.ts. Only seed
// synthetic data; all tested mutations and focus changes go through actual GUI.
async function seedSelection(page: Page, kind: 'single' | 'mixed' | 'images') {
  await page.evaluate(async (fixtureKind) => {
    const storePath = '/src/lib/editor-store.ts';
    const { useEditorStore: store } = (await import(/* @vite-ignore */ storePath)) as {
      useEditorStore: EditorHarness;
    };
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 480, 640);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(40, 40, 400, 560);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(80, 100, 320, 16);
    const imageSrc = canvas.toDataURL('image/png');
    const baseElement = {
      x: 0.1,
      y: 0.1,
      width: 0.25,
      height: 0.4,
      rotation: 0,
      opacity: 1,
      zIndex: 1,
      visible: true,
    };
    const image: CanvasElement = {
      ...baseElement,
      id: 'ux-image',
      type: 'image',
      imageSrc,
      filter: 'none',
    };
    let elements: CanvasElement[] = [image];
    if (fixtureKind === 'mixed')
      elements = [
        image,
        {
          ...baseElement,
          id: 'ux-text',
          type: 'text',
          text: 'نص اصطناعي',
          fontFamily: 'Cairo',
          fontSize: 24,
          color: '#000000',
          x: 0.4,
          opacity: 0.5,
          zIndex: 2,
        },
        {
          ...baseElement,
          id: 'ux-locked',
          type: 'shape',
          shape: 'rect',
          fill: '#ffffff',
          locked: true,
          x: 0.7,
          opacity: 0.8,
          zIndex: 3,
        },
      ];
    if (fixtureKind === 'images')
      elements = [
        image,
        { ...image, id: 'ux-image-2', x: 0.4, filter: 'sepia', opacity: 0.5, zIndex: 2 },
        {
          ...image,
          id: 'ux-locked',
          x: 0.7,
          filter: 'invert',
          locked: true,
          opacity: 0.8,
          zIndex: 3,
        },
      ];
    store.setState({
      mode: 'single',
      canvasWidth: 1200,
      canvasHeight: 900,
      elements,
      selectedIds: elements.map((element) => element.id),
      selectedId: elements[0].id,
      history: [],
      historyIndex: -1,
    });
    store.getState().pushHistory();
  }, kind);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as unknown as { __gridoStage?: unknown }).__gridoStage)),
    )
    .toBe(true);
}

async function selectionState(page: Page) {
  return page.evaluate(async () => {
    const storePath = '/src/lib/editor-store.ts';
    const { useEditorStore } = (await import(/* @vite-ignore */ storePath)) as {
      useEditorStore: EditorHarness;
    };
    const state = useEditorStore.getState();
    return {
      historyIndex: state.historyIndex,
      elements: state.elements.map((element) => ({
        id: element.id,
        opacity: element.opacity,
        locked: Boolean(element.locked),
        filter: element.type === 'image' ? element.filter : null,
      })),
    };
  });
}

test('locked property fieldset is inert to Tab; unlocking restores editable tabs', async ({
  page,
}) => {
  await seedSelection(page, 'single');
  const lock = page.getByRole('button', { name: 'قفل العنصر', exact: true });
  await lock.focus();
  await page.keyboard.press('Enter');
  const fieldset = page.locator('fieldset[aria-label="خصائص العنصر القابلة للتعديل"]');
  await expect(fieldset).toHaveAttribute('disabled', '');
  await expect(fieldset).toHaveAttribute('inert', '');
  const before = await selectionState(page);
  const unlock = page.getByRole('button', { name: 'إلغاء قفل العنصر', exact: true });
  await unlock.focus();
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press('Tab');
    expect(await fieldset.evaluate((element) => element.contains(document.activeElement))).toBe(
      false,
    );
  }
  expect(await selectionState(page)).toEqual(before);
  await unlock.focus();
  await page.keyboard.press('Enter');
  await expect(fieldset).not.toHaveAttribute('inert');
  const style = page.getByRole('tab', { name: 'التنسيق والقياسات', exact: true });
  await style.focus();
  await expect(style).toBeFocused();
});

test('actual property tabs use RTL roving focus, Home/End and linked panels', async ({ page }) => {
  await seedSelection(page, 'single');
  const style = page.getByRole('tab', { name: 'التنسيق والقياسات', exact: true });
  const colors = page.getByRole('tab', { name: 'الألوان والضبط', exact: true });
  const arrange = page.getByRole('tab', { name: 'الترتيب', exact: true });
  const list = page.getByRole('tablist').filter({ has: style });
  await expect(list).toHaveAttribute('aria-orientation', 'horizontal');
  await style.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(colors).toBeFocused();
  await expect(colors).toHaveAttribute('aria-selected', 'true');
  await expect(style).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('End');
  await expect(arrange).toBeFocused();
  const panelId = await arrange.getAttribute('aria-controls');
  expect(panelId).toBeTruthy();
  await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();
  await page.keyboard.press('Home');
  await expect(style).toBeFocused();
  await expect(style).toHaveAttribute('aria-selected', 'true');
});

test('mixed roles expose finite fields, truthful counts and one eligible-only commit', async ({
  page,
}) => {
  await seedSelection(page, 'mixed');
  await expect(page.getByText('3 محدد · 2 قابل للتعديل', { exact: true })).toBeVisible();
  const opacity = page.getByRole('textbox', { name: 'الشفافية', exact: true });
  await expect(opacity).toHaveAttribute('placeholder', 'مختلط');
  await expect(opacity).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'حجم الخط', exact: true })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'فلتر الصورة', exact: true })).toHaveCount(0);
  const before = await selectionState(page);
  await opacity.fill('25');
  await page.keyboard.press('Enter');
  await expect
    .poll(() => selectionState(page))
    .toEqual({
      historyIndex: before.historyIndex + 1,
      elements: [
        { id: 'ux-image', opacity: 0.25, locked: false, filter: 'none' },
        { id: 'ux-text', opacity: 0.25, locked: false, filter: null },
        { id: 'ux-locked', opacity: 0.8, locked: true, filter: null },
      ],
    });
  const committed = await selectionState(page);
  await opacity.fill('60');
  await page.keyboard.press('Escape');
  expect(await selectionState(page)).toEqual(committed);
  await expect(opacity).toHaveValue(''); // Locked member still makes the aggregate mixed.
  expect((await selectionState(page)).historyIndex).toBe(before.historyIndex + 1);
});

test('image selection has a semantic mixed filter select; locked member stays unchanged', async ({
  page,
}) => {
  await seedSelection(page, 'images');
  const filter = page.getByRole('combobox', { name: 'فلتر الصورة', exact: true });
  await expect(filter).toHaveValue('');
  await expect(filter.getByRole('option', { name: 'مختلط', exact: true })).toBeDisabled();
  const before = await selectionState(page);
  await filter.selectOption('grayscale');
  await expect
    .poll(() => selectionState(page))
    .toEqual({
      historyIndex: before.historyIndex + 1,
      elements: [
        { id: 'ux-image', opacity: 1, locked: false, filter: 'grayscale' },
        { id: 'ux-image-2', opacity: 0.5, locked: false, filter: 'grayscale' },
        { id: 'ux-locked', opacity: 0.8, locked: true, filter: 'invert' },
      ],
    });
});

test('scanner corner keys change the submitted quad, not sidebar keys or editor data', async ({
  page,
}, testInfo) => {
  await seedSelection(page, 'single');
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(40, 40, 560, 400);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.route('**/local-image/ux-scanner.png*', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(data, 'base64'),
    }),
  );
  // Use a local synthetic source so detection cannot invoke upload/real Wails.
  await page.evaluate(async () => {
    const storePath = '/src/lib/editor-store.ts';
    const { useEditorStore: store } = (await import(/* @vite-ignore */ storePath)) as {
      useEditorStore: EditorHarness;
    };
    store.setState({
      elements: store
        .getState()
        .elements.map((element) =>
          element.type === 'image'
            ? { ...element, imageSrc: '/local-image/ux-scanner.png' }
            : element,
        ),
    });
  });
  const initialQuad = [
    { x: 40, y: 40 },
    { x: 600, y: 40 },
    { x: 600, y: 440 },
    { x: 40, y: 440 },
  ];
  await page.route('**/api/scanner-detect', (route) =>
    route.fulfill({
      json: {
        status: 'success',
        corners: initialQuad,
        confidence: 0.99,
        width: 640,
        height: 480,
      },
    }),
  );
  const submitted: Array<{ corners: Array<{ x: number; y: number }> }> = [];
  await page.route('**/api/scanner-warp', async (route) => {
    submitted.push(route.request().postDataJSON() as { corners: Array<{ x: number; y: number }> });
    await route.fulfill({
      json: { status: 'success', url: '/local-image/ux-scanner.png', width: 640, height: 480 },
    });
  });
  const editorBefore = await selectionState(page);
  const trigger = page.getByRole('button', { name: /مسح المستند|ماسح المستندات/ }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'ماسح المستندات والبطاقات' });
  const corner = dialog.getByRole('button', { name: 'الركن العلوي الأيسر', exact: true });
  await expect(corner).toBeEnabled();
  await corner.focus();
  await page.keyboard.press('Enter');
  await expect(corner).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await dialog.getByRole('tab', { name: 'مفرد', exact: true }).focus();
  await page.keyboard.press('ArrowDown'); // Horizontal sidebar tabs must not nudge corners.
  await dialog.getByRole('button', { name: 'معاينة', exact: true }).click();
  await expect.poll(() => submitted.length).toBe(1);
  expect(submitted[0].corners[0].x).toBeGreaterThan(initialQuad[0].x);
  expect(submitted[0].corners[0].y).toBeGreaterThan(initialQuad[0].y);
  expect(submitted[0].corners.slice(1)).toEqual(initialQuad.slice(1));
  expect(await selectionState(page)).toEqual(editorBefore);
  await testInfo.attach('scanner-synthetic-preview', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('responsive overflow reveals original commands and keeps keyboard focus in view', async ({
  page,
}, testInfo) => {
  await seedSelection(page, 'mixed');
  await page.setViewportSize({ width: 800, height: 720 });
  const region = page.getByRole('region', { name: 'أوامر التحرير', exact: true });
  const more = page.getByRole('button', { name: 'إظهار المزيد من الأوامر', exact: true });
  const previous = page.getByRole('button', { name: 'إظهار الأوامر السابقة', exact: true });
  await expect(more).toBeVisible();
  await expect(more).toBeEnabled();
  await expect(previous).toBeDisabled();
  await more.focus();
  await page.keyboard.press('Enter');
  await expect(previous).toBeEnabled();
  // Probe the original final contextual command; do not create duplicate menus.
  const last = region.locator('button:not(:disabled)').last();
  await expect(region.locator('button:not(:disabled)').first()).toBeVisible();
  await last.focus();
  await expect(last).toBeFocused();
  await expect
    .poll(() =>
      last.evaluate((control) => {
        const viewport = control.closest('[role="region"]')!.getBoundingClientRect();
        const box = control.getBoundingClientRect();
        return box.left >= viewport.left && box.right <= viewport.right + 1;
      }),
    )
    .toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await testInfo.attach('toolbar-synthetic-overflow', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
