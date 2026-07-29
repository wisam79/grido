import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openImageFileDialog } from '../src/lib/file-dialog-utils';
import * as AppGo from '../wailsjs/go/main/App';

vi.mock('../wailsjs/go/main/App', () => ({
  OpenFile: vi.fn(),
  OpenMultipleFiles: vi.fn(),
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

  it('handles Wails native dialog error gracefully', async () => {
    (window as any).go = { main: { App: {} } };
    vi.mocked(AppGo.OpenFile).mockRejectedValueOnce(new Error('User cancelled'));

    const result = await openImageFileDialog(false);
    expect(result).toEqual([]);
  });
});
