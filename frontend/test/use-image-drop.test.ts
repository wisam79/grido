import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useImageDrop } from '../src/components/editor/canvas/use-image-drop';
import { useEditorStore } from '../src/lib/editor-store';
import * as AppWails from '../wailsjs/go/main/App';

vi.mock('../wailsjs/go/main/App', () => ({
  SaveImageFromBase64: vi.fn((base64: string) => Promise.resolve(`saved-${base64.slice(0, 15)}`)),
}));

vi.mock('../src/lib/canvas/image-dimensions', () => ({
  resolveImageAspectRatio: vi.fn(() => Promise.resolve(1.5)),
}));

describe('useImageDrop Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.getState().reset();
  });

  const createMockFile = (name: string, type = 'image/png', size = 1024) => {
    const file = new File(['dummy content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  const createMockDropEvent = (files: File[], clientX = 100, clientY = 100) => {
    return {
      preventDefault: vi.fn(),
      clientX,
      clientY,
      dataTransfer: {
        files,
      },
    } as unknown as React.DragEvent;
  };

  it('ignores non-image files on drop', async () => {
    const innerRef = { current: null };
    const { result } = renderHook(() => useImageDrop(innerRef));

    const nonImageFile = new File(['text'], 'test.txt', { type: 'text/plain' });
    const event = createMockDropEvent([nonImageFile]);

    await act(async () => {
      await result.current.handleDrop(event);
    });

    expect(AppWails.SaveImageFromBase64).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('assigns dropped image to specific target slot under cursor in collage mode', async () => {
    useEditorStore.getState().setMode('collage');
    useEditorStore.getState().setCanvasSize(1000, 1000);
    // Two slots: left half (slot-1) and right half (slot-2)
    useEditorStore.setState({
      slots: [
        { id: 'slot-1', cellIndex: 0, x: 0, y: 0, w: 0.5, h: 1 },
        { id: 'slot-2', cellIndex: 1, x: 0.5, y: 0, w: 0.5, h: 1 },
      ],
      collageMargin: 0,
      collageGap: 0,
    });

    // Mock DOM rect for innerRef (width 1000, height 1000 at (0, 0))
    const mockElement = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 1000,
        right: 1000,
        bottom: 1000,
      }),
    } as unknown as HTMLDivElement;

    const innerRef = { current: mockElement };
    const { result } = renderHook(() => useImageDrop(innerRef));

    // Drop on right half: clientX = 750 (inside slot-2: x 500 to 1000)
    const file = createMockFile('photo.png');
    const event = createMockDropEvent([file], 750, 500);

    await act(async () => {
      await result.current.handleDrop(event);
    });

    const slots = useEditorStore.getState().slots;
    expect(slots.find((s) => s.id === 'slot-2')?.imageSrc).toBeTruthy();
    expect(slots.find((s) => s.id === 'slot-1')?.imageSrc).toBeUndefined();
  });

  it('fills all slots when dropping on physicalLayout collage without a specific target slot', async () => {
    useEditorStore.getState().setMode('collage');
    useEditorStore.getState().setCanvasSize(1000, 1000);
    useEditorStore.getState().setCollageTemplate({
      id: 'passport-4x6',
      name: 'Passport 4x6',
      cells: [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      ],
      physicalLayout: true,
    } as any);
    useEditorStore.setState({
      slots: [
        { id: 'p1', cellIndex: 0, x: 0, y: 0, w: 0.5, h: 0.5 },
        { id: 'p2', cellIndex: 1, x: 0.5, y: 0, w: 0.5, h: 0.5 },
      ],
    });

    // innerRef is null, so targetSlotId is null (general drop)
    const innerRef = { current: null };
    const { result } = renderHook(() => useImageDrop(innerRef));

    const file = createMockFile('photo.png');
    const event = createMockDropEvent([file]);

    await act(async () => {
      await result.current.handleDrop(event);
    });

    const slots = useEditorStore.getState().slots;
    expect(slots[0]?.imageSrc).toBeTruthy();
    expect(slots[1]?.imageSrc).toBeTruthy();
    expect(slots[0]?.imageSrc).toBe(slots[1]?.imageSrc);
  });

  it('adds image elements in single mode', async () => {
    useEditorStore.getState().setMode('single');
    const innerRef = { current: null };
    const { result } = renderHook(() => useImageDrop(innerRef));

    const file = createMockFile('single.png');
    const event = createMockDropEvent([file]);

    await act(async () => {
      await result.current.handleDrop(event);
    });

    const elements = useEditorStore.getState().elements;
    expect(elements.length).toBe(1);
    expect(elements[0].type).toBe('image');
    expect((elements[0] as any).imageSrc).toBeTruthy();
  });
});
