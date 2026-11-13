import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TemplatePanel } from '../src/components/editor/panels/template-panel';
import { TooltipProvider } from '../src/components/ui/tooltip';
import {
  getCollageGeometry,
  getSlotRect,
  isBakedCollageLayout,
} from '../src/lib/canvas/collage-geometry';
import { useEditorStore } from '../src/lib/editor-store';

import type { CollageTemplate } from '../src/lib/templates';

const ipc = vi.hoisted(() => ({
  get: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../wailsjs/go/main/App', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../wailsjs/go/main/App')>()),
  GetCustomTemplates: ipc.get,
  SaveCustomTemplate: ipc.save,
  DeleteCustomTemplate: ipc.delete,
}));

// The studio is a separate surface; keep the library card and confirmation dialog real.
vi.mock('../src/components/editor/panels/freeform', () => ({
  FreeformStudioPanel: () => null,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const setCollageTemplate = useEditorStore.getState().setCollageTemplate;
const cells = [{ x: 0.1, y: 0.2, w: 0.3, h: 0.4, presetType: 'passport', rotation: 90 }];
const metadata: CollageTemplate['metadata'] = {
  version: 1,
  kind: 'freeform',
  paperWidthMM: 100,
  paperHeightMM: 150,
  gapMM: 2,
  marginMM: 3,
  showCutLines: true,
  slotOptions: [{ lockAspect: true, color: '#ff8800' }],
};

function savedTemplate(id: number, name: string, extraMetadata = metadata) {
  return {
    id,
    name,
    slots: cells.length,
    cells: JSON.stringify(cells),
    metadata: JSON.stringify(extraMetadata),
    created_at: '',
    updated_at: '',
  };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderedRects() {
  const state = useEditorStore.getState();
  const geo = getCollageGeometry(
    state.canvasWidth,
    state.canvasHeight,
    state.collageMargin,
    state.collageGap,
    isBakedCollageLayout(state.collageTemplate),
  );
  return state.slots.map((slot) => getSlotRect(slot, geo));
}

async function renderLibrary() {
  render(
    <TooltipProvider>
      <TemplatePanel activeCollageTab="presets" />
    </TooltipProvider>,
  );
  await screen.findByRole('button', { name: /^Layout A/ });
}

function selectTemplate(name: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }));
}

async function confirmDelete() {
  fireEvent.click(screen.getByRole('button', { name: 'حذف القالب Layout A' }));
  const dialog = await screen.findByRole('alertdialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /^حذف$/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().reset();
  useEditorStore.setState({
    mode: 'collage',
    setCollageTemplate,
    collageTemplate: null,
    slots: [],
    collagePendingImages: ['queued-photo'],
    canvasWidth: 1000,
    canvasHeight: 1500,
    collageCanvasWidth: 1000,
    collageCanvasHeight: 1500,
    collageMargin: 40,
    collageGap: 20,
    history: [],
    historyIndex: -1,
  });
  ipc.get.mockResolvedValue([savedTemplate(7, 'Layout A'), savedTemplate(8, 'Layout B')]);
  ipc.save.mockResolvedValue(savedTemplate(9, 'Imported'));
  ipc.delete.mockResolvedValue(undefined);
});

afterEach(() => vi.restoreAllMocks());

describe('TemplatePanel — library deletion preserves the applied snapshot', () => {
  it.each(['freeform', 'physical grid'] as const)(
    'removes a saved %s entry only after deferred success without changing canvas geometry or history',
    async (kind) => {
      const extraMetadata: CollageTemplate['metadata'] =
        kind === 'freeform'
          ? metadata
          : {
              ...metadata!,
              kind: 'grid',
              physicalLayout: { type: 'passport', rows: 1, cols: 1, align: 'top-left' },
            };
      ipc.get.mockResolvedValueOnce([
        savedTemplate(7, 'Layout A', extraMetadata),
        savedTemplate(8, 'Layout B'),
      ]);
      const deletion = deferred();
      ipc.delete.mockReturnValueOnce(deletion.promise);
      await renderLibrary();
      selectTemplate('Layout A');
      act(() => {
        const state = useEditorStore.getState();
        useEditorStore.setState({
          slots: state.slots.map((slot) => ({
            ...slot,
            imageSrc: 'photo-A',
            zoom: 1.7,
            dragX: 0.08,
            dragY: -0.02,
          })),
        });
        useEditorStore.getState().pushHistory();
      });
      const before = useEditorStore.getState();
      const rects = renderedRects();
      const setTemplate = vi.spyOn(before, 'setCollageTemplate');

      await confirmDelete();
      expect(ipc.delete).toHaveBeenCalledExactlyOnceWith(7);
      expect(ipc.get).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: /^Layout A/ })).toBeInTheDocument();
      expect(useEditorStore.getState().slots).toBe(before.slots);
      expect(toast.success).not.toHaveBeenCalled();

      ipc.get.mockResolvedValueOnce([savedTemplate(8, 'Layout B')]);
      await act(async () => deletion.resolve());
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: /^Layout A/ })).not.toBeInTheDocument(),
      );

      const after = useEditorStore.getState();
      expect(after.collageTemplate).toBe(before.collageTemplate);
      expect(after.collageTemplate?.metadata).toEqual(extraMetadata);
      expect(isBakedCollageLayout(after.collageTemplate)).toBe(true);
      expect(after.slots).toBe(before.slots);
      expect(after.collagePendingImages).toBe(before.collagePendingImages);
      expect(after.history).toBe(before.history);
      expect(after.historyIndex).toBe(before.historyIndex);
      expect(renderedRects()).toEqual(rects);
      expect(setTemplate).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledExactlyOnceWith('تم حذف القالب');
      expect(ipc.get).toHaveBeenCalledTimes(2);
    },
  );

  it.each(['Layout B', 'Layout A'])(
    'keeps the latest applied %s when selection changes while deletion is pending',
    async (latest) => {
      const deletion = deferred();
      ipc.delete.mockReturnValueOnce(deletion.promise);
      await renderLibrary();
      selectTemplate('Layout A');
      await confirmDelete();
      selectTemplate('Layout B');
      if (latest === 'Layout A') selectTemplate('Layout A');
      const before = useEditorStore.getState();
      const rects = renderedRects();

      ipc.get.mockResolvedValueOnce([savedTemplate(8, 'Layout B')]);
      await act(async () => deletion.resolve());
      await waitFor(() => expect(ipc.get).toHaveBeenCalledTimes(2));
      const after = useEditorStore.getState();
      expect(after.collageTemplate).toBe(before.collageTemplate);
      expect(after.collageTemplate?.name).toBe(latest);
      expect(after.slots).toBe(before.slots);
      expect(after.history).toBe(before.history);
      expect(renderedRects()).toEqual(rects);
    },
  );

  it('preserves the library and applied design when deferred deletion fails', async () => {
    const deletion = deferred();
    ipc.delete.mockReturnValueOnce(deletion.promise);
    await renderLibrary();
    selectTemplate('Layout A');
    const before = useEditorStore.getState();
    await confirmDelete();
    await act(async () => deletion.reject(new Error('Deletion failed')));

    expect(screen.getByRole('button', { name: /^Layout A/ })).toBeInTheDocument();
    expect(useEditorStore.getState().collageTemplate).toBe(before.collageTemplate);
    expect(useEditorStore.getState().slots).toBe(before.slots);
    expect(useEditorStore.getState().history).toBe(before.history);
    expect(ipc.get).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledExactlyOnceWith('Deletion failed');
  });
});

