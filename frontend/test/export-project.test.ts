import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadBlob, saveProjectAsJSON } from '../src/lib/export/export-project';
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

  it('downloads JSON blob using SaveFileDialog', async () => {
    vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce('success');

    const blob = new Blob(['{"test": true}'], { type: 'application/json' });
    const res = await downloadBlob(blob, 'project.json');

    expect(res).toBe('success');
    expect(AppGo.SaveFileDialog).toHaveBeenCalledWith('{"test": true}', 'project.json', 'Project File (*.json)', '*.json');
  });

  it('saves project as JSON file', async () => {
    vi.mocked(AppGo.SaveFileDialog).mockResolvedValueOnce('success');

    await saveProjectAsJSON();

    expect(AppGo.SaveFileDialog).toHaveBeenCalled();
  });
});
