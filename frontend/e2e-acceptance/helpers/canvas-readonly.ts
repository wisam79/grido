import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export type ElementSnapshot = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  text?: string;
  imageSrc?: string;
  locked?: boolean;
  groupId?: string;
  name?: string;
  stickerSource?: { templateId?: string; params?: { fields?: Record<string, string> } };
  [key: string]: unknown;
};
export type SlotSnapshot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageSrc?: string;
  zoom?: number;
  rotation?: number;
  [key: string]: unknown;
};
export type CanvasSnapshot = {
  width: number;
  height: number;
  elements: ElementSnapshot[];
  slots: SlotSnapshot[];
  nodes: {
    id: string;
    text?: string;
    src?: string;
    box: { x: number; y: number; width: number; height: number };
  }[];
};

/** Read-only inspection of props/ref already rendered by React+Konva, including
 * production builds with no __gridoStage/dev globals. Never invoke a prop handler,
 * hook, action, dispatch, node setter, or store write from this helper. */
export async function canvasSnapshot(page: Page): Promise<CanvasSnapshot> {
  return page
    .locator('.canvas-viewport .konvajs-content')
    .first()
    .evaluate((content) => {
      type NodeLike = {
        id(): string;
        getClientRect(): { x: number; y: number; width: number; height: number };
        find(selector: string): NodeLike[];
        getClassName(): string;
        text?(): string;
        image?(): HTMLImageElement | HTMLCanvasElement;
        width(): number;
        height(): number;
        getStage?(): NodeLike;
        getAbsolutePosition?(): { x: number; y: number };
      };
      type Fiber = {
        memoizedProps?: Record<string, unknown>;
        memoizedState?: { memoizedState?: unknown; next?: unknown };
        stateNode?: unknown;
        ref?: { current?: unknown } | ((value: unknown) => void);
        child?: Fiber;
        sibling?: Fiber;
        return?: Fiber;
      };
      let host: Element | null = content;
      let root: Fiber | undefined;
      while (host && !root) {
        const attached = host as unknown as Record<string, unknown>;
        const key = Object.keys(attached).find((name) => name.startsWith('__reactFiber$'));
        if (key) root = attached[key] as Fiber;
        host = host.parentElement;
      }
      while (root?.return) root = root.return;
      if (!root) throw new Error('Rendered React fiber root unavailable; no fake probe fallback');
      const seen = new Set<Fiber>();
      const stack = [root];
      let stage: NodeLike | undefined;
      let elements: ElementSnapshot[] = [];
      let slots: SlotSnapshot[] = [];
      let width = 0,
        height = 0;
      while (stack.length && seen.size < 50_000) {
        const fiber = stack.pop()!;
        if (seen.has(fiber)) continue;
        seen.add(fiber);
        const props = fiber.memoizedProps;
        // Konva owns a separate reconciler. Stage still receives the actual child
        // React elements; reading their props exposes rendered data, not actions.
        const propQueue = props ? [props] : [];
        for (let inspected = 0; propQueue.length && inspected < 10_000; inspected++) {
          const rendered = propQueue.pop()!;
          if (Array.isArray(rendered.sortedElements) && typeof rendered.canvasWidth === 'number')
            elements = rendered.sortedElements as ElementSnapshot[];
          if (
            Array.isArray(rendered.slots) &&
            typeof rendered.collageMargin === 'number' &&
            typeof rendered.canvasWidth === 'number'
          )
            slots = rendered.slots as SlotSnapshot[];
          if (
            typeof rendered.canvasWidth === 'number' &&
            typeof rendered.canvasHeight === 'number'
          ) {
            width = rendered.canvasWidth;
            height = rendered.canvasHeight;
          }
          if (
            rendered.element &&
            typeof rendered.element === 'object' &&
            !elements.length &&
            Array.isArray(rendered.allElements)
          )
            elements = rendered.allElements as ElementSnapshot[];
          const children = Array.isArray(rendered.children)
            ? rendered.children
            : [rendered.children];
          for (const child of children) {
            if (child && typeof child === 'object' && 'props' in child)
              propQueue.push((child as { props: Record<string, unknown> }).props);
          }
        }
        const candidates = [
          fiber.stateNode,
          typeof fiber.ref === 'object' ? fiber.ref?.current : undefined,
        ];
        let hook = fiber.memoizedState;
        for (let i = 0; hook && i < 100; i++) {
          const value = hook.memoizedState;
          if (value && typeof value === 'object' && 'current' in value)
            candidates.push((value as { current?: unknown }).current);
          hook = hook.next as typeof hook;
        }
        for (const candidate of candidates) {
          if (candidate && typeof (candidate as NodeLike).getClassName === 'function') {
            const node = candidate as NodeLike;
            const owner = node.getClassName() === 'Stage' ? node : node.getStage?.();
            if (owner?.getClassName() === 'Stage') stage = owner;
          }
        }
        if (fiber.sibling) stack.push(fiber.sibling);
        if (fiber.child) stack.push(fiber.child);
      }
      if (!stage || !width || !height)
        throw new Error('Real rendered Konva Stage/geometry unavailable');
      const origin = content.getBoundingClientRect();
      const nodes = [...elements.map((el) => el.id), ...slots.map((slot) => slot.id)]
        .map((id) => {
          const node = stage!.find(`#${id}`)[0];
          if (!node) return null;
          const rect = node.getClientRect();
          const text = node.find('Text')[0]?.text?.();
          const image = node.find('Image')[0]?.image?.();
          return {
            id,
            text,
            src: image instanceof HTMLImageElement ? image.currentSrc || image.src : undefined,
            box: {
              x: origin.left + rect.x,
              y: origin.top + rect.y,
              width: rect.width,
              height: rect.height,
            },
          };
        })
        .filter((node) => node !== null);
      return JSON.parse(
        JSON.stringify({ width, height, elements, slots, nodes }),
      ) as CanvasSnapshot;
    });
}

async function waitRenderedNode(page: Page, id: string) {
  let matched: CanvasSnapshot['nodes'][number] | undefined;
  await expect
    .poll(async () => {
      matched = (await canvasSnapshot(page)).nodes.find(
        (candidate) => candidate.id === id && candidate.box.width > 0 && candidate.box.height > 0,
      );
      return Boolean(matched);
    })
    .toBe(true);
  if (!matched) throw new Error(`No rendered canvas object ${id}`);
  return matched;
}

export async function expectElementCount(page: Page, count: number): Promise<void> {
  await expect.poll(async () => (await canvasSnapshot(page)).elements.length).toBe(count);
}
export async function clickCanvasNode(
  page: Page,
  id: string,
  options: { button?: 'left' | 'right'; clickCount?: number } = {},
): Promise<void> {
  const node = await waitRenderedNode(page, id);
  await page.mouse.click(
    node.box.x + node.box.width / 2,
    node.box.y + node.box.height / 2,
    options,
  );
}
export async function dragCanvasNode(
  page: Page,
  id: string,
  dx: number,
  dy: number,
): Promise<void> {
  const node = await waitRenderedNode(page, id);
  const x = node.box.x + node.box.width / 2,
    y = node.box.y + node.box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  await page.mouse.up();
}