describe('TemplatePanel — imported cell validation', () => {
  it('excludes malformed, out-of-bounds and excessive saved cells without losing valid templates', async () => {
    ipc.get.mockResolvedValueOnce([
      savedTemplate(7, 'Layout A'),
      ...[
        'not JSON',
        '[]',
        JSON.stringify([{ ...cells[0], x: -0.1 }]),
        JSON.stringify([{ ...cells[0], w: 2 }]),
        JSON.stringify([{ ...cells[0], h: 0 }]),
        JSON.stringify([{ ...cells[0], x: '0.1' }]),
        JSON.stringify(Array.from({ length: 201 }, () => cells[0])),
      ].map((raw, index) => ({ ...savedTemplate(index + 20, `Invalid ${index}`), cells: raw })),
    ]);
    await renderLibrary();
    expect(screen.queryByRole('button', { name: /Invalid/ })).not.toBeInTheDocument();
  });

  it('imports only valid cells, strips unknown properties and limits labels', async () => {
    await renderLibrary();
    const importedCells = [
      { x: 0.7, y: 0, w: 0.30005, h: 0.5, label: 'a'.repeat(90), secret: 'drop', rotation: 90 },
    ];
    const input = document.getElementById('import-templates-hidden')!;
    fireEvent.change(input, {
      target: {
        files: [
          {
            text: async () =>
              JSON.stringify([
                { name: '  Imported  ', cells: importedCells },
                { name: 'Invalid', cells: [{ ...cells[0], w: -1 }] },
                { name: '', cells },
              ]),
          },
        ],
      },
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('تم استيراد 1 قالب'));
    expect(ipc.save).toHaveBeenCalledTimes(1);
    expect(ipc.save.mock.calls[0].slice(0, 2)).toEqual(['Imported', 1]);
    expect(JSON.parse(ipc.save.mock.calls[0][2])).toEqual([
      { x: 0.7, y: 0, w: 1 - 0.7, h: 0.5, label: 'a'.repeat(80), rotation: 90 },
    ]);
  });
});
