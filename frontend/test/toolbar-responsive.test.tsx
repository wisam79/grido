import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Toolbar } from '../src/components/editor/toolbar/toolbar';
import { ToolbarOverflow } from '../src/components/editor/toolbar/toolbar-overflow';
import { MobilePanelsSheet } from '../src/components/editor/workspace/mobile-panels-sheet';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { useWorkspacePanels } from '../src/hooks/use-workspace-panels';
import { createCanvasCamera, reconcileCanvasCamera } from '../src/lib/canvas/viewport-geometry';
import { useEditorStore } from '../src/lib/editor-store';
import { getStateCommandGroups } from '../src/lib/workspace-tools';

import type { CanvasElement } from '../src/lib/store/types';

vi.mock('../src/lib/canvas/stage-context', () => ({ useStageRef: () => ({ current: null }) }));
vi.mock('../src/components/editor/toolbar/toolbar-image-filters', () => ({
  ImageFiltersPopover: () => null,
}));
vi.mock('../src/components/editor/dialogs/export-dialog', () => ({}));
vi.mock('../src/components/editor/dialogs/print-dialog', () => ({}));

class ObservedResize {
  static instances: ObservedResize[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(private readonly callback: ResizeObserverCallback) {
    ObservedResize.instances.push(this);
  }
  notify() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const storageKey = 'grido_workspace_layout_v1';
const element: CanvasElement = {
  id: 'selected-shape',
  type: 'shape',
  shape: 'rect',
  x: 0.2,
  y: 0.2,
  width: 0.2,
  height: 0.2,
  rotation: 0,
  opacity: 1,
  zIndex: 1,
};

beforeEach(() => {
  localStorage.clear();
  ObservedResize.instances = [];
  vi.stubGlobal('ResizeObserver', ObservedResize);
  Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
  useEditorStore.getState().reset();
  useEditorStore.setState({
    mode: 'single',
    elements: [element],
    selectedId: element.id,
    selectedIds: [element.id],
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
  useEditorStore.getState().reset();
});

/** Explicit RTL geometry: jsdom does not lay out or implement native scrolling. */
function mockOverflow(width = 200, total = 600) {
  const viewport = screen.getByRole('region', { name: 'أوامر التحرير' });
  let available = width;
  let content = total;
  Object.defineProperties(viewport, {
    clientWidth: { configurable: true, get: () => available },
    scrollWidth: { configurable: true, get: () => content },
  });
  const setPosition = (left: number) => {
    viewport.scrollLeft = Math.max(-(content - available), Math.min(0, left));
    fireEvent.scroll(viewport);
  };
  const scrollBy = vi.fn((options: ScrollToOptions) =>
    setPosition(viewport.scrollLeft + (options.left ?? 0)),
  );
  const scrollTo = vi.fn((options: ScrollToOptions) => setPosition(options.left ?? 0));
  Object.defineProperties(viewport, {
    scrollBy: { configurable: true, value: scrollBy },
    scrollTo: { configurable: true, value: scrollTo },
  });
  const notify = () => act(() => ObservedResize.instances.forEach((observer) => observer.notify()));
  notify();
  return {
    viewport,
    scrollBy,
    scrollTo,
    notify,
    resize(nextWidth: number, nextContent = content) {
      available = nextWidth;
      content = nextContent;
      notify();
    },
  };
}

function renderToolbar() {
  const handlers = { onPrint: vi.fn(), onExport: vi.fn(), onSave: vi.fn() };
  const view = render(
    <TooltipProvider>
      <Toolbar {...handlers} />
    </TooltipProvider>,
  );
  return { ...view, ...handlers };
}

describe('Toolbar responsive overflow', () => {
  it('shows named chevrons only for overflow, observes content changes, and disconnects', () => {
    const view = render(
      <ToolbarOverflow>
        <button type="button">أمر أصلي</button>
      </ToolbarOverflow>,
    );
    expect(screen.queryByRole('button', { name: 'إظهار المزيد من الأوامر' })).toBeNull();
    const geometry = mockOverflow();
    const previous = screen.getByRole('button', { name: 'إظهار الأوامر السابقة' });
    const next = screen.getByRole('button', { name: 'إظهار المزيد من الأوامر' });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();
    expect(next).toHaveAttribute('aria-controls', geometry.viewport.id);
    expect(geometry.viewport).not.toHaveAttribute('tabindex');
    expect(ObservedResize.instances[0].observe).toHaveBeenCalledWith(geometry.viewport);
    expect(ObservedResize.instances[0].observe).toHaveBeenCalledWith(
      geometry.viewport.firstElementChild,
    );

    geometry.resize(200, 200);
    expect(screen.queryByRole('button', { name: 'إظهار المزيد من الأوامر' })).toBeNull();
    expect(geometry.viewport).not.toHaveAttribute('tabindex');
    // Content fits the whole group, but not the viewport minus two chevrons.
    // Controls must disappear rather than keeping their own overflow alive.
    Object.defineProperty(geometry.viewport.parentElement, 'clientWidth', {
      value: 250,
      configurable: true,
    });
    geometry.resize(194, 240);
    expect(screen.queryByRole('button', { name: 'إظهار المزيد من الأوامر' })).toBeNull();
    geometry.resize(200, 700); // contextual commands appeared without window resize
    expect(screen.getByRole('button', { name: 'إظهار المزيد من الأوامر' })).toBeEnabled();
    view.unmount();
    expect(ObservedResize.instances[0].disconnect).toHaveBeenCalledOnce();
  });

  it('supports native Enter/Space chevrons and RTL boundaries without stealing child keys', async () => {
    const user = userEvent.setup();
    render(
      <ToolbarOverflow>
        <button type="button">أمر أصلي</button>
      </ToolbarOverflow>,
    );
    const geometry = mockOverflow();
    const next = screen.getByRole('button', { name: 'إظهار المزيد من الأوامر' });
    act(() => next.focus());
    await act(async () => {
      await user.keyboard('{Enter}');
    });
    expect(geometry.viewport.scrollLeft).toBe(-160);
    expect(screen.getByRole('button', { name: 'إظهار الأوامر السابقة' })).toBeEnabled();
    await act(async () => {
      await user.keyboard(' ');
    });
    expect(geometry.viewport.scrollLeft).toBe(-320);

    await act(async () => {
      await user.keyboard('{Enter}');
    });
    expect(geometry.viewport.scrollLeft).toBe(-400);
    expect(next).toBeDisabled();
    const previous = screen.getByRole('button', { name: 'إظهار الأوامر السابقة' });
    act(() => previous.focus());
    await act(async () => {
      await user.keyboard('{Enter}');
    });
    expect(geometry.viewport.scrollLeft).toBe(-240);
    await act(async () => {
      await user.keyboard(' ');
      await user.keyboard(' ');
    });
    expect(geometry.viewport.scrollLeft).toBe(0);
    expect(previous).toBeDisabled();
    geometry.scrollBy.mockClear();
    fireEvent.keyDown(screen.getByRole('button', { name: 'أمر أصلي' }), { key: 'ArrowLeft' });
    expect(geometry.scrollBy).not.toHaveBeenCalled();
  });

  it('reveals a clipped original command on Tab and executes its existing selection handler once', async () => {
    const user = userEvent.setup();
    renderToolbar();
    const geometry = mockOverflow();
    const duplicate = screen.getByRole('button', { name: 'تكرار' });
    vi.spyOn(geometry.viewport, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 300,
    } as DOMRect);
    vi.spyOn(duplicate, 'getBoundingClientRect').mockReturnValue({
      left: 40,
      right: 72,
    } as DOMRect);
    const before = useEditorStore.getState();
    // The real subscribed handler is verified by its single state/history change.
    act(() => screen.getByRole('button', { name: 'إدراج صورة جديدة' }).focus());
    for (let step = 0; step < 15 && document.activeElement !== duplicate; step++) {
      await act(async () => {
        await user.tab();
      });
    }
    expect(duplicate).toHaveFocus();
    expect(geometry.scrollBy).toHaveBeenCalledWith({ left: -64, behavior: 'instant' });
    expect(useEditorStore.getState().selectedId).toBe(element.id);
    expect(useEditorStore.getState().history).toBe(before.history);
    await act(async () => {
      await user.keyboard('{Enter}');
    });
    const after = useEditorStore.getState();
    expect(after.elements).toHaveLength(2);
    expect(after.elements.filter((item) => item.id === element.id)).toHaveLength(1);
    expect(after.history.length).toBe(before.history.length + 1);
    expect(screen.queryByTestId('command-palette')).toBeNull();
  });

  it('keeps output callbacks and the existing launcher event outside the scroller', async () => {
    const user = userEvent.setup();
    const handlers = renderToolbar();
    const geometry = mockOverflow();
    const listener = vi.fn();
    window.addEventListener('grido:open-tool-launcher', listener);
    try {
      for (const name of ['حفظ المشروع', 'تصدير صورة', 'طباعة المستند', 'لوحة الأدوات والأوامر']) {
        const button = screen.getByRole('button', { name });
        expect(button).toHaveClass('coarse-touch-target');
        expect(geometry.viewport).not.toContainElement(button);
        act(() => button.focus());
        await act(async () => {
          await user.keyboard('{Enter}');
        });
      }
      expect(screen.getByRole('button', { name: 'المزيد من الخيارات' })).toHaveClass(
        'coarse-touch-target',
        'h-8',
        'w-8',
      );
      expect(screen.getByRole('button', { name: 'إظهار الأوامر السابقة' })).toHaveClass(
        'coarse-touch-target',
      );
      expect(screen.getByRole('button', { name: 'إظهار المزيد من الأوامر' })).toHaveClass(
        'coarse-touch-target',
      );
      expect(handlers.onSave).toHaveBeenCalledOnce();
      expect(handlers.onExport).toHaveBeenCalledOnce();
      expect(handlers.onPrint).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('grido:open-tool-launcher', listener);
    }
  });

  it('uses the existing state-command source for the hidden compact mode switch', () => {
    const commands = getStateCommandGroups().flatMap((group) => group.items);
    const collage = commands.find(({ command }) => command.id === 'mode-collage');
    expect(collage?.snapshot.disabled).toBe(false);
    act(() => collage!.snapshot.run());
    expect(useEditorStore.getState().mode).toBe('collage');
    const single = getStateCommandGroups()
      .flatMap((group) => group.items)
      .find(({ command }) => command.id === 'mode-single');
    act(() => single!.snapshot.run());
    expect(useEditorStore.getState().mode).toBe('single');
  });
});

async function resizeWindow(width: number) {
  await act(async () => {
    window.innerWidth = width;
    window.dispatchEvent(new Event('resize'));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

describe('Workspace responsive no-loss contracts — existing behavior', () => {
  it.each([false, true])(
    'preserves stored drawer=%s, unpinned inspector, current tabs and selection across compact/desktop',
    async (drawer) => {
      const preferences = {
        isTemplatesDrawerOpen: drawer,
        isInspectorPinned: false,
        lastActiveStudioTab: 'text',
        lastActiveCollageTab: 'presets',
        lastActivePanel: 'properties',
      };
      localStorage.setItem(storageKey, JSON.stringify(preferences));
      const before = useEditorStore.getState();
      const { result } = renderHook(() => useWorkspacePanels());
      for (const width of [1024, 800, 1600, 1280]) {
        await resizeWindow(width);
        expect(result.current.isInspectorPinned).toBe(false);
        expect(result.current.activeStudioTab).toBe('text');
        expect(result.current.activeCollageTab).toBe('presets');
        expect(result.current.activePanel).toBe('properties');
        expect(result.current.isTemplatesDrawerOpen).toBe(width >= 1200 && drawer);
        expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(preferences);
        expect(useEditorStore.getState().selectedId).toBe(element.id);
        expect(useEditorStore.getState().selectedIds).toBe(before.selectedIds);
        expect(useEditorStore.getState().history).toBe(before.history);
      }
    },
  );

  it('reconciles the existing manual camera center across panel widths without document history', () => {
    const before = useEditorStore.getState();
    const input = {
      session: 1,
      canvasW: 2480,
      canvasH: 3508,
      fitMode: 'auto' as const,
      zoom: 2,
      viewport: { w: 900, h: 620 },
    };
    let camera = createCanvasCamera(input);
    const center = (value: typeof camera) => ({
      x: (value.viewport.w / 2 - value.pos.x) / value.metrics.scale,
      y: (value.viewport.h / 2 - value.pos.y) / value.metrics.scale,
    });
    const original = center(camera);
    const scale = camera.metrics.scale;
    for (const width of [612, 420, 900]) {
      camera = reconcileCanvasCamera(camera, { ...input, viewport: { w: width, h: 620 } });
      expect(center(camera).x).toBeCloseTo(original.x, 9);
      expect(center(camera).y).toBeCloseTo(original.y, 9);
      expect(camera.metrics.scale).toBe(scale);
    }
    expect(useEditorStore.getState().history).toBe(before.history);
    expect(useEditorStore.getState().historyIndex).toBe(before.historyIndex);
  });

  it('returns focus to the external sheet opener on Escape without changing the active tab or selection', async () => {
    const user = userEvent.setup();
    function SheetHarness() {
      const panels = useWorkspacePanels();
      return (
        <>
          <button type="button" onClick={() => panels.openPanel('properties')}>
            فتح الخصائص
          </button>
          <MobilePanelsSheet
            open={panels.isMobileSheetOpen}
            onOpenChange={panels.setIsMobileSheetOpen}
            activeTab={panels.mobileActiveTab}
            onActiveTabChange={panels.setMobileActiveTab}
            templatesContent={<button type="button">أداة</button>}
            propertiesContent={<button type="button">خاصية</button>}
          />
        </>
      );
    }
    window.innerWidth = 800;
    render(<SheetHarness />);
    const opener = screen.getByRole('button', { name: 'فتح الخصائص' });
    await act(async () => {
      await user.click(opener);
    });
    expect(screen.getByRole('dialog', { name: 'لوحات العمل' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'الخصائص' })).toHaveAttribute('aria-selected', 'true');
    await act(async () => {
      await user.keyboard('{Escape}');
    });
    expect(screen.queryByRole('dialog', { name: 'لوحات العمل' })).toBeNull();
    expect(opener).toHaveFocus();
    expect(useEditorStore.getState().selectedId).toBe(element.id);
    await act(async () => {
      await user.keyboard('{Enter}');
    });
    expect(screen.getByRole('tab', { name: 'الخصائص' })).toHaveAttribute('aria-selected', 'true');
  });
});
