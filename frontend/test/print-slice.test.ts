import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';

describe('PrintSlice Unit Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('sets print settings partially', () => {
    useEditorStore.getState().setPrintSettings({ dpi: 600, showCutLines: false });
    const settings = useEditorStore.getState().printSettings;

    expect(settings.dpi).toBe(600);
    expect(settings.showCutLines).toBe(false);
  });

  it('sets print image source', () => {
    useEditorStore.getState().setPrintImageSrc('sheet.png');
    expect(useEditorStore.getState().printImageSrc).toBe('sheet.png');
  });

  it('sets print paper dimensions and orientation in settings', () => {
    useEditorStore.getState().setPrintSettings({ paperWidthMM: 297, paperHeightMM: 420, orientation: 'landscape' });
    const settings = useEditorStore.getState().printSettings;

    expect(settings.paperWidthMM).toBe(297);
    expect(settings.paperHeightMM).toBe(420);
    expect(settings.orientation).toBe('landscape');
  });
});
