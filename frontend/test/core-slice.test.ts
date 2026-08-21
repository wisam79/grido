import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../src/lib/editor-store';

describe('CoreSlice Unit Tests', () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
  });

  it('sets mode correctly', () => {
    useEditorStore.getState().setMode('single');
    expect(useEditorStore.getState().mode).toBe('single');

    useEditorStore.getState().setMode('collage');
    expect(useEditorStore.getState().mode).toBe('collage');
  });

  it('sets canvas size correctly', () => {
    useEditorStore.getState().setCanvasSize(1200, 800);
    expect(useEditorStore.getState().canvasWidth).toBe(1200);
    expect(useEditorStore.getState().canvasHeight).toBe(800);
  });

  it('sets background color correctly', () => {
    useEditorStore.getState().setBackgroundColor('#FF0000');
    expect(useEditorStore.getState().backgroundColor).toBe('#FF0000');
  });

  it('sets last edited image and aspect ratio', () => {
    useEditorStore.getState().setLastEditedImage('img.png');
    expect(useEditorStore.getState().lastEditedImage).toBe('img.png');

    useEditorStore.getState().setLastEditedImageAspect(1.5);
    expect(useEditorStore.getState().lastEditedImageAspect).toBe(1.5);
  });

  it('resets state to defaults including clipboard and lastEditedImage', () => {
    useEditorStore.getState().setCanvasSize(500, 500);
    useEditorStore.getState().setBackgroundColor('#000000');
    useEditorStore.getState().setLastEditedImage('temp.jpg');
    useEditorStore.getState().setLastEditedImageAspect(1.2);
    useEditorStore.setState({ clipboardElements: [{ id: '1', type: 'image', x: 0, y: 0, width: 100, height: 100 }] as any });

    useEditorStore.getState().reset();

    expect(useEditorStore.getState().canvasWidth).toBe(2480);
    expect(useEditorStore.getState().backgroundColor).toBe('#FFFFFF');
    expect(useEditorStore.getState().lastEditedImage).toBeNull();
    expect(useEditorStore.getState().lastEditedImageAspect).toBeNull();
    expect(useEditorStore.getState().clipboardElements).toEqual([]);
  });

  it('loadProject clears clipboardElements and lastEditedImage from previous project', () => {
    useEditorStore.getState().setLastEditedImage('projectA.jpg');
    useEditorStore.setState({ clipboardElements: [{ id: 'el-a' }] as any });

    useEditorStore.getState().loadProject({
      version: 1,
      canvasWidth: 1920,
      canvasHeight: 1080,
      backgroundColor: '#FAFAFA',
      elements: [],
      slots: [],
    } as any, 'proj-b');

    expect(useEditorStore.getState().projectId).toBe('proj-b');
    expect(useEditorStore.getState().lastEditedImage).toBeNull();
    expect(useEditorStore.getState().clipboardElements).toEqual([]);
  });

  it('updates zoom level via number or callback function', () => {
    useEditorStore.getState().setCanvasZoom(1.5);
    expect(useEditorStore.getState().canvasZoom).toBe(1.5);

    useEditorStore.getState().setCanvasZoom((prev) => prev * 2);
    expect(useEditorStore.getState().canvasZoom).toBe(3);
  });
});
