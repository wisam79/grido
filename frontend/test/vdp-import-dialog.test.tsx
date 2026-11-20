import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VdpImportDialog } from '../src/features/stickers/components/vdp-import-dialog';
import { buildDefaultStickerParams } from '../src/features/stickers/lib/sticker-design/build-svg';
import { renderVdpBatch } from '../src/features/stickers/lib/vdp-batch';
import { parseVdpFile } from '../src/features/stickers/lib/vdp-parser';
import { ALL_STICKER_TEMPLATES } from '../src/features/stickers/templates';
import { useEditorStore } from '../src/lib/editor-store';

vi.mock('../src/features/stickers/lib/vdp-batch', () => ({ renderVdpBatch: vi.fn() }));
vi.mock('../src/features/stickers/lib/vdp-parser', async (original) => ({
  ...(await original<typeof import('../src/features/stickers/lib/vdp-parser')>()),
  parseVdpFile: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
const template = ALL_STICKER_TEMPLATES[0];
const baseParams = buildDefaultStickerParams(template);
const dataset = (name: string, rows = 1) => ({
  fileName: name,
  columns: [template.fields[0].id],
  rows: Array.from({ length: rows }, () => ({ [template.fields[0].id]: name })),
});
function setup() {
  const onOpenChange = vi.fn();
  const frame = (open = true) => (
    <VdpImportDialog
      open={open}
      onOpenChange={onOpenChange}
      template={template}
      baseParams={baseParams}
    />
  );
  const view = render(frame());
  const file = (name: string) =>
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['csv'], name)] },
    });
  return { ...view, frame, file, onOpenChange };
}
beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.getState().reset();
});

describe('VDP file and generation ownership', () => {
  it('accepts only the latest parsed file and ignores an old close/reopen parse', async () => {
    const old = deferred<Awaited<ReturnType<typeof parseVdpFile>>>();
    const next = deferred<Awaited<ReturnType<typeof parseVdpFile>>>();
    vi.mocked(parseVdpFile).mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const view = setup();
    view.file('old.csv');
    view.file('new.csv');
    await act(async () => next.resolve(dataset('new.csv')));
    await act(async () => old.resolve(dataset('old.csv')));
    expect(screen.getByText('new.csv', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByText('old.csv', { selector: 'p' })).not.toBeInTheDocument();

    view.rerender(view.frame(false));
    view.rerender(view.frame());
    const closing = deferred<Awaited<ReturnType<typeof parseVdpFile>>>();
    vi.mocked(parseVdpFile).mockReturnValueOnce(closing.promise);
    view.file('closed.csv');
    view.rerender(view.frame(false));
    view.rerender(view.frame());
    await act(async () => closing.resolve(dataset('closed.csv')));
    expect(screen.queryByText('closed.csv')).not.toBeInTheDocument();
  });

  it('old generation callbacks/finally cannot insert or clear a reopened generation', async () => {
    const old = deferred<Awaited<ReturnType<typeof renderVdpBatch>>>();
    const next = deferred<Awaited<ReturnType<typeof renderVdpBatch>>>();
    vi.mocked(renderVdpBatch).mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    vi.mocked(parseVdpFile).mockResolvedValue(dataset('cards.csv', 50));
    const view = setup();
    view.file('cards.csv');
    fireEvent.click(await screen.findByRole('button', { name: 'توليد (50)' }));
    await waitFor(() => expect(renderVdpBatch).toHaveBeenCalledTimes(1), { timeout: 4000 });
    const oldOptions = vi.mocked(renderVdpBatch).mock.calls[0][5]!;
    view.rerender(view.frame(false));
    expect(oldOptions.signal?.aborted).toBe(true);
    view.rerender(view.frame());
    view.file('cards.csv');
    fireEvent.click(await screen.findByRole('button', { name: 'توليد (50)' }));
    await waitFor(() => expect(renderVdpBatch).toHaveBeenCalledTimes(2), { timeout: 4000 });
    await act(async () => {
      for (let index = 0; index < 50; index++)
        await oldOptions.onRendered?.('/local-image/old.png', index);
      old.resolve({ pngUrls: [], failedRows: 0, aborted: false });
    });
    expect(useEditorStore.getState().elements).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'جاري التوليد ...' })).toBeDisabled();
    expect(view.onOpenChange).not.toHaveBeenCalled();
    const options = vi.mocked(renderVdpBatch).mock.calls[1][5]!;
    await act(async () => {
      for (let index = 0; index < 50; index++)
        await options.onRendered?.('/local-image/new.png', index);
      next.resolve({ pngUrls: [], failedRows: 0, aborted: false });
    });
    expect(useEditorStore.getState().elements).toHaveLength(50);
    expect(view.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('aborts callbacks rather than filling another document', async () => {
    const pending = deferred<Awaited<ReturnType<typeof renderVdpBatch>>>();
    vi.mocked(renderVdpBatch).mockReturnValueOnce(pending.promise);
    vi.mocked(parseVdpFile).mockResolvedValue(dataset('cards.csv', 50));
    const view = setup();
    view.file('cards.csv');
    fireEvent.click(await screen.findByRole('button', { name: 'توليد (50)' }));
    await waitFor(() => expect(renderVdpBatch).toHaveBeenCalled(), { timeout: 4000 });
    const options = vi.mocked(renderVdpBatch).mock.calls[0][5]!;
    useEditorStore.getState().reset();
    await act(async () => {
      for (let index = 0; index < 50; index++)
        await options.onRendered?.('/local-image/old.png', index);
      pending.resolve({ pngUrls: [], failedRows: 0, aborted: false });
    });
    expect(options.signal?.aborted).toBe(true);
    expect(useEditorStore.getState().elements).toHaveLength(0);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
