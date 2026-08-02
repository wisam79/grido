import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadBlob } from '../src/lib/export/export-project';
import { useEditorStore } from '../src/lib/editor-store';
import * as AppGo from '../wailsjs/go/main/App';

vi.mock('../wailsjs/go/main/App', () => ({
  SaveFileDialog: vi.fn(),
}));

describe('ExportProject Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
  });

  it('downloads PNG blob using SaveFileDialog', async () => {
    vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce('success');

    const blob = new Blob(['mock-image-data'], { type: 'image/png' });
    const res = await downloadBlob(blob, 'photo.png');

    expect(res).toBe('success');
    expect(AppGo.SaveFileDialog).toHaveBeenCalled();
  });
});
