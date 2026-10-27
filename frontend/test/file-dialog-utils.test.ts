import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { openDirectoryImageDialog, openImageFileDialog } from '../src/lib/io/file-dialog-utils';
import * as AppGo from '../wailsjs/go/main/App';

vi.mock('../wailsjs/go/main/App', () => ({
  OpenFile: vi.fn(),
  OpenMultipleFiles: vi.fn(),
  OpenDirectoryDialog: vi.fn(),
}));

describe('FileDialogUtils Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Wails OpenFile in desktop environment for single file', async () => {
    (window as any).go = { main: { App: {} } };
    vi.mocked(AppGo.OpenFile).mockResolvedValueOnce('data:image/png;base64,single');

    const result = await openImageFileDialog(false);
    expect(result).toEqual(['data:image/png;base64,single']);
  });

  it('calls Wails OpenMultipleFiles in desktop environment for multiple files', async () => {
    (window as any).go = { main: { App: {} } };
    vi.mocked(AppGo.OpenMultipleFiles).mockResolvedValueOnce(['img1.png', 'img2.png']);

    const result = await openImageFileDialog(true);
    expect(result).toEqual(['img1.png', 'img2.png']);
  });

  it('calls Wails OpenDirectoryDialog in desktop environment for directory import', async () => {
    (window as any).go = { main: { App: {} } };
    vi.mocked(AppGo.OpenDirectoryDialog).mockResolvedValueOnce(['dir_img1.png', 'dir_img2.png']);

    const { openDirectoryImageDialog } = await import('../src/lib/io/file-dialog-utils');
    const result = await openDirectoryImageDialog();
    expect(result).toEqual(['dir_img1.png', 'dir_img2.png']);
  });

  it('handles Wails native dialog error gracefully', async () => {
    (window as any).go = { main: { App: {} } };
    vi.mocked(AppGo.OpenFile).mockRejectedValueOnce(new Error('User cancelled'));

    const result = await openImageFileDialog(false);
    expect(result).toEqual([]);
  });
});

describe('FileDialogUtils browser fallback', () => {
  let sandboxGo: unknown;
  let createdInputs: HTMLInputElement[];
  let createElementSpy: { mockRestore(): void };

  beforeEach(() => {
    sandboxGo = (window as any).go;
    delete (window as any).go;
    createdInputs = [];
    const originalCreateElement = document.createElement.bind(document);
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((
      tagName: string,
      options?: ElementCreationOptions,
    ) => {
      const element = originalCreateElement(tagName, options);
      if (tagName === 'input') createdInputs.push(element as HTMLInputElement);
      return element;
    }) as typeof document.createElement);
  });

  afterEach(() => {
    createElementSpy.mockRestore();
    (window as any).go = sandboxGo;
  });

  const attachFiles = (input: HTMLInputElement, files: File[]) => {
    Object.defineProperty(input, 'files', { value: files, configurable: true });
  };

  it('reads picked files through FileReader', async () => {
    const pending = openImageFileDialog(true);
    const input = createdInputs[0];
    expect(input.multiple).toBe(true);
    attachFiles(input, [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ]);

    await input.onchange?.(new Event('change'));

    const result = await pending;
    expect(result).toHaveLength(2);
    expect(result[0]).toMatch(/^data:image\/png;base64,/);
    expect(result[1]).toMatch(/^data:image\/png;base64,/);
  });

  it('filters non-image files in directory mode', async () => {
    const pending = openDirectoryImageDialog();
    const input = createdInputs[0];
    attachFiles(input, [
      new File(['a'], 'keep.png', { type: 'image/png' }),
      new File(['b'], 'skip.txt', { type: 'text/plain' }),
    ]);

    await input.onchange?.(new Event('change'));

    const result = await pending;
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/^data:image\/png;base64,/);
  });

  it('resolves an empty list when the picker is cancelled', async () => {
    const pending = openImageFileDialog(false);
    const input = createdInputs[0];

    input.oncancel?.(new Event('cancel'));

    await expect(pending).resolves.toEqual([]);
  });
});
