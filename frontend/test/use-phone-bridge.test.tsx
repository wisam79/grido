import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePhoneBridgeListener } from '../src/components/editor/system/use-phone-bridge';
import { useEditorStore } from '../src/lib/editor-store';
import * as runtime from '../wailsjs/runtime/runtime';

type EventHandler = (payload: any) => Promise<void>;
let registeredHandler: EventHandler | null = null;
const unsubscribeMock = vi.fn();

vi.mock('../wailsjs/runtime/runtime', () => ({
  EventsOn: vi.fn((eventName: string, handler: EventHandler) => {
    if (eventName === 'phone:photo-received') {
      registeredHandler = handler;
    }
    return unsubscribeMock;
  }),
  EventsOff: vi.fn(),
}));

vi.mock('../src/lib/canvas/image-dimensions', () => ({
  resolveImageAspectRatio: vi.fn(() => Promise.resolve(1.77)),
}));

describe('usePhoneBridgeListener Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandler = null;
    useEditorStore.getState().reset();
  });

  it('subscribes to phone:photo-received on mount and unregisters on unmount', () => {
    const { unmount } = renderHook(() => usePhoneBridgeListener());

    expect(runtime.EventsOn).toHaveBeenCalledWith('phone:photo-received', expect.any(Function));
    expect(registeredHandler).not.toBeNull();

    unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('assigns received photo to selected slot in collage mode', async () => {
    useEditorStore.getState().setMode('collage');
    useEditorStore.setState({
      slots: [
        { id: 'slot-1', cellIndex: 0, x: 0, y: 0, w: 0.5, h: 1 },
        { id: 'slot-2', cellIndex: 1, x: 0.5, y: 0, w: 0.5, h: 1 },
      ],
    });
    useEditorStore.getState().selectElement('slot-2');

    renderHook(() => usePhoneBridgeListener());
    expect(registeredHandler).not.toBeNull();

    await act(async () => {
      await registeredHandler!({ path: 'local-image://test-photo.jpg' });
    });

    const state = useEditorStore.getState();
    expect(state.slots.find(s => s.id === 'slot-2')?.imageSrc).toBe('local-image://test-photo.jpg');
    expect(state.slots.find(s => s.id === 'slot-1')?.imageSrc).toBeUndefined();
  });

  it('assigns received photo to first empty slot when none is selected in collage mode', async () => {
    useEditorStore.getState().setMode('collage');
    useEditorStore.setState({
      slots: [
        { id: 'slot-1', cellIndex: 0, x: 0, y: 0, w: 0.5, h: 1, imageSrc: 'existing.jpg' },
        { id: 'slot-2', cellIndex: 1, x: 0.5, y: 0, w: 0.5, h: 1 },
      ],
    });
    useEditorStore.getState().selectElement(null);

    renderHook(() => usePhoneBridgeListener());

    await act(async () => {
      await registeredHandler!('local-image://empty-slot-photo.jpg');
    });

    const state = useEditorStore.getState();
    expect(state.slots.find(s => s.id === 'slot-2')?.imageSrc).toBe('local-image://empty-slot-photo.jpg');
  });

  it('adds image element to canvas in single mode', async () => {
    useEditorStore.getState().setMode('single');
    expect(useEditorStore.getState().elements.length).toBe(0);

    renderHook(() => usePhoneBridgeListener());

    await act(async () => {
      await registeredHandler!({ path: 'local-image://single-photo.jpg' });
    });

    const state = useEditorStore.getState();
    expect(state.elements.length).toBe(1);
    expect(state.elements[0].type).toBe('image');
    expect((state.elements[0] as any).imageSrc).toBe('local-image://single-photo.jpg');
  });
});
